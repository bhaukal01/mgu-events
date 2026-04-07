import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [loadingSetupState, setLoadingSetupState] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBootstrapStatus = async () => {
      try {
        const { data } = await api.get("/admin/bootstrap-status");
        setRequiresSetup(Boolean(data?.requiresSetup));
      } catch {
        setRequiresSetup(false);
      } finally {
        setLoadingSetupState(false);
      }
    };

    fetchBootstrapStatus();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      setNotice("");

      if (requiresSetup) {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setIsSubmitting(false);
          return;
        }

        await api.post("/admin/bootstrap", { username, password });
        setNotice("Initial admin account created.");
      } else {
        await api.post("/admin/login", { username, password });
      }

      navigate("/admin/events", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Login failed. Check your credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingSetupState) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12 sm:px-6">
        <section className="panel-voxel w-full rounded-3xl border border-emerald-400/20 bg-panel/85 p-8 shadow-neon-cube">
          <p className="text-sm text-slate-300">
            Preparing secure admin access...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12 sm:px-6">
      <section className="panel-voxel relative w-full overflow-hidden rounded-3xl border border-emerald-400/20 bg-panel/85 p-8 shadow-neon-cube backdrop-blur-md">
        <img
          src="/branding/mgu-one-logo.svg"
          alt="MGU ONE"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050815]/85 via-[#050815]/70 to-[#050815]/85" />

        <div className="relative">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {requiresSetup ? "Initial Setup" : "Operator Access"}
          </p>
          <h1 className="text-rune-gradient text-3xl font-black uppercase">
            {requiresSetup ? "Create First Admin" : "Realm Ops Console"}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {requiresSetup
              ? "No admin account exists yet. Create the first secure admin for this deployment."
              : "Sign in to launch Minecraft events, edit arena announcements, and review tournament entries."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Username
              </span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                className="w-full rounded-xl border border-emerald-400/20 bg-slate-900/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-emerald-400/20 bg-slate-900/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                required
              />
            </label>

            {requiresSetup ? (
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Confirm Password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-emerald-400/20 bg-slate-900/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                  required
                />
              </label>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-red-500/45 bg-red-500/12 px-3 py-2 text-xs text-red-100">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                {notice}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-prism w-full rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? requiresSetup
                  ? "Creating admin..."
                  : "Entering control deck..."
                : requiresSetup
                  ? "Create Admin Account"
                  : "Enter Control Deck"}
            </button>
          </form>

          <Link
            to="/"
            className="mt-4 inline-flex text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:text-amber-200"
          >
            Back to event board
          </Link>
        </div>
      </section>
    </main>
  );
};

export default AdminLogin;
