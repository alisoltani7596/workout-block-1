/**
 * Loads dist-file/index.html over a real file:// URL in the installed Chrome
 * and asserts the page actually boots: no page errors, the day title renders,
 * and an exercise frame decodes from disk.
 */
import puppeteer from 'puppeteer-core'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const url = pathToFileURL(resolve('dist-file/index.html')).href

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files=false'],
})

const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844 })

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url().split('/').slice(-3).join('/')} ${r.failure()?.errorText}`))

await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForSelector('h1', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 2500))

const result = await page.evaluate(() => {
  const img = document.querySelector('main img')
  return {
    title: document.querySelector('h1')?.textContent ?? null,
    tabs: [...document.querySelectorAll('nav button')].map((b) => b.textContent.trim()),
    exerciseRows: document.querySelectorAll('main ul > li').length,
    imgSrc: img?.getAttribute('src')?.slice(0, 60) ?? null,
    imgDecoded: img ? img.naturalWidth > 0 : false,
    localStorageWorks: (() => {
      try {
        localStorage.setItem('__probe', '1')
        const ok = localStorage.getItem('__probe') === '1'
        localStorage.removeItem('__probe')
        return ok
      } catch {
        return false
      }
    })(),
    horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }
})

// Second pass: kill fetch and IndexedDB outright, the way a locked-down
// browser would, and confirm the plain <img src> fallback still draws.
const bare = await browser.newPage()
await bare.evaluateOnNewDocument(() => {
  window.fetch = () => Promise.reject(new Error('blocked'))
  // @ts-expect-error deliberately removing the API
  delete window.indexedDB
})
await bare.goto(url, { waitUntil: 'load', timeout: 30000 })
await bare.waitForSelector('main img', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 2000))
const fallback = await bare.evaluate(() => {
  const img = document.querySelector('main img')
  return { src: img?.getAttribute('src') ?? null, decoded: img ? img.naturalWidth > 0 : false }
})

await browser.close()

// requestfailed fires for the fetch() attempts that file:// blocks by design;
// the <img> fallback is what has to work, so those are expected.
const fatal = errors.filter((e) => !e.startsWith('requestfailed'))
console.log(JSON.stringify({ url, result, fallback, fatal, blockedFetches: errors.filter((e) => e.startsWith('requestfailed')).length }, null, 2))

const ok =
  fatal.length === 0 &&
  result.title &&
  result.exerciseRows > 0 &&
  result.imgDecoded &&
  result.localStorageWorks &&
  !result.horizontalScroll &&
  fallback.decoded
console.log(ok ? '\nPASS: the single-file build runs from file://' : '\nFAIL')
process.exit(ok ? 0 : 1)
