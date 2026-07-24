# X1 Content Studio v0.10 — Timeline Foundation

## Fixed

- Separated clip movement from trim handles so grabbing an edge can no longer start a move gesture.
- Rebuilt left and right trimming around one immutable gesture snapshot.
- Left trim now changes timeline start, source in and duration while preserving the right edge.
- Right trim now changes duration and source out while preserving timeline start.
- Normal trims affect only linked picture/audio, not every clip in a user-created group.
- Added pointer capture, Escape-to-cancel and one undo entry per completed gesture.

## Editing tools

- Added Resolve-inspired Selection (`A`/`V`), Trim (`T`), Blade (`B`) and Hand (`H`) tools.
- Added a frame-accurate red blade guide and timecode before cutting.
- Hold Shift while blading to cut every targeted, unlocked track crossing that frame.
- Added track targeting and A/V sync-lock controls.
- Added `N` snapping shortcut and temporary Alt bypass during move or trim.

## Timeline interaction

- Added separate physical hit zones for trim start, clip body and trim end.
- Added direct timeline panning with the Hand tool.
- Added clearer move, trim, snap and blade feedback.
- Ripple delete can follow targeted tracks instead of only broad all-track behavior.

## Verification

- Added Node-based trim operation tests outside the application build covering left trim, right trim, linked A/V, group isolation and one-frame minimum duration.
