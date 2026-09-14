# AirJam Product Plan

## Product vision

AirJam is a camera-based musical instrument and learning tool for people who do not yet know how to play a traditional instrument.

Players make music by moving their hands and fingers in front of a webcam. The app interprets those movements with computer vision, turns them into expressive musical events, and helps the result sound intentional through scales, rhythm assistance, chords, and accompaniment.

The long-term product should support both:

- **Air instruments:** No physical instrument is required. Gestures act as invisible keys, strings, drum pads, or controls.
- **Real instruments:** The camera observes a physical keyboard, drum surface, guitar, or similar instrument and adds guidance, feedback, effects, or accompaniment.

The experience should feel like an instrument first and a lesson second. A new player should be able to make something enjoyable immediately, then gradually understand the notes, chords, rhythm, and musical patterns behind it.

## Product principles

1. **Sound good immediately.** A beginner should make satisfying music during the first session.
2. **Teach through play.** Explanations should connect directly to sounds and gestures the player just made.
3. **Preserve expression.** Musical assistance should correct frustrating mistakes without making every performance feel identical.
4. **Make the invisible visible.** The interface should clearly show what gesture was detected and what musical event it produced.
5. **Keep the camera private.** Hand tracking should happen on the user's device whenever possible.
6. **Design for low latency.** Sound should respond quickly enough that gestures feel connected to notes.

## Initial product experience

The recommended first instrument is an **Air Harp** with an on-screen piano keyboard and live chord display.

The player:

1. Opens the web app and grants camera access.
2. Completes a short hand-position and sensitivity calibration.
3. Selects a mood or musical style, such as dreamy, energetic, calm, or jazzy.
4. Moves a hand horizontally to select notes.
5. Pinches the thumb and index finger to pluck a note.
6. Moves vertically or changes gesture speed to shape the sound.
7. Sees the related piano key, note name, scale degree, and chord information.
8. Plays over optional drums, bass, and chord accompaniment.
9. Records, loops, and replays the performance.

The Air Harp is the best starting point because it does not require a surface, uses hand landmarks naturally, and can be expressive with a small gesture vocabulary.

## Initial gesture vocabulary

| Gesture | Musical action |
| --- | --- |
| Thumb-index pinch | Pluck or trigger a note |
| Move left or right | Select pitch |
| Move up or down | Change intensity, register, or tone |
| Move quickly or slowly | Affect note velocity or expression |
| Open palm | Sustain the current note or chord |
| Closed fist | Mute or stop sound |
| Second-hand swipe | Strum a generated chord |

Gestures should be converted into semantic musical events such as `noteStart`, `noteEnd`, `strum`, `sustain`, and `expression`. The audio engine should consume these events without depending directly on camera or landmark data.

## Learning experience

Every musical gesture can provide optional, immediate feedback:

- Note name, such as C, F-sharp, or B-flat
- Corresponding highlighted piano key
- Current scale and key
- Scale degree, such as root, third, or fifth
- Detected or generated chord name
- Notes contained in the current chord
- Rhythm position on a scrolling timeline
- Suggested notes or chords that could come next
- Short contextual explanations, such as why a note feels stable or tense

### Learning modes

#### Free Play

The player improvises without interruption. The app labels notes and chords and records useful musical patterns in the background.

#### Guided Jam

The app offers flexible prompts such as:

- Play any highlighted note.
- Hold this chord with an open palm.
- Move toward G.
- Strum on the next pulse.

Multiple answers can be correct so the experience remains playful.

#### Learn a Song

Notes or chords approach on a timeline. The app demonstrates the required gesture, waits when necessary, and gradually removes visual assistance as the player improves.

#### Music Explorer

Interactive lessons demonstrate concepts including:

- Major and minor tonality
- Chord construction
- Scales and keys
- Rhythm and tempo
- Musical tension and resolution

### Visual language

A consistent color system should connect gesture space, the piano keyboard, chord diagrams, and the note timeline:

- Root note: gold
- Stable chord tones: blue
- Other notes in the selected scale: white
- Notes outside the scale: dimmed
- Suggested next note: softly pulsing

### Assistance levels

- **Safe Notes:** Gestures are mapped to notes in the selected scale so improvisation remains harmonious.
- **True Notes:** The complete chromatic range is available, including tension, dissonance, and mistakes.

The intended learning progression is:

> Make enjoyable sounds -> recognize note names -> recognize patterns -> form chords -> understand keys -> play songs intentionally

## Interface concept

The main performance screen should contain:

- Camera feed with hand landmarks and gesture feedback
- Invisible strings or playable regions overlaid on the camera
- Current note and chord display
- Suggestions for possible next chords or notes
- On-screen piano keyboard that illuminates as notes play
- Key, scale, tempo, and style controls
- Scrolling note and rhythm history
- Accompaniment, loop, record, and playback controls

Example layout:

```text
+--------------------------------------------------+
| Song: First Light          Key: C major   92 BPM |
+-----------------------------+--------------------+
|                             | Current chord      |
| Camera, hands, landmarks,   | C MAJOR            |
| and gesture guides          | C - E - G          |
|                             | Next: F or Am      |
+-----------------------------+--------------------+
|       C  D  E  F  G  A  B  C                     |
|       On-screen piano keyboard                    |
+--------------------------------------------------+
| Note and rhythm timeline                          |
+--------------------------------------------------+
```

## Technical architecture

```text
Webcam
  -> MediaPipe hand landmarks
  -> Gesture state machine
  -> Musical event layer
  -> Music intelligence
  -> Browser audio engine
  -> Speakers and recording
```

### Proposed stack

