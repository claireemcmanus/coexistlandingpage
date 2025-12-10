import React, { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./AuthPage.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setError("");
      setLoading(true);
      
      if (isLogin) {
        await login(email, password);
        // ProfileCheck will redirect to profile setup if needed
        navigate("/");
      } else {
        await signup(email, password);
        // User is automatically signed in after signup, redirect to profile setup
        navigate("/profile-setup");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      // Provide more user-friendly error messages
      let errorMessage = "Failed to authenticate";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password authentication is not enabled. Please contact support.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {isLogin ? "Sign In" : "Sign Up"}
        </h2>
        
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              className="auth-input"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              className="auth-input"
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
            className="auth-button"
          >
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div style={styles.switch}>
          <p style={styles.switchText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              style={styles.switchButton}
              className="auth-switch-button"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
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
    maxWidth: "400px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
  },
  title: {
    marginBottom: "30px",
    textAlign: "center",
    color: "#a78bfa",
    fontSize: "28px",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
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
  button: {
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "#7c3aed",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: "10px",
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
  switch: {
    marginTop: "20px",
    textAlign: "center",
  },
  switchText: {
    color: "#a5b4fc",
    fontSize: "14px",
  },
  switchButton: {
    background: "none",
    border: "none",
    color: "#a78bfa",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "14px",
    padding: 0,
    transition: "color 0.2s",
  },
};

