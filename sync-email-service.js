// Script to sync Firestore emails with email distribution services
// Supports: Resend, SendGrid, Mailchimp
// Usage: node sync-email-service.js [service] [api-key]

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDs9B8K1X8xmyw77l4BM55z7nTZzZ0mf5M",
    authDomain: "collegeconnect-3906d.firebaseapp.com",
    projectId: "collegeconnect-3906d",
    storageBucket: "collegeconnect-3906d.firebasestorage.app",
    messagingSenderId: "114960693146",
    appId: "1:114960693146:web:bbe01ba7f0bb4f1daaec23",
    measurementId: "G-113E6P25MQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get all emails from Firestore
async function getEmailsFromFirestore() {
    try {
        const waitlistRef = collection(db, 'waitlist');
        const q = query(waitlistRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const emails = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email) {
                emails.push(data.email.toLowerCase().trim());
            }
        });
        
        return [...new Set(emails)]; // Remove duplicates
    } catch (error) {
        console.error('Error getting emails from Firestore:', error);
        throw error;
    }
}

// Sync with Resend (https://resend.com)
async function syncWithResend(apiKey, audienceId) {
    const emails = await getEmailsFromFirestore();
    console.log(`📧 Syncing ${emails.length} emails to Resend...`);
    
    try {
        const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                emails: emails.map(email => ({ email }))
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Resend API error: ${error}`);
        }
        
        const result = await response.json();
        console.log('✅ Successfully synced with Resend!');
        return result;
    } catch (error) {
        console.error('Error syncing with Resend:', error);
        throw error;
    }
}

// Sync with SendGrid (https://sendgrid.com)
async function syncWithSendGrid(apiKey, listId) {
    const emails = await getEmailsFromFirestore();
    console.log(`📧 Syncing ${emails.length} emails to SendGrid...`);
    
    try {
        // SendGrid requires adding contacts one by one or in batches
        const batchSize = 1000;
        let added = 0;
        
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            
            const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    list_ids: [listId],
                    contacts: batch.map(email => ({ email }))
                })
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`SendGrid API error: ${error}`);
            }
            
            added += batch.length;
            console.log(`  Added ${added}/${emails.length} emails...`);
        }
        
        console.log('✅ Successfully synced with SendGrid!');
    } catch (error) {
        console.error('Error syncing with SendGrid:', error);
        throw error;
    }
}

// Sync with Mailchimp (https://mailchimp.com)
async function syncWithMailchimp(apiKey, listId, serverPrefix) {
    const emails = await getEmailsFromFirestore();
    console.log(`📧 Syncing ${emails.length} emails to Mailchimp...`);
    
    try {
        // Mailchimp requires adding contacts in batches
        const batchSize = 500;
        let added = 0;
        
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            
            const members = batch.map(email => ({
                email_address: email,
                status: 'subscribed'
            }));
            
            const response = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    members: members,
                    update_existing: true
                })
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Mailchimp API error: ${error}`);
            }
            
            added += batch.length;
            console.log(`  Added ${added}/${emails.length} emails...`);
        }
        
        console.log('✅ Successfully synced with Mailchimp!');
    } catch (error) {
        console.error('Error syncing with Mailchimp:', error);
        throw error;
    }
}

// Main execution
async function main() {
    const service = process.argv[2];
    const apiKey = process.argv[3];
    const listId = process.argv[4]; // For SendGrid/Mailchimp
    const serverPrefix = process.argv[5]; // For Mailchimp (e.g., 'us1', 'us2')
    
    if (!service || !apiKey) {
        console.log(`
Usage:
  node sync-email-service.js [service] [api-key] [list-id] [server-prefix]

Services:
  resend    - Resend.com (requires audience-id as list-id)
  sendgrid  - SendGrid (requires list-id)
  mailchimp - Mailchimp (requires list-id and server-prefix like 'us1')

Examples:
  node sync-email-service.js resend re_xxxxx aud_xxxxx
  node sync-email-service.js sendgrid SG.xxxxx list_xxxxx
  node sync-email-service.js mailchimp xxxxx us1 list_xxxxx
        `);
        process.exit(1);
    }
    
    switch (service.toLowerCase()) {
        case 'resend':
            if (!listId) {
                console.error('❌ Resend requires an audience-id');
                process.exit(1);
            }
            await syncWithResend(apiKey, listId);
            break;
        case 'sendgrid':
            if (!listId) {
                console.error('❌ SendGrid requires a list-id');
                process.exit(1);
            }
            await syncWithSendGrid(apiKey, listId);
            break;
        case 'mailchimp':
            if (!listId || !serverPrefix) {
                console.error('❌ Mailchimp requires a list-id and server-prefix');
                process.exit(1);
            }
            await syncWithMailchimp(apiKey, listId, serverPrefix);
            break;
        default:
            console.error(`❌ Unknown service: ${service}`);
            console.log('Supported services: resend, sendgrid, mailchimp');
            process.exit(1);
    }
}

main().catch(console.error);

