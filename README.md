# X1 Content Studio

Version 0.8 — verified Markdown blueprint import, project deletion, immediate sequence playback, smoother trimming, and lower-latency timeline editing

A focused, stage-based YouTube production workspace for Joint X: idea, script, visuals, recording, transcript rough cut, DaVinci Resolve handoff, and publishing.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

The static build is written to `dist/`.

## Working in this prototype

- Editable project brief and story compass
- Talking-points, full-script, and hybrid writing modes
- Editable story beats with private delivery and visual notes
- StudioBinder-style shot board with visual cards, reference frames, production metadata, drag order, list view, and story-coverage matrix
- Shot presets for A-roll, B-roll, product/detail, screen capture, establishing shots, graphics/titles, and voice-over visuals
- One-click shot markers and linked media handoff from the production board into the edit sequence
- Continuous full-script teleprompter with word-level autoplay and active-word highlighting
- Natural punctuation pauses and a request-animation-frame reading-line glide
- Soft Grey focus by default, optional Lime Word focus, or Focus Off while autoplay continues
- Full Script, Presentation, and Hybrid recording modes
- Adjustable WPM, text size, line spacing, script width, countdown, notes, mirror, keyboard controls, and fullscreen
- Standalone second-screen teleprompter window
- Browser camera and microphone preview
- Browser recording with saved takes during the current session
- Preferred-take selection per script section
- Transcript-led, non-destructive include/remove decisions
- Rough-cut duration and edit summary
- Real DaVinci Resolve handoff ZIP generation
- Editable YouTube title, description, chapters, pinned comment, thumbnail brief, and checklist
- Browser autosave through local storage
- Responsive desktop and mobile layouts
- Working three-dot actions for script beats, shots, recording sections, and resources
- Real multi-file selection, drag-and-drop resources, and external-footage import
- YouTube Growth workspace for titles, alternatives, descriptions, search intent, keywords, thumbnail text, thumbnail routes, chapters, and pinned comments
- Branded Joint X brainstorm notebook and script workspace using the supplied logo asset
- Dedicated Files workspace with search, production roles, inferred tags, relink health, duplicates, and smart B-roll collections
- Local image, audio, PDF, and video previews; video thumbnails autoplay silently on hover
- Real local source playback with synchronized playhead, scrubbing, 25 fps timecode, one-frame stepping, and keyboard controls
- In/Out marking, non-destructive range cuts, playback cut-skipping, cut restoration, and rough-cut duration calculation
- Transcript paste, script-to-timed-transcript conversion, SRT import, inline text/timestamp editing, and transcript-led cuts
- B-roll placement at the current playhead with editable In/Out timing, fit controls, timeline blocks, and live overlay preview
- Live caption preview with position and size controls, editable cards, SRT import, and SRT export
- Persistent V3 titles, V2 B-roll, V1 main story, A2 music, A1 original audio, and CC caption tracks
- Drag-to-timeline media and shot placement, cross-track moves, snapping, timeline zoom, track locks, visibility, and mute controls
- Select and blade tools, linked A/V splits and trims, multi-select, grouping, cross-track ripple delete, duplicate, undo/redo, markers, and clip inspector controls
- Generated poster frames, thumbnail strips, audio waveforms, silent hover previews, and a denser professional timeline surface
- Optimised proxy attachment with instant original/proxy switching in the viewer while original media remains untouched
- Debounced browser autosave history with up to 20 restorable timeline revisions per project
- Sequence-aware viewer with layered B-roll/title preview, source-synchronised playback, and transcript captions
- Exportable v4 edit-plan JSON plus Resolve FCPXML, EDL fallback, sequence manifest, timeline markers, proxy-aware media relink report, shot list, and SRT captions
- Distraction-free full-script writer with optional `**Section name**` markers and one-click section syncing
- Direct thumbnail upload, immediate in-app preview, replacement, and removal
- Multi-project creation, selection, deletion, autosave, and a working View all dashboard

## Deliberate MVP boundaries

The current transcript uses sample timestamp data; automatic speech-to-text is the next backend integration. Recorded and imported media previews exist for the current browser session and are intentionally not persisted across restarts. Reopen the Files workspace and relink the original when starting a new browser session. The second-screen window carries a complete prompt snapshot; live cross-device control requires a small realtime service. Selected files are recorded as lightweight project metadata without uploading or duplicating the originals.

The app intentionally prepares the rough cut rather than replacing DaVinci Resolve. Advanced colour, sound mixing, multicamera, motion graphics, effects, and final rendering remain in Resolve. FCPXML carries the timed layered media assembly, classic EDL remains the V1 fallback, and the sequence manifest preserves every additional relationship and decision.

## Suggested next build phase

1. Add Supabase authentication, project storage, and realtime teleprompter sessions.
2. Add persistent File System Access handles and optional automatic background proxy generation.
3. Connect transcription and word-level timecodes.
4. Render rough cuts from non-destructive edit decisions.
5. Add a local Python companion for Resolve project, bin, timeline, caption, and marker creation.

## Project Blueprint Import

From the project dashboard, choose **Import blueprint** and upload a `.md` or `.markdown` file. Before creating the project, version 0.8 shows a verification screen with the number of detected scenes, populated scripts, generated shots, and a readable preview of the first five script sections. This prevents an empty or incorrectly structured blueprint from being imported silently.

The importer accepts YAML front matter, regular Markdown, fenced ChatGPT Markdown blocks, `## Scene 1: Hook`, `## Scene 1 — Hook`, and simple `## Hook` scene headings. It maps project direction, target audience, presenter script, teleprompter delivery notes, primary shots, B-roll, screen actions, on-screen text, edit notes, and basic publishing fields. Start from `YT_STUDIO_BLUEPRINT_TEMPLATE.md`.

Recognised scene headings include `Purpose`, `Presenter Script`, `Teleprompter Script`, `Full Script`, `Primary Shot`, `Screen Actions`, `B-Roll`, `On-Screen Text`, `Recording Notes`, and `Edit Notes`. Paragraphs placed directly beneath a scene heading are also treated as presenter script.

## Playback and timeline update

- The sequence clock starts immediately when Play is pressed instead of freezing while a large local video waits for a full `canplay` state.
- The visible video follows the sequence clock and is corrected only when it meaningfully drifts, avoiding repeated micro-seeks.
- Local video previews use eager loading, and poster extraction seeks near the beginning of the file rather than deep into a long recording.
- Wider left and right trim handles remain visible on hover and selection.
- Start and end trims calculate from the original clip snapshot for the entire pointer gesture, avoiding cumulative jumpiness.
- Clip moves and trims support edge autoscroll, 25 fps precision, magnetic edge snapping, linked A/V movement, and live timecode feedback.
- Browser project persistence is debounced so local-storage writes no longer run on every drag frame.
- Hold Ctrl/Cmd and use the mouse wheel over the timeline to zoom around the pointer; use Shift + wheel for horizontal navigation.
- Use **Fit** to frame the full sequence.

## Updating an older local copy

Extract this version into a new folder, run `npm install`, and start it with `npm run dev -- --port 5191 --strictPort`. Existing projects remain in browser local storage. Broken empty imports from the older build can now be removed from **View all** using the trash button, then imported again through the new verification screen.
