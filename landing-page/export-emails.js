// Utility script to export emails from Firestore and optionally sync with email services
// Run this with: node export-emails.js

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import fs from 'fs';

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

// Export emails to CSV
async function exportEmailsToCSV() {
    try {
        const waitlistRef = collection(db, 'waitlist');
        const q = query(waitlistRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const emails = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            emails.push({
                email: data.email,
                timestamp: data.timestamp?.toDate?.() || data.timestamp || 'N/A',
                status: data.status || 'pending'
            });
        });
        
        // Create CSV content
        let csvContent = 'Email,Timestamp,Status\n';
        emails.forEach(email => {
            csvContent += `${email.email},${email.timestamp},${email.status}\n`;
        });
        
        // Write to file
        fs.writeFileSync('waitlist-emails.csv', csvContent);
        console.log(`✅ Exported ${emails.length} emails to waitlist-emails.csv`);
        
        return emails;
    } catch (error) {
        console.error('Error exporting emails:', error);
        throw error;
    }
}

// Export emails to JSON
async function exportEmailsToJSON() {
    try {
        const waitlistRef = collection(db, 'waitlist');
        const q = query(waitlistRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const emails = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            emails.push({
                email: data.email,
                timestamp: data.timestamp?.toDate?.() || data.timestamp || null,
                status: data.status || 'pending'
            });
        });
        
        // Write to file
        fs.writeFileSync('waitlist-emails.json', JSON.stringify(emails, null, 2));
        console.log(`✅ Exported ${emails.length} emails to waitlist-emails.json`);
        
        return emails;
    } catch (error) {
        console.error('Error exporting emails:', error);
        throw error;
    }
}

// Get just email addresses as array
async function getEmailList() {
    try {
        const waitlistRef = collection(db, 'waitlist');
        const querySnapshot = await getDocs(waitlistRef);
        
        const emails = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email) {
                emails.push(data.email);
            }
        });
        
        return emails;
    } catch (error) {
        console.error('Error getting emails:', error);
        throw error;
    }
}

// Main execution
async function main() {
    const format = process.argv[2] || 'csv'; // 'csv' or 'json'
    
    if (format === 'json') {
        await exportEmailsToJSON();
    } else {
        await exportEmailsToCSV();
    }
    
    const emails = await getEmailList();
    console.log(`\n📧 Total emails collected: ${emails.length}`);
    console.log('\nFirst 5 emails:');
    emails.slice(0, 5).forEach((email, i) => {
        console.log(`  ${i + 1}. ${email}`);
    });
}

main().catch(console.error);

