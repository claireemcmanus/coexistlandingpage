# Email Distribution Setup Guide

This guide explains how to create an email distribution list from the emails collected in Firebase Firestore.

## Option 1: Export Emails (Manual)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Export Emails
```bash
# Export to CSV
npm run export-emails

# Or export to JSON
npm run export-emails:json
```

This will create:
- `waitlist-emails.csv` - CSV file with all emails
- `waitlist-emails.json` - JSON file with all emails

### Step 3: Import to Email Service
You can then manually import these files into:
- **Mailchimp**: Import CSV/JSON via their dashboard
- **SendGrid**: Import contacts via their dashboard
- **Resend**: Import via their dashboard
- **Google Groups**: Import CSV
- **Any email marketing tool**: Most support CSV imports

## Option 2: Automatic Sync (Recommended)

Automatically sync emails from Firestore to your email service.

### Resend (Recommended - Simple & Modern)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from Settings → API Keys
3. Create an Audience and get the Audience ID
4. Run:
```bash
node sync-email-service.js resend re_your_api_key aud_your_audience_id
```

### SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get your API key from Settings → API Keys
3. Create a Contact List and get the List ID
4. Run:
```bash
node sync-email-service.js sendgrid SG.your_api_key your_list_id
```

### Mailchimp

1. Sign up at [mailchimp.com](https://mailchimp.com)
2. Get your API key from Account → Extras → API keys
3. Find your server prefix (e.g., 'us1', 'us2') from your API key
4. Create a List and get the List ID
5. Run:
```bash
node sync-email-service.js mailchimp your_api_key your_server_prefix your_list_id
```

## Option 3: Real-time Auto-Sync (Advanced)

For automatic syncing when new emails are added, you can:

1. **Use Firebase Cloud Functions** to automatically add emails to your service when they're added to Firestore
2. **Use Firebase Extensions** like the SendGrid extension
3. **Set up a webhook** that triggers on new Firestore documents

### Example: Firebase Cloud Function for Resend

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.syncEmailToResend = functions.firestore
  .document('waitlist/{emailId}')
  .onCreate(async (snap, context) => {
    const email = snap.data().email;
    const RESEND_API_KEY = functions.config().resend.api_key;
    const AUDIENCE_ID = functions.config().resend.audience_id;
    
    try {
      await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emails: [{ email }]
        })
      });
      
      console.log(`Synced ${email} to Resend`);
    } catch (error) {
      console.error('Error syncing to Resend:', error);
    }
  });
```

## Sending Emails

Once your emails are in your distribution service, you can:

1. **Send launch announcements** when you're ready
2. **Send updates** about your progress
3. **Send newsletters** with product updates
4. **Segment users** (e.g., first 200 for premium offer)

## Best Practices

1. **Get permission**: Make sure users know they're signing up for emails
2. **Provide value**: Don't spam - send meaningful updates
3. **Respect unsubscribes**: Always include unsubscribe links
4. **Track opens/clicks**: Use your email service's analytics
5. **Segment early users**: Tag the first 200 users for the premium offer

## Checking Your Email Count

You can check how many emails you have in Firestore by running:
```bash
npm run export-emails
```

The script will show you the total count and first 5 emails.

