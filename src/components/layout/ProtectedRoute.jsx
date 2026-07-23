import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../ui/Spinner";

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isCheckingSession) {
    return <Spinner label="Oturum doğrulanıyor" />;
  }
  
  if (!isAuthenticated) return <Navigate to="/giris" replace />;
  return children;
}
