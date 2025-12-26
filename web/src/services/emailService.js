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
export function isEmailJSConfigured() {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
}

export async function sendVerificationCodeEmail(email, code) {
  // If EmailJS is not configured, return the code for display
  if (!isEmailJSConfigured()) {
    console.warn('⚠️ EmailJS not configured.');
    console.warn('📧 To enable email sending, add these to your .env file:');
    console.warn('   REACT_APP_EMAILJS_SERVICE_ID=...');
    console.warn('   REACT_APP_EMAILJS_TEMPLATE_ID=...');
    console.warn('   REACT_APP_EMAILJS_PUBLIC_KEY=...');
    console.warn('💡 Your verification code is:', code);
    // Return the code so it can be displayed in the UI
    return Promise.resolve({ 
      text: 'Email sent (simulated)', 
      code: code,
      emailSent: false 
    });
  }

  try {
    const templateParams = {
      to_email: email,
      verification_code: code,
      app_name: 'Coexist',
    };

    console.log('📧 Sending verification email via EmailJS...');
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Verification code email sent successfully:', response.status);
    return { ...response, emailSent: true };
  } catch (error) {
    console.error('❌ Failed to send verification code email:', error);
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    
    // Return the code anyway so user can still verify (graceful degradation)
    return {
      code: code,
      emailSent: false,
      error: error.text || error.message || 'Failed to send email'
    };
  }
}

