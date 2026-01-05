import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUserProfile } from "./services/firestore";
import "./ProfileDetailsPage.css";

export default function ProfileDetailsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      if (!currentUser) return;
      try {
        const userProfile = await getUserProfile(currentUser.uid);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [currentUser]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Profile</h2>
      </div>

      {/* Profile Preview */}
      {profile && (
        <div style={styles.profilePreview}>
          <div style={styles.profileImageContainer}>
            {profile.profilePictureUrl ? (
              <img
                src={profile.profilePictureUrl}
                alt={profile.displayName || "Profile"}
                style={styles.profileImage}
              />
            ) : (
              <div style={styles.profileImagePlaceholder}>
                {profile.displayName?.charAt(0) || "?"}
              </div>
            )}
          </div>
          <div style={styles.profileInfo}>
            <h3 style={styles.profileName}>
              {profile.displayName || "No name set"}
            </h3>
            {profile.hometown && (
              <p style={styles.profileLocation}>{profile.hometown}</p>
            )}
            {profile.age && (
              <p style={styles.profileAge}>{profile.age} years old</p>
            )}
          </div>
        </div>
      )}

      {/* Options List */}
      <div style={styles.optionsList}>
        <button
          onClick={() => navigate("/profile/edit")}
          style={styles.optionButton}
          className="profile-option-button"
        >
          <span style={styles.optionText}>Edit Profile</span>
          <span style={styles.optionArrow}>→</span>
        </button>

        <button
          onClick={() => navigate("/profile/settings")}
          style={styles.optionButton}
          className="profile-option-button"
        >
          <span style={styles.optionText}>Settings</span>
          <span style={styles.optionArrow}>→</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    padding: "20px",
    paddingBottom: "100px",
    paddingTop: "60px",
    maxWidth: "800px",
    margin: "0 auto",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    color: "#a78bfa",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    color: "#a78bfa",
    fontSize: "28px",
    fontWeight: "600",
    margin: 0,
  },
  profilePreview: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  profileImageContainer: {
    flexShrink: 0,
  },
  profileImage: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(167, 139, 250, 0.3)",
  },
  profileImagePlaceholder: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    color: "#a78bfa",
    border: "2px solid rgba(167, 139, 250, 0.3)",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: "#a78bfa",
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 8px 0",
  },
  profileLocation: {
    color: "#c4b5fd",
    fontSize: "14px",
    margin: "0 0 4px 0",
  },
  profileAge: {
    color: "#a5b4fc",
    fontSize: "14px",
    margin: 0,
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  optionButton: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px",
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
    width: "100%",
    textAlign: "left",
  },
  optionText: {
    flex: 1,
    color: "#e9d5ff",
    fontSize: "16px",
    fontWeight: "500",
  },
  optionArrow: {
    color: "#a78bfa",
    fontSize: "20px",
    flexShrink: 0,
  },
};
