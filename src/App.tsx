import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { defaultTimelineTracks, stageMeta, starterProject } from './data'
import type { BrollPlacement, EditCut, Project, ResourceAsset, ScriptBlock, Shot, StageId, Take, TimelineClip, TimelineMarker, TimelineTrack, TranscriptLine } from './types'
import { linkedClipIds as getLinkedClipIds, trimTimelineClips } from './timelineOperations'
import { CaptureStage } from './features/recording/CaptureStage'
import { deleteMedia, loadMedia, persistMedia } from './lib/mediaStorage'

type IconName =
  | 'arrow' | 'brief' | 'camera' | 'check' | 'chevron' | 'copy' | 'download'
  | 'edit' | 'expand' | 'eye' | 'file' | 'folder' | 'home' | 'layers' | 'link'
  | 'mic' | 'more' | 'pause' | 'play' | 'plus' | 'record' | 'search' | 'settings'
  | 'spark' | 'trash' | 'upload' | 'video' | 'x'
  | 'cursor' | 'trimtool' | 'scissors' | 'handtool' | 'undo' | 'redo' | 'magnet'
  | 'marker' | 'keyboard' | 'history' | 'target' | 'sync' | 'mute' | 'visible' | 'lock'

const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  brief: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>,
  camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z"/><circle cx="12" cy="13" r="3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></>,
  expand: <><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>,
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  layers: <><path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  pause: <><path d="M8 5v14M16 5v14"/></>,
  play: <path d="m7 4 12 8-12 8z"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  record: <circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
  upload: <><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M5 20h14"/></>,
  video: <><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></>,
  x: <path d="m6 6 12 12M18 6 6 18"/>,
  cursor: <><path d="M6 4v16l4.4-4.3 2.7 4.7 2.2-1.3-2.8-4.8H20z"/><path d="M6 4h14" opacity="0"/></>,
  trimtool: <><path d="M5 7h9"/><path d="M5 17h9"/><path d="M14 4v16"/><path d="M19 6v12"/></>,
  scissors: <><circle cx="7" cy="17" r="2.4"/><circle cx="7" cy="7" r="2.4"/><path d="M9 8.4 20 4"/><path d="M9 15.6 20 20"/></>,
  handtool: <><path d="M8 12V6a1.6 1.6 0 1 1 3.2 0v5"/><path d="M11.2 11V5.5a1.6 1.6 0 1 1 3.2 0V11"/><path d="M14.4 11V7a1.6 1.6 0 1 1 3.2 0v7"/><path d="M17.6 12v-2a1.6 1.6 0 1 1 3.2 0v5.2c0 3.1-2 5.8-5.5 5.8h-4c-3.1 0-5.6-2.5-5.6-5.6v-3.7a1.6 1.6 0 1 1 3.2 0V13"/></>,
  undo: <><path d="M9 7H4v5"/><path d="M4 12c2-4 5.3-6 9.5-6 4.4 0 7.7 2.7 8.5 7"/></>,
  redo: <><path d="M15 7h5v5"/><path d="M20 12c-2-4-5.3-6-9.5-6-4.4 0-7.7 2.7-8.5 7"/></>,
  magnet: <><path d="M8 3v7a4 4 0 0 0 8 0V3"/><path d="M8 7H5"/><path d="M19 7h-3"/></>,
  marker: <><path d="M6 4h10a2 2 0 0 1 2 2v14l-5-3-5 3V6a2 2 0 0 1 2-2Z"/></>,
  keyboard: <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M7 14h6M15 14h2"/></>,
  history: <><path d="M12 8v5l3 2"/><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/></>,
  target: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  sync: <><path d="M7 7h10v10"/><path d="m17 7-3 3"/><path d="M7 17h10V7"/><path d="m7 14 3-3"/></>,
  mute: <><path d="M5 10v4h3l4 4V6L8 10Z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></>,
  visible: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></>,
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>
}
function makeId(){return globalThis.crypto?.randomUUID?.() ?? `x1-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}

function normaliseProject(input: Partial<Project>, fallbackId: string = makeId()): Project {
  const merged = { ...starterProject, ...input, id: input.id || fallbackId }
  return {
    ...merged,
    draftScript: input.draftScript ?? starterProject.draftScript,
    editBrollIds: input.editBrollIds ?? [],
    editCuts: input.editCuts ?? [],
    brollPlacements: input.brollPlacements ?? [],
    timelineTracks: (input.timelineTracks ?? defaultTimelineTracks).map(track => ({ ...track, targeted: track.targeted ?? true, syncLocked: track.syncLocked ?? true })),
    timelineClips: (input.timelineClips ?? []).map(clip => ({
      ...clip,
      scale: clip.scale ?? 1,
      rotation: clip.rotation ?? 0,
      positionX: clip.positionX ?? 0,
      positionY: clip.positionY ?? 0,
      flipX: clip.flipX ?? false,
      flipY: clip.flipY ?? false,
      blendMode: clip.blendMode ?? 'Normal',
    })),
    timelineMarkers: input.timelineMarkers ?? [],
    editorSettings: { ...starterProject.editorSettings, ...(input.editorSettings ?? {}) },
    shots: (input.shots ?? starterProject.shots).map((shot,index) => ({
      shotNumber: `${index+1}A`, shotType:'B-roll', framing:'Medium', movement:'Locked',
      purpose:'', priority:'Support', duration:5, notes:'', order:index, ...shot,
    })),
    resources: (input.resources ?? starterProject.resources).map(file => ({
      ...file,
      tags: file.tags ?? inferTags(file.name),
      role: file.role ?? inferRole(file.name, file.category),
    })),
    publish: { ...starterProject.publish, ...(input.publish ?? {}) },
  }
}
function restoreProject(input:Partial<Project>){
  const resources=(input.resources??starterProject.resources).map(resource=>{const copy={...resource};delete copy.url;delete copy.proxyUrl;return copy})
  return normaliseProject({...input,resources,publish:{...starterProject.publish,...(input.publish??{}),thumbnailUrl:undefined}},input.id||makeId())
}


type BlueprintScene={
  title:string
  purpose:string
  script:string
  primaryShot:string
  screenActions:string[]
  broll:string
  onScreenText:string[]
  editNotes:string[]
  recordingNotes:string[]
}
type BlueprintSummary={title:string;sceneCount:number;scriptedSceneCount:number;shotCount:number;warnings:string[];scenes:{title:string;words:number;preview:string}[]}
type ParsedBlueprint={project:Partial<Project>;summary:BlueprintSummary}
type FrontMatterData={scalars:Record<string,string>;lists:Record<string,string[]>}

function cleanBlueprintValue(value:string){
  const trimmed=value.trim().replace(/^['"]|['"]$/g,'')
  return trimmed.replace(/\\n/g,'\n')
}
function normaliseBlueprintHeading(value:string){return value.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim()}
function parseSimpleFrontMatter(front:string):FrontMatterData{
  const scalars:Record<string,string>={},lists:Record<string,string[]>={}
  const stack:{indent:number;key:string}[]=[]
  for(const raw of front.replaceAll('\r','').split('\n')){
    if(!raw.trim()||raw.trimStart().startsWith('#'))continue
    const indent=raw.match(/^\s*/)?.[0].length||0,line=raw.trim()
    while(stack.length&&stack.at(-1)!.indent>=indent)stack.pop()
    const bullet=line.match(/^[-*]\s+(.+)$/)
    if(bullet){
      const path=stack.map(item=>item.key).join('.')
      if(path)(lists[path]??=[]).push(cleanBlueprintValue(bullet[1]))
      continue
    }
    const pair=line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if(!pair)continue
    const key=pair[1],value=pair[2].trim(),path=[...stack.map(item=>item.key),key].join('.')
    if(value){
      if(/^\[.*\]$/.test(value))lists[path]=value.slice(1,-1).split(',').map(cleanBlueprintValue).filter(Boolean)
      else scalars[path]=cleanBlueprintValue(value)
    }else stack.push({indent,key})
  }
  return{scalars,lists}
}
function frontScalar(front:FrontMatterData,...paths:string[]){for(const path of paths){const value=front.scalars[path];if(value)return value}return''}
function frontList(front:FrontMatterData,...paths:string[]){for(const path of paths){const value=front.lists[path];if(value?.length)return value}return[]}
function splitHeadingSections(body:string,level=3){
  const marker='#'.repeat(level),pattern=new RegExp(`^${marker}\\s+(.+?)\\s*$`,'gm'),matches=[...body.matchAll(pattern)],result=new Map<string,string>()
  matches.forEach((match,index)=>{const from=(match.index||0)+match[0].length,to=index+1<(matches.length)?matches[index+1].index!:body.length;result.set(normaliseBlueprintHeading(match[1]),body.slice(from,to).trim())})
  return result
}
function blueprintSection(sections:Map<string,string>,...aliases:string[]){
  for(const alias of aliases){const exact=sections.get(normaliseBlueprintHeading(alias));if(exact!==undefined)return exact}
  for(const [heading,value] of sections){if(aliases.some(alias=>heading.includes(normaliseBlueprintHeading(alias))))return value}
  return''
}
function blueprintList(value:string){
  const lines=value.replaceAll('\r','').split('\n'),items:string[]=[]
  for(const line of lines){
    const item=line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/)?.[1]?.trim()
    if(item&&!/^[a-z_ -]+:\s*$/i.test(item))items.push(cleanBlueprintValue(item.replace(/^['"]|['"]$/g,'')))
  }
  return items.length?items:value.split(/\n+/).map(line=>line.trim()).filter(Boolean)
}
function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function structuredValue(value:string,keys:string[]){
  for(const key of keys){const match=value.match(new RegExp(`^\\s*(?:[-*]\\s*)?${escapeRegExp(key)}\\s*:\\s*(.+)$`,'mi'));if(match)return cleanBlueprintValue(match[1])}
  return''
}
function firstStructuredValue(value:string,keys:string[]){return structuredValue(value,keys)||blueprintList(value)[0]||value.trim()}
function structuredValues(value:string,key:string){
  const pattern=new RegExp(`^\\s*(?:[-*]\\s*)?${escapeRegExp(key)}\\s*:\\s*(.+)$`,'gmi')
  return[...value.matchAll(pattern)].map(match=>cleanBlueprintValue(match[1])).filter(Boolean)
}
function draftSectionsFromMarkdown(body:string){
  const h2=/^##\s+(.+?)\s*$/gm,matches=[...body.matchAll(h2)]
  if(!matches.length){
    const blocks=draftToBlocks(body,[])
    return blocks.map(block=>({title:block.label,purpose:'',script:block.text,primaryShot:'',screenActions:[],broll:'',onScreenText:[],editNotes:[],recordingNotes:[]} satisfies BlueprintScene))
  }
  const ignored=new Set(['video structure','project settings','assets','asset requirements','publishing','metadata','template library','what happens after upload','best technical approach','recommended on screen flow'])
  return matches.flatMap((match,index)=>{
    const title=match[1].replace(/^scene\s+\d+\s*[:\-.–—]?\s*/i,'').trim(),from=(match.index||0)+match[0].length,to=index+1<matches.length?matches[index+1].index!:body.length,sceneBody=body.slice(from,to).trim(),sections=splitHeadingSections(sceneBody,3)
    const directCopy=sceneBody.split(/^###\s+/m)[0].trim()
    const purpose=blueprintSection(sections,'Purpose','Goal','Objective','Scene purpose')
    const script=blueprintSection(sections,'Presenter Script','Teleprompter Script','Full Script','Script','Narration','Voice-over','Voiceover','Dialogue','Copy')||directCopy
    const primaryShot=blueprintSection(sections,'Primary Shot','Main Shot','A-Roll','A roll','Camera Shot')
    const screenActions=blueprintList(blueprintSection(sections,'Screen Actions','Screen Recording Actions','Demo Actions','Actions'))
    const broll=blueprintSection(sections,'B-Roll','B roll','Broll','Supporting Visuals','Visuals')
    const onScreenText=blueprintList(blueprintSection(sections,'On-Screen Text','On screen text','Text Overlays','Graphics','Titles'))
    const editNotes=blueprintList(blueprintSection(sections,'Edit Notes','Editing Instructions','Editing Notes','Post Notes'))
    const recordingNotes=blueprintList(blueprintSection(sections,'Recording Notes','Delivery Notes','Presenter Notes','Performance Notes'))
    const recognised=Boolean(script||purpose||primaryShot||broll||screenActions.length||onScreenText.length||editNotes.length||recordingNotes.length)
    if(!recognised||ignored.has(normaliseBlueprintHeading(title)))return[]
    return[{title,purpose,script,primaryShot,screenActions,broll,onScreenText,editNotes,recordingNotes} satisfies BlueprintScene]
  })
}
function parseBlueprint(markdown:string):ParsedBlueprint{
  const clean=markdown.replace(/^```[^\n]*\n?/i,'').replace(/```\s*$/,'').replaceAll('\r','').trim()
  const frontMatch=clean.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/),front=parseSimpleFrontMatter(frontMatch?.[1]||''),body=(frontMatch?clean.slice(frontMatch[0].length):clean).trim()
  const scenes=draftSectionsFromMarkdown(body)
  if(!scenes.length)throw new Error('No usable video sections were found. Add “## Scene 1: Hook” or “## Hook” headings with script text beneath them.')
  const warnings:string[]=[]
  const blocks:ScriptBlock[]=scenes.map(scene=>({
    id:makeId(),label:scene.title,text:scene.script.trim(),note:scene.recordingNotes.join(' · '),
    visual:[scene.primaryShot,scene.broll,scene.screenActions.length?`Screen actions:\n${scene.screenActions.map(item=>`• ${item}`).join('\n')}`:'',scene.onScreenText.length?`On-screen text: ${scene.onScreenText.join(' / ')}`:'',scene.editNotes.length?`Edit: ${scene.editNotes.join(' · ')}`:''].filter(Boolean).join('\n\n')
  }))
  const shots:Shot[]=[]
  scenes.forEach((scene,index)=>{
    const add=(partial:Partial<Shot>)=>shots.push({id:makeId(),section:scene.title,description:partial.description||`${scene.title} visual`,source:partial.source||'Record or source manually',status:partial.status||'Needs filming',shotNumber:`${index+1}${String.fromCharCode(65+shots.filter(item=>item.section===scene.title).length)}`,shotType:partial.shotType||'B-roll',framing:partial.framing||'Medium',movement:partial.movement||'Locked',purpose:scene.purpose,priority:partial.priority||'Support',duration:partial.duration||5,notes:partial.notes||scene.editNotes.join(' · '),order:shots.length})
    if(scene.primaryShot){
      const description=structuredValue(scene.primaryShot,['description','shot','action'])||`${scene.title} primary shot`,typeText=structuredValue(scene.primaryShot,['type']),framingText=structuredValue(scene.primaryShot,['framing']),movementText=structuredValue(scene.primaryShot,['movement']),duration=Number(structuredValue(scene.primaryShot,['estimated_duration_seconds','duration','length']))||8
      const shotType:Shot['shotType']=/screen/i.test(typeText+scene.primaryShot)?'Screen recording':/b.?roll/i.test(typeText)?'B-roll':/graphic|title/i.test(typeText)?'Graphic / title':'A-roll'
      const framing:Shot['framing']=/macro/i.test(framingText)?'Macro':/close/i.test(framingText)?'Close-up':/wide/i.test(framingText)?'Wide':/screen/i.test(framingText+scene.primaryShot)?'Screen':'Medium'
      const movement:Shot['movement']=/hand/i.test(movementText)?'Handheld':/push/i.test(movementText)?'Push in':/pull/i.test(movementText)?'Pull out':/pan/i.test(movementText)?'Pan':/tilt/i.test(movementText)?'Tilt':/screen/i.test(movementText+scene.primaryShot)?'Screen capture':'Locked'
      add({description,shotType,framing,movement,duration,status:shotType==='Screen recording'?'Needs screen recording':'Needs filming',priority:'Essential',notes:[...scene.screenActions,...scene.editNotes].join(' · ')})
    }
    const brollDescriptions=structuredValues(scene.broll,'description')
    const brollItems=brollDescriptions.length?brollDescriptions:(scene.broll?blueprintList(scene.broll).filter(item=>!/^\w[\w _-]*\s*:/i.test(item)):[])
    brollItems.slice(0,12).forEach(description=>add({description,shotType:'B-roll',priority:'Support',duration:5,notes:scene.editNotes.join(' · ')}))
    if(scene.screenActions.length&&!scene.primaryShot.toLowerCase().includes('screen'))add({description:`Screen demonstration: ${scene.screenActions.join(' → ')}`,shotType:'Screen recording',framing:'Screen',movement:'Screen capture',status:'Needs screen recording',priority:'Essential',duration:Math.max(6,scene.screenActions.length*3),notes:scene.editNotes.join(' · ')})
    if(scene.onScreenText.length)add({description:`On-screen text: ${scene.onScreenText.join(' / ')}`,shotType:'Graphic / title',framing:'Graphic',status:'Needs design',priority:'Support',duration:Math.max(3,scene.onScreenText.length*2)})
  })
  const title=frontScalar(front,'title','working_title','project.title')||clean.match(/^#\s+(.+)$/m)?.[1]?.trim()||'Imported video blueprint'
  const target=Number(frontScalar(front,'target_duration_minutes','format.target_duration_minutes','duration_minutes'))||Math.max(1,Math.ceil(blocks.reduce((n,b)=>n+b.text.split(/\s+/).filter(Boolean).length,0)/135))
  const audience=frontList(front,'audience.primary','audience','target_audience'),objectivePrimary=frontScalar(front,'objective.primary','objective','goal'),businessResult=frontScalar(front,'objective.business_result','business_result'),viewerResult=frontScalar(front,'objective.viewer_result','viewer_result','outcome')
  const scriptedSceneCount=blocks.filter(block=>block.text.trim()).length
  if(scriptedSceneCount<blocks.length)warnings.push(`${blocks.length-scriptedSceneCount} scene${blocks.length-scriptedSceneCount===1?' has':'s have'} no presenter script. Their production notes were still imported.`)
  if(!shots.length)warnings.push('No shot instructions were detected. Script sections were imported and you can build the shot board manually.')
  const project:Partial<Project>={
    title,series:frontScalar(front,'series','show','channel')||'YT Studio',format:frontScalar(front,'content_style','format.content_style','project_type','format')||'Product demonstration',
    viewer:audience.join(', ')||frontScalar(front,'audience.primary','audience','target_audience'),premise:[objectivePrimary,businessResult].filter(Boolean).join('\n')||scenes[0]?.purpose||'',brainstorm:`Imported blueprint · ${scenes.length} scenes · ${shots.length} planned shots`,outcome:viewerResult||'Move from idea to finished video faster.',targetMinutes:target,mode:'Full script',blocks,shots,draftScript:blocksToDraft(blocks),
    publish:{...starterProject.publish,title,description:[objectivePrimary,businessResult,viewerResult].filter(Boolean).join('\n\n'),keywords:frontList(front,'keywords','publish.keywords'),alternativeTitles:frontList(front,'alternative_titles','publish.alternative_titles'),searchIntent:frontScalar(front,'search_intent','publish.search_intent'),thumbnailText:(frontScalar(front,'thumbnail_text','publish.thumbnail_text')||title.slice(0,36)).toUpperCase(),thumbnailBrief:frontScalar(front,'thumbnail_brief','publish.thumbnail_brief')||'Create from the strongest visual promise in the blueprint.',pinnedComment:frontScalar(front,'pinned_comment','publish.pinned_comment')}
  }
  return{project,summary:{title,sceneCount:blocks.length,scriptedSceneCount,shotCount:shots.length,warnings,scenes:blocks.map(block=>({title:block.label,words:block.text.trim()?block.text.trim().split(/\s+/).length:0,preview:block.text.trim().replace(/\s+/g,' ').slice(0,150)}))}}
}
function makeBlankProject(format = 'Founder breakdown'):Project{
  return normaliseProject({
    ...starterProject,id:makeId(),title:'Untitled story',premise:'',brainstorm:'',outcome:'',viewer:'',format,draftScript:'',
    blocks:starterProject.blocks.map(block=>({...block,id:makeId(),text:'',note:'',visual:''})),shots:[],takes:[],resources:[],editBrollIds:[],editCuts:[],brollPlacements:[],timelineTracks:defaultTimelineTracks.map(track=>({...track})),timelineClips:[],timelineMarkers:[],
    publish:{...starterProject.publish,title:'',description:'',pinnedComment:'',keywords:[],alternativeTitles:[],searchIntent:'',thumbnailText:'',thumbnailBrief:'',thumbnailUrl:undefined,thumbnailName:undefined},
  })
}

function useProjectStore() {
  const [saveState,setSaveState]=useState<'saving'|'saved'|'failed'>('saved')
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('x1-content-studio-projects')
      if (saved) {
        const parsed=JSON.parse(saved) as unknown
        if(Array.isArray(parsed)){
          const valid=parsed.filter((item):item is Partial<Project>=>Boolean(item)&&typeof item==='object')
          if(valid.length)return valid.map(p=>restoreProject(p))
        }
      }
      const legacy = localStorage.getItem('x1-content-studio-project')
      return [restoreProject(legacy ? JSON.parse(legacy) : starterProject)]
    } catch { return [normaliseProject(starterProject, starterProject.id)] }
  })
  const [activeId, setActiveId] = useState(() => {try{return localStorage.getItem('x1-content-studio-active')||projects[0]?.id||starterProject.id}catch{return projects[0]?.id||starterProject.id}})
  const project = projects.find(p => p.id === activeId) ?? projects[0] ?? normaliseProject(starterProject,starterProject.id)
  const setProject: React.Dispatch<React.SetStateAction<Project>> = action => setProjects(current => current.map(item => {
    if (item.id !== project.id) return item
    return normaliseProject(typeof action === 'function' ? action(item) : action, item.id)
  }))
  const importBlueprint = (markdown:string) => {
    const parsed=parseBlueprint(markdown)
    const next=normaliseProject({...starterProject,...parsed.project,id:makeId(),resources:[],takes:[],timelineClips:[],timelineMarkers:[],editCuts:[],brollPlacements:[]})
    setProjects(current=>[...current,next]);setActiveId(next.id);return{project:next,summary:parsed.summary}
  }
  const createProject = (format = 'Founder breakdown') => {
    const next=makeBlankProject(format)
    setProjects(current => [...current, next]); setActiveId(next.id)
    return next
  }
  const deleteProject=(id:string)=>{
    const remaining=projects.filter(item=>item.id!==id),next=remaining.length?remaining:[makeBlankProject()]
    setProjects(next)
    if(id===activeId||!next.some(item=>item.id===activeId))setActiveId(next[0].id)
    try{localStorage.removeItem(`x1-editor-revisions-${id}`)}catch{/* Ignore blocked storage. */}
  }
  const saveTimer=useRef<number|null>(null)
  useEffect(() => {
    setSaveState('saving')
    if(saveTimer.current)window.clearTimeout(saveTimer.current)
    saveTimer.current=window.setTimeout(()=>{
      try{
        const persistent=JSON.stringify(projects,(key,value)=>key==='url'||key==='proxyUrl'||key==='thumbnailUrl'?undefined:value)
        localStorage.setItem('x1-content-studio-projects', persistent)
        localStorage.setItem('x1-content-studio-active', activeId)
        localStorage.setItem('x1-content-studio-project', JSON.stringify(project,(key,value)=>key==='url'||key==='proxyUrl'||key==='thumbnailUrl'?undefined:value))
        setSaveState('saved')
      }catch{setSaveState('failed')}
    },300)
    return()=>{if(saveTimer.current)window.clearTimeout(saveTimer.current)}
  }, [projects, activeId, project])
  return { project, setProject, projects, setActiveId, createProject, importBlueprint, deleteProject, saveState }
}

function App() {
  const search = new URLSearchParams(location.search)
  if (search.get('prompter') === '1') return <StandalonePrompter />

  const { project, setProject, projects, setActiveId, createProject, importBlueprint, deleteProject, saveState } = useProjectStore()
  const [stage, setStage] = useState<StageId>('idea')
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [home, setHome] = useState(false)
  const [toast, setToast] = useState('')
  const [recordBlockId,setRecordBlockId]=useState<string|undefined>()
  const [mobileMore,setMobileMore]=useState(false)
  const hydratedProjects=useRef(new Set<string>())
  const historyInitialised=useRef(false),historyNavigation=useRef(false)
  useEffect(()=>{window.scrollTo(0,0)},[stage])
  useEffect(()=>{const onPop=(event:PopStateEvent)=>{historyNavigation.current=true;if(event.state?.home){historyNavigation.current=false;setHome(true);return}setHome(false);const next=(event.state?.stage||location.hash.slice(1)) as StageId;if([...stageMeta.map(item=>item.id),'files'].includes(next))setStage(next);else historyNavigation.current=false};addEventListener('popstate',onPop);return()=>removeEventListener('popstate',onPop)},[])
  useEffect(()=>{if(historyNavigation.current){historyNavigation.current=false;return}const state={stage};if(historyInitialised.current)history.pushState(state,'',`#${stage}`);else{history.replaceState(state,'',`#${stage}`);historyInitialised.current=true}},[stage])
  useEffect(()=>{if(hydratedProjects.current.has(project.id))return;hydratedProjects.current.add(project.id);void Promise.all(project.resources.filter(asset=>asset.storageKey&&!asset.url).map(async asset=>{try{const stored=await loadMedia(asset.storageKey!);if(!stored)return;const url=URL.createObjectURL(stored.blob);setProject(current=>({...current,resources:current.resources.map(item=>item.id===asset.id?{...item,url,persistence:'durable'}:item),takes:current.takes.map(take=>take.assetId===asset.id?{...take,url}:take)}))}catch{/* Metadata remains visible for recovery. */}}))},[project.id])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }
  const setPartial = (update: Partial<Project>) => setProject(p => ({ ...p, ...update }))
  const openHome=()=>{history.pushState({home:true},'','#home');setHome(true)}

  if (home) return <Dashboard projects={projects} activeId={project.id} onDelete={deleteProject} onOpen={(id,target) => { setActiveId(id); setStage(target||'idea'); setHome(false) }} onNew={format => {
    createProject(format); setStage('idea'); setHome(false)
  }} onImport={markdown=>{importBlueprint(markdown);setStage('script');setHome(false)}} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={openHome} aria-label="Open projects">
          <span className="brand-mark">X1</span>
          <span><b>Content Studio</b><small>From idea to finished story</small></span>
        </button>
        <button className="back-projects" onClick={openHome}><Icon name="home" size={16}/> All projects</button>
        <button className={stage === 'files' ? 'back-projects files-link active' : 'back-projects files-link'} onClick={() => setStage('files')}><Icon name="folder" size={16}/> Files</button>
        <nav className="stage-nav" aria-label="Production stages">
          {stageMeta.map((item, index) => {
            const active = stage === item.id
            const currentIndex = stageMeta.findIndex(s => s.id === stage)
            return <button key={item.id} className={active ? 'stage-link active' : 'stage-link'} onClick={() => setStage(item.id)}>
              <span className={index < currentIndex ? 'stage-num done' : 'stage-num'}>{index < currentIndex ? <Icon name="check" size={13}/> : item.number}</span>
              <span><b>{item.label}</b><small>{item.hint}</small></span>
            </button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="storage-meter"><span><b>Local workspace</b><small>Autosaved in this browser</small></span><span className="status-dot"/></div>
          <button className="side-utility"><Icon name="settings" size={17}/> Studio settings</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="project-crumb"><span>{project.series}</span><Icon name="chevron" size={13}/><b>{project.title}</b></div>
          <div className="top-actions">
            <span className={`save-state save-${saveState}`}>{saveState==='saving'?'Saving…':saveState==='failed'?'Save failed':'Saved'}</span>
            <button className="icon-button" onClick={() => setResourcesOpen(true)} title="Project resources"><Icon name="folder"/></button>
            <button className="avatar">JX</button>
          </div>
        </header>
        <div className="stage-content">
          {stage === 'idea' && <IdeaStage project={project} setPartial={setPartial} onNext={() => setStage('script')} />}
          {stage === 'script' && <ScriptStage project={project} setProject={setProject} onNext={() => setStage('visuals')} notify={notify} onRecord={id=>{setRecordBlockId(id);setStage('record')}} />}
          {stage === 'visuals' && <StudioBoardStage project={project} setProject={setProject} notify={notify} onNext={() => setStage('record')} />}
          {stage === 'record' && <CaptureStage project={project} setProject={setProject} notify={notify} onNext={() => setStage('edit')} initialBlockId={recordBlockId} />}
          {stage === 'edit' && <StudioEditorStage project={project} setProject={setProject} notify={notify} onNext={() => setStage('finish')} />}
          {stage === 'finish' && <FinishStage project={project} notify={notify} onNext={() => setStage('publish')} />}
          {stage === 'publish' && <PublishStage project={project} setProject={setProject} notify={notify} />}
          {stage === 'files' && <FilesStage project={project} setProject={setProject} notify={notify} />}
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Mobile production navigation">
        <button onClick={openHome}><Icon name="home"/><span>Home</span></button>
        <button className={stage==='script'?'active':''} onClick={()=>setStage('script')}><Icon name="edit"/><span>Script</span></button>
        <button className={stage==='record'?'active mobile-record-tab':''} onClick={()=>setStage('record')}><Icon name="record"/><span>Record</span></button>
        <button className={stage==='edit'?'active':''} onClick={()=>setStage('edit')}><Icon name="scissors"/><span>Edit</span></button>
        <button className={mobileMore?'active':''} onClick={()=>setMobileMore(value=>!value)}><Icon name="more"/><span>More</span></button>
      </nav>
      {mobileMore&&<div className="mobile-more-layer" onClick={event=>{if(event.target===event.currentTarget)setMobileMore(false)}}><section><header><div><b>{project.title}</b><small>Choose a production stage</small></div><button onClick={()=>setMobileMore(false)}><Icon name="x"/></button></header>{stageMeta.filter(item=>!['script','record','edit'].includes(item.id)).map(item=><button className={stage===item.id?'active':''} key={item.id} onClick={()=>{setStage(item.id);setMobileMore(false)}}><span>{item.number}</span><div><b>{item.label}</b><small>{item.hint}</small></div><Icon name="arrow"/></button>)}<button className={stage==='files'?'active':''} onClick={()=>{setStage('files');setMobileMore(false)}}><Icon name="folder"/><div><b>Files</b><small>Project media and takes</small></div><Icon name="arrow"/></button></section></div>}
      {resourcesOpen && <ResourcesDrawer project={project} setProject={setProject} onClose={() => setResourcesOpen(false)} notify={notify} />}
      {toast && <div className="toast"><Icon name="check" size={16}/>{toast}</div>}
    </div>
  )
}

function Dashboard({ projects, activeId, onOpen, onNew, onImport, onDelete }: { projects: Project[]; activeId:string; onOpen: (id:string,stage?:StageId) => void; onNew: (format?:string) => void; onImport:(markdown:string)=>void; onDelete:(id:string)=>void }) {
  const blueprintInput=useRef<HTMLInputElement>(null)
  const [showAll,setShowAll]=useState(false)
  const [pendingImport,setPendingImport]=useState<{markdown:string;fileName:string;summary:BlueprintSummary}|null>(null)
  const importFile=async(file?:File)=>{
    if(!file)return
    try{const markdown=await file.text(),parsed=parseBlueprint(markdown);setPendingImport({markdown,fileName:file.name,summary:parsed.summary})}
    catch(error){alert(error instanceof Error?error.message:'Could not import blueprint')}
  }
  const active=projects.find(p=>p.id===activeId)??projects[0]
  const cards=(showAll?projects:[active]).filter(Boolean)
  const gaps=projects.reduce((sum,p)=>sum+p.shots.filter(s=>!['Available','Complete'].includes(s.status)).length,0)
  const removeProject=(project:Project)=>{
    if(!confirm(`Delete “${project.title||'Untitled story'}”?\n\nThis removes its locally saved script, shot plan and edit decisions from this browser.`))return
    onDelete(project.id)
  }
  return <div className="dashboard">
    <header className="dash-header"><div className="brand"><span className="brand-mark">X1</span><span><b>Content Studio</b><small>From idea to finished story</small></span></div><button className="avatar">JX</button></header>
    <div className="dash-main">
      <div className="dash-title"><div><span className="eyebrow">YOUR STUDIO</span><h1>Stories in motion.</h1><p>Keep the thinking, footage and edit moving together.</p></div><div className="dash-actions"><a className="secondary template-download" href="/YT_STUDIO_BLUEPRINT_TEMPLATE.md" download><Icon name="download"/> Template</a><button className="secondary" onClick={()=>blueprintInput.current?.click()}><Icon name="upload"/> Import blueprint</button><input ref={blueprintInput} className="visually-hidden" type="file" accept=".md,.markdown,text/markdown,text/plain" onChange={e=>{importFile(e.target.files?.[0]);e.target.value=''}}/><button className="primary" onClick={()=>onNew()}><Icon name="plus"/> New project</button></div></div>
      <div className="pulse-row">
        <div><span className="pulse-number">{String(projects.length).padStart(2,'0')}</span><span><b>In production</b><small>Across your project library</small></span></div>
        <div><span className="pulse-number">{String(gaps).padStart(2,'0')}</span><span><b>B-roll gaps</b><small>Shots still needed</small></span></div>
        <div><span className="pulse-number">{String(active?.targetMinutes||0).padStart(2,'0')}m</span><span><b>Target runtime</b><small>Current project</small></span></div>
      </div>
      <section className="dash-section"><div className="section-heading"><h2>{showAll?'All projects':'Continue working'}</h2><button onClick={()=>setShowAll(v=>!v)}>{showAll?'Show current':'View all'}</button></div>
        <div className={showAll?'all-projects-grid':''}>{cards.map((project,index)=>{const nextStage:StageId=project.timelineClips.length?'edit':project.takes.length?'edit':project.blocks.some(block=>block.text.trim())?'record':'script';return <article className="project-card" key={project.id}>
          <button className="project-card-open" onClick={()=>onOpen(project.id)}>
            <div className="project-cover"><span>{project.series.toUpperCase().split(' ').slice(0,2).map(x=><span key={x}>{x}<br/></span>)}</span><small>JOINT X / {String(index+1).padStart(3,'0')}</small></div>
            <div className="project-info"><span className="project-status"><i/> {nextStage.toUpperCase()} NEXT</span><h3>{project.title}</h3><p>{project.premise||'Open the project and find its strongest promise.'}</p><div className="progress"><i style={{width: `${Math.min(95,25+project.resources.length*7+project.blocks.filter(b=>b.text).length*5)}%`}}/></div><div className="project-meta"><span>{project.resources.length} files · {project.blocks.length} story beats</span><span>Saved locally</span></div></div>
            <span className="round-arrow"><Icon name="arrow"/></span>
          </button>
          <button className="project-delete" onClick={()=>removeProject(project)} title={`Delete ${project.title}`} aria-label={`Delete ${project.title}`}><Icon name="trash" size={15}/></button>
          <div className="project-quick-actions"><button onClick={()=>onOpen(project.id,nextStage)}>Continue</button><button onClick={()=>onOpen(project.id,'record')}>Record now</button><button onClick={()=>onOpen(project.id,'script')}>Script</button><button onClick={()=>onOpen(project.id,'edit')}>Edit</button></div>
        </article>})}</div>
      </section>
      <section className="dash-section"><div className="section-heading"><h2>Start with a format</h2></div>
        <div className="template-grid">
          {['Daily Doses','The Uncle Jai Show','Educational breakdown','Voice-over montage'].map((name, i) => <button className="template-card" key={name} onClick={()=>onNew(name)}><span>0{i+1}</span><Icon name={i === 1 ? 'camera' : i === 3 ? 'mic' : 'layers'}/><b>{name}</b><small>{['Build in public','Reflective documentary','Teach through a real example','Let the footage carry the story'][i]}</small></button>)}
        </div>
      </section>
    </div>
    {pendingImport&&<div className="blueprint-preview-layer" onMouseDown={event=>{if(event.target===event.currentTarget)setPendingImport(null)}}><section className="blueprint-preview">
      <header><div><span className="eyebrow">BLUEPRINT READY</span><h2>{pendingImport.summary.title}</h2><p>{pendingImport.fileName}</p></div><button onClick={()=>setPendingImport(null)}><Icon name="x"/></button></header>
      <div className="blueprint-preview-stats"><span><b>{pendingImport.summary.sceneCount}</b><small>Story scenes</small></span><span><b>{pendingImport.summary.scriptedSceneCount}</b><small>Scripts populated</small></span><span><b>{pendingImport.summary.shotCount}</b><small>Shots created</small></span></div>
      <div className="blueprint-scene-preview">{pendingImport.summary.scenes.slice(0,5).map((scene,index)=><article key={`${scene.title}-${index}`}><span>{String(index+1).padStart(2,'0')}</span><div><b>{scene.title}</b><p>{scene.preview||'No presenter script detected for this scene.'}</p></div><small>{scene.words} words</small></article>)}{pendingImport.summary.scenes.length>5&&<em>+ {pendingImport.summary.scenes.length-5} more scenes</em>}</div>
      {pendingImport.summary.warnings.length?<div className="blueprint-warnings"><b>Review after import</b>{pendingImport.summary.warnings.map(item=><p key={item}>• {item}</p>)}</div>:<div className="blueprint-success"><Icon name="check"/><span><b>Everything mapped successfully.</b><small>The script, delivery notes, visual cues and shot board are ready to edit.</small></span></div>}
      <footer><button className="secondary" onClick={()=>setPendingImport(null)}>Cancel</button><button className="primary" onClick={()=>{onImport(pendingImport.markdown);setPendingImport(null)}}><Icon name="upload"/> Create populated project</button></footer>
    </section></div>}
  </div>
}
function StageHeader({ index, eyebrow, title, copy, action }: { index: string; eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="stage-header"><div><span className="eyebrow">{index} / {eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div>
}

function IdeaStage({ project, setPartial, onNext }: { project: Project; setPartial: (u: Partial<Project>) => void; onNext: () => void }) {
  return <>
    <StageHeader index="01" eyebrow="DIRECTION" title="Find the promise." copy="Get clear on why this story deserves attention before you write it." action={<button className="ai-button"><Icon name="spark"/> Shape my idea</button>}/>
    <div className="idea-layout">
      <section className="panel large-panel">
        <div className="panel-label"><span>CORE IDEA</span><small>Keep this to one strong sentence.</small></div>
        <textarea className="premise-input" value={project.premise} onChange={e => setPartial({premise: e.target.value})} />
        <div className="field-grid">
          <label><span>WORKING TITLE</span><input value={project.title} onChange={e => setPartial({title: e.target.value})}/></label>
          <label><span>SERIES</span><select value={project.series} onChange={e => setPartial({series: e.target.value})}><option>Daily Doses</option><option>The Uncle Jai Show</option><option>Joint X Education</option><option>Custom</option></select></label>
          <label><span>FORMAT</span><select value={project.format} onChange={e => setPartial({format: e.target.value})}><option>Founder breakdown</option><option>Reflective documentary</option><option>Presentation</option><option>Voice-over montage</option></select></label>
          <label><span>TARGET LENGTH</span><div className="number-input"><input type="number" min="1" max="60" value={project.targetMinutes} onChange={e => setPartial({targetMinutes: Number(e.target.value)})}/><span>minutes</span></div></label>
        </div>
      </section>
      <aside className="panel direction-panel">
        <div className="panel-label"><span>STORY COMPASS</span><small>The decisions that keep the video focused.</small></div>
        <label><span>WHO IS THIS FOR?</span><textarea value={project.viewer} onChange={e => setPartial({viewer: e.target.value})}/></label>
        <label><span>WHAT SHOULD CHANGE FOR THEM?</span><textarea value={project.outcome} onChange={e => setPartial({outcome: e.target.value})}/></label>
        <div className="clarity-score"><span className="score-ring">84</span><span><b>Strong direction</b><small>The premise is specific and grounded in a real build.</small></span></div>
      </aside>
    </div>
    <section className="panel brainstorm-card">
      <div className="brainstorm-brand"><img src="/joint-x-logo.png" alt="Joint X logo"/><div><span className="eyebrow">JOINT X BRAINSTORM</span><h2>Think messily. Shape it later.</h2><p>Capture the moment, tension, proof and lesson before turning it into a clean script.</p></div></div>
      <div className="brainstorm-workspace"><textarea value={project.brainstorm} onChange={e=>setPartial({brainstorm:e.target.value})} placeholder="Drop the raw thoughts here. What happened? Why did it matter? What did it change?"/><div className="brainstorm-prompts"><span>ADD A PROMPT</span>{['The real problem was…','The moment I realised…','What viewers should see…','The deeper lesson is…','The question I still have…'].map(prompt=><button key={prompt} onClick={()=>setPartial({brainstorm:`${project.brainstorm}${project.brainstorm?'\n\n':''}${prompt} `})}>{prompt}</button>)}</div></div>
    </section>
    <StageFooter note="Next: turn the idea into a story you can deliver naturally." onNext={onNext} label="Shape the script" />
  </>
}

function ScriptStage({ project, setProject, onNext, notify, onRecord }: { project: Project; setProject: React.Dispatch<React.SetStateAction<Project>>; onNext: () => void; notify: (s: string) => void; onRecord:(blockId:string)=>void }) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const [toolbarMenu, setToolbarMenu] = useState(false)
  const [focusWriter,setFocusWriter]=useState(false)
  const updateBlock = (id: string, update: Partial<ScriptBlock>) => setProject(p => ({...p, blocks: p.blocks.map(b => b.id === id ? {...b, ...update} : b)}))
  const addBlock = () => setProject(p => ({...p, blocks: [...p.blocks, {id: makeId(), label: 'New beat', text: '', note: '', visual: ''}]}))
  const duplicateBlock = (index: number) => setProject(p => { const next=[...p.blocks]; next.splice(index+1,0,{...next[index],id:makeId(),label:`${next[index].label} copy`}); return {...p,blocks:next} })
  const moveBlock = (index: number, direction: -1 | 1) => setProject(p => { const target=index+direction;if(target<0||target>=p.blocks.length)return p;const next=[...p.blocks];[next[index],next[target]]=[next[target],next[index]];return {...p,blocks:next} })
  const removeBlock = (id: string) => setProject(p => ({...p,blocks:p.blocks.filter(b=>b.id!==id)}))
  const exportScript = () => { downloadText(`${project.title.replace(/[^a-z0-9]+/gi,'-')}-script.txt`, project.blocks.map(b=>`${b.label.toUpperCase()}\n${b.text}`).join('\n\n')); notify('Clean script downloaded') }
  const words = project.blocks.reduce((sum,b) => sum + b.text.trim().split(/\s+/).filter(Boolean).length, 0)
  return <>
    <StageHeader index="02" eyebrow="SCRIPT" title="Shape the story." copy="Write freely first. Structure can appear when the story is ready." action={<div className="script-actions"><div className="mode-switch">{(['Talking points','Full script','Presentation','Hybrid'] as const).map(mode => <button className={project.mode === mode ? 'active' : ''} key={mode} onClick={() => setProject(p => ({...p, mode}))}>{mode}</button>)}</div><button className="primary focus-writer-button" onClick={()=>setFocusWriter(true)}><Icon name="expand"/> Focus writer</button></div>}/>
    <div className="script-toolbar"><div className="script-brand"><img src="/joint-x-logo.png" alt="Joint X logo"/><span><b>{words}</b> words · about <b>{Math.max(1, Math.ceil(words/135))} min</b></span></div><div><button onClick={() => notify('Voice review complete — the script sounds grounded and direct.')}><Icon name="spark" size={15}/> Does this sound like me?</button><span className="menu-wrap"><button aria-label="Script options" onClick={()=>setToolbarMenu(v=>!v)}><Icon name="more"/></button>{toolbarMenu&&<ActionMenu items={[{label:'Download clean script',icon:'download',action:exportScript},{label:'Add story beat',icon:'plus',action:addBlock},{label:'Copy full script',icon:'copy',action:()=>{navigator.clipboard?.writeText(project.blocks.map(b=>b.text).join('\n\n'));notify('Full script copied')}}]} onClose={()=>setToolbarMenu(false)}/>}</span></div></div>
    <div className="script-list">
      {project.blocks.map((block, index) => <article className="script-block" key={block.id}>
        <div className="block-index"><span>{String(index+1).padStart(2,'0')}</span><i/></div>
        <div className="block-body">
          <div className="block-top"><input className="block-title" value={block.label} onChange={e => updateBlock(block.id,{label:e.target.value})}/><span>{block.text.trim().split(/\s+/).filter(Boolean).length} words</span><button className="record-section" onClick={()=>onRecord(block.id)}><Icon name="record" size={13}/> Record this section</button></div>
          <textarea value={block.text} onChange={e => updateBlock(block.id,{text:e.target.value})} placeholder="What do you need to say here?" />
          <div className="block-notes">
            <label><Icon name="mic" size={14}/><input value={block.note} onChange={e => updateBlock(block.id,{note:e.target.value})} placeholder="Private delivery note"/></label>
            <label><Icon name="video" size={14}/><input value={block.visual} onChange={e => updateBlock(block.id,{visual:e.target.value})} placeholder="Visual or B-roll cue"/></label>
          </div>
        </div>
        <span className="menu-wrap block-menu"><button className="block-more" aria-label={`More options for ${block.label}`} onClick={()=>setMenuId(menuId===block.id?null:block.id)}><Icon name="more"/></button>{menuId===block.id&&<ActionMenu items={[{label:'Duplicate beat',icon:'copy',action:()=>duplicateBlock(index)},{label:'Move up',icon:'arrow',action:()=>moveBlock(index,-1),disabled:index===0},{label:'Move down',icon:'arrow',action:()=>moveBlock(index,1),disabled:index===project.blocks.length-1},{label:'Delete beat',icon:'trash',danger:true,action:()=>removeBlock(block.id)}]} onClose={()=>setMenuId(null)}/>}</span>
      </article>)}
      <button className="add-block" onClick={addBlock}><Icon name="plus"/> Add story beat</button>
    </div>
    {focusWriter&&<FocusWriter project={project} setProject={setProject} notify={notify} onClose={()=>setFocusWriter(false)}/>} 
    <StageFooter note="Next: decide what the viewer should see while you speak." onNext={onNext} label="Plan the visuals" />
  </>
}

function blocksToDraft(blocks:ScriptBlock[]){return blocks.map(block=>`**${block.label}**\n${block.text}`).join('\n\n')}
function draftToBlocks(draft:string,existing:ScriptBlock[]):ScriptBlock[]{
  const lines=draft.split(/\r?\n/), sections:{label:string;text:string[]}[]=[]
  let current={label:'Full script',text:[] as string[]}
  for(const line of lines){const heading=line.match(/^\s*\*\*(.+?)\*\*\s*$/);if(heading){if(current.text.join('\n').trim()||sections.length)sections.push(current);current={label:heading[1].trim(),text:[]}}else current.text.push(line)}
  if(current.text.join('\n').trim()||!sections.length)sections.push(current)
  return sections.filter(s=>s.text.join('\n').trim()||s.label!=='Full script').map(section=>{const previous=existing.find(b=>b.label.toLowerCase()===section.label.toLowerCase());return{id:previous?.id||makeId(),label:section.label,text:section.text.join('\n').trim(),note:previous?.note||'',visual:previous?.visual||''}})
}

function FocusWriter({project,setProject,notify,onClose}:{project:Project;setProject:React.Dispatch<React.SetStateAction<Project>>;notify:(s:string)=>void;onClose:()=>void}){
  const [draft,setDraft]=useState(project.draftScript||blocksToDraft(project.blocks))
  const words=draft.trim().split(/\s+/).filter(Boolean).length
  const sync=(single=false)=>{
    const blocks=single?[{id:project.blocks[0]?.id||makeId(),label:'Full script',text:draft.replace(/^\s*\*\*(.+?)\*\*\s*$/gm,'').trim(),note:'',visual:''}]:draftToBlocks(draft,project.blocks)
    setProject(p=>({...p,draftScript:draft,blocks}));notify(single?'Saved as one continuous script':`${blocks.length} sections synced from ** headings`)
  }
  useEffect(()=>{const timer=window.setTimeout(()=>setProject(p=>({...p,draftScript:draft})),450);return()=>window.clearTimeout(timer)},[draft])
  return <div className="focus-writer" role="dialog" aria-modal="true" aria-label="Distraction-free script writer">
    <header><div className="focus-writer-brand"><img src="/joint-x-logo.png" alt="Joint X logo"/><span><b>{project.title||'Untitled story'}</b><small>{words} words · about {Math.max(1,Math.ceil(words/135))} min</small></span></div><div><button className="secondary" onClick={()=>document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.()}><Icon name="expand"/> Browser fullscreen</button><button className="primary" onClick={()=>{sync();onClose()}}>Save & close</button><button className="icon-button dark" onClick={onClose} aria-label="Close focus writer"><Icon name="x"/></button></div></header>
    <main><div className="focus-writer-copy"><span className="eyebrow">FREE-WRITE MODE</span><h1>Follow the thought.</h1><p>Write without stopping to classify each idea. When a natural change appears, add a line such as <code>**Hook**</code> or <code>**Middle**</code>. The studio turns those markers into sections when you choose.</p></div><textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Start with the thing you cannot stop thinking about…" spellCheck/></main>
    <footer><span><b>Optional structure:</b> put <code>**Section name**</code> on its own line. Nothing is changed automatically.</span><div><button className="secondary dark-button" onClick={()=>sync(true)}>Keep as one full script</button><button className="primary" onClick={()=>sync()}>Sync ** sections</button></div></footer>
  </div>
}

function StudioBoardStage({ project, setProject, notify, onNext }: { project: Project; setProject: React.Dispatch<React.SetStateAction<Project>>; notify:(s:string)=>void; onNext: () => void }) {
  const [view,setView]=useState<'board'|'list'|'coverage'>('board')
  const [filter,setFilter]=useState('All')
  const [drawer,setDrawer]=useState(false)
  const [editingId,setEditingId]=useState<string|null>(null)
  const [dragId,setDragId]=useState<string|null>(null)
  const thumbnailInput=useRef<HTMLInputElement>(null)
  const mediaInput=useRef<HTMLInputElement>(null)
  const emptyDraft:Partial<Shot>={section:project.blocks[0]?.label||'New beat',shotType:'B-roll',description:'',purpose:'',framing:'Medium',movement:'Locked',priority:'Support',duration:5,source:'',status:'Needs filming',notes:''}
  const [draft,setDraft]=useState<Partial<Shot>>(emptyDraft)
  const statuses:Shot['status'][]=['Available','Needs filming','Needs screen recording','Needs design','Optional','Complete']
  const shotTypes:NonNullable<Shot['shotType']>[]=['A-roll','B-roll','Product / detail','Screen recording','Establishing','Graphic / title','Voice-over visual']
  const framing:NonNullable<Shot['framing']>[]=['Wide','Medium','Close-up','Macro','Screen','Graphic']
  const movement:NonNullable<Shot['movement']>[]=['Locked','Handheld','Push in','Pull out','Pan','Tilt','Screen capture']
  const typeIcons:Record<NonNullable<Shot['shotType']>,IconName>={'A-roll':'mic','B-roll':'video','Product / detail':'camera','Screen recording':'layers','Establishing':'expand','Graphic / title':'edit','Voice-over visual':'eye'}
  const ordered=[...project.shots].sort((a,b)=>(a.order??0)-(b.order??0))
  const visible=ordered.filter(shot=>filter==='All'||shot.status===filter||shot.shotType===filter)
  const groups=project.blocks.map(block=>({label:block.label,shots:visible.filter(shot=>shot.section===block.label)})).filter(group=>group.shots.length)
  const ungrouped=visible.filter(shot=>!project.blocks.some(block=>block.label===shot.section))
  if(ungrouped.length)groups.push({label:'Unassigned',shots:ungrouped})
  const gaps=project.shots.filter(s=>!['Available','Complete'].includes(s.status)).length
  const updateShot=(id:string,update:Partial<Shot>)=>setProject(p=>({...p,shots:p.shots.map(shot=>shot.id===id?{...shot,...update}:shot)}))
  const openNew=()=>{setEditingId(null);setDraft({...emptyDraft,section:project.blocks[0]?.label||'New beat'});setDrawer(true)}
  const openEdit=(shot:Shot)=>{setEditingId(shot.id);setDraft({...shot});setDrawer(true)}
  const saveShot=()=>{
    if(!draft.description?.trim()){notify('Describe the shot before saving');return}
    if(editingId)updateShot(editingId,draft)
    else setProject(p=>({...p,shots:[...p.shots,{id:makeId(),shotNumber:`${p.shots.length+1}A`,section:draft.section||'New beat',description:draft.description||'Untitled shot',source:draft.source||'',status:draft.status||'Needs filming',shotType:draft.shotType||'B-roll',thumbnailUrl:draft.thumbnailUrl,framing:draft.framing||'Medium',movement:draft.movement||'Locked',purpose:draft.purpose||'',priority:draft.priority||'Support',duration:draft.duration||5,notes:draft.notes||'',assetId:draft.assetId,order:p.shots.length}]}))
    setDrawer(false);notify(editingId?'Shot updated':'Shot added to the board')
  }
  const removeShot=(id:string)=>setProject(p=>({...p,shots:p.shots.filter(shot=>shot.id!==id),timelineMarkers:p.timelineMarkers.filter(marker=>marker.shotId!==id)}))
  const dropReorder=(overId:string)=>{
    if(!dragId||dragId===overId)return
    const next=[...ordered],from=next.findIndex(s=>s.id===dragId),to=next.findIndex(s=>s.id===overId)
    if(from<0||to<0)return
    const [moved]=next.splice(from,1);next.splice(to,0,moved)
    setProject(p=>({...p,shots:p.shots.map(shot=>({...shot,order:next.findIndex(item=>item.id===shot.id)}))}));setDragId(null)
  }
  const sendToEditor=(shot:Shot)=>{
    const asset=project.resources.find(item=>item.id===shot.assetId)
    const start=Math.max(0,...project.timelineClips.map(clip=>clip.timelineStart+clip.duration))
    const marker:TimelineMarker={id:makeId(),time:start,label:`${shot.shotNumber||''} ${shot.description}`.trim(),color:'#c8ff2f',shotId:shot.id}
    const clip:TimelineClip|undefined=asset?{id:makeId(),trackId:shot.shotType==='A-roll'?'v1':asset.category==='Audio'?'a2':'v2',type:asset.category==='Images'?'image':asset.category==='Audio'?'audio':'video',assetId:asset.id,name:asset.name,timelineStart:start,sourceIn:0,sourceOut:Math.min(asset.duration||shot.duration||5,shot.duration||5),duration:Math.min(asset.duration||shot.duration||5,shot.duration||5),opacity:1,volume:1,fit:'Cover',scale:1,rotation:0,positionX:0,positionY:0,flipX:false,flipY:false,blendMode:'Normal',linkedShotId:shot.id}:undefined
    setProject(p=>({...p,timelineMarkers:[...p.timelineMarkers.filter(item=>item.shotId!==shot.id),marker],timelineClips:clip?[...p.timelineClips,clip]:p.timelineClips}))
    notify(asset?'Shot and linked media sent to the timeline':'Shot marker sent to the editor · link media when ready')
  }
  const chooseThumbnail=(file?:File)=>{if(!file)return;setDraft(current=>({...current,thumbnailUrl:URL.createObjectURL(file)}))}
  const coverageTypes:NonNullable<Shot['shotType']>[]=['A-roll','B-roll','Screen recording','Graphic / title']
  return <div className="studio-board">
    <StageHeader index="03" eyebrow="VISUALS" title="Build the shot plan." copy="Plan coverage like a production board, then send only useful material into the rough cut." action={<button className="ai-button" onClick={()=>setView('coverage')}><Icon name="spark"/> Check coverage</button>}/>
    <div className="board-summary">
      <div><span>{String(project.shots.length).padStart(2,'0')}</span><b>Total shots</b><small>{project.blocks.length} story beats</small></div>
      <div><span className="accent">{String(gaps).padStart(2,'0')}</span><b>Still needed</b><small>Production gaps</small></div>
      <div><span>{String(project.shots.filter(s=>s.status==='Available'||s.status==='Complete').length).padStart(2,'0')}</span><b>Ready</b><small>Available or captured</small></div>
      <div><span>{Math.round(project.shots.reduce((sum,s)=>sum+(s.duration||0),0))}s</span><b>Planned coverage</b><small>Estimated screen time</small></div>
    </div>
    <section className="board-shell panel">
      <header className="board-toolbar">
        <div className="view-switch"><button className={view==='board'?'active':''} onClick={()=>setView('board')}><Icon name="layers"/> Board</button><button className={view==='list'?'active':''} onClick={()=>setView('list')}><Icon name="file"/> Shot list</button><button className={view==='coverage'?'active':''} onClick={()=>setView('coverage')}><Icon name="check"/> Coverage</button></div>
        <div className="board-filters"><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{statuses.map(status=><option key={status}>{status}</option>)}{shotTypes.map(type=><option key={type}>{type}</option>)}</select><button className="primary" onClick={openNew}><Icon name="plus"/> Add shot</button></div>
      </header>
      {view==='board'&&<div className="shot-board-groups">{groups.map(group=><section className="shot-group" key={group.label}><div className="shot-group-head"><span><b>{group.label}</b><small>{group.shots.length} shot{group.shots.length===1?'':'s'}</small></span><button onClick={()=>{setDraft({...emptyDraft,section:group.label});setEditingId(null);setDrawer(true)}}><Icon name="plus"/> Add to beat</button></div><div className="shot-card-grid">{group.shots.map(shot=>{
        const linked=project.resources.find(asset=>asset.id===shot.assetId),thumb=shot.thumbnailUrl||(linked?.category==='Images'?linked.url:undefined)
        return <article className="production-shot-card" draggable onDragStart={()=>setDragId(shot.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>dropReorder(shot.id)} key={shot.id}>
          <button className="shot-image" onClick={()=>openEdit(shot)} style={thumb?{backgroundImage:`url(${thumb})`}:undefined}>{!thumb&&<><Icon name={typeIcons[shot.shotType||'B-roll']} size={28}/><span>{shot.framing} · {shot.movement}</span></>}<i>{shot.shotNumber}</i><em>{shot.duration||5}s</em></button>
          <div className="shot-card-copy"><div><span className="shot-type"><Icon name={typeIcons[shot.shotType||'B-roll']} size={12}/>{shot.shotType}</span><span className={`priority priority-${(shot.priority||'Support').toLowerCase()}`}>{shot.priority}</span></div><h3>{shot.description}</h3><p>{shot.purpose||'Add the storytelling job for this shot.'}</p><small><Icon name="folder" size={12}/>{linked?.name||shot.source||'No source linked'}</small></div>
          <footer><select className={`status-select status-${shot.status.toLowerCase().replaceAll(' ','-')}`} value={shot.status} onChange={e=>updateShot(shot.id,{status:e.target.value as Shot['status']})}>{statuses.map(status=><option key={status}>{status}</option>)}</select><div><button title="Edit shot" onClick={()=>openEdit(shot)}><Icon name="edit"/></button><button title="Send to editor" onClick={()=>sendToEditor(shot)}><Icon name="arrow"/></button><button title="Remove shot" onClick={()=>removeShot(shot.id)}><Icon name="trash"/></button></div></footer>
        </article>})}</div></section>)}</div>}
      {view==='list'&&<div className="studio-shot-list"><div className="studio-shot-row studio-shot-head"><span>#</span><span>Reference</span><span>Shot and purpose</span><span>Setup</span><span>Source</span><span>Status</span><span/></div>{visible.map(shot=>{const linked=project.resources.find(asset=>asset.id===shot.assetId),thumb=shot.thumbnailUrl||(linked?.category==='Images'?linked.url:undefined);return <div className="studio-shot-row" draggable onDragStart={()=>setDragId(shot.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>dropReorder(shot.id)} key={shot.id}><b>{shot.shotNumber}</b><button className="list-shot-thumb" onClick={()=>openEdit(shot)} style={thumb?{backgroundImage:`url(${thumb})`}:undefined}>{!thumb&&<Icon name={typeIcons[shot.shotType||'B-roll']}/>}</button><span><b>{shot.description}</b><small>{shot.section} · {shot.purpose}</small></span><span><b>{shot.shotType}</b><small>{shot.framing} · {shot.movement} · {shot.duration}s</small></span><span><b>{linked?.name||shot.source||'Unlinked'}</b><small>{shot.priority}</small></span><select value={shot.status} onChange={e=>updateShot(shot.id,{status:e.target.value as Shot['status']})}>{statuses.map(status=><option key={status}>{status}</option>)}</select><button onClick={()=>sendToEditor(shot)}><Icon name="arrow"/></button></div>})}</div>}
      {view==='coverage'&&<div className="coverage-view"><div className="coverage-intro"><span><Icon name="check"/></span><div><h2>Story coverage map</h2><p>Each row is a story beat. Green means planned; amber means the beat still depends on a talking head or missing visual.</p></div></div><div className="coverage-grid"><div/><>{coverageTypes.map(type=><b key={type}>{type}</b>)}</>{project.blocks.map(block=><Fragment key={block.id}><span><b>{block.label}</b><small>{block.text.split(/\s+/).filter(Boolean).length} words</small></span>{coverageTypes.map(type=>{const matches=project.shots.filter(shot=>shot.section===block.label&&shot.shotType===type);return <button key={type} className={matches.length?'covered':'gap'} onClick={()=>{if(!matches.length){setDraft({...emptyDraft,section:block.label,shotType:type});setEditingId(null);setDrawer(true)}}}>{matches.length?<><Icon name="check"/><b>{matches.length}</b><small>{matches.every(s=>s.status==='Available'||s.status==='Complete')?'Ready':'Planned'}</small></>:<><Icon name="plus"/><small>Add coverage</small></>}</button>})}</Fragment>)}</div></div>}
    </section>
    <div className="board-ingest" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addResourceFiles(e.dataTransfer.files,setProject,notify)}}><Icon name="upload"/><span><b>Bring in references or footage</b><small>Drop originals here. They stay local and become linkable from every shot.</small></span><button className="secondary" onClick={()=>mediaInput.current?.click()}>Choose media</button></div>
    <input ref={mediaInput} className="visually-hidden" type="file" multiple accept="video/*,image/*,audio/*" onChange={e=>{if(e.target.files)addResourceFiles(e.target.files,setProject,notify);e.target.value=''}}/>
    <StageFooter note="Next: use the plan in the recording room, or send ready shots straight into the editor." onNext={onNext} label="Open recording room"/>
    {drawer&&<div className="shot-drawer-layer" onMouseDown={e=>{if(e.target===e.currentTarget)setDrawer(false)}}><aside className="shot-drawer"><header><div><span className="eyebrow">{editingId?'EDIT SHOT':'NEW SHOT'}</span><h2>{editingId?'Refine the coverage.':'Add a production-ready shot.'}</h2></div><button onClick={()=>setDrawer(false)}><Icon name="x"/></button></header><div className="shot-presets"><span>START WITH A TYPE</span><div>{shotTypes.map(type=><button className={draft.shotType===type?'active':''} key={type} onClick={()=>setDraft(current=>({...current,shotType:type,status:type==='Screen recording'?'Needs screen recording':type==='Graphic / title'?'Needs design':'Needs filming',framing:type==='Screen recording'?'Screen':type==='Graphic / title'?'Graphic':current.framing,movement:type==='Screen recording'?'Screen capture':current.movement}))}><Icon name={typeIcons[type]}/><span><b>{type}</b><small>{type==='A-roll'?'Primary performance':type==='B-roll'?'Story detail and cutaway':type==='Product / detail'?'Tactile proof':type==='Screen recording'?'Interface and workflow':type==='Establishing'?'Place and context':type==='Graphic / title'?'Explain or label':'Footage-led narration'}</small></span></button>)}</div></div><div className="shot-drawer-form"><label><span>STORY BEAT</span><select value={draft.section||''} onChange={e=>setDraft(current=>({...current,section:e.target.value}))}>{project.blocks.map(block=><option key={block.id}>{block.label}</option>)}<option>Unassigned</option></select></label><label><span>PRIORITY</span><select value={draft.priority||'Support'} onChange={e=>setDraft(current=>({...current,priority:e.target.value as Shot['priority']}))}><option>Essential</option><option>Support</option><option>Optional</option></select></label><label className="wide"><span>SHOT DESCRIPTION</span><textarea autoFocus value={draft.description||''} onChange={e=>setDraft(current=>({...current,description:e.target.value}))} placeholder="What exactly will we see?"/></label><label className="wide"><span>STORY PURPOSE</span><input value={draft.purpose||''} onChange={e=>setDraft(current=>({...current,purpose:e.target.value}))} placeholder="What does this shot prove, reveal or make us feel?"/></label><label><span>FRAMING</span><select value={draft.framing||'Medium'} onChange={e=>setDraft(current=>({...current,framing:e.target.value as Shot['framing']}))}>{framing.map(item=><option key={item}>{item}</option>)}</select></label><label><span>MOVEMENT</span><select value={draft.movement||'Locked'} onChange={e=>setDraft(current=>({...current,movement:e.target.value as Shot['movement']}))}>{movement.map(item=><option key={item}>{item}</option>)}</select></label><label><span>PLANNED LENGTH</span><input type="number" min="1" max="120" value={draft.duration||5} onChange={e=>setDraft(current=>({...current,duration:Number(e.target.value)}))}/></label><label><span>STATUS</span><select value={draft.status||'Needs filming'} onChange={e=>setDraft(current=>({...current,status:e.target.value as Shot['status']}))}>{statuses.map(status=><option key={status}>{status}</option>)}</select></label><label className="wide"><span>LINK PROJECT MEDIA</span><select value={draft.assetId||''} onChange={e=>{const asset=project.resources.find(item=>item.id===e.target.value);setDraft(current=>({...current,assetId:e.target.value||undefined,source:asset?.name||current.source,status:asset?'Available':current.status}))}}><option value="">No file linked yet</option>{project.resources.filter(asset=>['Video','Images','Audio'].includes(asset.category)).map(asset=><option key={asset.id} value={asset.id}>{asset.name} · {asset.role}</option>)}</select></label><label className="wide"><span>NOTES FOR THE SHOOT / EDIT</span><textarea value={draft.notes||''} onChange={e=>setDraft(current=>({...current,notes:e.target.value}))} placeholder="Lighting, prop, action, transition or edit note…"/></label></div><button className="shot-reference-upload" onClick={()=>thumbnailInput.current?.click()} style={draft.thumbnailUrl?{backgroundImage:`url(${draft.thumbnailUrl})`}:undefined}>{!draft.thumbnailUrl&&<><Icon name="camera"/><span><b>Add a reference frame</b><small>JPG, PNG or WebP · optional</small></span></>}</button><input ref={thumbnailInput} className="visually-hidden" type="file" accept="image/*" onChange={e=>{chooseThumbnail(e.target.files?.[0]);e.target.value=''}}/><footer><button className="secondary" onClick={()=>setDrawer(false)}>Cancel</button><button className="primary" onClick={saveShot}><Icon name="check"/> {editingId?'Save changes':'Add to shot board'}</button></footer></aside></div>}
  </div>
}

function VisualsStage({ project, setProject, notify, onNext }: { project: Project; setProject: React.Dispatch<React.SetStateAction<Project>>; notify:(s:string)=>void; onNext: () => void }) {
  const [filter, setFilter] = useState('All shots')
  const [menuId, setMenuId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const filtered = filter === 'All shots' ? project.shots : project.shots.filter(s => s.status === filter)
  const statuses: Shot['status'][] = ['Available','Needs filming','Needs screen recording','Needs design','Optional','Complete']
  const updateShot = (id: string, update: Partial<Shot>) => setProject(p => ({...p, shots:p.shots.map(s => s.id === id ? {...s,...update}:s)}))
  const addShot = () => setProject(p => ({...p, shots:[...p.shots,{id:makeId(),section:'New beat',description:'Describe the shot',source:'',status:'Needs filming'}]}))
  const duplicateShot = (shot:Shot) => setProject(p=>({...p,shots:[...p.shots,{...shot,id:makeId(),description:`${shot.description} copy`}]}))
  const removeShot = (id:string) => setProject(p=>({...p,shots:p.shots.filter(s=>s.id!==id)}))
  const receiveFiles = (files:FileList|File[]) => addResourceFiles(files,setProject,notify)
  const gaps = project.shots.filter(s => !['Available','Complete'].includes(s.status)).length
  return <>
    <StageHeader index="03" eyebrow="VISUALS" title="Plan what we show." copy="Build the story from real work, existing footage and only the shots still worth capturing." action={<button className="ai-button" onClick={()=>{setFilter('Needs filming');notify(`${gaps} visual gaps need attention`)}}><Icon name="spark"/> Find visual gaps</button>}/>
    <div className="visual-summary">
      <div><span className="summary-number">{project.shots.length}</span><span><b>Total shots</b><small>Across {project.blocks.length} story beats</small></span></div>
      <div><span className="summary-number accent">{gaps}</span><span><b>Still needed</b><small>Before recording is complete</small></span></div>
      <div><span className="summary-number">{project.shots.filter(s => s.status === 'Available').length}</span><span><b>Already available</b><small>From the Joint X archive</small></span></div>
    </div>
    <section className="panel shots-panel">
      <div className="shots-toolbar"><div className="filter-pills">{['All shots','Available','Needs filming','Needs design'].map(x => <button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div><button className="secondary" onClick={addShot}><Icon name="plus"/> Add shot</button></div>
      <div className="shots-table">
        <div className="shot-row shot-head"><span>STORY BEAT</span><span>SHOT / VISUAL</span><span>SOURCE</span><span>STATUS</span><span/></div>
        {filtered.map(shot => <div className="shot-row" key={shot.id}>
          <input value={shot.section} onChange={e=>updateShot(shot.id,{section:e.target.value})}/>
          <input className="shot-description" value={shot.description} onChange={e=>updateShot(shot.id,{description:e.target.value})}/>
          <input value={shot.source} onChange={e=>updateShot(shot.id,{source:e.target.value})}/>
          <select className={`status-select status-${shot.status.toLowerCase().replaceAll(' ','-')}`} value={shot.status} onChange={e=>updateShot(shot.id,{status:e.target.value as Shot['status']})}>{statuses.map(s=><option key={s}>{s}</option>)}</select>
          <span className="menu-wrap"><button aria-label={`More options for ${shot.description}`} onClick={()=>setMenuId(menuId===shot.id?null:shot.id)}><Icon name="more"/></button>{menuId===shot.id&&<ActionMenu items={[{label:'Mark complete',icon:'check',action:()=>updateShot(shot.id,{status:'Complete'})},{label:'Duplicate shot',icon:'copy',action:()=>duplicateShot(shot)},{label:'Delete shot',icon:'trash',danger:true,action:()=>removeShot(shot.id)}]} onClose={()=>setMenuId(null)}/>}</span>
        </div>)}
      </div>
    </section>
    <div className="drop-zone" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('dragging')}} onDragLeave={e=>e.currentTarget.classList.remove('dragging')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('dragging');receiveFiles(e.dataTransfer.files)}}><Icon name="upload"/><div><b>Bring in references or footage</b><small>Drop files here or choose them. Originals stay where they are.</small></div><button className="secondary" onClick={()=>fileInput.current?.click()}>Choose files</button><input ref={fileInput} className="visually-hidden" type="file" multiple accept="video/*,image/*,audio/*,.pdf,.doc,.docx,.txt" onChange={e=>{if(e.target.files)receiveFiles(e.target.files);e.target.value=''}}/></div>
    <StageFooter note="Next: move into a distraction-free recording session." onNext={onNext} label="Open recording room" />
  </>
}

function RecordStage({ project, setProject, notify, onNext }: { project: Project; setProject: React.Dispatch<React.SetStateAction<Project>>; notify: (s:string)=>void; onNext:()=>void }) {
  const [prompter, setPrompter] = useState(false)
  const [prompterStart, setPrompterStart] = useState(0)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [cameraMenu, setCameraMenu] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [previewMirrored, setPreviewMirrored] = useState(true)
  const [cameraOn, setCameraOn] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => { let timer:number|undefined; if(recording) timer=window.setInterval(()=>setElapsed(e=>e+1),1000); return()=>clearInterval(timer)},[recording])
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t=>t.stop()) }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true})
      streamRef.current=stream; setCameraOn(true)
      if(videoRef.current) videoRef.current.srcObject=stream
    } catch { notify('Camera access was not available. You can still use external-camera mode.') }
  }
  const toggleRecording = () => {
    if(!streamRef.current){ startCamera(); return }
    if(recording){ recorderRef.current?.stop(); setRecording(false); return }
    chunks.current=[]
    const recorder = new MediaRecorder(streamRef.current)
    recorderRef.current=recorder
    recorder.ondataavailable=e=>{ if(e.data.size) chunks.current.push(e.data) }
    recorder.onstop=()=>{
      const blob=new Blob(chunks.current,{type:recorder.mimeType})
      const url=URL.createObjectURL(blob)
      const take:Take={id:makeId(),section:project.blocks[0]?.label||'Recording',label:`Take ${project.takes.length+1}`,duration:formatTime(elapsed),preferred:false,url}
      setProject(p=>({...p,takes:[...p.takes,take]})); setElapsed(0); notify('Take saved in this session')
    }
    recorder.start(); setElapsed(0); setRecording(true)
  }
  const toggleMic = () => {
    const next=!micEnabled;setMicEnabled(next);streamRef.current?.getAudioTracks().forEach(track=>track.enabled=next);notify(next?'Microphone on':'Microphone muted')
  }
  const stopCamera = () => {streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setCameraOn(false);setRecording(false);setCameraMenu(false)}
  const importFootage = (files:FileList) => {
    addResourceFiles(files,setProject,notify)
    const imported=Array.from(files).filter(f=>f.type.startsWith('video/')).map((file,i):Take=>({id:makeId(),section:'Imported footage',label:file.name,duration:'Imported',preferred:i===0,url:URL.createObjectURL(file)}))
    if(imported.length)setProject(p=>({...p,takes:[...p.takes,...imported]}))
  }
  return <>
    <StageHeader index="04" eyebrow="RECORD" title="Deliver naturally." copy="Keep the story close to the lens and everything else out of the way." action={<button className="primary" onClick={()=>{setPrompterStart(0);setPrompter(true)}}><Icon name="expand"/> Launch teleprompter</button>}/>
    <div className="record-grid">
      <section className="camera-card">
        <video ref={videoRef} autoPlay muted playsInline className={`${cameraOn?'camera-preview active':'camera-preview'} ${previewMirrored?'':'unmirrored'}`} />
        {!cameraOn && <div className="camera-empty"><span><Icon name="camera" size={28}/></span><h3>Camera preview</h3><p>Test your frame and audio, or keep this off when recording externally.</p><button className="secondary light" onClick={startCamera}><Icon name="video"/> Start camera</button></div>}
        {recording && <div className="recording-badge"><i/> REC {formatTime(elapsed)}</div>}
        {cameraOn && <div className="camera-controls"><button className={micEnabled?'':'control-off'} onClick={toggleMic} title={micEnabled?'Mute microphone':'Unmute microphone'}><Icon name="mic"/></button><button className={recording?'record-stop':''} onClick={toggleRecording}>{recording?<span className="stop-square"/>:<Icon name="record"/>}</button><span className="menu-wrap"><button onClick={()=>setCameraMenu(v=>!v)} title="Camera settings"><Icon name="settings"/></button>{cameraMenu&&<ActionMenu align="up" items={[{label:previewMirrored?'Turn mirror off':'Turn mirror on',icon:'layers',action:()=>setPreviewMirrored(v=>!v)},{label:'Stop camera',icon:'x',action:stopCamera}]} onClose={()=>setCameraMenu(false)}/>}</span></div>}
      </section>
      <aside className="session-panel panel">
        <div className="panel-label"><span>SESSION PLAN</span><small>{project.blocks.length} sections · {project.targetMinutes} minute target</small></div>
        <div className="session-sections">{project.blocks.map((b,i)=><div className={i===0?'current':''} key={b.id}><button className="session-start" onClick={()=>{setPrompterStart(i);setPrompter(true)}} title={`Start teleprompter at ${b.label}`}>{i===0?<Icon name="play" size={13}/>:String(i+1).padStart(2,'0')}</button><div><b>{b.label}</b><small>{b.text.split(/\s+/).length} words · {b.note}</small></div><span className="menu-wrap"><button aria-label={`More options for ${b.label}`} onClick={()=>setMenuId(menuId===b.id?null:b.id)}><Icon name="more"/></button>{menuId===b.id&&<ActionMenu items={[{label:'Start prompter here',icon:'play',action:()=>{setPrompterStart(i);setPrompter(true)}},{label:'Copy section',icon:'copy',action:()=>{navigator.clipboard?.writeText(b.text);notify(`${b.label} copied`)}},{label:'Duplicate section',icon:'copy',action:()=>setProject(p=>{const next=[...p.blocks];next.splice(i+1,0,{...b,id:makeId(),label:`${b.label} copy`});return{...p,blocks:next}})}]} onClose={()=>setMenuId(null)}/>}</span></div>)}</div>
        <button className="second-screen" onClick={()=>openSecondScreen(project.blocks,0,project.mode)}><Icon name="link"/><span><b>Open on second screen</b><small>Share a clean, standalone prompt view</small></span><Icon name="arrow"/></button>
      </aside>
    </div>
    <section className="takes-section"><div className="section-heading"><div><h2>Recorded takes</h2><p>Keep alternatives. Mark the one you want in the rough cut.</p></div><button className="secondary" onClick={()=>importInput.current?.click()}><Icon name="upload"/> Import external footage</button><input ref={importInput} className="visually-hidden" type="file" multiple accept="video/*,audio/*" onChange={e=>{if(e.target.files)importFootage(e.target.files);e.target.value=''}}/></div>
      <div className="takes-grid">{project.takes.map(t=><div className="take-card" key={t.id}><div className="take-thumb"><Icon name="play"/>{t.url&&<video src={t.url}/>}</div><div><span>{t.section}</span><b>{t.label}</b><small>{t.duration}</small></div><button className={t.preferred?'preferred':''} onClick={()=>setProject(p=>({...p,takes:p.takes.map(x=>x.section===t.section?{...x,preferred:x.id===t.id}:x)}))}><Icon name="check"/> {t.preferred?'Preferred':'Use take'}</button></div>)}</div>
    </section>
    <StageFooter note="Next: turn the best takes into a transcript-led rough cut." onNext={onNext} label="Build the rough cut" />
    {prompter && <Teleprompter blocks={project.blocks} startBlock={prompterStart} initialMode={project.mode} onClose={()=>setPrompter(false)} />}
  </>
}

