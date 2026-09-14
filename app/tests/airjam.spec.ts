import { expect, test, type Page } from '@playwright/test'

type HandPosition = { indexX: number; indexY: number; pinchDistance: number }
type Landmark = { x: number; y: number; z: number }
type ToneCall = { pitch: string; duration: string; time?: number; velocity: number }

declare global {
  interface Window {
    __airJamLandmarks: Landmark[]
    __runAirJamFrame: () => void
    __toneCalls: ToneCall[]
  }
}

const mediaPipeMock = `
  export class DrawingUtils {
    drawConnectors() {}
    drawLandmarks() {}
  }

  export const FilesetResolver = {
    forVisionTasks: async () => ({}),
  }

  export class HandLandmarker {
    static HAND_CONNECTIONS = []

    static async createFromOptions() {
      return {
        close() {},
        detectForVideo() {
          const landmarks = globalThis.__airJamLandmarks
          return { landmarks: landmarks ? [landmarks] : [] }
        },
      }
    }
  }
`

const toneMock = `
  const calls = globalThis.__toneCalls = []

  export const start = async () => {}
  export class Synth {}
  export class MonoSynth {}

  export class PolySynth {
    connect() { return this }
    toDestination() { return this }
    dispose() {}
    triggerAttackRelease(pitch, duration, time, velocity) {
      calls.push({ pitch, duration, time, velocity })
    }
  }

  export class Reverb {
    toDestination() { return this }
    dispose() {}
  }

  export class Recorder {
    async start() {}
    async stop() { return new Blob() }
    dispose() {}
  }

  export class Loop {
    start() { return this }
    stop() { return this }
    dispose() {}
  }

  export const getTransport = () => ({
    bpm: { value: 0 },
    start() {},
  })
`

async function installGestureHarness(page: Page) {
  await page.route('**/*mediapipe_tasks-vision*.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: mediaPipeMock,
  }))
  await page.route('**/tone.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: toneMock,
  }))
  await page.addInitScript(() => {
    const animationFrames = new Map<number, FrameRequestCallback>()
    const videoTimes = new WeakMap<HTMLMediaElement, number>()
    let nextAnimationFrame = 1

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => new MediaStream() },
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      configurable: true,
      get() { return videoTimes.get(this) ?? 0 },
      set(value: number) { videoTimes.set(this, value) },
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get: () => 4,
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      get: () => 1280,
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      get: () => 720,
    })
    HTMLMediaElement.prototype.play = async function () {
      videoTimes.set(this, 1)
    }
    window.requestAnimationFrame = (callback) => {
      const id = nextAnimationFrame++
      animationFrames.set(id, callback)
      return id
    }
    window.cancelAnimationFrame = (id) => animationFrames.delete(id)

    const openHand = Array.from({ length: 9 }, () => ({ x: 0, y: 0, z: 0 }))
    openHand[4] = { x: 0.7, y: 0.8, z: 0 }
    openHand[8] = { x: 0.9, y: 0.8, z: 0 }
    window.__airJamLandmarks = openHand

    window.__runAirJamFrame = () => {
      const nextFrame = animationFrames.entries().next().value
      if (!nextFrame) throw new Error('AirJam did not request another animation frame')
      const [id, callback] = nextFrame
      animationFrames.delete(id)
      const video = document.querySelector('video')
      if (!video) throw new Error('AirJam video element was not found')
      videoTimes.set(video, (videoTimes.get(video) ?? 0) + 1)
      callback(performance.now())
    }
  })
}

async function presentHand(page: Page, hand: HandPosition) {
  await page.evaluate(({ indexX, indexY, pinchDistance }) => {
    const landmarks = Array.from({ length: 9 }, () => ({ x: 0, y: 0, z: 0 }))
    landmarks[4] = { x: indexX - pinchDistance, y: indexY, z: 0 }
    landmarks[8] = { x: indexX, y: indexY, z: 0 }
    window.__airJamLandmarks = landmarks
    window.__runAirJamFrame()
  }, hand)
}

