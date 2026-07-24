import assert from 'node:assert/strict'
import test from 'node:test'
import { linkedClipIds, trimTimelineClips, validateTrimInvariant } from '../src/timelineOperations.ts'
import type { TimelineClip } from '../src/types.ts'

const clip = (overrides: Partial<TimelineClip> = {}): TimelineClip => ({
  id: 'video',
  trackId: 'v1',
  type: 'video',
  name: 'Test clip',
  timelineStart: 10,
  sourceIn: 0,
  sourceOut: 10,
  duration: 10,
  opacity: 1,
  volume: 1,
  fit: 'Cover',
  scale: 1,
  rotation: 0,
  positionX: 0,
  positionY: 0,
  flipX: false,
  flipY: false,
  blendMode: 'Normal',
  ...overrides,
})

const frame = 1 / 25

test('left trim removes the beginning while preserving the right edge', () => {
  const before = clip()
  const [after] = trimTimelineClips([before], {
    clipId: before.id,
    linkedClipIds: new Set([before.id]),
    edge: 'start',
    delta: 2,
    frame,
    sourceDurations: new Map([[before.id, 30]]),
  })
  assert.equal(after.timelineStart, 12)
  assert.equal(after.sourceIn, 2)
  assert.equal(after.duration, 8)
  assert.equal(after.sourceOut, 10)
  assert.equal(after.timelineStart + after.duration, 20)
  assert.equal(validateTrimInvariant(before, after, 'start', frame), true)
})

test('right trim removes the ending without moving the clip', () => {
  const before = clip()
  const [after] = trimTimelineClips([before], {
    clipId: before.id,
    linkedClipIds: new Set([before.id]),
    edge: 'end',
    delta: -2,
    frame,
    sourceDurations: new Map([[before.id, 30]]),
  })
  assert.equal(after.timelineStart, 10)
  assert.equal(after.sourceIn, 0)
  assert.equal(after.duration, 8)
  assert.equal(after.sourceOut, 8)
  assert.equal(validateTrimInvariant(before, after, 'end', frame), true)
})

test('normal trim affects linked A/V but not a user group', () => {
  const video = clip({ id: 'video', linkGroupId: 'av', groupId: 'layout' })
  const audio = clip({ id: 'audio', type: 'audio', trackId: 'a1', linkGroupId: 'av', groupId: 'layout' })
  const groupedBroll = clip({ id: 'broll', trackId: 'v2', timelineStart: 4, groupId: 'layout', linkGroupId: undefined })
  const clips = [video, audio, groupedBroll]
  const ids = linkedClipIds(clips, video)
  const result = trimTimelineClips(clips, {
    clipId: video.id,
    linkedClipIds: ids,
    edge: 'start',
    delta: 1,
    frame,
    sourceDurations: new Map(clips.map(item => [item.id, 30])),
  })
  assert.equal(result.find(item => item.id === 'video')?.timelineStart, 11)
  assert.equal(result.find(item => item.id === 'audio')?.timelineStart, 11)
  assert.equal(result.find(item => item.id === 'broll')?.timelineStart, 4)
})

test('trim never collapses a clip below one frame', () => {
  const before = clip()
  const [after] = trimTimelineClips([before], {
    clipId: before.id,
    linkedClipIds: new Set([before.id]),
    edge: 'start',
    delta: 100,
    frame,
    sourceDurations: new Map([[before.id, 30]]),
  })
  assert.equal(after.duration, frame)
})
