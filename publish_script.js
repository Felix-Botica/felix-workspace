require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.META_ACCESS_TOKEN;
const batch = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.openclaw', 'workspace', 'batch-0327-published.json'), 'utf8'));

const accountInfo = {
  '@nylondarling':    { ig_id: '17841429713561331' },
  '@legfashion':      { ig_id: '17841402884847036' },
  '@shinynylonstar':  { ig_id: '17841464191117228' },
  '@nextdoornylon':   { ig_id: '17841472299535162' },
  '@planetnylon':     { ig_id: '17841472009081615' }
};

function getCaption(post) {
  const commonHashtags = '#nylondarling #legfashion #nylongerie #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings';
  const accountSpecifics = {
    '@nylondarling':   { emoji: '🌹', intro: 'Introduced by Nylon Darling™ @nylondarling', tags: '#classynylons #nyloncherie #lifestyle' },
    '@legfashion':     { emoji: '🦵', intro: 'Featured by Leg Fashion™ @legfashion', tags: '#legwear #streetstyle' },
    '@shinynylonstar': { emoji: '✨', intro: 'Featured by Shiny Nylon Star™ @shinynylonstar', tags: '#shiny #glossy #nyloncherie' },
    '@nextdoornylon':  { emoji: '🌸', intro: 'Featured by Nextdoor Nylon™ @nextdoornylon', tags: '#casual #girlnextdoor' },
    '@planetnylon':    { emoji: '⚡', intro: 'Featured by Planet Nylon™ @planetnylon', tags: '#edgy #leather #vinyl' }
  };
  const spec = accountSpecifics[post.account];
  return `${post.account.substring(1)} ■ Shop @nylongerie ♡ Nylongerie.com
${post.caption_headline} ★ ${post.handle}
${spec.emoji}
${spec.intro}
•
Copyright © ${post.handle.substring(1)}, 2026
Legal notice: All copyrights belong to the model, brand or photographer. Published with permission. Reposting only with consent.
•
♥ Always tag ${post.account} and #${post.account.substring(1)}

${spec.tags} ${commonHashtags}

· ${spec.intro.split('™')[0]}™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.
□ Follow our other accounts!`;
}

async function publish(post) {
  const ig_id = accountInfo[post.account].ig_id;
  const caption = getCaption(post);

  // Step 1: Create container
  const createRes = await fetch(`https://graph.facebook.com/v25.0/${ig_id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image_url: post.r2_url, caption: caption, access_token: TOKEN })
  });
  const createData = await createRes.json();
  if (createData.error) {
    console.error(post.account, 'CREATE ERROR:', JSON.stringify(createData.error, null, 2));
    return null;
  }
  const containerId = createData.id;
  console.log(`${post.account} [${post.file}]: Container created: ${containerId}`);

  // Step 2: Poll for status
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 4000)); // 4s delay
    const statusRes = await fetch(`https://graph.facebook.com/v25.0/${containerId}?fields=status_code&access_token=${TOKEN}`);
    const statusData = await statusRes.json();
    if (statusData.status_code === 'FINISHED') { console.log(`${post.account}: Container FINISHED.`); break; }
    if (statusData.status_code === 'ERROR') { console.error(`${post.account}: Container status ERROR.`); return null; }
    if (i === 14) { console.error(`${post.account}: Container timed out.`); return null; }
  }

  // Step 3: Publish
  const pubRes = await fetch(`https://graph.facebook.com/v25.0/${ig_id}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: containerId, access_token: TOKEN })
  });
  const pubData = await pubRes.json();
  if (pubData.error) {
    console.error(post.account, 'PUBLISH ERROR:', JSON.stringify(pubData.error, null, 2));
    return null;
  }
  console.log(`✅ SUCCESS: ${post.account} [${post.file}] PUBLISHED with media_id: ${pubData.id}`);
  return { ...post, media_id: pubData.id, published_at: new Date().toISOString() };
}

async function runAll() {
  const publishedPosts = [];
  for (const post of batch) {
    const result = await publish(post);
    if (result) publishedPosts.push(result);
  }
  
  // Update queue.json
  const queuePath = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const updatedQueue = queue.concat(publishedPosts.map(p => ({ ...p, status: 'published' })));
  fs.writeFileSync(queuePath, JSON.stringify(updatedQueue, null, 2));
  console.log(`\nUpdated queue.json with ${publishedPosts.length} new posts.`);
}

runAll();
