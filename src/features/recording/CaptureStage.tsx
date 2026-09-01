import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { Project, Take } from '../../types'
import { useMediaDevices } from '../../hooks/useMediaDevices'
import { useMediaRecorder } from '../../hooks/useMediaRecorder'
import { useWakeLock } from '../../hooks/useWakeLock'
import { deleteMedia, persistMedia } from '../../lib/mediaStorage'
import { createTakeAndAsset, preferredTakeClips } from './takeFactory'

type Props={project:Project;setProject:React.Dispatch<React.SetStateAction<Project>>;notify:(message:string)=>void;onNext:()=>void;initialBlockId?:string}
const makeId=()=>crypto.randomUUID?.()??`xr1-${Date.now()}`
const time=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`

export function CaptureStage({project,setProject,notify,onNext,initialBlockId}:Props){
  const [activeBlockId,setActiveBlockId]=useState(initialBlockId||project.blocks[0]?.id||'')
  const [facingMode,setFacingMode]=useState<'user'|'environment'>('user')
  const [mirrored,setMirrored]=useState(true)
  const [settings,setSettings]=useState(false)
  const [promptVisible,setPromptVisible]=useState(false)
  const [promptPlaying,setPromptPlaying]=useState(false)
  const [wpm,setWpm]=useState(125)
  const [fontSize,setFontSize]=useState(32)
  const [preview,setPreview]=useState<Take|null>(null)
  const importInput=useRef<HTMLInputElement>(null)
  const videoRef=useRef<HTMLVideoElement>(null)
  const devices=useMediaDevices()
  const activeBlock=project.blocks.find(block=>block.id===activeBlockId)??project.blocks[0]
  const media=useMediaRecorder({cameraId:devices.cameraId,microphoneId:devices.microphoneId,facingMode,onComplete:async recording=>{
    const id=makeId(),createdAt=new Date().toISOString(),url=URL.createObjectURL(recording.blob),section=activeBlock?.label||'Recording'
    const {take,asset}=createTakeAndAsset({id,projectId:project.id,scriptBlockId:activeBlock?.id,section,takeNumber:project.takes.filter(item=>item.section===section).length+1,durationSeconds:recording.durationSeconds,mimeType:recording.mimeType,size:recording.blob.size,createdAt,url,cameraLabel:recording.cameraLabel,microphoneLabel:recording.microphoneLabel})
    setProject(current=>({...current,takes:[...current.takes,take],resources:[...current.resources,asset],updatedAt:createdAt}))
    void posterFromVideo(url).then(posterUrl=>posterUrl&&setProject(current=>({...current,resources:current.resources.map(item=>item.id===id?{...item,posterUrl}:item)})))
    try{
      await persistMedia({id,blob:recording.blob,name:asset.name,mime:asset.mime,projectId:project.id,createdAt})
      setProject(current=>({...current,resources:current.resources.map(item=>item.id===id?{...item,persistence:'durable'}:item)}))
      notify(`${take.label} saved to Files`)
    }catch(error){
      setProject(current=>({...current,resources:current.resources.map(item=>item.id===id?{...item,persistence:'failed'}:item)}))
      throw new Error(`This take is playable now but was not saved after refresh. Save it to your device. ${error instanceof Error?error.message:''}`)
    }
  }})
  const recording=media.state==='recording'||media.state==='paused'
  const busy=['requesting_permission','preparing_recording','stopping','processing'].includes(media.state)
  useWakeLock(recording||promptPlaying)
  useEffect(()=>{if(videoRef.current)videoRef.current.srcObject=media.stream},[media.stream])
  useEffect(()=>{if(media.stream)void devices.refresh()},[media.stream,devices.refresh])

  const switchCamera=()=>{if(recording||busy)return;media.reset();if(devices.cameras.length>1){const index=Math.max(0,devices.cameras.findIndex(item=>item.deviceId===devices.cameraId));devices.setCameraId(devices.cameras[(index+1)%devices.cameras.length].deviceId)}else setFacingMode(value=>value==='user'?'environment':'user');notify('Camera switched. Tap Record when ready.')}
  const prefer=(take:Take)=>setProject(current=>({...current,takes:current.takes.map(item=>item.section===take.section?{...item,preferred:item.id===take.id}:item)}))
  const addToEdit=(take:Take)=>setProject(current=>{const temp={...current,takes:current.takes.map(item=>({...item,preferred:item.id===take.id}))};const clips=preferredTakeClips(temp).filter(clip=>clip.id.startsWith(take.id)&&!current.timelineClips.some(existing=>existing.id===clip.id));return{...current,timelineClips:[...current.timelineClips,...clips]}})
  const buildRoughCut=()=>{const clips=preferredTakeClips(project).filter(clip=>!project.timelineClips.some(existing=>existing.id===clip.id));if(!clips.length)return notify('Mark a recorded take as Preferred first');setProject(current=>({...current,timelineClips:[...current.timelineClips,...clips]}));notify(`${clips.length/2} preferred takes added in script order`)}
  const rename=(take:Take)=>{const label=prompt('Name this take',take.label)?.trim();if(label)setProject(current=>({...current,takes:current.takes.map(item=>item.id===take.id?{...item,label}:item)}))}
  const download=(take:Take)=>{const asset=project.resources.find(item=>item.id===take.assetId);if(!asset||!take.url)return;const link=document.createElement('a');link.href=take.url;link.download=asset.name;link.click()}
  const remove=async(take:Take)=>{if(!confirm(`Delete ${take.label}? This also removes its local browser copy.`))return;if(take.assetId)await deleteMedia(take.assetId).catch(()=>{});setProject(current=>({...current,takes:current.takes.filter(item=>item.id!==take.id),resources:current.resources.filter(item=>item.id!==take.assetId),timelineClips:current.timelineClips.filter(item=>item.assetId!==take.assetId)}))}

  return <div className="capture-stage">
    <header className="capture-heading"><div><span>04 / RECORD</span><h1>Deliver naturally.</h1><p>One tap opens the camera and starts the take. Finished recordings flow directly into Files.</p></div><button className="primary" onClick={()=>setPromptVisible(value=>!value)}>Camera prompter</button></header>
    <div className="capture-layout">
      <section className="capture-camera">
        <video ref={videoRef} autoPlay muted playsInline className={mirrored?'mirrored':''}/>
        {!media.stream&&<div className="capture-empty"><b>{media.capability.supported?'Ready for a take':'Recording unavailable'}</b><p>{media.error||media.capability.reason||'Choose a section, then tap Record once.'}</p></div>}
        {promptVisible&&activeBlock&&<div className={`capture-prompt ${promptPlaying?'playing':''}`} style={{'--prompt-time':`${Math.max(8,activeBlock.text.split(/\s+/).length/wpm*60)}s`,'--prompt-size':`${fontSize}px`} as React.CSSProperties}><p>{activeBlock.text}</p></div>}
        {recording&&<div className="capture-rec"><i/> {media.state==='paused'?'PAUSED':'REC'} {time(media.elapsed)}</div>}
        {busy&&<div className="capture-processing">{media.state.replaceAll('_',' ')}…</div>}
        <div className="capture-controls">
          <button onClick={media.toggleMic} disabled={!media.stream} aria-label={media.micEnabled?'Mute microphone':'Unmute microphone'}>{media.micEnabled?'Mic':'Muted'}</button>
          <button onClick={switchCamera} disabled={recording||busy}>Flip</button>
          <button className={recording?'capture-stop':'capture-record'} onClick={()=>recording?media.stop():media.startRecording()} disabled={busy||!media.capability.supported} aria-label={recording?'Stop recording':'Start recording'}>{recording?'Stop':'Record'}</button>
          {recording&&<button onClick={()=>media.state==='paused'?media.resume():media.pause()}>{media.state==='paused'?'Resume':'Pause'}</button>}
          <button onClick={()=>setSettings(value=>!value)}>Settings</button>
        </div>
        {settings&&<div className="capture-settings"><label>Camera<select value={devices.cameraId} onChange={event=>{media.reset();devices.setCameraId(event.target.value)}}><option value="">Automatic · front preferred</option>{devices.cameras.map((item,index)=><option value={item.deviceId} key={item.deviceId}>{item.label||`Camera ${index+1}`}</option>)}</select></label><label>Microphone<select value={devices.microphoneId} onChange={event=>{media.reset();devices.setMicrophoneId(event.target.value)}}><option value="">Automatic</option>{devices.microphones.map((item,index)=><option value={item.deviceId} key={item.deviceId}>{item.label||`Microphone ${index+1}`}</option>)}</select></label><button onClick={()=>setMirrored(value=>!value)}>{mirrored?'Disable mirror':'Mirror preview'}</button><button onClick={media.reset}>Stop camera</button></div>}
        {media.error&&<div className="capture-error"><b>Recording needs attention</b><p>{media.error}</p><button onClick={media.reset}>Reset camera</button></div>}
      </section>
      <aside className="capture-session panel">
        <div className="capture-session-title"><span>SESSION PLAN</span><small>{project.blocks.length} sections · {project.targetMinutes} min target</small></div>
        <div className="capture-sections">{project.blocks.map((block,index)=><button className={block.id===activeBlock?.id?'active':''} key={block.id} onClick={()=>{setActiveBlockId(block.id);setPromptVisible(true)}}><span>{String(index+1).padStart(2,'0')}</span><div><b>{block.label}</b><small>{block.text.split(/\s+/).filter(Boolean).length} words · {project.takes.filter(take=>take.scriptBlockId===block.id).length} takes</small></div></button>)}</div>
        {promptVisible&&<div className="capture-prompt-tools"><button onClick={()=>setPromptPlaying(value=>!value)}>{promptPlaying?'Pause prompt':'Run prompt'}</button><label>Speed <input type="range" min="70" max="220" value={wpm} onChange={event=>setWpm(Number(event.target.value))}/><b>{wpm} WPM</b></label><label>Text <input type="range" min="22" max="54" value={fontSize} onChange={event=>setFontSize(Number(event.target.value))}/></label></div>}
      </aside>
    </div>
    <section className="capture-takes">
      <header><div><h2>Recorded takes</h2><p>Compare takes by section. Durable takes return after refresh on this device.</p></div><div><button onClick={buildRoughCut}>Build rough cut</button><button onClick={()=>importInput.current?.click()}>Import phone media</button></div></header>
      <input ref={importInput} className="visually-hidden" type="file" multiple accept="video/*,image/*,audio/*" onChange={event=>{if(event.target.files)void importMedia(event.target.files,project,setProject,notify);event.target.value=''}}/>
      <div className="capture-take-grid">{project.takes.map(take=>{const asset=project.resources.find(item=>item.id===take.assetId);return <article key={take.id}>
        <button className="capture-take-preview" onClick={()=>take.url&&setPreview(take)} disabled={!take.url}>{take.url?<video src={take.url} muted preload="metadata"/>:<span>Media unavailable</span>}<i>Play</i></button>
        <div className="capture-take-copy"><span>{take.section}</span><b>{take.label}</b><small>{take.duration} · {asset?.persistence==='durable'?'Durable on device':asset?.persistence==='failed'?'Save to device now':'Session media'}</small></div>
        <div className="capture-take-actions"><button className={take.preferred?'preferred':''} onClick={()=>prefer(take)}>{take.preferred?'★ Preferred':'Prefer'}</button><button onClick={()=>{addToEdit(take);notify(`${take.label} added to edit`)}} disabled={!take.assetId}>Add to edit</button><button onClick={()=>rename(take)}>Rename</button><button onClick={()=>download(take)} disabled={!take.url}>Save</button><button className="danger" onClick={()=>void remove(take)}>Delete</button></div>
      </article>})}</div>
      {!project.takes.length&&<div className="capture-no-takes"><b>Your first take will appear here and in Files.</b><span>Select a script section and tap Record once.</span></div>}
    </section>
    <footer className="capture-footer"><span>Preferred takes can become a rough cut without replacing existing edits.</span><button className="primary" onClick={onNext}>Open Quick Edit</button></footer>
    {preview?.url&&<div className="capture-preview" onClick={event=>{if(event.target===event.currentTarget)setPreview(null)}}><div><header><b>{preview.section} · {preview.label}</b><button onClick={()=>setPreview(null)}>Close</button></header><video src={preview.url} controls autoPlay playsInline/></div></div>}
  </div>
}

async function importMedia(files:FileList,project:Project,setProject:React.Dispatch<React.SetStateAction<Project>>,notify:(message:string)=>void){
  const incoming=Array.from(files),createdAt=new Date().toISOString()
  const assets=incoming.map(file=>{const id=makeId(),category=file.type.startsWith('video/')?'Video' as const:file.type.startsWith('image/')?'Images' as const:file.type.startsWith('audio/')?'Audio' as const:'Other' as const;return{id,name:file.name,mime:file.type||'application/octet-stream',category,size:file.size,addedAt:createdAt,url:URL.createObjectURL(file),tags:['phone import'],role:category==='Video'?'B-roll' as const:category==='Audio'?'Audio' as const:'Unassigned' as const,storageKey:id,persistence:'saving' as const,projectId:project.id}})
  setProject(current=>({...current,resources:[...current.resources,...assets]}))
  await Promise.allSettled(assets.map(async(asset,index)=>{try{await persistMedia({id:asset.id,blob:incoming[index],name:asset.name,mime:asset.mime,projectId:project.id,createdAt});setProject(current=>({...current,resources:current.resources.map(item=>item.id===asset.id?{...item,persistence:'durable'}:item)}))}catch{setProject(current=>({...current,resources:current.resources.map(item=>item.id===asset.id?{...item,persistence:'failed'}:item)}))}}))
  notify(`${incoming.length} media item${incoming.length===1?'':'s'} added to Files`)
}

function posterFromVideo(url:string):Promise<string|undefined>{
  return new Promise(resolve=>{const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='metadata';video.src=url;const finish=()=>{video.remove();resolve(undefined)};video.onerror=finish;video.onloadedmetadata=()=>{video.currentTime=Math.min(1,Math.max(.05,video.duration*.05))};video.onseeked=()=>{try{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const context=canvas.getContext('2d');if(!context)return finish();context.drawImage(video,0,0,320,180);const poster=canvas.toDataURL('image/jpeg',.68);video.remove();resolve(poster)}catch{finish()}}})
}
