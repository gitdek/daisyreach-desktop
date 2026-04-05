// build.mjs — Compile main process TypeScript with esbuild
import * as esbuild from 'esbuild'

const isWatch = process.argv.includes('--watch')

async function buildMain() {
  const entryPoints = [
    'src/main/index.ts',    // Bundles bridge + ipc into one file
    'src/main/preload.ts',  // Separate — must be isolated
  ]

  if (isWatch) {
    const ctx = await esbuild.context({
      entryPoints,
      bundle: true,
      outdir: 'dist/main',
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      sourcemap: true,
      external: ['electron'],
    })
    await ctx.watch()
    console.log('[build] Watching main process...')
  } else {
    await esbuild.build({
      entryPoints,
      bundle: true,
      outdir: 'dist/main',
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      sourcemap: true,
      external: ['electron'],
    })
    console.log('[build] Main process compiled')
  }
}

buildMain().catch((err) => {
  console.error(err)
  process.exit(1)
})
