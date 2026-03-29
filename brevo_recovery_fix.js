require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const API_KEY = process.env.BREVO_API_KEY_REST;
const BASE = 'https://api.brevo.com/v3';

async function apiCall(endpoint, method = 'POST', body = null) {
  // ... (omitting for brevity, same as before)
  const opts = { method, headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + endpoint, opts);
  const status = res.status;
  if (status >= 300) {
    const errorText = await res.text();
    console.error(`API Error: ${method} ${endpoint} -> ${status}`, errorText);
    return null;
  }
  console.log(`${method} ${endpoint} -> ${status}`);
  if (status === 204) return { success: true };
  return res.json();
}

async function addContactsInChunks(listId, contacts) {
    for (let i = 0; i < contacts.length; i += 150) {
        const chunk = contacts.slice(i, i + 150);
        const contactEmails = chunk.map(c => c.email);
        console.log(`Adding ${chunk.length} contacts to list ${listId} (chunk ${i/150 + 1})...`);
        await apiCall(`/contacts/lists/${listId}/contacts/add`, 'POST', { emails: contactEmails });
    }
}

async function run() {
  try {
    console.log('Fetching all contacts from list 3 again...');
    let allContacts = [];
    let offset = 0;
    const limit = 500;
    while (true) {
        const contacts = await apiCall(`/contacts/lists/3/contacts?limit=${limit}&offset=${offset}`, 'GET');
        if (!contacts || contacts.contacts.length === 0) break;
        allContacts.push(...contacts.contacts);
        offset += limit;
    }
    console.log(`Fetched ${allContacts.length} total contacts.`);

    const batch1 = allContacts.slice(0, 300);
    const batch2 = allContacts.slice(300, 600);
    
    // List IDs from the previous failed run
    const listId1 = 7;
    const listId2 = 8;

    console.log('\nPopulating list 7...');
    await addContactsInChunks(listId1, batch1);

    console.log('\nPopulating list 8...');
    await addContactsInChunks(listId2, batch2);
    
    console.log('\nTriggering send for campaigns 8 and 9 again, just in case.');
    await apiCall(`/emailCampaigns/8/sendNow`, 'POST');
    await apiCall(`/emailCampaigns/9/sendNow`, 'POST');

    console.log('Contacts added to lists. Campaigns 8 and 9 have been re-queued.');

  } catch (e) {
    console.error('A critical error occurred:', e.message);
  }
}

run();
