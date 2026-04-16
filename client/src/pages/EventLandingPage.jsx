import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api.js";
import DynamicRenderer from "../components/DynamicRenderer.jsx";

const fetchEventBySlug = async (slug) => {
  const response = await api.get(`/events/${slug}`);
  return response.data;
};

const EventLandingPage = () => {
  const { slug } = useParams();

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event-detail", slug],
    queryFn: () => fetchEventBySlug(slug),
    enabled: Boolean(slug),
  });

  const eventWindow = useMemo(() => {
    if (!event) {
      return "";
    }

    const startsAt = event.startsAt ? new Date(event.startsAt) : null;
    const endsAt = event.endsAt ? new Date(event.endsAt) : null;

    if (!startsAt && !endsAt) {
      return "Open world window";
    }

    if (startsAt && !endsAt) {
      return `Starts ${startsAt.toLocaleString()}`;
    }

    if (!startsAt && endsAt) {
      return `Ends ${endsAt.toLocaleString()}`;
    }

    return `${startsAt.toLocaleDateString()} - ${endsAt.toLocaleDateString()}`;
  }, [event]);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ minHeight: "100vh", py: 5 }}>
        <Skeleton width={220} height={36} sx={{ mb: 2 }} />
        <Paper sx={{ p: 3 }}>
          <Skeleton height={48} width="56%" />
          <Skeleton height={24} width="70%" />
          <Skeleton
            variant="rectangular"
            height={180}
            sx={{ mt: 2, borderRadius: 2 }}
          />
        </Paper>
      </Container>
    );
  }

  if (error || !event) {
    return (
      <Container
        maxWidth="md"
        sx={{
          minHeight: "100vh",
          py: 5,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Paper sx={{ p: 3, width: "100%" }}>
          <Typography variant="overline" color="error.main">
            Realm Lookup Error
          </Typography>
          <Typography variant="h4" color="primary.main" sx={{ mt: 1 }}>
            Unable to Open Realm
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            The requested Minecraft event is not available right now.
          </Typography>
          <Button component={Link} to="/" variant="contained" sx={{ mt: 2 }}>
            Back to Realms
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        component={Link}
        to="/"
        variant="outlined"
        color="primary"
        startIcon={<ArrowLeft size={16} />}
        sx={{ mb: 2 }}
      >
        Back to all realm events
      </Button>

      <Paper
        sx={{
          mb: 3,
          p: { xs: 2.5, sm: 4 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src="/branding/mgu-one-logo.svg"
          alt="MGU ONE"
          sx={{
            position: "absolute",
            right: -12,
            top: -20,
            width: 180,
            opacity: 0.08,
          }}
        />
        <Stack spacing={1.5} sx={{ position: "relative" }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: 1.2 }}
          >
            Minecraft Event Arena
          </Typography>
          <Typography variant="h3" color="primary.main">
            {event.title}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 760 }}
          >
            {eventWindow}. Gather your crew, lock your loadout, and enter the
            bracket.
          </Typography>
        </Stack>
      </Paper>

      <DynamicRenderer event={event} />
    </Container>
  );
};

export default EventLandingPage;
