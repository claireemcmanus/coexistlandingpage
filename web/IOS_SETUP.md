# iOS App Setup Guide

Your React app is now configured to build as an iOS app using Capacitor!

## Prerequisites

1. **macOS** - You need a Mac to build iOS apps
2. **Xcode** - Download from the Mac App Store (free, but large ~10GB+)
3. **Apple Developer Account** - Free for development, $99/year for App Store distribution

## Quick Start

### 1. Build Your React App
```bash
cd web
npm run build
```

### 2. Sync to iOS
```bash
npx cap sync ios
```

### 3. Open in Xcode
```bash
npx cap open ios
```

Or use the shortcut:
```bash
npm run cap:ios
```

This will:
- Build your React app
- Sync it to the iOS project
- Open Xcode automatically

## First Time Setup in Xcode

1. **Open the project:**
   - After running `npx cap open ios`, Xcode will open
   - You'll see the `App` project in the left sidebar

2. **Select your development team:**
   - Click on "App" in the project navigator
   - Go to "Signing & Capabilities" tab
   - Under "Signing", select your Apple ID/Team
   - Xcode will automatically create a provisioning profile

3. **Select a device:**
   - At the top, next to the play button, select:
     - A connected iPhone/iPad, OR
     - An iOS Simulator (iPhone 15, etc.)

4. **Run the app:**
   - Click the Play button (▶️) or press `Cmd + R`
   - The app will build and launch on your device/simulator

## Development Workflow

### Option 1: Live Reload (Recommended for Development)

1. **Start your React dev server:**
   ```bash
   npm start
   ```

2. **Update capacitor.config.ts:**
   Uncomment these lines:
   ```typescript
   server: {
     url: 'http://localhost:3000',
     cleartext: true
   }
   ```

3. **Sync and open:**
   ```bash
   npx cap sync ios
   npx cap open ios
   ```

4. **Run in Xcode** - The app will load from your dev server with live reload!

### Option 2: Build and Test (For Production Testing)

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Sync to iOS:**
   ```bash
   npx cap sync ios
   ```

3. **Open in Xcode and run**

## Important Notes

### Firebase Configuration
- Your `.env` file won't work in the iOS app
- You need to add Firebase config directly to the iOS project OR
- Use environment variables in Xcode build settings
- See "Firebase Setup for iOS" section below

### App Icons
- Update app icons in Xcode: `ios/App/App/Assets.xcassets/AppIcon.appiconset`
- You can use your existing logo files

### Permissions
If you need camera, photo library, or location access:
1. In Xcode, go to `Info.plist`
2. Add required permission descriptions
3. Capacitor plugins handle this automatically for most cases

## Firebase Setup for iOS

Since environment variables don't work the same way in native apps, you have two options:

### Option 1: Hardcode in iOS (Not Recommended for Production)
Edit `ios/App/App/AppDelegate.swift` or create a config file

### Option 2: Use Xcode Build Configurations (Recommended)
1. In Xcode, select your project
2. Go to Build Settings
3. Add User-Defined Settings for each Firebase config value
4. Reference them in your code

### Option 3: Use Capacitor Preferences (Best)
Create a `capacitor.config.ts` with your config (but don't commit secrets!)

## Building for App Store

1. **Update version in Xcode:**
   - Select project → General tab
   - Update Version and Build number

2. **Archive:**
   - Product → Archive
   - Wait for build to complete

3. **Distribute:**
   - Click "Distribute App"
   - Choose App Store Connect
   - Follow the wizard

## Troubleshooting

**"No such module 'Capacitor'"**
- Run: `cd ios/App && pod install`
- Then reopen Xcode

**Build errors:**
- Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
- Delete DerivedData folder
- Rebuild

**App won't load:**
- Check that `webDir: 'build'` in capacitor.config.ts
- Make sure you ran `npm run build` first
- Check Xcode console for errors

**Firebase not working:**
- Make sure Firebase SDK is properly configured
- Check network permissions in Info.plist
- Verify Firebase config values are correct

## Useful Commands

```bash
# Build and sync in one command
npm run cap:sync

# Open iOS project
npx cap open ios

# Update iOS dependencies
cd ios/App && pod install

# Check Capacitor version
npx cap doctor
```

## Next Steps

- [ ] Test on iOS Simulator
- [ ] Test on physical device
- [ ] Set up Firebase for iOS
- [ ] Add app icons
- [ ] Configure app permissions
- [ ] Test all features (matching, messaging, etc.)
- [ ] Prepare for App Store submission

## Resources

- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)
- [App Store Connect](https://appstoreconnect.apple.com/)

