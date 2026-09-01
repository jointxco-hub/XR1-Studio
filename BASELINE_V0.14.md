# XR1 Studio v0.14 baseline

Captured before implementation on 2026-09-01.

- Repository: `jointxco-hub/XR1-Studio`
- Branch: `main`
- Local HEAD: `7137ee8ad902eb5d64ab698d3c22c59bf231fcd6`
- `origin/main`: `7137ee8ad902eb5d64ab698d3c22c59bf231fcd6`
- Package version: `0.13.0`
- Dependency install: successful; npm reports one moderate and one high transitive vulnerability
- Production build: successful
- Existing timeline tests: 4 passed, 0 failed
- Production deployment: Vercel project `joint-x/xr-1-studio`, Vite preset, production deployment Ready, aliases include `xr-1-studio.vercel.app` and `xr-1-studio-git-main-joint-x.vercel.app`
- Runtime errors before changes: none surfaced by build/test validation. Physical camera permission and MediaRecorder behavior require real-device validation.

## Recording root causes found

1. A cold Record action called `startCamera()` and returned instead of starting a recorder after permission resolved.
2. UI recording state was set optimistically instead of being driven by `MediaRecorder` events.
3. No secure-context, API, device, or MIME capability checks existed.
4. Camera/microphone selection, source persistence, interruption handling, and meaningful recovery messages were absent.
5. Completed blobs were represented only by `blob:` URLs, stripped during autosave, and therefore lost on refresh.
6. Recordings were not registered as Files resources and takes had no durable asset/project/script/source metadata.
7. Autosave always displayed `Saved` even when a write failed or media remained ephemeral.

