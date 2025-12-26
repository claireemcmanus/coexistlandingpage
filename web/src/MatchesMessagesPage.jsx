import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { getUserProfile, getAllConversations, getMatches, checkMatch, blockUser, reportUser, getBlockedUsers } from "./services/firestore";
import { subscribeToMessages, sendMessage } from "./services/firestore";
import "./MatchesMessagesPage.css";

export default function MatchesMessagesPage() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [matchConversations, setMatchConversations] = useState([]);
  const [directMessageConversations, setDirectMessageConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isSelectedMatch, setIsSelectedMatch] = useState(true); // Track if selected is a match or direct message
  const [viewingProfile, setViewingProfile] = useState(false); // Track if viewing a profile
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [allProfiles, setAllProfiles] = useState({});
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const messagesEndRef = React.useRef(null);
  
  // Check for userId query parameter for direct messaging
  const directMessageUserId = searchParams.get("userId");

  useEffect(() => {
    async function loadConversations() {
      if (!currentUser) return;
      try {
        // Load current user profile
        const userProfile = await getUserProfile(currentUser.uid);
        setCurrentUserProfile(userProfile);

        // Load blocked users
        const userBlocked = await getBlockedUsers(currentUser.uid);
        const blockedIds = new Set(userBlocked.map((b) => b.blockedId));

        // Get all conversations that have messages (matches and direct messages)
        const conversations = await getAllConversations(currentUser.uid);

        // Also load all matches so we include matches even if no messages yet
        const matches = await getMatches(currentUser.uid);

        // Build a set of userIds that already have message conversations
        const messageMatchUserIds = new Set(
          conversations.matches.map((c) => c.userId)
        );

        // Start with conversations that already have messages
        let combinedMatchConversations = [...conversations.matches];

        // Add matches that don't yet have any messages so they still show up
        matches.forEach((match) => {
          const otherUserId =
            match.userId1 === currentUser.uid ? match.userId2 : match.userId1;

          if (!messageMatchUserIds.has(otherUserId)) {
            combinedMatchConversations.push({
              userId: otherUserId,
              lastMessage: "",
              lastMessageTime:
                match.createdAt?.toDate?.() ||
                (match.createdAt?.seconds
                  ? new Date(match.createdAt.seconds * 1000)
                  : new Date(0)),
            });
          }
        });

        // Filter out blocked users from conversations
        combinedMatchConversations = combinedMatchConversations.filter(
          (c) => !blockedIds.has(c.userId)
        );
        const filteredDirectMessages = conversations.directMessages.filter(
          (c) => !blockedIds.has(c.userId)
        );

        // Sort matches by most recent activity (message time or match time)
        combinedMatchConversations.sort(
          (a, b) => b.lastMessageTime - a.lastMessageTime
        );

        setMatchConversations(combinedMatchConversations);
        setDirectMessageConversations(filteredDirectMessages);

        // Load profiles for all conversation partners (matches + direct messages)
        const profiles = {};
        const allUserIds = [
          ...combinedMatchConversations.map((c) => c.userId),
          ...filteredDirectMessages.map((c) => c.userId),
        ];

        const uniqueUserIds = Array.from(new Set(allUserIds));

        for (const userId of uniqueUserIds) {
          const profile = await getUserProfile(userId);
          if (profile) {
            profiles[userId] = profile;
          }
        }

        setAllProfiles(profiles);

        // Handle direct message userId from URL
        if (directMessageUserId && !blockedIds.has(directMessageUserId)) {
          const isMatch = await checkMatch(currentUser.uid, directMessageUserId);
          setSelectedUserId(directMessageUserId);
          setIsSelectedMatch(isMatch);
        } else if (combinedMatchConversations.length > 0 && !selectedUserId) {
          // Select first match by default
          setSelectedUserId(combinedMatchConversations[0].userId);
          setIsSelectedMatch(true);
        } else if (conversations.directMessages.length > 0 && !selectedUserId) {
          // If no matches, select first direct message
          setSelectedUserId(conversations.directMessages[0].userId);
          setIsSelectedMatch(false);
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
      }
    }
    loadConversations();
    // selectedUserId is intentionally omitted - it's set inside this effect, not read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, directMessageUserId]);

  // Subscribe to messages for selected conversation
  useEffect(() => {
    if (!selectedUserId || !currentUser) {
      console.log("No selectedUserId or currentUser, clearing messages");
      setMessages([]);
      return;
    }

    const roomId = [currentUser.uid, selectedUserId].sort().join("_");
    console.log("🔔 Subscribing to messages for roomId:", roomId);
    console.log("Current user ID:", currentUser.uid);
    console.log("Selected user ID:", selectedUserId);
    
    const unsubscribe = subscribeToMessages(roomId, (data) => {
      console.log("✅ Messages callback fired! Received", data.length, "messages");
      if (data.length > 0) {
        console.log("First message:", data[0]);
        console.log("Last message:", data[data.length - 1]);
      }
      console.log("All messages:", data);
      
      // Filter out any optimistic messages (they'll be replaced by real ones)
      const realMessages = data.filter(msg => !msg.isOptimistic);
      setMessages(realMessages);
      
      // Scroll to bottom after messages update
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    });

    return () => {
      console.log("🔕 Unsubscribing from messages");
      unsubscribe();
    };
  }, [selectedUserId, currentUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [messages]);

  // Also scroll when keyboard appears/disappears
  useEffect(() => {
    const handleResize = () => {
      if (messages.length > 0 && messagesEndRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 300);
      }
    };
    
    window.addEventListener('resize', handleResize);
    // Also listen for visual viewport changes (keyboard)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [messages]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId || !currentUser || sendingMessage) return;

    // Only allow sending to matches (not direct messages)
    if (!isSelectedMatch) {
      setMessageError("You can only send messages to your matches. Direct messages are read-only.");
      return;
    }

    setMessageError("");
    setSendingMessage(true);

    const roomId = [currentUser.uid, selectedUserId].sort().join("_");
    const messageText = newMessage.trim();
    
    // Optimistic update: Add message immediately to UI
    const tempMessage = {
      id: `temp-${Date.now()}`,
      text: messageText,
      roomId: roomId,
      userId: currentUser.uid,
      displayName: currentUserProfile?.displayName || currentUser.email,
      userEmail: currentUser.email,
      createdAt: { toDate: () => new Date() },
      isOptimistic: true,
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage("");
    
    // Scroll to bottom immediately
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);

    try {
      console.log("📤 Sending message:", messageText);
      console.log("📤 To roomId:", roomId);
      console.log("📤 Current user ID:", currentUser.uid);
      console.log("📤 Selected user ID:", selectedUserId);
      
      const result = await sendMessage({
        roomId,
        text: messageText,
        user: {
          id: currentUser.uid,
          email: currentUser.email,
          displayName: currentUserProfile?.displayName || currentUser.email,
        },
      });
      
      console.log("✅ Message sent successfully! Result:", result);
      console.log("✅ Message ID:", result?.id);
      
      // The subscription will update with the real message, removing the optimistic one
      // Scroll again after a moment to ensure we're at the bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 500);
      
      setMessageError("");
    } catch (error) {
      console.error("Failed to send message:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageText); // Restore message text
      
      // Provide user-friendly error messages
      if (error.code === 'permission-denied') {
        setMessageError("Permission denied. Please check your Firestore security rules.");
      } else if (error.code === 'unavailable') {
        setMessageError("Network error. Please check your connection and try again.");
      } else if (error.message) {
        setMessageError(error.message);
      } else {
        setMessageError("Failed to send message. Please try again.");
      }
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleBlockAndReport() {
    if (!currentUser || !selectedUserId) return;

    const currentProfile = allProfiles[selectedUserId];
    const reason = reportReason.trim() || "Policy violation";
    const details = reportDetails.trim();

    try {
      // Create report
      await reportUser({
        reporterId: currentUser.uid,
        reportedUserId: selectedUserId,
        reason,
        context: "message",
        additionalDetails: details,
      });

      // Block user
      await blockUser(currentUser.uid, selectedUserId);

      // Remove conversation locally
      setMatchConversations((prev) =>
        prev.filter((c) => c.userId !== selectedUserId)
      );
      setDirectMessageConversations((prev) =>
        prev.filter((c) => c.userId !== selectedUserId)
      );
      setSelectedUserId(null);
      setMessages([]);
      setShowReportDialog(false);
      setReportReason("");
      setReportDetails("");

      alert(
        `You have blocked and reported ${
          currentProfile?.displayName || "this user"
        }. Our team will review their account.`
      );
    } catch (error) {
      console.error("Error blocking/reporting user:", error);
      alert("Failed to submit report. Please try again.");
    }
  }

  const selectedProfile = selectedUserId ? allProfiles[selectedUserId] : null;
  const totalConversations = matchConversations.length + directMessageConversations.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Messages</h2>
        <p style={styles.subtitle}>Chat with your matches</p>
      </div>

      {totalConversations === 0 ? (
        <div style={styles.emptyState}>
          <p>No conversations yet. Start matching to begin conversations!</p>
        </div>
      ) : (
        <div style={styles.layout}>
          {/* Mobile: Show conversations list */}
          {!selectedUserId && (
            <div style={styles.mobileMatchesList}>
              {/* Matches Section */}
              {matchConversations.length > 0 && (
                <>
                  <h3 style={styles.sectionHeader}>Matches</h3>
                  <div style={styles.matchesList}>
                    {matchConversations.map((conversation) => {
                      const profile = allProfiles[conversation.userId];
                      return (
                        <button
                          key={conversation.userId}
                          onClick={() => {
                            setSelectedUserId(conversation.userId);
                            setIsSelectedMatch(true);
                          }}
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
                            {conversation.lastMessage && (
                              <div style={styles.lastMessagePreview}>
                                {conversation.lastMessage}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Direct Messages Section */}
              {directMessageConversations.length > 0 && (
                <>
                  <h3 style={{...styles.sectionHeader, marginTop: "24px", color: "#fbbf24"}}>
                    Direct Messages
                  </h3>
                  <p style={styles.directMessageNote}>
                    These are messages from users you haven't matched with yet
                  </p>
                  <div style={styles.matchesList}>
                    {directMessageConversations.map((conversation) => {
                      const profile = allProfiles[conversation.userId];
                      return (
                        <button
                          key={conversation.userId}
                          onClick={() => {
                            setSelectedUserId(conversation.userId);
                            setIsSelectedMatch(false);
                          }}
                          style={{
                            ...styles.matchButton,
                            borderColor: "rgba(251, 191, 36, 0.4)",
                            backgroundColor: "rgba(251, 191, 36, 0.1)",
                          }}
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
                            {conversation.lastMessage && (
                              <div style={styles.lastMessagePreview}>
                                {conversation.lastMessage}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

      {selectedUserId && !viewingProfile && (
            <>
              {/* Back button for mobile */}
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  setIsSelectedMatch(true);
                }}
                style={styles.backButton}
              >
                ← Back to Conversations
              </button>
              
              <div style={styles.chatArea}>
            {selectedProfile ? (
              <>
                <div style={styles.chatHeader}>
                  <div
                    onClick={() => setViewingProfile(true)}
                    style={styles.chatHeaderClickable}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
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
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3 style={styles.chatName}>
                            {selectedProfile.displayName || "Unknown"}
                          </h3>
                          {!isSelectedMatch && (
                            <span style={styles.directMessageBadge}>Direct Message</span>
                          )}
                        </div>
                        {selectedProfile.neighborhood && (
                          <p style={styles.chatLocation}>
                            {selectedProfile.neighborhood}
                          </p>
                        )}
                      </div>
                      <button
                        style={styles.blockReportButton}
                        onClick={() => {
                          setShowReportDialog(true);
                          setReportReason("");
                          setReportDetails("");
                        }}
                        title="Block & Report"
                      >
                        🚫
                      </button>
                    </div>
                  </div>
                </div>

                <div style={styles.messagesContainer} className="messages-container">
                  {messages.length === 0 ? (
                    <div style={styles.emptyMessages}>
                      <p>No messages yet. Start the conversation!</p>
                      <p style={{ fontSize: "12px", marginTop: "8px", opacity: 0.7 }}>
                        (Check browser console for debugging info)
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => {
                        const isOwn = msg.userId === currentUser.uid;
                        const messageText = msg.text || msg.message || "";
                        console.log("Rendering message:", {
                          id: msg.id,
                          text: messageText,
                          userId: msg.userId,
                          roomId: msg.roomId,
                          isOwn: isOwn,
                        });
                        return (
                          <div
                            key={msg.id || Math.random()}
                            style={{
                              ...styles.messageBubble,
                              ...(isOwn ? styles.messageBubbleOwn : {}),
                            }}
                          >
                            <div style={styles.messageAuthor}>
                              {msg.displayName || msg.userEmail || "Anonymous"}
                            </div>
                            <div style={styles.messageText}>
                              {messageText}
                            </div>
                            {msg.createdAt?.toDate && (
                              <div style={styles.messageTime}>
                                {msg.createdAt.toDate().toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                            {!msg.createdAt?.toDate && msg.createdAt?.seconds && (
                              <div style={styles.messageTime}>
                                {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
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

                {messageError && (
                  <div style={styles.messageError}>
                    {messageError}
                  </div>
                )}
                {!isSelectedMatch && (
                  <div style={styles.readOnlyNotice}>
                    <p style={styles.readOnlyNoticeText}>💬 This is a direct message. You can read messages but cannot reply unless you match with this user.</p>
                  </div>
                )}
                {isSelectedMatch && (
                  <form onSubmit={handleSendMessage} style={styles.messageForm}>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        setMessageError("");
                      }}
                      style={styles.messageInput}
                      className="message-input"
                      placeholder="Type a message..."
                      disabled={sendingMessage}
                    />
                    <button
                      type="submit"
                      style={{
                        ...styles.sendButton,
                        opacity: (!newMessage.trim() || sendingMessage) ? 0.5 : 1,
                        cursor: (!newMessage.trim() || sendingMessage) ? 'not-allowed' : 'pointer',
                      }}
                      className="send-button"
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      {sendingMessage ? "Sending..." : "Send"}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div style={styles.noSelection}>
                <p>Select a match to start chatting</p>
              </div>
            )}
              </div>
            </>
          )}

          {/* Profile View */}
          {selectedUserId && viewingProfile && selectedProfile && (
            <>
              <button
                onClick={() => setViewingProfile(false)}
                style={styles.backButton}
              >
                ← Back to Messages
              </button>
              
              <div style={styles.profileViewContainer}>
                <div style={styles.profileViewCard}>
                  {/* Profile Photo */}
                  <div style={styles.profilePhotoSection}>
                    {selectedProfile.profilePictureUrl ? (
                      <img
                        src={selectedProfile.profilePictureUrl}
                        alt={selectedProfile.displayName}
                        style={styles.profileFullImage}
                      />
                    ) : (
                      <div style={styles.profilePlaceholder}>
                        <div style={styles.profilePlaceholderIcon}>
                          {selectedProfile.displayName?.charAt(0) || "?"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div style={styles.profileInfoSection}>
                    <div style={styles.profileInfoContent}>
                      <div style={styles.profileViewHeader}>
                        <h2 style={styles.profileViewName}>
                          {selectedProfile.displayName || "Anonymous"}
                          {selectedProfile.age && (
                            <span style={styles.profileViewAge}> • {selectedProfile.age}</span>
                          )}
                        </h2>
                        {selectedProfile.gender && (
                          <p style={styles.profileViewGender}>
                            {selectedProfile.gender.charAt(0).toUpperCase() + selectedProfile.gender.slice(1)}
                          </p>
                        )}
                        {selectedProfile.hometown && (
                          <p style={styles.profileViewHometown}>{selectedProfile.hometown}</p>
                        )}
                        {((selectedProfile.neighborhoods && selectedProfile.neighborhoods.length > 0) || selectedProfile.neighborhood) && (
                          <p style={styles.profileViewNeighborhood}>
                            Looking in: <strong>
                              {selectedProfile.neighborhoods && selectedProfile.neighborhoods.length > 0
                                ? selectedProfile.neighborhoods.join(", ")
                                : selectedProfile.neighborhood}
                            </strong>
                          </p>
                        )}
                      </div>

                      {selectedProfile.bio && (
                        <div style={styles.profileViewBioSection}>
                          <h3 style={styles.profileViewSectionTitle}>About</h3>
                          <p style={styles.profileViewBio}>{selectedProfile.bio}</p>
                        </div>
                      )}

                      {selectedProfile.socialMedia &&
                        (selectedProfile.socialMedia.instagram ||
                          selectedProfile.socialMedia.twitter ||
                          selectedProfile.socialMedia.tiktok ||
                          selectedProfile.socialMedia.other) && (
                          <div style={styles.profileViewSocialSection}>
                            <h3 style={styles.profileViewSectionTitle}>Social Media</h3>
                            <div style={styles.profileViewSocialLinks}>
                              {selectedProfile.socialMedia.instagram && (
                                <a
                                  href={`https://instagram.com/${selectedProfile.socialMedia.instagram.replace('@', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={styles.profileViewSocialLink}
                                >
                                  📷 Instagram: {selectedProfile.socialMedia.instagram}
                                </a>
                              )}
                              {selectedProfile.socialMedia.twitter && (
                                <a
                                  href={`https://twitter.com/${selectedProfile.socialMedia.twitter.replace('@', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={styles.profileViewSocialLink}
                                >
                                  🐦 Twitter/X: {selectedProfile.socialMedia.twitter}
                                </a>
                              )}
                              {selectedProfile.socialMedia.tiktok && (
                                <a
                                  href={`https://tiktok.com/@${selectedProfile.socialMedia.tiktok.replace('@', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={styles.profileViewSocialLink}
                                >
                                  🎵 TikTok: {selectedProfile.socialMedia.tiktok}
                                </a>
                              )}
                              {selectedProfile.socialMedia.other && (
                                <a
                                  href={selectedProfile.socialMedia.other.startsWith('http') 
                                    ? selectedProfile.socialMedia.other 
                                    : `https://${selectedProfile.socialMedia.other}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={styles.profileViewSocialLink}
                                >
                                  🔗 {selectedProfile.socialMedia.other}
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                      {selectedProfile.preferences && (
                        <div style={styles.profileViewPreferencesSection}>
                          <h3 style={styles.profileViewSectionTitle}>Preferences</h3>
                          <div style={styles.profileViewPreferencesList}>
                            <div style={styles.profileViewPreferenceItem}>
                              <strong>Cleanliness:</strong>{" "}
                              {selectedProfile.preferences.cleanliness >= 75
                                ? "Relaxed"
                                : selectedProfile.preferences.cleanliness >= 50
                                ? "Moderate"
                                : selectedProfile.preferences.cleanliness >= 25
                                ? "Clean"
                                : "Very Clean"}
                            </div>
                            <div style={styles.profileViewPreferenceItem}>
                              <strong>Noise Level:</strong>{" "}
                              {selectedProfile.preferences.noiseLevel >= 75
                                ? "Party"
                                : selectedProfile.preferences.noiseLevel >= 50
                                ? "Social"
                                : selectedProfile.preferences.noiseLevel >= 25
                                ? "Moderate"
                                : "Quiet"}
                            </div>
                            <div style={styles.profileViewPreferenceItem}>
                              <strong>Smoking:</strong>{" "}
                              {selectedProfile.preferences.smoking < 33
                                ? "Non-Smoker"
                                : selectedProfile.preferences.smoking < 66
                                ? "OK with Smoking"
                                : "Smoker"}
                            </div>
                            <div style={styles.profileViewPreferenceItem}>
                              <strong>Pets:</strong>{" "}
                              {selectedProfile.preferences.pets < 33
                                ? "No Pets"
                                : selectedProfile.preferences.pets < 66
                                ? "OK with Pets"
                                : "Have/Want Pets"}
                            </div>
                            <div style={styles.profileViewPreferenceItem}>
                              <strong>Guests:</strong>{" "}
                              {selectedProfile.preferences.guests < 25
                                ? "No Guests"
                                : selectedProfile.preferences.guests < 50
                                ? "Rare Guests"
                                : selectedProfile.preferences.guests < 75
                                ? "Occasional Guests"
                                : "Frequent Guests"}
                            </div>
                            <div style={styles.profileViewPreferenceItem}>
                              <strong>Sleep Schedule:</strong>{" "}
                              {selectedProfile.preferences.sleepSchedule < 25
                                ? "Early Bird"
                                : selectedProfile.preferences.sleepSchedule < 50
                                ? "Normal"
                                : selectedProfile.preferences.sleepSchedule < 75
                                ? "Night Owl"
                                : "Flexible"}
                            </div>
                            <div style={styles.profileViewPreferenceItem}>
                              <strong>Budget:</strong>{" "}
                              {selectedProfile.preferences.budget < 20
                                ? "Under $800"
                                : selectedProfile.preferences.budget < 40
                                ? "$800 - $1,100"
                                : selectedProfile.preferences.budget < 60
                                ? "$1,100 - $1,400"
                                : selectedProfile.preferences.budget < 80
                                ? "$1,400 - $1,700"
                                : "Over $1,700"}
                            </div>
                            <div style={styles.profileViewPreferenceItem}>
                              <strong>Lease Length:</strong>{" "}
                              {selectedProfile.preferences.leaseLength < 25
                                ? "Month-to-Month"
                                : selectedProfile.preferences.leaseLength < 50
                                ? "3 Months"
                                : selectedProfile.preferences.leaseLength < 75
                                ? "6 Months"
                                : "12 Months"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {showReportDialog && selectedUserId && (
        <div style={styles.reportModalOverlay}>
          <div style={styles.reportModal}>
            <button
              style={styles.reportModalClose}
              onClick={() => setShowReportDialog(false)}
            >
              ✕
            </button>
            <h2 style={styles.reportModalTitle}>Block & Report User</h2>
            <p style={styles.reportModalText}>
              You are blocking and reporting{" "}
              <strong>
                {allProfiles[selectedUserId]?.displayName || "this user"}
              </strong>
              . They will no longer be able to contact you.
            </p>
            <label style={styles.reportLabel}>
              Reason
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={styles.reportSelect}
              >
                <option value="">Select a reason</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="inappropriate-content">
                  Inappropriate content
                </option>
                <option value="spam">Spam or scam</option>
                <option value="fake-profile">
                  Fake or suspicious profile
                </option>
                <option value="other">Other</option>
              </select>
            </label>
            <label style={styles.reportLabel}>
              Additional details (optional)
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                style={styles.reportTextarea}
                placeholder="Share any details that will help us understand what happened."
              />
            </label>
            <button
              style={{
                ...styles.reportSubmitButton,
                opacity: reportReason ? 1 : 0.6,
                cursor: reportReason ? "pointer" : "not-allowed",
              }}
              onClick={handleBlockAndReport}
              disabled={!reportReason}
            >
              Submit Report & Block User
            </button>
          </div>
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
  sectionHeader: {
    color: "#a78bfa",
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 12px 0",
  },
  directMessageNote: {
    color: "#fbbf24",
    fontSize: "12px",
    margin: "0 0 12px 0",
    fontStyle: "italic",
  },
  lastMessagePreview: {
    color: "#a5b4fc",
    fontSize: "12px",
    marginTop: "4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "200px",
  },
  directMessageBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    color: "#fbbf24",
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "600",
  },
  readOnlyNotice: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    borderRadius: "8px",
    padding: "12px",
    margin: "12px 16px",
    textAlign: "center",
  },
  readOnlyNoticeText: {
    color: "#fbbf24",
    fontSize: "13px",
    margin: 0,
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
    maxHeight: "calc(100vh - 200px)", // Ensure it doesn't go off screen
    position: "relative",
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    borderBottom: "1px solid rgba(167, 139, 250, 0.2)",
    flexShrink: 0,
  },
  chatHeaderClickable: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    width: "100%",
    transition: "opacity 0.2s",
  },
  chatAvatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    objectFit: "cover",
    cursor: "pointer",
    transition: "opacity 0.2s",
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
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  chatName: {
    color: "#a78bfa",
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 4px 0",
    cursor: "pointer",
    transition: "opacity 0.2s",
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
    WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
    scrollBehavior: "smooth",
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
    overflow: "visible",
    whiteSpace: "pre-wrap",
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
    wordWrap: "break-word",
    overflowWrap: "break-word",
    whiteSpace: "pre-wrap",
    overflow: "visible",
    width: "100%",
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
  messageError: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "12px",
    fontSize: "14px",
    border: "1px solid rgba(220, 38, 38, 0.3)",
    textAlign: "center",
  },
  blockReportButton: {
    padding: "8px 10px",
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    color: "#fca5a5",
    border: "1px solid rgba(248, 113, 113, 0.7)",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  reportModalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: "20px",
  },
  reportModal: {
    backgroundColor: "rgba(45, 53, 97, 0.98)",
    borderRadius: "16px",
    padding: "24px",
    maxWidth: "480px",
    width: "100%",
    border: "1px solid rgba(248, 113, 113, 0.5)",
    position: "relative",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  },
  reportModalClose: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "none",
    border: "none",
    color: "#fca5a5",
    fontSize: "24px",
    cursor: "pointer",
  },
  reportModalTitle: {
    color: "#fca5a5",
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 12px 0",
  },
  reportModalText: {
    color: "#e9d5ff",
    fontSize: "14px",
    lineHeight: "1.5",
    margin: "0 0 16px 0",
  },
  reportLabel: {
    display: "block",
    color: "#c4b5fd",
    fontSize: "14px",
    marginBottom: "12px",
  },
  reportSelect: {
    width: "100%",
    marginTop: "6px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(167, 139, 250, 0.4)",
    backgroundColor: "rgba(26, 31, 58, 0.9)",
    color: "#e9d5ff",
    fontSize: "14px",
    outline: "none",
  },
  reportTextarea: {
    width: "100%",
    marginTop: "6px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(167, 139, 250, 0.4)",
    backgroundColor: "rgba(26, 31, 58, 0.9)",
    color: "#e9d5ff",
    fontSize: "14px",
    outline: "none",
    minHeight: "80px",
    resize: "vertical",
  },
  reportSubmitButton: {
    width: "100%",
    marginTop: "8px",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#ef4444",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  // Profile View Styles
  profileViewContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  profileViewCard: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    maxHeight: "calc(100vh - 200px)",
  },
  profilePhotoSection: {
    width: "100%",
    height: "50vh",
    minHeight: "300px",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  },
  profileFullImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  profilePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePlaceholderIcon: {
    fontSize: "100px",
    color: "#a78bfa",
    fontWeight: "300",
  },
  profileInfoSection: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: "rgba(26, 31, 58, 0.95)",
    paddingTop: "24px",
  },
  profileInfoContent: {
    padding: "24px",
    paddingBottom: "40px",
  },
  profileViewHeader: {
    marginBottom: "24px",
  },
  profileViewName: {
    color: "#a78bfa",
    fontSize: "28px",
    fontWeight: "600",
    margin: "0 0 8px 0",
    lineHeight: "1.2",
  },
  profileViewAge: {
    color: "#c4b5fd",
    fontWeight: "400",
  },
  profileViewGender: {
    color: "#a78bfa",
    fontSize: "14px",
    margin: "0 0 8px 0",
    fontWeight: "500",
  },
  profileViewHometown: {
    color: "#c4b5fd",
    fontSize: "16px",
    margin: "0 0 8px 0",
  },
  profileViewNeighborhood: {
    color: "#a5b4fc",
    fontSize: "14px",
    margin: "0 0 24px 0",
  },
  profileViewBioSection: {
    marginBottom: "24px",
  },
  profileViewSectionTitle: {
    color: "#a78bfa",
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 12px 0",
  },
  profileViewBio: {
    color: "#e9d5ff",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: 0,
  },
  profileViewSocialSection: {
    marginBottom: "24px",
  },
  profileViewSocialLinks: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  profileViewSocialLink: {
    color: "#a78bfa",
    fontSize: "14px",
    textDecoration: "none",
    padding: "8px 12px",
    backgroundColor: "rgba(167, 139, 250, 0.1)",
    borderRadius: "6px",
    transition: "all 0.2s",
  },
  profileViewPreferencesSection: {
    marginBottom: "24px",
  },
  profileViewPreferencesList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  profileViewPreferenceItem: {
    color: "#c4b5fd",
    fontSize: "14px",
    lineHeight: "1.6",
  },
};

