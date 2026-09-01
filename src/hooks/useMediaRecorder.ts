import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { detectMediaCapability, humaniseMediaError, transitionRecording, type RecordingEvent, type RecordingState } from '../features/recording/recordingMachine'

type CompletedRecording={blob:Blob;durationSeconds:number;mimeType:string;cameraLabel?:string;microphoneLabel?:string}
type Options={cameraId?:string;microphoneId?:string;facingMode:'user'|'environment';onComplete:(recording:CompletedRecording)=>Promise<void>|void}

export function useMediaRecorder({cameraId,microphoneId,facingMode,onComplete}:Options){
  const [state,dispatchBase]=useReducer((value:RecordingState,event:RecordingEvent)=>transitionRecording(value,event),'idle')
  const [error,setError]=useState('')
  const [elapsed,setElapsed]=useState(0)
  const [micEnabled,setMicEnabled]=useState(true)
  const [stream,setStream]=useState<MediaStream|null>(null)
  const streamRef=useRef<MediaStream|null>(null),recorderRef=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),startedAt=useRef(0),recordedMs=useRef(0),segmentActive=useRef(false),timer=useRef<number|null>(null)
  const capability=useMemo(()=>detectMediaCapability(globalThis),[])
  const dispatch=(event:RecordingEvent)=>dispatchBase(event)
  const stopTimer=()=>{if(timer.current!==null)window.clearInterval(timer.current);timer.current=null}
  const startTimer=()=>{stopTimer();timer.current=window.setInterval(()=>setElapsed(Math.max(0,Math.floor((recordedMs.current+(segmentActive.current?performance.now()-startedAt.current:0))/1000))),250)}
  const release=useCallback(()=>{stopTimer();streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;setStream(null)},[])
  const fail=useCallback((reason:unknown)=>{stopTimer();setError(humaniseMediaError(reason));dispatch('FAIL')},[])
  const acquire=useCallback(async()=>{
    if(!capability.supported)throw new Error(capability.reason||'Recording is unavailable.')
    dispatch('REQUEST_PERMISSION');setError('')
    const video:MediaTrackConstraints=cameraId?{deviceId:{exact:cameraId}}:{facingMode:{ideal:facingMode},width:{ideal:1920},height:{ideal:1080}}
    const audio:MediaTrackConstraints|boolean=microphoneId?{deviceId:{exact:microphoneId},echoCancellation:true,noiseSuppression:true}:{echoCancellation:true,noiseSuppression:true}
    const next=await navigator.mediaDevices.getUserMedia({video,audio})
    streamRef.current=next;setStream(next);setMicEnabled(true);dispatch('STREAM_READY')
    next.getTracks().forEach(track=>{track.onended=()=>{if(recorderRef.current?.state==='recording'||recorderRef.current?.state==='paused')recorderRef.current.stop();fail(new DOMException(`${track.kind} input was interrupted.`,'AbortError'))}})
    return next
  },[cameraId,microphoneId,facingMode,capability.supported,capability.reason,fail])
  const startPreview=useCallback(async()=>{try{return await acquire()}catch(reason){fail(reason);return null}},[acquire,fail])
  const startRecording=useCallback(async()=>{
    try{
      let active=streamRef.current
      if(!active||!active.active)active=await acquire()
      dispatch('PREPARE');chunks.current=[];setElapsed(0);recordedMs.current=0;segmentActive.current=false
      const options=capability.mimeType?{mimeType:capability.mimeType}:undefined
      const recorder=new MediaRecorder(active,options);recorderRef.current=recorder
      recorder.ondataavailable=event=>{if(event.data.size>0)chunks.current.push(event.data)}
      recorder.onerror=event=>fail((event as Event & {error?:DOMException}).error??new Error('The browser reported a recording error.'))
      recorder.onstart=()=>{startedAt.current=performance.now();segmentActive.current=true;startTimer();dispatch('RECORDER_STARTED')}
      recorder.onpause=()=>{if(segmentActive.current)recordedMs.current+=performance.now()-startedAt.current;segmentActive.current=false;setElapsed(Math.floor(recordedMs.current/1000));stopTimer();dispatch('PAUSE')}
      recorder.onresume=()=>{startedAt.current=performance.now();segmentActive.current=true;startTimer();dispatch('RESUME')}
      recorder.onstop=async()=>{
        stopTimer();dispatch('RECORDER_STOPPED')
        const blob=new Blob(chunks.current,{type:recorder.mimeType||capability.mimeType||'video/webm'})
        if(blob.size===0){fail(new Error('The recording was empty. Keep the camera open and try again.'));return}
        if(segmentActive.current)recordedMs.current+=performance.now()-startedAt.current
        segmentActive.current=false
        const duration=Math.max(1,Math.round(recordedMs.current/1000))
        const videoTrack=active?.getVideoTracks()[0],audioTrack=active?.getAudioTracks()[0]
        try{await onComplete({blob,durationSeconds:duration,mimeType:blob.type,cameraLabel:videoTrack?.label,microphoneLabel:audioTrack?.label});dispatch('SAVE_SUCCESS')}catch(reason){fail(reason)}
      }
      recorder.start(1000)
    }catch(reason){fail(reason)}
  },[acquire,capability.mimeType,fail,onComplete])
  const stop=useCallback(()=>{const recorder=recorderRef.current;if(recorder&&(recorder.state==='recording'||recorder.state==='paused')){dispatch('STOP');recorder.requestData();recorder.stop()}},[])
  const pause=()=>{if(recorderRef.current?.state==='recording')recorderRef.current.pause()}
  const resume=()=>{if(recorderRef.current?.state==='paused')recorderRef.current.resume()}
  const toggleMic=()=>{const next=!micEnabled;streamRef.current?.getAudioTracks().forEach(track=>track.enabled=next);setMicEnabled(next)}
  const reset=()=>{if(recorderRef.current?.state==='recording'||recorderRef.current?.state==='paused')recorderRef.current.stop();release();setElapsed(0);setError('');dispatch('RESET')}
  useEffect(()=>release,[release])
  return{state,error,elapsed,micEnabled,stream,capability,startPreview,startRecording,stop,pause,resume,toggleMic,reset,release}
}
