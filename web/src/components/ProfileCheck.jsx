import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile } from "../services/firestore";

export default function ProfileCheck({ children }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (!currentUser) {
        console.log("ProfileCheck: No current user, stopping check");
        setLoading(false);
        return;
      }

      // Check if email is verified first
      if (!currentUser.emailVerified) {
        console.log("ProfileCheck: Email not verified");
        setNeedsVerification(true);
        setLoading(false);
        return;
      }

      console.log("ProfileCheck: Checking profile for user:", currentUser.uid);
      
      try {
        // Add timeout to prevent hanging
        const profilePromise = getUserProfile(currentUser.uid);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Profile check timeout")), 10000)
        );
        
        const profile = await Promise.race([profilePromise, timeoutPromise]);
        
        console.log("ProfileCheck: Profile retrieved:", profile ? "exists" : "null");
        console.log("ProfileCheck: profileComplete:", profile?.profileComplete);
        
        if (!profile || !profile.profileComplete) {
          console.log("ProfileCheck: Profile incomplete, redirecting to setup");
          setNeedsProfile(true);
        } else {
          console.log("ProfileCheck: Profile complete, allowing access");
        }
      } catch (error) {
        console.error("ProfileCheck: Error checking profile:", error);
        console.error("ProfileCheck: Error details:", {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        
        // If it's a network/permission error, allow access anyway (user can complete profile later)
        // Only redirect to setup if we're sure there's no profile
        if (error.code === 'permission-denied' || error.code === 'unavailable' || error.message?.includes('timeout')) {
          console.warn("ProfileCheck: Network/permission error, allowing access but will check again");
          // Don't redirect, allow them to proceed
        } else {
          // For other errors, assume profile needs setup
          setNeedsProfile(true);
        }
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, [currentUser]);

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh", 
        color: "#a78bfa",
        background: "linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)"
      }}>
        <div style={{ fontSize: "18px", marginBottom: "10px" }}>Loading profile...</div>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>Checking your profile</div>
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh", 
        padding: "20px",
        color: "#a78bfa",
        background: "linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)"
      }}>
        <div style={{ 
          backgroundColor: "rgba(45, 53, 97, 0.95)",
          borderRadius: "12px",
          padding: "40px",
          maxWidth: "500px",
          width: "100%",
          border: "1px solid rgba(167, 139, 250, 0.2)",
        }}>
          <h2 style={{ marginBottom: "20px", textAlign: "center", color: "#a78bfa" }}>
            Email Verification Required
          </h2>
          <p style={{ marginBottom: "20px", color: "#c4b5fd", lineHeight: "1.6" }}>
            Please verify your email address before continuing. We've sent a verification link to:
          </p>
          <p style={{ 
            marginBottom: "20px", 
            color: "#a78bfa", 
            fontWeight: "600",
            textAlign: "center",
            wordBreak: "break-all"
          }}>
            {currentUser?.email}
          </p>
          <p style={{ marginBottom: "30px", color: "#a5b4fc", fontSize: "14px", lineHeight: "1.6" }}>
            Click the link in the email to verify your account. After verification, you can refresh this page or log in again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              fontWeight: "600",
              color: "white",
              backgroundColor: "#7c3aed",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            I've Verified My Email
          </button>
        </div>
      </div>
    );
  }

  if (needsProfile) {
    console.log("ProfileCheck: Redirecting to profile setup");
    return <Navigate to="/profile-setup" />;
  }

  console.log("ProfileCheck: Rendering children");
  return children;
}

