#!/usr/bin/env node

/**
 * Environment compatibility check script
 * Ensures that the local environment is compatible with project requirements
 */

const nodeMajorVersion = parseInt(process.versions.node.split('.')[0], 10);
const requiredNodeVersion = 20;
const platform = process.platform;
const arch = process.arch;

console.log(`\n📊 Environment Check`);
console.log(`Node.js version: ${process.versions.node}`);
console.log(`Platform: ${platform}-${arch}`);

// Check Node.js version
if (nodeMajorVersion !== requiredNodeVersion) {
  console.warn(`\n⚠️  WARNING: Node.js version mismatch`);
  console.warn(`Current Node.js version: ${nodeMajorVersion}`);
  console.warn(`Required Node.js version: ${requiredNodeVersion}`);
  console.warn(`This project is configured to work with Node.js ${requiredNodeVersion}.`);
  console.warn(`Consider using nvm to switch versions: nvm use ${requiredNodeVersion}`);
}

// Check for known platform-specific issues
if (platform === 'darwin' && arch === 'arm64') {
  console.log(`\n🧪 macOS Apple Silicon (M1/M2/M3) detected`);
  console.log(`Some native dependencies may require special handling.`);

  // Known issue with pagefind on macOS ARM64
  console.log(`\n📚 Pagefind Compatibility:`);
  console.log(`Pagefind is not currently supported on ${platform}-${arch}.`);
  console.log(`We've implemented a workaround using flexsearch instead.`);
}

console.log(`\n✅ Environment check completed\n`);
