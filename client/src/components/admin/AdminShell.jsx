import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../../lib/api.js";

const navItems = [
  { to: "/admin/events", label: "Event Builder" },
  { to: "/admin/forms", label: "Form Builder" },
  { to: "/admin/admins", label: "Admin Management" },
];

const AdminShell = ({ title, subtitle, actions, children }) => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await api.post("/admin/logout");
    } catch {
      // ignore transport failure and redirect to login
    } finally {
      setLoggingOut(false);
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="panel-voxel mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-panel/85 p-4 shadow-neon-cube">
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-200">
            MGU Realm Ops
          </p>
          <h1 className="text-rune-gradient text-2xl font-black uppercase">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 disabled:opacity-60"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 rounded-xl border border-emerald-400/20 bg-panel/75 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `interactive-chip rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                isActive
                  ? "is-active border-amber-300/70 bg-amber-500/15 text-amber-100"
                  : "border-emerald-400/20 bg-slate-900/55 text-slate-300"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {children}
    </main>
  );
};

export default AdminShell;
