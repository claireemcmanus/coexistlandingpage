import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import {
  getUserProfile,
  upsertUserProfile,
} from "./services/firestore";
import { uploadProfilePicture } from "./services/storage";
import { newYorkNeighborhoods } from "./data/newYorkNeighborhoods";
import "./ProfileDetailsPage.css";

export default function EditProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const [profile, setProfile] = useState({
    displayName: "",
    hometown: "",
    age: "",
    gender: "",
    bio: "",
    neighborhoods: [],
    neighborhood: "",
    socialMedia: {
      instagram: "",
      twitter: "",
      tiktok: "",
      other: "",
    },
    genderPreference: [],
    openToNonMatches: false,
  });
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!currentUser) return;
      try {
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          // Handle both old (single neighborhood) and new (multiple neighborhoods) format
          const neighborhoods = userProfile.neighborhoods || 
            (userProfile.neighborhood ? [userProfile.neighborhood] : []);
          
          setProfile({
            displayName: userProfile.displayName || "",
            hometown: userProfile.hometown || "",
            age: userProfile.age || "",
            gender: userProfile.gender || "",
            bio: userProfile.bio || "",
            neighborhoods: neighborhoods,
            neighborhood: neighborhoods[0] || userProfile.neighborhood || "",
            socialMedia: userProfile.socialMedia || {
              instagram: "",
              twitter: "",
              tiktok: "",
              other: "",
            },
            genderPreference: userProfile.genderPreference || [],
            openToNonMatches: userProfile.openToNonMatches || false,
          });
          setProfilePictureUrl(userProfile.profilePictureUrl || "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [currentUser]);

  async function handleImageChange(e) {
    // Check if Camera plugin is available and we're on native platform
    const isNative = Capacitor.isNativePlatform();
    const cameraAvailable = isNative && typeof Camera !== 'undefined' && Camera.getPhoto;
    
    if (cameraAvailable) {
      try {
        console.log("Using Capacitor Camera plugin...");
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });

        if (image.dataUrl) {
          // Convert data URL to File object for upload
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          if (file.size > 5 * 1024 * 1024) {
            alert("Image must be less than 5MB");
            return;
          }
          
          setProfilePicture(file);
          setProfilePicturePreview(image.dataUrl);
        }
      } catch (error) {
        console.error("Error picking image with Camera plugin:", error);
        // If UNIMPLEMENTED, fall back to file input
        if (error.code === "UNIMPLEMENTED") {
          console.log("Camera plugin not available, falling back to file input");
          // Trigger file input click
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'image/*';
          fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
              if (file.size > 5 * 1024 * 1024) {
                alert("Image must be less than 5MB");
                return;
              }
              setProfilePicture(file);
              const reader = new FileReader();
              reader.onloadend = () => {
                setProfilePicturePreview(reader.result);
              };
              reader.readAsDataURL(file);
            }
          };
          fileInput.click();
        } else if (error.message && !error.message.includes("cancel")) {
          alert("Failed to pick image. Please try again.");
        }
      }
    } else {
      // Web fallback or Camera not available - use file input
      if (e && e.target && e.target.files) {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            alert("Image must be less than 5MB");
            return;
          }
          setProfilePicture(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setProfilePicturePreview(reader.result);
          };
          reader.readAsDataURL(file);
        }
      } else {
        // Trigger file input programmatically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            if (file.size > 5 * 1024 * 1024) {
              alert("Image must be less than 5MB");
              return;
            }
            setProfilePicture(file);
            const reader = new FileReader();
            reader.onloadend = () => {
              setProfilePicturePreview(reader.result);
            };
            reader.readAsDataURL(file);
          }
        };
        fileInput.click();
      }
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    setStatus("Saving...");

    try {
      let newProfilePictureUrl = profilePictureUrl;

      // Upload new profile picture if provided
      if (profilePicture) {
        try {
          console.log("Starting profile picture upload...");
          setStatus("Uploading image...");
          newProfilePictureUrl = await uploadProfilePicture(
            currentUser.uid,
            profilePicture
          );
          console.log("Profile picture uploaded successfully:", newProfilePictureUrl);
          setStatus("Saving profile...");
        } catch (uploadError) {
          console.error("Error uploading profile picture:", uploadError);
          setStatus(`Failed to upload image: ${uploadError.message || "Unknown error"}`);
          setSaving(false);
          return;
        }
      }

      console.log("Saving profile to Firestore...");
      await upsertUserProfile(currentUser.uid, {
        ...profile,
        age: profile.age ? parseInt(profile.age) : null,
        neighborhoods: profile.neighborhoods.length > 0 ? profile.neighborhoods : [],
        neighborhood: profile.neighborhoods[0] || profile.neighborhood || "",
        profilePictureUrl: newProfilePictureUrl,
        email: currentUser.email,
      });

      console.log("Profile saved successfully!");
      setStatus("Profile updated successfully!");
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (error) {
      console.error("Error saving profile:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setStatus(`Failed to save profile: ${error.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

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
        <button
          onClick={() => navigate("/profile")}
          style={styles.backButton}
        >
          ← Back
        </button>
        <h2 style={styles.title}>Edit Profile</h2>
      </div>

      <form onSubmit={handleSave} style={styles.form}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Profile Picture</h3>
          <div style={styles.imageUpload}>
            {profilePicturePreview || profilePictureUrl ? (
              <div style={styles.imagePreview}>
                <img
                  src={profilePicturePreview || profilePictureUrl}
                  alt="Profile"
                  style={styles.previewImage}
                />
                <button
                  type="button"
                  onClick={() => {
                    setProfilePicture(null);
                    setProfilePicturePreview(null);
                  }}
                  style={styles.removeImageButton}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label style={styles.uploadLabel}>
                <button
                  type="button"
                  onClick={handleImageChange}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <span style={styles.uploadText}>
                    Click to upload profile picture
                  </span>
                </button>
              </label>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Personal Information</h3>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) =>
                setProfile({ ...profile, displayName: e.target.value })
              }
              placeholder="Your name"
              style={styles.input}
              className="profile-input"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Hometown</label>
            <input
              type="text"
              value={profile.hometown}
              onChange={(e) =>
                setProfile({ ...profile, hometown: e.target.value })
              }
              placeholder="Where are you from?"
              style={styles.input}
              className="profile-input"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Age</label>
            <input
              type="number"
              value={profile.age}
              onChange={(e) =>
                setProfile({ ...profile, age: e.target.value })
              }
              placeholder="Your age"
              style={styles.input}
              className="profile-input"
              min="18"
              max="100"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Gender</label>
            <select
              value={profile.gender}
              onChange={(e) =>
                setProfile({ ...profile, gender: e.target.value })
              }
              style={styles.input}
              className="profile-input"
            >
              <option value="">Select your gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Neighborhoods</label>
            <p style={styles.helpText}>Select one or more neighborhoods you're interested in</p>
            <input
              type="text"
              value={neighborhoodSearch}
              onChange={(e) => setNeighborhoodSearch(e.target.value)}
              placeholder="Type to search neighborhoods..."
              style={styles.input}
              className="profile-input"
            />
            <div style={styles.neighborhoodList}>
              {newYorkNeighborhoods
                .filter((n) =>
                  n.toLowerCase().includes(neighborhoodSearch.toLowerCase())
                )
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      if (profile.neighborhoods.includes(n)) {
                        setProfile({
                          ...profile,
                          neighborhoods: profile.neighborhoods.filter(neigh => neigh !== n),
                        });
                      } else {
                        setProfile({
                          ...profile,
                          neighborhoods: [...profile.neighborhoods, n],
                        });
                      }
                    }}
                    style={{
                      ...styles.neighborhoodButton,
                      ...(profile.neighborhoods.includes(n) ? styles.neighborhoodButtonActive : {}),
                    }}
                  >
                    {n} {profile.neighborhoods.includes(n) && "✓"}
                  </button>
                ))}
            </div>
            {profile.neighborhoods.length > 0 && (
              <div style={styles.selectedNeighborhoods}>
                <strong>Selected ({profile.neighborhoods.length}):</strong> {profile.neighborhoods.join(", ")}
              </div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              style={styles.textarea}
              className="profile-input"
              rows="4"
            />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Social Media</h3>
          <div style={styles.socialMediaGrid}>
            <div style={styles.socialInputWrapper}>
              <label style={styles.socialLabel}>Instagram</label>
              <input
                type="text"
                value={profile.socialMedia.instagram}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    socialMedia: {
                      ...profile.socialMedia,
                      instagram: e.target.value,
                    },
                  })
                }
                placeholder="@username"
                style={styles.socialInput}
                className="profile-input"
              />
            </div>
            <div style={styles.socialInputWrapper}>
              <label style={styles.socialLabel}>Twitter/X</label>
              <input
                type="text"
                value={profile.socialMedia.twitter}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    socialMedia: {
                      ...profile.socialMedia,
                      twitter: e.target.value,
                    },
                  })
                }
                placeholder="@username"
                style={styles.socialInput}
                className="profile-input"
              />
            </div>
            <div style={styles.socialInputWrapper}>
              <label style={styles.socialLabel}>TikTok</label>
              <input
                type="text"
                value={profile.socialMedia.tiktok}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    socialMedia: {
                      ...profile.socialMedia,
                      tiktok: e.target.value,
                    },
                  })
                }
                placeholder="@username"
                style={styles.socialInput}
                className="profile-input"
              />
            </div>
            <div style={styles.socialInputWrapper}>
              <label style={styles.socialLabel}>Other</label>
              <input
                type="text"
                value={profile.socialMedia.other}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    socialMedia: {
                      ...profile.socialMedia,
                      other: e.target.value,
                    },
                  })
                }
                placeholder="URL or username"
                style={styles.socialInput}
                className="profile-input"
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Preferences</h3>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Gender Preference</label>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profile.genderPreference.includes("male")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProfile({
                        ...profile,
                        genderPreference: [...profile.genderPreference, "male"],
                      });
                    } else {
                      setProfile({
                        ...profile,
                        genderPreference: profile.genderPreference.filter(g => g !== "male"),
                      });
                    }
                  }}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>Male</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profile.genderPreference.includes("female")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProfile({
                        ...profile,
                        genderPreference: [...profile.genderPreference, "female"],
                      });
                    } else {
                      setProfile({
                        ...profile,
                        genderPreference: profile.genderPreference.filter(g => g !== "female"),
                      });
                    }
                  }}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>Female</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profile.genderPreference.includes("non-binary")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProfile({
                        ...profile,
                        genderPreference: [...profile.genderPreference, "non-binary"],
                      });
                    } else {
                      setProfile({
                        ...profile,
                        genderPreference: profile.genderPreference.filter(g => g !== "non-binary"),
                      });
                    }
                  }}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>Non-binary</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={profile.genderPreference.includes("any")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProfile({
                        ...profile,
                        genderPreference: ["any"],
                      });
                    } else {
                      setProfile({
                        ...profile,
                        genderPreference: [],
                      });
                    }
                  }}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>Any</span>
              </label>
            </div>
          </div>
        </div>

        {status && (
          <div
            style={{
              ...styles.statusMessage,
              ...(status.includes("success")
                ? styles.statusSuccess
                : styles.statusError),
            }}
          >
            {status}
          </div>
        )}

        <div style={styles.actions}>
          <button type="submit" style={styles.saveButton} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  section: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
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
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#c4b5fd",
  },
  input: {
    padding: "12px 16px",
    fontSize: "16px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "rgba(26, 31, 58, 0.7)",
    color: "#fff",
  },
  textarea: {
    padding: "12px 16px",
    fontSize: "16px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "rgba(26, 31, 58, 0.7)",
    color: "#fff",
    fontFamily: "inherit",
    resize: "vertical",
  },
  imageUpload: {
    marginTop: "8px",
  },
  uploadLabel: {
    display: "block",
    padding: "40px",
    border: "2px dashed rgba(167, 139, 250, 0.3)",
    borderRadius: "8px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "rgba(26, 31, 58, 0.3)",
  },
  uploadText: {
    color: "#a78bfa",
    fontSize: "16px",
  },
  imagePreview: {
    position: "relative",
    display: "inline-block",
  },
  previewImage: {
    width: "150px",
    height: "150px",
    objectFit: "cover",
    borderRadius: "8px",
    border: "2px solid rgba(167, 139, 250, 0.3)",
  },
  removeImageButton: {
    marginTop: "10px",
    padding: "6px 12px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
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
  statusMessage: {
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
    textAlign: "center",
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
  actions: {
    display: "flex",
    gap: "12px",
  },
  saveButton: {
    flex: 1,
    padding: "14px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  socialMediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    width: "100%",
    boxSizing: "border-box",
  },
  socialInputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  socialLabel: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#a5b4fc",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  socialInput: {
    padding: "10px",
    fontSize: "14px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "6px",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "rgba(26, 31, 58, 0.7)",
    color: "#fff",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
  },
  checkboxText: {
    fontSize: "14px",
  },
  helpText: {
    color: "#a5b4fc",
    fontSize: "12px",
    margin: "0 0 8px 0",
  },
  neighborhoodList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "10px",
    maxHeight: "300px",
    overflowY: "auto",
    padding: "10px",
    backgroundColor: "rgba(26, 31, 58, 0.3)",
    borderRadius: "8px",
    marginTop: "8px",
  },
  neighborhoodButton: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    color: "#e9d5ff",
    cursor: "pointer",
    transition: "all 0.2s",
    fontSize: "14px",
    textAlign: "center",
  },
  neighborhoodButtonActive: {
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    borderColor: "rgba(124, 58, 237, 0.6)",
    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.2)",
  },
  selectedNeighborhoods: {
    padding: "12px",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    borderRadius: "6px",
    color: "#c4b5fd",
    fontSize: "14px",
    marginTop: "10px",
  },
};

