require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });

const API_KEY = process.env.BREVO_API_KEY_REST;
const BASE = 'https://api.brevo.com/v3';

async function apiCall(endpoint, method, body) {
  const opts = {
    method: method || 'GET',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + endpoint, opts);
  const text = await res.text();
  console.log(`${method || 'GET'} ${endpoint} -> ${res.status}`);
  if (text) {
    try { return JSON.parse(text); } catch(e) { return text; }
  }
  return null;
}

async function run() {
  // Step 1: Check current campaign status
  const campaign = await apiCall('/emailCampaigns/3');
  console.log('Status:', campaign.status);
  console.log('Stats:', JSON.stringify(campaign.statistics?.globalStats));
  
  // Step 2: Try to resume the suspended campaign
  // Brevo docs say PUT /emailCampaigns/{campaignId}/status with status "replayTo" or we can try "sendNow" again
  // But actually for suspended campaigns, we might need to update and resend
  
  // Let's try updating the campaign status
  console.log('\nAttempting to resume campaign...');
  const resumeResult = await apiCall('/emailCampaigns/3/sendNow', 'POST');
  console.log('Resume result:', JSON.stringify(resumeResult));
}

run().catch(e => console.error(e));
