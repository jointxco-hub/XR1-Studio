# XR1 Studio v0.14.1 — Mobile Creator Refinement

## Recording UX refinement

- Active recording now enters a dedicated full-height camera state that removes normal page and bottom-navigation chrome.
- The control deck prioritises Mic, Record/Stop, camera flip and compact settings with iPhone safe-area clearance.
- Camera switching is visibly locked during an active take; camera and microphone device selectors stay in pre-record settings.
- Navigation away from an active browser recording is guarded while the in-app navigation is hidden.

## Teleprompter eye-line

- Added persisted High, Centre and Low prompt positions; High is the mobile default.
- Rebuilt the camera prompt as a stable word window with active-word emphasis, faded context, adjustable speed/size and punctuation-aware pauses.
- Current script section and take number remain visible during recording.

## Sequential section recording

- Every completed take remains linked to the active script section.
- The post-record state reports Saving, Saved on this device or session-only failure truthfully.
- Review, Prefer, Record another, Next section and Add to edit are available without returning to the long session list.

## Quick Edit rebuild

- Quick Edit is now a separate component tree; the professional track editor is not rendered until Advanced Edit is explicitly opened.
- Added a large sequence viewer, thumbnail clip strip, simple playback/scrubbing and a compact creator tool dock.
- Added touch-oriented trim with live duration and trim-to-playhead actions, split, creator ripple delete, undo/redo and same-section take replacement.
- Added project-media B-roll placement, simple captions, clip/music audio controls and Format choices for 16:9, 9:16, 1:1 and 4:5.
- Empty sequences show only Build from preferred takes, Choose recordings and Import media actions.

## Sequence-state correctness

- Added one canonical media-sequence calculation for actual duration, media clip count and playhead bounds.
- Linked A1 audio is counted with its V1 picture instead of as a second creator clip; captions and titles cannot create a false media duration.
- A sequence with no media now reports 00:00 and 0 media clips. Transcript duration, script estimates and creative targets remain separate labels.
- Advanced Edit and Resolve export metadata now use the same actual-media duration calculation.

## Take improvements

- Take cards prioritise Play, Prefer and Add; Rename, Save and Delete moved into a secondary menu.
- Poster frames continue through Record, Files and the Quick Edit clip strip.
- Legacy unavailable takes now explain that they predate durable storage and expose only a removal action.

## Real-device QA

- Layout logic covers normal mobile Safari viewport behavior, standalone PWA safe areas and active-recording viewport changes.
- Added pure regression coverage for zero-clip truth, duration/count deduplication, split/trim/replace, creator ripple delete, prompt-position persistence, post-save labels and unavailable takes.
- Browser MediaRecorder, permissions and storage quotas remain platform-controlled and require final physical-device smoke testing after deployment.
