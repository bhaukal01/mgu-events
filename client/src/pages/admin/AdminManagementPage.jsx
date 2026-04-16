import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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
      {adminNotice ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {adminNotice}
        </Alert>
      ) : null}

      {adminError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {adminError}
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" color="primary.main">
          Create New Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          New credentials are securely stored in MongoDB.
        </Typography>

        <Stack
          component="form"
          onSubmit={createAdminAccount}
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ mt: 2 }}
        >
          <TextField
            value={newAdminUsername}
            onChange={(event) => setNewAdminUsername(event.target.value)}
            placeholder="New admin username"
            autoComplete="off"
            size="small"
            fullWidth
            required
          />
          <TextField
            type="password"
            value={newAdminPassword}
            onChange={(event) => setNewAdminPassword(event.target.value)}
            placeholder="Temporary password"
            autoComplete="new-password"
            size="small"
            fullWidth
            required
          />
          <Button
            type="submit"
            disabled={creatingAdmin}
            variant="contained"
            sx={{ minWidth: 130 }}
          >
            {creatingAdmin ? "Saving..." : "Add Admin"}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 2 }}>
        <Typography variant="h6" color="primary.main">
          My Security
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Signed in as {currentAdmin?.username || "current admin"}. Update your
          own password from here.
        </Typography>

        <Grid
          component="form"
          container
          spacing={1.5}
          onSubmit={changeOwnPassword}
          sx={{ mt: 1 }}
        >
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              size="small"
              fullWidth
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              size="small"
              fullWidth
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              type="password"
              value={confirmNextPassword}
              onChange={(event) => setConfirmNextPassword(event.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              size="small"
              fullWidth
              required
            />
          </Grid>
          <Grid size={12}>
            <Button
              type="submit"
              disabled={changingPassword}
              variant="contained"
            >
              {changingPassword ? "Updating..." : "Change My Password"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={1.5}
          alignItems="center"
        >
          <Typography variant="h6" color="primary.main">
            Active Admin Accounts
          </Typography>
          <Chip
            label="Role model: admin only"
            size="small"
            variant="outlined"
          />
        </Stack>

        {loadingAdmins ? (
          <Skeleton
            variant="rectangular"
            height={64}
            sx={{ borderRadius: 0, mt: 2 }}
          />
        ) : null}

        {!loadingAdmins && admins.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No admin accounts found.
          </Typography>
        ) : null}

        {!loadingAdmins && admins.length > 0 ? (
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            {admins.map((admin) => {
              const isSelf =
                String(currentAdmin?.id || "") === String(admin.id);
              const isDeleting = deletingAdminId === admin.id;

              return (
                <Grid key={admin.id} size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="subtitle2" color="primary.main">
                          {admin.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {admin.role} {isSelf ? "• You" : ""}
                        </Typography>
                      </Box>

                      <Button
                        type="button"
                        onClick={() => deleteAdminAccount(admin)}
                        disabled={
                          isSelf || isDeleting || Boolean(deletingAdminId)
                        }
                        color="error"
                        variant="outlined"
                        size="small"
                      >
                        {isSelf
                          ? "Current"
                          : isDeleting
                            ? "Deleting..."
                            : "Delete"}
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ) : null}
      </Paper>
    </AdminShell>
  );
};

export default AdminManagementPage;
