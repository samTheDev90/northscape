import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogIn, TicketCheck, Mountain, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "../lib/auth";
import Button from "../components/PrimaryButton";
import { TextInput } from "../components/FormField";
import { fetchInvite } from "../lib/invites";
import type { Invite } from "../lib/types";

type Tab = "signin" | "invite";

export default function SignInPage() {
  const { signIn, redeemInvite, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [tab, setTab] = useState<Tab>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [inviteCode, setInviteCode] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [looking, setLooking] = useState(false);

  const [redeemEmail, setRedeemEmail] = useState("");
  const [redeemPassword, setRedeemPassword] = useState("");
  const [redeemConfirm, setRedeemConfirm] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, from, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleLookupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLooking(true);
    try {
      const found = await fetchInvite(inviteCode);
      if (!found) throw new Error("No invite found with that code.");
      if (found.used) throw new Error("This invite has already been used.");
      setInvite(found);
      setRedeemEmail(found.email ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLooking(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setError(null);
    if (redeemPassword !== redeemConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await redeemInvite({
        code: invite.code,
        email: redeemEmail,
        password: redeemPassword,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed.");
    } finally {
      setBusy(false);
    }
  };

  const resetInvite = () => {
    setInvite(null);
    setInviteCode("");
    setRedeemEmail("");
    setRedeemPassword("");
    setRedeemConfirm("");
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-peach/15 border border-peach/30 mb-4">
            <Mountain className="w-6 h-6 text-peach" />
          </div>
          <h1 className="font-serif text-3xl text-textPrimary mb-1">
            Northscape
          </h1>
          <p className="text-textSecondary text-sm">
            Sign in, or activate your invite
          </p>
        </div>

        <div className="rounded-2xl border border-purpleDark/60 bg-indigoDeep/80 backdrop-blur p-6 shadow-soft">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-midnight/60 border border-purpleDark/60 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab("signin");
                setError(null);
                resetInvite();
              }}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                tab === "signin"
                  ? "bg-peach text-midnight font-medium"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("invite");
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                tab === "invite"
                  ? "bg-peach text-midnight font-medium"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              Redeem Invite
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-xs text-coral">
              {error}
            </div>
          )}

          {tab === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                autoComplete="email"
              />
              <TextInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <Button
                type="submit"
                disabled={busy || !email.trim() || !password}
                className="w-full"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Sign In
              </Button>
            </form>
          ) : !invite ? (
            <form onSubmit={handleLookupCode} className="space-y-4">
              <TextInput
                label="Invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="PV-XXXX-XXXX"
                autoFocus
                autoCapitalize="characters"
              />
              <p className="text-[11px] text-textSecondary">
                Enter the code your trip organizer sent you.
              </p>
              <Button
                type="submit"
                disabled={looking || !inviteCode.trim()}
                className="w-full"
              >
                {looking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TicketCheck className="w-4 h-4" />
                )}
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRedeem} className="space-y-4">
              <button
                type="button"
                onClick={resetInvite}
                className="inline-flex items-center gap-1 text-xs text-textSecondary hover:text-peach"
              >
                <ArrowLeft className="w-3 h-3" /> Use a different code
              </button>

              <div className="rounded-lg border border-forest/40 bg-forest/10 px-3 py-2 text-xs">
                <p className="text-textPrimary font-medium">
                  Welcome, {invite.displayName}!
                </p>
                <p className="text-textSecondary mt-0.5">
                  {invite.role === "admin"
                    ? "You are being added as an administrator."
                    : "You are being added as a participant."}
                </p>
              </div>

              <TextInput
                label="Email"
                type="email"
                value={redeemEmail}
                onChange={(e) => setRedeemEmail(e.target.value)}
                disabled={!!invite.email}
                placeholder="you@example.com"
                autoComplete="email"
                hint={
                  invite.email
                    ? "This invite is locked to this email."
                    : undefined
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Password"
                  type="password"
                  value={redeemPassword}
                  onChange={(e) => setRedeemPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  autoComplete="new-password"
                />
                <TextInput
                  label="Confirm"
                  type="password"
                  value={redeemConfirm}
                  onChange={(e) => setRedeemConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                disabled={
                  busy ||
                  !redeemEmail.trim() ||
                  redeemPassword.length < 6 ||
                  redeemPassword !== redeemConfirm
                }
                className="w-full"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TicketCheck className="w-4 h-4" />
                )}
                Activate account
              </Button>
            </form>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 w-full text-center text-xs text-textSecondary hover:text-peach"
        >
          ← Continue as visitor (read-only)
        </button>
      </div>
    </div>
  );
}
