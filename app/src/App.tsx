import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CircleHelp, Download, Hand, Music2, Radio, Sparkles, Volume2, X } from 'lucide-react'
import { DrawingUtils, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import * as Tone from 'tone'
import './App.css'

type Note = { label: string; pitch: string; color: string; height: string }
type CameraState = 'demo' | 'loading' | 'active' | 'error'
type AudioRig = { synth: Tone.PolySynth; reverb: Tone.Reverb; recorder: Tone.Recorder }
type BackingBand = { loop: Tone.Loop; pad: Tone.PolySynth; bass: Tone.MonoSynth }

const harpNotes: Note[] = [
  { label: 'C', pitch: 'C4', color: '#e7665b', height: '72%' },
  { label: 'D', pitch: 'D4', color: '#8d7ab8', height: '80%' },
  { label: 'E', pitch: 'E4', color: '#e5b84a', height: '88%' },
  { label: 'G', pitch: 'G4', color: '#6e9d8d', height: '94%' },
  { label: 'A', pitch: 'A4', color: '#8d7ab8', height: '84%' },
]

const keyboardNotes: Note[] = [
  { label: 'C', pitch: 'C4', color: '#e7665b', height: '100%' },
  { label: 'D', pitch: 'D4', color: '#8d7ab8', height: '100%' },
  { label: 'E', pitch: 'E4', color: '#e5b84a', height: '100%' },
  { label: 'F', pitch: 'F4', color: '#b9afc8', height: '100%' },
  { label: 'G', pitch: 'G4', color: '#6e9d8d', height: '100%' },
  { label: 'A', pitch: 'A4', color: '#8d7ab8', height: '100%' },
  { label: 'B', pitch: 'B4', color: '#b9afc8', height: '100%' },
  { label: 'C', pitch: 'C5', color: '#e7665b', height: '100%' },
]

const chordForNote: Record<string, { name: string; notes: string[]; message: string; next: string }> = {
  C: { name: 'C', notes: ['C', 'E', 'G'], message: 'You found home. This is the root of the key.', next: 'G' },
  D: { name: 'Dm', notes: ['D', 'F', 'A'], message: 'A gentle minor chord adds a little shadow.', next: 'G' },
  E: { name: 'C', notes: ['C', 'E', 'G'], message: 'E is the bright third inside C major.', next: 'G' },
  F: { name: 'F', notes: ['F', 'A', 'C'], message: 'The fourth opens the phrase and wants to move.', next: 'G' },
  G: { name: 'G', notes: ['G', 'B', 'D'], message: 'The fifth creates lift and points back home.', next: 'C' },
  A: { name: 'Am', notes: ['A', 'C', 'E'], message: 'The relative minor uses the same safe notes.', next: 'F' },
  B: { name: 'G', notes: ['G', 'B', 'D'], message: 'B gives the G chord its bright leading pull.', next: 'C' },
}

const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

function App() {
  const [activeNote, setActiveNote] = useState<Note>(harpNotes[0])
  const [noteHistory, setNoteHistory] = useState<Note[]>([harpNotes[0], harpNotes[2], harpNotes[3]])
  const [cameraState, setCameraState] = useState<CameraState>('demo')
  const [cameraMessage, setCameraMessage] = useState('Demo mode · press any string')
  const [handPoint, setHandPoint] = useState({ x: 0.66, y: 0.42 })
  const [demoPoint, setDemoPoint] = useState({ x: 0.7, y: 0.42 })
  const [sound, setSound] = useState('Glass piano')
  const [safeNotes, setSafeNotes] = useState(true)
  const [accompaniment, setAccompaniment] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [downloadReady, setDownloadReady] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Press a string or a piano key to begin')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const animationRef = useRef<number | null>(null)
  const pinchedRef = useRef(false)
  const activeIndexRef = useRef(0)
  const audioRef = useRef<AudioRig | null>(null)
  const backingRef = useRef<BackingBand | null>(null)
  const soundRef = useRef(sound)

  const currentChord = chordForNote[activeNote.label]

  const createAudioRig = useCallback(async () => {
    await Tone.start()
    if (audioRef.current && soundRef.current === sound) return audioRef.current
    audioRef.current?.synth.dispose()
    audioRef.current?.reverb.dispose()
    audioRef.current?.recorder.dispose()

    const envelope = sound === 'Soft bell'
      ? { attack: 0.01, decay: 1.4, sustain: 0.05, release: 2.2 }
      : sound === 'Warm keys'
        ? { attack: 0.08, decay: 0.5, sustain: 0.35, release: 1.6 }
        : { attack: 0.015, decay: 0.7, sustain: 0.18, release: 2.8 }
    const oscillator = sound === 'Warm keys' ? 'triangle' : 'sine'
    const reverb = new Tone.Reverb({ decay: 3.8, wet: 0.34 }).toDestination()
    const recorder = new Tone.Recorder()
    const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: oscillator }, envelope, volume: -7 }).connect(reverb)
    synth.connect(recorder)
    const rig = { synth, reverb, recorder }
    audioRef.current = rig
    soundRef.current = sound
    return rig
  }, [sound])

  const playNote = useCallback(async (note: Note, velocity = 0.72) => {
    try {
      const rig = await createAudioRig()
      rig.synth.triggerAttackRelease(note.pitch, '8n', undefined, Math.max(0.25, Math.min(0.95, velocity)))
      setActiveNote(note)
      setNoteHistory((history) => [...history.slice(-8), note])
      setStatusMessage(`${note.label} played · ${chordForNote[note.label].message}`)
    } catch {
      setStatusMessage('Audio could not start. Check this tab’s sound permissions.')
    }
  }, [createAudioRig])

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState('demo')
    setCameraMessage('Demo mode · press any string')
  }, [])

  const startCamera = useCallback(async () => {
    if (cameraState === 'active') { stopCamera(); return }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error'); setCameraMessage('Camera is unavailable in this browser'); return
    }
    setCameraState('loading')
    setCameraMessage('Warming up hand tracking…')
    try {
      const [vision, stream] = await Promise.all([
        FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
      ])
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.5,
      })
      const video = videoRef.current
      if (!video) throw new Error('Video element was not ready')
      streamRef.current = stream
      landmarkerRef.current = landmarker
      video.srcObject = stream
      await video.play()
      setCameraState('active')
      setCameraMessage('Show one hand · pinch to pluck')

      let previousVideoTime = -1
      const detect = () => {
        const currentVideo = videoRef.current
        const currentCanvas = canvasRef.current
        const currentLandmarker = landmarkerRef.current
        if (!currentVideo || !currentCanvas || !currentLandmarker) return
        if (currentVideo.currentTime !== previousVideoTime && currentVideo.readyState >= 2) {
          previousVideoTime = currentVideo.currentTime
          const result = currentLandmarker.detectForVideo(currentVideo, performance.now())
          currentCanvas.width = currentVideo.videoWidth
          currentCanvas.height = currentVideo.videoHeight
          const context = currentCanvas.getContext('2d')
          context?.clearRect(0, 0, currentCanvas.width, currentCanvas.height)
          if (result.landmarks.length && context) {
            const landmarks = result.landmarks[0]
            const drawing = new DrawingUtils(context)
            drawing.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: '#fffefd', lineWidth: 2 })
            drawing.drawLandmarks(landmarks, { color: '#e5b84a', radius: 3 })
            const thumb = landmarks[4]
            const index = landmarks[8]
            const x = 1 - index.x
            const y = index.y
            const pinchDistance = Math.hypot(thumb.x - index.x, thumb.y - index.y)
            const stringIndex = Math.max(0, Math.min(harpNotes.length - 1, Math.floor(x * harpNotes.length)))
            activeIndexRef.current = stringIndex
            setHandPoint({ x, y })
            setCameraMessage(pinchDistance < 0.065 ? 'Pinch heard · open to reset' : 'Hand found · pinch to pluck')
            if (pinchDistance < 0.065 && !pinchedRef.current) {
              pinchedRef.current = true
              void playNote(harpNotes[stringIndex], 1 - y * 0.45)
            } else if (pinchDistance > 0.095) pinchedRef.current = false
          } else {
            setCameraMessage('Bring one hand into the frame')
            pinchedRef.current = false
          }
        }
        animationRef.current = requestAnimationFrame(detect)
      }
      detect()
    } catch (error) {
      console.error(error)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      setCameraState('error')
      setCameraMessage('Camera setup failed · demo mode still works')
    }
  }, [cameraState, playNote, stopCamera])

  const handleStageMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (cameraState === 'active') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    setDemoPoint({ x, y })
    const normalized = Math.max(0, Math.min(0.999, (x - 0.42) / 0.55))
    activeIndexRef.current = Math.floor(normalized * harpNotes.length)
  }

  const toggleAccompaniment = async () => {
    if (backingRef.current) {
      backingRef.current.loop.stop().dispose(); backingRef.current.pad.dispose(); backingRef.current.bass.dispose()
      backingRef.current = null; setAccompaniment(false); setStatusMessage('Accompaniment stopped. Your instrument is solo.'); return
    }
    await Tone.start()
    Tone.getTransport().bpm.value = 92
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' }, envelope: { attack: 0.8, decay: 0.4, sustain: 0.3, release: 1.8 }, volume: -21,
    }).toDestination()
    const bass = new Tone.MonoSynth({
      oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.5 }, volume: -17,
    }).toDestination()
    const progression = [
      { chord: ['C3', 'E3', 'G3'], bass: 'C2' }, { chord: ['A2', 'C3', 'E3'], bass: 'A1' },
      { chord: ['F2', 'A2', 'C3'], bass: 'F1' }, { chord: ['G2', 'B2', 'D3'], bass: 'G1' },
    ]
    let step = 0
    const loop = new Tone.Loop((time) => {
      const harmony = progression[step % progression.length]
      pad.triggerAttackRelease(harmony.chord, '2n', time, 0.42)
      bass.triggerAttackRelease(harmony.bass, '4n', time, 0.5)
      step += 1
    }, '2n').start(0)
    backingRef.current = { loop, pad, bass }
    Tone.getTransport().start()
    setAccompaniment(true)
    setStatusMessage('Accompaniment is playing a C–Am–F–G progression.')
  }

  const toggleRecording = async () => {
    const rig = await createAudioRig()
    if (!isRecording) {
      await rig.recorder.start(); setIsRecording(true); setDownloadReady(false); setStatusMessage('Recording your melody…'); return
    }
    const blob = await rig.recorder.stop()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `airjam-take-${new Date().toISOString().slice(0, 10)}.webm`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setIsRecording(false); setDownloadReady(true); setStatusMessage('Take saved to your downloads.')
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    landmarkerRef.current?.close()
    audioRef.current?.synth.dispose(); audioRef.current?.reverb.dispose(); audioRef.current?.recorder.dispose()
    backingRef.current?.loop.dispose(); backingRef.current?.pad.dispose(); backingRef.current?.bass.dispose()
  }, [])

  const cursor = cameraState === 'active' ? handPoint : demoPoint

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#instrument" aria-label="AirJam instrument"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>airjam</span></a>
        <div className="session-name"><span className="live-dot" /><span>First light</span><span className="session-meta">C major · 92 BPM</span></div>
        <nav className="top-actions" aria-label="Session actions">
          <button className="icon-button" aria-label="How to play" onClick={() => setShowHelp(true)}><CircleHelp size={19} /></button>
          <button className={`record-button ${isRecording ? 'recording' : ''}`} onClick={() => void toggleRecording()}>
            {downloadReady && !isRecording ? <Download size={14} /> : <span />}{isRecording ? 'Stop & save' : downloadReady ? 'Record again' : 'Record'}
          </button>
        </nav>
      </header>

      <section className="workspace" id="instrument" aria-label="Air harp instrument">
        <div className="performance-column">
          <div className="control-strip">
            <label><span className="eyebrow">Instrument</span><select aria-label="Instrument"><option>Air harp</option></select></label>
            <label><span className="eyebrow">Sound</span><select value={sound} onChange={(event) => setSound(event.target.value)} aria-label="Sound"><option>Glass piano</option><option>Soft bell</option><option>Warm keys</option></select></label>
            <div className={`tracking-status ${cameraState}`}>
              <span><Radio size={14} /> {cameraMessage}</span>
              <button className="camera-button" onClick={() => void startCamera()} disabled={cameraState === 'loading'}>
                {cameraState === 'active' ? <X size={16} /> : <Camera size={16} />}{cameraState === 'loading' ? 'Starting…' : cameraState === 'active' ? 'Stop camera' : 'Use camera'}
              </button>
            </div>
          </div>

          <div className={`stage ${cameraState === 'active' ? 'camera-active' : ''}`} onPointerMove={handleStageMove} onPointerDown={() => { if (cameraState !== 'active') void playNote(harpNotes[activeIndexRef.current], 0.76) }}>
            <video ref={videoRef} className="camera-feed" muted playsInline aria-label="Live camera feed" />
            <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" /><div className="camera-shade" />
            <div className="stage-copy"><span className="stage-step">01</span><div><h1>Reach in and<br /><em>pluck the light.</em></h1><p>{cameraState === 'active' ? 'Bring thumb and index finger together.' : 'Move across the strings. Press or click to play.'}</p></div></div>
            <div className="harp" aria-label="Five air harp strings">
              {harpNotes.map((note, index) => (
                <button className={`harp-string ${activeNote.pitch === note.pitch ? 'active' : ''}`} key={note.pitch}
                  style={{ '--string-color': note.color, '--string-height': note.height } as React.CSSProperties}
                  onPointerDown={(event) => { event.stopPropagation(); void playNote(note) }} onPointerEnter={() => { activeIndexRef.current = index }} aria-label={`Play ${note.label}`}>
                  <span className="string-line" /><span className="string-note">{note.label}</span>
                </button>
              ))}
            </div>
            <span className={`gesture-cursor ${cameraState === 'active' ? 'tracked' : ''}`} style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }} aria-hidden="true"><i /></span>
            <div className="stage-footer"><span><Music2 size={14} /> C major pentatonic</span><span>{cameraState === 'active' ? 'Pinch threshold 6.5%' : 'Demo: pointer + press'}</span></div>
          </div>

          <div className="keyboard-panel">
            <div className="keyboard-heading"><span className="eyebrow">Your notes</span><label className="safe-toggle"><input type="checkbox" checked={safeNotes} onChange={(event) => setSafeNotes(event.target.checked)} /><span aria-hidden="true" />Safe notes {safeNotes ? 'on' : 'off'}</label></div>
            <div className="keyboard" aria-label="C major keyboard">
              {keyboardNotes.map((note) => <button className={`piano-key ${activeNote.pitch === note.pitch ? 'active' : ''} ${!safeNotes && ['F', 'B'].includes(note.label) ? 'available' : ''}`} key={note.pitch} onClick={() => void playNote(note)} aria-label={`Play ${note.pitch}`}><span>{note.label}</span></button>)}
            </div>
          </div>
          <output className="status-line" aria-live="polite"><Volume2 size={13} /> {statusMessage}</output>
        </div>

        <aside className="music-guide" aria-label="Music guide">
          <div className="guide-header"><span className="eyebrow">Now playing</span><span className="measure">Listening live</span></div>
          <section className="chord-card"><p>Current harmony</p><div className="chord-name">{currentChord.name.replace('m', '')}<sup>{currentChord.name.endsWith('m') ? 'minor' : 'major'}</sup></div><div className="chord-notes">{currentChord.notes.map((note, index) => <span className={index === 0 ? 'root' : ''} key={note}>{note}</span>)}</div><p className="chord-explainer"><strong>{activeNote.label} is sounding.</strong>{currentChord.message}</p></section>
          <section className="next-card"><p className="eyebrow">Try this next</p><div className="next-chord"><span>Move toward</span><strong>{currentChord.next}</strong></div><p>Follow the gold key when you want a gentle musical suggestion.</p></section>
          <section className="timeline-card"><div className="timeline-heading"><span className="eyebrow">Your phrase</span><span>{noteHistory.length} notes</span></div><div className="timeline" aria-label={`Recent notes: ${noteHistory.map((note) => note.label).join(', ')}`}>{noteHistory.map((note, index) => <i key={`${note.pitch}-${index}`} style={{ height: 22 + keyboardNotes.findIndex((item) => item.label === note.label) * 6, background: note.color }}><span>{note.label}</span></i>)}</div></section>
          <button className={`accompaniment ${accompaniment ? 'on' : ''}`} onClick={() => void toggleAccompaniment()}><span><Sparkles size={14} /> Accompaniment</span><strong>{accompaniment ? 'On' : 'Off'}</strong></button>
        </aside>
      </section>

      {showHelp && <div className="help-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}><button className="close-help" aria-label="Close instructions" onClick={() => setShowHelp(false)}><X size={18} /></button><span className="help-icon"><Hand size={24} /></span><p className="eyebrow">Your first minute</p><h2 id="help-title">Play before you know how.</h2><ol><li><span>1</span><div><strong>Start anywhere</strong><p>Press a string or key. Every harp note belongs to C major pentatonic.</p></div></li><li><span>2</span><div><strong>Try the camera</strong><p>Show one hand, move sideways to choose a note, then pinch to pluck it.</p></div></li><li><span>3</span><div><strong>Read what you hear</strong><p>The guide names the chord and explains how your note fits inside it.</p></div></li></ol><button className="got-it" onClick={() => setShowHelp(false)}>Let me play</button></section></div>}
    </main>
  )
}

export default App
