import type { Project, ResourceAsset, Take, TimelineClip } from '../../types'
import { sequenceDuration } from '../editor/sequenceOperations.ts'

export type CompletedTakeInput={
  id:string
  projectId:string
  scriptBlockId?:string
  section:string
  takeNumber:number
  durationSeconds:number
  mimeType:string
  size:number
  createdAt:string
  url:string
  cameraLabel?:string
  microphoneLabel?:string
}

export function extensionForMime(mime:string){
  return mime.includes('mp4')?'mp4':mime.includes('webm')?'webm':mime.includes('quicktime')?'mov':'video'
}

export function createTakeAndAsset(input:CompletedTakeInput):{take:Take;asset:ResourceAsset}{
  const label=`Take ${input.takeNumber}`
  const safeSection=input.section.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'recording'
  const name=`${safeSection}-${label.replace(' ','-')}.${extensionForMime(input.mimeType)}`
  const asset:ResourceAsset={id:input.id,name,mime:input.mimeType,category:'Video',size:input.size,addedAt:input.createdAt,url:input.url,tags:['recorded','a-roll',safeSection.toLowerCase()],role:'A-roll',duration:input.durationSeconds,storageKey:input.id,persistence:'saving',recorded:true,projectId:input.projectId,scriptBlockId:input.scriptBlockId,cameraLabel:input.cameraLabel,microphoneLabel:input.microphoneLabel}
  const take:Take={id:input.id,assetId:input.id,projectId:input.projectId,scriptBlockId:input.scriptBlockId,section:input.section,label,duration:formatDuration(input.durationSeconds),durationSeconds:input.durationSeconds,preferred:false,url:input.url,createdAt:input.createdAt,cameraLabel:input.cameraLabel,microphoneLabel:input.microphoneLabel,mime:input.mimeType}
  return{take,asset}
}

export function formatDuration(seconds:number){const whole=Math.max(0,Math.round(seconds)),minutes=Math.floor(whole/60);return`${String(minutes).padStart(2,'0')}:${String(whole%60).padStart(2,'0')}`}

export function preferredTakeClips(project:Project,startAt?:number):TimelineClip[]{
  const takes=project.blocks.flatMap(block=>project.takes.filter(take=>take.scriptBlockId===block.id&&take.preferred&&take.assetId))
  const fallback=project.takes.filter(take=>take.preferred&&take.assetId&&!take.scriptBlockId)
  const selected=[...takes,...fallback]
  let cursor=startAt??sequenceDuration(project.timelineClips)
  return selected.flatMap(take=>{
    const duration=take.durationSeconds||project.resources.find(asset=>asset.id===take.assetId)?.duration||1
    const linkGroupId=`take-${take.id}`
    const base={assetId:take.assetId,name:`${take.section} · ${take.label}`,timelineStart:cursor,sourceIn:0,sourceOut:duration,duration,opacity:1,volume:1,fit:'Cover' as const,scale:1,rotation:0,positionX:0,positionY:0,flipX:false,flipY:false,blendMode:'Normal' as const,linkGroupId}
    const clips:TimelineClip[]=[{...base,id:`${take.id}-v`,trackId:'v1',type:'video'},{...base,id:`${take.id}-a`,trackId:'a1',type:'audio'}]
    cursor+=duration
    return clips
  })
}
