import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/main/index.ts', 'src/main/preload.ts'],
  bundle: true,
  outdir: 'dist/main',
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  external: ['electron'],
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[esbuild] Watching main process...');
} else {
  await esbuild.build(buildOptions);
  console.log('[esbuild] Main process built');
}
