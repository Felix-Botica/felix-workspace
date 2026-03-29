require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });

async function run() {
  const res = await fetch('https://api.brevo.com/v3/emailCampaigns/3', {
    headers: { 'api-key': process.env.BREVO_API_KEY_REST }
  });
  const data = await res.json();
  console.log('Campaign:', data.name);
  console.log('Status:', data.status);
  console.log('Stats:', JSON.stringify(data.statistics?.globalStats, null, 2));
}
run();
