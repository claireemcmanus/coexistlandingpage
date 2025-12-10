import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import {
  sendMessage,
  subscribeToMessages,
  subscribeToRooms,
  createRoom,
  getUserProfile,
  upsertUserProfile,
  getMatches,
} from "./services/firestore";
import "./MessagePage.css";

export default function MessagePage() {
  const { currentUser, logout, sendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [matches, setMatches] = useState([]);
  const messagesEndRef = React.useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to rooms in real-time
  useEffect(() => {
    const unsubscribe = subscribeToRooms((data) => {
      setRooms(data);
      if (!selectedRoomId && data.length > 0) {
        setSelectedRoomId(data[0].id);
      }
    });
    return () => unsubscribe();
  }, [selectedRoomId]);

  // Subscribe to messages for selected room
  useEffect(() => {
    if (!selectedRoomId) return;
    const unsubscribe = subscribeToMessages(selectedRoomId, (data) => {
      setMessages(data);
    });
    return () => unsubscribe();
  }, [selectedRoomId]);

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      if (!currentUser) return;
      const profile = await getUserProfile(currentUser.uid);
      if (profile?.displayName) {
        setProfileName(profile.displayName);
      } else {
        const fallback = currentUser.email?.split("@")[0] || "New User";
        setProfileName(fallback);
      }
    }
    loadProfile();
  }, [currentUser]);

  // Load matches
  useEffect(() => {
    async function loadMatches() {
      if (!currentUser) return;
      try {
        const userMatches = await getMatches(currentUser.uid);
        setMatches(userMatches);
      } catch (error) {
        console.error("Error loading matches:", error);
      }
    }
    loadMatches();
  }, [currentUser]);

  const currentDisplayName = useMemo(() => {
    if (profileName) return profileName;
    return currentUser?.email?.split("@")[0] || "Anonymous";
  }, [profileName, currentUser]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoomId) return;
    try {
      await sendMessage({
        roomId: selectedRoomId,
        text: newMessage.trim(),
        user: {
          id: currentUser?.uid,
          email: currentUser?.email,
          displayName: currentDisplayName,
        },
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const roomRef = await createRoom(newRoomName, currentUser);
      setNewRoomName("");
      setSelectedRoomId(roomRef.id);
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/auth");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await upsertUserProfile(currentUser.uid, {
        displayName: profileName || currentDisplayName,
        email: currentUser.email,
      });
      setProfileStatus("Saved!");
      setTimeout(() => setProfileStatus(""), 2500);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setProfileStatus("Save failed");
    }
  }

  async function handleResendVerification() {
    try {
      await sendVerificationEmail();
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 4000);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }
  }

  return (
    <div style={styles.container}>
      {currentUser && !currentUser.emailVerified && (
        <div style={styles.verificationBanner}>
          <div style={styles.verificationContent}>
            <span>
              Please verify your email address. Check your inbox for the verification email.
            </span>
            <button
              onClick={handleResendVerification}
              style={styles.resendButton}
              disabled={verificationSent}
            >
              {verificationSent ? "Email Sent!" : "Resend Email"}
            </button>
          </div>
        </div>
      )}

      <div style={styles.topRow}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Messages</h2>
            <p style={styles.userInfo}>
              Signed in as: <strong>{currentUser?.email}</strong>
              {currentUser?.emailVerified && (
                <span style={styles.verifiedBadge}>Verified</span>
              )}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={styles.logoutButton}
            className="message-logout-button"
          >
            Logout
          </button>
        </div>

        <div style={styles.profileCard}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Profile</h3>
          </div>
          <form onSubmit={handleSaveProfile} style={styles.form}>
            <label style={styles.label}>Display Name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              style={styles.input}
              placeholder="Enter display name"
            />
            <button type="submit" style={styles.saveButton}>
              Save Profile
            </button>
            {profileStatus && (
              <p style={styles.statusText}>{profileStatus}</p>
            )}
          </form>
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Chat Rooms</h3>
          </div>
          <div style={styles.roomsList}>
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className="room-button"
                style={{
                  ...styles.roomButton,
                  ...(selectedRoomId === room.id ? styles.roomButtonActive : {}),
                }}
              >
                {room.name || "Untitled Room"}
              </button>
            ))}
            {rooms.length === 0 && (
              <p style={styles.emptyMessage}>No rooms yet. Create one below.</p>
            )}
          </div>
          <form onSubmit={handleCreateRoom} style={styles.form}>
            <label style={styles.label}>Create Room</label>
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name"
              style={styles.input}
            />
            <button type="submit" style={styles.secondaryButton}>
              Create
            </button>
          </form>
        </div>

        <div style={styles.content}>
          <div style={styles.messagesHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Room</h3>
              <p style={styles.subtitle}>
                {rooms.find((r) => r.id === selectedRoomId)?.name || "Select a room"}
              </p>
            </div>
          </div>

          <div style={styles.messagesBox} className="messages-box">
            {messages.length === 0 ? (
              <div style={styles.emptyMessage}>No messages yet. Start the conversation!</div>
            ) : (
              <>
        {messages.map((msg) => (
                  <div key={msg.id} style={styles.messageItem} className="message-item">
                    <div style={styles.messageHeader}>
                      <span style={styles.messageAuthor}>
                        {msg.displayName || msg.userEmail || "Anon"}
                      </span>
                      <span style={styles.messageMeta}>
                        {msg.createdAt?.toDate
                          ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ""}
                      </span>
                    </div>
                    <div style={styles.messageText}>{msg.text}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <form onSubmit={handleSendMessage} style={styles.messageForm}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={styles.input}
              className="message-input"
            />
            <button
              type="submit"
              style={styles.addButton}
              className="message-add-button"
              disabled={!selectedRoomId || !newMessage.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    padding: "20px",
  },
  topRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  header: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "20px",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 8px 32px rgba(107, 70, 193, 0.3)",
    border: "1px solid rgba(167, 139, 250, 0.2)",
  },
  headerActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  navButton: {
    padding: "8px 16px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  title: {
    margin: 0,
    color: "#a78bfa",
    fontWeight: "600",
  },
  userInfo: {
    margin: "8px 0 0 0",
    color: "#c4b5fd",
    fontSize: "14px",
  },
  verifiedBadge: {
    color: "#10b981",
    fontSize: "12px",
    marginLeft: "8px",
  },
  logoutButton: {
    padding: "8px 16px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  profileCard: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(107, 70, 193, 0.3)",
    border: "1px solid rgba(167, 139, 250, 0.2)",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: "20px",
  },
  sidebar: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(107, 70, 193, 0.3)",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    margin: 0,
    color: "#a78bfa",
    fontWeight: "600",
  },
  roomsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  roomButton: {
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    color: "#e9d5ff",
    cursor: "pointer",
    transition: "all 0.2s",
    fontSize: "14px",
    fontWeight: "500",
  },
  roomButtonActive: {
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    borderColor: "rgba(124, 58, 237, 0.6)",
    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.2)",
  },
  content: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(107, 70, 193, 0.3)",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minHeight: "70vh",
  },
  messagesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtitle: {
    margin: 0,
    color: "#c4b5fd",
    fontSize: "14px",
  },
  messagesBox: {
    backgroundColor: "rgba(26, 31, 58, 0.6)",
    borderRadius: "10px",
    padding: "16px",
    border: "1px solid rgba(167, 139, 250, 0.1)",
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minHeight: 0,
  },
  messageItem: {
    backgroundColor: "rgba(45, 53, 97, 0.8)",
    borderRadius: "10px",
    padding: "12px 14px",
    border: "1px solid rgba(124, 58, 237, 0.2)",
    transition: "all 0.2s",
  },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  messageAuthor: {
    color: "#a78bfa",
    fontWeight: "600",
    fontSize: "14px",
  },
  messageMeta: {
    color: "#9ca3af",
    fontSize: "12px",
  },
  messageText: {
    color: "#e5e7eb",
    fontSize: "15px",
    lineHeight: "1.5",
    wordWrap: "break-word",
  },
  messageForm: {
    display: "flex",
    gap: "12px",
  },
  input: {
    padding: "12px 16px",
    fontSize: "15px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "8px",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "rgba(26, 31, 58, 0.7)",
    color: "#fff",
    flex: 1,
  },
  addButton: {
    padding: "12px 18px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  label: {
    color: "#c4b5fd",
    fontSize: "14px",
  },
  secondaryButton: {
    padding: "10px",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    color: "#e9d5ff",
    border: "1px solid rgba(124, 58, 237, 0.4)",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  saveButton: {
    padding: "10px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  statusText: {
    color: "#a5b4fc",
    fontSize: "13px",
    margin: 0,
  },
  emptyMessage: {
    padding: "12px",
    textAlign: "center",
    color: "#a5b4fc",
    fontStyle: "italic",
  },
  verificationBanner: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    border: "1px solid rgba(251, 191, 36, 0.4)",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "20px",
    color: "#fbbf24",
  },
  verificationContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  resendButton: {
    padding: "8px 14px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
};
