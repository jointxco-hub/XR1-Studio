export type StageId = 'idea' | 'script' | 'visuals' | 'record' | 'edit' | 'finish' | 'publish' | 'files'

export type ScriptBlock = {
  id: string
  label: string
  text: string
  note: string
  visual: string
}

export type Shot = {
  id: string
  section: string
  description: string
  source: string
  status: 'Available' | 'Needs filming' | 'Needs screen recording' | 'Needs design' | 'Optional' | 'Complete'
  shotNumber?: string
  shotType?: 'A-roll' | 'B-roll' | 'Product / detail' | 'Screen recording' | 'Establishing' | 'Graphic / title' | 'Voice-over visual'
  thumbnailUrl?: string
  framing?: 'Wide' | 'Medium' | 'Close-up' | 'Macro' | 'Screen' | 'Graphic'
  movement?: 'Locked' | 'Handheld' | 'Push in' | 'Pull out' | 'Pan' | 'Tilt' | 'Screen capture'
  purpose?: string
  priority?: 'Essential' | 'Support' | 'Optional'
  duration?: number
  notes?: string
  assetId?: string
  order?: number
}

export type TranscriptLine = {
  id: string
  speaker: string
  text: string
  start: number
  end: number
  included: boolean
}

export type Take = {
  id: string
  section: string
  label: string
  duration: string
  preferred: boolean
  url?: string
}

export type ResourceAsset = {
  id: string
  name: string
  mime: string
  category: 'Video' | 'Images' | 'Audio' | 'Documents' | 'Other'
  size: number
  addedAt: string
  url?: string
  proxyUrl?: string
  proxyName?: string
  posterUrl?: string
  waveform?: number[]
  tags: string[]
  role: 'A-roll' | 'B-roll' | 'Thumbnail' | 'Audio' | 'Document' | 'Unassigned'
  duration?: number
}

export type EditCut = {
  id: string
  start: number
  end: number
  label: string
  transcriptId?: string
}

export type BrollPlacement = {
  id: string
  assetId: string
  start: number
  end: number
  fit: 'Cover' | 'Contain'
  opacity: number
}

export type TimelineTrack = {
  id: string
  label: string
  kind: 'video' | 'audio' | 'captions'
  order: number
  locked: boolean
  muted: boolean
  hidden: boolean
  color: string
}

export type TimelineClip = {
  id: string
  trackId: string
  type: 'video' | 'image' | 'audio' | 'title' | 'caption'
  assetId?: string
  name: string
  timelineStart: number
  sourceIn: number
  sourceOut: number
  duration: number
  opacity: number
  volume: number
  fit: 'Cover' | 'Contain'
  text?: string
  linkedShotId?: string
  linkGroupId?: string
  groupId?: string
}

export type TimelineMarker = {
  id: string
  time: number
  label: string
  color: string
  shotId?: string
}

export type Project = {
  id: string
  title: string
  series: string
  format: string
  viewer: string
  premise: string
  brainstorm: string
  draftScript: string
  outcome: string
  targetMinutes: number
  mode: 'Talking points' | 'Full script' | 'Hybrid' | 'Voice-over' | 'Presentation'
  blocks: ScriptBlock[]
  shots: Shot[]
  transcript: TranscriptLine[]
  takes: Take[]
  resources: ResourceAsset[]
  editBrollIds: string[]
  editCuts: EditCut[]
  brollPlacements: BrollPlacement[]
  timelineTracks: TimelineTrack[]
  timelineClips: TimelineClip[]
  timelineMarkers: TimelineMarker[]
  publish: {
    title: string
    description: string
    pinnedComment: string
    keywords: string[]
    alternativeTitles: string[]
    searchIntent: string
    thumbnailText: string
    thumbnailBrief: string
    thumbnailUrl?: string
    thumbnailName?: string
  }
}
