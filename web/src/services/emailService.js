import emailjs from '@emailjs/browser';

// Initialize EmailJS (you'll need to set these in your .env file)
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '';

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Send verification code email using EmailJS
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise} - Promise that resolves when email is sent
 */
export async function sendVerificationCodeEmail(email, code) {
  // If EmailJS is not configured, log the code to console (for development)
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('⚠️ EmailJS not configured. Verification code:', code);
    console.warn('📧 In production, configure EmailJS or use Firebase Cloud Functions');
    // For development, we'll simulate success
    return Promise.resolve({ text: 'Email sent (simulated)' });
  }

  try {
    const templateParams = {
      to_email: email,
      verification_code: code,
      app_name: 'Coexist',
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Verification code email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send verification code email:', error);
    throw new Error('Failed to send verification email. Please try again later.');
  }
}