function Teleprompter({ blocks, startBlock=0, initialMode='Full script', onClose }: { blocks: ScriptBlock[]; startBlock?:number; initialMode?:Project['mode']; onClose:()=>void }) {
  const wordData=useMemo(()=>blocks.flatMap((block,blockIndex)=>block.text.trim().split(/\s+/).filter(Boolean).map((text,localIndex)=>({text,blockIndex,localIndex}))),[blocks])
  const offsets=useMemo(()=>blocks.map((_,index)=>blocks.slice(0,index).reduce((sum,b)=>sum+b.text.trim().split(/\s+/).filter(Boolean).length,0)),[blocks])
  const [wordIndex,setWordIndex]=useState(offsets[Math.min(startBlock,blocks.length-1)]||0)
  const [playing,setPlaying]=useState(false)
  const [counting,setCounting]=useState<number|null>(null)
  const [mode,setMode]=useState<'continuous'|'presentation'|'hybrid'>(initialMode==='Presentation'?'presentation':initialMode==='Hybrid'?'hybrid':'continuous')
  const [focusMode,setFocusMode]=useState<'soft'|'lime'|'off'>('soft')
  const [font,setFont]=useState(58)
  const [speed,setSpeed]=useState(125)
  const [lineHeight,setLineHeight]=useState(1.5)
  const [width,setWidth]=useState(980)
  const [countdownSeconds,setCountdownSeconds]=useState(3)
  const [mirrored,setMirrored]=useState(false)
  const [notes,setNotes]=useState(false)
  const [settings,setSettings]=useState(false)
  const stageRef=useRef<HTMLDivElement>(null)
  const targetScrollRef=useRef(0)
  const current=wordData[Math.min(wordIndex,Math.max(0,wordData.length-1))]
  const currentBlock=current?.blockIndex??0
  const block=blocks[currentBlock]??blocks[0]
  const progress=wordData.length?Math.round(((wordIndex+1)/wordData.length)*100):0
  const remaining=Math.max(0,Math.ceil((wordData.length-wordIndex)/speed*60))
  const renderWords=(section:ScriptBlock,sectionIndex:number,trackScroll=true)=>section.text.trim().split(/\s+/).filter(Boolean).map((word,localIndex)=>{const globalIndex=(offsets[sectionIndex]||0)+localIndex;return <span key={`${section.id}-${localIndex}`} {...(trackScroll?{'data-prompt-word':globalIndex}:{})} className={globalIndex===wordIndex?'active-word':globalIndex<wordIndex?'read-word':'future-word'} onClick={()=>setWordIndex(globalIndex)}>{word}{' '}</span>})
  const presentationPoints=(block?.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)??[block?.text??'']).map(point=>point.trim()).filter(Boolean)

  const begin=()=>{
    if(playing){setPlaying(false);return}
    if(counting!==null){setCounting(null);return}
    if(wordIndex>=wordData.length-1)setWordIndex(0)
    if(countdownSeconds>0)setCounting(countdownSeconds);else setPlaying(true)
  }
  const jumpWords=(amount:number)=>setWordIndex(i=>Math.max(0,Math.min(wordData.length-1,i+amount)))
  const jumpBlock=(direction:-1|1)=>{const target=Math.max(0,Math.min(blocks.length-1,currentBlock+direction));setWordIndex(offsets[target]||0)}

  useEffect(()=>{
    if(counting===null)return
    if(counting<=0){setCounting(null);setPlaying(true);return}
    const timer=window.setTimeout(()=>setCounting(c=>c===null?null:c-1),1000)
    return()=>clearTimeout(timer)
  },[counting])
  useEffect(()=>{
    if(!playing||!wordData.length)return
    const word=wordData[wordIndex]?.text??''
    const base=60000/speed
    const pause=/[.!?][”"']?$/.test(word)?base*.65:/[,;:][”"']?$/.test(word)?base*.28:0
    const timer=window.setTimeout(()=>setWordIndex(i=>{if(i>=wordData.length-1){setPlaying(false);return i}return i+1}),base+pause)
    return()=>clearTimeout(timer)
  },[playing,wordIndex,speed,wordData])
  useEffect(()=>{
    if(mode==='presentation')return
    const active=stageRef.current?.querySelector(`[data-prompt-word="${wordIndex}"]`)
    const stage=stageRef.current
    if(active instanceof HTMLElement&&stage)targetScrollRef.current=Math.max(0,active.offsetTop-stage.clientHeight*.43)
  },[wordIndex,mode])
  useEffect(()=>{
    let frame=0
    const glide=()=>{
      const stage=stageRef.current
      if(stage&&playing&&mode!=='presentation'){
        const distance=targetScrollRef.current-stage.scrollTop
        if(Math.abs(distance)>.15)stage.scrollTop+=distance*.045
      }
      frame=requestAnimationFrame(glide)
    }
    frame=requestAnimationFrame(glide)
    return()=>cancelAnimationFrame(frame)
  },[playing,mode])
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement)?.matches('input,textarea,select'))return
      if(e.code==='Space'){e.preventDefault();setCounting(null);setPlaying(p=>!p)}
      if(e.key==='ArrowRight')jumpWords(5)
      if(e.key==='ArrowLeft')jumpWords(-5)
      if(e.key==='ArrowUp'){e.preventDefault();setSpeed(s=>Math.min(250,s+5))}
      if(e.key==='ArrowDown'){e.preventDefault();setSpeed(s=>Math.max(40,s-5))}
      if(e.key.toLowerCase()==='r'){setPlaying(false);setWordIndex(0)}
      if(e.key.toLowerCase()==='f')document.documentElement.requestFullscreen?.()
      if(e.key==='Escape')onClose()
    }
    addEventListener('keydown',key);return()=>removeEventListener('keydown',key)
  },[onClose,wordData.length])

  return <div className={`teleprompter focus-${focusMode} ${mirrored?'mirrored':''}`}>
    <div className="prompt-progress"><i style={{width:`${progress}%`}}/></div>
    <div className="prompt-top">
      <div><span className="prompt-logo"><img src="/joint-x-logo.png" alt="Joint X"/></span><span><b>{block?.label||'Script'}</b><small>{wordIndex+1} of {wordData.length} words · {formatTime(remaining)} remaining</small></span></div>
      <div className="prompt-mode"><button className={mode==='continuous'?'active':''} onClick={()=>setMode('continuous')}>Full script</button><button className={mode==='presentation'?'active':''} onClick={()=>setMode('presentation')}>Presentation</button><button className={mode==='hybrid'?'active':''} onClick={()=>setMode('hybrid')}>Hybrid</button></div>
      <div><button onClick={()=>setNotes(n=>!n)} className={notes?'active':''}><Icon name="eye"/> Notes</button><button onClick={()=>setMirrored(m=>!m)} className={mirrored?'active':''}><Icon name="layers"/> Mirror</button><button onClick={()=>setSettings(v=>!v)} className={settings?'active':''}><Icon name="settings"/> Settings</button><button onClick={onClose} title="Close teleprompter"><Icon name="x"/></button></div>
    </div>
    <div className={`prompt-stage mode-${mode}`} ref={stageRef}>
      <div className="lens-line"/>
      {mode==='continuous'&&<div className="prompt-script" style={{maxWidth:width,fontSize:font,lineHeight}}>{blocks.map((section,sectionIndex)=><section className={sectionIndex===currentBlock?'active-section':''} key={section.id}><small>{section.label}</small><p>{renderWords(section,sectionIndex)}</p></section>)}</div>}
      {mode==='presentation'&&<div className="prompt-presentation">
        <div className="presentation-brand"><img src="/joint-x-logo.png" alt="Joint X"/><span>{String(currentBlock+1).padStart(2,'0')} / {String(blocks.length).padStart(2,'0')}</span></div>
        <div className="presentation-content"><span className="presentation-kicker">{block?.label}</span><h1>{currentBlock===0?block?.text.split(/[.!?]/)[0]:block?.label}</h1><div className="presentation-points">{presentationPoints.slice(currentBlock===0?1:0,4).map((point,index)=><p key={point}><span>0{index+1}</span>{point}</p>)}</div></div>
        <div className="presentation-footer"><span><b>DELIVERY</b>{block?.note}</span><span><b>VISUAL</b>{block?.visual}</span></div>
      </div>}
      {mode==='hybrid'&&<div className="prompt-hybrid">
        <div className="hybrid-script" style={{fontSize:Math.max(32,font*.72),lineHeight}}><span className="presentation-kicker">{block?.label}</span><p>{renderWords(block,currentBlock)}</p></div>
        <aside className="hybrid-guide"><img src="/joint-x-logo.png" alt="Joint X"/><span>LIVE STORY GUIDE</span><h2>{block?.label}</h2><div><b>Delivery note</b><p>{block?.note}</p></div><div><b>Visual reference</b><p>{block?.visual}</p></div><div className="hybrid-next"><b>NEXT</b><p>{blocks[currentBlock+1]?.label||'Finish the story'}</p></div></aside>
      </div>}
      {notes&&<div className="prompt-note">DELIVERY NOTE · {block?.note||'No note for this section'}</div>}
      {counting!==null&&<div className="prompt-countdown"><span>{counting||'GO'}</span><small>Get ready</small></div>}
      {settings&&<div className="prompt-settings">
        <div><b>Teleprompter settings</b><button onClick={()=>setSettings(false)}><Icon name="x"/></button></div>
        <div className="focus-choice"><span>Reading focus</span><p>Autoplay and smooth scrolling continue in every mode.</p><div>{([['soft','Soft grey'],['lime','Lime word'],['off','Off']] as const).map(([value,label])=><button className={focusMode===value?'active':''} key={value} onClick={()=>setFocusMode(value)}>{label}</button>)}</div></div>
        <label><span>Reading speed</span><div><button onClick={()=>setSpeed(s=>Math.max(40,s-5))}>−</button><input type="range" min="40" max="250" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/><button onClick={()=>setSpeed(s=>Math.min(250,s+5))}>+</button><strong>{speed} WPM</strong></div></label>
        <label><span>Text size</span><div><button onClick={()=>setFont(s=>Math.max(28,s-2))}>−</button><input type="range" min="28" max="90" value={font} onChange={e=>setFont(Number(e.target.value))}/><button onClick={()=>setFont(s=>Math.min(90,s+2))}>+</button><strong>{font}px</strong></div></label>
        <label><span>Line spacing</span><input type="range" min="1.15" max="2" step=".05" value={lineHeight} onChange={e=>setLineHeight(Number(e.target.value))}/></label>
        <label><span>Script width</span><input type="range" min="620" max="1400" step="20" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
        <div className="countdown-choice"><span>Countdown</span>{[0,3,5].map(value=><button className={countdownSeconds===value?'active':''} key={value} onClick={()=>setCountdownSeconds(value)}>{value===0?'Off':`${value}s`}</button>)}</div>
        <div className="shortcut-list"><span>SPACE Play/pause</span><span>← → Skip 5 words</span><span>↑ ↓ Change speed</span><span>R Restart</span><span>F Fullscreen</span></div>
      </div>}
    </div>
    <div className="prompt-controls">
      <button onClick={()=>{setPlaying(false);setCounting(null);setWordIndex(0)}} title="Restart"><span className="restart-icon">↺</span></button>
      <button onClick={()=>jumpBlock(-1)} title="Previous section">‹</button>
      <button onClick={()=>jumpWords(-5)} title="Back five words">−5</button>
      <button className="prompt-play" onClick={begin} title="Play or pause"><Icon name={playing?'pause':'play'} size={25}/></button>
      <button onClick={()=>jumpWords(5)} title="Forward five words">+5</button>
      <button onClick={()=>jumpBlock(1)} title="Next section">›</button>
      <div className="pace-control"><span>PACE</span><button onClick={()=>setSpeed(s=>Math.max(40,s-5))}>−</button><strong>{speed}</strong><small>WPM</small><button onClick={()=>setSpeed(s=>Math.min(250,s+5))}>+</button></div>
      <label><span>SIZE</span><input type="range" min="28" max="90" value={font} onChange={e=>setFont(Number(e.target.value))}/></label>
      <button onClick={()=>document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.()} title="Toggle fullscreen"><Icon name="expand"/></button>
    </div>
  </div>
}

