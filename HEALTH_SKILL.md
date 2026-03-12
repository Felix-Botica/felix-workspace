# HEALTH_SKILL.md — Withings Health Data Integration

## Setup
- **API Endpoint:** https://wbsapi.withings.net
- **Auth:** OAuth2 Bearer token from `~/.openclaw/.env`
- **User ID:** 23049153
- **Account:** lothareckstein@gmail.com
- **Credentials in .env:** WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET, WITHINGS_ACCESS_TOKEN, WITHINGS_REFRESH_TOKEN, WITHINGS_USER_ID

## Devices
- **Withings ScanWatch** — sleep tracking, HR, SpO2, activity, steps
- **Withings Body+** — weight, body composition (currently in storage in Berlin)
- **Renpho Travel Scale** — weight (syncs via Renpho → Apple Health → Withings)

## Token Refresh
Access tokens expire every 10800 seconds (3 hours). Always attempt the API call first; if you get status 401, refresh:

```javascript
const https = require('https');
require('dotenv').config();

function refreshToken() {
  const postData = new URLSearchParams({
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: process.env.WITHINGS_CLIENT_ID,
    client_secret: process.env.WITHINGS_CLIENT_SECRET,
    refresh_token: process.env.WITHINGS_REFRESH_TOKEN,
  }).toString();

  // POST to https://wbsapi.withings.net/v2/oauth2
  // On success: update WITHINGS_ACCESS_TOKEN and WITHINGS_REFRESH_TOKEN in .env
}
```

## API Endpoints

### Get Devices
```javascript
// POST https://wbsapi.withings.net/v2/user
// Headers: Authorization: Bearer <access_token>
// Body: action=getdevice
// Returns: devices array with model, type, battery status
```

### Get Measurements (weight, BP, etc.)
```javascript
// POST https://wbsapi.withings.net/measure
// Body: action=getmeas&startdate=<unix>&enddate=<unix>&category=1
// Type codes: 1=Weight(kg), 5=Fat Free Mass, 6=Fat Ratio(%), 8=Fat Mass,
//   9=Diastolic BP, 10=Systolic BP, 11=Heart Pulse, 54=SpO2(%)
// Values: actual = value × 10^unit
```

### Get Sleep Summary
```javascript
// POST https://wbsapi.withings.net/v2/sleep
// Body: action=getsummary&startdateymd=YYYY-MM-DD&enddateymd=YYYY-MM-DD
//   &data_fields=sleep_score,total_sleep_time,total_timeinbed,hr_average,hr_min,hr_max,rr_average,rr_min,rr_max,sleep_efficiency,sleep_latency,nb_rem_episodes,breathing_disturbances_intensity
// Returns: series array with date and data object
```

### Get Activity
```javascript
// POST https://wbsapi.withings.net/v2/measure
// Body: action=getactivity&startdateymd=YYYY-MM-DD&enddateymd=YYYY-MM-DD
//   &data_fields=steps,distance,calories,hr_average,hr_min,hr_max
// Returns: activities array with date, steps, distance, calories, HR
```

## How Felix Should Use This

### Morning Briefing Integration
Include in the daily 07:30 briefing:
- Last night's sleep score, duration, efficiency
- Resting HR trend (flag if unusually high/low)
- Previous day's steps and activity
- Battery warnings for devices

### Health Alerts
Proactively flag:
- Sleep score below 50 → "Rough night — consider lighter schedule today"
- Sleep duration under 5h → "Short sleep — prioritize rest tonight"
- Resting HR 10%+ above 7-day average → "HR elevated — possible stress or illness"
- SpO2 below 95% → "SpO2 low — worth monitoring"
- Device battery low → "ScanWatch needs charging"

### Weekly Summary (Sundays)
Offer a weekly health summary:
- Average sleep score and trend
- Average steps and most/least active days
- HR trend
- Weight trend (when scale data available)

## Rules
- Health data is deeply personal. Never share with anyone.
- Be direct. Lothar is German and prefers straight talk over gentle framing. "You slept 3.5 hours, that's terrible" is better than "Your sleep was a bit short last night."
- Flag both single bad nights AND trends. Don't hold back.
- Felix is not a doctor, but can and should be blunt about what the data shows.
- If data looks medically concerning (very low SpO2, very high HR at rest), say so clearly and recommend seeing a doctor.

## Scripts
- `~/.openclaw/withings-auth.js` — OAuth2 authorization (run once, or to re-auth)
- `~/.openclaw/withings-test.js` — Test script to verify API access and fetch sample data
