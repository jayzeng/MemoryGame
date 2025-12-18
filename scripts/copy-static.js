import fs from 'fs/promises';
import path from 'path';

const repoRoot = path.resolve(process.cwd());
const distDir = path.resolve(repoRoot, 'dist');
const filesToCopy = ['squishmallows.json', 'metadata.json'];

async function copyAssets() {
  await fs.mkdir(distDir, { recursive: true });
  await Promise.all(
    filesToCopy.map(async (fileName) => {
      const source = path.resolve(repoRoot, fileName);
      const destination = path.resolve(distDir, fileName);
      await fs.copyFile(source, destination);
    })
  );
}

copyAssets().catch((error) => {
  console.error('📦 Failed to copy static data files:', error);
  process.exit(1);
});