test.describe('AirJam beginner experience', () => {
  test('loads the playable instrument and learning guide', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle('AirJam — Learn music with your hands')
    await expect(page.getByRole('link', { name: 'AirJam instrument' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Reach in and pluck the light/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Use camera' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play C', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play A', exact: true })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Music guide' })).toContainText('Current harmony')
    await expect(page.getByText('Demo mode · press any string')).toBeVisible()
  })

  test('playing a harp string updates the note, harmony, and phrase', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Play G', exact: true }).click()

    await expect(page.getByRole('status')).toContainText('G played')
    await expect(page.locator('.chord-name')).toContainText('G')
    await expect(page.locator('.chord-explainer')).toContainText('The fifth creates lift')
    await expect(page.locator('.timeline-heading')).toContainText('4 notes')
    await expect(page.getByRole('button', { name: 'Play G4' })).toHaveClass(/active/)
  })

  test('piano keys drive the same teaching feedback', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Play A4' }).click()

    await expect(page.getByRole('status')).toContainText('A played')
    await expect(page.locator('.chord-name')).toContainText('A')
    await expect(page.locator('.chord-name')).toContainText('minor')
    await expect(page.locator('.chord-notes')).toContainText('A')
    await expect(page.locator('.chord-notes')).toContainText('C')
    await expect(page.locator('.chord-notes')).toContainText('E')
  })

  test('explains how to play in the help dialog', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'How to play' }).click()

    const dialog = page.getByRole('dialog', { name: 'Play before you know how.' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Show one hand')
    await expect(dialog).toContainText('names the chord')

    await dialog.getByRole('button', { name: 'Let me play' }).click()
    await expect(dialog).toBeHidden()
  })

  test('changes sound and exposes the full keyboard when Safe Notes is off', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Sound').selectOption('Warm keys')
    await expect(page.getByLabel('Sound')).toHaveValue('Warm keys')

    const safeNotes = page.getByRole('checkbox')
    await expect(safeNotes).toBeChecked()
    await page.getByText('Safe notes on').click()
    await expect(safeNotes).not.toBeChecked()
    await expect(page.getByRole('button', { name: 'Play F4' })).toHaveClass(/available/)
    await expect(page.getByText('Safe notes off')).toBeVisible()
  })

  test('starts and stops musical accompaniment', async ({ page }) => {
    await page.goto('/')

    const accompaniment = page.getByRole('button', { name: /Accompaniment/ })
    await accompaniment.click()
    await expect(accompaniment).toContainText('On')
    await expect(page.getByRole('status')).toContainText('C–Am–F–G progression')

    await accompaniment.click()
    await expect(accompaniment).toContainText('Off')
    await expect(page.getByRole('status')).toContainText('instrument is solo')
  })

  test('keeps demo mode available when camera APIs are unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    })
    await page.goto('/')

    await page.getByRole('button', { name: 'Use camera' }).click()

    await expect(page.getByText('Camera is unavailable in this browser')).toBeVisible()
    await page.getByRole('button', { name: 'Play E', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('E played')
  })

  test('maps tracked pinches to pitch and velocity without retriggering a held gesture', async ({ page }) => {
    await installGestureHarness(page)
    await page.goto('/')

    await page.getByRole('button', { name: 'Use camera' }).click()
    await expect(page.getByText('Hand found · pinch to pluck')).toBeVisible()

    await presentHand(page, { indexX: 0.9, indexY: 0.8, pinchDistance: 0.04 })
    await expect.poll(() => page.evaluate(() => window.__toneCalls.length)).toBe(1)
    await expect(page.getByRole('status')).toContainText('C played')

    await presentHand(page, { indexX: 0.9, indexY: 0.8, pinchDistance: 0.04 })
    await page.waitForTimeout(50)
    expect(await page.evaluate(() => window.__toneCalls.length)).toBe(1)

    await presentHand(page, { indexX: 0.9, indexY: 0.8, pinchDistance: 0.1 })
    await presentHand(page, { indexX: 0.1, indexY: 0.2, pinchDistance: 0.04 })
    await expect.poll(() => page.evaluate(() => window.__toneCalls.length)).toBe(2)
    await expect(page.getByRole('status')).toContainText('A played')

    const calls = await page.evaluate(() => window.__toneCalls)
    expect(calls.map(({ pitch }) => pitch)).toEqual(['C4', 'A4'])
    expect(calls[0].velocity).toBeCloseTo(0.64, 5)
    expect(calls[1].velocity).toBeCloseTo(0.91, 5)
  })
})
