import { db } from "../firebase";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { upsertUserProfile } from "./firestore";

// Generate a 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store verification code in Firestore with expiration (10 minutes)
export async function createVerificationCode(userId, email) {
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

  const codeDoc = {
    code,
    userId,
    email,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt.toISOString(),
    verified: false,
  };

  // Store in Firestore
  await setDoc(doc(db, "verificationCodes", userId), codeDoc);

  return code;
}

// Verify a code
export async function verifyCode(userId, inputCode) {
  try {
    const codeDoc = await getDoc(doc(db, "verificationCodes", userId));
    
    if (!codeDoc.exists()) {
      return { valid: false, error: "No verification code found. Please request a new code." };
    }

    const data = codeDoc.data();
    
    // Check if code is already verified
    if (data.verified) {
      return { valid: false, error: "This code has already been used." };
    }

    // Check if code has expired
    const expiresAt = new Date(data.expiresAt);
    if (new Date() > expiresAt) {
      // Delete expired code
      await deleteDoc(doc(db, "verificationCodes", userId));
      return { valid: false, error: "Verification code has expired. Please request a new code." };
    }

    // Check if code matches
    if (data.code !== inputCode) {
      return { valid: false, error: "Invalid verification code. Please try again." };
    }

    // Mark code as verified
    await setDoc(
      doc(db, "verificationCodes", userId),
      { verified: true },
      { merge: true }
    );

    // Mark email as verified in user profile (Firestore)
    // Note: Firebase Auth emailVerified can only be set server-side,
    // so we track verification in Firestore
    await upsertUserProfile(userId, {
      emailVerified: true,
      emailVerifiedAt: serverTimestamp(),
    });

    return { valid: true };
  } catch (error) {
    console.error("Error verifying code:", error);
    return { valid: false, error: "An error occurred while verifying the code. Please try again." };
  }
}

// Delete verification code (cleanup)
export async function deleteVerificationCode(userId) {
  try {
    await deleteDoc(doc(db, "verificationCodes", userId));
  } catch (error) {
    console.error("Error deleting verification code:", error);
  }
}

// Get verification code for a user (for resending)
export async function getVerificationCode(userId) {
  try {
    const codeDoc = await getDoc(doc(db, "verificationCodes", userId));
    if (!codeDoc.exists()) {
      return null;
    }
    return codeDoc.data();
  } catch (error) {
    console.error("Error getting verification code:", error);
    return null;
  }
}

