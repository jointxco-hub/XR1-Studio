# X1 Content Studio v0.8

## Fixed

- Rebuilt Markdown blueprint parsing so script text is mapped into real story beats instead of creating empty placeholder sections.
- Added support for YAML front matter, fenced ChatGPT Markdown, direct scene paragraphs, colon/dash/em-dash scene names, and common script/shot heading aliases.
- Added an import verification screen with scene counts, populated-script counts, shot counts, warnings, and script excerpts.
- Added a visible delete control for locally stored projects.
- Removed the sequence-clock freeze while large local video waits for decoding.
- Reduced repeated video seeking and moved preview loading to `preload="auto"`.
- Changed poster extraction to seek near the start of long videos.
- Debounced project persistence so timeline dragging no longer writes the complete project to local storage every frame.
- Improved move and trim gestures with wider handles, edge autoscroll, magnetic start/end snapping, linked A/V handling, live timecodes, and click suppression after a drag.
- Added Ctrl/Cmd + wheel zoom around the pointer, Shift + wheel horizontal movement, and Fit-to-sequence.

## Verification performed

- TypeScript/TSX syntax transpilation passed for all source files.
- Blueprint parser tests passed against the included template, a nested YAML two-scene example, and a fenced ChatGPT Markdown example.

A production bundle is intentionally not included because this environment could not download npm dependencies. Run `npm install` and `npm run dev` locally.
