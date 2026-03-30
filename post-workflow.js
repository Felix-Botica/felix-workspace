#!/usr/bin/env node
/**
 * Instagram Post Workflow - Hybrid Orchestrator
 * 
 * Orchestrates the complete post creation workflow:
 * 1. Select 5 images (checks banned, used, credits, variety, appeal)
 * 2. Generate drafts via nylongerie-create-batch.js
 * 3. Send Telegram previews with full captions
 * 4. Wait for go/no-go approval
 * 5. Publish approved posts via nylongerie-publish.js
 * 6. Record used images (90-day tracking)
 * 
 * Usage: node post-workflow.js [count]
 * Default: 5 posts
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Config
const CLASSIFY_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results.json');
const MODEL_SERIES_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'model-series.json');
const BANNED_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'banned-images.json');
const USED_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'used-images.json');
const QUEUE_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const FAKE_HANDLES_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'fake-handles.json');
const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

const ACCOUNTS_WITH_TEMPLATES = [
  '@nylondarling',
  '@legfashion', 
  '@shinynylonstar',
  '@blackshinynylon',
  '@nextdoornylon'
];

const POST_COUNT = parseInt(process.argv[2]) || 5;

// Load data
function loadJSON(filePath, defaultValue = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return defaultValue;
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Check if image was used recently (90 days)
function isRecentlyUsed(filename, usedImages) {
  if (!usedImages[filename]) return false;
  const usedDate = new Date(usedImages[filename].used_date);
  const now = new Date();
  const daysDiff = (now - usedDate) / (1000 * 60 * 60 * 24);
  return daysDiff < 90;
}

// Select images for posting
function selectImages(count) {
  console.log(`\n🔍 Selecting ${count} images for posting...`);
  
  const classified = loadJSON(CLASSIFY_FILE);
  const modelSeries = loadJSON(MODEL_SERIES_FILE);
  const bannedImages = loadJSON(BANNED_FILE, {});
  const usedImages = loadJSON(USED_FILE, {});
  const fakeHandles = loadJSON(FAKE_HANDLES_FILE, []);
  
  // Filter model series for REAL handles only
  const validHandlePattern = /^@[a-z0-9_.]+$/i;
  const realHandles = modelSeries.filter(m => 
    m.handle && 
    validHandlePattern.test(m.handle) &&
    !fakeHandles.includes(m.handle.toLowerCase())
  );
  
  // Filter: content, sex_appeal 7-8, has REAL model credit, not banned, not recently used
  const candidates = classified
    .filter(img => img.type === 'content')
    .filter(img => img.sex_appeal >= 7 && img.sex_appeal <= 8)
    .filter(img => !bannedImages[img.file])
    .filter(img => !isRecentlyUsed(img.file, usedImages))
    .map(img => {
      const modelEntry = realHandles.find(m => m.content && m.content.includes(img.file));
      return { ...img, model: modelEntry ? modelEntry.handle : null };
    })
    .filter(img => img.model); // Must have verified real credit
  
  console.log(`✅ Found ${candidates.length} eligible images`);
  
  if (candidates.length < count) {
    throw new Error(`Not enough eligible images! Need ${count}, found ${candidates.length}`);
  }
  
  // Select with variety (different styles, different models)
  const selected = [];
  const usedModels = new Set();
  const usedStyles = new Set();
  
  for (const img of candidates) {
    if (selected.length >= count) break;
    
    // Prefer variety
    if (usedModels.has(img.model) && candidates.length - selected.length > count - selected.length) continue;
    if (usedStyles.has(img.style) && candidates.length - selected.length > count - selected.length) continue;
    
    selected.push(img);
    usedModels.add(img.model);
    usedStyles.add(img.style);
  }
  
  // Assign accounts (max 1 per account)
  const accountAssignments = [];
  for (let i = 0; i < selected.length; i++) {
    accountAssignments.push(ACCOUNTS_WITH_TEMPLATES[i % ACCOUNTS_WITH_TEMPLATES.length]);
  }
  
  const selections = selected.map((img, i) => ({
    file: img.file,
    handle: img.model,
    account: accountAssignments[i],
    style: img.style,
    description: img.description
  }));
  
  console.log('\n📋 Selected images:');
  selections.forEach((sel, i) => {
    console.log(`  ${i + 1}. ${sel.file} → ${sel.account} (${sel.handle}, ${sel.style})`);
  });
  
  return selections;
}

// Create drafts via existing script
async function createDrafts(selections) {
  console.log('\n📝 Creating drafts via nylongerie-create-batch.js...');
  
  const selectionsFile = path.join(WORKSPACE, 'selections-temp.json');
  saveJSON(selectionsFile, selections);
  
  const { stdout, stderr } = await execPromise(
    `cd ${WORKSPACE} && node nylongerie-create-batch.js ${selectionsFile}`
  );
  
  console.log(stdout);
  if (stderr) console.error(stderr);
  
  // Read created drafts from queue.json
  const queue = loadJSON(QUEUE_FILE);
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const newDrafts = queue.filter(d => d.id && d.id.startsWith(`draft-${today}`) && d.status === 'draft_sent');
  
  console.log(`✅ Created ${newDrafts.length} drafts`);
  return newDrafts.slice(-selections.length); // Return last N drafts
}

// Send Telegram preview
async function sendPreview(draft, index) {
  console.log(`\n📤 Sending preview ${index + 1}/${POST_COUNT}: ${draft.account} / ${draft.model}`);
  
  // Download preview image
  const tempImage = `/tmp/preview-${draft.id}.jpg`;
  await execPromise(`curl -s -o ${tempImage} "${draft.preview_url}"`);
  
  // Prepare caption
  const header = `📸 POST ${index + 1}/${POST_COUNT} — ${draft.account} / ${draft.model}\n"${draft.caption_headline}"\n\n`;
  const footer = '\n\n✅ Reply "go" to approve, ❌ "no-go" to reject';
  const fullCaption = header + draft.caption + footer;
  
  // Send via OpenClaw CLI
  const cmd = `openclaw message send --channel telegram --target "-1003775282698:3" --media ${tempImage} --message ${JSON.stringify(fullCaption)}`;
  
  const { stdout } = await execPromise(cmd);
  const match = stdout.match(/Message ID: (\d+)/);
  const messageId = match ? match[1] : null;
  
  console.log(`✅ Sent (message_id: ${messageId})`);
  
  return messageId;
}

// Wait for approvals (simplified for now - manual check)
async function waitForApprovals(drafts) {
  console.log('\n⏳ Waiting for your approval...');
  console.log('Reply to each preview with "go" or "no-go"');
  console.log('\n💡 For now: After reviewing all previews, run the publish command manually.');
  console.log('   To publish approved drafts: node nylongerie-publish.js --batch');
  console.log('\n   (Automatic approval detection coming in next iteration)');
  
  // TODO: Implement approval detection via Telegram API or message polling
  // For now, user manually runs publish script after approving
}

// Update used-images tracker
function recordUsedImages(drafts) {
  console.log('\n📝 Recording used images...');
  
  const usedImages = loadJSON(USED_FILE, {});
  const today = new Date().toISOString().split('T')[0];
  
  drafts.forEach(draft => {
    usedImages[draft.file] = {
      used_date: today,
      accounts: [draft.account],
      type: 'post',
      post_id: draft.id
    };
  });
  
  saveJSON(USED_FILE, usedImages);
  console.log(`✅ Recorded ${drafts.length} images as used`);
}

// Main workflow
async function main() {
  try {
    console.log('🚀 Instagram Post Workflow Starting...');
    console.log(`Target: ${POST_COUNT} posts`);
    
    // Step 1: Select images
    const selections = selectImages(POST_COUNT);
    
    // Step 2: Create drafts
    const drafts = await createDrafts(selections);
    
    // Step 3: Send previews
    for (let i = 0; i < drafts.length; i++) {
      await sendPreview(drafts[i], i);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between messages
    }
    
    // Step 4: Wait for approvals (manual for now)
    await waitForApprovals(drafts);
    
    // Step 5: Record used images
    recordUsedImages(drafts);
    
    console.log('\n✅ Workflow complete!');
    console.log('Next: Review previews in Telegram and approve/reject');
    console.log('Then: node nylongerie-publish.js --batch');
    
  } catch (error) {
    console.error('\n❌ Workflow failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