- React and TypeScript
- Vite for the initial client-only application
- MediaPipe Tasks Vision for hand landmark tracking
- Tone.js on top of the Web Audio API for synthesis, samples, timing, and effects
- Canvas for landmarks, strings, zones, and other camera overlays
- Zustand or a small event store for shared application state
- IndexedDB for local settings, loops, and recordings
- Optional local OSC bridge for Sonic Pi integration later

### System boundaries

#### Vision layer

- Captures webcam frames
- Detects one or two hands and their landmarks
- Normalizes coordinates relative to a calibrated playing area
- Reports tracking confidence and hand visibility

#### Gesture layer

- Recognizes pinch, release, swipe, open palm, and closed fist states
- Uses smoothing, thresholds, hysteresis, cooldowns, and confidence checks
- Emits stable gesture events instead of raw coordinates

#### Musical intelligence layer

- Maps positions to pitches and scale degrees
- Constrains notes to a selected scale when Safe Notes is enabled
- Applies optional beat quantization
- Generates chords, bass, and accompaniment
- Separates pitch selection from timbre and expression

#### Audio layer

- Schedules sound with consistent timing
- Plays synthesizers and sampled instruments
- Supports sustained notes, velocity, filters, and effects
- Records loops and complete performances

#### Learning layer

- Converts musical events into note, key, chord, and rhythm feedback
- Tracks lesson or song progress
- Adjusts the amount of guidance over time

## Sonic Pi strategy

Sonic Pi should not be required for the first version. Requiring a separate desktop installation and local communication would add setup friction before the core interaction is proven.

It can be added later as an optional advanced output:

```text
Gesture events -> local OSC bridge -> Sonic Pi -> synths and samples
```

This would support live coding, custom Sonic Pi instruments, and more advanced performances while preserving the browser-based beginner experience.

## Delivery roadmap

### Phase 1: Musical proof of concept

Goal: determine whether playing with hand gestures feels responsive and enjoyable.

- Webcam permission and preview
- Single-hand landmark overlay
- Pinch detection with clear visual feedback
- Horizontal position mapped to a pentatonic scale
- Pinch-to-play using one pleasant synth or sampled instrument
- Basic camera and gesture calibration
- Highlighted on-screen piano keyboard
- Current note name and short note history

### Phase 2: Make it musical

Goal: make untrained gestures produce coherent performances.

- Key and scale selection
- Safe Notes and True Notes modes
- Gesture speed mapped to velocity
- Vertical movement mapped to expression
- Optional beat quantization
- Chord generation
- Automatic bass and drum accompaniment
- Gesture smoothing and accidental-trigger prevention
- Loop recording and overdubbing
- Performance recording and export

### Phase 3: Add structured learning

Goal: help players understand what they are producing.

- Live chord detection and chord-tone display
- Scale-degree colors across the interface
- Guided Jam prompts
- Beginner lessons for notes, scales, chords, and rhythm
- Simple song-following mode
- Progress tracking stored locally
- Adjustable assistance and explanation levels

### Phase 4: Add more air instruments

- Air Piano
- Air Drums
- Air Guitar
- Custom gesture-to-sound mappings

Each instrument should use the shared gesture-event and music-intelligence layers while providing its own spatial mapping and visual presentation.

### Phase 5: Support real instruments

Begin with stationary instruments that can be calibrated reliably:

- User-defined keyboard or drum regions
- Perspective-corrected playable zones
- Fingertip-to-key or fingertip-to-pad mapping
- Optional microphone input to confirm physical notes
- Effects, harmonies, visual guidance, and accompaniment

Moving instruments, particularly guitars, should follow after stationary calibration works well.

### Phase 6: Advanced integrations

- Sonic Pi output through a local OSC bridge
- MIDI output to hardware and music software
- Shareable performances and loops
- Community-created instruments or gesture mappings
- More sophisticated adaptive accompaniment

## Major technical risks

### Accidental notes

Hand detection alone is not enough. The gesture layer needs explicit start, active, and release states plus hysteresis and cooldowns to prevent noisy landmarks from retriggering notes.

### Perceived latency

Camera inference, gesture processing, and audio scheduling all contribute to latency. The prototype should measure the time from gesture recognition to scheduled sound and avoid unnecessary React rendering in that path.

### Occlusion and lighting

Hands may overlap or disappear in poor lighting. The interface should expose tracking confidence, provide setup guidance, and recover gracefully rather than emitting unpredictable notes.

### Musical assistance that feels restrictive

Quantization and scale correction must be adjustable. The product should help beginners without erasing timing, dynamics, and intentional tension.

### Real-instrument calibration

A normal webcam does not automatically understand every physical instrument. Early real-instrument modes should use explicit calibration and constrained instrument layouts.

## Initial success criteria

The first prototype succeeds if a new player can:

- Start playing within one minute of granting camera access
- Reliably trigger intended notes without frequent accidental notes
- Hear sound quickly enough that gestures feel connected to it
- Create a short phrase that sounds coherent without knowing music theory
- Identify the notes and at least one chord they produced
- Record and replay a short performance
- Describe the interaction as enjoyable enough to try again

## Decisions to make together

1. Final product name and visual personality
2. Desktop-first or mobile-first target
3. Whether Air Harp remains the first instrument
4. Preferred initial musical style and sound palette
5. How strongly Safe Notes should correct the player's input
6. Whether learning content should feel game-like, lesson-like, or mostly invisible
7. Whether accounts and cloud sharing belong in the early product

## Recommended immediate milestone

Build a single-screen Air Harp prototype with:

- One-hand MediaPipe tracking
- Pinch-to-pluck interaction
- A C-major pentatonic pitch map
- On-screen strings and piano keys
- Live note names
- A simple Tone.js instrument
- Gesture stability and latency measurements

This milestone deliberately tests the most uncertain and valuable part of the idea: whether moving a hand through empty space can feel like playing a responsive musical instrument.
