# EmailJS Setup for Verification Codes

This app uses EmailJS to send verification codes via email. Follow these steps to set it up:

## 1. Create an EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account (200 emails/month on free tier)
3. Verify your email address

## 2. Create an Email Service

1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions to connect your email
5. Note your **Service ID** (e.g., `service_xxxxx`)

## 3. Create an Email Template

1. Go to **Email Templates** in the EmailJS dashboard
2. Click **Create New Template**
3. Use this template:

**Template Name:** Verification Code

**Subject:** Your Coexist Verification Code

**Content:**
```
Hello,

Your verification code for Coexist is:

{{verification_code}}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Thanks,
The Coexist Team
```

4. Note your **Template ID** (e.g., `template_xxxxx`)

## 4. Get Your Public Key

1. Go to **Account** → **General** in EmailJS dashboard
2. Find your **Public Key** (e.g., `xxxxxxxxxxxxx`)

## 5. Add to Environment Variables

Add these to your `.env` file in the `web/` directory:

```env
REACT_APP_EMAILJS_SERVICE_ID=your_service_id_here
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id_here
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key_here
```

## 6. Development Mode

If EmailJS is not configured, the app will:
- Log the verification code to the console
- Still allow you to test the verification flow
- Work normally once EmailJS is configured

## Notes

- The free tier allows 200 emails per month
- For production, consider upgrading or using Firebase Cloud Functions with SendGrid/AWS SES
- Verification codes expire after 10 minutes
- Codes are stored in Firestore collection `verificationCodes`

