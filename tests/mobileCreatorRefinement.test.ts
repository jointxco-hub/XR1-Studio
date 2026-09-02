import assert from 'node:assert/strict'
import test from 'node:test'
import type { TimelineClip } from '../src/types.ts'
import { clampPlayhead, replaceQuickTake, rippleDeleteQuick, sequenceClipCount, sequenceDuration, splitQuickClip, trimQuickClip } from '../src/features/editor/sequenceOperations.ts'
import { punctuationDelay, readPromptPosition } from '../src/features/recording/promptPreferences.ts'

const clip=(overrides:Partial<TimelineClip>={}):TimelineClip=>({id:'v',trackId:'v1',type:'video',assetId:'asset',name:'Take 1',timelineStart:0,sourceIn:0,sourceOut:10,duration:10,opacity:1,volume:1,fit:'Cover',scale:1,rotation:0,positionX:0,positionY:0,flipX:false,flipY:false,blendMode:'Normal',linkGroupId:'pair',...overrides})

test('empty sequence has canonical zero duration and zero media clips',()=>{
  assert.equal(sequenceDuration([]),0)
  assert.equal(sequenceClipCount([]),0)
  assert.equal(clampPlayhead(39,[]),0)
})

test('canonical count deduplicates linked camera audio and ignores captions',()=>{
  const clips=[clip(),clip({id:'a',type:'audio',trackId:'a1'}),clip({id:'cc',type:'caption',trackId:'cc',linkGroupId:undefined,timelineStart:0,duration:39})]
  assert.equal(sequenceClipCount(clips),1)
  assert.equal(sequenceDuration(clips),10)
})

test('quick ripple delete removes linked A/V and closes the sequence gap',()=>{
  const clips=[clip(),clip({id:'a',type:'audio',trackId:'a1'}),clip({id:'v2',assetId:'asset-2',linkGroupId:'pair-2',timelineStart:10}),clip({id:'a2',type:'audio',trackId:'a1',assetId:'asset-2',linkGroupId:'pair-2',timelineStart:10})]
  const result=rippleDeleteQuick(clips,'v')
  assert.deepEqual(result.map(item=>item.id),['v2','a2'])
  assert.ok(result.every(item=>item.timelineStart===0))
})

test('quick split, trim and replace preserve linked picture and sound',()=>{
  const paired=[clip(),clip({id:'a',type:'audio',trackId:'a1'})]
  const split=splitQuickClip(paired,'v',4,(()=>{let value=0;return()=>`new-${++value}`})())
  assert.equal(split.length,4)
  assert.deepEqual(split.map(item=>item.duration),[4,6,4,6])
  const trimmed=trimQuickClip(paired,'v',2,8)
  assert.ok(trimmed.every(item=>item.duration===6&&item.timelineStart===2))
  const replaced=replaceQuickTake(paired,'v',{id:'take',assetId:'new-asset',section:'Hook',label:'Take 3',duration:'00:07',durationSeconds:7,preferred:false},{id:'new-asset',name:'take3.mp4',mime:'video/mp4',category:'Video',size:1,addedAt:'',tags:[],role:'A-roll'})
  assert.ok(replaced.every(item=>item.assetId==='new-asset'&&item.duration===7&&item.timelineStart===0))
})

test('prompter defaults high, persists valid choices, and respects punctuation',()=>{
  assert.equal(readPromptPosition({getItem:()=>null}),'high')
  assert.equal(readPromptPosition({getItem:()=> 'low'}),'low')
  assert.equal(readPromptPosition({getItem:()=> 'sideways'}),'high')
  assert.ok(punctuationDelay('finished.',400)>punctuationDelay('finished',400))
})