function StandalonePrompter() {
  const params=new URLSearchParams(location.search); let blocks:ScriptBlock[]=starterProject.blocks
  try { const data=params.get('data'); if(data) blocks=JSON.parse(decodeURIComponent(escape(atob(data)))) } catch { /* use sample */ }
  const mode=(params.get('mode')||'Full script') as Project['mode']
  return <Teleprompter blocks={blocks} startBlock={Number(params.get('start')||0)} initialMode={mode} onClose={()=>window.close()} />
}

type TimelineRevision={id:string;savedAt:string;label:string;clips:TimelineClip[];tracks:TimelineTrack[];markers:TimelineMarker[]}
type TimelineTool='select'|'trim'|'blade'|'hand'
type TimelineInteraction='idle'|'move'|'trim-start'|'trim-end'|'scrub'|'pan'
const EDIT_FPS=25

function StudioEditorStage({project,setProject,notify,onNext}:{project:Project;setProject:React.Dispatch<React.SetStateAction<Project>>;notify:(s:string)=>void;onNext:()=>void}){
  const [editMode,setEditMode]=useState<'quick'|'advanced'>(()=>matchMedia('(max-width: 820px)').matches?'quick':'advanced')
  const [bin,setBin]=useState<'media'|'shots'|'transcript'>('media')
  const [mediaSearch,setMediaSearch]=useState('')
  const [tool,setTool]=useState<TimelineTool>('select')
  const [interaction,setInteraction]=useState<TimelineInteraction>('idle')
  const [bladePreview,setBladePreview]=useState<{time:number;clipId:string}|null>(null)
  const [zoom,setZoom]=useState(24)
  const [snapping,setSnapping]=useState(true)
  const [trimMode,setTrimMode]=useState<'standard'|'ripple'>('standard')
  const [snapGuide,setSnapGuide]=useState<number|null>(null)
  const [dragReadout,setDragReadout]=useState<number|null>(null)
  const [dragDelta,setDragDelta]=useState<number|null>(null)
  const [draggingClipId,setDraggingClipId]=useState<string|null>(null)
  const [trimmingClipId,setTrimmingClipId]=useState<string|null>(null)
  const [mediaState,setMediaState]=useState<'idle'|'loading'|'ready'|'buffering'|'error'>('idle')
  const suppressTimelineClick=useRef(false)
  const [playhead,setPlayhead]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [selectedClipId,setSelectedClipId]=useState<string|null>(null)
  const [selectedClipIds,setSelectedClipIds]=useState<string[]>([])
  const [selectedAssetId,setSelectedAssetId]=useState<string|null>(null)
  const [undoStack,setUndoStack]=useState<TimelineClip[][]>([])
  const [redoStack,setRedoStack]=useState<TimelineClip[][]>([])
  const [showShortcuts,setShowShortcuts]=useState(false)
  const [showHistory,setShowHistory]=useState(false)
  const [rippleAll,setRippleAll]=useState(true)
  const [proxyMode,setProxyMode]=useState(true)
  const [revisions,setRevisions]=useState<TimelineRevision[]>([])
  const importInput=useRef<HTMLInputElement>(null)
  const proxyInput=useRef<HTMLInputElement>(null)
  const viewerRef=useRef<HTMLElement>(null)
  const viewerCanvasRef=useRef<HTMLDivElement>(null)
  const timelineScrollRef=useRef<HTMLDivElement>(null)
  const playheadRef=useRef(0)
  const lastFrame=useRef<number|null>(null)
  const revisionTimer=useRef<number|null>(null)
  const mediaElements=useRef<Map<string,HTMLMediaElement>>(new Map())
  const cancelGestureRef=useRef<null|(()=>void)>(null)

  const tracks=[...project.timelineTracks].sort((a,b)=>a.order-b.order)
  const selectedClip=project.timelineClips.find(clip=>clip.id===selectedClipId)
  const selectedClips=project.timelineClips.filter(clip=>selectedClipIds.includes(clip.id))
  const selectedAsset=project.resources.find(asset=>asset.id===(selectedAssetId||selectedClip?.assetId))
  const assetFor=(clip?:TimelineClip)=>project.resources.find(asset=>asset.id===clip?.assetId)
  const trackFor=(clip?:TimelineClip)=>project.timelineTracks.find(track=>track.id===clip?.trackId)
  const sourceFor=(clip:TimelineClip,preferProxy=true)=>{const asset=assetFor(clip);return preferProxy&&proxyMode&&asset?.proxyUrl?asset.proxyUrl:asset?.url}
  const sequenceDuration=project.timelineClips.length?Math.max(0,...project.timelineClips.map(clip=>clip.timelineStart+clip.duration),...project.timelineMarkers.map(marker=>marker.time)):Math.max(0,project.transcript.at(-1)?.end||0,...project.timelineMarkers.map(marker=>marker.time))
  const canvasDuration=Math.max(45,sequenceDuration+10)
  const canvasWidth=Math.max(1200,canvasDuration*zoom)
  const frame=1/EDIT_FPS
  const activeClipsOn=(trackId:string)=>project.timelineClips.filter(clip=>clip.trackId===trackId&&playhead>=clip.timelineStart&&playhead<clip.timelineStart+clip.duration).sort((a,b)=>a.timelineStart-b.timelineStart||project.timelineClips.indexOf(a)-project.timelineClips.indexOf(b))
  const activeOn=(trackId:string)=>project.timelineTracks.find(track=>track.id===trackId)?.hidden?undefined:activeClipsOn(trackId).at(-1)
  const activeVisuals=tracks.filter(track=>track.kind==='video'&&!track.hidden).map(track=>activeOn(track.id)).filter((clip):clip is TimelineClip=>Boolean(clip))
  const visualLayers=[...activeVisuals].filter(clip=>clip.type==='video'||clip.type==='image').reverse()
  const titleLayers=[...activeVisuals].filter(clip=>clip.type==='title').reverse()
  const activeDisplay=activeVisuals.find(clip=>clip.type==='video'||clip.type==='image')
  const displayAsset=assetFor(activeDisplay)
  const sourceTime=activeDisplay?activeDisplay.sourceIn+(playhead-activeDisplay.timelineStart):playhead
  const explicitAudio=tracks.filter(track=>track.kind==='audio'&&!track.muted&&!track.hidden).flatMap(track=>activeClipsOn(track.id)).filter(clip=>clip.type==='audio'&&Boolean(sourceFor(clip)))
  const implicitMainAudio=activeVisuals.filter(clip=>clip.type==='video'&&clip.trackId==='v1'&&!trackFor(clip)?.muted&&Boolean(sourceFor(clip,false))&&!project.timelineClips.some(item=>item.type==='audio'&&Boolean(clip.linkGroupId)&&item.linkGroupId===clip.linkGroupId))
  const audioLayers=[...explicitAudio,...implicitMainAudio]
  const activeCaption=project.timelineClips.find(clip=>clip.trackId==='cc'&&playhead>=clip.timelineStart&&playhead<clip.timelineStart+clip.duration)?.text||project.transcript.find(line=>line.included&&sourceTime>=line.start&&sourceTime<line.end)?.text
  const aspectRatio=project.editorSettings.aspectRatio
  const aspectCss:Record<Project['editorSettings']['aspectRatio'],string>={'16:9':'16 / 9','9:16':'9 / 16','1:1':'1 / 1','4:5':'4 / 5'}
  const portraitAspect=aspectRatio==='9:16'||aspectRatio==='4:5'||aspectRatio==='1:1'
  const toolHint:Record<TimelineTool,string>={select:'Drag the clip centre to move · drag either edge to trim',trim:`Use the highlighted edges for precise ${trimMode==='ripple'?'ripple ':'source '}trimming`,blade:'Click a clip to cut · hold Shift to cut targeted tracks',hand:'Drag anywhere on the timeline to navigate'}

  const commit=(next:TimelineClip[])=>{setUndoStack(stack=>[...stack.slice(-49),project.timelineClips.map(clip=>({...clip}))]);setRedoStack([]);setProject(p=>({...p,timelineClips:next}))}
  const updateClip=(id:string,update:Partial<TimelineClip>,history=true)=>{const next=project.timelineClips.map(clip=>clip.id===id?{...clip,...update}:clip);if(history)commit(next);else setProject(p=>({...p,timelineClips:next}))}
  const updateEditorSettings=(update:Partial<Project['editorSettings']>)=>setProject(p=>({...p,editorSettings:{...p.editorSettings,...update}}))
  const undo=()=>{const previous=undoStack.at(-1);if(!previous)return;setRedoStack(stack=>[...stack,project.timelineClips.map(clip=>({...clip}))]);setUndoStack(stack=>stack.slice(0,-1));setProject(p=>({...p,timelineClips:previous}))}
  const redo=()=>{const next=redoStack.at(-1);if(!next)return;setUndoStack(stack=>[...stack,project.timelineClips.map(clip=>({...clip}))]);setRedoStack(stack=>stack.slice(0,-1));setProject(p=>({...p,timelineClips:next}))}
  const trackAccepts=(track:TimelineTrack,type:TimelineClip['type'])=>track.kind==='video'?['video','image','title'].includes(type):track.kind==='audio'?type==='audio':type==='caption'
  const frameSnap=(time:number)=>Math.max(0,Math.round(time*EDIT_FPS)/EDIT_FPS)
  const signedFrameSnap=(time:number)=>Math.round(time*EDIT_FPS)/EDIT_FPS
  const snapPoints=(excludeIds=new Set<string>())=>[0,playhead,...project.timelineClips.filter(clip=>!excludeIds.has(clip.id)).flatMap(clip=>[clip.timelineStart,clip.timelineStart+clip.duration]),...project.timelineMarkers.map(marker=>marker.time)]
  const snapResult=(time:number,excludeIds=new Set<string>(),ignore=false)=>{const framed=frameSnap(time);if(!snapping||ignore)return{time:framed,guide:null as number|null};const points=snapPoints(excludeIds),closest=points.reduce((best,point)=>Math.abs(point-framed)<Math.abs(best-framed)?point:best,points[0]||0),hit=Math.abs(closest-framed)<=Math.max(frame,12/zoom);return{time:frameSnap(hit?closest:framed),guide:hit?closest:null}}
  const snapMoveResult=(start:number,duration:number,excludeIds=new Set<string>(),ignore=false)=>{
    const framed=frameSnap(Math.max(0,start));if(!snapping||ignore)return{time:framed,guide:null as number|null}
    const threshold=Math.max(frame,12/zoom),points=snapPoints(excludeIds),edges=[{time:framed,offset:0},{time:framed+duration,offset:duration}],candidates=edges.flatMap(edge=>points.map(point=>({distance:Math.abs(point-edge.time),start:point-edge.offset,guide:point}))).filter(item=>item.start>=0).sort((a,b)=>a.distance-b.distance),best=candidates[0]
    return best&&best.distance<=threshold?{time:frameSnap(best.start),guide:best.guide}:{time:framed,guide:null as number|null}
  }
  const snapped=(time:number,excludeId?:string)=>snapResult(time,new Set(excludeId?[excludeId]:[])).time
  const selectClip=(id:string,append=false)=>{setSelectedClipId(id);setSelectedClipIds(current=>append?(current.includes(id)?current.filter(item=>item!==id):[...current,id]):[id])}
  const expandedSelection=(initial?:Iterable<string>)=>{const seed=new Set(initial??(selectedClipIds.length?selectedClipIds:selectedClipId?[selectedClipId]:[]));let changed=true;while(changed){changed=false;project.timelineClips.forEach(clip=>{if(seed.has(clip.id))return;const related=project.timelineClips.some(item=>{if(!seed.has(item.id))return false;const grouped=Boolean(item.groupId&&item.groupId===clip.groupId),linked=Boolean(item.linkGroupId&&item.linkGroupId===clip.linkGroupId&&trackFor(item)?.syncLocked!==false&&trackFor(clip)?.syncLocked!==false);return grouped||linked});if(related){seed.add(clip.id);changed=true}})}return seed}
  const linkedSelection=(clip:TimelineClip)=>{const primaryTrack=trackFor(clip);if(primaryTrack?.syncLocked===false)return new Set([clip.id]);return new Set([...getLinkedClipIds(project.timelineClips,clip)].filter(id=>{const item=project.timelineClips.find(candidate=>candidate.id===id);return item&&trackFor(item)?.syncLocked!==false}))}
  const defaultClipTransform=()=>({scale:1,rotation:0,positionX:0,positionY:0,flipX:false,flipY:false,blendMode:'Normal' as const})
  const createClip=(asset:ResourceAsset,trackId:string,time:number,shotId?:string):TimelineClip=>{const type:TimelineClip['type']=asset.category==='Images'?'image':asset.category==='Audio'?'audio':'video',duration=Math.max(.5,Math.min(asset.duration||8,asset.category==='Images'?5:asset.duration||8));return{id:makeId(),trackId,type,assetId:asset.id,name:asset.name,timelineStart:snapped(time),sourceIn:0,sourceOut:duration,duration,opacity:1,volume:1,fit:'Cover',...defaultClipTransform(),linkedShotId:shotId}}
  const addTitle=()=>{const clip:TimelineClip={id:makeId(),trackId:'v3',type:'title',name:'Title card',timelineStart:snapped(playhead),sourceIn:0,sourceOut:4,duration:4,opacity:1,volume:1,fit:'Contain',...defaultClipTransform(),text:'TYPE YOUR TITLE'};commit([...project.timelineClips,clip]);selectClip(clip.id)}
  const splitClip=(clip:TimelineClip,time=playhead)=>{const targetIds=linkedSelection(clip),rightLinks=new Map<string,string>(),newIds:string[]=[];let changed=false;const next=project.timelineClips.flatMap(item=>{if(!targetIds.has(item.id))return[item];const offset=time-item.timelineStart;if(offset<frame||offset>item.duration-frame)return[item];changed=true;const newLink=item.linkGroupId?(rightLinks.get(item.linkGroupId)||(()=>{const id=makeId();rightLinks.set(item.linkGroupId!,id);return id})()):undefined,left={...item,duration:frameSnap(offset),sourceOut:frameSnap(item.sourceIn+offset)},right={...item,id:makeId(),linkGroupId:newLink,timelineStart:frameSnap(time),sourceIn:frameSnap(item.sourceIn+offset),duration:frameSnap(item.duration-offset),sourceOut:item.sourceOut};newIds.push(right.id);return[left,right]});if(!changed){notify('Move the playhead at least one frame inside the clip');return}commit(next);setSelectedClipId(newIds[0]||null);setSelectedClipIds(newIds);notify(targetIds.size>1?'Linked video and audio split together':'Clip split at the playhead')}
  const bladeAt=(primary:TimelineClip,time:number,allTargeted=false)=>{
    if(!allTargeted){splitClip(primary,time);return}
    const targetedTracks=new Set(project.timelineTracks.filter(track=>track.targeted&&!track.locked).map(track=>track.id))
    const targetIds=new Set(project.timelineClips.filter(item=>targetedTracks.has(item.trackId)&&time>item.timelineStart+frame/2&&time<item.timelineStart+item.duration-frame/2).map(item=>item.id))
    if(!targetIds.size){notify('No targeted clips cross this frame');return}
    project.timelineClips.forEach(item=>{if(targetIds.has(item.id)&&item.linkGroupId&&trackFor(item)?.syncLocked!==false){project.timelineClips.forEach(linked=>{if(linked.linkGroupId===item.linkGroupId&&trackFor(linked)?.syncLocked!==false)targetIds.add(linked.id)})}})
    const rightLinks=new Map<string,string>(),newIds:string[]=[]
    const next=project.timelineClips.flatMap(item=>{if(!targetIds.has(item.id))return[item];const offset=time-item.timelineStart;if(offset<frame||offset>item.duration-frame)return[item];const newLink=item.linkGroupId?(rightLinks.get(item.linkGroupId)||(()=>{const id=makeId();rightLinks.set(item.linkGroupId!,id);return id})()):undefined,left={...item,duration:frameSnap(offset),sourceOut:frameSnap(item.sourceIn+offset)},right={...item,id:makeId(),linkGroupId:newLink,timelineStart:frameSnap(time),sourceIn:frameSnap(item.sourceIn+offset),duration:frameSnap(item.duration-offset),sourceOut:item.sourceOut};newIds.push(right.id);return[left,right]})
    commit(next);setSelectedClipId(newIds[0]||null);setSelectedClipIds(newIds);notify(`Blade cut ${newIds.length} targeted clip${newIds.length===1?'':'s'} at ${formatTimecode(time)}`)
  }
  const lift=()=>{const ids=expandedSelection();if(!ids.size)return;commit(project.timelineClips.filter(clip=>!ids.has(clip.id)));setSelectedClipId(null);setSelectedClipIds([]);notify(`${ids.size} clip${ids.size===1?'':'s'} lifted · the gap stays`)}
  const rippleDelete=()=>{const ids=expandedSelection();const removing=project.timelineClips.filter(clip=>ids.has(clip.id));if(!removing.length)return;const start=Math.min(...removing.map(clip=>clip.timelineStart)),end=Math.max(...removing.map(clip=>clip.timelineStart+clip.duration)),gap=frameSnap(end-start),affectedTracks=new Set(removing.map(clip=>clip.trackId)),targetedTracks=new Set(project.timelineTracks.filter(track=>track.targeted).map(track=>track.id)),locked=new Set(project.timelineTracks.filter(track=>track.locked).map(track=>track.id));commit(project.timelineClips.filter(clip=>!ids.has(clip.id)).map(clip=>clip.timelineStart>=end&&!locked.has(clip.trackId)&&(rippleAll||targetedTracks.has(clip.trackId)||affectedTracks.has(clip.trackId))?{...clip,timelineStart:frameSnap(Math.max(start,clip.timelineStart-gap))}:clip));setSelectedClipId(null);setSelectedClipIds([]);notify(`Ripple closed ${formatPrecise(gap)} ${rippleAll?'across unlocked tracks':'on targeted tracks'}`)}
  const duplicate=()=>{const ids=expandedSelection(),items=project.timelineClips.filter(clip=>ids.has(clip.id));if(!items.length)return;const start=Math.min(...items.map(item=>item.timelineStart)),end=Math.max(...items.map(item=>item.timelineStart+item.duration)),offset=end-start+frame*2,linkMap=new Map<string,string>(),groupMap=new Map<string,string>();const copies=items.map(item=>{const linkGroupId=item.linkGroupId?(linkMap.get(item.linkGroupId)||(()=>{const id=makeId();linkMap.set(item.linkGroupId!,id);return id})()):undefined,groupId=item.groupId?(groupMap.get(item.groupId)||(()=>{const id=makeId();groupMap.set(item.groupId!,id);return id})()):undefined;return{...item,id:makeId(),name:`${item.name} copy`,timelineStart:frameSnap(item.timelineStart+offset),linkGroupId,groupId}});commit([...project.timelineClips,...copies]);setSelectedClipId(copies[0].id);setSelectedClipIds(copies.map(copy=>copy.id));notify(`${copies.length} clip${copies.length===1?'':'s'} duplicated`)}
  const groupSelection=()=>{if(selectedClipIds.length<2){notify('Select two or more clips with Ctrl / Cmd click');return}const groupId=makeId();commit(project.timelineClips.map(clip=>selectedClipIds.includes(clip.id)?{...clip,groupId}:clip));notify(`${selectedClipIds.length} clips grouped`)}
  const ungroupSelection=()=>{const ids=expandedSelection();if(!ids.size)return;commit(project.timelineClips.map(clip=>ids.has(clip.id)?{...clip,groupId:undefined}:clip));notify('Selected clips ungrouped')}
  const unlinkSelection=()=>{const ids=expandedSelection();if(!ids.size)return;commit(project.timelineClips.map(clip=>ids.has(clip.id)?{...clip,linkGroupId:undefined}:clip));notify('Audio and video unlinked')}
  const extractAudio=(clip=selectedClip)=>{
    if(!clip||clip.type!=='video'||!clip.assetId){notify('Select a video clip first');return}
    const asset=assetFor(clip);if(!asset){notify('The source media is not linked');return}
    const existing=project.timelineClips.find(item=>item.type==='audio'&&((clip.linkGroupId&&item.linkGroupId===clip.linkGroupId)||(item.assetId===clip.assetId&&Math.abs(item.timelineStart-clip.timelineStart)<frame&&Math.abs(item.sourceIn-clip.sourceIn)<frame)))
    if(existing){selectClip(existing.id);notify('This video already has an extracted audio clip');return}
    const preferred=clip.trackId==='v1'?'a1':'a2',target=project.timelineTracks.find(track=>track.id===preferred&&!track.locked)||project.timelineTracks.find(track=>track.kind==='audio'&&!track.locked)
    if(!target){notify('Unlock an audio track before extracting audio');return}
    const linkGroupId=clip.linkGroupId||makeId()
    const audio:TimelineClip={...clip,id:makeId(),trackId:target.id,type:'audio',name:`${asset.name} · extracted audio`,opacity:1,volume:1,fit:'Cover',...defaultClipTransform(),linkGroupId}
    const next=project.timelineClips.map(item=>item.id===clip.id?{...item,linkGroupId}:item)
    commit([...next,audio]);setSelectedClipId(clip.id);setSelectedClipIds([clip.id]);notify(`Audio extracted non-destructively to ${target.label}`)
  }
  const resetTransform=(clip:TimelineClip)=>updateClip(clip.id,{...defaultClipTransform(),opacity:1,fit:'Cover'})

  const shiftFollowingClips=(clips:TimelineClip[], trackIds:Set<string>, fromTime:number, delta:number, preserveIds=new Set<string>())=>{
    if(!delta) return clips
    return clips.map(item=>!trackIds.has(item.trackId)||preserveIds.has(item.id)||item.timelineStart<fromTime?item:{...item,timelineStart:frameSnap(Math.max(0,item.timelineStart+delta))})
  }
  const applyTrimAtPlayhead=(edge:'start'|'end')=>{
    const clip=selectedClip
    if(!clip){notify('Select a clip first');return}
    const clipEnd=clip.timelineStart+clip.duration
    if(playhead<=clip.timelineStart+frame || playhead>=clipEnd-frame){notify('Move the playhead inside the clip before trimming');return}
    const linkedIds=linkedSelection(clip)
    const sourceDurations=new Map(project.timelineClips.map(item=>{const asset=assetFor(item),duration=item.type==='image'||item.type==='title'?21600:(asset?.duration||item.sourceOut);return[item.id,duration] as const}))
    const delta=edge==='start'?frameSnap(playhead-clip.timelineStart):frameSnap(playhead-clipEnd)
    const trimmed=trimTimelineClips(project.timelineClips,{clipId:clip.id,linkedClipIds:linkedIds,edge,delta,frame,sourceDurations})
    const before=project.timelineClips.find(item=>item.id===clip.id)
    const after=trimmed.find(item=>item.id===clip.id)
    let next=trimmed
    if(trimMode==='ripple' && before && after){
      const endDelta=frameSnap((after.timelineStart+after.duration)-(before.timelineStart+before.duration))
      if(endDelta!==0){
        const targetedTracks=new Set(project.timelineTracks.filter(track=>track.targeted && !track.locked).map(track=>track.id))
        next=shiftFollowingClips(trimmed,targetedTracks,frameSnap(before.timelineStart+before.duration),endDelta,linkedIds)
      }
    }
    commit(next)
    setSelectedClipId(clip.id)
    setSelectedClipIds(Array.from(linkedIds))
    notify(`${edge==='start'?'Trim start':'Trim end'} ${trimMode==='ripple'?'with ripple ':' '}to playhead`)
  }

  const beginMove=(event:React.PointerEvent<HTMLElement>,clip:TimelineClip)=>{
    if(tool!=='select'||project.timelineTracks.find(track=>track.id===clip.trackId)?.locked||event.button!==0)return
    event.preventDefault();event.stopPropagation()
    const pointerTarget=event.currentTarget,pointerId=event.pointerId
    pointerTarget.setPointerCapture?.(pointerId)
    const append=event.shiftKey||event.ctrlKey||event.metaKey
    const seed=append?new Set([...selectedClipIds,clip.id]):new Set([clip.id])
    const ids=selectedClipIds.includes(clip.id)?expandedSelection():expandedSelection(seed)
    setSelectedClipId(clip.id);setSelectedClipIds(Array.from(ids))
    const snapshot=project.timelineClips.map(item=>({...item})),originMap=new Map(snapshot.map(item=>[item.id,item])),originX=event.clientX,originY=event.clientY,originScroll=timelineScrollRef.current?.scrollLeft||0
    const selectedOrigins=snapshot.filter(item=>ids.has(item.id)),groupStart=Math.min(...selectedOrigins.map(item=>item.timelineStart)),groupEnd=Math.max(...selectedOrigins.map(item=>item.timelineStart+item.duration)),groupDuration=groupEnd-groupStart
    let latestX=originX,latestY=originY,ignoreSnap=event.altKey,raf=0,targetTrack=clip.trackId,dragStarted=false,historySaved=false,finished=false
    const ensureHistory=()=>{if(historySaved)return;historySaved=true;setUndoStack(stack=>[...stack.slice(-49),snapshot]);setRedoStack([])}
    const autoScroll=(clientX:number)=>{const scroll=timelineScrollRef.current;if(!scroll)return;const rect=scroll.getBoundingClientRect(),edge=72,maxStep=20;if(clientX<rect.left+edge)scroll.scrollLeft=Math.max(0,scroll.scrollLeft-Math.min(maxStep,(rect.left+edge-clientX)*.35));else if(clientX>rect.right-edge)scroll.scrollLeft+=Math.min(maxStep,(clientX-(rect.right-edge))*.35)}
    const render=()=>{raf=0;if(!dragStarted)return;const scrollDelta=(timelineScrollRef.current?.scrollLeft||0)-originScroll,rawGroupStart=groupStart+(latestX-originX+scrollDelta)/zoom,result=snapMoveResult(rawGroupStart,groupDuration,ids,ignoreSnap),delta=result.time-groupStart;setSnapGuide(result.guide);setDragReadout(frameSnap(clip.timelineStart+delta));setDragDelta(signedFrameSnap(delta));setProject(p=>({...p,timelineClips:p.timelineClips.map(item=>{const origin=originMap.get(item.id);return ids.has(item.id)&&origin?{...item,trackId:item.id===clip.id?targetTrack:origin.trackId,timelineStart:frameSnap(Math.max(0,origin.timelineStart+delta))}:item})}))}
    const move=(pointer:PointerEvent)=>{latestX=pointer.clientX;latestY=pointer.clientY;ignoreSnap=pointer.altKey;autoScroll(pointer.clientX);const lane=document.elementFromPoint(pointer.clientX,pointer.clientY)?.closest<HTMLElement>('[data-track-id]');if(lane){const candidate=project.timelineTracks.find(track=>track.id===lane.dataset.trackId);if(candidate&&!candidate.locked&&trackAccepts(candidate,clip.type))targetTrack=candidate.id}const travelled=Math.hypot(latestX-originX,latestY-originY);if(!dragStarted&&travelled>=3){dragStarted=true;ensureHistory();suppressTimelineClick.current=true;setDraggingClipId(clip.id);setInteraction('move');document.body.classList.add('timeline-moving')}if(dragStarted&&!raf)raf=requestAnimationFrame(render)}
    const cleanup=()=>{pointerTarget.removeEventListener('pointermove',move);pointerTarget.removeEventListener('pointerup',up);pointerTarget.removeEventListener('pointercancel',cancel);try{pointerTarget.releasePointerCapture?.(pointerId)}catch{/* pointer already released */}setSnapGuide(null);setDragReadout(null);setDragDelta(null);setDraggingClipId(null);setInteraction('idle');document.body.classList.remove('timeline-moving');cancelGestureRef.current=null;if(dragStarted)window.setTimeout(()=>{suppressTimelineClick.current=false},0)}
    const finish=(restore=false)=>{if(finished)return;finished=true;if(raf){cancelAnimationFrame(raf);render()}if(restore&&dragStarted){setProject(p=>({...p,timelineClips:snapshot}));if(historySaved)setUndoStack(stack=>stack.slice(0,-1))}cleanup()}
    const up=()=>finish(false),cancel=()=>finish(true)
    cancelGestureRef.current=cancel
    pointerTarget.addEventListener('pointermove',move);pointerTarget.addEventListener('pointerup',up,{once:true});pointerTarget.addEventListener('pointercancel',cancel,{once:true})
  }
  const handleDrop=(event:React.DragEvent<HTMLDivElement>,track:TimelineTrack)=>{
    event.preventDefault();if(track.locked){notify('Unlock this track before editing it');return}
    const rect=event.currentTarget.getBoundingClientRect(),time=snapped((event.clientX-rect.left)/zoom),clipId=event.dataTransfer.getData('application/x-x1-clip'),assetId=event.dataTransfer.getData('application/x-x1-asset'),shotId=event.dataTransfer.getData('application/x-x1-shot')
    if(clipId){const clip=project.timelineClips.find(item=>item.id===clipId);if(!clip||!trackAccepts(track,clip.type)){notify('That clip type cannot go on this track');return}const ids=selectedClipIds.includes(clipId)?expandedSelection():new Set([clipId,...project.timelineClips.filter(item=>clip.linkGroupId&&item.linkGroupId===clip.linkGroupId).map(item=>item.id)]),delta=time-clip.timelineStart,locked=new Set(project.timelineTracks.filter(item=>item.locked).map(item=>item.id));commit(project.timelineClips.map(item=>ids.has(item.id)&&!locked.has(item.trackId)?{...item,trackId:item.id===clipId?track.id:item.trackId,timelineStart:snapped(item.timelineStart+delta,item.id)}:item));setSelectedClipId(clipId);setSelectedClipIds(Array.from(ids));return}
    const shot=shotId?project.shots.find(item=>item.id===shotId):undefined,asset=project.resources.find(item=>item.id===(assetId||shot?.assetId))
    if(!asset){if(shot){const marker={id:makeId(),time,label:shot.description,color:'#c8ff2f',shotId:shot.id};setProject(p=>({...p,timelineMarkers:[...p.timelineMarkers,marker]}));notify('Shot marker placed · link media when it is ready')}return}
    const candidate=createClip(asset,track.id,time,shot?.id);if(!trackAccepts(track,candidate.type)){notify(`Drop ${candidate.type} media onto a compatible track`);return}
    const next=[...project.timelineClips,candidate],added=[candidate.id]
    if(track.id==='v1'&&candidate.type==='video'){const linkGroupId=makeId();candidate.linkGroupId=linkGroupId;const audio={...candidate,id:makeId(),trackId:'a1',type:'audio' as const,name:`${candidate.name} · linked audio`,linkGroupId};next.push(audio);added.push(audio.id)}
    commit(next);setSelectedClipId(candidate.id);setSelectedClipIds(added);notify(`${asset.name} added at ${formatPrecise(candidate.timelineStart)}${added.length>1?' · A/V linked':''}`)
  }
  const beginTrim=(event:React.PointerEvent<HTMLElement>,clip:TimelineClip,edge:'start'|'end')=>{
    event.preventDefault();event.stopPropagation();if(project.timelineTracks.find(track=>track.id===clip.trackId)?.locked||event.button!==0)return
    const pointerTarget=event.currentTarget,pointerId=event.pointerId
    pointerTarget.setPointerCapture?.(pointerId)
    const originX=event.clientX,originY=event.clientY,originScroll=timelineScrollRef.current?.scrollLeft||0,snapshot=project.timelineClips.map(item=>({...item})),originMap=new Map(snapshot.map(item=>[item.id,item]))
    const ids=linkedSelection(clip);setSelectedClipId(clip.id);setSelectedClipIds(Array.from(ids))
    const sourceDurations=new Map(snapshot.map(item=>{const asset=assetFor(item),duration=item.type==='image'||item.type==='title'?21600:(asset?.duration||item.sourceOut);return[item.id,duration] as const}))
    let latestX=originX,latestY=originY,ignoreSnap=event.altKey,raf=0,trimStarted=false,historySaved=false,finished=false
    const ensureHistory=()=>{if(historySaved)return;historySaved=true;setUndoStack(stack=>[...stack.slice(-49),snapshot]);setRedoStack([])}
    const autoScroll=(clientX:number)=>{const scroll=timelineScrollRef.current;if(!scroll)return;const rect=scroll.getBoundingClientRect(),edgeSize=72,maxStep=20;if(clientX<rect.left+edgeSize)scroll.scrollLeft=Math.max(0,scroll.scrollLeft-Math.min(maxStep,(rect.left+edgeSize-clientX)*.35));else if(clientX>rect.right-edgeSize)scroll.scrollLeft+=Math.min(maxStep,(clientX-(rect.right-edgeSize))*.35)}
    const render=()=>{raf=0;if(!trimStarted)return;const scrollDelta=(timelineScrollRef.current?.scrollLeft||0)-originScroll,rawDelta=(latestX-originX+scrollDelta)/zoom,primary=originMap.get(clip.id)!;let requestedEdge:number
      if(edge==='start'){const minDelta=Math.max(-primary.sourceIn,-primary.timelineStart),bounded=Math.max(minDelta,Math.min(primary.duration-frame,rawDelta));requestedEdge=primary.timelineStart+bounded}
      else{const sourceDuration=sourceDurations.get(primary.id)??primary.sourceOut,maxDuration=Math.max(frame,sourceDuration-primary.sourceIn),boundedDuration=Math.max(frame,Math.min(maxDuration,primary.duration+rawDelta));requestedEdge=primary.timelineStart+boundedDuration}
      const result=snapResult(requestedEdge,ids,ignoreSnap),delta=edge==='start'?result.time-primary.timelineStart:result.time-(primary.timelineStart+primary.duration),next=trimTimelineClips(snapshot,{clipId:clip.id,linkedClipIds:ids,edge,delta,frame,sourceDurations}),updatedPrimary=next.find(item=>item.id===clip.id)!
      let displayClips=next
      if(trimMode==='ripple'){
        const beforePrimary=originMap.get(clip.id)||clip
        const endDelta=frameSnap((updatedPrimary.timelineStart+updatedPrimary.duration)-(beforePrimary.timelineStart+beforePrimary.duration))
        if(endDelta!==0){
          const targetedTracks=new Set(project.timelineTracks.filter(track=>track.targeted && !track.locked).map(track=>track.id))
          displayClips=shiftFollowingClips(next,targetedTracks,frameSnap(beforePrimary.timelineStart+beforePrimary.duration),endDelta,ids)
        }
      }
      setProject(p=>({...p,timelineClips:displayClips}));setSnapGuide(result.guide);setDragReadout(edge==='start'?updatedPrimary.timelineStart:updatedPrimary.timelineStart+updatedPrimary.duration);setDragDelta(signedFrameSnap(delta))}
    const move=(pointer:PointerEvent)=>{latestX=pointer.clientX;latestY=pointer.clientY;ignoreSnap=pointer.altKey;autoScroll(pointer.clientX);if(!trimStarted&&Math.hypot(latestX-originX,latestY-originY)>=2){trimStarted=true;ensureHistory();suppressTimelineClick.current=true;setTrimmingClipId(clip.id);setInteraction(edge==='start'?'trim-start':'trim-end');document.body.classList.add('timeline-trimming')}if(trimStarted&&!raf)raf=requestAnimationFrame(render)}
    const cleanup=()=>{pointerTarget.removeEventListener('pointermove',move);pointerTarget.removeEventListener('pointerup',up);pointerTarget.removeEventListener('pointercancel',cancel);try{pointerTarget.releasePointerCapture?.(pointerId)}catch{/* pointer already released */}setSnapGuide(null);setDragReadout(null);setDragDelta(null);setTrimmingClipId(null);setInteraction('idle');document.body.classList.remove('timeline-trimming');cancelGestureRef.current=null;if(trimStarted)window.setTimeout(()=>{suppressTimelineClick.current=false},0)}
    const finish=(restore=false)=>{if(finished)return;finished=true;if(raf){cancelAnimationFrame(raf);render()}if(restore&&trimStarted){setProject(p=>({...p,timelineClips:snapshot}));if(historySaved)setUndoStack(stack=>stack.slice(0,-1))}cleanup()}
    const up=()=>finish(false),cancel=()=>finish(true)
    cancelGestureRef.current=cancel
    pointerTarget.addEventListener('pointermove',move);pointerTarget.addEventListener('pointerup',up,{once:true});pointerTarget.addEventListener('pointercancel',cancel,{once:true})
  }
  const beginViewerMove=(event:React.PointerEvent<HTMLDivElement>,clip:TimelineClip)=>{
    if(event.button!==0||clip.type==='title')return
    event.preventDefault();event.stopPropagation();selectClip(clip.id)
    const canvas=viewerCanvasRef.current;if(!canvas)return
    const rect=canvas.getBoundingClientRect(),originX=event.clientX,originY=event.clientY,startX=clip.positionX,startY=clip.positionY,snapshot=project.timelineClips.map(item=>({...item}));let moved=false,raf=0,latestX=originX,latestY=originY
    const render=()=>{raf=0;const x=Math.max(-200,Math.min(200,startX+(latestX-originX)/Math.max(1,rect.width)*100)),y=Math.max(-200,Math.min(200,startY+(latestY-originY)/Math.max(1,rect.height)*100));setProject(p=>({...p,timelineClips:p.timelineClips.map(item=>item.id===clip.id?{...item,positionX:Number(x.toFixed(2)),positionY:Number(y.toFixed(2))}:item)}))}
    const move=(pointer:PointerEvent)=>{latestX=pointer.clientX;latestY=pointer.clientY;if(!moved&&Math.hypot(latestX-originX,latestY-originY)>2){moved=true;setUndoStack(stack=>[...stack.slice(-49),snapshot]);setRedoStack([]);document.body.classList.add('viewer-transform-active')}if(moved&&!raf)raf=requestAnimationFrame(render)}
    const finish=()=>{if(raf){cancelAnimationFrame(raf);render()}removeEventListener('pointermove',move);removeEventListener('pointerup',finish);removeEventListener('pointercancel',finish);document.body.classList.remove('viewer-transform-active')}
    addEventListener('pointermove',move);addEventListener('pointerup',finish,{once:true});addEventListener('pointercancel',finish,{once:true})
  }
  const seek=(time:number)=>{const next=Math.max(0,Math.min(canvasDuration,time));playheadRef.current=next;setPlayhead(next)}
  const beginScrub=(event:React.PointerEvent<HTMLElement>)=>{if(event.button!==0||tool==='hand')return;event.preventDefault();setPlaying(false);const element=event.currentTarget,pointerId=event.pointerId;element.setPointerCapture?.(pointerId);setInteraction('scrub');const update=(clientX:number)=>seek((clientX-element.getBoundingClientRect().left)/zoom);update(event.clientX);const move=(pointer:PointerEvent)=>update(pointer.clientX),cleanup=()=>{element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',finish);element.removeEventListener('pointercancel',cancel);try{element.releasePointerCapture?.(pointerId)}catch{/* released */}setInteraction('idle');cancelGestureRef.current=null},finish=()=>cleanup(),cancel=()=>cleanup();cancelGestureRef.current=cancel;element.addEventListener('pointermove',move);element.addEventListener('pointerup',finish,{once:true});element.addEventListener('pointercancel',cancel,{once:true})}
  const beginTimelinePan=(event:React.PointerEvent<HTMLElement>)=>{if(event.button!==0&&event.button!==1)return;const scroll=timelineScrollRef.current;if(!scroll)return;event.preventDefault();event.stopPropagation();const element=event.currentTarget,pointerId=event.pointerId;element.setPointerCapture?.(pointerId);const originX=event.clientX,originY=event.clientY,startLeft=scroll.scrollLeft,startTop=scroll.scrollTop;setInteraction('pan');document.body.classList.add('timeline-panning');const move=(pointer:PointerEvent)=>{scroll.scrollLeft=Math.max(0,startLeft-(pointer.clientX-originX));scroll.scrollTop=Math.max(0,startTop-(pointer.clientY-originY))},cleanup=()=>{element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',finish);element.removeEventListener('pointercancel',cancel);try{element.releasePointerCapture?.(pointerId)}catch{/* released */}setInteraction('idle');document.body.classList.remove('timeline-panning');cancelGestureRef.current=null},finish=()=>cleanup(),cancel=()=>{scroll.scrollLeft=startLeft;scroll.scrollTop=startTop;cleanup()};cancelGestureRef.current=cancel;element.addEventListener('pointermove',move);element.addEventListener('pointerup',finish,{once:true});element.addEventListener('pointercancel',cancel,{once:true})}
  const updateBladePreview=(event:React.PointerEvent<HTMLElement>,clip:TimelineClip)=>{if(tool!=='blade')return;const lane=event.currentTarget.closest<HTMLElement>('[data-track-id]');if(!lane)return;const time=frameSnap((event.clientX-lane.getBoundingClientRect().left)/zoom);setBladePreview({time,clipId:clip.id})}
  const fitTimeline=()=>{const available=Math.max(500,(timelineScrollRef.current?.clientWidth||1200)-170),next=Math.max(8,Math.min(80,available/Math.max(12,sequenceDuration||45)));setZoom(Math.round(next));if(timelineScrollRef.current)timelineScrollRef.current.scrollLeft=0}
  const handleTimelineWheel=(event:React.WheelEvent<HTMLDivElement>)=>{const scroll=timelineScrollRef.current;if(!scroll)return;if(event.ctrlKey||event.metaKey){event.preventDefault();const rect=scroll.getBoundingClientRect(),pointer=Math.max(155,event.clientX-rect.left+scroll.scrollLeft),time=Math.max(0,(pointer-155)/zoom),next=Math.max(8,Math.min(80,zoom+(event.deltaY<0?4:-4)));if(next===zoom)return;setZoom(next);requestAnimationFrame(()=>{scroll.scrollLeft=Math.max(0,155+time*next-(event.clientX-rect.left))})}else if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)){event.preventDefault();scroll.scrollLeft+=event.deltaX||event.deltaY}}
  const attachProxy=(file?:File)=>{if(!file||!selectedAsset||selectedAsset.category!=='Video'){notify('Select a video in the media bin first');return}const proxyUrl=URL.createObjectURL(file);setProject(p=>({...p,resources:p.resources.map(asset=>asset.id===selectedAsset.id?{...asset,proxyUrl,proxyName:file.name}:asset)}));setProxyMode(true);notify(`Proxy attached to ${selectedAsset.name}`)}
  const restoreRevision=(revision:TimelineRevision)=>{setUndoStack(stack=>[...stack.slice(-49),project.timelineClips.map(clip=>({...clip}))]);setProject(p=>({...p,timelineClips:revision.clips.map(clip=>({...clip})),timelineTracks:revision.tracks.map(track=>({...track})),timelineMarkers:revision.markers.map(marker=>({...marker}))}));setSelectedClipId(null);setSelectedClipIds([]);setShowHistory(false);notify(`Restored ${revision.label}`)}
  const addTimelineMarker=()=>{
    const marker={id:makeId(),time:frameSnap(playhead),label:`Marker · ${formatTimecode(playhead)}`,color:'#c8ff2f'}
    setProject(p=>({...p,timelineMarkers:[...p.timelineMarkers,marker]}))
    notify(`Marker added at ${formatTimecode(playhead)}`)
  }
  const updateTrack=(id:string,update:Partial<TimelineTrack>)=>setProject(p=>({...p,timelineTracks:p.timelineTracks.map(track=>track.id===id?{...track,...update}:track)}))

  const bindMediaElement=(element:HTMLMediaElement|null)=>{if(element&&element.dataset.mediaKey)mediaElements.current.set(element.dataset.mediaKey,element)}
  const mediaKeyForVideo=(clip:TimelineClip)=>`video-${clip.id}`
  const mediaKeyForAudio=(clip:TimelineClip)=>`${clip.type==='audio'?'audio':'implicit'}-${clip.id}`
  const expectedMediaTime=(clip:TimelineClip,time=playheadRef.current)=>Math.max(0,clip.sourceIn+(time-clip.timelineStart))
  const visualMediaEntries=visualLayers.filter(clip=>clip.type==='video').map(clip=>({key:mediaKeyForVideo(clip),clip,source:sourceFor(clip,true)}))
  const audioMediaEntries=audioLayers.map(clip=>({key:mediaKeyForAudio(clip),clip,source:clip.type==='audio'?sourceFor(clip,true):sourceFor(clip,false)})).filter(entry=>Boolean(entry.source))
  const activeMediaEntries=[...visualMediaEntries,...audioMediaEntries]
  const mediaSignature=activeMediaEntries.map(entry=>`${entry.key}:${entry.source||''}`).join('|')
  const syncElement=(element:HTMLMediaElement,clip:TimelineClip,force=false)=>{if(element.readyState<1)return;const expected=Math.min(expectedMediaTime(clip),Number.isFinite(element.duration)?Math.max(0,element.duration-frame):expectedMediaTime(clip));if(force||Math.abs(element.currentTime-expected)>(playing ? .4 : .08)){try{element.currentTime=expected}catch{/* loadedmetadata retries */}}}
  const syncActiveMedia=(force=false)=>{activeMediaEntries.forEach(({key,clip})=>{const element=mediaElements.current.get(key);if(!element)return;syncElement(element,clip,force);if(element instanceof HTMLAudioElement)element.volume=Math.max(0,Math.min(1,clip.volume));if(playing&&element.readyState>=2&&element.paused)element.play().catch(()=>{});if(!playing&&!element.paused)element.pause()})}
  const togglePlayback=()=>{
    if(playing){activeMediaEntries.forEach(({key})=>mediaElements.current.get(key)?.pause());setPlaying(false);return}
    lastFrame.current=performance.now();activeMediaEntries.forEach(({key,clip})=>{const element=mediaElements.current.get(key);if(!element)return;syncElement(element,clip,true);element.play().catch(()=>{})});setPlaying(true)
  }
  const mediaLayerStyle=(clip:TimelineClip,zIndex:number):React.CSSProperties=>({zIndex,opacity:clip.opacity,objectFit:clip.fit.toLowerCase() as React.CSSProperties['objectFit'],transform:`translate(${clip.positionX}%, ${clip.positionY}%) rotate(${clip.rotation}deg) scale(${clip.scale}) scaleX(${clip.flipX?-1:1}) scaleY(${clip.flipY?-1:1})`,mixBlendMode:clip.blendMode==='Normal'?'normal':clip.blendMode.toLowerCase() as React.CSSProperties['mixBlendMode']})

  const revisionSignature=draggingClipId||trimmingClipId?'':JSON.stringify({clips:project.timelineClips,tracks:project.timelineTracks,markers:project.timelineMarkers})
  useEffect(()=>{const valid=new Set(project.timelineClips.map(clip=>clip.id));setSelectedClipIds(current=>{const next=current.filter(id=>valid.has(id));return next.length===current.length?current:next});if(selectedClipId&&!valid.has(selectedClipId))setSelectedClipId(null)},[project.timelineClips,selectedClipId])
  useEffect(()=>{try{const saved=localStorage.getItem(`x1-editor-revisions-${project.id}`);setRevisions(saved?JSON.parse(saved):[])}catch{setRevisions([])}},[project.id])
  useEffect(()=>{if(!revisionSignature)return;if(revisionTimer.current)window.clearTimeout(revisionTimer.current);revisionTimer.current=window.setTimeout(()=>{setRevisions(current=>{const latest=current[0];if(latest&&JSON.stringify({clips:latest.clips,tracks:latest.tracks,markers:latest.markers})===revisionSignature)return current;const now=new Date(),next:TimelineRevision={id:makeId(),savedAt:now.toISOString(),label:`${now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${project.timelineClips.length} clips`,clips:project.timelineClips.map(clip=>({...clip})),tracks:project.timelineTracks.map(track=>({...track})),markers:project.timelineMarkers.map(marker=>({...marker}))},updated=[next,...current].slice(0,20);try{localStorage.setItem(`x1-editor-revisions-${project.id}`,JSON.stringify(updated))}catch{/* History remains in memory if browser storage is full. */}return updated})},1200);return()=>{if(revisionTimer.current)window.clearTimeout(revisionTimer.current)}},[revisionSignature,project.id])
  useEffect(()=>{playheadRef.current=playhead},[playhead])
  useEffect(()=>{const activeKeys=new Set(activeMediaEntries.map(entry=>entry.key));mediaElements.current.forEach((element,key)=>{if(!activeKeys.has(key)){element.pause();mediaElements.current.delete(key)}});setMediaState(activeDisplay?.type==='video'?'loading':'idle');requestAnimationFrame(()=>syncActiveMedia(true))},[mediaSignature,activeDisplay?.id,proxyMode])
  useEffect(()=>{if(!playing){lastFrame.current=null;syncActiveMedia(true);return}syncActiveMedia(true);activeMediaEntries.forEach(({key})=>mediaElements.current.get(key)?.play().catch(()=>{}))},[playing,mediaSignature])
  useEffect(()=>{if(playing)return;const animation=requestAnimationFrame(()=>syncActiveMedia(true));return()=>cancelAnimationFrame(animation)},[playhead,playing,mediaSignature])
  useEffect(()=>{if(!playing){lastFrame.current=null;return}let cancelled=false,animation=0;const tick=(now:number)=>{if(cancelled)return;const last=lastFrame.current??now;lastFrame.current=now;const next=Math.min(sequenceDuration,playheadRef.current+Math.min(.12,Math.max(0,(now-last)/1000)));playheadRef.current=next;setPlayhead(next);activeMediaEntries.forEach(({key,clip})=>{const element=mediaElements.current.get(key);if(!element)return;syncElement(element,clip,false);if(element.readyState>=2&&element.paused)element.play().catch(()=>{if(clip.id===activeDisplay?.id)setMediaState(element.readyState>=2?'error':'loading')})});if(next>=sequenceDuration){setPlaying(false);return}animation=requestAnimationFrame(tick)};animation=requestAnimationFrame(tick);return()=>{cancelled=true;cancelAnimationFrame(animation)}},[playing,sequenceDuration,mediaSignature])
  useEffect(()=>{if(!playing||!timelineScrollRef.current)return;const scroll=timelineScrollRef.current,x=155+playhead*zoom,left=scroll.scrollLeft,right=left+scroll.clientWidth;if(x>right-130)scroll.scrollLeft=Math.max(0,x-scroll.clientWidth+180);else if(x<left+170)scroll.scrollLeft=Math.max(0,x-210)},[playhead,playing,zoom])
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&cancelGestureRef.current){event.preventDefault();cancelGestureRef.current();return}if((event.target as HTMLElement)?.matches('input,textarea,select'))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();return}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){event.preventDefault();setSelectedClipIds(project.timelineClips.map(clip=>clip.id));setSelectedClipId(project.timelineClips[0]?.id||null);return}if(event.code==='Space'){event.preventDefault();togglePlayback()}else if(event.key.toLowerCase()==='s'&&selectedClip)splitClip(selectedClip);else if(event.key.toLowerCase()==='e'&&selectedClip?.type==='video')extractAudio(selectedClip);else if(event.key.toLowerCase()==='g')groupSelection();else if(event.key.toLowerCase()==='u')ungroupSelection();else if(event.key==='Delete'&&event.shiftKey)rippleDelete();else if(event.key==='Delete'||event.key==='Backspace')lift();else if(event.key.toLowerCase()==='b')setTool('blade');else if(event.key.toLowerCase()==='t')setTool('trim');else if(event.key.toLowerCase()==='h')setTool('hand');else if(event.key.toLowerCase()==='a'||event.key.toLowerCase()==='v')setTool('select');else if(event.key.toLowerCase()==='n')setSnapping(value=>!value);else if(event.key==='ArrowLeft')seek(playhead-(event.shiftKey?1:frame));else if(event.key==='ArrowRight')seek(playhead+(event.shiftKey?1:frame))};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[selectedClipId,selectedClipIds,playhead,undoStack,redoStack,project.timelineClips,rippleAll])
  const exportPlan=()=>downloadText(`${project.title.replace(/[^a-z0-9]+/gi,'-')}-sequence.json`,JSON.stringify({version:7,fps:EDIT_FPS,duration:sequenceDuration,editorSettings:project.editorSettings,tracks:project.timelineTracks,clips:project.timelineClips.map(clip=>({...clip,assetName:assetFor(clip)?.name})),markers:project.timelineMarkers},null,2))

  return <div className={`studio-editor ${editMode}-mode`}>
    <StageHeader index="05" eyebrow={editMode==='quick'?'QUICK EDIT':'ADVANCED EDIT'} title="Shape the sequence." copy={editMode==='quick'?'Choose takes, trim mistakes, add B-roll and captions, then preview the rough cut.':'Layer picture and sound independently, transform clips, trim precisely, and prepare the sequence for Resolve.'} action={<div className="edit-mode-actions"><div className="mode-switch"><button className={editMode==='quick'?'active':''} onClick={()=>setEditMode('quick')}>Quick Edit</button><button className={editMode==='advanced'?'active':''} onClick={()=>setEditMode('advanced')}>Advanced</button></div><div className="runtime"><span>{formatPrecise(sequenceDuration)}</span><small>{project.timelineClips.length} CLIPS · {project.timelineMarkers.length} MARKERS</small></div></div>}/>
    <div className="editor-utilitybar panel">
      <div className="utilitybar-copy"><span>EDIT WORKSPACE</span><b>Picture, sound and sequence settings</b><small>Primary editing tools are docked directly above the timeline.</small></div>
      <div className="utilitybar-actions">
        <label className="aspect-control"><span>Canvas</span><select value={aspectRatio} onChange={e=>updateEditorSettings({aspectRatio:e.target.value as Project['editorSettings']['aspectRatio']})}><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option></select></label>
        <button onClick={addTitle}><Icon name="plus" size={14}/><span>Title</span></button>
        <button className={showHistory?'active':''} onClick={()=>setShowHistory(value=>!value)}><Icon name="history" size={14}/><span>History</span></button>
        <button onClick={()=>setShowShortcuts(value=>!value)}><Icon name="keyboard" size={14}/><span>Shortcuts</span></button>
        <button className="secondary" onClick={()=>importInput.current?.click()}><Icon name="upload" size={14}/><span>Import</span></button>
        <button className="primary" onClick={exportPlan}><Icon name="download" size={14}/><span>Edit plan</span></button>
      </div>
    </div>
    {showHistory&&<div className="history-popover"><header><div><b>Autosave history</b><small>Timeline snapshots stay in this browser.</small></div><button onClick={()=>setShowHistory(false)}><Icon name="x"/></button></header>{revisions.length?<div>{revisions.map((revision,index)=><button key={revision.id} onClick={()=>restoreRevision(revision)}><span><b>{index===0?'Current autosave':revision.label}</b><small>{new Date(revision.savedAt).toLocaleString()} · {revision.clips.length} clips</small></span><Icon name="arrow" size={14}/></button>)}</div>:<p>Your first timeline snapshot will appear after an edit.</p>}</div>}
    <div className="editor-workbench">
      <aside className="editor-bin panel">
        <header><div>{(['media','shots','transcript'] as const).map(name=><button key={name} className={bin===name?'active':''} onClick={()=>setBin(name)}>{name}</button>)}</div><button onClick={()=>importInput.current?.click()}><Icon name="plus"/></button></header>
        {bin==='media'&&<><div className="bin-search"><Icon name="search"/><input value={mediaSearch} onChange={e=>setMediaSearch(e.target.value)} placeholder="Search this project"/></div><div className="bin-media-grid">{project.resources.filter(asset=>['Video','Images','Audio'].includes(asset.category)&&asset.name.toLowerCase().includes(mediaSearch.toLowerCase())).map(asset=><article key={asset.id} draggable onDragStart={e=>{e.dataTransfer.setData('application/x-x1-asset',asset.id);setSelectedAssetId(asset.id)}} className={selectedAssetId===asset.id?'selected':''} onClick={()=>setSelectedAssetId(asset.id)}>{asset.category==='Video'&&asset.url?<div className="bin-video-thumb">{asset.posterUrl&&<img src={asset.posterUrl} alt=""/>}<video src={asset.proxyUrl&&proxyMode?asset.proxyUrl:asset.url} poster={asset.posterUrl} muted preload="metadata" onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}}/>{asset.proxyUrl&&<i>PROXY</i>}</div>:asset.category==='Images'&&asset.url?<img src={asset.url} alt=""/>:asset.category==='Audio'?<span className="bin-audio-thumb"><Icon name="mic"/><i>{(asset.waveform||waveformPattern(asset.name,22)).slice(0,22).map((bar,index)=><b key={index} style={{height:`${Math.max(12,bar*88)}%`}}/>)}</i></span>:<span><Icon name="video"/></span>}<div><b>{asset.name}</b><small>{asset.role} · {asset.duration?formatPrecise(asset.duration):asset.category}</small></div></article>)}</div>{selectedAsset&&<div className="bin-selection-meta"><span><b>{selectedAsset.name}</b><small>{selectedAsset.proxyUrl?`Proxy: ${selectedAsset.proxyName}`:'Original media'}</small></span>{selectedAsset.category==='Video'&&<button onClick={()=>proxyInput.current?.click()}>{selectedAsset.proxyUrl?'Replace proxy':'Attach proxy'}</button>}</div>}{!project.resources.some(asset=>['Video','Images','Audio'].includes(asset.category))&&<div className="bin-empty"><Icon name="folder"/><b>No media yet</b><small>Import local files, then drag them to a compatible track.</small><button onClick={()=>importInput.current?.click()}>Choose files</button></div>}</>}
        {bin==='shots'&&<div className="bin-shot-list">{[...project.shots].sort((a,b)=>(a.order||0)-(b.order||0)).map(shot=><article key={shot.id} draggable onDragStart={e=>e.dataTransfer.setData('application/x-x1-shot',shot.id)}><span>{shot.shotNumber}</span><div><b>{shot.description}</b><small>{shot.section} · {shot.shotType}</small></div><i className={shot.assetId?'linked':''}>{shot.assetId?'MEDIA':'MARKER'}</i></article>)}</div>}
        {bin==='transcript'&&<div className="bin-transcript">{project.transcript.map(line=><button key={line.id} className={line.included?'':'removed'} onClick={()=>seek(line.start)}><span>{formatPrecise(line.start)}</span><p>{line.text}</p></button>)}</div>}
      </aside>
      <section className="sequence-viewer panel" ref={viewerRef}>
        <div className="viewer-stage-shell">
          <div className={`viewer-canvas aspect-${aspectRatio.replace(':','-')}`} ref={viewerCanvasRef} style={{aspectRatio:aspectCss[aspectRatio],width:portraitAspect?'auto':'100%',height:portraitAspect?'100%':'auto',background:project.editorSettings.background}}>
            {visualLayers.length?visualLayers.map((clip,index)=>{const asset=assetFor(clip),source=sourceFor(clip,true),style=mediaLayerStyle(clip,index+1),selected=selectedClipId===clip.id;return <div key={clip.id} className={`viewer-media-layer ${selected?'selected':''}`} style={{zIndex:index+1}} onPointerDown={e=>beginViewerMove(e,clip)} onDoubleClick={()=>resetTransform(clip)}>{clip.type==='video'&&source?<video data-media-key={mediaKeyForVideo(clip)} ref={bindMediaElement} src={source} poster={asset?.posterUrl} preload="auto" muted playsInline style={style} onLoadStart={()=>{if(clip.id===activeDisplay?.id)setMediaState('loading')}} onLoadedMetadata={event=>{syncElement(event.currentTarget,clip,true);if(clip.id===activeDisplay?.id)setMediaState('ready');if(playing)event.currentTarget.play().catch(()=>{})}} onCanPlay={event=>{if(clip.id===activeDisplay?.id)setMediaState('ready');if(playing)event.currentTarget.play().catch(()=>{})}} onWaiting={()=>{if(playing&&clip.id===activeDisplay?.id)setMediaState('buffering')}} onStalled={()=>{if(playing&&clip.id===activeDisplay?.id)setMediaState('buffering')}} onError={()=>{if(clip.id===activeDisplay?.id){setMediaState('error');notify('This video codec could not start in Chrome. Attach an H.264 MP4 proxy for smoother editing.')}}}/>:clip.type==='image'&&asset?.url?<img src={asset.url} alt="" style={style}/>:null}</div>}):<div className="viewer-empty"><img src="/joint-x-logo.png" alt="Joint X"/><span>SEQUENCE VIEWER</span><b>{project.timelineClips.length?'Move the playhead onto a visible video or image clip.':'Drag a recording onto any video track to begin.'}</b><small>The original media remains untouched.</small></div>}
            {titleLayers.map((clip,index)=><div key={clip.id} className={`viewer-title-layer ${selectedClipId===clip.id?'selected':''}`} style={mediaLayerStyle(clip,visualLayers.length+index+2)} onPointerDown={()=>selectClip(clip.id)}><div className="viewer-title">{clip.text}</div></div>)}
            {activeDisplay?.type==='video'&&(mediaState==='loading'||mediaState==='buffering')&&(visualLayers.length>1?<div className="viewer-layer-status"><i/><span>{mediaState==='buffering'?'Top layer catching up':'Preparing top layer'}</span></div>:<div className="viewer-buffering"><i/><b>{mediaState==='buffering'?'Catching up…':'Preparing the active layer…'}</b><small>The sequence clock keeps moving while local media catches up.</small></div>)}
            {activeDisplay?.type==='video'&&mediaState==='error'&&<div className="viewer-playback-error"><Icon name="video"/><b>Chrome cannot play this layer smoothly.</b><small>Use an H.264 MP4 proxy while keeping the original for Resolve.</small><button onClick={()=>{if(displayAsset){setSelectedAssetId(displayAsset.id);window.setTimeout(()=>proxyInput.current?.click(),0)}}}>Attach playback proxy</button></div>}
            {activeCaption&&<div className="sequence-caption">{activeCaption}</div>}<div className="viewer-safe"><span/></div>{displayAsset?.proxyUrl&&<span className="viewer-quality-badge">{proxyMode?'PROXY':'ORIGINAL'}</span>}
          </div>
        </div>
        <div className="sequence-audio-engine" aria-hidden>{audioMediaEntries.map(({clip,key,source})=>{if(!source)return null;return <audio key={key} data-media-key={key} ref={bindMediaElement} src={source} preload="auto" onLoadedMetadata={event=>{syncElement(event.currentTarget,clip,true);event.currentTarget.volume=Math.max(0,Math.min(1,clip.volume));if(playing)event.currentTarget.play().catch(()=>{})}}/>})}</div>
        <div className="viewer-transport"><span>{formatTimecode(playhead)} <i>/</i> {formatTimecode(sequenceDuration)}</span><div><button onClick={()=>seek(playhead-frame)} title="Previous frame">‹</button><button className="play" onClick={togglePlayback}><Icon name={playing?'pause':'play'}/></button><button onClick={()=>seek(playhead+frame)} title="Next frame">›</button></div><div>{displayAsset?.proxyUrl&&<button className={proxyMode?'quality-on':''} onClick={()=>setProxyMode(value=>!value)}>{proxyMode?'PXY':'ORG'}</button>}<button onClick={()=>seek(0)}>↤</button><button onClick={()=>seek(sequenceDuration)}>↦</button><button onClick={()=>viewerRef.current?.requestFullscreen?.()}><Icon name="expand"/></button></div></div>
      </section>
      <aside className="clip-inspector panel">
        <header><span>INSPECTOR</span><small>{selectedClipIds.length>1?'MULTI':selectedClip?'CLIP':'SEQUENCE'}</small></header>
        {selectedClip&&selectedClipIds.length<=1?<><div className="inspector-title"><span style={{background:trackFor(selectedClip)?.color}}/><div><b>{selectedClip.name}</b><small>{selectedClip.type} · {assetFor(selectedClip)?.role||'generated'}{selectedClip.linkGroupId?' · A/V linked':''}</small></div></div><div className="inspector-form"><label><span>TRACK</span><select value={selectedClip.trackId} onChange={e=>updateClip(selectedClip.id,{trackId:e.target.value})}>{tracks.filter(track=>trackAccepts(track,selectedClip.type)).map(track=><option value={track.id} key={track.id}>{track.label}</option>)}</select></label><label><span>START · {formatTimecode(selectedClip.timelineStart)}</span><input type="number" min="0" step={frame} value={Number(selectedClip.timelineStart.toFixed(2))} onChange={e=>updateClip(selectedClip.id,{timelineStart:frameSnap(Number(e.target.value))})}/></label><label><span>SOURCE IN</span><input type="number" min="0" step={frame} value={Number(selectedClip.sourceIn.toFixed(2))} onChange={e=>{const value=frameSnap(Number(e.target.value)),delta=value-selectedClip.sourceIn;updateClip(selectedClip.id,{sourceIn:value,duration:Math.max(frame,frameSnap(selectedClip.duration-delta))})}}/></label><label><span>DURATION · {Math.round(selectedClip.duration*EDIT_FPS)}f</span><input type="number" min={frame} step={frame} value={Number(selectedClip.duration.toFixed(2))} onChange={e=>{const duration=Math.max(frame,frameSnap(Number(e.target.value)));updateClip(selectedClip.id,{duration,sourceOut:frameSnap(selectedClip.sourceIn+duration)})}}/></label>
          {selectedClip.type!=='audio'&&<><div className="inspector-section-title">Picture</div><label><span>FIT</span><select value={selectedClip.fit} onChange={e=>updateClip(selectedClip.id,{fit:e.target.value as TimelineClip['fit']})}><option>Cover</option><option>Contain</option></select></label><label><span>BLEND</span><select value={selectedClip.blendMode} onChange={e=>updateClip(selectedClip.id,{blendMode:e.target.value as TimelineClip['blendMode']})}><option>Normal</option><option>Multiply</option><option>Screen</option><option>Overlay</option><option>Lighten</option><option>Darken</option></select></label><label className="wide"><span>OPACITY · {Math.round(selectedClip.opacity*100)}%</span><input type="range" min="0" max="1" step=".01" value={selectedClip.opacity} onChange={e=>updateClip(selectedClip.id,{opacity:Number(e.target.value)},false)}/></label><div className="inspector-section-title">Transform</div><label><span>SCALE · {Math.round(selectedClip.scale*100)}%</span><input type="range" min=".1" max="3" step=".01" value={selectedClip.scale} onChange={e=>updateClip(selectedClip.id,{scale:Number(e.target.value)},false)}/></label><label><span>ROTATE</span><input type="number" min="-360" max="360" step="1" value={selectedClip.rotation} onChange={e=>updateClip(selectedClip.id,{rotation:Number(e.target.value)},false)}/></label><label><span>POSITION X</span><input type="number" min="-200" max="200" step="1" value={Number(selectedClip.positionX.toFixed(1))} onChange={e=>updateClip(selectedClip.id,{positionX:Number(e.target.value)},false)}/></label><label><span>POSITION Y</span><input type="number" min="-200" max="200" step="1" value={Number(selectedClip.positionY.toFixed(1))} onChange={e=>updateClip(selectedClip.id,{positionY:Number(e.target.value)},false)}/></label><div className="transform-actions wide"><button className={selectedClip.flipX?'active':''} onClick={()=>updateClip(selectedClip.id,{flipX:!selectedClip.flipX})}>Flip horizontal</button><button className={selectedClip.flipY?'active':''} onClick={()=>updateClip(selectedClip.id,{flipY:!selectedClip.flipY})}>Flip vertical</button><button onClick={()=>resetTransform(selectedClip)}>Reset</button></div></>}
          {selectedClip.type==='audio'&&<><div className="inspector-section-title">Sound</div><label className="wide"><span>VOLUME · {Math.round(selectedClip.volume*100)}%</span><input type="range" min="0" max="1" step=".01" value={selectedClip.volume} onChange={e=>updateClip(selectedClip.id,{volume:Number(e.target.value)},false)}/></label></>}
          {selectedClip.type==='title'&&<label className="wide"><span>TITLE TEXT</span><textarea value={selectedClip.text||''} onChange={e=>updateClip(selectedClip.id,{text:e.target.value},false)}/></label>}
        </div><div className="inspector-actions">{selectedClip.type==='video'&&<button onClick={()=>extractAudio(selectedClip)}><Icon name="mic"/> Extract audio</button>}<button onClick={()=>splitClip(selectedClip)}><Icon name="edit"/> Split</button><button onClick={duplicate}><Icon name="copy"/> Duplicate</button><button onClick={lift}><Icon name="trash"/> Lift</button>{selectedClip.linkGroupId&&<button onClick={unlinkSelection}><Icon name="link"/> Unlink A/V</button>}<button className="danger" onClick={rippleDelete}>Ripple delete</button></div></>:selectedClipIds.length>1?<div className="multi-inspector"><span>{selectedClipIds.length}</span><b>clips selected</b><small>Move, lift, duplicate or ripple these clips as one selection. Linked A/V keeps picture and sound together.</small><div>{selectedClips.slice(0,7).map(clip=><i key={clip.id}><em style={{background:trackFor(clip)?.color}}/>{clip.name}</i>)}</div><button onClick={groupSelection}>Group selection</button><button onClick={duplicate}>Duplicate selection</button><button onClick={lift}>Lift selection</button><button className="danger" onClick={rippleDelete}>Ripple delete selection</button></div>:<div className="sequence-inspector"><div><span>{formatTimecode(sequenceDuration)}</span><b>Sequence duration</b></div><div><span>{project.timelineClips.length}</span><b>Clips</b></div><div><span>{project.timelineMarkers.length}</span><b>Shot markers</b></div><label className="sequence-setting"><span>ASPECT RATIO</span><select value={aspectRatio} onChange={e=>updateEditorSettings({aspectRatio:e.target.value as Project['editorSettings']['aspectRatio']})}><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option></select></label><label className="sequence-setting"><span>BACKGROUND</span><input type="color" value={project.editorSettings.background} onChange={e=>updateEditorSettings({background:e.target.value})}/></label><p><Icon name="layers"/> Video layers now composite together while audio tracks continue playing independently beneath B-roll.</p></div>}
      </aside>
    </div>
    <section className="timeline-panel panel">
      <div className="timeline-tool-dock">
        <div className="dock-group dock-primary-tools" aria-label="Timeline tools">
          <button className={tool==='select'?'active':''} onClick={()=>setTool('select')} title="Selection tool (A / V)"><Icon name="cursor" size={17}/><span>Select</span><kbd>A</kbd></button>
          <button className={tool==='trim'?'active':''} onClick={()=>setTool('trim')} title="Trim edit tool (T)"><Icon name="trimtool" size={17}/><span>Trim</span><kbd>T</kbd></button>
          <button className={tool==='blade'?'active':''} onClick={()=>setTool('blade')} title="Blade tool (B)"><Icon name="scissors" size={17}/><span>Blade</span><kbd>B</kbd></button>
          <button className={tool==='hand'?'active':''} onClick={()=>setTool('hand')} title="Hand tool (H)"><Icon name="handtool" size={17}/><span>Hand</span><kbd>H</kbd></button>
        </div>
        <div className="dock-divider"/>
        <div className="dock-group dock-trim-controls">
          <span className="dock-label">Trim mode</span>
          <div className="trim-mode-switch">
            <button className={trimMode==='standard'?'active':''} onClick={()=>setTrimMode('standard')}>Standard</button>
            <button className={trimMode==='ripple'?'active':''} onClick={()=>setTrimMode('ripple')}>Ripple</button>
          </div>
          <button className="compact-action" disabled={!selectedClip} onClick={()=>applyTrimAtPlayhead('start')} title="Trim selected clip start to the playhead"><Icon name="trimtool" size={15}/><span>Start to playhead</span></button>
          <button className="compact-action" disabled={!selectedClip} onClick={()=>applyTrimAtPlayhead('end')} title="Trim selected clip end to the playhead"><Icon name="trimtool" size={15}/><span>End to playhead</span></button>
        </div>
        <div className="dock-divider"/>
        <div className="dock-group dock-edit-actions">
          <button disabled={!undoStack.length} onClick={undo} title="Undo"><Icon name="undo" size={15}/><span>Undo</span></button>
          <button disabled={!redoStack.length} onClick={redo} title="Redo"><Icon name="redo" size={15}/><span>Redo</span></button>
          <button disabled={!selectedClip} onClick={()=>selectedClip&&splitClip(selectedClip)} title="Split selected linked clip"><Icon name="edit" size={14}/><span>Split</span></button>
          <button disabled={selectedClip?.type!=='video'} onClick={()=>extractAudio()} title="Extract audio from selected video"><Icon name="mic" size={14}/><span>Audio</span></button>
          <button disabled={!selectedClipIds.length} onClick={lift} title="Remove selected clips and leave a gap"><Icon name="trash" size={14}/><span>Lift</span></button>
          <button disabled={!selectedClipIds.length} onClick={rippleDelete} title="Delete selected clips and close the gap"><Icon name="arrow" size={14}/><span>Ripple delete</span></button>
          <button className={rippleAll?'active subtle-active':''} onClick={()=>setRippleAll(value=>!value)} title="Ripple every unlocked track or targeted tracks only"><Icon name="target" size={14}/><span>{rippleAll?'All tracks':'Targets only'}</span></button>
          <button disabled={selectedClipIds.length<2} onClick={groupSelection} title="Group selected clips"><Icon name="layers" size={14}/><span>Group</span></button>
          <button disabled={!selectedClipIds.length} onClick={ungroupSelection} title="Ungroup selected clips"><Icon name="x" size={14}/><span>Ungroup</span></button>
          <button className={snapping?'active subtle-active':''} onClick={()=>setSnapping(value=>!value)} title="Snapping (N). Hold Alt during a gesture to bypass"><Icon name="magnet" size={14}/><span>Snap</span><kbd>N</kbd></button>
        </div>
        <div className="dock-status">
          <span>{interaction!=='idle'?interaction.replace('-', ' '):selectedClipIds.length?`${selectedClipIds.length} selected`:'Ready'}</span>
          <small>{toolHint[tool]}</small>
        </div>
      </div>
      <header className="timeline-topbar">
        <div className="timeline-topbar-left">
          <div className="timeline-topbar-group">
            <button onClick={()=>seek(0)} title="Go to start">↤</button>
            <button onClick={togglePlayback} title={playing?'Pause playback':'Play sequence'}><Icon name={playing?'pause':'play'} size={14}/></button>
            <span className="timeline-timecode">{formatTimecode(playhead)}</span>
          </div>
          <div className="timeline-topbar-group">
            <button className="marker-button" onClick={addTimelineMarker} title="Add a marker at the playhead"><Icon name="marker" size={14}/> Marker</button>
            <button disabled={!selectedClipIds.length} onClick={()=>{setSelectedClipId(null);setSelectedClipIds([])}} title="Clear the current selection">Clear selection</button>
          </div>
          <span className="timeline-tool-hint">{toolHint[tool]}</span>
        </div>
        <div className="timeline-topbar-right">
          <span className="timeline-fps">25 FPS</span>
          <button onClick={fitTimeline} title="Fit the whole sequence in view"><Icon name="expand" size={14}/> Fit</button>
          <div className="zoom-controls">
            <button onClick={()=>setZoom(Math.max(8,zoom-4))} title="Zoom out">−</button>
            <input type="range" min="8" max="80" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/>
            <button onClick={()=>setZoom(Math.min(80,zoom+4))} title="Zoom in">+</button>
          </div>
          <span className="zoom-readout">{zoom}px/s</span>
        </div>
      </header>
      <div className={`timeline-scroll tool-${tool} interaction-${interaction}`} ref={timelineScrollRef} onWheel={handleTimelineWheel}>
        <div className="timeline-rack" style={{width:canvasWidth+155}}>
          <div className="timeline-ruler-pro" style={{width:canvasWidth,marginLeft:155}} onPointerDown={tool==='hand'?beginTimelinePan:beginScrub}>
            {Array.from({length:Math.ceil(canvasDuration/5)+1},(_,index)=>index*5).map(time=><i key={time} style={{left:time*zoom}}><span>{formatPrecise(time)}</span></i>)}
            {project.timelineMarkers.map(marker=><button key={marker.id} style={{left:marker.time*zoom,background:marker.color}} title={marker.label} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();seek(marker.time)}}/>)}
          </div>
          {tracks.map(track=><div className={`timeline-track-pro track-${track.kind} ${track.locked?'locked':''} ${track.targeted?'targeted':''}`} key={track.id}>
            <div className="track-head"><span style={{background:track.color}}/><b>{track.label}</b><div>
              <button className={track.targeted?'on':''} onClick={()=>updateTrack(track.id,{targeted:!track.targeted})} title="Target this track for blade and ripple edits"><Icon name="target" size={13}/></button>
              <button className={track.syncLocked?'on':''} onClick={()=>updateTrack(track.id,{syncLocked:!track.syncLocked})} title="Keep linked picture and sound in sync"><Icon name="sync" size={13}/></button>
              <button className={track.hidden?'off':''} onClick={()=>updateTrack(track.id,{hidden:!track.hidden})} title="Show or hide"><Icon name="visible" size={13}/></button>
              <button className={track.muted?'off':''} onClick={()=>updateTrack(track.id,{muted:!track.muted})} title="Mute"><Icon name="mute" size={13}/></button>
              <button className={track.locked?'on':''} onClick={()=>updateTrack(track.id,{locked:!track.locked})} title="Lock"><Icon name="lock" size={13}/></button>
            </div></div>
            <div className="track-lane" data-track-id={track.id} style={{width:canvasWidth}} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDrop(e,track)} onPointerDown={e=>{if(e.target!==e.currentTarget)return;if(tool==='hand'){beginTimelinePan(e);return}setPlaying(false);seek((e.clientX-e.currentTarget.getBoundingClientRect().left)/zoom);if(!e.shiftKey&&!e.ctrlKey&&!e.metaKey){setSelectedClipId(null);setSelectedClipIds([])}}}>
              {project.timelineClips.filter(clip=>clip.trackId===track.id).sort((a,b)=>a.timelineStart-b.timelineStart).map(clip=>{const asset=assetFor(clip),bars=(asset?.waveform||waveformPattern(clip.name,48)).slice(0,48),selected=selectedClipIds.includes(clip.id);return <div key={clip.id} className={`timeline-clip clip-${clip.type} ${selected?'selected':''} ${draggingClipId===clip.id?'dragging':''} ${trimmingClipId===clip.id?'trimming':''} ${clip.groupId?'grouped':''} ${clip.linkGroupId?'linked-av':''} ${bladePreview?.clipId===clip.id?'blade-hover':''}`} style={{left:clip.timelineStart*zoom,width:Math.max(28,clip.duration*zoom),borderColor:track.color}}>
                <button className="trim-handle trim-left" aria-label={`Trim start of ${clip.name}`} title="Trim start · removes the section before this edge" onPointerDown={e=>beginTrim(e,clip,'start')}><span/><em>‹</em></button>
                <button className="clip-move-zone" onPointerDown={e=>tool==='hand'?beginTimelinePan(e):beginMove(e,clip)} onPointerMove={e=>updateBladePreview(e,clip)} onPointerLeave={()=>{if(tool==='blade'&&bladePreview?.clipId===clip.id)setBladePreview(null)}} onClick={e=>{e.stopPropagation();if(tool==='hand'||suppressTimelineClick.current)return;const lane=e.currentTarget.closest<HTMLElement>('[data-track-id]');if(!lane)return;const time=frameSnap((e.clientX-lane.getBoundingClientRect().left)/zoom);if(tool==='blade'){bladeAt(clip,time,e.shiftKey);setBladePreview(null)}else{selectClip(clip.id,e.shiftKey||e.ctrlKey||e.metaKey);seek(time)}}}>
                  {(clip.type==='video'||clip.type==='image')&&asset?.posterUrl&&<span className="clip-filmstrip" style={{backgroundImage:`url(${asset.posterUrl})`}}/>}
                  {clip.type==='image'&&asset?.url&&!asset.posterUrl&&<span className="clip-filmstrip" style={{backgroundImage:`url(${asset.url})`}}/>}
                  {clip.type==='audio'&&<span className="clip-waveform">{bars.map((bar,index)=><i key={index} style={{height:`${Math.max(12,bar*94)}%`}}/>)}</span>}
                  <span className="clip-kind">{clip.type==='audio'?'≋':clip.type==='title'?'T':'▧'}</span><b>{clip.name}</b><small>{formatTimecode(clip.duration)}</small>{clip.linkGroupId&&<em className="clip-link">⌁</em>}{clip.groupId&&<em className="clip-group">G</em>}
                </button>
                <button className="trim-handle trim-right" aria-label={`Trim end of ${clip.name}`} title="Trim end · removes the section after this edge" onPointerDown={e=>beginTrim(e,clip,'end')}><span/><em>›</em></button>
              </div>})}
            </div>
          </div>)}
          {snapGuide!==null&&<div className="timeline-snap-guide" style={{left:155+snapGuide*zoom}}><span>SNAP · {formatPrecise(snapGuide)}</span></div>}
          {bladePreview&&<div className="timeline-blade-guide" style={{left:155+bladePreview.time*zoom}}><span>✂ {formatTimecode(bladePreview.time)}</span></div>}
          {dragReadout!==null&&<div className={`timeline-drag-readout ${interaction.startsWith('trim')?'trim-readout':''}`} style={{left:155+dragReadout*zoom}}><b>{interaction.startsWith('trim')?'TRIM':'MOVE'}</b><span>{formatTimecode(dragReadout)}</span>{dragDelta!==null&&<em>{dragDelta>=0?'+':'−'}{formatTimecode(Math.abs(dragDelta))}</em>}</div>}
          <div className="timeline-playhead" style={{left:155+playhead*zoom}}><span>{formatTimecode(playhead)}</span></div>
        </div>
      </div>
    </section>
    <input ref={importInput} className="visually-hidden" type="file" multiple accept="video/*,image/*,audio/*" onChange={e=>{if(e.target.files)addResourceFiles(e.target.files,setProject,notify);e.target.value=''}}/>
    <input ref={proxyInput} className="visually-hidden" type="file" accept="video/*" onChange={e=>{attachProxy(e.target.files?.[0]);e.target.value=''}}/>
    {showShortcuts&&<div className="shortcut-popover"><header><b>Rough-cut shortcuts</b><button onClick={()=>setShowShortcuts(false)}><Icon name="x"/></button></header><div><span><kbd>Space</kbd> Play / pause</span><span><kbd>← / →</kbd> One frame</span><span><kbd>Shift ←</kbd> One second</span><span><kbd>A / V</kbd> Selection tool</span><span><kbd>T</kbd> Trim tool</span><span><kbd>B</kbd> Blade tool</span><span><kbd>H</kbd> Hand tool</span><span><kbd>N</kbd> Toggle snapping</span><span><kbd>Alt drag</kbd> Ignore snapping</span><span><kbd>Esc</kbd> Cancel active gesture</span><span><kbd>Shift click</kbd> Blade targeted tracks</span><span><kbd>S</kbd> Split linked clip</span><span><kbd>E</kbd> Extract audio</span><span><kbd>Ctrl click</kbd> Multi-select</span><span><kbd>G</kbd> Group selection</span><span><kbd>U</kbd> Ungroup</span><span><kbd>Delete</kbd> Lift</span><span><kbd>Shift Delete</kbd> Ripple delete</span><span><kbd>Ctrl Z</kbd> Undo</span></div></div>}
    <StageFooter note="Next: export the organised edit decisions, captions and media relink report for Resolve." onNext={onNext} label="Prepare Resolve handoff"/>
  </div>
}

