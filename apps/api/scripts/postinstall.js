#!/usr/bin/env node
const { execSync } = require('child_process');

// Skip prisma generate in Vercel environment
if (process.env.VERCEL) {
  console.log('Skipping prisma generate in Vercel environment');
  process.exit(0);
}

try {
  console.log('Running prisma generate...');
  execSync('prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to run prisma generate:', error.message);
  process.exit(1);
}

