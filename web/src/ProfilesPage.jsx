import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import {
  getAllUserProfiles,
  calculateCompatibility,
  getUserProfile,
  getMatches,
  likeUser,
  passUser,
  getUserLikes,
  getUserPasses,
  upsertUserProfile,
  sendMessage,
  blockUser,
  reportUser,
  getBlockedUsers,
} from "./services/firestore";
import "./ProfilesPage.css";

export default function ProfilesPage() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get("viewUserId");
  const [profiles, setProfiles] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [likes, setLikes] = useState([]);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [directMessagesSent, setDirectMessagesSent] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState("free"); // free, premium, etc.
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [messagePopupUserId, setMessagePopupUserId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;

      try {
        // Load current user's profile
        const userProfile = await getUserProfile(currentUser.uid);
        setCurrentUserProfile(userProfile);
        
        // Get subscription tier and direct message count
        const tier = userProfile?.subscriptionTier || "free";
        const dmCount = userProfile?.directMessagesSent || 0;
        setSubscriptionTier(tier);
        setDirectMessagesSent(dmCount);

        // Load blocked users so we can hide them
        const userBlocked = await getBlockedUsers(currentUser.uid);
        const blockedIds = new Set(userBlocked.map((b) => b.blockedId));

        // Load all other profiles
        const allProfiles = await getAllUserProfiles(currentUser.uid);

        // Filter out blocked profiles
        const visibleProfiles = allProfiles.filter(
          (profile) => !blockedIds.has(profile.id)
        );

        // Calculate compatibility for each
        const profilesWithCompatibility = visibleProfiles.map((profile) => ({
          ...profile,
          compatibility: calculateCompatibility(userProfile, profile),
        }));

        // Sort by compatibility
        profilesWithCompatibility.sort((a, b) => b.compatibility - a.compatibility);

        setProfiles(profilesWithCompatibility);

        // Load matches
        const userMatches = await getMatches(currentUser.uid);
        setMatches(userMatches);

        // Load likes and passes
        const userLikes = await getUserLikes(currentUser.uid);
        const userPasses = await getUserPasses(currentUser.uid);
        setLikes(userLikes);
        setPasses(userPasses);

        // Filter out profiles that have been liked or passed
        const likedIds = userLikes.map(like => like.likedId);
        const passedIds = userPasses.map(pass => pass.passedId);
        let filteredProfiles = profilesWithCompatibility.filter(
          profile => !likedIds.includes(profile.id) && !passedIds.includes(profile.id)
        );
        
        // If viewUserId is specified, ensure that profile is included and shown
        if (viewUserId) {
          const viewProfile = profilesWithCompatibility.find(p => p.id === viewUserId);
          if (viewProfile) {
            // Remove it from filtered list if it exists there
            filteredProfiles = filteredProfiles.filter(p => p.id !== viewUserId);
            // Add it to the beginning of the list
            filteredProfiles.unshift(viewProfile);
            // Set index to 0 to show this profile
            setCurrentIndex(0);
          } else {
            // Profile might have been liked/passed, load it separately
            try {
              const specificProfile = await getUserProfile(viewUserId);
              if (specificProfile) {
                const profileWithCompatibility = {
                  ...specificProfile,
                  compatibility: calculateCompatibility(userProfile, specificProfile),
                };
                filteredProfiles.unshift(profileWithCompatibility);
                setCurrentIndex(0);
              }
            } catch (error) {
              console.error("Error loading specific profile:", error);
            }
          }
        }
        
        // Limit to 10 profiles at a time (unless viewing a specific user)
        const limitedProfiles = viewUserId 
          ? filteredProfiles.slice(0, Math.max(10, filteredProfiles.length))
          : filteredProfiles.slice(0, 10);
        
        setProfiles(limitedProfiles);
      } catch (error) {
        console.error("Error loading profiles:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, viewUserId]);

  async function handleLike(userId) {
    if (!currentUser) return;
    
    try {
      const result = await likeUser(currentUser.uid, userId);
      
      // Update local state
      setLikes([...likes, { likerId: currentUser.uid, likedId: userId }]);
      
      // Remove from profiles list
      const updatedProfiles = profiles.filter(p => p.id !== userId);
      setProfiles(updatedProfiles);
      
      // If mutual like, show match popup
      if (result.isMatch) {
        const matchedUser = profiles.find(p => p.id === userId);
        setMatchedProfile(matchedUser);
        setShowMatchPopup(true);
        
        // Reload matches
        const userMatches = await getMatches(currentUser.uid);
        setMatches(userMatches);
      } else {
        // Move to next profile if available
        if (currentIndex < updatedProfiles.length) {
          setCurrentIndex(Math.min(currentIndex, updatedProfiles.length - 1));
        } else if (updatedProfiles.length > 0) {
          setCurrentIndex(updatedProfiles.length - 1);
        }
      }
    } catch (error) {
      console.error("Error liking user:", error);
    }
  }

  async function handlePass(userId) {
    if (!currentUser) return;
    
    try {
      await passUser(currentUser.uid, userId);
      
      // Update local state
      setPasses([...passes, { passerId: currentUser.uid, passedId: userId }]);
      
      // Remove from profiles list
      const updatedProfiles = profiles.filter(p => p.id !== userId);
      setProfiles(updatedProfiles);
      
      // Move to next profile if available
      if (currentIndex < updatedProfiles.length) {
        setCurrentIndex(Math.min(currentIndex, updatedProfiles.length - 1));
      } else if (updatedProfiles.length > 0) {
        setCurrentIndex(updatedProfiles.length - 1);
      }
    } catch (error) {
      console.error("Error passing user:", error);
    }
  }

  async function handleReportCurrentUserProfile() {
    if (!currentUser || !currentProfile) return;

    const reason = reportReason.trim() || "Policy violation";
    const details = reportDetails.trim();

    try {
      // Create report
      await reportUser({
        reporterId: currentUser.uid,
        reportedUserId: currentProfile.id,
        reason,
        context: "match",
        additionalDetails: details,
      });

      // Block user
      await blockUser(currentUser.uid, currentProfile.id);

      // Remove from local profiles
      const updatedProfiles = profiles.filter(
        (p) => p.id !== currentProfile.id
      );
      setProfiles(updatedProfiles);

      setShowReportModal(false);
      setReportReason("");
      setReportDetails("");

      alert(
        "Thank you for your report. This user has been blocked and our team will review their account."
      );
    } catch (error) {
      console.error("Error reporting user:", error);
      alert("Failed to submit report. Please try again.");
    }
  }

  function isMatched(userId) {
    return matches.some(
      (match) => match.userId1 === userId || match.userId2 === userId
    );
  }


  function handleCloseMatchPopup() {
    setShowMatchPopup(false);
    setMatchedProfile(null);
  }

  function handleDirectMessage(userId) {
    if (!currentUser) return;
    
    // Check if user is on free tier and has used their one direct message
    const isMatch = isMatched(userId);
    if (subscriptionTier === "free" && directMessagesSent >= 1 && !isMatch) {
      alert("You've reached your free tier limit of 1 direct message. Upgrade to premium for unlimited direct messages!");
      return;
    }
    
    // Show message popup
    setMessagePopupUserId(userId);
    setShowMessagePopup(true);
    setMessageText("");
  }

  async function handleSendDirectMessage() {
    if (!currentUser || !messagePopupUserId || !messageText.trim()) return;
    
    try {
      const isMatch = isMatched(messagePopupUserId);
      const roomId = [currentUser.uid, messagePopupUserId].sort().join("_");
      
      // Send the message
      await sendMessage({
        roomId,
        text: messageText.trim(),
        user: {
          id: currentUser.uid,
          email: currentUser.email,
          displayName: currentUserProfile?.displayName || currentUser.email,
        },
      });
      
      // If this is a new direct message (not a match), increment count for free tier
      if (!isMatch && subscriptionTier === "free") {
        await upsertUserProfile(currentUser.uid, {
          directMessagesSent: directMessagesSent + 1,
        });
        setDirectMessagesSent(directMessagesSent + 1);
      }
      
      // Close popup and navigate to messages
      setShowMessagePopup(false);
      setMessagePopupUserId(null);
      setMessageText("");
      window.location.href = `/messages?userId=${messagePopupUserId}`;
    } catch (error) {
      console.error("Error sending direct message:", error);
      alert("Failed to send message. Please try again.");
    }
  }

  function handleCloseMessagePopup() {
    setShowMessagePopup(false);
    setMessagePopupUserId(null);
    setMessageText("");
  }

  function getRemainingMessages() {
    if (subscriptionTier === "free") {
      const isMatch = messagePopupUserId ? isMatched(messagePopupUserId) : false;
      if (isMatch) {
        return "Unlimited (Match)";
      }
      return Math.max(0, 1 - directMessagesSent);
    }
    return "Unlimited";
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="loading-spinner"></div>
        <p>Loading profiles...</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div style={styles.emptyState}>
        <h2>No profiles found yet</h2>
        <p>Check back later for potential matches!</p>
      </div>
    );
  }

  // Ensure currentIndex is valid
  const validIndex = Math.min(currentIndex, profiles.length - 1);
  const currentProfile = profiles[validIndex] || profiles[0];

  const currentProfileForMessage = messagePopupUserId 
    ? profiles.find(p => p.id === messagePopupUserId) 
    : null;

  return (
    <div style={styles.container}>
      {showMatchPopup && matchedProfile && (
        <div style={styles.matchPopupOverlay}>
          <div style={styles.matchPopup}>
            <div style={styles.matchPopupContent}>
              <h2 style={styles.matchPopupTitle}>🎉 It's a Match!</h2>
              <p style={styles.matchPopupText}>
                You and {matchedProfile.displayName || "this user"} liked each other!
              </p>
              {matchedProfile.profilePictureUrl && (
                <img
                  src={matchedProfile.profilePictureUrl}
                  alt={matchedProfile.displayName}
                  style={styles.matchPopupImage}
                />
              )}
              <div style={styles.matchPopupButtons}>
                <button
                  style={styles.matchPopupButton}
                  onClick={() => {
                    handleCloseMatchPopup();
                    window.location.href = `/messages`;
                  }}
                >
                  Start Messaging
                </button>
                <button
                  style={styles.matchPopupButtonSecondary}
                  onClick={handleCloseMatchPopup}
                >
                  Keep Browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMessagePopup && currentProfileForMessage && (
        <div style={styles.matchPopupOverlay}>
          <div style={styles.messagePopup}>
            <div style={styles.messagePopupContent}>
              <h2 style={styles.messagePopupTitle}>Send Message</h2>
              <div style={styles.messagePopupInfo}>
                <p style={styles.messagePopupText}>
                  To: <strong>{currentProfileForMessage.displayName || "User"}</strong>
                </p>
                <p style={styles.messageCountText}>
                  Messages remaining: <strong style={styles.messageCountStrong}>{getRemainingMessages()}</strong>
                </p>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here..."
                style={styles.messageTextarea}
                rows="4"
                maxLength={500}
              />
              <p style={styles.characterCount}>
                {messageText.length}/500 characters
              </p>
              <div style={styles.messagePopupButtons}>
                <button
                  style={{
                    ...styles.messagePopupButton,
                    ...(!messageText.trim() ? styles.messagePopupButtonDisabled : {}),
                  }}
                  onClick={handleSendDirectMessage}
                  disabled={!messageText.trim()}
                >
                  Send Message
                </button>
                <button
                  style={styles.messagePopupButtonSecondary}
                  onClick={handleCloseMessagePopup}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${profiles.length > 0 ? ((currentIndex + 1) / profiles.length) * 100 : 0}%`,
          }}
        />
        <span style={styles.progressText}>
          {profiles.length > 0 ? `${currentIndex + 1} of ${profiles.length}` : "No more profiles"}
        </span>
        {profiles.length === 10 && (
          <span style={styles.limitNotice}>
            Showing 10 profiles. Like or pass to see more!
          </span>
        )}
      </div>

      <div style={styles.cardContainer}>
        <div style={styles.profileCard} className="profile-card-fullscreen">
          {/* Full Screen Photo */}
          <div style={styles.photoSection}>
            {currentProfile.profilePictureUrl ? (
              <img
                src={currentProfile.profilePictureUrl}
                alt={currentProfile.displayName}
                style={styles.fullScreenImage}
              />
            ) : (
              <div style={styles.fullScreenPlaceholder}>
                <div style={styles.placeholderIcon}>
                  {currentProfile.displayName?.charAt(0) || "?"}
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Info Section */}
          <div style={styles.infoSection}>
            <div style={styles.infoContent}>
              <div style={styles.profileHeader}>
                <h2 style={styles.profileName}>
                  {currentProfile.displayName || "Anonymous"}
                  {currentProfile.age && (
                    <span style={styles.age}> • {currentProfile.age}</span>
                  )}
                </h2>
                {currentProfile.gender && (
                  <p style={styles.gender}>
                    {currentProfile.gender.charAt(0).toUpperCase() + currentProfile.gender.slice(1)}
                  </p>
                )}
                {currentProfile.hometown && (
                  <p style={styles.hometown}>{currentProfile.hometown}</p>
                )}
                {((currentProfile.neighborhoods && currentProfile.neighborhoods.length > 0) || currentProfile.neighborhood) && (
                  <p style={styles.neighborhood}>
                    Looking in: <strong>
                      {currentProfile.neighborhoods && currentProfile.neighborhoods.length > 0
                        ? currentProfile.neighborhoods.join(", ")
                        : currentProfile.neighborhood}
                    </strong>
                  </p>
                )}
              </div>

              {currentProfile.bio && (
                <div style={styles.bioSection}>
                  <h3 style={styles.sectionTitle}>About</h3>
                  <p style={styles.bio}>{currentProfile.bio}</p>
                </div>
              )}

              {currentProfile.socialMedia &&
                (currentProfile.socialMedia.instagram ||
                  currentProfile.socialMedia.twitter ||
                  currentProfile.socialMedia.tiktok ||
                  currentProfile.socialMedia.other) && (
                  <div style={styles.socialSection}>
                    <h3 style={styles.sectionTitle}>Social Media</h3>
                    <div style={styles.socialLinks}>
                      {currentProfile.socialMedia.instagram && (
                        <a
                          href={`https://instagram.com/${currentProfile.socialMedia.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.socialLink}
                        >
                          📷 Instagram: {currentProfile.socialMedia.instagram}
                        </a>
                      )}
                      {currentProfile.socialMedia.twitter && (
                        <a
                          href={`https://twitter.com/${currentProfile.socialMedia.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.socialLink}
                        >
                          🐦 Twitter/X: {currentProfile.socialMedia.twitter}
                        </a>
                      )}
                      {currentProfile.socialMedia.tiktok && (
                        <a
                          href={`https://tiktok.com/@${currentProfile.socialMedia.tiktok.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.socialLink}
                        >
                          🎵 TikTok: {currentProfile.socialMedia.tiktok}
                        </a>
                      )}
                      {currentProfile.socialMedia.other && (
                        <a
                          href={currentProfile.socialMedia.other.startsWith('http') 
                            ? currentProfile.socialMedia.other 
                            : `https://${currentProfile.socialMedia.other}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.socialLink}
                        >
                          🔗 {currentProfile.socialMedia.other}
                        </a>
                      )}
                    </div>
                  </div>
                )}

              {currentProfile.preferences && (
                <div style={styles.preferencesSection}>
                  <h3 style={styles.sectionTitle}>Preferences</h3>
                  <div style={styles.preferencesList}>
                    <div style={styles.preferenceItem}>
                      <strong>Cleanliness:</strong>{" "}
                      {currentProfile.preferences.cleanliness >= 75
                        ? "Relaxed"
                        : currentProfile.preferences.cleanliness >= 50
                        ? "Moderate"
                        : currentProfile.preferences.cleanliness >= 25
                        ? "Clean"
                        : "Very Clean"}
                    </div>
                    <div style={styles.preferenceItem}>
                      <strong>Noise Level:</strong>{" "}
                      {currentProfile.preferences.noiseLevel >= 75
                        ? "Party"
                        : currentProfile.preferences.noiseLevel >= 50
                        ? "Social"
                        : currentProfile.preferences.noiseLevel >= 25
                        ? "Moderate"
                        : "Quiet"}
                    </div>
                    <div style={styles.preferenceItem}>
                      <strong>Smoking:</strong>{" "}
                      {currentProfile.preferences.smoking < 33
                        ? "Non-Smoker"
                        : currentProfile.preferences.smoking < 66
                        ? "OK with Smoking"
                        : "Smoker"}
                    </div>
                    <div style={styles.preferenceItem}>
                      <strong>Pets:</strong>{" "}
                      {currentProfile.preferences.pets < 33
                        ? "No Pets"
                        : currentProfile.preferences.pets < 66
                        ? "OK with Pets"
                        : "Have/Want Pets"}
                    </div>
                    <div style={styles.preferenceItem}>
                      <strong>Guests:</strong>{" "}
                      {currentProfile.preferences.guests < 25
                        ? "No Guests"
                        : currentProfile.preferences.guests < 50
                        ? "Rare Guests"
                        : currentProfile.preferences.guests < 75
                        ? "Occasional Guests"
                        : "Frequent Guests"}
                    </div>
                    <div style={styles.preferenceItem}>
                      <strong>Sleep Schedule:</strong>{" "}
                      {currentProfile.preferences.sleepSchedule < 25
                        ? "Early Bird"
                        : currentProfile.preferences.sleepSchedule < 50
                        ? "Normal"
                        : currentProfile.preferences.sleepSchedule < 75
                        ? "Night Owl"
                        : "Flexible"}
                    </div>
                    <div style={styles.preferenceItem}>
                      <strong>Budget:</strong>{" "}
                      {currentProfile.preferences.budget < 20
                        ? "Under $800"
                        : currentProfile.preferences.budget < 40
                        ? "$800 - $1,100"
                        : currentProfile.preferences.budget < 60
                        ? "$1,100 - $1,400"
                        : currentProfile.preferences.budget < 80
                        ? "$1,400 - $1,700"
                        : "Over $1,700"}
                    </div>
                    <div style={styles.preferenceItem}>
                      <strong>Lease Length:</strong>{" "}
                      {currentProfile.preferences.leaseLength < 25
                        ? "Month-to-Month"
                        : currentProfile.preferences.leaseLength < 50
                        ? "3 Months"
                        : currentProfile.preferences.leaseLength < 75
                        ? "6 Months"
                        : "12 Months"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button
              style={styles.passButton}
              onClick={() => handlePass(currentProfile.id)}
              title="Pass"
              className="pass-button"
            >
              ✕
            </button>
            <button
              style={styles.likeButton}
              onClick={() => handleLike(currentProfile.id)}
              title="Like"
              className="like-button"
            >
              ♥
            </button>
            <button
              style={{
                ...styles.messageButton,
                ...(subscriptionTier === "free" && directMessagesSent >= 1 && !isMatched(currentProfile.id)
                  ? styles.messageButtonDisabled
                  : {}),
              }}
              onClick={() => handleDirectMessage(currentProfile.id)}
              title={
                subscriptionTier === "free" && directMessagesSent >= 1 && !isMatched(currentProfile.id)
                  ? "Free tier limit reached (1 direct message). Upgrade for unlimited!"
                  : "Send Message"
              }
              className="message-button"
              disabled={subscriptionTier === "free" && directMessagesSent >= 1 && !isMatched(currentProfile.id)}
            >
              ✈️
            </button>
            <button
              style={styles.reportButton}
              onClick={() => {
                setShowReportModal(true);
                setReportReason("");
                setReportDetails("");
              }}
              title="Report User"
              className="report-button"
            >
              🚩
            </button>
          </div>
        </div>
      </div>
      {showReportModal && (
        <div style={styles.reportModalOverlay}>
          <div style={styles.reportModal}>
            <button
              style={styles.reportModalClose}
              onClick={() => setShowReportModal(false)}
            >
              ✕
            </button>
            <h2 style={styles.reportModalTitle}>Report User</h2>
            <p style={styles.reportModalText}>
              Please tell us why you are reporting{" "}
              <strong>{currentProfile?.displayName || "this user"}</strong>. This
              will be reviewed by our team.
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
                <option value="fake-profile">Fake or suspicious profile</option>
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
              onClick={handleReportCurrentUserProfile}
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
    backgroundColor: "transparent",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    paddingBottom: "80px",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    color: "#a78bfa",
  },
  progressBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    zIndex: 1000,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7c3aed",
    transition: "width 0.3s ease",
  },
  progressText: {
    position: "absolute",
    top: "8px",
    right: "20px",
    color: "#c4b5fd",
    fontSize: "12px",
    fontWeight: "500",
  },
  limitNotice: {
    position: "absolute",
    top: "24px",
    left: "20px",
    color: "#a78bfa",
    fontSize: "11px",
    fontStyle: "italic",
  },
  cardContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    overflow: "hidden",
  },
  profileCard: {
    width: "100%",
    maxWidth: "450px",
    height: "100vh",
    backgroundColor: "rgba(26, 31, 58, 0.98)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 0 60px rgba(107, 70, 193, 0.4)",
  },
  photoSection: {
    width: "100%",
    height: "60vh",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fullScreenPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: "120px",
    color: "#a78bfa",
    fontWeight: "300",
  },
  infoSection: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: "rgba(26, 31, 58, 0.95)",
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
    marginTop: "-24px",
    position: "relative",
    zIndex: 10,
    paddingTop: "24px",
  },
  infoContent: {
    padding: "24px",
    paddingBottom: "100px",
  },
  profileHeader: {
    marginBottom: "24px",
  },
  profileName: {
    color: "#a78bfa",
    fontSize: "32px",
    fontWeight: "600",
    margin: "0 0 8px 0",
    lineHeight: "1.2",
  },
  age: {
    color: "#c4b5fd",
    fontWeight: "400",
  },
  gender: {
    color: "#a78bfa",
    fontSize: "14px",
    margin: "0 0 8px 0",
    fontWeight: "500",
  },
  hometown: {
    color: "#c4b5fd",
    fontSize: "16px",
    margin: "0 0 8px 0",
  },
  neighborhood: {
    color: "#a5b4fc",
    fontSize: "14px",
    margin: "0 0 24px 0",
  },
  bioSection: {
    marginBottom: "24px",
  },
  sectionTitle: {
    color: "#a78bfa",
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 12px 0",
  },
  bio: {
    color: "#e9d5ff",
    fontSize: "16px",
    lineHeight: "1.6",
    margin: 0,
  },
  preferencesList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  preferenceItem: {
    color: "#c4b5fd",
    fontSize: "15px",
    lineHeight: "1.6",
  },
  socialSection: {
    marginBottom: "24px",
  },
  socialLinks: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  socialLink: {
    color: "#a78bfa",
    fontSize: "14px",
    textDecoration: "none",
    padding: "8px 12px",
    backgroundColor: "rgba(167, 139, 250, 0.1)",
    borderRadius: "6px",
    transition: "all 0.2s",
  },
  actionButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "24px",
    padding: "24px",
    backgroundColor: "rgba(26, 31, 58, 0.98)",
    borderTop: "1px solid rgba(167, 139, 250, 0.2)",
    zIndex: 20,
  },
  passButton: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    backgroundColor: "rgba(167, 139, 250, 0.2)",
    color: "#a78bfa",
    border: "3px solid #a78bfa",
    fontSize: "36px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(167, 139, 250, 0.3)",
    transition: "all 0.2s",
  },
  likeButton: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    color: "#7c3aed",
    border: "3px solid #7c3aed",
    fontSize: "36px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
    transition: "all 0.2s",
  },
  messageButton: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    backgroundColor: "rgba(167, 139, 250, 0.2)",
    color: "#a78bfa",
    border: "3px solid #a78bfa",
    fontSize: "32px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(167, 139, 250, 0.3)",
    transition: "all 0.2s",
  },
  messageButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    backgroundColor: "rgba(167, 139, 250, 0.1)",
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  matchPopupOverlay: {
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
  },
  matchPopup: {
    backgroundColor: "rgba(45, 53, 97, 0.98)",
    borderRadius: "20px",
    padding: "40px",
    maxWidth: "400px",
    width: "90%",
    border: "2px solid #7c3aed",
    boxShadow: "0 8px 32px rgba(124, 58, 237, 0.5)",
  },
  matchPopupContent: {
    textAlign: "center",
  },
  matchPopupTitle: {
    color: "#a78bfa",
    fontSize: "32px",
    fontWeight: "600",
    margin: "0 0 16px 0",
  },
  matchPopupText: {
    color: "#e9d5ff",
    fontSize: "18px",
    margin: "0 0 24px 0",
  },
  matchPopupImage: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #7c3aed",
    margin: "0 auto 24px",
  },
  matchPopupButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  matchPopupButton: {
    padding: "14px 24px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  matchPopupButtonSecondary: {
    padding: "14px 24px",
    backgroundColor: "rgba(167, 139, 250, 0.2)",
    color: "#e9d5ff",
    border: "1px solid rgba(167, 139, 250, 0.4)",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  messagePopup: {
    backgroundColor: "rgba(45, 53, 97, 0.98)",
    borderRadius: "20px",
    padding: "40px",
    maxWidth: "500px",
    width: "90%",
    border: "2px solid #7c3aed",
    boxShadow: "0 8px 32px rgba(124, 58, 237, 0.5)",
  },
  messagePopupContent: {
    textAlign: "center",
  },
  messagePopupTitle: {
    color: "#a78bfa",
    fontSize: "28px",
    fontWeight: "600",
    margin: "0 0 20px 0",
  },
  messagePopupInfo: {
    marginBottom: "20px",
    textAlign: "left",
  },
  messagePopupText: {
    color: "#e9d5ff",
    fontSize: "16px",
    margin: "0 0 8px 0",
  },
  messageCountText: {
    color: "#c4b5fd",
    fontSize: "14px",
    margin: "0 0 20px 0",
  },
  messageCountStrong: {
    color: "#a78bfa",
    fontSize: "16px",
  },
  messageTextarea: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    border: "2px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "10px",
    outline: "none",
    backgroundColor: "rgba(26, 31, 58, 0.7)",
    color: "#fff",
    fontFamily: "inherit",
    resize: "vertical",
    marginBottom: "8px",
    minHeight: "100px",
  },
  characterCount: {
    color: "#a5b4fc",
    fontSize: "12px",
    textAlign: "right",
    margin: "0 0 20px 0",
  },
  messagePopupButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  messagePopupButton: {
    padding: "14px 24px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  messagePopupButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  reportButton: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    color: "#fca5a5",
    border: "2px solid rgba(248, 113, 113, 0.7)",
    fontSize: "22px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(248, 113, 113, 0.3)",
    transition: "all 0.2s",
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
    zIndex: 1100,
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
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    textAlign: "center",
    color: "#a5b4fc",
    padding: "40px",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "rgba(45, 53, 97, 0.98)",
    borderRadius: "12px",
    padding: "30px",
    maxWidth: "600px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: "15px",
    right: "15px",
    background: "none",
    border: "none",
    color: "#a78bfa",
    fontSize: "32px",
    cursor: "pointer",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeader: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
  },
  modalImage: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  modalImagePlaceholder: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "36px",
    color: "#a78bfa",
  },
  modalName: {
    color: "#a78bfa",
    fontSize: "24px",
    margin: "0 0 8px 0",
  },
  modalInfo: {
    color: "#c4b5fd",
    fontSize: "16px",
    margin: "0 0 8px 0",
  },
  modalCompatibility: {
    fontSize: "18px",
    fontWeight: "600",
    margin: 0,
  },
  modalBody: {
    marginTop: "20px",
  },
  modalDetail: {
    color: "#e9d5ff",
    fontSize: "14px",
    marginBottom: "12px",
    lineHeight: "1.6",
  },
  preferencesSection: {
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(167, 139, 250, 0.2)",
  },
  preferencesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    marginTop: "12px",
    color: "#c4b5fd",
    fontSize: "14px",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
  },
  modalMatchButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
  },
  modalMessageButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    color: "#e9d5ff",
    border: "1px solid rgba(124, 58, 237, 0.5)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
  },
};

