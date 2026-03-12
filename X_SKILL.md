# X (Twitter) Integration

You have full read/write access to @lothareckstein's X account via the twitter-api-v2 library.

## Setup

- Library: `twitter-api-v2` installed at `~/.openclaw/node_modules/`
- Credentials: `~/.openclaw/.env` (loaded via dotenv)
- Account: @lothareckstein (ID: 13020562)

## How to Use

Run Node.js scripts from `~/.openclaw/` so that dotenv picks up the .env file and node resolves the twitter-api-v2 module.

### Post a Tweet

```bash
cd ~/.openclaw && node -e "
require('dotenv').config();
const {TwitterApi} = require('twitter-api-v2');
const client = new TwitterApi({
  appKey: process.env.X_CONSUMER_KEY,
  appSecret: process.env.X_CONSUMER_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET
}).readWrite;
(async()=>{
  const tweet = await client.v2.tweet('YOUR_TWEET_TEXT_HERE');
  console.log('Posted:', 'https://x.com/lothareckstein/status/' + tweet.data.id);
})().catch(e=>console.error(e.message));
"
```

### Reply to a Tweet

```bash
cd ~/.openclaw && node -e "
require('dotenv').config();
const {TwitterApi} = require('twitter-api-v2');
const client = new TwitterApi({
  appKey: process.env.X_CONSUMER_KEY,
  appSecret: process.env.X_CONSUMER_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET
}).readWrite;
(async()=>{
  const tweet = await client.v2.reply('YOUR_REPLY_TEXT', 'TWEET_ID_TO_REPLY_TO');
  console.log('Replied:', tweet.data.id);
})().catch(e=>console.error(e.message));
"
```

### Post a Thread

```bash
cd ~/.openclaw && node -e "
require('dotenv').config();
const {TwitterApi} = require('twitter-api-v2');
const client = new TwitterApi({
  appKey: process.env.X_CONSUMER_KEY,
  appSecret: process.env.X_CONSUMER_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET
}).readWrite;
(async()=>{
  const thread = await client.v2.tweetThread([
    'First tweet of the thread',
    'Second tweet',
    'Third tweet'
  ]);
  console.log('Thread posted, first tweet:', thread[0].data.id);
})().catch(e=>console.error(e.message));
"
```

### Check Recent Mentions

```bash
cd ~/.openclaw && node -e "
require('dotenv').config();
const {TwitterApi} = require('twitter-api-v2');
const client = new TwitterApi({
  appKey: process.env.X_CONSUMER_KEY,
  appSecret: process.env.X_CONSUMER_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET
}).readWrite;
(async()=>{
  const me = await client.v2.me();
  const since = new Date(Date.now() - 24*60*60*1000).toISOString();
  const mentions = await client.v2.userMentionTimeline(me.data.id, {start_time: since, max_results: 20});
  if(!mentions.data?.length) { console.log('No mentions in the last 24h'); return; }
  mentions.data.forEach(m => console.log(m.id, m.text.slice(0,100)));
})().catch(e=>console.error(e.message));
"
```

### Search Tweets

```bash
cd ~/.openclaw && node -e "
require('dotenv').config();
const {TwitterApi} = require('twitter-api-v2');
const client = new TwitterApi(process.env.X_BEARER_TOKEN);
(async()=>{
  const results = await client.v2.search('YOUR_SEARCH_QUERY', {max_results: 10});
  results.data?.forEach(t => console.log(t.id, t.text.slice(0,100)));
})().catch(e=>console.error(e.message));
"
```

### Get User Profile

```bash
cd ~/.openclaw && node -e "
require('dotenv').config();
const {TwitterApi} = require('twitter-api-v2');
const client = new TwitterApi(process.env.X_BEARER_TOKEN);
(async()=>{
  const user = await client.v2.userByUsername('TARGET_USERNAME');
  console.log(JSON.stringify(user.data, null, 2));
})().catch(e=>console.error(e.message));
"
```

## Rules

1. **Always ask Lothar before posting.** Never post tweets autonomously unless he explicitly gives you standing instructions to do so.
2. **Draft first.** When asked to tweet, show the draft and get approval before posting.
3. **Tone:** Professional but human. Lothar's voice — not corporate, not overly casual.
4. **Language:** Default to English unless Lothar specifies German.
5. **No controversial takes** without explicit approval.
6. **Thread for long content.** If a message exceeds 280 chars, split into a thread.
7. **Delete the test tweet** from setup: ID 2027753120202195172.

## Rate Limits

- 1,080,000 requests per month (Pay Per Use tier)
- Currently ~1,079,998 remaining
- Post limit: 100 tweets per 15 minutes
