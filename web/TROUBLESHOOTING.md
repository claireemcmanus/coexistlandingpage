# Troubleshooting Build Issues

## React Build Issues

If `npm run build` fails:

1. **Clear cache and rebuild:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Check for syntax errors:**
   - Look at the error message in the terminal
   - Fix any missing imports or syntax errors

## iOS/Xcode Build Issues

### Common Errors:

#### 1. "No such module 'Capacitor'"
**Solution:**
```bash
cd web/ios/App
pod install
```
Then reopen Xcode.

#### 2. "Signing for 'App' requires a development team"
**Solution:**
- In Xcode, go to Signing & Capabilities
- Select your Apple ID/Team
- Xcode will create a provisioning profile automatically

#### 3. "Build failed" with Swift/Pod errors
**Solution:**
```bash
cd web/ios/App
rm -rf Pods Podfile.lock
pod install
```

#### 4. "Cannot find 'Capacitor' in scope"
**Solution:**
- Make sure you ran `npx cap sync ios` after building
- Try: `cd web/ios/App && pod install`

#### 5. App crashes on launch
**Possible causes:**
- Firebase not configured for iOS
- Missing permissions in Info.plist
- Network security settings blocking HTTP

**Solution:**
- Check Xcode console for specific error
- Make sure Firebase is properly configured
- Add network permissions if needed

### Step-by-Step Build Process:

1. **Build React app:**
   ```bash
   cd web
   npm run build
   ```

2. **Sync to iOS:**
   ```bash
   npx cap sync ios
   ```

3. **Install iOS dependencies:**
   ```bash
   cd ios/App
   pod install
   cd ../..
   ```

4. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

5. **In Xcode:**
   - Select your team (Signing & Capabilities)
   - Choose a device/simulator
   - Click Play button

### If Still Not Working:

**Get the exact error:**
- In Xcode, check the Issue Navigator (left sidebar, triangle icon)
- Look at the Build Log (View → Navigators → Show Report Navigator)
- Copy the exact error message

**Common fixes:**
- Clean build: Product → Clean Build Folder (Shift+Cmd+K)
- Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Restart Xcode
- Update CocoaPods: `sudo gem install cocoapods`

## Still Having Issues?

Share the exact error message from:
- Terminal (if React build fails)
- Xcode (if iOS build fails)

This will help diagnose the specific problem!

