import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function AdminRoute() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-textSecondary text-sm">
        Checking access…
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <Navigate
        to="/signin"
        state={{ from: location.pathname, reason: "admin-required" }}
        replace
      />
    );
  }
  return <Outlet />;
}

export function AuthenticatedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-textSecondary text-sm">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <Navigate to="/signin" state={{ from: location.pathname }} replace />
    );
  }
  return <Outlet />;
}
