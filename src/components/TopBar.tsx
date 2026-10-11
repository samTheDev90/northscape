import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Mountain,
  LogIn,
  LogOut,
  Shield,
  User,
  UserCircle2,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", end: true },
  { to: "/itinerary", label: "Itinerary" },
  { to: "/budget", label: "Budget" },
  { to: "/participants", label: "Participants" },
  { to: "/destinations", label: "Destinations" },
  { to: "/weather", label: "Weather" },
  { to: "/documents", label: "Documents", adminOnly: true },
  { to: "/admin", label: "Admin", adminOnly: true },
];

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const { saveState } = useStore();
  const { isAdmin, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-midnight/70 border-b border-purpleDark/60">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Mountain className="w-5 h-5 text-peach" />
          <span className="font-serif text-peach text-lg md:text-xl tracking-wide">
            Northscape
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-sm">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-peach bg-purpleDark/60"
                    : "text-textSecondary hover:text-textPrimary hover:bg-purpleDark/40"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-2 text-xs text-textSecondary">
            <span
              className={`w-2 h-2 rounded-full ${
                saveState === "saved"
                  ? "bg-forest"
                  : saveState === "saving"
                    ? "bg-gold animate-pulse"
                    : saveState === "error"
                      ? "bg-coral"
                      : "bg-lavenderMist"
              }`}
            />
            {saveState === "saved"
              ? "Saved"
              : saveState === "saving"
                ? "Saving…"
                : saveState === "error"
                  ? "Error"
                  : "Ready"}
          </span>

          {!isAuthenticated ? (
            <Link
              to="/signin"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-peach text-midnight text-xs font-medium hover:bg-coral transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          ) : (
            <UserMenu
              name={user?.displayName ?? ""}
              photoUrl={user?.photoUrl ?? ""}
              isAdmin={isAdmin}
              onSignOut={async () => {
                await signOut();
                navigate("/");
              }}
              onOpenProfile={() => navigate("/me")}
            />
          )}

          <button
            className="lg:hidden p-2 rounded-lg hover:bg-purpleDark/40 text-textPrimary"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-purpleDark/60 bg-indigoDeep/95 backdrop-blur-md">
          <nav className="max-w-[1400px] mx-auto px-4 py-3 grid grid-cols-2 gap-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-lg text-sm ${
                    isActive
                      ? "text-peach bg-purpleDark/60"
                      : "text-textSecondary hover:text-textPrimary hover:bg-purpleDark/40"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {!isAuthenticated ? (
              <NavLink
                to="/signin"
                onClick={() => setOpen(false)}
                className="col-span-2 mt-1 px-3 py-2.5 rounded-lg text-sm bg-peach text-midnight font-medium text-center"
              >
                Sign In
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/me"
                  onClick={() => setOpen(false)}
                  className="col-span-2 mt-1 px-3 py-2.5 rounded-lg text-sm bg-purpleDark/60 text-textPrimary inline-flex items-center gap-2"
                >
                  <UserCircle2 className="w-4 h-4" />
                  My Profile ({user?.displayName})
                </NavLink>
                <button
                  onClick={async () => {
                    setOpen(false);
                    await signOut();
                    navigate("/");
                  }}
                  className="col-span-2 px-3 py-2.5 rounded-lg text-sm text-coral hover:bg-coral/10 text-left"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function UserMenu({
  name,
  photoUrl,
  isAdmin,
  onSignOut,
  onOpenProfile,
}: {
  name: string;
  photoUrl: string;
  isAdmin: boolean;
  onSignOut: () => void;
  onOpenProfile: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initial = name.slice(0, 1).toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-purpleDark/60 hover:border-peach/50 bg-indigoDeep/60 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-peach/20 flex items-center justify-center text-peach text-xs font-semibold overflow-hidden">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            initial
          )}
        </span>
        {isAdmin && (
          <Shield className="w-3.5 h-3.5 text-gold" aria-label="Admin" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-purpleDark/60 bg-indigoDeep shadow-soft overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-purpleDark/60">
            <p className="text-sm text-textPrimary truncate">{name}</p>
            <p className="text-[11px] text-textSecondary mt-0.5 inline-flex items-center gap-1">
              {isAdmin ? (
                <>
                  <Shield className="w-3 h-3 text-gold" />
                  Administrator
                </>
              ) : (
                <>
                  <User className="w-3 h-3" />
                  Participant
                </>
              )}
            </p>
          </div>

          <button
            onClick={() => {
              setOpen(false);
              onOpenProfile();
            }}
            className="w-full px-4 py-2.5 text-sm text-left text-textPrimary hover:bg-purpleDark/40 transition-colors inline-flex items-center gap-2"
          >
            <UserCircle2 className="w-3.5 h-3.5" />
            My Profile
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full px-4 py-2.5 text-sm text-left text-coral hover:bg-coral/10 transition-colors inline-flex items-center gap-2 border-t border-purpleDark/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
