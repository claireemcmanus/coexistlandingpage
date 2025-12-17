import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { getMatches, getUserProfile } from "./services/firestore";
import { subscribeToMessages, sendMessage } from "./services/firestore";
import "./MatchesMessagesPage.css";

export default function MatchesMessagesPage() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [matchProfiles, setMatchProfiles] = useState({});
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const messagesEndRef = React.useRef(null);
  
  // Check for userId query parameter for direct messaging
  const directMessageUserId = searchParams.get("userId");

  useEffect(() => {
    async function loadMatches() {
      if (!currentUser) return;
      try {
        // Load current user profile
        const userProfile = await getUserProfile(currentUser.uid);
        setCurrentUserProfile(userProfile);

        const userMatches = await getMatches(currentUser.uid);
        setMatches(userMatches);

        // Load profiles for each match
        const profiles = {};
        for (const match of userMatches) {
          const otherUserId =
            match.userId1 === currentUser.uid ? match.userId2 : match.userId1;
          const profile = await getUserProfile(otherUserId);
          if (profile) {
            profiles[otherUserId] = profile;
          }
        }

        // If there's a direct message userId, load that profile
        if (directMessageUserId) {
          const directProfile = await getUserProfile(directMessageUserId);
          if (directProfile) {
            profiles[directMessageUserId] = directProfile;
            setSelectedMatch(directMessageUserId);
          }
        } else if (userMatches.length > 0 && !selectedMatch) {
          const firstMatch = userMatches[0];
          const otherUserId =
            firstMatch.userId1 === currentUser.uid
              ? firstMatch.userId2
              : firstMatch.userId1;
          setSelectedMatch(otherUserId);
        }

        setMatchProfiles(profiles);
      } catch (error) {
        console.error("Error loading matches:", error);
      }
    }
    loadMatches();
  }, [currentUser, directMessageUserId]);

  // Subscribe to messages for selected match
  useEffect(() => {
    if (!selectedMatch || !currentUser) return;

    const roomId = [currentUser.uid, selectedMatch].sort().join("_");
    const unsubscribe = subscribeToMessages(roomId, (data) => {
      setMessages(data);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, currentUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMatch || !currentUser) return;

    try {
      const roomId = [currentUser.uid, selectedMatch].sort().join("_");
      
      await sendMessage({
        roomId,
        text: newMessage.trim(),
        user: {
          id: currentUser.uid,
          email: currentUser.email,
          displayName: currentUserProfile?.displayName || currentUser.email,
        },
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  const selectedProfile = selectedMatch ? matchProfiles[selectedMatch] : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Messages</h2>
        <p style={styles.subtitle}>Chat with your matches</p>
      </div>

      {matches.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No matches yet. Start matching to begin conversations!</p>
        </div>
      ) : (
        <div style={styles.layout}>
          {/* Mobile: Show matches dropdown/button, Desktop: Show sidebar */}
          {!selectedMatch && (
            <div style={styles.mobileMatchesList}>
              <h3 style={styles.sidebarTitle}>Select a match to message:</h3>
              <div style={styles.matchesList}>
                {matches.map((match) => {
                  const otherUserId =
                    match.userId1 === currentUser.uid
                      ? match.userId2
                      : match.userId1;
                  const profile = matchProfiles[otherUserId];

                  return (
                    <button
                      key={match.id}
                      onClick={() => setSelectedMatch(otherUserId)}
                      style={styles.matchButton}
                      className="match-button"
                    >
                      {profile?.profilePictureUrl ? (
                        <img
                          src={profile.profilePictureUrl}
                          alt={profile.displayName}
                          style={styles.matchAvatar}
                        />
                      ) : (
                        <div style={styles.matchAvatarPlaceholder}>
                          {profile?.displayName?.charAt(0) || "?"}
                        </div>
                      )}
                      <div style={styles.matchInfo}>
                        <div style={styles.matchName}>
                          {profile?.displayName || "Unknown"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedMatch && (
            <>
              {/* Back button for mobile */}
              <button
                onClick={() => setSelectedMatch(null)}
                style={styles.backButton}
              >
                ← Back to Matches
              </button>
              
              <div style={styles.chatArea}>
            {selectedProfile ? (
              <>
                <div style={styles.chatHeader}>
                  {selectedProfile.profilePictureUrl ? (
                    <img
                      src={selectedProfile.profilePictureUrl}
                      alt={selectedProfile.displayName}
                      style={styles.chatAvatar}
                    />
                  ) : (
                    <div style={styles.chatAvatarPlaceholder}>
                      {selectedProfile.displayName?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <h3 style={styles.chatName}>
                      {selectedProfile.displayName || "Unknown"}
                    </h3>
                    {selectedProfile.neighborhood && (
                      <p style={styles.chatLocation}>
                        {selectedProfile.neighborhood}
                      </p>
                    )}
                  </div>
                </div>

                <div style={styles.messagesContainer} className="messages-container">
                  {messages.length === 0 ? (
                    <div style={styles.emptyMessages}>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => {
                        const isOwn = msg.userId === currentUser.uid;
                        return (
                          <div
                            key={msg.id}
                            style={{
                              ...styles.messageBubble,
                              ...(isOwn ? styles.messageBubbleOwn : {}),
                            }}
                          >
                            <div style={styles.messageAuthor}>
                              {msg.displayName || msg.userEmail || "Anonymous"}
                            </div>
                            <div style={styles.messageText}>{msg.text}</div>
                            {msg.createdAt?.toDate && (
                              <div style={styles.messageTime}>
                                {msg.createdAt.toDate().toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <form onSubmit={handleSendMessage} style={styles.messageForm}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={styles.messageInput}
                    className="message-input"
                  />
                  <button
                    type="submit"
                    style={styles.sendButton}
                    disabled={!newMessage.trim()}
                    className="send-button"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div style={styles.noSelection}>
                <p>Select a match to start chatting</p>
              </div>
            )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    padding: "16px",
    paddingBottom: "100px",
    paddingTop: "16px",
    width: "100%",
    boxSizing: "border-box",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    color: "#a78bfa",
    fontSize: "28px",
    fontWeight: "600",
    margin: "0 0 8px 0",
  },
  subtitle: {
    color: "#c4b5fd",
    fontSize: "14px",
    margin: 0,
  },
  emptyState: {
    textAlign: "center",
    color: "#a5b4fc",
    padding: "60px 20px",
    backgroundColor: "rgba(45, 53, 97, 0.5)",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
  },
  layout: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    height: "calc(100vh - 200px)",
    minHeight: "calc(100vh - 200px)",
    width: "100%",
  },
  sidebar: {
    display: "none", // Hidden on mobile
  },
  mobileMatchesList: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    width: "100%",
  },
  backButton: {
    padding: "12px 20px",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    color: "#a78bfa",
    border: "1px solid rgba(124, 58, 237, 0.4)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    marginBottom: "10px",
    width: "100%",
    textAlign: "left",
  },
  sidebarTitle: {
    color: "#a78bfa",
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 16px 0",
  },
  matchesList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  matchButton: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
    width: "100%",
  },
  matchButtonActive: {
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    borderColor: "rgba(124, 58, 237, 0.6)",
  },
  matchAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  matchAvatarPlaceholder: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    color: "#a78bfa",
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    color: "#e9d5ff",
    fontSize: "15px",
    fontWeight: "500",
  },
  chatArea: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    borderBottom: "1px solid rgba(167, 139, 250, 0.2)",
    flexShrink: 0,
  },
  chatAvatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  chatAvatarPlaceholder: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    color: "#a78bfa",
  },
  chatName: {
    color: "#a78bfa",
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 4px 0",
  },
  chatLocation: {
    color: "#c4b5fd",
    fontSize: "14px",
    margin: 0,
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "16px",
    backgroundColor: "rgba(26, 31, 58, 0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minHeight: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  emptyMessages: {
    textAlign: "center",
    color: "#a5b4fc",
    padding: "40px",
    fontStyle: "italic",
  },
  messageBubble: {
    maxWidth: "85%",
    minWidth: "120px",
    padding: "12px 16px",
    backgroundColor: "rgba(45, 53, 97, 0.8)",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  },
  messageBubbleOwn: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    borderColor: "rgba(124, 58, 237, 0.4)",
  },
  messageAuthor: {
    color: "#a78bfa",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "4px",
  },
  messageText: {
    color: "#e9d5ff",
    fontSize: "15px",
    lineHeight: "1.5",
    marginBottom: "4px",
  },
  messageTime: {
    color: "#9ca3af",
    fontSize: "11px",
    textAlign: "right",
  },
  messageForm: {
    display: "flex",
    gap: "12px",
    padding: "16px",
    borderTop: "1px solid rgba(167, 139, 250, 0.2)",
    flexShrink: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  messageInput: {
    flex: 1,
    minWidth: 0,
    padding: "12px 16px",
    fontSize: "15px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "rgba(26, 31, 58, 0.7)",
    color: "#fff",
    width: "100%",
    boxSizing: "border-box",
  },
  sendButton: {
    padding: "12px 20px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    transition: "all 0.2s",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  noSelection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#a5b4fc",
    fontSize: "16px",
  },
};

