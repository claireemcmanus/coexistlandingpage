import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  
  // Fallback: check auth.currentUser directly if context hasn't updated yet
  // This helps with race conditions after login
  const user = currentUser || (auth && auth.currentUser);

  return user ? children : <Navigate to="/auth" />;
}

