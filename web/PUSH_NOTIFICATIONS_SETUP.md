# Push Notifications Setup Guide

This guide will help you set up push notifications for your iOS app using Firebase Cloud Messaging (FCM) and Capacitor Push Notifications.

## Prerequisites

- ✅ Firebase project already configured
- ✅ iOS app configured in Xcode
- ✅ Apple Developer account (for APNs certificates)

## Step 1: Configure Firebase Cloud Messaging

### 1.1 Enable Cloud Messaging in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`collegeconnect-3906d`)
3. Go to **Project Settings** → **Cloud Messaging** tab
4. Under **Apple app configuration**, you'll need to upload your APNs certificate

### 1.2 Get APNs Certificate (for iOS)

#### Option A: Using APNs Auth Key (Recommended - Easier)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **+** to create a new key
3. Name it "Firebase Cloud Messaging" or similar
4. Check **Apple Push Notifications service (APNs)**
5. Click **Continue** → **Register**
6. Download the `.p8` key file (you can only download it once!)
7. Note the **Key ID** shown on the page
8. Go back to Firebase Console → Cloud Messaging
9. Click **Upload** under APNs Authentication Key
10. Upload the `.p8` file
11. Enter your **Key ID** and **Team ID** (found in Apple Developer account)

#### Option B: Using APNs Certificate (More Complex)

1. In Xcode, go to your project → **Signing & Capabilities**
2. Enable **Push Notifications** capability
3. Download the certificate from Apple Developer Portal
4. Upload it to Firebase Console → Cloud Messaging

### 1.3 Get FCM Server Key

1. In Firebase Console → **Project Settings** → **Cloud Messaging**
2. Find your **Server key** (or create a new one)
3. Save this for sending notifications from your backend (optional)

## Step 2: Configure iOS App in Xcode

### 2.1 Enable Push Notifications Capability

1. Open your project in Xcode: `cd web && npx cap open ios`
2. Select your project in the left sidebar
3. Select the **App** target
4. Go to **Signing & Capabilities** tab
5. Click **+ Capability**
6. Add **Push Notifications**
7. Add **Background Modes** (if not already added)
   - Check **Remote notifications**

### 2.2 Update Info.plist

The `Info.plist` has already been updated with:
- `UIBackgroundModes` with `remote-notification`

## Step 3: Add Firebase Configuration File

### 3.1 Download GoogleService-Info.plist

1. In Firebase Console → **Project Settings** → **Your apps**
2. Find your iOS app (or add one if it doesn't exist)
3. Download `GoogleService-Info.plist`
4. Drag it into Xcode project:
   - Open Xcode
   - Right-click on `App` folder in project navigator
   - Select **Add Files to "App"...**
   - Select `GoogleService-Info.plist`
   - Make sure **Copy items if needed** is checked
   - Make sure **App** target is selected
   - Click **Add**

## Step 4: Install Pod Dependencies

```bash
cd web/ios/App
pod install
```

## Step 5: Build and Test

1. Build the app in Xcode
2. Run on a physical device (push notifications don't work on simulator)
3. When you log in, the app will request push notification permission
4. Check the console logs for:
   - `✅ Push registration success, token: ...`
   - `✅ FCM token saved to Firestore`

## Step 6: Test Push Notifications

### Option A: Test from Firebase Console

1. Go to Firebase Console → **Cloud Messaging**
2. Click **Send your first message**
3. Enter notification title and text
4. Click **Send test message**
5. Enter your FCM token (from console logs)
6. Click **Test**

### Option B: Send from Your Backend

You can send notifications using Firebase Admin SDK:

```javascript
// Example using Firebase Admin SDK (Node.js)
const admin = require('firebase-admin');

admin.messaging().send({
  token: 'user-fcm-token',
  notification: {
    title: 'New Message',
    body: 'You have a new message!',
  },
  data: {
    type: 'message',
    userId: 'sender-id',
  },
});
```

## Step 7: Handle Notifications in Your App

The push notification service (`src/services/pushNotifications.js`) already handles:

- ✅ Registration and token management
- ✅ Saving tokens to Firestore
- ✅ Listening for notifications
- ✅ Handling notification actions

### Customizing Notification Handling

Edit `src/services/pushNotifications.js` to customize:

- What happens when a notification is received
- What happens when a notification is tapped
- Custom notification sounds, badges, etc.

## Troubleshooting

### "Push notification permission denied"
- Make sure you're testing on a physical device
- Check that Push Notifications capability is enabled in Xcode
- Verify Info.plist has `UIBackgroundModes` with `remote-notification`

### "No FCM token available"
- Make sure `GoogleService-Info.plist` is in your Xcode project
- Verify Firebase project is correctly configured
- Check that APNs certificate/key is uploaded to Firebase Console

### "Registration error"
- Check Xcode console for detailed error messages
- Verify your Apple Developer account has push notification access
- Make sure your app is properly signed with a development/distribution certificate

### Notifications not appearing
- Make sure you're testing on a physical device (not simulator)
- Check that notifications are enabled in iOS Settings → Your App
- Verify the FCM token is being saved to Firestore
- Check Firebase Console → Cloud Messaging for delivery status

## Next Steps

1. **Set up notification categories** for different notification types (messages, matches, etc.)
2. **Add notification actions** (Reply, View, etc.)
3. **Implement notification badges** to show unread count
4. **Set up notification scheduling** for reminders
5. **Add deep linking** to open specific screens when notifications are tapped

## Resources

- [Capacitor Push Notifications Docs](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notifications Guide](https://developer.apple.com/documentation/usernotifications)