function EditStage({ project, setProject, onNext }: { project:Project; setProject:React.Dispatch<React.SetStateAction<Project>>; onNext:()=>void }) {
  const [tab,setTab]=useState<'transcript'|'timeline'|'broll'|'captions'>('transcript'),[selectedId,setSelectedId]=useState(''),[mediaDuration,setMediaDuration]=useState(0),[playhead,setPlayhead]=useState(0),[playing,setPlaying]=useState(false),[markIn,setMarkIn]=useState<number|null>(null),[markOut,setMarkOut]=useState<number|null>(null),[transcriptDraft,setTranscriptDraft]=useState(''),[showTranscriptImport,setShowTranscriptImport]=useState(false),[captionPosition,setCaptionPosition]=useState<'Top'|'Center'|'Bottom'>('Bottom'),[captionSize,setCaptionSize]=useState(30),[toast,setToast]=useState('')
  const fileInput=useRef<HTMLInputElement>(null),srtInput=useRef<HTMLInputElement>(null),player=useRef<HTMLVideoElement>(null)
  const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),1800)}
  const sourceAssets=project.resources.filter(r=>r.category==='Video'||r.category==='Audio')
  const selected=project.resources.find(r=>r.id===selectedId)??sourceAssets.find(r=>r.url)??sourceAssets[0]
  const duration=mediaDuration||selected?.duration||project.transcript.at(-1)?.end||0
  const included=project.transcript.filter(t=>t.included),mergedCuts=mergeTimeRanges(project.editCuts),removedDuration=mergedCuts.reduce((sum,cut)=>sum+cut.end-cut.start,0),roughDuration=Math.max(0,duration-removedDuration)
  const activeCaption=project.transcript.find(line=>line.included&&playhead>=line.start&&playhead<line.end)
  const activePlacement=project.brollPlacements.find(placement=>playhead>=placement.start&&playhead<placement.end)
  const activeBroll=activePlacement?project.resources.find(asset=>asset.id===activePlacement.assetId):undefined
  const seek=(time:number,autoplay=false)=>{const next=Math.max(0,Math.min(duration,time));setPlayhead(next);if(player.current){player.current.currentTime=next;if(autoplay)player.current.play().catch(()=>{})}}
  const togglePlay=()=>{if(!player.current){notify('Choose a playable local video first');return}if(player.current.paused)player.current.play().catch(()=>{});else player.current.pause()}
  const updateLine=(id:string,update:Partial<TranscriptLine>)=>setProject(p=>({...p,transcript:p.transcript.map(line=>line.id===id?{...line,...update}:line)}))
  const toggleLine=(id:string)=>setProject(p=>{const line=p.transcript.find(item=>item.id===id);if(!line)return p;const restoring=!line.included;return{...p,transcript:p.transcript.map(item=>item.id===id?{...item,included:restoring}:item),editCuts:restoring?p.editCuts.filter(cut=>cut.transcriptId!==id):[...p.editCuts.filter(cut=>cut.transcriptId!==id),{id:makeId(),start:line.start,end:line.end,label:line.text.slice(0,45),transcriptId:id}]}})
  const cutSelection=()=>{if(markIn===null||markOut===null){notify('Set both In and Out points first');return}const start=Math.min(markIn,markOut),end=Math.max(markIn,markOut);if(end-start<.08){notify('The selected range is too short');return}setProject(p=>({...p,editCuts:[...p.editCuts,{id:makeId(),start,end,label:`Manual cut ${formatPrecise(start)}–${formatPrecise(end)}`.replaceAll(':','-')}]}));setMarkIn(null);setMarkOut(null);seek(end);notify(`${formatPrecise(end-start)} removed non-destructively`)}
  const undoCut=()=>setProject(p=>({...p,editCuts:p.editCuts.slice(0,-1),transcript:p.transcript.map(line=>p.editCuts.at(-1)?.transcriptId===line.id?{...line,included:true}:line)}))
  const updatePlacement=(id:string,update:Partial<BrollPlacement>)=>setProject(p=>({...p,brollPlacements:p.brollPlacements.map(item=>item.id===id?{...item,...update}:item)}))
  const addBroll=(assetId:string)=>{const start=Math.min(playhead,Math.max(0,duration-.25)),end=Math.min(duration||start+5,start+5);setProject(p=>({...p,brollPlacements:[...p.brollPlacements,{id:makeId(),assetId,start,end:end>start?end:start+5,fit:'Cover',opacity:1}],editBrollIds:Array.from(new Set([...p.editBrollIds,assetId]))}));notify(`B-roll placed at ${formatPrecise(start)}`)}
  const importTranscriptText=()=>{const lines=textToTimedTranscript(transcriptDraft,duration||project.targetMinutes*60);if(!lines.length){notify('Paste a transcript first');return}setProject(p=>({...p,transcript:lines,editCuts:p.editCuts.filter(cut=>!cut.transcriptId)}));setShowTranscriptImport(false);setTranscriptDraft('');notify(`${lines.length} timed transcript segments created`)}
  const importSrt=async(file?:File)=>{if(!file)return;const lines=parseSrt(await file.text());if(!lines.length){notify('No valid SRT captions found');return}setProject(p=>({...p,transcript:lines,editCuts:p.editCuts.filter(cut=>!cut.transcriptId)}));notify(`${lines.length} SRT captions imported`)}
  const downloadSrt=()=>{downloadText(`${project.title.replace(/[^a-z0-9]+/gi,'-')}-captions.srt`,included.map((line,index)=>`${index+1}\n${srtTime(line.start)} --> ${srtTime(line.end)}\n${line.text}\n`).join('\n'));notify('SRT captions downloaded')}
  const exportPlan=()=>{downloadText(`${project.title.replace(/[^a-z0-9]+/gi,'-')}-edit-plan.json`,JSON.stringify({version:2,source:{id:selected?.id,name:selected?.name,duration},roughDuration,cuts:project.editCuts,broll:project.brollPlacements.map(item=>({...item,asset:project.resources.find(r=>r.id===item.assetId)?.name})),captions:included},null,2));notify('Edit plan downloaded')}
  useEffect(()=>{setPlayhead(0);setMediaDuration(selected?.duration||0);setPlaying(false)},[selected?.id])
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.target as HTMLElement)?.matches('input,textarea,select'))return;if(event.code==='Space'){event.preventDefault();togglePlay()}if(event.key.toLowerCase()==='i')setMarkIn(playhead);if(event.key.toLowerCase()==='o')setMarkOut(playhead);if(event.key==='ArrowLeft')seek(playhead-1);if(event.key==='ArrowRight')seek(playhead+1)};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[playhead,duration])
  return <>
    <StageHeader index="05" eyebrow="ROUGH CUT" title="Make the story move." copy="Scrub the real source, mark cuts, time captions and place B-roll exactly where the story needs it." action={<div className="runtime"><span>{formatPrecise(roughDuration)}</span><small>ROUGH CUT · {formatPrecise(removedDuration)} REMOVED</small></div>}/>
    <div className="edit-sourcebar"><label><span>EDIT SOURCE</span><select value={selected?.id||''} onChange={e=>setSelectedId(e.target.value)}><option value="">Choose linked media</option>{sourceAssets.map(asset=><option value={asset.id} key={asset.id}>{asset.name}{asset.url?'':' · relink needed'}</option>)}</select></label><button className="secondary" onClick={()=>fileInput.current?.click()}><Icon name="upload"/> Import media</button><button className="secondary" onClick={exportPlan}><Icon name="download"/> Export edit plan</button><input ref={fileInput} type="file" className="visually-hidden" accept="video/*,audio/*,image/*" multiple onChange={e=>{if(e.target.files)addResourceFiles(e.target.files,setProject,notify);e.target.value=''}}/><input ref={srtInput} type="file" accept=".srt,text/plain" className="visually-hidden" onChange={e=>{importSrt(e.target.files?.[0]);e.target.value=''}}/><span><Icon name="folder"/> Originals stay untouched.</span></div>
    <div className="edit-layout">
      <section className="editor-panel panel">
        <div className="video-monitor real-monitor pro-monitor">{selected?.url&&selected.category==='Video'?<><video ref={player} src={selected.url} playsInline onLoadedMetadata={e=>{const next=Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0;setMediaDuration(next);setProject(p=>({...p,resources:p.resources.map(asset=>asset.id===selected.id?{...asset,duration:next}:asset)}))}} onTimeUpdate={e=>{let time=e.currentTarget.currentTime;const cut=project.editCuts.find(item=>time>=item.start&&time<item.end);if(cut){time=Math.min(duration,cut.end+.01);e.currentTarget.currentTime=time}setPlayhead(time)}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}/>{activeBroll?.url&&activePlacement&&<div className="broll-preview" style={{opacity:activePlacement.opacity}}>{activeBroll.category==='Images'?<img src={activeBroll.url} alt="B-roll preview" style={{objectFit:activePlacement.fit.toLowerCase() as 'cover'|'contain'}}/>:<video key={activePlacement.id} src={activeBroll.url} muted autoPlay={playing} style={{objectFit:activePlacement.fit.toLowerCase() as 'cover'|'contain'}}/>}<span>B-ROLL · {activeBroll.name}</span></div>}{activeCaption&&<div className={`live-caption caption-${captionPosition.toLowerCase()}`} style={{fontSize:captionSize}}>{activeCaption.text}</div>}</>:selected?.url&&selected.category==='Audio'?<div className="audio-monitor"><Icon name="mic" size={44}/><b>{selected.name}</b><audio src={selected.url} controls/></div>:<div className="monitor-copy"><span className="play-large"><Icon name="play"/></span><small>LOCAL PREVIEW</small><b>{selected?selected.name:'Choose a recording to start editing.'}</b><p>{selected?'Relink this original in Files to enable playback.':'Import a video. It remains on this computer.'}</p><button className="secondary light" onClick={()=>fileInput.current?.click()}>Choose local video</button></div>}</div>
        <div className="transport-bar"><div><button onClick={()=>seek(playhead-5)} title="Back 5 seconds">−5</button><button className="transport-play" onClick={togglePlay}><Icon name={playing?'pause':'play'} size={18}/></button><button onClick={()=>seek(playhead+5)} title="Forward 5 seconds">+5</button></div><span>{formatPrecise(playhead)} <i>/</i> {formatPrecise(duration)}</span><input type="range" min="0" max={Math.max(.01,duration)} step="0.01" value={playhead} onChange={e=>seek(Number(e.target.value))}/><div className="mark-controls"><button className={markIn!==null?'set':''} onClick={()=>setMarkIn(playhead)}>I <span>{markIn===null?'Mark In':formatPrecise(markIn)}</span></button><button className={markOut!==null?'set':''} onClick={()=>setMarkOut(playhead)}>O <span>{markOut===null?'Mark Out':formatPrecise(markOut)}</span></button><button className="cut-action" disabled={markIn===null||markOut===null} onClick={cutSelection}><Icon name="edit" size={14}/> Cut selection</button><button disabled={!project.editCuts.length} onClick={undoCut}>Undo cut</button></div></div>
        <div className="editor-tabs">{(['transcript','timeline','broll','captions'] as const).map(name=><button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name==='broll'?'B-roll':name[0].toUpperCase()+name.slice(1)}</button>)}<span/><small>{selected?.name||'No source selected'}</small></div>
        {tab==='transcript'&&<><div className="transcript-actionbar"><span><b>{project.transcript.length}</b> timed segments</span><div><button onClick={()=>{setTranscriptDraft(project.blocks.map(block=>block.text).join('\n\n'));setShowTranscriptImport(true)}}><Icon name="file" size={14}/> Use script</button><button onClick={()=>setShowTranscriptImport(true)}><Icon name="edit" size={14}/> Paste transcript</button><button onClick={()=>srtInput.current?.click()}><Icon name="upload" size={14}/> Import SRT</button></div></div>{showTranscriptImport&&<div className="transcript-importer"><div><b>Build a timed transcript</b><small>Paste natural paragraphs or one sentence per line. Timing is distributed across the source and remains editable.</small></div><textarea autoFocus value={transcriptDraft} onChange={e=>setTranscriptDraft(e.target.value)} placeholder="Paste the spoken transcript here…"/><div><button className="secondary" onClick={()=>setShowTranscriptImport(false)}>Cancel</button><button className="primary" onClick={importTranscriptText}>Create timed transcript</button></div></div>}<div className="transcript-head"><span><b>Transcript edit</b> · remove words from the rough cut</span><small>Time opens playback · sentence removes/restores</small></div><div className="transcript-lines pro-transcript">{project.transcript.map(line=><div key={line.id} className={line.included?'':'removed'}><button className="line-time" onClick={()=>seek(line.start,true)}>{formatPrecise(line.start)}</button><textarea className="line-copy" value={line.text} onChange={e=>updateLine(line.id,{text:e.target.value})}/><div className="line-range"><input type="number" step=".1" min="0" value={Number(line.start.toFixed(2))} onChange={e=>updateLine(line.id,{start:Number(e.target.value)})}/><span>→</span><input type="number" step=".1" min="0" value={Number(line.end.toFixed(2))} onChange={e=>updateLine(line.id,{end:Number(e.target.value)})}/></div><button className="line-state" onClick={()=>toggleLine(line.id)}><Icon name={line.included?'trash':'plus'} size={14}/>{line.included?'Remove':'Restore'}</button></div>)}</div></>}
        {tab==='timeline'&&<div className="timeline-workspace pro-timeline-workspace"><div className="timeline-toolbar"><span><b>Click the timeline to seek.</b> Red ranges are removed during playback.</span><button disabled={!project.editCuts.length} onClick={()=>setProject(p=>({...p,editCuts:[],transcript:p.transcript.map(line=>({...line,included:true}))}))}>Restore all cuts</button></div><div className="pro-timeline" onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();seek((e.clientX-rect.left)/rect.width*duration)}}><div className="timeline-ruler">{[0,25,50,75,100].map(x=><span key={x} style={{left:`${x}%`}}>{formatPrecise(duration*x/100)}</span>)}</div><div className="pro-lane"><label>A-ROLL</label><div className="lane-canvas"><span className="source-clip">{selected?.name||'Primary source'}</span>{project.editCuts.map(cut=><button key={cut.id} className="cut-block" style={{left:`${duration?cut.start/duration*100:0}%`,width:`${duration?(cut.end-cut.start)/duration*100:0}%`}} onClick={e=>{e.stopPropagation();seek(cut.start)}} title={`${cut.label} · click to preview`}/>)}</div></div><div className="pro-lane"><label>B-ROLL</label><div className="lane-canvas empty-lane">{project.brollPlacements.map(item=><button key={item.id} className="placement-block" style={{left:`${duration?item.start/duration*100:0}%`,width:`${duration?(item.end-item.start)/duration*100:0}%`}} onClick={e=>{e.stopPropagation();seek(item.start)}}><Icon name="video" size={11}/>{project.resources.find(r=>r.id===item.assetId)?.name}</button>)}{!project.brollPlacements.length&&<span>Place media from the B-roll tab</span>}</div></div><div className="pro-lane"><label>CAPTIONS</label><div className="lane-canvas caption-lane">{included.map(line=><i key={line.id} style={{left:`${duration?line.start/duration*100:0}%`,width:`${duration?(line.end-line.start)/duration*100:0}%`}}/>)}</div></div><div className="timeline-cursor" style={{left:`${duration?playhead/duration*100:0}%`}}><span>{formatPrecise(playhead)}</span></div>{markIn!==null&&<i className="mark-pin mark-in" style={{left:`${duration?markIn/duration*100:0}%`}}>I</i>}{markOut!==null&&<i className="mark-pin mark-out" style={{left:`${duration?markOut/duration*100:0}%`}}>O</i>}</div></div>}
        {tab==='broll'&&<div className="broll-workspace"><div className="broll-toolbar"><span><b>Place at {formatPrecise(playhead)}</b><small>Scrub above, then add the visual at the playhead.</small></span><button className="secondary" onClick={()=>fileInput.current?.click()}><Icon name="plus"/> Add media</button></div><div className="edit-broll-grid">{project.resources.filter(r=>r.category==='Video'||r.category==='Images').map(asset=><article key={asset.id}>{asset.category==='Images'&&asset.url?<img src={asset.url} alt=""/>:asset.category==='Video'&&asset.url?<video src={asset.url} muted preload="metadata" onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}}/>:<span><Icon name="video" size={30}/></span>}<div><b>{asset.name}</b><small>{asset.url?'Ready to preview':'Relink needed for preview'}</small><button onClick={()=>addBroll(asset.id)}><Icon name="plus" size={13}/> Add at playhead</button></div></article>)}</div><div className="placement-list"><div className="panel-label"><span>PLACED B-ROLL</span><small>{project.brollPlacements.length} clips on the timeline</small></div>{project.brollPlacements.map((item,index)=>{const asset=project.resources.find(r=>r.id===item.assetId);return<div className="placement-row" key={item.id}><span>{String(index+1).padStart(2,'0')}</span><b>{asset?.name||'Missing media'}</b><label>IN<input type="number" min="0" step=".1" value={Number(item.start.toFixed(2))} onChange={e=>updatePlacement(item.id,{start:Number(e.target.value)})}/></label><label>OUT<input type="number" min="0" step=".1" value={Number(item.end.toFixed(2))} onChange={e=>updatePlacement(item.id,{end:Number(e.target.value)})}/></label><select value={item.fit} onChange={e=>updatePlacement(item.id,{fit:e.target.value as BrollPlacement['fit']})}><option>Cover</option><option>Contain</option></select><button onClick={()=>setProject(p=>({...p,brollPlacements:p.brollPlacements.filter(x=>x.id!==item.id)}))}><Icon name="trash" size={14}/></button></div>})}</div></div>}
        {tab==='captions'&&<div className="captions-workspace"><div className="caption-stylebar"><span><b>Live caption preview</b><small>Timing and text come from the transcript.</small></span><label>POSITION<select value={captionPosition} onChange={e=>setCaptionPosition(e.target.value as typeof captionPosition)}><option>Top</option><option>Center</option><option>Bottom</option></select></label><label>SIZE<input type="range" min="18" max="52" value={captionSize} onChange={e=>setCaptionSize(Number(e.target.value))}/><b>{captionSize}</b></label><button className="secondary" onClick={()=>srtInput.current?.click()}><Icon name="upload"/> Import SRT</button><button className="secondary" onClick={downloadSrt}><Icon name="download"/> Download SRT</button></div>{included.map((line,index)=><div className="caption-row editable-caption" key={line.id}><span>{String(index+1).padStart(2,'0')}</span><div><div><input type="number" step=".1" value={Number(line.start.toFixed(2))} onChange={e=>updateLine(line.id,{start:Number(e.target.value)})}/><span>→</span><input type="number" step=".1" value={Number(line.end.toFixed(2))} onChange={e=>updateLine(line.id,{end:Number(e.target.value)})}/></div><textarea value={line.text} onChange={e=>updateLine(line.id,{text:e.target.value})}/></div><button onClick={()=>seek(line.start,true)}><Icon name="play" size={13}/></button></div>)}</div>}
      </section>
      <aside className="edit-aside">
        <section className="panel suggestions practical-notes"><div className="panel-label"><span>EDIT CHECK</span><small>Based on this actual timeline.</small></div>
          <div className="suggestion"><span className="suggest-icon"><Icon name="edit"/></span><div><b>{project.editCuts.length?`${project.editCuts.length} cut${project.editCuts.length===1?'':'s'} applied`:'No cuts yet'}</b><p>{project.editCuts.length?`${formatPrecise(removedDuration)} will be skipped during playback.`:'Use I and O to mark a range, then Cut selection.'}</p><button onClick={()=>setTab('timeline')}>Open timeline</button></div></div>
          <div className="suggestion"><span className="suggest-icon"><Icon name="video"/></span><div><b>{project.brollPlacements.length?`${project.brollPlacements.length} B-roll placement${project.brollPlacements.length===1?'':'s'}`:'No B-roll placed'}</b><p>{project.brollPlacements.length?'Placed visuals appear over the source during preview.':'Scrub to a moment and add a visual at the playhead.'}</p><button onClick={()=>setTab('broll')}>Place B-roll</button></div></div>
          <div className="suggestion"><span className="suggest-icon"><Icon name="mic"/></span><div><b>{project.transcript.length} transcript segments</b><p>{project.transcript.length?'Edit the wording and timestamps or import a matching SRT.':'Import SRT or paste the spoken transcript.'}</p><button onClick={()=>setTab('transcript')}>Edit transcript</button></div></div>
        </section>
        <section className="panel cut-summary"><div className="panel-label"><span>CUT SUMMARY</span></div><div><span>Source</span><b>{formatPrecise(duration)}</b></div><div><span>Removed</span><b>{formatPrecise(removedDuration)}</b></div><div><span>Current</span><b>{formatPrecise(roughDuration)}</b></div><div><span>B-roll placements</span><b>{project.brollPlacements.length}</b></div><div><span>Caption cards</span><b className="ready">{included.length}</b></div></section>
        <section className="panel shortcut-panel"><div className="panel-label"><span>KEYBOARD</span></div><div><kbd>Space</kbd><span>Play / pause</span></div><div><kbd>← →</kbd><span>Move 1 second</span></div><div><kbd>I</kbd><span>Mark In</span></div><div><kbd>O</kbd><span>Mark Out</span></div></section>
      </aside>
    </div>
    {toast&&<div className="editor-toast">{toast}</div>}
    <StageFooter note="Next: package the cut, captions and notes for DaVinci Resolve." onNext={onNext} label="Prepare the finish" />
  </>
}

