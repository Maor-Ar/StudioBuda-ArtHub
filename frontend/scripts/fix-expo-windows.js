// Fix for Expo Windows node:sea directory issue
const fs = require('fs');
const path = require('path');

const externalsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'cli',
  'dist',
  'start',
  'server',
  'metro',
  'externals.js'
);

if (fs.existsSync(externalsPath)) {
  let content = fs.readFileSync(externalsPath, 'utf8');
  
  // Replace node:sea with node_sea to avoid Windows path issues
  if (content.includes('node:sea')) {
    content = content.replace(/node:sea/g, 'node_sea');
    fs.writeFileSync(externalsPath, content, 'utf8');
    console.log('✅ Fixed Expo Windows issue');
  }
} else {
  console.log('⚠️  Could not find externals.js to patch');
}

