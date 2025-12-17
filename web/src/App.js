import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AuthPage from "./AuthPage";
import ProfileSetupPage from "./ProfileSetupPage";
import CelebrationPage from "./CelebrationPage";
import ProfilesPage from "./ProfilesPage";
// import ApartmentsPage from "./ApartmentsPage"; // Hidden until API is set up
import MatchesMessagesPage from "./MatchesMessagesPage";
import ProfileDetailsPage from "./ProfileDetailsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ProfileCheck from "./components/ProfileCheck";
import BottomTabs from "./components/BottomTabs";

function App() {
  console.log('App component rendering');
  return (
    <div style={{ 
      minHeight: '-webkit-fill-available',
      width: '100%',
      overflow: 'auto', 
      background: 'transparent',
      position: 'relative'
    }}>
      <AuthProvider>
        <Router>
          <Routes>
          <Route
            path="/profile-setup"
            element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/celebration"
            element={
              <ProtectedRoute>
                <CelebrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <ProfileCheck>
                  <ProfilesPage />
                  <BottomTabs />
                </ProfileCheck>
              </ProtectedRoute>
            }
          />
          {/* Apartments route hidden until API is set up */}
          {/* <Route
            path="/apartments"
            element={
              <ProtectedRoute>
                <ProfileCheck>
                  <ApartmentsPage />
                  <BottomTabs />
                </ProfileCheck>
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <ProfileCheck>
                  <MatchesMessagesPage />
                  <BottomTabs />
                </ProfileCheck>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileCheck>
                  <ProfileDetailsPage />
                  <BottomTabs />
                </ProfileCheck>
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProfileCheck>
                  <Navigate to="/matches" replace />
                </ProfileCheck>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/matches" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
