import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowRight, Search } from "lucide-react";
import { api } from "./lib/api.js";
import EventLandingPage from "./pages/EventLandingPage.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import LegalPage from "./pages/LegalPage.jsx";
import EventBuilderPage from "./pages/admin/EventBuilderPage.jsx";
import FormBuilderPage from "./pages/admin/FormBuilderPage.jsx";
import AdminManagementPage from "./pages/admin/AdminManagementPage.jsx";

const fetchEvents = async () => {
  const response = await api.get("/events");
  return Array.isArray(response.data) ? response.data : [];
};

const fetchAdminSession = async () => {
  const response = await api.get("/admin/me");
  return response.data;
};

const eventState = (event) => {
  const now = Date.now();
  const startsAt = event?.startsAt ? new Date(event.startsAt).getTime() : null;
  const endsAt = event?.endsAt ? new Date(event.endsAt).getTime() : null;

  if (startsAt && now < startsAt) {
    return "UPCOMING";
  }

  if (endsAt && now > endsAt) {
    return "ENDED";
  }

  return "LIVE";
};

const dateRangeLabel = (event) => {
  const startsAt = event?.startsAt ? new Date(event.startsAt) : null;
  const endsAt = event?.endsAt ? new Date(event.endsAt) : null;

  if (!startsAt && !endsAt) {
    return "Open timeline";
  }

  if (startsAt && !endsAt) {
    return `Starts ${startsAt.toLocaleString()}`;
  }

  if (!startsAt && endsAt) {
    return `Ends ${endsAt.toLocaleString()}`;
  }

  return `${startsAt.toLocaleDateString()} - ${endsAt.toLocaleDateString()}`;
};

const stateChipColorMap = {
  LIVE: "success",
  UPCOMING: "warning",
  ENDED: "default",
};

const RequireAdmin = ({ children }) => {
  const { isLoading, isError } = useQuery({
    queryKey: ["admin-session"],
    queryFn: fetchAdminSession,
    retry: false,
  });

  if (isLoading) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          py: 4,
        }}
      >
        <Paper sx={{ p: 3, width: "100%" }}>Verifying admin session...</Paper>
      </Container>
    );
  }

  if (isError) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

const EventDirectory = () => {
  const [query, setQuery] = useState("");

  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["events-list"],
    queryFn: fetchEvents,
  });

  const enrichedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        timelineState: eventState(event),
      })),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return enrichedEvents;
    }

    return enrichedEvents.filter((event) => {
      const haystack = [event.title, event.strapline]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [enrichedEvents, query]);

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(90deg, rgba(19, 25, 33, 0.06) 1px, transparent 1px), linear-gradient(rgba(19, 25, 33, 0.06) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          },
        }}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={2.5} sx={{ position: "relative" }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  component="img"
                  src="/logo.png"
                  alt="MGU.ONE"
                  sx={{
                    width: 80,
                    height: 80,
                    objectFit: "contain",
                    border: "2px solid",
                    borderColor: "primary.dark",
                    bgcolor: "background.paper",
                    p: 1,
                  }}
                />
                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ letterSpacing: 1.2 }}
                  >
                    Official MGU.ONE Network
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Minecraft Events, Tournaments, and Community Showdowns
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="h2" color="primary.main">
                Build. Battle. Broadcast.
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 720 }}
              >
                Bedwars, Survival, The Pit, and dedicated tournament realms.
                Explore and join live Minecraft events hosted by MGU.ONE.
              </Typography>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip label="Public Server Events" color="secondary" />
                <Chip label="Hardcore + Casual" variant="outlined" />
                <Chip label="Tournament Ready" variant="outlined" />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, minWidth: 180, bgcolor: "#fff8ee" }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Active Event Count
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {enrichedEvents.length}
                  </Typography>
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, flex: 1, bgcolor: "#f1fbef" }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Event Types
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    PvP, Parkour, Survival, and more
                  </Typography>
                </Paper>
              </Stack>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper
              variant="outlined"
              sx={{ p: 2.5, height: "100%", bgcolor: "#f5fafc" }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1.2 }}
              >
                Find Your Battleground
              </Typography>
              <TextField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by event title"
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        size={16}
                        style={{ marginRight: 8, color: "#3b4a5f" }}
                      />
                    ),
                  },
                }}
              />

              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Queue Status
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Showing {filteredEvents.length}{" "}
                  {filteredEvents.length === 1 ? "realm event" : "realm events"}
                </Typography>
              </Paper>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 2, display: "block" }}
              >
                Tip: Search modes like SkyWars, Anarchy, UHC, or tournament
                names.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Paper sx={{ p: 2 }}>
                  <Skeleton
                    variant="rectangular"
                    height={168}
                    sx={{ borderRadius: 0 }}
                  />
                  <Skeleton width="70%" sx={{ mt: 2 }} />
                  <Skeleton width="95%" />
                  <Skeleton width="45%" sx={{ mt: 1 }} />
                </Paper>
              </Grid>
            ))
          : null}

        {!isLoading && error ? (
          <Grid size={12}>
            <Alert severity="error" variant="outlined">
              Unable to load events right now.
            </Alert>
          </Grid>
        ) : null}

        {!isLoading && !error && filteredEvents.length === 0 ? (
          <Grid size={12}>
            <Alert severity="info" variant="outlined">
              No realm events match this search right now.
            </Alert>
          </Grid>
        ) : null}

        {!isLoading && !error
          ? filteredEvents.map((event) => {
              const mainCardImage = event.coverImage || event.cardLogo || "";
              const showCornerLogo = Boolean(
                event.cardLogo && event.cardLogo !== mainCardImage,
              );

              return (
                <Grid
                  key={event._id || event.slug}
                  size={{ xs: 12, sm: 6, lg: 4 }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      transition: "transform 120ms ease, box-shadow 120ms ease",
                      "&:hover": {
                        transform: "translate(-2px, -2px)",
                        boxShadow: "8px 8px 0 rgba(19, 25, 33, 0.26)",
                      },
                    }}
                  >
                    <CardActionArea
                      component={Link}
                      to={`/${event.slug}`}
                      sx={{ height: "100%", alignItems: "stretch" }}
                    >
                      {mainCardImage ? (
                        <CardMedia
                          component="img"
                          height="180"
                          image={mainCardImage}
                          alt={event.title}
                        />
                      ) : (
                        <Box sx={{ height: 180, backgroundColor: "#e7e2d7" }} />
                      )}

                      <CardContent>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography variant="h6" color="primary.main">
                            {event.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={event.timelineState}
                            color={
                              stateChipColorMap[event.timelineState] ||
                              "default"
                            }
                          />
                        </Stack>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {event.strapline ||
                            "Fresh Minecraft server event queued by MGU operators."}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 2, display: "block" }}
                        >
                          {dateRangeLabel(event)}
                        </Typography>
                        <Button
                          variant="outlined"
                          color="primary"
                          endIcon={<ArrowRight size={14} />}
                          sx={{ mt: 1.5 }}
                        >
                          Join Realm Event
                        </Button>
                      </CardContent>

                      {showCornerLogo ? (
                        <Box
                          sx={{
                            position: "absolute",
                            right: 12,
                            top: 12,
                            width: 40,
                            height: 40,
                            borderRadius: 0,
                            overflow: "hidden",
                            border: "2px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                          }}
                        >
                          <Box
                            component="img"
                            src={event.cardLogo}
                            alt={`${event.title} logo`}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        </Box>
                      ) : null}
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })
          : null}
      </Grid>
    </Container>
  );
};

const legalLinks = [
  { to: "/legal#terms", label: "Terms" },
  { to: "/legal#privacy", label: "Privacy" },
  { to: "/legal#cookies", label: "Cookies" },
  { to: "/legal#acceptable-use", label: "Acceptable Use" },
];

const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        borderTop: "3px solid",
        borderColor: "primary.main",
        backgroundColor: "#e9e4d6",
      }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2.5, height: "100%", bgcolor: "#f2eddf" }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1.2 }}
              >
                MGU.ONE Events
              </Typography>
              <Typography variant="h6" color="primary.main" sx={{ mt: 0.5 }}>
                Server Event Board
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1.5, display: "block" }}
              >
                Copyright © {year} MGU.ONE. All rights reserved.
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 2.5, height: "100%", bgcolor: "#f7f3e8" }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1.2 }}
              >
                Legal & Compliance
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                sx={{ mt: 1.5 }}
              >
                {legalLinks.map((link) => (
                  <Button
                    key={link.to}
                    component={Link}
                    to={link.to}
                    variant="outlined"
                    size="small"
                    color="primary"
                  >
                    {link.label}
                  </Button>
                ))}
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                MGU.ONE Events is an independent Minecraft community platform.
                Users must comply with tournament rules, platform policies, and
                applicable local regulations.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

const App = () => {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<EventDirectory />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Navigate to="/admin/events" replace />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/events"
            element={
              <RequireAdmin>
                <EventBuilderPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/forms"
            element={
              <RequireAdmin>
                <FormBuilderPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/admins"
            element={
              <RequireAdmin>
                <AdminManagementPage />
              </RequireAdmin>
            }
          />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/:slug" element={<EventLandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      <SiteFooter />
    </Box>
  );
};

export default App;
