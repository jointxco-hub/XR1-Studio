import type { ResourceAsset, Take, TimelineClip } from '../../types'

const frame = (value:number) => Math.max(0, Math.round(value * 25) / 25)

export function primarySequenceClips(clips:TimelineClip[]){
  const linkedVideoGroups=new Set(clips.filter(clip=>clip.type==='video'&&clip.linkGroupId).map(clip=>clip.linkGroupId))
  return clips.filter(clip=>clip.type!=='caption'&&clip.type!=='title'&&!(clip.type==='audio'&&clip.linkGroupId&&linkedVideoGroups.has(clip.linkGroupId)))
}

export function sequenceDuration(clips:TimelineClip[]){
  const media=primarySequenceClips(clips)
  return media.length?frame(Math.max(...media.map(clip=>clip.timelineStart+clip.duration))):0
}

export function sequenceClipCount(clips:TimelineClip[]){return primarySequenceClips(clips).length}
export function clampPlayhead(time:number,clips:TimelineClip[]){return Math.min(sequenceDuration(clips),Math.max(0,time))}

function relatedIds(clips:TimelineClip[],selectedId:string){
  const selected=clips.find(clip=>clip.id===selectedId)
  if(!selected)return new Set<string>()
  return new Set(clips.filter(clip=>clip.id===selectedId||(selected.linkGroupId&&clip.linkGroupId===selected.linkGroupId)).map(clip=>clip.id))
}

export function rippleDeleteQuick(clips:TimelineClip[],selectedId:string){
  const ids=relatedIds(clips,selectedId),removing=clips.filter(clip=>ids.has(clip.id))
  if(!removing.length)return clips
  const start=Math.min(...removing.map(clip=>clip.timelineStart)),end=Math.max(...removing.map(clip=>clip.timelineStart+clip.duration)),gap=end-start
  return clips.filter(clip=>!ids.has(clip.id)).map(clip=>clip.timelineStart>=end?{...clip,timelineStart:frame(clip.timelineStart-gap)}:clip)
}

export function trimQuickClip(clips:TimelineClip[],selectedId:string,nextIn:number,nextOut:number){
  const selected=clips.find(clip=>clip.id===selectedId)
  if(!selected)return clips
  const sourceIn=Math.max(0,Math.min(nextIn,nextOut-.04)),sourceOut=Math.max(sourceIn+.04,nextOut),duration=frame(sourceOut-sourceIn),delta=sourceIn-selected.sourceIn
  return clips.map(clip=>clip.id===selectedId||(selected.linkGroupId&&clip.linkGroupId===selected.linkGroupId)?{...clip,sourceIn:frame(sourceIn),sourceOut:frame(sourceOut),duration,timelineStart:frame(clip.timelineStart+delta)}:clip)
}

export function splitQuickClip(clips:TimelineClip[],selectedId:string,time:number,idFactory=()=>crypto.randomUUID()){
  const ids=relatedIds(clips,selectedId),linkMap=new Map<string,string>()
  return clips.flatMap(clip=>{
    if(!ids.has(clip.id))return [clip]
    const offset=frame(time-clip.timelineStart)
    if(offset<.04||offset>clip.duration-.04)return [clip]
    const linkGroupId=clip.linkGroupId?(linkMap.get(clip.linkGroupId)||(()=>{const id=idFactory();linkMap.set(clip.linkGroupId!,id);return id})()):undefined
    return [{...clip,duration:offset,sourceOut:frame(clip.sourceIn+offset)},{...clip,id:idFactory(),linkGroupId,timelineStart:frame(time),sourceIn:frame(clip.sourceIn+offset),duration:frame(clip.duration-offset)}]
  })
}

export function replaceQuickTake(clips:TimelineClip[],selectedId:string,take:Take,asset:ResourceAsset){
  const selected=clips.find(clip=>clip.id===selectedId)
  if(!selected)return clips
  const duration=Math.max(.04,take.durationSeconds||asset.duration||selected.duration)
  return clips.map(clip=>clip.id===selectedId||(selected.linkGroupId&&clip.linkGroupId===selected.linkGroupId)?{...clip,assetId:asset.id,name:take.label,sourceIn:0,sourceOut:duration,duration}:clip)
}
