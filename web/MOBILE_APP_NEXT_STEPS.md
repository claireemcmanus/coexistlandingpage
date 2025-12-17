# Mobile App - Next Steps Guide

## Current Status ✅

You have:
- ✅ Capacitor 8.0.0 properly installed
- ✅ iOS project structure created
- ✅ Firebase configuration with fallback values (will work in mobile)
- ✅ Network security configured in Info.plist for Firebase
- ✅ Build scripts ready (`npm run cap:ios`)

## Immediate Next Steps (Do These Now)

### Step 1: Build and Sync Your App

```bash
cd web
npm run build
npm run cap:sync
```

This will:
- Build your React app for production
- Copy the built files to the iOS project
- Update iOS dependencies

### Step 2: Open in Xcode

```bash
npm run cap:ios
```

Or manually:
```bash
npx cap open ios
```

### Step 3: Configure Signing in Xcode

1. **In Xcode, click on "App" in the left sidebar** (the blue project icon)
2. **Select the "App" target** (under TARGETS)
3. **Go to "Signing & Capabilities" tab**
4. **Check "Automatically manage signing"**
5. **Select your Team:**
   - If you have an Apple Developer account: Select it
   - If you don't: Click "Add Account..." and sign in with your Apple ID
   - Free Apple ID works for development/testing!

### Step 4: Select a Device

At the top of Xcode, next to the Play button:
- **For Simulator:** Select "iPhone 15 Pro" or any iOS Simulator
- **For Physical Device:** Connect your iPhone via USB and select it

### Step 5: Run the App

Click the **Play button (▶️)** or press `Cmd + R`

The app will:
- Build the iOS project
- Launch on your selected device/simulator
- Load your React app

## Testing Checklist

Once the app launches, test these features:

- [ ] **Authentication**
  - [ ] Can create an account
  - [ ] Can log in
  - [ ] Can log out

- [ ] **Profile**
  - [ ] Can complete profile setup
  - [ ] Can upload profile picture
  - [ ] Can edit profile

- [ ] **Core Features**
  - [ ] Can see other profiles
  - [ ] Can like/pass on profiles
  - [ ] Can view matches
  - [ ] Can send/receive messages

- [ ] **UI/UX**
  - [ ] Navigation works (bottom tabs)
  - [ ] Images load correctly
  - [ ] Text is readable
  - [ ] Buttons are tappable

## Common Issues & Fixes

### Issue: "No such module 'Capacitor'"
**Fix:**
```bash
cd ios/App
pod install
```
Then reopen Xcode.

### Issue: Build fails with signing errors
**Fix:**
- Make sure you selected a Team in Signing & Capabilities
- If using free Apple ID, you may need to trust the developer certificate on your device:
  - Settings → General → VPN & Device Management → Trust Developer

### Issue: App loads but shows blank screen
**Fix:**
1. Check Xcode console for errors
2. Make sure you ran `npm run build` before syncing
3. Check that `webDir: 'build'` in `capacitor.config.ts`

### Issue: Firebase not working
**Fix:**
- Your Firebase config has fallback values, so it should work
- Check Xcode console for Firebase errors
- Verify network connectivity in simulator/device

### Issue: Images not loading
**Fix:**
- Check that Firebase Storage rules allow reads
- Verify image URLs are correct
- Check network permissions

## Development Workflow

### Option A: Live Reload (Recommended for Development)

1. **Start React dev server:**
   ```bash
   npm start
   ```

2. **Enable live reload in `capacitor.config.ts`:**
   Uncomment these lines:
   ```typescript
   server: {
     url: 'http://localhost:3000',
     cleartext: true
   }
   ```

3. **Sync:**
   ```bash
   npx cap sync ios
   ```

4. **Run in Xcode** - Changes will hot reload!

### Option B: Build and Test (For Production Testing)

1. **Build:**
   ```bash
   npm run build
   npm run cap:sync
   ```

2. **Run in Xcode**

## Adding Permissions (If Needed)

If you need camera or photo library access:

1. **Open `ios/App/App/Info.plist`**
2. **Add these keys** (if not already present):

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take profile pictures</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select profile pictures</string>
```

Or add them in Xcode:
- Select project → Info tab → Custom iOS Target Properties
- Click + to add new keys

## Preparing for App Store

### 1. Update App Version
- In Xcode: Select project → General tab
- Update "Version" (e.g., 1.0.0)
- Update "Build" number (e.g., 1)

### 2. Add App Icons
- In Xcode: `ios/App/App/Assets.xcassets/AppIcon.appiconset`
- Add icons in all required sizes
- Or use an icon generator tool

### 3. Configure App Store Info
- App name, description, screenshots
- Privacy policy URL
- Support URL

### 4. Archive and Submit
- Product → Archive
- Distribute App → App Store Connect
- Follow the submission wizard

## Next Steps After Testing

1. **Test on Physical Device**
   - Connect iPhone via USB
   - Select device in Xcode
   - Run app
   - Test all features

2. **Add Missing Permissions**
   - Camera (for profile pictures)
   - Photo library (for selecting images)
   - Location (if you add location features)

3. **Optimize for Mobile**
   - Test on different screen sizes
   - Ensure touch targets are large enough
   - Test keyboard behavior
   - Test with slow network

4. **Add Push Notifications** (Optional)
   - Set up Firebase Cloud Messaging
   - Configure in Xcode
   - Add notification handlers

5. **Add App Store Assets**
   - Screenshots (required)
   - App description
   - Privacy policy
   - Support information

## Useful Commands Reference

```bash
# Build and sync
npm run cap:sync

# Build, sync, and open Xcode
npm run cap:ios

# Just sync (after making changes)
npx cap sync ios

# Open Xcode
npx cap open ios

# Update iOS dependencies
cd ios/App && pod install

# Check Capacitor status
npx cap doctor

# Build React app only
npm run build
```

## Resources

- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Apple Developer Portal](https://developer.apple.com/)

---

## Quick Start (TL;DR)

```bash
# 1. Build and sync
cd web
npm run build
npm run cap:sync

# 2. Open in Xcode
npm run cap:ios

# 3. In Xcode:
#    - Select your Team (Signing & Capabilities)
#    - Select a device/simulator
#    - Click Play ▶️
```

That's it! Your app should launch. 🚀

