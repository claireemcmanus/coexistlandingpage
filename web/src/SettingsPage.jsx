import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getUserProfile,
  upsertUserProfile,
} from "./services/firestore";
import "./ProfileDetailsPage.css";

export default function SettingsPage() {
  const { currentUser, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [openToNonMatches, setOpenToNonMatches] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!currentUser) return;
      try {
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setOpenToNonMatches(userProfile.openToNonMatches || false);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [currentUser]);

  async function handleLogout() {
    try {
      await logout();
      navigate("/auth");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }

  async function handleSaveSettings() {
    if (!currentUser) return;
    try {
      setStatus("Saving...");
      await upsertUserProfile(currentUser.uid, {
        openToNonMatches: openToNonMatches,
      });
      setStatus("Settings saved successfully!");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setStatus("Failed to save settings");
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setStatus("Please type 'DELETE' to confirm account deletion");
      return;
    }

    try {
      setDeleting(true);
      setStatus("Deleting account...");
      await deleteAccount();
      setStatus("Account deleted successfully. Redirecting...");
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error) {
      console.error("Failed to delete account:", error);
      setStatus("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          onClick={() => navigate("/profile")}
          style={styles.backButton}
        >
          ← Back
        </button>
        <h2 style={styles.title}>Settings</h2>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Preferences</h3>
        <div style={styles.inputGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={openToNonMatches}
              onChange={(e) => {
                setOpenToNonMatches(e.target.checked);
                handleSaveSettings();
              }}
              style={styles.checkbox}
            />
            <span>Open to messages from non-matches</span>
          </label>
          <p style={styles.checkboxHelp}>
            Allow users who haven't matched with you to send you messages
          </p>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Account</h3>
        <button
          type="button"
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          Logout
        </button>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Danger Zone</h3>
        <div style={styles.inputGroup}>
          <p style={styles.dangerText}>
            Once you delete your account, there is no going back. This will permanently delete your profile, matches, messages, and all associated data.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={styles.deleteAccountButton}
          >
            Delete Account
          </button>
        </div>
      </div>

      {status && (
        <div
          style={{
            ...styles.statusMessage,
            ...(status.includes("success") || status.includes("Saving")
              ? styles.statusSuccess
              : styles.statusError),
          }}
        >
          {status}
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Delete Account</h2>
            <p style={styles.modalText}>
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <p style={styles.modalWarning}>
              This will permanently delete:
            </p>
            <ul style={styles.modalList}>
              <li>Your profile and all personal information</li>
              <li>All your matches</li>
              <li>All your messages</li>
              <li>All your likes and passes</li>
              <li>All other account data</li>
            </ul>
            <label style={styles.modalLabel}>
              Type <strong>DELETE</strong> to confirm:
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                style={styles.modalInput}
                placeholder="DELETE"
                disabled={deleting}
              />
            </label>
            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                style={styles.modalCancelButton}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                style={{
                  ...styles.modalDeleteButton,
                  opacity: deleteConfirmText === "DELETE" && !deleting ? 1 : 0.5,
                  cursor: deleteConfirmText === "DELETE" && !deleting ? "pointer" : "not-allowed",
                }}
                disabled={deleteConfirmText !== "DELETE" || deleting}
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    padding: "20px",
    paddingBottom: "100px",
    paddingTop: "20px",
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
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  backButton: {
    padding: "8px 16px",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    color: "#a78bfa",
    border: "1px solid rgba(124, 58, 237, 0.4)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  title: {
    color: "#a78bfa",
    fontSize: "28px",
    fontWeight: "600",
    margin: 0,
  },
  section: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    marginBottom: "20px",
  },
  sectionTitle: {
    color: "#a78bfa",
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 20px 0",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "20px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#c4b5fd",
    fontSize: "14px",
    cursor: "pointer",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#7c3aed",
  },
  checkboxHelp: {
    margin: "4px 0 0 28px",
    color: "#a5b4fc",
    fontSize: "12px",
    fontStyle: "italic",
  },
  logoutButton: {
    padding: "14px 24px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.2s",
    width: "100%",
  },
  dangerText: {
    color: "#fca5a5",
    fontSize: "14px",
    marginBottom: "16px",
    lineHeight: "1.6",
  },
  deleteAccountButton: {
    padding: "12px 24px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  statusMessage: {
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "20px",
  },
  statusSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    color: "#10b981",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  statusError: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    color: "#fca5a5",
    border: "1px solid rgba(220, 38, 38, 0.3)",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    backgroundColor: "rgba(45, 53, 97, 0.98)",
    borderRadius: "12px",
    padding: "30px",
    maxWidth: "500px",
    width: "100%",
    border: "2px solid rgba(220, 38, 38, 0.5)",
    boxShadow: "0 8px 32px rgba(220, 38, 38, 0.3)",
  },
  modalTitle: {
    color: "#fca5a5",
    fontSize: "24px",
    fontWeight: "600",
    margin: "0 0 16px 0",
  },
  modalText: {
    color: "#e9d5ff",
    fontSize: "16px",
    margin: "0 0 16px 0",
    lineHeight: "1.6",
  },
  modalWarning: {
    color: "#fbbf24",
    fontSize: "14px",
    fontWeight: "600",
    margin: "16px 0 8px 0",
  },
  modalList: {
    color: "#c4b5fd",
    fontSize: "14px",
    margin: "0 0 20px 20px",
    lineHeight: "1.8",
  },
  modalLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#c4b5fd",
    fontSize: "14px",
    marginBottom: "20px",
  },
  modalInput: {
    padding: "12px",
    fontSize: "16px",
    border: "2px solid rgba(220, 38, 38, 0.3)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "rgba(26, 31, 58, 0.7)",
    color: "#fff",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
  },
  modalCancelButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "rgba(167, 139, 250, 0.2)",
    color: "#a78bfa",
    border: "1px solid rgba(167, 139, 250, 0.4)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  modalDeleteButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s",
  },
};

