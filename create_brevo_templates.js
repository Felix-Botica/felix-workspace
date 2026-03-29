require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const API_KEY = process.env.BREVO_API_KEY_REST;
const BASE = 'https://api.brevo.com/v3';

async function apiCall(endpoint, method = 'POST', body) {
  const opts = { method, headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + endpoint, opts);
  console.log(`${method} ${endpoint} -> ${res.status}`);
  const responseData = await res.json();
  console.log(responseData);
  return responseData;
}

async function createTemplates() {
  console.log("Creating Template 1: Gentle Reminder (1 Hour)");
  const template1 = await apiCall('/smtp/templates', 'POST', {
    templateName: 'Abandoned Cart - 1 Hour Reminder',
    subject: 'Did you forget something?',
    htmlContent: `<!DOCTYPE html><html><body>
      <h2>Your cart is waiting...</h2>
      <p>Hi {{ params.FIRSTNAME | default:'there' }},</p>
      <p>We noticed you left some items in your shopping cart. Don't worry, we've saved them for you!</p>
      <p><a href="{{ params.abandoned_cart_url }}">Click here to complete your purchase</a></p>
      <p>Here's what you left behind:</p>
      <!-- Brevo will automatically populate this with cart items -->
      <p>Thanks,<br>The Nylongerie Team</p>
      </body></html>`,
    sender: { name: 'Alex from Nylongerie', email: 'hello@nylongerie.com' },
    isActive: true,
    replyTo: 'hello@nylongerie.com',
    toField: '{{ contact.EMAIL }}'
  });

  console.log("\nCreating Template 2: Urgency (24 Hours)");
  const template2 = await apiCall('/smtp/templates', 'POST', {
    templateName: 'Abandoned Cart - 24 Hour Reminder',
    subject: 'Your shopping cart is about to expire',
    htmlContent: `<!DOCTYPE html><html><body>
      <h2>Don't miss out!</h2>
      <p>Hi {{ params.FIRSTNAME | default:'there' }},</p>
      <p>The items in your shopping cart are popular and might sell out soon. Complete your order now to make sure you get them.</p>
      <p><a href="{{ params.abandoned_cart_url }}">Complete Your Order Now</a></p>
      <p>Thanks,<br>The Nylongerie Team</p>
      </body></html>`,
    sender: { name: 'Alex from Nylongerie', email: 'hello@nylongerie.com' },
    isActive: true,
    replyTo: 'hello@nylongerie.com',
    toField: '{{ contact.EMAIL }}'
  });

  console.log("\nCreating Template 3: Discount (48 Hours)");
  const template3 = await apiCall('/smtp/templates', 'POST', {
    templateName: 'Abandoned Cart - 48 Hour Offer',
    subject: 'A little something extra for you',
    htmlContent: `<!DOCTYPE html><html><body>
      <h2>Still thinking it over?</h2>
      <p>Hi {{ params.FIRSTNAME | default:'there' }},</p>
      <p>We'd love for you to complete your order. As a little incentive, here is <strong>10% off</strong> your entire cart, just for you. This code is valid for the next 24 hours.</p>
      <p>Use code: <strong>COMEBACK10</strong></p>
      <p><a href="{{ params.abandoned_cart_url }}&discount=COMEBACK10">Click here to apply the discount and checkout</a></p>
      <p>Thanks,<br>The Nylongerie Team</p>
      </body></html>`,
    sender: { name: 'Alex from Nylongerie', email: 'hello@nylongerie.com' },
    isActive: true,
    replyTo: 'hello@nylongerie.com',
    toField: '{{ contact.EMAIL }}'
  });

  return { template1, template2, template3 };
}

createTemplates();
