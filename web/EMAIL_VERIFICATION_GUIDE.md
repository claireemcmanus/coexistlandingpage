# Email Verification Setup Guide

## Current Implementation

The app now uses **Firebase's built-in email verification** (primary) with a **6-digit code fallback**:
1. Firebase sends a verification email with a link (automatic, no setup needed!)
2. User clicks the link OR enters a 6-digit code
3. Email is verified and user can proceed

## Most Efficient Setup Options

### Option 1: Firebase Email Verification (Current - Recommended - NO SETUP NEEDED!)

**Pros:**
- ✅ **Works immediately - no setup required!**
- ✅ Unlimited emails (Firebase handles it)
- ✅ More reliable than third-party services
- ✅ Built into Firebase Auth
- ✅ Free tier is very generous

**Cons:**
- Sends a link (not a code) - but code fallback is available

**How it works:**
- Firebase automatically sends verification emails
- User clicks the link in their email
- OR user can enter the 6-digit code (fallback)
- No configuration needed!

### Option 2: EmailJS (Optional - For Code-Only Verification)

**Pros:**
- Free tier: 200 emails/month
- Easy to set up (5-10 minutes)
- No server required
- Works immediately

**Cons:**
- Limited to 200 emails/month on free tier
- Requires manual setup

**Setup Steps:**
1. Go to [emailjs.com](https://www.emailjs.com/) and create a free account
2. Create an email service (Gmail, Outlook, etc.)
3. Create an email template with `{{verification_code}}` variable
4. Get your Service ID, Template ID, and Public Key
5. Add to `.env` file:
   ```
   REACT_APP_EMAILJS_SERVICE_ID=service_xxxxx
   REACT_APP_EMAILJS_TEMPLATE_ID=template_xxxxx
   REACT_APP_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxx
   ```
6. Restart your dev server

**See `EMAILJS_SETUP.md` for detailed instructions.**

### Option 3: Firebase Cloud Functions (Advanced - For Custom Emails)

**Pros:**
- Unlimited emails
- More reliable
- Better for production
- Can use SendGrid, AWS SES, or other providers

**Cons:**
- Requires server setup
- More complex to implement
- Costs money (but very cheap)

**Would require:**
- Setting up Firebase Cloud Functions
- Integrating with SendGrid or AWS SES
- Deploying functions

### Option 4: Development Mode (Code Display Only)

If EmailJS is not configured:
- Code is displayed on screen
- User can copy and paste it
- Works for testing

## Troubleshooting

### Email Not Sending

1. **Check EmailJS Configuration:**
   - Open browser console (F12)
   - Look for warnings about EmailJS not configured
   - Verify `.env` file has correct values
   - Restart dev server after changing `.env`

2. **Check EmailJS Dashboard:**
   - Go to emailjs.com dashboard
   - Check "Email Logs" to see if emails are being sent
   - Verify service is connected properly
   - Check template has `{{verification_code}}` variable

3. **Check Console Logs:**
   - Look for "✅ Verification code email sent successfully"
   - If you see "⚠️ EmailJS not configured", add env variables
   - If you see errors, check the error message

### Code Not Displaying

1. **Check Browser Console:**
   - Code should be logged: `💡 Your verification code is: XXXXXX`
   - If EmailJS fails, code should appear on screen

2. **Check Verification Screen:**
   - Code should appear in a box if email wasn't sent
   - If email was sent, code appears if you click "Can't find the email?"

### Verification Not Working

1. **Check Code Expiration:**
   - Codes expire after 10 minutes
   - Request a new code if expired

2. **Check Firestore:**
   - Go to Firebase Console → Firestore
   - Check `verificationCodes` collection
   - Verify code exists and isn't marked as `verified: true`

3. **Check User Profile:**
   - After verification, `emailVerified: true` should be set in user profile
   - Check `users` collection in Firestore

## Quick Test

1. Sign up with a test email
2. Check browser console for the code
3. Enter the code in the verification screen
4. Should redirect to profile setup

## Current Status

The verification system:
- ✅ Generates 6-digit codes
- ✅ Stores codes in Firestore with expiration
- ✅ Sends via EmailJS (if configured)
- ✅ Displays code on screen (if EmailJS not configured)
- ✅ Validates codes and marks email as verified
- ✅ Prevents login if email not verified

## Next Steps

1. **For Development:** Use the on-screen code display (no setup needed)
2. **For Testing:** Set up EmailJS free tier (5 minutes)
3. **For Production:** Consider Firebase Cloud Functions with SendGrid

## Common Issues

**Issue:** "Email service not configured"
- **Solution:** Add EmailJS credentials to `.env` file

**Issue:** "Verification code has expired"
- **Solution:** Click "Resend Code" to get a new one

**Issue:** "Invalid verification code"
- **Solution:** Make sure you're entering the exact 6-digit code (check for typos)

**Issue:** "No verification code found"
- **Solution:** Request a new code using "Resend Code" button

