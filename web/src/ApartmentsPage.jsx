import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import {
  getSavedApartments,
  saveApartment,
  removeSavedApartment,
  getUserProfile,
} from "./services/firestore";
import { searchApartments } from "./services/apartmentApi";
import "./ApartmentsPage.css";

export default function ApartmentsPage() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [savedApartments, setSavedApartments] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSaved, setShowSaved] = useState(true);
  const [userNeighborhoods, setUserNeighborhoods] = useState([]);

  useEffect(() => {
    async function loadSaved() {
      if (!currentUser) return;
      try {
        const saved = await getSavedApartments(currentUser.uid);
        setSavedApartments(saved);
      } catch (error) {
        console.error("Error loading saved apartments:", error);
      }
    }
    loadSaved();
  }, [currentUser]);

  useEffect(() => {
    async function loadUserProfile() {
      if (!currentUser) return;
      try {
        const profile = await getUserProfile(currentUser.uid);
        // Handle both old (single) and new (multiple) format
        const neighborhoods = profile?.neighborhoods || 
          (profile?.neighborhood ? [profile.neighborhood] : []);
        if (neighborhoods.length > 0) {
          setUserNeighborhoods(neighborhoods);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    }
    loadUserProfile();
  }, [currentUser]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError("");
    setSearchResults([]);

    try {
      // Build location string from user's neighborhoods or default to Nashville
      // Use first neighborhood if multiple selected, or default
      const location = userNeighborhoods.length > 0
        ? `${userNeighborhoods[0]}, Nashville, TN`
        : "Nashville, TN";

      // Search for apartments
      const results = await searchApartments(searchQuery, {
        location,
        radius: 5000, // 5km radius
        maxResults: 20,
      });

      setSearchResults(results);
      
      if (results.length === 0) {
        setError("No apartments found. Try a different search term or location.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search apartments. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveApartment(apartmentData) {
    if (!currentUser) return;
    try {
      await saveApartment(currentUser.uid, apartmentData);
      const saved = await getSavedApartments(currentUser.uid);
      setSavedApartments(saved);
      
      // Update search results to show this apartment is saved
      setSearchResults(prev => 
        prev.map(apt => 
          apt.id === apartmentData.id 
            ? { ...apt, isSaved: true }
            : apt
        )
      );
    } catch (error) {
      console.error("Error saving apartment:", error);
      setError("Failed to save apartment. Please try again.");
    }
  }

  function isApartmentSaved(apartmentId) {
    return savedApartments.some(apt => apt.id === apartmentId);
  }

  async function handleRemoveApartment(apartmentId) {
    if (!currentUser) return;
    try {
      await removeSavedApartment(currentUser.uid, apartmentId);
      const saved = await getSavedApartments(currentUser.uid);
      setSavedApartments(saved);
    } catch (error) {
      console.error("Error removing apartment:", error);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Find Apartments</h2>
        <div style={styles.toggleButtons}>
          <button
            style={{
              ...styles.toggleButton,
              ...(showSaved ? styles.toggleButtonActive : {}),
            }}
            onClick={() => setShowSaved(true)}
          >
            Saved
          </button>
          <button
            style={{
              ...styles.toggleButton,
              ...(!showSaved ? styles.toggleButtonActive : {}),
            }}
            onClick={() => setShowSaved(false)}
          >
            Search
          </button>
        </div>
      </div>

      {showSaved ? (
        <div style={styles.content}>
          <h3 style={styles.sectionTitle}>Saved Apartments</h3>
          {savedApartments.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No saved apartments yet. Search and save apartments to see them here!</p>
            </div>
          ) : (
            <div style={styles.apartmentsList}>
              {savedApartments.map((apt) => (
                <div key={apt.id} style={styles.apartmentCard}>
                  <div style={styles.apartmentHeader}>
                    <h4 style={styles.apartmentTitle}>{apt.name || apt.address}</h4>
                    <button
                      style={styles.removeButton}
                      onClick={() => handleRemoveApartment(apt.id)}
                    >
                      ×
                    </button>
                  </div>
                  {apt.address && (
                    <p style={styles.apartmentAddress}>{apt.address}</p>
                  )}
                  {apt.price && (
                    <p style={styles.apartmentPrice}>${apt.price}/month</p>
                  )}
                  {apt.description && (
                    <p style={styles.apartmentDescription}>{apt.description}</p>
                  )}
                  {apt.link && (
                    <a
                      href={apt.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.apartmentLink}
                    >
                      View Listing →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={styles.content}>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={userNeighborhoods.length > 0
                ? `Search for apartments in ${userNeighborhoods[0]}${userNeighborhoods.length > 1 ? ` (+${userNeighborhoods.length - 1} more)` : ''}, Nashville...`
                : "Search for apartments in Nashville..."}
              style={styles.searchInput}
              className="apartment-search-input"
            />
            <button
              type="submit"
              style={styles.searchButton}
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}

          {loading && (
            <div style={styles.loadingState}>
              <p>Searching for apartments...</p>
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div style={styles.searchResults}>
              <h3 style={styles.sectionTitle}>
                Search Results ({searchResults.length})
              </h3>
              <div style={styles.apartmentsList}>
                {searchResults.map((apt) => {
                  const isSaved = isApartmentSaved(apt.id);
                  return (
                    <div key={apt.id} style={styles.apartmentCard}>
                      {apt.photos && apt.photos.length > 0 && (
                        <img
                          src={apt.photos[0]}
                          alt={apt.name}
                          style={styles.apartmentPhoto}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                      <div style={styles.apartmentHeader}>
                        <h4 style={styles.apartmentTitle}>{apt.name || apt.address}</h4>
                        <button
                          style={{
                            ...styles.saveButton,
                            ...(isSaved ? styles.saveButtonSaved : {}),
                          }}
                          onClick={() => {
                            if (!isSaved) {
                              handleSaveApartment(apt);
                            }
                          }}
                          disabled={isSaved}
                        >
                          {isSaved ? "✓ Saved" : "+ Save"}
                        </button>
                      </div>
                      {apt.address && (
                        <p style={styles.apartmentAddress}>{apt.address}</p>
                      )}
                      <div style={styles.apartmentDetails}>
                        {apt.price && (
                          <p style={styles.apartmentPrice}>${apt.price.toLocaleString()}/month</p>
                        )}
                        {apt.rating && (
                          <p style={styles.apartmentRating}>
                            ⭐ {apt.rating.toFixed(1)}
                          </p>
                        )}
                        {apt.bedrooms !== undefined && (
                          <p style={styles.apartmentBedrooms}>
                            🛏️ {apt.bedrooms === 0 ? "Studio" : `${apt.bedrooms} bed`}
                            {apt.bathrooms && ` • ${apt.bathrooms} bath`}
                          </p>
                        )}
                      </div>
                      {apt.description && (
                        <p style={styles.apartmentDescription}>{apt.description}</p>
                      )}
                      {apt.link && (
                        <a
                          href={apt.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.apartmentLink}
                        >
                          View Listing →
                        </a>
                      )}
                      {apt.source === "mock" && (
                        <p style={styles.mockBadge}>
                          💡 Demo data - Add API key for real results
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && searchResults.length === 0 && !error && (
            <div style={styles.searchInfo}>
              <p style={styles.infoText}>
                💡 Search for apartments by name, neighborhood, or type (e.g., "studio apartments", "2 bedroom apartments").
                {userNeighborhoods.length > 0 && ` We'll prioritize results near ${userNeighborhoods.join(", ")}.`}
              </p>
              <p style={styles.infoText}>
                <strong>Note:</strong> To get real apartment listings, add a Google Places API key to your .env file.
                Without it, you'll see demo data.
              </p>
              <button
                style={styles.addButton}
                onClick={() => {
                  const name = prompt("Apartment name/address:");
                  const price = prompt("Monthly rent:");
                  const address = prompt("Full address:");
                  const description = prompt("Description (optional):");
                  const link = prompt("Listing URL (optional):");

                  if (name && price) {
                    handleSaveApartment({
                      id: `manual_${Date.now()}`,
                      name,
                      address: address || "",
                      price: parseInt(price) || 0,
                      description: description || "",
                      link: link || "",
                    });
                  }
                }}
              >
                + Add Apartment Manually
              </button>
            </div>
          )}
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
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    color: "#a78bfa",
    fontSize: "28px",
    fontWeight: "600",
    margin: "0 0 20px 0",
  },
  toggleButtons: {
    display: "flex",
    gap: "12px",
  },
  toggleButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "rgba(26, 31, 58, 0.5)",
    color: "#c4b5fd",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  toggleButtonActive: {
    backgroundColor: "#7c3aed",
    color: "white",
    borderColor: "#7c3aed",
  },
  content: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  sectionTitle: {
    color: "#a78bfa",
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 20px 0",
  },
  searchForm: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
  },
  searchInput: {
    flex: 1,
    padding: "14px 18px",
    fontSize: "16px",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "10px",
    outline: "none",
    backgroundColor: "rgba(26, 31, 58, 0.7)",
    color: "#fff",
  },
  searchButton: {
    padding: "14px 24px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  searchInfo: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
  },
  infoText: {
    color: "#c4b5fd",
    fontSize: "14px",
    margin: "0 0 16px 0",
    lineHeight: "1.6",
  },
  addButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    color: "#e9d5ff",
    border: "1px solid rgba(124, 58, 237, 0.5)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
  },
  apartmentsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  apartmentCard: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    boxShadow: "0 4px 16px rgba(107, 70, 193, 0.2)",
  },
  apartmentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  apartmentTitle: {
    color: "#a78bfa",
    fontSize: "20px",
    fontWeight: "600",
    margin: 0,
    flex: 1,
  },
  removeButton: {
    background: "none",
    border: "none",
    color: "#ef4444",
    fontSize: "24px",
    cursor: "pointer",
    padding: "0",
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  apartmentAddress: {
    color: "#c4b5fd",
    fontSize: "14px",
    margin: "0 0 8px 0",
  },
  apartmentPrice: {
    color: "#10b981",
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 12px 0",
  },
  apartmentDescription: {
    color: "#e9d5ff",
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 12px 0",
  },
  apartmentLink: {
    color: "#a78bfa",
    fontSize: "14px",
    textDecoration: "none",
    fontWeight: "500",
  },
  emptyState: {
    textAlign: "center",
    color: "#a5b4fc",
    padding: "60px 20px",
    backgroundColor: "rgba(45, 53, 97, 0.5)",
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
  },
  searchResults: {
    marginTop: "24px",
  },
  apartmentPhoto: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  apartmentDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "12px",
    alignItems: "center",
  },
  apartmentRating: {
    color: "#fbbf24",
    fontSize: "14px",
    margin: 0,
  },
  apartmentBedrooms: {
    color: "#c4b5fd",
    fontSize: "14px",
    margin: 0,
  },
  saveButton: {
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
  saveButtonSaved: {
    backgroundColor: "#10b981",
    cursor: "not-allowed",
  },
  errorMessage: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  loadingState: {
    textAlign: "center",
    color: "#c4b5fd",
    padding: "40px 20px",
    fontSize: "16px",
  },
  mockBadge: {
    color: "#fbbf24",
    fontSize: "12px",
    margin: "8px 0 0 0",
    fontStyle: "italic",
  },
};

