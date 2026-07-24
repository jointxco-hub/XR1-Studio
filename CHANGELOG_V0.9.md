# X1 Content Studio v0.9

## Editor playback

- Composites all active video and image tracks instead of displaying only the top source.
- Keeps lower V1 picture moving beneath B-roll for opacity, scale, position, rotation, and blend effects.
- Separates viewer video playback from the A1/A2 audio engine so overlay footage no longer silences the main-story sound.
- Uses an independent sequence clock and drift correction for each active local media layer.
- Keeps playback moving when one local layer is still buffering.

## Audio

- Adds non-destructive audio extraction from any selected video clip.
- Creates a linked audio clip on A1 or A2 using the same source in/out range.
- Adds the **E** keyboard shortcut for audio extraction.
- Preserves linked A/V movement, split, trim, ripple, and unlink behaviour.
- Supports independent volume and track mute controls.

## Picture controls

- Adds clip scale, X/Y position, rotation, opacity, fit, horizontal/vertical flip, and blend modes.
- Adds direct drag positioning in the sequence viewer and double-click transform reset.
- Adds 16:9, 9:16, 1:1, and 4:5 sequence canvases plus a background-colour setting.
- Persists all new transform and canvas settings in project storage and v5 edit-plan exports.

## Timeline polish

- Keeps precise pointer-based drag and trim behaviour.
- Improves dragging feedback, linked-clip indicators, selection outlines, and responsive command-bar layout.
- Sorts track clips by timeline position for more predictable overlap behaviour.
