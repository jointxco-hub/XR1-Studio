export type RecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'preview_ready'
  | 'preparing_recording'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'processing'
  | 'saved'
  | 'error'

export type RecordingEvent =
  | 'REQUEST_PERMISSION'
  | 'STREAM_READY'
  | 'PREPARE'
  | 'RECORDER_STARTED'
  | 'PAUSE'
  | 'RESUME'
  | 'STOP'
  | 'RECORDER_STOPPED'
  | 'SAVE_SUCCESS'
  | 'RESET'
  | 'FAIL'

const transitions: Record<RecordingState, Partial<Record<RecordingEvent, RecordingState>>> = {
  idle: { REQUEST_PERMISSION:'requesting_permission', RESET:'idle', FAIL:'error' },
  requesting_permission: { STREAM_READY:'preview_ready', FAIL:'error', RESET:'idle' },
  preview_ready: { PREPARE:'preparing_recording', RESET:'idle', FAIL:'error' },
  preparing_recording: { RECORDER_STARTED:'recording', STOP:'stopping', FAIL:'error' },
  recording: { PAUSE:'paused', STOP:'stopping', FAIL:'error' },
  paused: { RESUME:'recording', STOP:'stopping', FAIL:'error' },
  stopping: { RECORDER_STOPPED:'processing', FAIL:'error' },
  processing: { SAVE_SUCCESS:'saved', FAIL:'error' },
  saved: { PREPARE:'preparing_recording', RESET:'preview_ready', FAIL:'error' },
  error: { RESET:'idle', REQUEST_PERMISSION:'requesting_permission' },
}

export function transitionRecording(state: RecordingState, event: RecordingEvent): RecordingState {
  return transitions[state][event] ?? state
}

export const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=h264,aac',
  'video/mp4',
] as const

export function selectRecordingMime(isSupported?: (mime:string)=>boolean): string {
  if (!isSupported) return ''
  return MIME_CANDIDATES.find(mime => {
    try { return isSupported(mime) } catch { return false }
  }) ?? ''
}

export type MediaCapability = {
  supported: boolean
  secureContext: boolean
  mediaDevices: boolean
  getUserMedia: boolean
  mediaRecorder: boolean
  mimeType: string
  reason?: string
}

export function detectMediaCapability(scope: Pick<typeof globalThis, 'isSecureContext'> & {
  navigator?: { mediaDevices?: { getUserMedia?: unknown } }
  MediaRecorder?: { isTypeSupported?: (mime:string)=>boolean }
}): MediaCapability {
  const secureContext = Boolean(scope.isSecureContext)
  const mediaDevices = Boolean(scope.navigator?.mediaDevices)
  const getUserMedia = typeof scope.navigator?.mediaDevices?.getUserMedia === 'function'
  const mediaRecorder = typeof scope.MediaRecorder !== 'undefined'
  const mimeType = selectRecordingMime(scope.MediaRecorder?.isTypeSupported)
  const supported = secureContext && mediaDevices && getUserMedia && mediaRecorder
  const reason = !secureContext ? 'Camera recording requires HTTPS or localhost.'
    : !mediaDevices || !getUserMedia ? 'This browser does not expose camera and microphone access.'
    : !mediaRecorder ? 'This browser can preview the camera but cannot record it.'
    : undefined
  return { supported, secureContext, mediaDevices, getUserMedia, mediaRecorder, mimeType, reason }
}

export function humaniseMediaError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera or microphone permission was denied. Allow both in browser site settings, then try again.'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'No usable camera or microphone was found. Connect a device, then try again.'
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'The camera or microphone is already in use. Close the other app or tab, then retry.'
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') return 'The selected camera or microphone is unavailable. Choose another device.'
  if (name === 'QuotaExceededError') return 'Browser storage is full. Save existing takes to your device and free storage before recording again.'
  if (name === 'AbortError') return 'The device stopped while XR1 was preparing it. Check the connection and retry.'
  return error instanceof Error && error.message ? error.message : 'Recording failed. Reset the camera and try again.'
}

