require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const API_KEY = process.env.BREVO_API_KEY_REST;
const BASE = 'https://api.brevo.com/v3';

async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + endpoint, opts);
  console.log(`${method} ${endpoint} -> ${res.status}`);
  if (res.status >= 300) {
      const errorText = await res.text();
      console.error('API Error:', errorText);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function run() {
  try {
    console.log('Fetching original campaign (ID 3) to duplicate...');
    const originalCampaign = await apiCall('/emailCampaigns/3');
    if (!originalCampaign || !originalCampaign.htmlContent) {
      console.error('Could not fetch original campaign data.');
      return;
    }

    console.log('Creating new campaign from original...');
    const newCampaignData = {
        name: 'Spring Sale Final Batches - ' + new Date().toISOString().split('T')[0],
        subject: originalCampaign.subject,
        sender: { name: originalCampaign.sender.name, email: originalCampaign.sender.email },
        htmlContent: originalCampaign.htmlContent,
        recipients: { listIds: [9] }, // Target the main list
        previewText: originalCampaign.previewText
    };

    const createResult = await apiCall('/emailCampaigns', 'POST', newCampaignData);
    if (!createResult || !createResult.id) {
      console.error('Failed to create new campaign.');
      return;
    }
    const newCampaignId = createResult.id;
    console.log(`New campaign created with ID: ${newCampaignId}`);

    console.log('Sending the new campaign immediately...');
    await apiCall(`/emailCampaigns/${newCampaignId}/sendNow`, 'POST');
    console.log('New campaign has been queued for sending. Brevo will handle sending to contacts who have not received it yet.');
  } catch (e) {
    console.error('A critical error occurred:', e.message);
  }
}

run();
