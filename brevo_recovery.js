require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const API_KEY = process.env.BREVO_API_KEY_REST;
const BASE = 'https://api.brevo.com/v3';

async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + endpoint, opts);
  const status = res.status;
  if (status >= 300) {
    const errorText = await res.text();
    console.error(`API Error: ${method} ${endpoint} -> ${status}`, errorText);
    return null;
  }
  if (status === 204) return { success: true };
  const data = await res.json();
  console.log(`${method} ${endpoint} -> ${status}`);
  return data;
}

async function getCampaignHTML(campaignId) {
    const campaign = await apiCall(`/emailCampaigns/${campaignId}`);
    return campaign ? campaign.htmlContent : null;
}

async function run() {
  try {
    console.log('Fetching all contacts from list 3...');
    let allContacts = [];
    let offset = 0;
    const limit = 500;
    while (true) {
        const contacts = await apiCall(`/contacts/lists/3/contacts?limit=${limit}&offset=${offset}`);
        if (!contacts || contacts.contacts.length === 0) break;
        allContacts.push(...contacts.contacts);
        offset += limit;
    }
    console.log(`Fetched ${allContacts.length} total contacts.`);

    if (allContacts.length === 0) {
        console.error('No contacts found in list 3. Aborting.');
        return;
    }

    const batch1 = allContacts.slice(0, 300);
    const batch2 = allContacts.slice(300, 600);
    const batch3 = allContacts.slice(600);

    const batches = [
        { name: 'Nylongerie Subscribers - Batch 1 (1-300)', contacts: batch1 },
        { name: 'Nylongerie Subscribers - Batch 2 (301-600)', contacts: batch2 },
        { name: 'Nylongerie Subscribers - Batch 3 (601+)', contacts: batch3 }
    ].filter(b => b.contacts.length > 0);

    const folderId = 1; // Assuming a default folder exists

    // Create new lists and add contacts
    const newListIds = [];
    for (const batch of batches) {
        console.log(`Creating list: ${batch.name}`);
        const list = await apiCall('/contacts/lists', 'POST', { name: batch.name, folderId });
        if (list && list.id) {
            const listId = list.id;
            newListIds.push(listId);
            const contactEmails = batch.contacts.map(c => c.email);
            console.log(`Adding ${contactEmails.length} contacts to list ${listId}...`);
            await apiCall(`/contacts/lists/${listId}/contacts/add`, 'POST', { emails: contactEmails });
        }
    }
    
    console.log('New list IDs created:', newListIds);

    // Get HTML from one of the failed campaigns
    const htmlContent = await getCampaignHTML(4);
    if (!htmlContent) {
        console.error('Failed to get HTML content from original campaign.');
        return;
    }

    // Create and send a new campaign for each list
    for (const listId of newListIds) {
        console.log(`Creating campaign for list ID ${listId}...`);
        const campaignData = {
            name: `Spring Sale - Relaunch - List ${listId}`,
            subject: 'Last Chance ✦ 30% Off Everything — Ends April 3',
            sender: { name: 'Alex', email: 'hello@nylongerie.com' },
            htmlContent: htmlContent,
            recipients: { listIds: [listId] },
            previewText: '30% off everything with SPRING30 — ends April 3.'
        };
        const newCampaign = await apiCall('/emailCampaigns', 'POST', campaignData);
        if (newCampaign && newCampaign.id) {
            console.log(`Sending campaign ${newCampaign.id} to list ${listId}...`);
            await apiCall(`/emailCampaigns/${newCampaign.id}/sendNow`, 'POST');
        }
    }

    console.log('All new campaigns have been created and queued for sending.');

  } catch (e) {
    console.error('A critical error occurred:', e.message);
  }
}

run();
