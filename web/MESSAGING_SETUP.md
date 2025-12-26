# Messaging Setup Guide

If messages aren't sending, check these common issues:

## 1. Firestore Security Rules

Make sure your Firestore security rules allow message creation. Go to Firebase Console → Firestore Database → Rules and ensure you have:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Messages - users can read/write messages in rooms they're part of
    match /messages/{messageId} {
      allow read: if request.auth != null && 
        (request.resource.data.roomId.matches(/.*/) || 
         resource.data.roomId.matches(/.*/));
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if false; // Messages are immutable
    }
  }
}
```

**Important**: The rule above allows any authenticated user to create messages. For better security, you might want to restrict it to only allow messages in rooms where the user is a participant.

## 2. Firestore Index

Make sure you have the composite index for messages:

1. Go to Firebase Console → Firestore Database → Indexes
2. Create a composite index:
   - Collection: `messages`
   - Fields: `roomId` (Ascending), `createdAt` (Ascending)

If the index is missing, Firebase will show you a link in the console error to create it automatically.

## 3. Check Browser Console

Open your browser's developer console (F12) and look for errors when trying to send a message. Common errors:

- **permission-denied**: Security rules are blocking the write
- **unavailable**: Network/Firebase connection issue
- **missing-index**: Need to create the Firestore index

## 4. Verify User Authentication

Make sure the user is logged in:
- Check that `currentUser` is not null
- Verify the user's email is verified (if required)

## 5. Test the sendMessage Function

You can test directly in the browser console:

```javascript
// This should work if everything is set up correctly
import { sendMessage } from './services/firestore';
await sendMessage({
  roomId: 'test_room',
  text: 'Test message',
  user: {
    id: currentUser.uid,
    email: currentUser.email,
    displayName: 'Test User'
  }
});
```

## 6. Network Issues

- Check your internet connection
- Verify Firebase is accessible (not blocked by firewall)
- For iOS: Make sure Firebase domains are whitelisted in Info.plist

## Troubleshooting Steps

1. **Check Console Errors**: Open browser DevTools → Console tab
2. **Check Network Tab**: Look for failed requests to Firestore
3. **Verify Security Rules**: Test in Firebase Console → Rules → Rules Playground
4. **Check Indexes**: Go to Firestore → Indexes and verify the messages index exists
5. **Test Authentication**: Make sure you're logged in and email is verified

## Common Fixes

### Error: "permission-denied"
- Update Firestore security rules (see above)
- Make sure user is authenticated
- Verify the rule logic matches your roomId format

### Error: "missing-index"
- Click the link in the error message to create the index automatically
- Or manually create it in Firestore → Indexes

### Messages send but don't appear
- Check the `subscribeToMessages` function is working
- Verify the `roomId` matches between send and subscribe
- Check that messages are being created in Firestore (Firebase Console → Firestore → messages collection)

### Network errors
- Check internet connection
- Verify Firebase project is active
- For iOS: Check Info.plist has Firebase domains whitelisted

