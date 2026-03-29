#!/usr/bin/env node
/**
 * Nylongerie Series Linker
 * 
 * Links screenshots (with handles) to adjacent content images.
 * Propagates handle/model_name from screenshot → nearby content.
 * 
 * Logic:
 * - Sort all files alphabetically
 * - Screenshot → next N content images = one series
 * - Stop at next screenshot or gap >10 files
 * - Add linkedFrom field to content images
 * - Create model-series.json index
 * 
 * Usage:
 *   node nylongerie-series-link.js
 */

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results.json');
const SERIES_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'model-series.json');

function main() {
  if (!fs.existsSync(RESULTS_FILE)) {
    console.error('❌ classify-results.json not found. Run classify script first.');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  console.log(`\n🔗 Series Linking: ${results.length} files\n`);

  // Sort by filename (alphabetical = chronological for iPhone photos)
  results.sort((a, b) => {
    const fa = a.filename || a.file || '';
    const fb = b.filename || b.file || '';
    return fa.localeCompare(fb);
  });

  const series = [];
  let currentSeries = null;
  let linkedCount = 0;
  let screenshotsWithHandles = 0;

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const filename = item.filename || item.file;

    if (item.type === 'screenshot') {
      // Start new series if screenshot has a handle
      if (item.handle && item.handle !== 'null' && item.handle.match(/@[\w.]+/)) {
        if (currentSeries) {
          series.push(currentSeries);
        }
        
        currentSeries = {
          screenshot: filename,
          handle: item.handle,
          model_name: item.model_name || item.handle.replace('@', ''),
          content: []
        };
        
        screenshotsWithHandles++;
        console.log(`📱 SCREENSHOT: ${filename} → ${item.handle}`);
      } else {
        // Screenshot without handle = end current series
        if (currentSeries) {
          series.push(currentSeries);
          currentSeries = null;
        }
      }
    } else if (item.type === 'content' && currentSeries) {
      // Add content to current series
      currentSeries.content.push(filename);
      
      // Propagate handle to content item
      item.linkedFrom = currentSeries.screenshot;
      item.handle = currentSeries.handle;
      item.model_name = currentSeries.model_name;
      
      linkedCount++;
      console.log(`   └─ ${filename} (linked to ${currentSeries.handle})`);
      
      // Stop series after 15 content images (safety limit)
      if (currentSeries.content.length >= 15) {
        series.push(currentSeries);
        currentSeries = null;
      }
    }
  }

  // Close last series
  if (currentSeries) {
    series.push(currentSeries);
  }

  // Filter out empty series
  const validSeries = series.filter(s => s.content.length > 0);

  // Stats
  const uniqueHandles = new Set(validSeries.map(s => s.handle)).size;
  const totalContent = validSeries.reduce((sum, s) => sum + s.content.length, 0);

  console.log(`\n✅ SERIES LINKING COMPLETE`);
  console.log(`   Screenshots with handles: ${screenshotsWithHandles}`);
  console.log(`   Valid series created: ${validSeries.length}`);
  console.log(`   Unique models: ${uniqueHandles}`);
  console.log(`   Content images linked: ${linkedCount}`);
  console.log(`   Content images with credit: ${totalContent}`);

  // Save updated results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n💾 Updated: ${RESULTS_FILE}`);

  // Save series index
  fs.writeFileSync(SERIES_FILE, JSON.stringify(validSeries, null, 2));
  console.log(`💾 Created: ${SERIES_FILE}`);

  // Summary by style
  const byStyle = {};
  results
    .filter(r => r.linkedFrom && r.type === 'content')
    .forEach(r => {
      const style = r.style || 'other';
      byStyle[style] = (byStyle[style] || 0) + 1;
    });

  console.log(`\n📊 Postable content by style:`);
  Object.entries(byStyle)
    .sort((a, b) => b[1] - a[1])
    .forEach(([style, count]) => {
      console.log(`   ${style}: ${count}`);
    });

  console.log(`\n⚡ Next: Ready to create posts!\n`);
}

main();
