import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile } from "../services/firestore";

export default function ProfileCheck({ children }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(currentUser.uid);
        if (!profile || !profile.profileComplete) {
          setNeedsProfile(true);
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        setNeedsProfile(true);
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, [currentUser]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "#a78bfa" }}>Loading...</div>;
  }

  if (needsProfile) {
    return <Navigate to="/profile-setup" />;
  }

  return children;
}