function FinishStage({ project, notify, onNext }: { project:Project; notify:(s:string)=>void; onNext:()=>void }) {
  const [exporting,setExporting]=useState(false)
  const exportPackage=async()=>{setExporting(true);await createResolveZip(project);setExporting(false);notify('Resolve handoff package downloaded')}
  return <>
    <StageHeader index="06" eyebrow="FINISH" title="Move cleanly into Resolve." copy="One organised handoff with the story, cut decisions and finishing notes intact."/>
    <div className="handoff-hero">
      <div className="resolve-orbit"><span className="resolve-logo">R</span><i/><i/><i/></div>
      <div><span className="eyebrow">DAVINCI RESOLVE HANDOFF</span><h2>Your rough cut is organised.</h2><p>Export a non-destructive production package. Original media stays untouched and every decision remains traceable.</p><button className="primary large" onClick={exportPackage} disabled={exporting}><Icon name="download"/>{exporting?'Building package…':'Download Resolve package'}</button></div>
    </div>
    <div className="package-grid">
      {[['Resolve timeline','FCPXML, EDL and JSON manifest for the layered rough cut','check'],['Clean script','Plain-text script ready for IntelliScript or reference','file'],['Captions','SRT captions generated from the current rough cut','check'],['Timeline markers','CSV marker list for B-roll and finishing notes','layers'],['Media relink report','Original and proxy names with timeline usage','folder'],['Project brief','Title, premise, audience and intended outcome','brief']].map(([title,copy,icon])=><div className="package-item" key={title}><span><Icon name={icon as IconName}/></span><div><b>{title}</b><small>{copy}</small></div><Icon name="check" size={16}/></div>)}
    </div>
    <div className="integration-note"><div><span className="beta">NEXT PHASE</span><h3>Direct Resolve bridge</h3><p>A small local companion can create the project, bins and markers automatically. The export package remains the reliable fallback.</p></div><button className="secondary" disabled>Bridge not installed</button></div>
    <StageFooter note="Next: prepare the title, description and thumbnail direction." onNext={onNext} label="Package for YouTube" />
  </>
}

