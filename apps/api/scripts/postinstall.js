#!/usr/bin/env node
const { execSync } = require('child_process');

// Skip prisma generate in Vercel or CI environments
if (process.env.VERCEL || process.env.CI) {
  console.log('Skipping prisma generate in build environment');
  process.exit(0);
}

// Skip if DATABASE_URL is not set (likely not Railway)
if (!process.env.DATABASE_URL && !process.env.RAILWAY_ENVIRONMENT) {
  console.log('Skipping prisma generate (no DATABASE_URL)');
  process.exit(0);
}

try {
  console.log('Running prisma generate...');
  execSync('prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to run prisma generate:', error.message);
  // Don't fail the build, just warn
  console.warn('Continuing without prisma generate...');
  process.exit(0);
}

