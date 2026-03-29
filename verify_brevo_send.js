require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const API_KEY = process.env.BREVO_API_KEY_REST;
const BASE = 'https://api.brevo.com/v3';
const CAMPAIGN_IDS = [8, 9, 10];

async function apiCall(endpoint) {
  const res = await fetch(BASE + endpoint, { headers: { 'api-key': API_KEY } });
  if (res.status >= 300) {
    console.error(`API Error: GET ${endpoint} -> ${res.status}`);
    return null;
  }
  return res.json();
}

async function checkStatus() {
    console.log(`\n--- Checking at ${new Date().toLocaleTimeString()} ---`);
    let totalSent = 0;
    for (const id of CAMPAIGN_IDS) {
        const campaign = await apiCall(`/emailCampaigns/${id}`);
        if (campaign) {
            const stats = campaign.statistics?.globalStats || {};
            const sent = stats.sent || 0;
            totalSent += sent;
            console.log(`Campaign #${id}: Status: ${campaign.status.padEnd(10)} | Sent: ${String(sent).padEnd(5)} | Delivered: ${stats.delivered || 0} | Clicks: ${stats.uniqueClicks || 0}`);
        }
    }
    return totalSent;
}

async function run() {
    console.log('Starting verification loop for campaigns 8, 9, 10...');
    let checks = 0;
    const interval = setInterval(async () => {
        const totalSent = await checkStatus();
        checks++;
        // Stop after 10 minutes or if all are sent
        if (checks > 20 || totalSent >= 663) {
            clearInterval(interval);
            console.log('\n--- Monitoring Finished ---');
        }
    }, 30000); // Check every 30 seconds
}

run();