function PublishStage({ project, setProject, notify }: { project:Project; setProject:React.Dispatch<React.SetStateAction<Project>>; notify:(s:string)=>void }) {
  const [tab,setTab]=useState<'package'|'discovery'|'thumbnail'>('package')
  const [keywordDraft,setKeywordDraft]=useState('')
  const thumbnailInput=useRef<HTMLInputElement>(null)
  const update=<K extends keyof Project['publish']>(key:K,value:Project['publish'][K])=>setProject(p=>({...p,publish:{...p.publish,[key]:value}}))
  const copy=async(text:string)=>{await navigator.clipboard?.writeText(text);notify('Copied to clipboard')}
  const generate=()=>{
    const alternatives=[
      `The Real Reason We Built ${project.title.replace(/^Why we built/i,'').trim()}`,
      'The Invoice Was Never the Real Product',
      'Why Separate Business Tools Kept Failing Us',
      'We Built One System for Orders, Production and Money',
      'What Building Our Own Invoice System Taught Us',
    ]
    update('alternativeTitles',alternatives)
    update('keywords',Array.from(new Set([...project.publish.keywords,'creative business','workflow automation','South African business'])))
    notify('Growth alternatives generated from this story')
  }
  const addKeyword=()=>{const value=keywordDraft.trim();if(!value||project.publish.keywords.includes(value))return;update('keywords',[...project.publish.keywords,value]);setKeywordDraft('')}
  const chooseThumbnail=(file?:File)=>{if(!file)return;const url=URL.createObjectURL(file);setProject(p=>({...p,publish:{...p.publish,thumbnailUrl:url,thumbnailName:file.name},resources:[...p.resources.filter(r=>!(r.role==='Thumbnail'&&r.name===file.name)),{id:makeId(),name:file.name,mime:file.type||'image/png',category:'Images',size:file.size,addedAt:new Date().toISOString(),url,tags:inferTags(file.name),role:'Thumbnail'}]}));notify('Thumbnail linked and ready to preview')}
  const titleScore=Math.min(96,58+(project.publish.title.length>=35&&project.publish.title.length<=65?18:8)+(project.publish.title.toLowerCase().includes('invoice')?12:5))
  return <>
    <StageHeader index="07" eyebrow="YOUTUBE GROWTH" title="Package for attention." copy="Turn the finished story into a strong title, useful description, discoverable topic and thumbnail system—without cheapening it." action={<button className="ai-button" onClick={generate}><Icon name="spark"/> Generate growth ideas</button>}/>
    <div className="growth-pulse">
      <div><span className="growth-score">{titleScore}</span><span><b>Title strength</b><small>Clear subject and believable curiosity</small></span></div>
      <div><span className="growth-score">88</span><span><b>Viewer promise</b><small>A real build with a useful lesson</small></span></div>
      <div><span className="growth-score">{project.publish.keywords.length}</span><span><b>Search themes</b><small>Focused around systems and operations</small></span></div>
      <div><span className="growth-score">3</span><span><b>Thumbnail routes</b><small>Test contrast before adding detail</small></span></div>
    </div>
    <div className="growth-tabs"><button className={tab==='package'?'active':''} onClick={()=>setTab('package')}>Title & package</button><button className={tab==='discovery'?'active':''} onClick={()=>setTab('discovery')}>Description & discovery</button><button className={tab==='thumbnail'?'active':''} onClick={()=>setTab('thumbnail')}>Thumbnail lab</button></div>
    {tab==='package'&&<div className="publish-grid">
      <section className="panel publish-form">
        <label><span>PRIMARY YOUTUBE TITLE <small>{project.publish.title.length}/100</small></span><div className="copy-field"><input value={project.publish.title} onChange={e=>update('title',e.target.value)}/><button onClick={()=>copy(project.publish.title)}><Icon name="copy"/></button></div></label>
        <div className="title-alternatives"><div><span>TITLE ALTERNATIVES</span><small>Click one to make it primary.</small></div>{project.publish.alternativeTitles.map((title,index)=><button key={`${title}-${index}`} onClick={()=>update('title',title)}><span>0{index+1}</span><b>{title}</b><small>{title.length} characters</small><Icon name="arrow"/></button>)}</div>
        <div className="chapters"><span>CHAPTERS</span>{['00:00  Why another invoice app?','00:38  Where the handoff broke','02:10  Building it inside OPPS','04:22  The deeper lesson','05:31  Visibility is the product'].map(x=><div key={x}><span>{x.slice(0,5)}</span><input defaultValue={x.slice(7)}/></div>)}</div>
      </section>
      <aside className="publish-aside">
        <div className="thumbnail-card"><div className={project.publish.thumbnailUrl?'thumbnail-preview uploaded':'thumbnail-preview'} style={project.publish.thumbnailUrl?{backgroundImage:`linear-gradient(90deg,rgba(10,11,9,.76),rgba(10,11,9,.12)),url(${project.publish.thumbnailUrl})`}:undefined}><span>{project.publish.thumbnailText}</span><small>JOINT X · {project.series.toUpperCase()}</small></div><div><span>CURRENT THUMBNAIL ROUTE</span><p>{project.publish.thumbnailName?`Uploaded: ${project.publish.thumbnailName}`:project.publish.thumbnailBrief}</p><button className="secondary" onClick={()=>setTab('thumbnail')}><Icon name="edit"/> Open thumbnail lab</button></div></div>
        <section className="panel package-diagnostics"><div className="panel-label"><span>PACKAGE CHECK</span><small>Built for trust + curiosity</small></div><div><Icon name="check"/><span><b>Specific subject</b><small>The invoice system is concrete.</small></span></div><div><Icon name="check"/><span><b>Open loop</b><small>Why build instead of buy?</small></span></div><div><Icon name="check"/><span><b>Proof available</b><small>You can demonstrate OPPS on screen.</small></span></div></section>
      </aside>
    </div>}
    {tab==='discovery'&&<div className="discovery-grid">
      <section className="panel publish-form">
        <label><span>YOUTUBE DESCRIPTION</span><div className="copy-field area"><textarea value={project.publish.description} onChange={e=>update('description',e.target.value)}/><button onClick={()=>copy(project.publish.description)}><Icon name="copy"/></button></div></label>
        <label><span>SEARCH INTENT</span><textarea className="standalone-area" value={project.publish.searchIntent} onChange={e=>update('searchIntent',e.target.value)}/></label>
        <label><span>PINNED COMMENT</span><div className="copy-field"><input value={project.publish.pinnedComment} onChange={e=>update('pinnedComment',e.target.value)}/><button onClick={()=>copy(project.publish.pinnedComment)}><Icon name="copy"/></button></div></label>
      </section>
      <aside className="panel keyword-panel"><div className="panel-label"><span>KEYWORDS & TOPIC CLUSTERS</span><small>Use natural themes, not keyword stuffing.</small></div><div className="keyword-input"><input value={keywordDraft} onChange={e=>setKeywordDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addKeyword()}}} placeholder="Add a keyword"/><button onClick={addKeyword}><Icon name="plus"/></button></div><div className="keyword-chips">{project.publish.keywords.map(keyword=><span key={keyword}>{keyword}<button onClick={()=>update('keywords',project.publish.keywords.filter(k=>k!==keyword))}><Icon name="x" size={11}/></button></span>)}</div><div className="topic-note"><Icon name="search"/><p><b>Primary discovery theme</b><br/>Small-business operations systems, supported by build-in-public and invoicing workflow terms.</p></div></aside>
    </div>}
    {tab==='thumbnail'&&<div className="thumbnail-lab">
      <section className="panel thumbnail-controls"><div className="thumbnail-upload"><div className={project.publish.thumbnailUrl?'thumb-upload-preview has-image':'thumb-upload-preview'} style={project.publish.thumbnailUrl?{backgroundImage:`url(${project.publish.thumbnailUrl})`}:undefined}>{!project.publish.thumbnailUrl&&<><Icon name="camera" size={25}/><span>No thumbnail uploaded</span></>}</div><div><span>THUMBNAIL FILE</span><b>{project.publish.thumbnailName||'Bring in a JPG, PNG or WebP'}</b><small>The image stays local and previews immediately.</small><button className="secondary" onClick={()=>thumbnailInput.current?.click()}><Icon name="upload"/> {project.publish.thumbnailUrl?'Replace thumbnail':'Upload thumbnail'}</button>{project.publish.thumbnailUrl&&<button className="text-button danger" onClick={()=>setProject(p=>({...p,publish:{...p.publish,thumbnailUrl:undefined,thumbnailName:undefined}}))}>Remove</button>}</div></div><input ref={thumbnailInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{chooseThumbnail(e.target.files?.[0]);e.target.value=''}}/><label><span>THUMBNAIL TEXT</span><input value={project.publish.thumbnailText} onChange={e=>update('thumbnailText',e.target.value.toUpperCase())} maxLength={36}/><small>{project.publish.thumbnailText.length}/36 · shorter is usually stronger</small></label><label><span>VISUAL DIRECTION</span><textarea value={project.publish.thumbnailBrief} onChange={e=>update('thumbnailBrief',e.target.value)}/></label><div className="thumb-rules"><span><Icon name="check"/> One idea</span><span><Icon name="check"/> Readable small</span><span><Icon name="check"/> Different job from title</span></div></section>
      <div className="thumbnail-routes">{[
        {name:'The contradiction',text:project.publish.thumbnailText,cls:'route-one',note:'The thumbnail challenges what viewers assume.'},
        {name:'The system',text:'ORDERS. MONEY. ONE SYSTEM.',cls:'route-two',note:'Emphasise the operating-system transformation.'},
        {name:'The founder question',text:'WHY BUILD THIS?',cls:'route-three',note:'Use your expression and the OPPS interface as proof.'},
      ].map(route=><button key={route.name} className="thumbnail-route" onClick={()=>update('thumbnailText',route.text)}><div className={route.cls}><span>{route.text}</span><small>JOINT X</small></div><b>{route.name}</b><p>{route.note}</p><span className="use-route">Use this route <Icon name="arrow" size={14}/></span></button>)}</div>
    </div>}
    <div className="publish-complete"><span><b>Packaging remains editable.</b><small>Test the title and thumbnail together—their jobs should complement, not repeat, each other.</small></span><button className="primary" onClick={()=>notify('Project marked ready for YouTube')}><Icon name="check"/> Mark ready for YouTube</button></div>
  </>
}

