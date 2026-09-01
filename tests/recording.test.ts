import assert from 'node:assert/strict'
import test from 'node:test'
import { detectMediaCapability, humaniseMediaError, selectRecordingMime, transitionRecording } from '../src/features/recording/recordingMachine.ts'
import { createTakeAndAsset, preferredTakeClips } from '../src/features/recording/takeFactory.ts'
import { starterProject } from '../src/data.ts'

test('one deliberate record path reaches recording only after the recorder starts',()=>{
  let state=transitionRecording('idle','REQUEST_PERMISSION')
  assert.equal(state,'requesting_permission')
  state=transitionRecording(state,'STREAM_READY')
  assert.equal(state,'preview_ready')
  state=transitionRecording(state,'PREPARE')
  assert.equal(state,'preparing_recording')
  state=transitionRecording(state,'RECORDER_STARTED')
  assert.equal(state,'recording')
})

test('recording stop is processed and saved from real events',()=>{
  let state=transitionRecording('recording','STOP')
  state=transitionRecording(state,'RECORDER_STOPPED')
  assert.equal(state,'processing')
  assert.equal(transitionRecording(state,'SAVE_SUCCESS'),'saved')
  assert.equal(transitionRecording(state,'FAIL'),'error')
})

test('MIME selection chooses the first browser-supported candidate',()=>{
  assert.equal(selectRecordingMime(type=>type.includes('vp8')),'video/webm;codecs=vp8,opus')
  assert.equal(selectRecordingMime(()=>false),'')
})

test('capability fallback explains insecure and unsupported browsers',()=>{
  const insecure=detectMediaCapability({isSecureContext:false,navigator:{mediaDevices:{getUserMedia(){}}},MediaRecorder:{isTypeSupported:()=>true}})
  assert.equal(insecure.supported,false)
  assert.match(insecure.reason||'',/HTTPS/)
  const unsupported=detectMediaCapability({isSecureContext:true,navigator:{}})
  assert.equal(unsupported.mediaRecorder,false)
  assert.equal(unsupported.supported,false)
})

test('permission and storage failures have recovery language',()=>{
  assert.match(humaniseMediaError(new DOMException('Denied','NotAllowedError')),/site settings/)
  assert.match(humaniseMediaError(new DOMException('Full','QuotaExceededError')),/storage is full/)
})

test('take creation associates project, script, file metadata and source devices',()=>{
  const result=createTakeAndAsset({id:'take-1',projectId:'project-1',scriptBlockId:'hook',section:'Hook',takeNumber:2,durationSeconds:29,mimeType:'video/mp4',size:4096,createdAt:'2026-09-01T10:00:00.000Z',url:'blob:test',cameraLabel:'Front camera',microphoneLabel:'Phone mic'})
  assert.equal(result.take.label,'Take 2')
  assert.equal(result.take.assetId,result.asset.id)
  assert.equal(result.asset.role,'A-roll')
  assert.equal(result.asset.storageKey,'take-1')
  assert.equal(result.asset.persistence,'saving')
  assert.equal(result.take.duration,'00:29')
})

test('preferred takes build linked V1/A1 clips in script order without replacing edits',()=>{
  const project=structuredClone(starterProject)
  project.timelineClips=[]
  project.resources=[{id:'hook-asset',name:'Hook.mp4',mime:'video/mp4',category:'Video',size:1,addedAt:'',tags:[],role:'A-roll',duration:4},{id:'context-asset',name:'Context.mp4',mime:'video/mp4',category:'Video',size:1,addedAt:'',tags:[],role:'A-roll',duration:7}]
  project.takes=[{id:'hook-take',assetId:'hook-asset',scriptBlockId:'hook',section:'Hook',label:'Take 1',duration:'00:04',durationSeconds:4,preferred:true},{id:'context-take',assetId:'context-asset',scriptBlockId:'context',section:'Context',label:'Take 1',duration:'00:07',durationSeconds:7,preferred:true}]
  const clips=preferredTakeClips(project)
  assert.equal(clips.length,4)
  assert.deepEqual(clips.map(clip=>clip.trackId),['v1','a1','v1','a1'])
  assert.equal(clips[2].timelineStart,4)
  assert.equal(clips[0].linkGroupId,clips[1].linkGroupId)
})
