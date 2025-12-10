import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CelebrationPage.css";

export default function CelebrationPage() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [showMatches, setShowMatches] = useState(false);

  useEffect(() => {
    // Start animation
    setTimeout(() => setShowContent(true), 300);
    // Show "finding matches" message
    setTimeout(() => setShowMatches(true), 1500);
    // Navigate to matches page after celebration
    setTimeout(() => {
      navigate("/matches");
    }, 4000);
  }, [navigate]);

  return (
    <div className="celebration-container">
      <div className={`celebration-content ${showContent ? "show" : ""}`}>
        <div className="celebration-icon"></div>
        <h1 className="celebration-title">Profile Complete!</h1>
        <p className="celebration-subtitle">Your profile has been created successfully</p>
      </div>

      {showMatches && (
        <div className={`matches-message ${showMatches ? "show" : ""}`}>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className="matches-text">Finding your perfect matches...</p>
        </div>
      )}
    </div>
  );
}

