// Builds the website into dist-next/ and only then swaps it in for dist/ — so visitors never see a half-built
// site while a build runs (a plain `npm run build` empties dist/ first and takes ~30 s).
//
//   npm run release
//
// Steps: snapshot (content from the API) → sitemap / llms / feed → client build → SSR build → pre-render
// → swap. If any step fails, dist/ is left exactly as it was and the exit code is 1.
// The backend runs this same command when the admin publishes content (REBUILD_COMMAND), and the deploy
// workflow runs it after every push.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, renameSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const next = resolve(root, 'dist-next')
const live = resolve(root, 'dist')
const old = resolve(root, 'dist-old')

// Windows can hold a just-written folder for a moment (antivirus / indexer) → retry the rename briefly.
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
function move(from, to) {
  for (let attempt = 1; ; attempt++) {
    try {
      return renameSync(from, to)
    } catch (err) {
      if (attempt >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err
      sleep(500)
    }
  }
}

const run = (cmd, env = {}) => {
  console.log(`\n▶ ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })
}

const started = Date.now()
try {
  rmSync(next, { recursive: true, force: true })
  run('node scripts/fetch-snapshot.mjs')
  run('node scripts/generate-seo-files.mjs')
  run('npx vite build --outDir dist-next --emptyOutDir')
  run('npx vite build --ssr src/entry-server.jsx --outDir dist-ssr')
  run('node scripts/prerender.mjs', { DIST_DIR: 'dist-next' })

  // swap: two renames, so the site is never without a dist/
  rmSync(old, { recursive: true, force: true })
  const hadLive = existsSync(live)
  if (hadLive) move(live, old) // if this is refused nothing has changed yet and the release just fails
  try {
    move(next, live)
  } catch {
    // a rename that keeps being refused (some Windows setups): copy the new build into place instead
    cpSync(next, live, { recursive: true })
    rmSync(next, { recursive: true, force: true })
  }
  rmSync(old, { recursive: true, force: true })
  console.log(`\n✔ Released in ${((Date.now() - started) / 1000).toFixed(0)} s`)
} catch (err) {
  rmSync(next, { recursive: true, force: true })
  console.error(`\n✖ Release failed — the live site (dist/) was left as it was. ${err.message}`)
  process.exit(1)
}
