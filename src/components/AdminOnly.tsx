import { useAuth } from "../lib/auth";

/**
 * Renders children only when the logged-in user is an admin.
 * Use around every edit / delete / create control in the app.
 */
export default function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}
