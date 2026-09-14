import { expect, test } from '@playwright/test'

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
})