function FilesStage({project,setProject,notify}:{project:Project;setProject:React.Dispatch<React.SetStateAction<Project>>;notify:(s:string)=>void}){
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('All'),[role,setRole]=useState('All'),[preview,setPreview]=useState<ResourceAsset|null>(null),[menuId,setMenuId]=useState<string|null>(null),[relinkId,setRelinkId]=useState<string|null>(null)
  const addInput=useRef<HTMLInputElement>(null),relinkInput=useRef<HTMLInputElement>(null)
  const visible=project.resources.filter(file=>(filter==='All'||file.category===filter)&&(role==='All'||file.role===role)&&`${file.name} ${file.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  const updateAsset=(id:string,update:Partial<ResourceAsset>)=>setProject(p=>({...p,resources:p.resources.map(r=>r.id===id?{...r,...update}:r)}))
  const addAssetToEdit=(file:ResourceAsset)=>{const start=Math.max(0,...project.timelineClips.map(clip=>clip.timelineStart+clip.duration)),duration=file.duration||5,type=file.category==='Audio'?'audio':file.category==='Images'?'image':'video',trackId=type==='audio'?'a1':file.role==='B-roll'?'v2':'v1';const clip:TimelineClip={id:makeId(),trackId,type,assetId:file.id,name:file.name,timelineStart:start,sourceIn:0,sourceOut:duration,duration,opacity:1,volume:1,fit:'Cover',scale:1,rotation:0,positionX:0,positionY:0,flipX:false,flipY:false,blendMode:'Normal'};setProject(p=>({...p,timelineClips:[...p.timelineClips,clip]}));notify(`${file.name} added to edit`)}
  const removeAsset=(file:ResourceAsset)=>{void deleteMedia(file.storageKey||'').catch(()=>{});setProject(p=>({...p,resources:p.resources.filter(r=>r.id!==file.id),takes:p.takes.filter(t=>t.assetId!==file.id),timelineClips:p.timelineClips.filter(clip=>clip.assetId!==file.id)}))}
  const openAsset=(file:ResourceAsset)=>file.url?setPreview(file):beginRelink(file.id)
  const beginRelink=(id:string)=>{setRelinkId(id);relinkInput.current?.click()}
  const relink=(file?:File)=>{if(!file||!relinkId)return;updateAsset(relinkId,{name:file.name,mime:file.type||'application/octet-stream',category:resourceCategory(file),size:file.size,url:URL.createObjectURL(file),tags:inferTags(file.name),role:inferRole(file.name,resourceCategory(file))});setRelinkId(null);notify('Local file relinked for this browser session')}
  const duplicates=project.resources.filter((file,index,list)=>list.findIndex(x=>x.name===file.name&&x.size===file.size)!==index).length
  const missing=project.resources.filter(file=>!file.url).length
  const unassigned=project.resources.filter(file=>file.role==='Unassigned').length
  return <>
    <StageHeader index="FILES" eyebrow="MEDIA LIBRARY" title="Know what you have." copy="Preview local footage, organise it by production role and find the best material without duplicating your originals." action={<button className="primary" onClick={()=>addInput.current?.click()}><Icon name="plus"/> Add local media</button>}/>
    <div className="file-intelligence">
      <button onClick={()=>{setFilter('All');setRole('All')}}><span>{project.resources.length}</span><b>All references</b><small>Across this project</small></button>
      <button onClick={()=>setRole('B-roll')}><span>{project.resources.filter(r=>r.role==='B-roll').length}</span><b>B-roll collection</b><small>Ready for the edit</small></button>
      <button onClick={()=>{setFilter('All');setRole('All');setSearch('')}}><span>{missing}</span><b>Needs relinking</b><small>Choose the original again</small></button>
      <button onClick={()=>setRole('Unassigned')}><span>{unassigned}</span><b>Needs a role</b><small>Organisation suggestion</small></button>
    </div>
    <div className="files-layout">
      <section className="panel files-browser">
        <div className="files-toolbar"><div className="resource-search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search names, tags and topics"/></div><div className="resource-types">{['All','Video','Images','Audio','Documents'].map(x=><button className={filter===x?'active':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div></div>
        <div className="files-subbar"><span><b>{visible.length}</b> items</span><div>{['All','A-roll','B-roll','Thumbnail','Audio','Document','Unassigned'].map(x=><button key={x} className={role===x?'active':''} onClick={()=>setRole(x)}>{x}</button>)}</div></div>
        <div className="media-grid">{visible.map(file=><article className="media-card" key={file.id}>
          <button className="media-thumb" onClick={()=>openAsset(file)} aria-label={`Preview ${file.name}`}>
            {file.category==='Video'&&file.url?<video src={file.url} muted loop preload="metadata" onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}}/>:file.category==='Images'&&file.url?<img src={file.url} alt=""/>:<span className="media-placeholder"><Icon name={file.category==='Video'?'video':file.category==='Images'?'eye':file.category==='Audio'?'mic':'file'} size={29}/><small>{file.url?'Open preview':'Relink to preview'}</small></span>}
            {file.category==='Video'&&file.url&&<span className="hover-play"><Icon name="play"/> Hover preview</span>}
          </button>
          <div className="media-info"><div><span className={`role-badge role-${file.role.toLowerCase().replaceAll(' ','-')}`}>{file.role}</span><b title={file.name}>{file.name}</b><small>{file.category} · {formatBytes(file.size)} · {file.persistence==='durable'?'Durable on device':file.recorded?'Save to device':'Local reference'}</small></div><span className="menu-wrap"><button onClick={()=>setMenuId(menuId===file.id?null:file.id)} aria-label={`More options for ${file.name}`}><Icon name="more"/></button>{menuId===file.id&&<ActionMenu align="up" items={[{label:'Preview / relink',icon:'eye',action:()=>openAsset(file)},{label:'Add to edit',icon:'plus',action:()=>addAssetToEdit(file),disabled:!['Video','Images','Audio'].includes(file.category)},{label:'Use as B-roll',icon:'video',action:()=>updateAsset(file.id,{role:'B-roll'})},{label:'Use as thumbnail',icon:'camera',action:()=>updateAsset(file.id,{role:'Thumbnail'})},{label:'Delete file',icon:'trash',danger:true,action:()=>removeAsset(file)}]} onClose={()=>setMenuId(null)}/>}</span></div>
          <div className="media-tags">{file.tags.slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</div>
        </article>)}</div>
        {!visible.length&&<div className="files-empty"><Icon name="folder" size={30}/><h3>No files in this view.</h3><p>Add local media or clear the current filters.</p><button className="secondary" onClick={()=>addInput.current?.click()}>Choose files</button></div>}
      </section>
      <aside className="panel intelligence-panel"><div className="panel-label"><span>ORGANISATION INTELLIGENCE</span><small>Useful signals, never hidden changes.</small></div>
        <div className="intelligence-score"><span>{Math.max(0,100-missing*8-unassigned*5-duplicates*10)}</span><div><b>Library health</b><small>Based on relinks, roles and duplicates</small></div></div>
        <div className="intelligence-item"><Icon name="link"/><span><b>{missing} files need relinking</b><small>Browsers do not retain permanent access to files on your computer. Relink once per new session.</small></span></div>
        <div className="intelligence-item"><Icon name="layers"/><span><b>{project.resources.filter(r=>r.role==='B-roll').length} B-roll candidates</b><small>Video and screen material grouped for the rough cut.</small></span></div>
        <div className="intelligence-item"><Icon name="copy"/><span><b>{duplicates} possible duplicates</b><small>Matched by file name and size.</small></span></div>
        <div className="local-note"><Icon name="folder"/><p><b>Your originals stay local.</b><br/>Preview URLs live only in this browser session; Content Studio stores lightweight organisation metadata.</p></div>
      </aside>
    </div>
    <input ref={addInput} className="visually-hidden" type="file" multiple accept="video/*,image/*,audio/*,.pdf,.doc,.docx,.txt" onChange={e=>{if(e.target.files)addResourceFiles(e.target.files,setProject,notify);e.target.value=''}}/>
    <input ref={relinkInput} className="visually-hidden" type="file" onChange={e=>{relink(e.target.files?.[0]);e.target.value=''}}/>
    {preview&&<ResourcePreview file={preview} onClose={()=>setPreview(null)}/>} 
  </>
}

function ResourcePreview({file,onClose}:{file:ResourceAsset;onClose:()=>void}){
  return <div className="preview-layer" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="preview-modal"><header><span><b>{file.name}</b><small>{file.role} · {formatBytes(file.size)}</small></span><button className="icon-button dark" onClick={onClose}><Icon name="x"/></button></header><div className="preview-canvas">{file.category==='Video'?<video src={file.url} controls autoPlay/>:file.category==='Images'?<img src={file.url} alt={file.name}/>:file.category==='Audio'?<div className="audio-preview"><Icon name="mic" size={42}/><audio src={file.url} controls autoPlay/></div>:file.mime.includes('pdf')?<iframe src={file.url} title={file.name}/>:<div className="document-preview"><Icon name="file" size={48}/><b>Preview is not available for this document type.</b><small>It remains linked in the project library.</small></div>}</div></div></div>
}

function ResourcesDrawer({ project, setProject, onClose, notify }: { project:Project; setProject:React.Dispatch<React.SetStateAction<Project>>; onClose:()=>void; notify:(s:string)=>void }) {
  const [search,setSearch]=useState(''), [filter,setFilter]=useState('All'), [menuId,setMenuId]=useState<string|null>(null)
  const [preview,setPreview]=useState<ResourceAsset|null>(null)
  const input=useRef<HTMLInputElement>(null)
  const visible=project.resources.filter(file=>(filter==='All'||file.category===filter)&&file.name.toLowerCase().includes(search.toLowerCase()))
  const remove=(id:string)=>setProject(p=>({...p,resources:p.resources.filter(r=>r.id!==id)}))
  return <div className="drawer-layer" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="resources-drawer"><div className="drawer-head"><div><span className="eyebrow">PROJECT LIBRARY</span><h2>Resources</h2></div><button onClick={onClose}><Icon name="x"/></button></div><div className="resource-search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search this project"/></div><div className="resource-types">{['All','Video','Images','Audio','Documents'].map(x=><button className={filter===x?'active':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><div className="resource-list">{visible.map(file=><div key={file.id} className="drawer-file" onDoubleClick={()=>file.url&&setPreview(file)}><span className="file-type">{file.category==='Images'&&file.url?<img src={file.url} alt=""/>:<Icon name={file.category==='Video'?'video':file.category==='Images'?'eye':file.category==='Audio'?'mic':'file'}/>}</span><div><b>{file.name}</b><small>{file.role} · {formatBytes(file.size)} · {file.url?'Ready to preview':'Relink in Files'}</small></div><span className="menu-wrap"><button aria-label={`More options for ${file.name}`} onClick={()=>setMenuId(menuId===file.id?null:file.id)}><Icon name="more"/></button>{menuId===file.id&&<ActionMenu items={[{label:file.url?'Open preview':'Relink in Files tab',icon:'eye',action:()=>file.url?setPreview(file):notify('Open the Files tab to relink this original')},{label:'Copy file name',icon:'copy',action:()=>{navigator.clipboard?.writeText(file.name);notify('File name copied')}},{label:'Remove reference',icon:'trash',danger:true,action:()=>remove(file.id)}]} onClose={()=>setMenuId(null)}/>}</span></div>)}</div>{!visible.length&&<div className="resource-empty"><Icon name="folder"/><b>No matching resources</b><small>Add files or change the current filter.</small></div>}<button className="drawer-upload" onClick={()=>input.current?.click()}><Icon name="upload"/> Add files</button><input ref={input} className="visually-hidden" type="file" multiple accept="video/*,image/*,audio/*,.pdf,.doc,.docx,.txt" onChange={e=>{if(e.target.files)addResourceFiles(e.target.files,setProject,notify);e.target.value=''}}/><div className="local-note"><Icon name="folder"/><p><b>Large media stays local.</b><br/>The studio records file names and metadata without duplicating the original media.</p></div></aside>{preview&&<ResourcePreview file={preview} onClose={()=>setPreview(null)}/>}</div>
}

type ActionItem={label:string;icon:IconName;action:()=>void;danger?:boolean;disabled?:boolean}
function ActionMenu({items,onClose,align='down'}:{items:ActionItem[];onClose:()=>void;align?:'down'|'up'}) {
  return <div className={`action-menu ${align==='up'?'menu-up':''}`}>{items.map(item=><button key={item.label} className={item.danger?'danger':''} disabled={item.disabled} onClick={()=>{item.action();onClose()}}><Icon name={item.icon} size={14}/>{item.label}</button>)}</div>
}

function StageFooter({ note, onNext, label }: { note:string; onNext:()=>void; label:string }) {
  return <div className="stage-footer"><span>{note}</span><button className="primary" onClick={onNext}>{label}<Icon name="arrow"/></button></div>
}

function formatTime(seconds:number){const m=Math.floor(seconds/60),s=seconds%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function formatPrecise(seconds:number){if(!Number.isFinite(seconds)||seconds<0)return'00:00.0';const m=Math.floor(seconds/60),s=seconds-m*60;return`${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`}
function formatTimecode(seconds:number,fps=EDIT_FPS){const frames=Math.max(0,Math.round(seconds*fps)),f=frames%fps,total=Math.floor(frames/fps),s=total%60,m=Math.floor(total/60)%60,h=Math.floor(total/3600);return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`}
function waveformPattern(seed:string,count=48){let value=Array.from(seed).reduce((sum,char)=>((sum*31+char.charCodeAt(0))>>>0),2166136261);return Array.from({length:count},(_,index)=>{value=(value*1664525+1013904223+index)>>>0;return .12+(value%880)/1000})}

function mergeTimeRanges(cuts:EditCut[]){
  const sorted=cuts.map(cut=>({...cut,start:Math.max(0,Math.min(cut.start,cut.end)),end:Math.max(cut.start,cut.end)})).filter(cut=>cut.end>cut.start).sort((a,b)=>a.start-b.start)
  return sorted.reduce<EditCut[]>((merged,cut)=>{const last=merged.at(-1);if(last&&cut.start<=last.end){last.end=Math.max(last.end,cut.end);last.label=`${last.label}; ${cut.label}`;return merged}merged.push(cut);return merged},[])
}

function textToTimedTranscript(text:string,duration:number):TranscriptLine[]{
  const paragraphs=text.split(/\n+/).map(line=>line.trim()).filter(Boolean)
  const parts=(paragraphs.length>1?paragraphs:text.split(/(?<=[.!?])\s+/)).map(line=>line.trim()).filter(Boolean)
  const totalWords=parts.reduce((sum,line)=>sum+line.split(/\s+/).length,0)||1
  let cursor=0
  return parts.map((line,index)=>{const share=line.split(/\s+/).length/totalWords,end=index===parts.length-1?duration:Math.min(duration,cursor+duration*share),item={id:makeId(),speaker:'Speaker',text:line,start:cursor,end,included:true};cursor=end;return item})
}

function parseSrt(content:string):TranscriptLine[]{
  return content.replaceAll('\r','').trim().split(/\n{2,}/).flatMap(block=>{const lines=block.split('\n'),timeIndex=lines.findIndex(line=>line.includes('-->'));if(timeIndex<0)return[];const match=lines[timeIndex].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);if(!match)return[];const toSeconds=(offset:number)=>Number(match[offset])*3600+Number(match[offset+1])*60+Number(match[offset+2])+Number(match[offset+3])/1000;return[{id:makeId(),speaker:'Speaker',text:lines.slice(timeIndex+1).join(' ').trim(),start:toSeconds(1),end:toSeconds(5),included:true}]})
}

function formatBytes(bytes:number){if(bytes<1024)return `${bytes} B`;if(bytes<1024**2)return `${(bytes/1024).toFixed(1)} KB`;if(bytes<1024**3)return `${(bytes/1024**2).toFixed(1)} MB`;return `${(bytes/1024**3).toFixed(1)} GB`}

function resourceCategory(file:File):ResourceAsset['category']{
  if(file.type.startsWith('video/'))return 'Video'
  if(file.type.startsWith('image/'))return 'Images'
  if(file.type.startsWith('audio/'))return 'Audio'
  if(file.type.includes('pdf')||file.type.includes('document')||/\.(pdf|docx?|txt)$/i.test(file.name))return 'Documents'
  return 'Other'
}

function inferTags(name:string){return Array.from(new Set(name.replace(/\.[^.]+$/,'').toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>2))).slice(0,5)}
function inferRole(name:string,category:ResourceAsset['category']):ResourceAsset['role']{
  const lower=name.toLowerCase()
  if(category==='Video'&&/(interview|talking|camera|a[-_ ]?roll)/.test(lower))return 'A-roll'
  if(category==='Video')return 'B-roll'
  if(category==='Audio')return 'Audio'
  if(category==='Documents')return 'Document'
  if(category==='Images'&&/(thumb|cover|title|poster)/.test(lower))return 'Thumbnail'
  return 'Unassigned'
}

