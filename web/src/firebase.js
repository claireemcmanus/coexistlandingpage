// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  initializeAuth,
  indexedDBLocalPersistence,
} from "firebase/auth";
// For iOS, these values are embedded in the built JavaScript bundle
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDs9B8K1X8xmyw77l4BM55z7nTZzZ0mf5M",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "collegeconnect-3906d.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "collegeconnect-3906d",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "collegeconnect-3906d.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "114960693146",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:114960693146:web:bbe01ba7f0bb4f1daaec23",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-113E6P25MQ",
};

const app = initializeApp(firebaseConfig);

// 🔐 THIS IS THE KEY DIFFERENCE
// iOS Capacitor REQUIRES initializeAuth + indexedDBLocalPersistence
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
});

console.log("✅ Firebase Auth initialized with indexedDB persistence");

// 📦 Other services
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };