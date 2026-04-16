import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { LogOut } from "lucide-react";
import { api } from "../../lib/api.js";

const navItems = [
  { to: "/admin/events", label: "Event Builder" },
  { to: "/admin/forms", label: "Form Builder" },
  { to: "/admin/admins", label: "Admin Management" },
];

const AdminShell = ({ title, subtitle, actions, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
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
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ mb: 2, p: 3 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", lg: "center" }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: 1.4 }}
            >
              MGU Realm Operations
            </Typography>
            <Typography variant="h4" color="primary.main">
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {actions}
            <Button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              color="error"
              variant="outlined"
              startIcon={<LogOut size={16} />}
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ mb: 3, p: 1.5 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;

            return (
              <Button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                variant={isActive ? "contained" : "outlined"}
                color={isActive ? "secondary" : "primary"}
                size="small"
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>
      </Paper>

      {children}
    </Container>
  );
};

export default AdminShell;
