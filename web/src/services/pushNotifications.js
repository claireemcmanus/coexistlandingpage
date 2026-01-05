// Push Notifications Service
// Handles push notification registration and token management

import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Request push notification permissions and register device
 * @param {string} userId - Current user ID
 * @returns {Promise<string|null>} - FCM token or null if failed
 */
export async function registerForPushNotifications(userId) {
  if (!userId) {
    console.warn("⚠️ Cannot register push notifications: No user ID");
    return null;
  }

  try {
    // On native iOS/Android, use Capacitor Push Notifications
    if (Capacitor.isNativePlatform()) {
      return await registerNativePushNotifications(userId);
    } else {
      // On web, use Firebase Cloud Messaging
      return await registerWebPushNotifications(userId);
    }
  } catch (error) {
    console.error("❌ Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Register for push notifications on native platforms (iOS/Android)
 */
async function registerNativePushNotifications(userId) {
  try {
    // Request permission
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn("⚠️ Push notification permission denied");
      return null;
    }

    // Register for push
    await PushNotifications.register();

    // Listen for registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('✅ Push registration success, token:', token.value);
      await saveTokenToFirestore(userId, token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error);
    });

    // Listen for push notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📬 Push notification received:', notification);
      // You can show a local notification or update UI here
    });

    // Listen for push notification actions
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('👆 Push notification action performed:', action);
      // Handle notification tap/action
    });

    return null; // Token will be received via listener
  } catch (error) {
    console.error("❌ Error in native push registration:", error);
    return null;
  }
}

/**
 * Register for push notifications on web using Firebase Cloud Messaging
 */
async function registerWebPushNotifications(userId) {
  if (!messaging) {
    console.warn("⚠️ Firebase Messaging not available");
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.warn("⚠️ Notification permission denied");
      return null;
    }

    // Get FCM token
    // Note: You need to create a Firebase web app and get the VAPID key
    // For now, this will work but you'll need to configure VAPID key in Firebase Console
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FCM_VAPID_KEY || undefined,
    });

    if (token) {
      console.log('✅ FCM registration token:', token);
      await saveTokenToFirestore(userId, token);

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('📬 Message received in foreground:', payload);
        // Show notification
        if (payload.notification) {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: payload.notification.icon || '/logo192.png',
          });
        }
      });

      return token;
    } else {
      console.warn("⚠️ No FCM token available");
      return null;
    }
  } catch (error) {
    console.error("❌ Error in web push registration:", error);
    return null;
  }
}

/**
 * Save FCM token to Firestore for this user
 */
async function saveTokenToFirestore(userId, token) {
  try {
    const tokenRef = doc(db, 'users', userId);
    const userDoc = await getDoc(tokenRef);
    
    const tokens = userDoc.exists() ? (userDoc.data().fcmTokens || []) : [];
    
    // Add token if not already present
    if (!tokens.includes(token)) {
      tokens.push(token);
      await setDoc(tokenRef, { fcmTokens: tokens }, { merge: true });
      console.log('✅ FCM token saved to Firestore');
    }
  } catch (error) {
    console.error("❌ Error saving FCM token:", error);
  }
}

/**
 * Remove FCM token when user logs out
 */
export async function removePushToken(userId, token) {
  try {
    const tokenRef = doc(db, 'users', userId);
    const userDoc = await getDoc(tokenRef);
    
    if (userDoc.exists()) {
      const tokens = userDoc.data().fcmTokens || [];
      const updatedTokens = tokens.filter(t => t !== token);
      await setDoc(tokenRef, { fcmTokens: updatedTokens }, { merge: true });
      console.log('✅ FCM token removed from Firestore');
    }
  } catch (error) {
    console.error("❌ Error removing FCM token:", error);
  }
}

