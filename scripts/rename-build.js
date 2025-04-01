// Script to rename problematic files, build, and restore
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Files to temporarily rename
const problematicFiles = [
  'src/components/admin/AdminLayout.astro'
];

// Rename files by adding a .tmp extension
const renameFiles = () => {
  console.log('🔄 Renaming problematic files...');

  problematicFiles.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const tempPath = `${filePath}.tmp`;
      fs.renameSync(filePath, tempPath);
      console.log(`✅ Renamed ${file} to ${file}.tmp`);
    } else {
      console.log(`⚠️ File not found: ${file}`);
    }
  });
};

// Restore original filenames
const restoreFiles = () => {
  console.log('🔄 Restoring original filenames...');

  problematicFiles.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    const tempPath = `${filePath}.tmp`;

    if (fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, filePath);
      console.log(`✅ Restored ${file}`);
    } else {
      console.log(`⚠️ Temp file not found: ${tempPath}`);
    }
  });
};

// Run the build
const runBuild = () => {
  return new Promise((resolve, reject) => {
    console.log('🚀 Running Astro build...');

    const buildProcess = exec('astro build', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Build failed with error: ${error.message}`);
        reject(error);
        return;
      }

      console.log(stdout);
      if (stderr) console.error(stderr);
      console.log('✅ Build completed successfully');
      resolve();
    });

    buildProcess.stdout.pipe(process.stdout);
    buildProcess.stderr.pipe(process.stderr);
  });
};

// Main process
const main = async () => {
  try {
    renameFiles();
    await runBuild();
    process.exit(0);
  } catch (error) {
    console.error('Build process failed:', error);
    process.exit(1);
  } finally {
    restoreFiles();
  }
};

main();
