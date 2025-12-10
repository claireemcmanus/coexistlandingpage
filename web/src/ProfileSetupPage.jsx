import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { upsertUserProfile, getUserProfile } from "./services/firestore";
import { uploadProfilePicture } from "./services/storage";
import { nashvilleNeighborhoods } from "./data/nashvilleNeighborhoods";
import "./ProfileSetupPage.css";

export default function ProfileSetupPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Check if profile is already complete
  useEffect(() => {
    async function checkProfile() {
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        if (profile?.profileComplete) {
          navigate("/");
        }
      }
    }
    checkProfile();
  }, [currentUser, navigate]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Location
  const [neighborhoods, setNeighborhoods] = useState([]); // Array of selected neighborhoods
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  // Step 2: Personal Info
  const [name, setName] = useState("");
  const [hometown, setHometown] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [socialMedia, setSocialMedia] = useState({
    instagram: "",
    twitter: "",
    tiktok: "",
    other: "",
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  // Step 3: Roommate Preferences (using slider values 0-100)
  const [preferences, setPreferences] = useState({
    cleanliness: 50,
    noiseLevel: 50,
    smoking: 0, // 0 = non-smoker, 50 = ok with, 100 = smoker
    pets: 50, // 0 = no pets, 50 = ok with, 100 = have/want pets
    guests: 50, // 0 = no guests, 100 = frequent guests
    sleepSchedule: 50, // 0 = early bird, 50 = normal, 100 = night owl
    budget: 50, // 0 = under $500, 100 = over $1500
    leaseLength: 50, // 0 = month-to-month, 100 = 12 months
  });
  const [genderPreference, setGenderPreference] = useState([]); // Array of selected genders
  const [openToNonMatches, setOpenToNonMatches] = useState(false);

  // Helper functions to get labels from slider values
  const getCleanlinessLabel = (value) => {
    if (value < 25) return "Very Clean";
    if (value < 50) return "Clean";
    if (value < 75) return "Moderate";
    return "Relaxed";
  };

  const getNoiseLabel = (value) => {
    if (value < 25) return "Quiet";
    if (value < 50) return "Moderate";
    if (value < 75) return "Social";
    return "Party";
  };

  const getSmokingLabel = (value) => {
    if (value < 33) return "Non-Smoker";
    if (value < 66) return "OK with Smoking";
    return "Smoker";
  };

  const getPetsLabel = (value) => {
    if (value < 33) return "No Pets";
    if (value < 66) return "OK with Pets";
    return "Have/Want Pets";
  };

  const getGuestsLabel = (value) => {
    if (value < 25) return "No Guests";
    if (value < 50) return "Rare Guests";
    if (value < 75) return "Occasional Guests";
    return "Frequent Guests";
  };

  const getSleepLabel = (value) => {
    if (value < 25) return "Early Bird (before 10 PM)";
    if (value < 50) return "Normal (10 PM - 12 AM)";
    if (value < 75) return "Night Owl (after 12 AM)";
    return "Flexible";
  };

  const getBudgetLabel = (value) => {
    if (value < 20) return "Under $800";
    if (value < 40) return "$800 - $1100";
    if (value < 60) return "$1100 - $1,400";
    if (value < 80) return "$1,400 - $1,700";
    return "Over $1,700";
  };

  const getLeaseLabel = (value) => {
    if (value < 25) return "Month-to-Month";
    if (value < 50) return "3 Months";
    if (value < 75) return "6 Months";
    return "12 Months";
  };

  const filteredNeighborhoods = nashvilleNeighborhoods.filter((n) =>
    n.toLowerCase().includes(neighborhoodSearch.toLowerCase())
  );

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Only submit if we're on the last step (step 3)
    if (currentStep !== 3) {
      // If not on last step, prevent submission completely
      console.log("Form submission prevented on step", currentStep);
      return false; // Explicitly return false to prevent form submission
    }
    
    console.log("Submitting form on step", currentStep);
    
    setError("");
    setLoading(true);

    try {
      let profilePictureUrl = null;

      // Upload profile picture if provided
      if (profilePicture && currentUser) {
        profilePictureUrl = await uploadProfilePicture(
          currentUser.uid,
          profilePicture
        );
      }

      // Save complete profile
      await upsertUserProfile(currentUser.uid, {
        displayName: name,
        email: currentUser.email,
        neighborhoods: neighborhoods, // Store as array
        neighborhood: neighborhoods[0] || "", // Keep single for backward compatibility
        hometown,
        age: parseInt(age) || null,
        gender,
        bio,
        socialMedia,
        profilePictureUrl,
        preferences,
        genderPreference,
        openToNonMatches,
        profileComplete: true,
        createdAt: new Date(),
      });

      // Navigate to celebration page
      navigate("/celebration");
    } catch (err) {
      console.error("Profile setup error:", err);
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function canProceedToNextStep() {
    switch (currentStep) {
      case 1:
        return neighborhoods.length > 0;
      case 2:
        return name.trim() !== "" && hometown.trim() !== "" && age.trim() !== "" && gender.trim() !== "";
      case 3:
        return true; // Preferences are optional
      default:
        return false;
    }
  }

  function handleNext(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (canProceedToNextStep() && currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setError("");
    }
  }

  function handleBack(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Complete Your Profile</h2>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${(currentStep / 3) * 100}%`,
              }}
            />
          </div>
          <p style={styles.stepIndicator}>Step {currentStep} of 3</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form 
          onSubmit={(e) => {
            // Only allow submission on step 3
            if (currentStep !== 3) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
            return handleSubmit(e);
          }}
          onKeyDown={(e) => {
            // Prevent Enter from submitting form unless on step 3
            if (e.key === 'Enter' && currentStep !== 3) {
              e.preventDefault();
              e.stopPropagation();
              if (canProceedToNextStep()) {
                handleNext(e);
              }
            }
          }}
        >
          {/* Step 1: Location */}
          {currentStep === 1 && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Where are you looking to live?</h3>
              <p style={styles.stepDescription}>
                Select one or more neighborhoods in Nashville
              </p>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Search Neighborhoods</label>
                <input
                  type="text"
                  value={neighborhoodSearch}
                  onChange={(e) => setNeighborhoodSearch(e.target.value)}
                  placeholder="Type to search..."
                  style={styles.searchInput}
                  className="profile-input"
                />
              </div>

              <div style={styles.neighborhoodList} className="neighborhood-list">
                {filteredNeighborhoods.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      if (neighborhoods.includes(n)) {
                        // Remove if already selected
                        setNeighborhoods(neighborhoods.filter(neigh => neigh !== n));
                      } else {
                        // Add if not selected
                        setNeighborhoods([...neighborhoods, n]);
                      }
                    }}
                    style={{
                      ...styles.neighborhoodButton,
                      ...(neighborhoods.includes(n) ? styles.neighborhoodButtonActive : {}),
                    }}
                    className="neighborhood-button"
                  >
                    {n} {neighborhoods.includes(n) && "✓"}
                  </button>
                ))}
              </div>

              {neighborhoods.length > 0 && (
                <div style={styles.selected}>
                  <strong>Selected ({neighborhoods.length}):</strong> {neighborhoods.join(", ")}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Personal Info */}
          {currentStep === 2 && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Personal Information</h3>
              <p style={styles.stepDescription}>
                Tell us about yourself
              </p>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Your Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  style={styles.input}
                  className="profile-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentStep !== 3) {
                      e.preventDefault();
                      if (canProceedToNextStep()) {
                        handleNext();
                      }
                    }
                  }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Hometown *</label>
                <input
                  type="text"
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  placeholder="Where are you from?"
                  style={styles.input}
                  className="profile-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentStep !== 3) {
                      e.preventDefault();
                      if (canProceedToNextStep()) {
                        handleNext();
                      }
                    }
                  }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Age *</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter your age"
                  style={styles.input}
                  className="profile-input"
                  min="18"
                  max="100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentStep !== 3) {
                      e.preventDefault();
                      if (canProceedToNextStep()) {
                        handleNext();
                      }
                    }
                  }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
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
                <label style={styles.label}>Profile Picture</label>
                <div style={styles.imageUpload}>
                  {profilePicturePreview ? (
                    <div style={styles.imagePreview}>
                      <img
                        src={profilePicturePreview}
                        alt="Profile preview"
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
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                      />
                      <span style={styles.uploadText}>
                        Click to upload profile picture
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  style={styles.textarea}
                  className="profile-input"
                  rows="4"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Social Media (Optional)</label>
                <div style={styles.socialMediaGrid}>
                  <div style={styles.socialInputWrapper}>
                    <label style={styles.socialLabel}>Instagram</label>
                    <input
                      type="text"
                      value={socialMedia.instagram}
                      onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                      placeholder="@username"
                      style={styles.socialInput}
                      className="profile-input"
                    />
                  </div>
                  <div style={styles.socialInputWrapper}>
                    <label style={styles.socialLabel}>Twitter/X</label>
                    <input
                      type="text"
                      value={socialMedia.twitter}
                      onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
                      placeholder="@username"
                      style={styles.socialInput}
                      className="profile-input"
                    />
                  </div>
                  <div style={styles.socialInputWrapper}>
                    <label style={styles.socialLabel}>TikTok</label>
                    <input
                      type="text"
                      value={socialMedia.tiktok}
                      onChange={(e) => setSocialMedia({ ...socialMedia, tiktok: e.target.value })}
                      placeholder="@username"
                      style={styles.socialInput}
                      className="profile-input"
                    />
                  </div>
                  <div style={styles.socialInputWrapper}>
                    <label style={styles.socialLabel}>Other</label>
                    <input
                      type="text"
                      value={socialMedia.other}
                      onChange={(e) => setSocialMedia({ ...socialMedia, other: e.target.value })}
                      placeholder="Link or handle"
                      style={styles.socialInput}
                      className="profile-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Roommate Preferences */}
          {currentStep === 3 && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Roommate Preferences</h3>
              <p style={styles.stepDescription}>
                Help us match you with compatible roommates
              </p>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Cleanliness Level: <strong style={styles.sliderValue}>{getCleanlinessLabel(preferences.cleanliness)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.cleanliness}
                  onChange={(e) =>
                    setPreferences({ ...preferences, cleanliness: parseInt(e.target.value) })
                  }
                  style={styles.slider}
                  className="preference-slider"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Noise Level: <strong style={styles.sliderValue}>{getNoiseLabel(preferences.noiseLevel)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.noiseLevel}
                  onChange={(e) =>
                    setPreferences({ ...preferences, noiseLevel: parseInt(e.target.value) })
                  }
                  style={styles.slider}
                  className="preference-slider"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Smoking: <strong style={styles.sliderValue}>{getSmokingLabel(preferences.smoking)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.smoking}
                  onChange={(e) =>
                    setPreferences({ ...preferences, smoking: parseInt(e.target.value) })
                  }
                  style={styles.slider}
                  className="preference-slider"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Pets: <strong style={styles.sliderValue}>{getPetsLabel(preferences.pets)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.pets}
                  onChange={(e) =>
                    setPreferences({ ...preferences, pets: parseInt(e.target.value) })
                  }
                  style={styles.slider}
                  className="preference-slider"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Guests: <strong style={styles.sliderValue}>{getGuestsLabel(preferences.guests)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.guests}
                  onChange={(e) =>
                    setPreferences({ ...preferences, guests: parseInt(e.target.value) })
                  }
                  style={styles.slider}
                  className="preference-slider"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Sleep Schedule: <strong style={styles.sliderValue}>{getSleepLabel(preferences.sleepSchedule)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.sleepSchedule}
                  onChange={(e) =>
                    setPreferences({ ...preferences, sleepSchedule: parseInt(e.target.value) })
                  }
                  style={styles.slider}
                  className="preference-slider"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Monthly Budget: <strong style={styles.sliderValue}>{getBudgetLabel(preferences.budget)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.budget}
                  onChange={(e) =>
                    setPreferences({ ...preferences, budget: parseInt(e.target.value) })
                  }
                  style={styles.slider}
                  className="preference-slider"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Lease Length: <strong style={styles.sliderValue}>{getLeaseLabel(preferences.leaseLength)}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.leaseLength}
                  onChange={(e) =>
                    setPreferences({ ...preferences, leaseLength: parseInt(e.target.value) })
                  }
                  style={styles.slider}
                  className="preference-slider"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Gender Preference for Roommates</label>
                <p style={styles.helpText}>Select which genders you're open to living with</p>
                <div style={styles.checkboxGroup}>
                  {["male", "female", "non-binary", "any"].map((g) => (
                    <label key={g} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={genderPreference.includes(g)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGenderPreference([...genderPreference, g]);
                          } else {
                            setGenderPreference(genderPreference.filter((gp) => gp !== g));
                          }
                        }}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>
                        {g === "any" ? "Any gender" : g.charAt(0).toUpperCase() + g.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
                {genderPreference.length === 0 && (
                  <p style={styles.helpText}>💡 Optional: Select which genders you're open to living with</p>
                )}
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={openToNonMatches}
                    onChange={(e) => setOpenToNonMatches(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>Open to messages from non-matches</span>
                </label>
                <p style={styles.checkboxHelp}>
                  Allow users who haven't matched with you to send you messages
                </p>
              </div>
            </div>
          )}

          <div style={styles.buttons}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBack(e);
                }}
                style={styles.backButton}
                disabled={loading}
              >
                Back
              </button>
            )}
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNext(e);
                }}
                style={{
                  ...styles.nextButton,
                  ...(!canProceedToNextStep() ? styles.buttonDisabled : {}),
                }}
                disabled={!canProceedToNextStep() || loading}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                style={styles.submitButton}
                disabled={loading}
                className="profile-submit-button"
              >
                {loading ? "Saving..." : "Complete Profile"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    borderRadius: "12px",
    padding: "40px",
    boxShadow: "0 8px 32px rgba(107, 70, 193, 0.3)",
    width: "100%",
    maxWidth: "600px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  header: {
    marginBottom: "30px",
  },
  title: {
    margin: "0 0 20px 0",
    textAlign: "center",
    color: "#a78bfa",
    fontSize: "28px",
    fontWeight: "600",
  },
  progressBar: {
    width: "100%",
    height: "8px",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    borderRadius: "4px",
    marginBottom: "10px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7c3aed",
    transition: "width 0.3s ease",
  },
  stepIndicator: {
    textAlign: "center",
    color: "#c4b5fd",
    fontSize: "14px",
    margin: 0,
  },
  step: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  stepTitle: {
    margin: 0,
    color: "#a78bfa",
    fontSize: "22px",
    fontWeight: "600",
  },
  stepDescription: {
    margin: 0,
    color: "#c4b5fd",
    fontSize: "14px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#c4b5fd",
  },
  input: {
    padding: "12px",
    fontSize: "16px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "6px",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    color: "#fff",
  },
  searchInput: {
    padding: "12px",
    fontSize: "16px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "6px",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    color: "#fff",
    marginBottom: "12px",
  },
  textarea: {
    padding: "12px",
    fontSize: "16px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "6px",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    color: "#fff",
    fontFamily: "inherit",
    resize: "vertical",
  },
  slider: {
    width: "100%",
    height: "8px",
    borderRadius: "4px",
    background: "rgba(26, 31, 58, 0.5)",
    outline: "none",
    WebkitAppearance: "none",
    appearance: "none",
    cursor: "pointer",
  },
  sliderValue: {
    color: "#a78bfa",
    fontSize: "14px",
    marginLeft: "8px",
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
  selected: {
    padding: "12px",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    borderRadius: "6px",
    color: "#c4b5fd",
    fontSize: "14px",
    marginTop: "10px",
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
  buttons: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "30px",
  },
  backButton: {
    padding: "12px 24px",
    backgroundColor: "rgba(167, 139, 250, 0.2)",
    color: "#e9d5ff",
    border: "1px solid rgba(167, 139, 250, 0.4)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  nextButton: {
    padding: "12px 24px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s",
    marginLeft: "auto",
  },
  submitButton: {
    padding: "12px 24px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s",
    marginLeft: "auto",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  error: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    fontSize: "14px",
    border: "1px solid rgba(220, 38, 38, 0.3)",
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
  socialMediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
  },
  socialInputWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  socialLabel: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#a5b4fc",
  },
  socialInput: {
    padding: "10px",
    fontSize: "14px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "6px",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    color: "#fff",
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
  warningText: {
    color: "#fbbf24",
    fontSize: "12px",
    margin: "8px 0 0 0",
    fontStyle: "italic",
  },
};

