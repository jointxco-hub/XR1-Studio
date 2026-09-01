# XR1 Studio v0.14 — Capture Ready

## Recording reliability

- Replaced the two-tap camera wrapper with an event-driven recording state machine.
- One Record action now requests permission, starts the stream, negotiates a supported MIME type and begins recording.
- Added secure-context/API checks, human-readable recovery errors, real recorder feedback, pause/resume, camera flip, microphone mute and device selection.
- Added camera/microphone preference persistence and screen wake lock while recording or running the camera teleprompter.

## Mobile experience

- Added a full-height creator-camera layout with safe-area spacing and thumb-zone controls.
- Integrated an adjustable WPM/font-size teleprompter over the live camera.
- Added Home, Script, Record, Edit and More bottom navigation.
- Added direct Script section → Record actions and touch-sized controls throughout Script, Files and Record.
- Phone media imports now use multi-select and durable local media storage.

## Quick Edit

- Added explicit Quick Edit and Advanced Edit modes; phones enter Quick Edit by default.
- Improved mobile preview/timeline ordering, touch trim targets, horizontal timeline movement and bottom-sheet inspector behavior.
- Preserved the existing advanced Resolve-inspired timeline, undo/redo, split, ripple delete, B-roll, captions and aspect controls.

## Media persistence

- Added IndexedDB blob persistence; large media is not stored in localStorage.
- Recorded takes are registered in Files with project, script section, duration, source device, date and take metadata.
- Added Play, Rename, Preferred, Add to edit, Save to device and Delete actions.
- Added durable media restoration after refresh and truthful Saving/Saved/Save failed states.

## Architecture

- Extracted recording state/capability logic, media-device handling, recorder orchestration, wake lock, take creation and media storage from `App.tsx`.
- Added an isolated `CaptureStage` feature while preserving the existing application and timeline.
- Added explicit preferred-take → V1/A1 rough-cut construction without replacing existing edits.

## QA

- Added unit coverage for MIME choice, capability fallback, recording transitions, recovery messages, take/file associations and preferred-take rough-cut ordering.
- Retained all existing timeline regression tests.
- Added PWA manifest, standalone metadata, icons, safe-area support and a conservative offline shell.

## Known platform limits

- Camera permission prompts, codec output and storage quotas remain browser/device controlled.
- IndexedDB is device-local, can be cleared by the browser/OS and is not a cloud backup.
- iOS may suspend camera access when the app is backgrounded; XR1 surfaces the interruption and retains completed takes only after the stop/save flow finishes.
- Physical Safari/iPhone and Android/Chrome capture must still be confirmed on the target devices before an irreplaceable shoot.
