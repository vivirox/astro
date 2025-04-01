// Script to build the project without admin components
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Files to temporarily replace
const replacements = [
  {
    path: 'src/components/admin/AdminLayout.astro',
    content: `---
// This is a placeholder component used during the build process
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<div>
  <h1>{title}</h1>
  <slot />
</div>
`
  },
  {
    path: 'src/components/security/FHEDemo.astro',
    content: `---
// This is a placeholder component used during the build process
---

<div>
  <h2>FHE Demo Placeholder</h2>
  <p>This is a placeholder for the FHE demo component.</p>
</div>
`
  }
];

// Array of pages to skip entirely (we'll rename them)
const pagesToSkip = [
  'src/pages/admin/users.astro',
  'src/pages/admin/index.astro',
  'src/pages/admin/security-dashboard.astro',
  'src/pages/security/fhe-demo.astro',
];

// Backup files
const backupAndReplaceFiles = () => {
  console.log('🔄 Backing up and replacing files...');

  // First, back up and replace the components
  replacements.forEach(({ path: filePath, content }) => {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const backupPath = `${fullPath}.backup`;
      fs.copyFileSync(fullPath, backupPath);
      console.log(`✅ Backed up ${filePath}`);

      fs.writeFileSync(fullPath, content);
      console.log(`✅ Replaced ${filePath} with placeholder`);
    } else {
      console.log(`⚠️ File not found: ${filePath}`);
    }
  });

  // Now, temporarily rename pages to skip
  pagesToSkip.forEach(pagePath => {
    const fullPath = path.resolve(process.cwd(), pagePath);
    if (fs.existsSync(fullPath)) {
      const skipPath = `${fullPath}.skip`;
      fs.renameSync(fullPath, skipPath);
      console.log(`✅ Temporarily skipped ${pagePath}`);
    } else {
      console.log(`⚠️ Page not found: ${pagePath}`);
    }
  });
};

// Restore files after build
const restoreFiles = () => {
  console.log('🔄 Restoring original files...');

  // Restore components
  replacements.forEach(({ path: filePath }) => {
    const fullPath = path.resolve(process.cwd(), filePath);
    const backupPath = `${fullPath}.backup`;

    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, fullPath);
      fs.unlinkSync(backupPath);
      console.log(`✅ Restored ${filePath}`);
    } else {
      console.log(`⚠️ Backup not found for: ${filePath}`);
    }
  });

  // Restore pages
  pagesToSkip.forEach(pagePath => {
    const fullPath = path.resolve(process.cwd(), pagePath);
    const skipPath = `${fullPath}.skip`;

    if (fs.existsSync(skipPath)) {
      fs.renameSync(skipPath, fullPath);
      console.log(`✅ Restored ${pagePath}`);
    } else {
      console.log(`⚠️ Skipped file not found: ${skipPath}`);
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
    backupAndReplaceFiles();
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
