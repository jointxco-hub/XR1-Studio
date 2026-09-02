import assert from 'node:assert/strict'
import test from 'node:test'
import { takeSaveLabel, unavailableTakeCopy } from '../src/features/recording/recordingPresentation.ts'

test('post-record state distinguishes saving, durable, and session-only media',()=>{
  assert.match(takeSaveLabel('saving'),/Saving/)
  assert.match(takeSaveLabel('durable'),/Saved on this device/)
  assert.match(takeSaveLabel('failed'),/session/)
})

test('unavailable legacy takes explain why playback actions are absent',()=>{
  assert.equal(unavailableTakeCopy(true),'')
  assert.match(unavailableTakeCopy(false),/predates durable local storage/)
})
