/**
 * Folds the FILE_BUILD output into a single self-contained index.html.
 *
 * Browsers refuse to load external ES-module scripts from a file:// URL, but
 * an *inline* module runs fine, so inlining the one chunk is what makes the
 * offline copy work by double-click. Images stay as sibling files: <img src>
 * is not CORS-checked, and ExerciseImage falls back to a direct src when
 * fetch() is unavailable, which is exactly the file:// case.
 */
import { readFile, writeFile, rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const dir = 'dist-file'
const htmlPath = join(dir, 'index.html')
let html = await readFile(htmlPath, 'utf8')

const assets = await readdir(join(dir, 'assets'))
const js = assets.filter((f) => f.endsWith('.js'))
const css = assets.filter((f) => f.endsWith('.css'))

if (js.length !== 1) {
  throw new Error(`expected exactly one JS chunk to inline, found ${js.length}: ${js.join(', ')}`)
}

for (const file of css) {
  const code = await readFile(join(dir, 'assets', file), 'utf8')
  const tag = new RegExp(`\\s*<link[^>]+href="\\./assets/${file}"[^>]*>`)
  if (!tag.test(html)) throw new Error(`could not find the <link> for ${file}`)
  // A replacer function, not a string: minified code contains $& and $` runs
  // that String.replace would otherwise expand.
  html = html.replace(tag, () => `\n    <style>${code}</style>`)
}

for (const file of js) {
  const code = await readFile(join(dir, 'assets', file), 'utf8')
  const tag = new RegExp(`\\s*<script[^>]+src="\\./assets/${file}"[^>]*></script>`)
  if (!tag.test(html)) throw new Error(`could not find the <script> for ${file}`)
  // A literal </script> inside a string would close the tag early.
  const safe = code.replace(/<\/script/gi, '<\\/script')
  html = html.replace(tag, () => `\n    <script type="module">${safe}</script>`)
}

if (html.includes('./assets/')) {
  throw new Error('an asset reference survived inlining; the page would break offline')
}

await writeFile(htmlPath, html)
await rm(join(dir, 'assets'), { recursive: true, force: true })

const bytes = Buffer.byteLength(html)
console.log(`inlined ${js.length} script + ${css.length} stylesheet into ${htmlPath} (${(bytes / 1024).toFixed(0)} kB)`)
