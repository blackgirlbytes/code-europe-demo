# AirJam

AirJam is a standalone browser instrument that turns hand movement into music and explains the notes and chords as you play.

The initial experience includes:

- A playable air harp and piano keyboard
- Real-time synthesized sound using Tone.js
- Optional C–Am–F–G accompaniment
- Live note, chord, and phrase feedback
- In-browser melody recording and download
- MediaPipe hand tracking with pinch-to-pluck controls
- A pointer-based demo mode when no camera is available

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera access works on `localhost` or a secure HTTPS origin. The first camera start downloads the MediaPipe hand-landmark model and WebAssembly runtime.

## Checks

```bash
npm run lint
npm run build
```
