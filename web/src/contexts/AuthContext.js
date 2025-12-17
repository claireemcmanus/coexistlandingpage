import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password) {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized. Please check your configuration.");
    }
    
    console.log("Signup function called with email:", email);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Signup successful, user credential received:", userCredential.user?.uid);
      
      // Manually update current user since listener might not fire
      if (userCredential.user) {
        console.log("Manually setting current user after signup");
        setCurrentUser(userCredential.user);
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Send email verification after signup
      if (userCredential.user) {
        try {
          await sendEmailVerification(userCredential.user);
          console.log("✅ Verification email sent successfully");
        } catch (verifyError) {
          console.error("Failed to send verification email:", verifyError);
          // Don't fail signup if verification email fails - user can request resend later
          // The error is logged but signup still succeeds
        }
      }
      return userCredential;
    } catch (error) {
      console.error("Signup error:", error);
      console.error("Error code:", error.code);
      throw error; // Re-throw to be handled by the calling component
    }
  }

  async function login(email, password) {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized. Please check your configuration.");
    }
    
    console.log("Login function called with email:", email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful, user credential received:", userCredential.user?.uid);
      
      // Manually update current user since listener might not fire
      if (userCredential.user) {
        console.log("Manually setting current user after login");
        setCurrentUser(userCredential.user);
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return userCredential;
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error code:", error.code);
      throw error;
    }
  }

  function logout() {
    if (!auth) {
      return Promise.reject(new Error("Firebase Auth is not initialized."));
    }
    return signOut(auth);
  }

  function sendVerificationEmail() {
    if (currentUser && !currentUser.emailVerified) {
      return sendEmailVerification(currentUser);
    }
    return Promise.reject(new Error("User not found or already verified"));
  }

  useEffect(() => {
    if (!auth) {
      console.error("Firebase Auth is not initialized");
      setLoading(false);
      return;
    }

    console.log("Setting up auth state listener...");
    console.log("Auth object exists:", !!auth);
    console.log("Auth app:", auth?.app?.name);
    
    // Check for cached user immediately (works offline)
    const cachedUser = auth.currentUser;
    console.log("Cached user check:", cachedUser ? cachedUser.uid : "none");
    
    // If we have a cached user, use it immediately and proceed
    // The listener will update it if the state changes
    if (cachedUser) {
      console.log("Found cached user:", cachedUser.uid);
      setCurrentUser(cachedUser);
      // Still set up listener, but don't wait for it
      setLoading(false);
    }
    
    let listenerFired = false;
    
    // Set a timeout to allow network requests, but proceed faster if we have cached user
    const timeoutDuration = cachedUser ? 5000 : 10000;
    const timeoutId = setTimeout(() => {
      if (!listenerFired) {
        console.warn("Auth state listener timeout after", timeoutDuration, "ms");
        console.warn("This usually means Firebase Auth can't connect to servers");
        console.warn("Check network connectivity and Info.plist settings");
        
        // Check current auth state again (might have been updated by login/signup)
        const currentAuthUser = auth.currentUser;
        
        // Use current auth user if available, otherwise cached user, otherwise null
        if (currentAuthUser) {
          console.log("Using current auth user due to timeout");
          setCurrentUser(currentAuthUser);
        } else if (cachedUser) {
          console.log("Using cached user due to timeout");
          setCurrentUser(cachedUser);
        } else {
          console.log("No cached user, proceeding without authentication");
          setCurrentUser(null);
        }
        setLoading(false);
      }
    }, timeoutDuration);

    try {
      console.log("Calling onAuthStateChanged...");
      console.log("Auth object type:", typeof auth);
      console.log("Auth object keys:", Object.keys(auth || {}));
      
      // Try to manually trigger auth state check first
      if (auth && typeof auth.currentUser !== 'undefined') {
        console.log("Auth.currentUser is accessible:", auth.currentUser ? "has user" : "null");
      }
      
      const unsubscribe = onAuthStateChanged(
        auth, 
        (user) => {
          listenerFired = true;
          console.log("✅ Auth state changed callback fired!");
          console.log("User:", user ? user.uid : "null");
          clearTimeout(timeoutId);
          setCurrentUser(user);
          setLoading(false);
        }, 
        (error) => {
          listenerFired = true;
          console.error("❌ Auth state change error:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          clearTimeout(timeoutId);
          // On error, use cached user if available, otherwise proceed
          if (cachedUser) {
            console.log("Using cached user due to error");
            setCurrentUser(cachedUser);
          } else {
            setCurrentUser(null);
          }
          setLoading(false);
        }
      );

      console.log("onAuthStateChanged called, unsubscribe function:", typeof unsubscribe);
      
      // Force a check after a short delay to see if listener is working
      setTimeout(() => {
        if (!listenerFired) {
          console.log("Listener hasn't fired after 1 second, checking auth state manually...");
          const manualCheck = auth.currentUser;
          console.log("Manual check result:", manualCheck ? manualCheck.uid : "null");
          
          // If we can manually check but listener hasn't fired, there might be an issue
          // Try to manually set the user if we found one
          if (manualCheck && !cachedUser) {
            console.log("Found user via manual check, setting it");
            listenerFired = true;
            clearTimeout(timeoutId);
            setCurrentUser(manualCheck);
            setLoading(false);
          }
        }
      }, 1000);

      return () => {
        console.log("Cleaning up auth listener");
        clearTimeout(timeoutId);
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error("Failed to set up auth state listener:", error);
      console.error("Error stack:", error.stack);
      clearTimeout(timeoutId);
      // On setup failure, use cached user if available
      if (cachedUser) {
        setCurrentUser(cachedUser);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    sendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          justifyContent: "center", 
          alignItems: "center", 
          minHeight: "100vh", 
          color: "#a78bfa",
          background: "linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)",
          padding: "20px"
        }}>
          <div style={{ fontSize: "18px", marginBottom: "10px" }}>Loading...</div>
          <div style={{ fontSize: "14px", opacity: 0.7 }}>
            {auth ? "Checking authentication..." : "Initializing..."}
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

