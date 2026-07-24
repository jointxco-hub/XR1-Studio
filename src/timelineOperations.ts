import type { TimelineClip } from './types'

export type TrimEdge = 'start' | 'end'

export type TrimRequest = {
  clipId: string
  linkedClipIds: Set<string>
  edge: TrimEdge
  delta: number
  frame: number
  sourceDurations: Map<string, number>
}

export const frameSnap = (time: number, fps = 25) => Math.max(0, Math.round(time * fps) / fps)

export function linkedClipIds(clips: TimelineClip[], clip: TimelineClip): Set<string> {
  const ids = new Set<string>([clip.id])
  if (!clip.linkGroupId) return ids
  for (const item of clips) if (item.linkGroupId === clip.linkGroupId) ids.add(item.id)
  return ids
}

export function trimTimelineClips(clips: TimelineClip[], request: TrimRequest): TimelineClip[] {
  const primary = clips.find(clip => clip.id === request.clipId)
  if (!primary) return clips

  return clips.map(clip => {
    if (!request.linkedClipIds.has(clip.id)) return clip

    if (request.edge === 'start') {
      const minimumDelta = Math.max(-clip.sourceIn, -clip.timelineStart)
      const maximumDelta = clip.duration - request.frame
      const delta = Math.max(minimumDelta, Math.min(maximumDelta, request.delta))
      return {
        ...clip,
        timelineStart: frameSnap(clip.timelineStart + delta),
        sourceIn: frameSnap(clip.sourceIn + delta),
        duration: frameSnap(Math.max(request.frame, clip.duration - delta)),
        sourceOut: clip.sourceOut,
      }
    }

    const sourceDuration = request.sourceDurations.get(clip.id) ?? clip.sourceOut
    const maximumDuration = Math.max(request.frame, sourceDuration - clip.sourceIn)
    const duration = frameSnap(Math.max(request.frame, Math.min(maximumDuration, clip.duration + request.delta)))
    return {
      ...clip,
      duration,
      sourceOut: frameSnap(clip.sourceIn + duration),
    }
  })
}

export function validateTrimInvariant(before: TimelineClip, after: TimelineClip, edge: TrimEdge, frame: number): boolean {
  if (after.duration < frame) return false
  if (after.sourceIn < 0 || after.timelineStart < 0) return false
  if (edge === 'start') {
    const beforeRightEdge = frameSnap(before.timelineStart + before.duration)
    const afterRightEdge = frameSnap(after.timelineStart + after.duration)
    return beforeRightEdge === afterRightEdge && before.sourceOut === after.sourceOut
  }
  return before.timelineStart === after.timelineStart && before.sourceIn === after.sourceIn
}
