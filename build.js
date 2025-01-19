import ncc from '@vercel/ncc';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Builds the GitHub Action using @vercel/ncc
 * This process bundles all dependencies and transpiles TypeScript
 * into a single file that can be run by GitHub Actions.
 */
async function build() {
  console.log('Starting GitHub Action build...');

  try {
    // Ensure dist directory exists
    mkdirSync('dist', { recursive: true });

    // Bundle the action with all its dependencies
    const { code, map, assets } = await ncc(`${__dirname}/src/index.ts`, {
      minify: true,      // Minimize the output
      sourceMap: false,  // No source maps in production
      cache: false,      // Disable caching for clean builds
      target: 'es2020',  // Target modern Node.js
      externals: [],     // Include all dependencies in the bundle
    });

    // Write the bundled code to dist/index.js
    writeFileSync('dist/index.js', code);

    // If there are any assets, copy them to dist
    if (Object.keys(assets).length > 0) {
      for (const [filename, asset] of Object.entries(assets)) {
        const targetPath = `dist/${filename}`;
        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, asset.source);
      }
    }

    console.log('✓ Build completed successfully!');
    console.log('Output: dist/index.js');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build().catch(err => {
  console.error('Fatal build error:', err);
  process.exit(1);
});