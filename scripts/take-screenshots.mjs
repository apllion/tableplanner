#!/usr/bin/env node
/**
 * Automated screenshot tool for help page images.
 * Usage: node scripts/take-screenshots.mjs [base-url]
 * Default: http://localhost:5173/tableplanner/
 *
 * Saves screenshots to public/help/
 */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'help')
const BASE = process.argv[2] || 'http://localhost:5173/tableplanner/'

const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 }

const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function shot(page, name) {
  const file = path.join(OUT_DIR, name)
  await page.screenshot({ path: file, type: 'jpeg', quality: 85 })
  console.log(`  saved ${name}`)
}

async function clickByText(page, text) {
  await page.evaluate((t) => {
    for (const el of document.querySelectorAll('button, a')) {
      if (el.textContent.trim() === t) { el.click(); return }
    }
  }, text)
  await wait(600)
}

async function main() {
  console.log(`Taking screenshots from ${BASE}`)
  console.log(`Saving to ${OUT_DIR}\n`)

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport(VIEWPORT)

  // 1. Join screen
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('disclaimerAccepted', 'true')
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await shot(page, '01-join.jpg')

  // Login as Anna
  await page.evaluate(() => {
    localStorage.setItem('table-planer-identity', JSON.stringify({
      playerId: 'p1-anna', displayName: 'Anna'
    }))
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(1500)

  // 2. My Games calendar (default view)
  await shot(page, '02-my-calendar.jpg')

  // 3. All Games calendar
  await clickByText(page, 'All Games')
  await shot(page, '03-all-calendar.jpg')

  // 4. List view
  await clickByText(page, 'List')
  await shot(page, '04-list.jpg')

  // 5. Create Game — go to calendar and click empty slot
  await clickByText(page, 'All Games')
  await page.evaluate(() => {
    const slots = document.querySelectorAll('[class*="slot"]')
    for (const s of slots) {
      if (s.querySelector('[class*="empty"]')) { s.click(); return }
    }
  })
  await wait(600)
  await shot(page, '05-create.jpg')

  // Close create modal
  await page.keyboard.press('Escape')
  await wait(400)

  // 6. Game Detail — click Catan in list
  await clickByText(page, 'List')
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('button')) {
      if (el.textContent.includes('Catan')) { el.click(); return }
    }
  })
  await wait(600)
  await shot(page, '06-detail.jpg')

  // Close detail modal
  await page.keyboard.press('Escape')
  await wait(400)

  // 7. Players
  await clickByText(page, 'Players')
  await shot(page, '07-players.jpg')

  // 8. Export menu
  await clickByText(page, 'Export')
  await wait(400)
  await shot(page, '08-export.jpg')

  await browser.close()
  console.log('\nDone! Screenshots saved to public/help/')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
