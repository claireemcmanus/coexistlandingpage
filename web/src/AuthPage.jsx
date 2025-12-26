import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { validateEmail, validatePassword } from "./utils/validation";
import { getUserProfile } from "./services/firestore";
// import ShaderBackground from "./components/ui/shader-background"; // Commented out - component not found
import "./AuthPage.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const { login, signup, currentUser, sendVerificationCode, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in and verified
  useEffect(() => {
    if (currentUser && currentUser.emailVerified) {
      console.log("AuthPage: User already logged in and verified, redirecting...");
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);
  
  // Poll for email verification (if user clicked link)
  useEffect(() => {
    if (!showVerificationScreen || !currentUser) return;
    
    const interval = setInterval(async () => {
      try {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          console.log("✅ Email verified via link!");
          setError("✓ Email verified! Redirecting...");
          clearInterval(interval);
          setTimeout(() => navigate("/", { replace: true }), 1000);
        }
      } catch (error) {
        console.error("Error checking verification:", error);
        // If user was deleted or token is invalid, clear the verification screen
        if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-not-found' || error.code === 'auth/user-disabled') {
          console.log("User token expired or user deleted, clearing verification screen");
          clearInterval(interval);
          setShowVerificationScreen(false);
          setError("Your session has expired. Please sign in again.");
          // Logout to clear the invalid user state
          try {
            await logout();
          } catch (logoutError) {
            console.error("Error logging out:", logoutError);
          }
        }
      }
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(interval);
  }, [showVerificationScreen, currentUser, navigate, logout]);

  // Prevent scrolling on auth page
  useEffect(() => {
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // Re-enable scrolling when component unmounts
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear previous errors
    setError("");

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error);
      return;
    }

    // Validate password
    if (!isLogin) {
      // Only validate password strength on signup
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.error);
        return;
      }
    } else {
      // On login, just check if password is provided
      if (!password || password.trim() === "") {
        setError("Password is required");
        return;
      }
    }

    try {
      setLoading(true);
      
      console.log("Attempting to", isLogin ? "login" : "signup", "with email:", email);
      
      if (isLogin) {
        const userCredential = await login(email, password);
        console.log("✅ Login successful, user:", userCredential.user?.uid);
        console.log("✅ User email:", userCredential.user?.email);
        console.log("✅ Email verified (Auth):", userCredential.user?.emailVerified);
        
        // Check if email is verified (check both Firestore and Auth)
        let isEmailVerified = userCredential.user?.emailVerified;
        if (!isEmailVerified) {
          // Reload user to get latest emailVerified status
          await userCredential.user.reload();
          isEmailVerified = userCredential.user.emailVerified;
          
          // Also check Firestore profile for email verification
          if (!isEmailVerified) {
            try {
              const profile = await getUserProfile(userCredential.user.uid);
              isEmailVerified = profile?.emailVerified || false;
              console.log("✅ Email verified (Firestore):", profile?.emailVerified);
            } catch (error) {
              console.error("Error checking profile:", error);
            }
          }
        }
        
        if (!isEmailVerified) {
          setLoading(false);
          setError("Please verify your email before continuing. Check your inbox for the verification link or code.");
          return;
        }
        
        setLoading(false);
        
        // Wait a bit longer to ensure auth state is set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log("🚀 Navigating to / after login...");
        navigate("/", { replace: true });
      } else {
        const userCredential = await signup(email, password);
        console.log("✅ Signup successful, user:", userCredential.user?.uid);
        console.log("✅ User email:", userCredential.user?.email);
        
        setLoading(false);
        setError(""); // Clear any errors
        
        // Show verification screen
        setShowVerificationScreen(true);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      // Provide specific error messages
      let errorMessage = "";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please sign in instead, or use a different email address.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address (example@example.com)";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password authentication is not enabled. Please contact support.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password does not meet requirements. Password must be at least 8 characters, contain an uppercase letter, a number, and only use allowed characters.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please wait a few minutes before trying again.";
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = "An error occurred. Please try again.";
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    try {
      setResendingEmail(true);
      setError("");
      await sendVerificationCode();
      setError("✓ Verification email resent! Check your inbox.");
      setTimeout(() => setError(""), 5000);
    } catch (err) {
      console.error("Resend error:", err);
      setError(err.message || "Failed to resend email. Please try again.");
    } finally {
      setResendingEmail(false);
    }
  }

  // Show verification screen
  if (showVerificationScreen) {
    return (
      <div style={{...styles.container, overflow: 'hidden', height: '100vh'}}>
        <div style={styles.card}>
          <h2 style={styles.title}>Verify Your Email</h2>
          
          <div style={styles.verificationIcon}>📧</div>
          
          <p style={styles.verificationText}>
            We've sent a verification email to:
          </p>
          <p style={styles.verificationEmail}>{email}</p>
          
          <p style={styles.verificationSubtext}>
            Please check your inbox and click the verification link in the email to verify your account.
          </p>
          
          <p style={styles.verificationSubtext}>
            Once you click the link, you'll be automatically redirected.
          </p>

          {error && (
            <div style={error.startsWith("✓") ? styles.success : styles.error}>
              {error}
            </div>
          )}

          <div style={styles.resendContainer}>
            <p style={styles.resendText}>
              Didn't receive the email?
            </p>
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={resendingEmail}
              style={styles.resendButton}
            >
              {resendingEmail ? "Sending..." : "Resend Email"}
            </button>
          </div>

          <div style={styles.switch}>
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout();
                  setShowVerificationScreen(false);
                  setError("");
                  setIsLogin(false); // Go back to sign up
                } catch (err) {
                  console.error("Error logging out:", err);
                  // Even if logout fails, clear the screen
                  setShowVerificationScreen(false);
                  setError("");
                  setIsLogin(false);
                }
              }}
              style={styles.switchButton}
            >
              ← Back to Sign Up
            </button>
            <p style={styles.switchText}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await logout();
                    setShowVerificationScreen(false);
                    setError("");
                    setIsLogin(true); // Go to sign in
                  } catch (err) {
                    console.error("Error logging out:", err);
                    // Even if logout fails, clear the screen
                    setShowVerificationScreen(false);
                    setError("");
                    setIsLogin(true);
                  }
                }}
                style={styles.switchButton}
                className="auth-switch-button"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{...styles.container, overflow: 'hidden', height: '100vh'}}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {isLogin ? "Sign In" : "Sign Up"}
        </h2>
        
        {error && (
          <div style={error.startsWith("✓") ? styles.success : styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(""); // Clear error when user types
              }}
              style={styles.input}
              className="auth-input"
              placeholder="Enter email"
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(""); // Clear error when user types
              }}
              style={styles.input}
              className="auth-input"
              placeholder={isLogin ? "Enter password" : "Create a password"}
              disabled={loading}
            />
            {!isLogin && (
              <div style={styles.passwordHint}>
                Password must be at least 8 characters, contain an uppercase letter, a number, and only use letters, numbers, and: !@#$%^&*
              </div>
            )}
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
    height: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "rgba(45, 53, 97, 0.95)",
    borderRadius: "12px",
    padding: "40px",
    boxShadow: "0 8px 32px rgba(107, 70, 193, 0.3)",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid rgba(167, 139, 250, 0.2)",
    position: "relative",
    zIndex: 1,
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
  success: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    color: "#86efac",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    fontSize: "14px",
    border: "1px solid rgba(34, 197, 94, 0.3)",
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
  passwordHint: {
    fontSize: "12px",
    color: "#a5b4fc",
    marginTop: "4px",
    opacity: 0.8,
    lineHeight: "1.4",
  },
  verificationText: {
    color: "#c4b5fd",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "8px",
  },
  verificationEmail: {
    color: "#a78bfa",
    fontSize: "16px",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: "16px",
    wordBreak: "break-all",
  },
  verificationSubtext: {
    color: "#a5b4fc",
    fontSize: "13px",
    textAlign: "center",
    marginBottom: "24px",
    lineHeight: "1.5",
  },
  resendContainer: {
    marginTop: "24px",
    textAlign: "center",
  },
  resendText: {
    color: "#a5b4fc",
    fontSize: "13px",
    marginBottom: "12px",
  },
  resendButton: {
    padding: "10px 20px",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    color: "#a78bfa",
    border: "1px solid rgba(124, 58, 237, 0.4)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
};