function addResourceFiles(files:FileList|File[],setProject:React.Dispatch<React.SetStateAction<Project>>,notify:(s:string)=>void){
  const incoming=Array.from(files)
  if(!incoming.length)return
  const assets:ResourceAsset[]=incoming.map(file=>{const category=resourceCategory(file),id=makeId();return{id,name:file.name,mime:file.type||'application/octet-stream',category,size:file.size,addedAt:new Date().toISOString(),url:URL.createObjectURL(file),tags:inferTags(file.name),role:inferRole(file.name,category),storageKey:id,persistence:'saving'}})
  setProject(p=>({...p,resources:[...p.resources,...assets.filter(asset=>!p.resources.some(existing=>existing.name===asset.name&&existing.size===asset.size))]}))
  assets.forEach((asset,index)=>{
    const file=incoming[index]
    void persistMedia({id:asset.id,blob:file,name:asset.name,mime:asset.mime,projectId:'project-media',createdAt:asset.addedAt}).then(()=>setProject(p=>({...p,resources:p.resources.map(item=>item.id===asset.id?{...item,persistence:'durable'}:item)}))).catch(()=>setProject(p=>({...p,resources:p.resources.map(item=>item.id===asset.id?{...item,persistence:'failed'}:item)})))
    if(!asset.url||(asset.category!=='Video'&&asset.category!=='Audio'))return
    const media=document.createElement(asset.category==='Video'?'video':'audio')
    media.preload='metadata';media.src=asset.url||''
    media.onloadedmetadata=()=>{
      const duration=Number.isFinite(media.duration)?media.duration:undefined
      if(duration)setProject(p=>({...p,resources:p.resources.map(item=>item.id===asset.id?{...item,duration}:item)}))
      if(asset.category==='Video'&&media instanceof HTMLVideoElement){
        const video=media
        video.muted=true;video.playsInline=true;video.currentTime=Math.min(Math.max(.05,Math.min(1,(duration||1)*.01)),Math.max(.05,(duration||1)-.05))
        video.onseeked=()=>{try{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const context=canvas.getContext('2d');if(!context)return;const scale=Math.min(canvas.width/video.videoWidth,canvas.height/video.videoHeight),width=video.videoWidth*scale,height=video.videoHeight*scale;context.fillStyle='#11120f';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(video,(canvas.width-width)/2,(canvas.height-height)/2,width,height);const posterUrl=canvas.toDataURL('image/jpeg',.62);setProject(p=>({...p,resources:p.resources.map(item=>item.id===asset.id?{...item,posterUrl}:item)}))}catch{/* A poster is an enhancement; playback still works without it. */}}
      }
    }
    if(asset.category==='Audio'&&file.size<120*1024*1024){
      const AudioContextClass=window.AudioContext
      if(AudioContextClass){const context=new AudioContextClass();file.arrayBuffer().then(buffer=>context.decodeAudioData(buffer)).then(decoded=>{const data=decoded.getChannelData(0),bars=72,block=Math.max(1,Math.floor(data.length/bars)),waveform=Array.from({length:bars},(_,bar)=>{let peak=0;for(let i=bar*block;i<Math.min(data.length,(bar+1)*block);i+=Math.max(1,Math.floor(block/140)))peak=Math.max(peak,Math.abs(data[i]||0));return Number(Math.max(.06,peak).toFixed(3))});setProject(p=>({...p,resources:p.resources.map(item=>item.id===asset.id?{...item,waveform}:item)}))}).catch(()=>{}).finally(()=>context.close().catch(()=>{}))}
    }
  })
  notify(`${incoming.length} file${incoming.length===1?'':'s'} added to this project`)
}

function downloadText(name:string,content:string){const blob=new Blob([content],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function openSecondScreen(blocks:ScriptBlock[],start=0,mode:Project['mode']='Full script'){
  const data=btoa(unescape(encodeURIComponent(JSON.stringify(blocks))))
  window.open(`${location.pathname}?prompter=1&start=${start}&mode=${encodeURIComponent(mode)}&data=${encodeURIComponent(data)}`,'x1-prompter','width=1280,height=800')
}

async function createResolveZip(project:Project){
  const zip=new JSZip(), safe=project.title.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')
  const script=project.blocks.map(b=>`${b.label.toUpperCase()}\n${b.text}`).join('\n\n')
  const included=project.transcript.filter(t=>t.included)
  const srt=included.map((t,i)=>`${i+1}\n${srtTime(t.start)} --> ${srtTime(t.end)}\n${t.text}\n`).join('\n')
  const shots=['Shot,Section,Type,Visual,Purpose,Framing,Movement,Priority,Duration,Source,Status,Notes',...project.shots.map(s=>[s.shotNumber||'',s.section,s.shotType||'',s.description,s.purpose||'',s.framing||'',s.movement||'',s.priority||'',String(s.duration||''),project.resources.find(asset=>asset.id===s.assetId)?.name||s.source,s.status,s.notes||''].map(csvEscape).join(','))].join('\n')
  const timelineMarkers=['Name,Time Seconds,Timecode,Colour,Shot',...[...project.timelineMarkers].sort((a,b)=>a.time-b.time).map(marker=>[marker.label,marker.time.toFixed(3),edlTime(marker.time),marker.color,project.shots.find(shot=>shot.id===marker.shotId)?.shotNumber||''].map(csvEscape).join(','))].join('\n')
  const brollMarkers=['Asset,Start,End,Fit,Opacity',...project.brollPlacements.map(item=>[project.resources.find(r=>r.id===item.assetId)?.name||item.assetId,item.start.toFixed(3),item.end.toFixed(3),item.fit,String(item.opacity)].map(csvEscape).join(','))].join('\n')
  const sequenceDuration=Math.max(0,...project.timelineClips.map(clip=>clip.timelineStart+clip.duration))
  const relink=['Asset ID,File name,Proxy file,Type,Role,Duration,Timeline uses,Status',...project.resources.map(asset=>[asset.id,asset.name,asset.proxyName||'',asset.category,asset.role,String(asset.duration||''),String(project.timelineClips.filter(clip=>clip.assetId===asset.id).length),asset.url?'Linked in export session':'Relink original in Resolve'].map(csvEscape).join(','))].join('\n')
  zip.file('00_READ_ME.txt',`X1 CONTENT STUDIO — DAVINCI RESOLVE HANDOFF\n\nProject: ${project.title}\nSeries: ${project.series}\nSequence: ${formatTimecode(sequenceDuration)} at ${EDIT_FPS} fps\n\nFASTEST HANDOFF\n1. Create or open a Resolve project and import your original media.\n2. Use 04_Resolve_Import/media-relink.csv to confirm original and proxy file names.\n3. Import rough-cut.fcpxml into Resolve and relink by file name.\n4. If FCPXML is not suitable for the current Resolve version, import rough-cut.edl for the V1 assembly.\n5. Import captions.srt as subtitles and use timeline-markers.csv for finishing notes.\n\nFCPXML carries the timed layered media assembly. The EDL is a dependable V1 fallback. Titles, groups, A/V links, every track decision and shot relationship also remain described in sequence-manifest.json. Original media has not been modified.`)
  zip.file('01_Project/project-summary.json',JSON.stringify({title:project.title,series:project.series,format:project.format,premise:project.premise,viewer:project.viewer,outcome:project.outcome,targetMinutes:project.targetMinutes},null,2))
  zip.file('02_Scripts/clean-script.txt',script)
  zip.file('03_Captions/captions.srt',srt)
  zip.file('04_Resolve_Import/sequence-manifest.json',JSON.stringify({version:7,fps:EDIT_FPS,duration:sequenceDuration,editorSettings:project.editorSettings,tracks:project.timelineTracks,clips:project.timelineClips.map(clip=>({...clip,assetName:project.resources.find(asset=>asset.id===clip.assetId)?.name,proxyName:project.resources.find(asset=>asset.id===clip.assetId)?.proxyName,trackName:project.timelineTracks.find(track=>track.id===clip.trackId)?.label})),markers:project.timelineMarkers,legacyCuts:project.editCuts,legacyBroll:project.brollPlacements,transcript:project.transcript.map(t=>({sourceIn:t.start,sourceOut:t.end,included:t.included,text:t.text}))},null,2))
  zip.file('04_Resolve_Import/rough-cut.fcpxml',createFcpxml(project))
  zip.file('04_Resolve_Import/rough-cut.edl',createEdl(project))
  zip.file('04_Resolve_Import/timeline-markers.csv',timelineMarkers)
  zip.file('04_Resolve_Import/broll-placements.csv',brollMarkers)
  zip.file('04_Resolve_Import/media-relink.csv',relink)
  zip.file('05_Media_Report/shot-list.csv',shots)
  zip.file('05_Media_Report/media-relink.csv',relink)
  zip.file('06_Publishing/youtube-package.txt',`TITLE\n${project.publish.title}\n\nALTERNATIVE TITLES\n${project.publish.alternativeTitles.join('\n')}\n\nDESCRIPTION\n${project.publish.description}\n\nKEYWORDS\n${project.publish.keywords.join(', ')}\n\nSEARCH INTENT\n${project.publish.searchIntent}\n\nTHUMBNAIL TEXT\n${project.publish.thumbnailText}\n\nTHUMBNAIL BRIEF\n${project.publish.thumbnailBrief}\n\nPINNED COMMENT\n${project.publish.pinnedComment}`)
  const blob=await zip.generateAsync({type:'blob'}), a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safe}-Resolve-Handoff.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}
function srtTime(sec:number){const ms=Math.round((sec%1)*1000),s=Math.floor(sec)%60,m=Math.floor(sec/60)%60,h=Math.floor(sec/3600);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`}
function edlTime(sec:number,fps=25){const frames=Math.max(0,Math.round(sec*fps)),f=frames%fps,total=Math.floor(frames/fps),s=total%60,m=Math.floor(total/60)%60,h=Math.floor(total/3600);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`}
function xmlEscape(value:string){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')}
function fcpxTime(seconds:number){return `${Math.max(0,Math.round(seconds*EDIT_FPS))}/${EDIT_FPS}s`}
function createFcpxml(project:Project){
  const used=project.resources.filter(asset=>project.timelineClips.some(clip=>clip.assetId===asset.id)),refs=new Map(used.map((asset,index)=>[asset.id,`r${index+2}`])),duration=Math.max(frameDuration(),...project.timelineClips.map(clip=>clip.timelineStart+clip.duration)),laneFor:Record<string,number>={v3:3,v2:2,v1:1,a2:-2,a1:-1,cc:4}
  const resources=used.map(asset=>{const ref=refs.get(asset.id),source=`file:///RELINK/${encodeURIComponent(asset.name)}`,video=asset.category==='Video'||asset.category==='Images',audio=asset.category==='Video'||asset.category==='Audio';return`    <asset id="${ref}" name="${xmlEscape(asset.name)}" src="${source}" start="0s" duration="${fcpxTime(asset.duration||duration)}" hasVideo="${video?'1':'0'}" hasAudio="${audio?'1':'0'}"${video?' format="r1"':''}/>`}).join('\n')
  const linkedVideoGroups=new Set(project.timelineClips.filter(clip=>clip.type==='video'&&clip.linkGroupId).map(clip=>clip.linkGroupId)),clips=[...project.timelineClips].filter(clip=>clip.assetId&&refs.has(clip.assetId)&&clip.type!=='caption'&&!(clip.type==='audio'&&clip.linkGroupId&&linkedVideoGroups.has(clip.linkGroupId))).sort((a,b)=>a.timelineStart-b.timelineStart||laneFor[a.trackId]-laneFor[b.trackId]).map(clip=>{const track=project.timelineTracks.find(item=>item.id===clip.trackId),disabled=track?.hidden||track?.muted?' enabled="0"':'',role=clip.type==='audio'?' audioRole="dialogue"':' videoRole="video"';return`            <asset-clip ref="${refs.get(clip.assetId!)}" lane="${laneFor[clip.trackId]||1}" name="${xmlEscape(clip.name)}" offset="${fcpxTime(clip.timelineStart)}" start="${fcpxTime(clip.sourceIn)}" duration="${fcpxTime(clip.duration)}"${role}${disabled}/>`}).join('\n')
  return`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="FFVideoFormat1080p25" frameDuration="1/${EDIT_FPS}s" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
${resources}
  </resources>
  <library location="file:///X1-Content-Studio/">
    <event name="${xmlEscape(project.series)}">
      <project name="${xmlEscape(project.title)}">
        <sequence format="r1" duration="${fcpxTime(duration)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
            <gap name="X1 rough cut" offset="0s" start="0s" duration="${fcpxTime(duration)}">
${clips}
            </gap>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`
}
function frameDuration(){return 1/EDIT_FPS}
function createEdl(project:Project){
  const clips=project.timelineClips.filter(clip=>clip.trackId==='v1'&&clip.type==='video').sort((a,b)=>a.timelineStart-b.timelineStart)
  const lines=[`TITLE: ${project.title.toUpperCase()}`,'FCM: NON-DROP FRAME','']
  clips.forEach((clip,index)=>{const reel=(project.resources.find(asset=>asset.id===clip.assetId)?.name||'AX').replace(/[^A-Z0-9]/gi,'').slice(0,8).toUpperCase()||'AX';lines.push(`${String(index+1).padStart(3,'0')}  ${reel.padEnd(8,' ')} V     C        ${edlTime(clip.sourceIn)} ${edlTime(clip.sourceIn+clip.duration)} ${edlTime(clip.timelineStart)} ${edlTime(clip.timelineStart+clip.duration)}`);lines.push(`* FROM CLIP NAME: ${clip.name}`);lines.push('')})
  if(!clips.length)lines.push('* No V1 video clips yet. Use sequence-manifest.json for the current layered edit plan.')
  return lines.join('\n')
}
function csvEscape(v:string){return `"${v.replaceAll('"','""')}"`}

export default App
