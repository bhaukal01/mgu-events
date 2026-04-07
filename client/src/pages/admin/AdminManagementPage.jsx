import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import AdminShell from "../../components/admin/AdminShell.jsx";

const AdminManagementPage = () => {
  const [admins, setAdmins] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmNextPassword, setConfirmNextPassword] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [adminError, setAdminError] = useState("");

  const loadCurrentAdmin = async () => {
    try {
      const { data } = await api.get("/admin/me");
      setCurrentAdmin(data || null);
    } catch {
      setCurrentAdmin(null);
    }
  };

  const loadAdmins = async () => {
    try {
      setLoadingAdmins(true);
      setAdminError("");

      const { data } = await api.get("/admin/admins");
      setAdmins(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setAdminError(
        requestError.response?.data?.message ||
          "Unable to load admin accounts.",
      );
    } finally {
      setLoadingAdmins(false);
    }
  };

  const deleteAdminAccount = async (admin) => {
    if (!admin?.id) {
      return;
    }

    const confirmDelete = window.confirm(
      `Delete admin account '${admin.username}'? This cannot be undone.`,
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingAdminId(admin.id);
      setAdminError("");
      setAdminNotice("");

      await api.delete(`/admin/admins/${admin.id}`);

      setAdminNotice(`Admin account '${admin.username}' deleted.`);
      await loadAdmins();
      await loadCurrentAdmin();
    } catch (requestError) {
      setAdminError(
        requestError.response?.data?.message ||
          "Unable to delete admin account.",
      );
    } finally {
      setDeletingAdminId("");
    }
  };

  const changeOwnPassword = async (event) => {
    event.preventDefault();

    if (nextPassword !== confirmNextPassword) {
      setAdminError("New password confirmation does not match.");
      return;
    }

    try {
      setChangingPassword(true);
      setAdminError("");
      setAdminNotice("");

      await api.put("/admin/me/password", {
        currentPassword,
        newPassword: nextPassword,
        confirmNewPassword: confirmNextPassword,
      });

      setCurrentPassword("");
      setNextPassword("");
      setConfirmNextPassword("");
      setAdminNotice("Your password was updated successfully.");
    } catch (requestError) {
      setAdminError(
        requestError.response?.data?.message ||
          "Unable to update your password.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const createAdminAccount = async (event) => {
    event.preventDefault();

    try {
      setCreatingAdmin(true);
      setAdminError("");
      setAdminNotice("");

      await api.post("/admin/admins", {
        username: newAdminUsername,
        password: newAdminPassword,
      });

      setNewAdminUsername("");
      setNewAdminPassword("");
      setAdminNotice("Admin account created successfully.");
      await loadAdmins();
    } catch (requestError) {
      setAdminError(
        requestError.response?.data?.message ||
          "Unable to create admin account.",
      );
    } finally {
      setCreatingAdmin(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    loadCurrentAdmin();
  }, []);

  return (
    <AdminShell
      title="Admin Management"
      subtitle="Create admins, remove old accounts, and manage your own password."
    >
      <article className="rounded-2xl border border-emerald-400/20 bg-panel/80 p-4 sm:p-5">
        <h2 className="text-lg font-black uppercase text-ink">
          Create New Admin
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          New credentials are securely stored in MongoDB.
        </p>

        <form
          onSubmit={createAdminAccount}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            value={newAdminUsername}
            onChange={(event) => setNewAdminUsername(event.target.value)}
            placeholder="new admin username"
            autoComplete="off"
            className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
            required
          />
          <input
            type="password"
            value={newAdminPassword}
            onChange={(event) => setNewAdminPassword(event.target.value)}
            placeholder="temporary password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
            required
          />
          <button
            type="submit"
            disabled={creatingAdmin}
            className="btn-prism rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingAdmin ? "Saving..." : "Add Admin"}
          </button>
        </form>

        {adminNotice ? (
          <p className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {adminNotice}
          </p>
        ) : null}

        {adminError ? (
          <p className="mt-3 rounded-xl border border-red-500/45 bg-red-500/12 px-3 py-2 text-xs text-red-100">
            {adminError}
          </p>
        ) : null}
      </article>

      <article className="mt-6 rounded-2xl border border-emerald-400/20 bg-panel/80 p-4 sm:p-5">
        <h2 className="text-lg font-black uppercase text-ink">My Security</h2>
        <p className="mt-1 text-xs text-slate-400">
          Signed in as {currentAdmin?.username || "current admin"}. Update your
          own password from here.
        </p>

        <form
          onSubmit={changeOwnPassword}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="current password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
            required
          />
          <input
            type="password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            placeholder="new password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
            required
          />
          <input
            type="password"
            value={confirmNextPassword}
            onChange={(event) => setConfirmNextPassword(event.target.value)}
            placeholder="confirm new password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
            required
          />
          <button
            type="submit"
            disabled={changingPassword}
            className="btn-prism rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-3 sm:w-max"
          >
            {changingPassword ? "Updating..." : "Change My Password"}
          </button>
        </form>
      </article>

      <article className="mt-6 rounded-2xl border border-emerald-400/20 bg-panel/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black uppercase text-ink">
            Active Admin Accounts
          </h2>
          <span className="rounded-full border border-amber-300/45 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-100">
            Role model: admin only
          </span>
        </div>

        {loadingAdmins ? (
          <div className="mt-4 h-12 animate-pulse rounded-lg bg-slate-900/70" />
        ) : null}

        {!loadingAdmins && admins.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No admin accounts found.
          </p>
        ) : null}

        {!loadingAdmins && admins.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {admins.map((admin) => {
              const isSelf =
                String(currentAdmin?.id || "") === String(admin.id);
              const isDeleting = deletingAdminId === admin.id;

              return (
                <div
                  key={admin.id}
                  className="rounded-xl border border-emerald-400/20 bg-slate-900/45 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {admin.username}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">
                        {admin.role} {isSelf ? "• You" : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteAdminAccount(admin)}
                      disabled={
                        isSelf || isDeleting || Boolean(deletingAdminId)
                      }
                      className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-200 disabled:opacity-50"
                    >
                      {isSelf
                        ? "Current"
                        : isDeleting
                          ? "Deleting..."
                          : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </article>
    </AdminShell>
  );
};

export default AdminManagementPage;
