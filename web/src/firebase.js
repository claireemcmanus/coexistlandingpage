// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

let app;
try {
  // Check if Firebase config is valid
  const hasRequiredConfig = 
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId;
  
  if (!hasRequiredConfig) {
    console.error("Firebase configuration is missing required fields. Please check your .env file.");
    console.error("Required: REACT_APP_FIREBASE_API_KEY, REACT_APP_FIREBASE_AUTH_DOMAIN, REACT_APP_FIREBASE_PROJECT_ID");
  }
  
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully!");
} catch (error) {
  console.error("Firebase initialization failed:", error);
  console.error("Please check your Firebase configuration in the .env file");
  throw error; // Re-throw to prevent undefined app
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;

