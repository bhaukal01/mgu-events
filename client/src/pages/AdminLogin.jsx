import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Shield } from "lucide-react";
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
      <Container
        maxWidth="sm"
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          py: 6,
        }}
      >
        <Paper sx={{ p: 4, width: "100%" }}>
          <Typography variant="body2" color="text.secondary">
            Preparing secure admin access...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="sm"
      sx={{ minHeight: "100vh", display: "flex", alignItems: "center", py: 6 }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 4 },
          width: "100%",
          position: "relative",
          overflow: "hidden",
          bgcolor: "#f5fafc",
        }}
      >
        <Box
          component="img"
          src="/branding/mgu-one-logo.svg"
          alt="MGU ONE"
          sx={{
            position: "absolute",
            right: -24,
            top: -20,
            width: 180,
            opacity: 0.14,
          }}
        />

        <Stack spacing={2} sx={{ position: "relative" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Shield size={16} />
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 1.2 }}
            >
              {requiresSetup ? "Initial Setup" : "Operator Access"}
            </Typography>
          </Stack>

          <Typography variant="h4" color="primary.main">
            {requiresSetup ? "Create First Admin" : "Realm Ops Console"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {requiresSetup
              ? "No admin account exists yet. Create the first secure admin for this deployment."
              : "Sign in to launch Minecraft events, edit arena announcements, and review tournament entries."}
          </Typography>

          <Stack
            component="form"
            spacing={2}
            onSubmit={handleSubmit}
            noValidate
          >
            <TextField
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              label="Username"
              required
              fullWidth
            />

            <TextField
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              label="Password"
              required
              fullWidth
            />

            {requiresSetup ? (
              <TextField
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                label="Confirm Password"
                required
                fullWidth
              />
            ) : null}

            {error ? <Alert severity="error">{error}</Alert> : null}
            {notice ? <Alert severity="success">{notice}</Alert> : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              variant="contained"
              fullWidth
            >
              {isSubmitting
                ? requiresSetup
                  ? "Creating admin..."
                  : "Entering control deck..."
                : requiresSetup
                  ? "Create Admin Account"
                  : "Enter Control Deck"}
            </Button>
          </Stack>

          <Button
            component={RouterLink}
            to="/"
            size="small"
            color="inherit"
            sx={{ alignSelf: "flex-start" }}
          >
            Back to event board
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AdminLogin;
