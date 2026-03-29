require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const API_KEY = process.env.BREVO_API_KEY_REST;
const BASE = 'https://api.brevo.com/v3';

async function apiCall(endpoint, method = 'POST', body = null) {
  const opts = { method, headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + endpoint, opts);
  console.log(`${method} ${endpoint} -> ${res.status}`);
  if (res.status >= 300) {
    const errorText = await res.text();
    console.error('API Error:', errorText);
    return null;
  }
  if (res.status === 204) return { success: true };
  return res.json();
}

async function createAutomation() {
  console.log("Constructing Abandoned Cart workflow...");

  const workflow = {
    name: 'Nylongerie Abandoned Cart Recovery',
    isActive: false, // Start as inactive, activate after confirmation
    trigger: {
      type: 'event',
      eventName: 'cart_updated',
      conditions: []
    },
    steps: [
      { // Step 1: Wait 1 Hour
        type: 'wait',
        delay: { value: 1, unit: 'hour' }
      },
      { // Step 2: Send Email 1
        type: 'sendEmail',
        templateId: 5 // The ID of our '1 Hour Reminder' template
      },
      { // Step 3: Wait 23 Hours
        type: 'wait',
        delay: { value: 23, unit: 'hour' }
      },
      { // Step 4: Send Email 2
        type: 'sendEmail',
        templateId: 6 // The ID of our '24 Hour Reminder' template
      },
      { // Step 5: Wait 48 Hours
        type: 'wait',
        delay: { value: 48, unit: 'hour' }
      },
      { // Step 6: Send Email 3
        type: 'sendEmail',
        templateId: 7 // The ID of our '48 Hour Offer' template
      }
    ],
    exitConditions: [
      {
        type: 'event',
        eventName: 'order_completed'
      },
      {
        type: 'event',
        eventName: 'cart_deleted'
      }
    ]
  };

  const result = await apiCall('/automations', 'POST', workflow);

  if (result && result.id) {
    console.log(`✅ Workflow created successfully with ID: ${result.id}. It is currently INACTIVE.`);
    console.log("Please review and activate it in the Brevo UI.");
  } else {
    console.error("Failed to create the automation workflow.");
  }
}

createAutomation();
