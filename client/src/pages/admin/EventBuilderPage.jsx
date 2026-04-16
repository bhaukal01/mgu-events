import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import AdminShell from "../../components/admin/AdminShell.jsx";
import AdminImageUpload from "../../components/admin/AdminImageUpload.jsx";

const BLOCK_TYPES = [
  "HERO_EXPLOSION",
  "TEXT_GLOW_BLOCK",
  "IMAGE_GRID",
  "REWARD_TIER",
  "RULES_BLOCK",
  "DYNAMIC_FORM",
];

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "ARCHIVED"];

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const toInputDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
};

const toIsoDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const defaultBlockData = (type) => {
  if (type === "HERO_EXPLOSION") {
    return {
      title: "",
      subtitle: "",
      imageUrl: "",
      logoUrl: "/branding/mgu-one-logo.svg",
      ctaLabel: "",
      ctaHref: "",
    };
  }

  if (type === "TEXT_GLOW_BLOCK") {
    return {
      heading: "",
      body: "",
    };
  }

  if (type === "IMAGE_GRID") {
    return {
      caption: "",
      images: [],
    };
  }

  if (type === "REWARD_TIER") {
    return {
      title: "Rewards",
      items: [],
    };
  }

  if (type === "RULES_BLOCK") {
    return {
      title: "Rules",
      items: [],
    };
  }

  return {
    formId: "",
  };
};

const emptyEvent = () => ({
  title: "",
  slug: "",
  status: "DRAFT",
  serverLogoUrl: "",
  manualEventPublish: false,
  manualWinnerPublish: false,
  winnerAnnouncement: "",
  startsAt: "",
  endsAt: "",
  layout: [
    {
      type: "HERO_EXPLOSION",
      data: defaultBlockData("HERO_EXPLOSION"),
    },
  ],
});

const normalizeImageGridData = (data) => {
  if (Array.isArray(data?.images)) {
    return {
      caption: data.caption || "",
      images: data.images
        .map((image) => ({
          url: String(image?.url || "").trim(),
          alt: String(image?.alt || "").trim(),
        }))
        .filter((image) => image.url),
    };
  }

  if (typeof data?.src === "string" && data.src.trim()) {
    return {
      caption: data.caption || "",
      images: [
        {
          url: data.src.trim(),
          alt: String(data.alt || "").trim(),
        },
      ],
    };
  }

  return {
    caption: data?.caption || "",
    images: [],
  };
};

const normalizeEvent = (event) => ({
  _id: event._id,
  title: event.title || "",
  slug: event.slug || "",
  status: STATUS_OPTIONS.includes(event.status) ? event.status : "DRAFT",
  serverLogoUrl: event.serverLogoUrl || "",
  manualEventPublish: Boolean(event.manualEventPublish),
  manualWinnerPublish: Boolean(event.manualWinnerPublish),
  winnerAnnouncement: event.winnerAnnouncement || "",
  startsAt: toInputDate(event.startsAt),
  endsAt: toInputDate(event.endsAt),
  layout: Array.isArray(event.layout)
    ? event.layout.map((block) => {
        const type = block.type;

        if (type === "IMAGE_GRID") {
          return {
            type,
            data: normalizeImageGridData(block.data || {}),
          };
        }

        if (type === "REWARD_TIER" || type === "RULES_BLOCK") {
          return {
            type,
            data: {
              title:
                block.data?.title ||
                (type === "RULES_BLOCK" ? "Rules" : "Rewards"),
              items: Array.isArray(block.data?.items)
                ? block.data.items
                : String(block.data?.items || "")
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
            },
          };
        }

        return {
          type,
          data: {
            ...defaultBlockData(type),
            ...(block.data || {}),
          },
        };
      })
    : [],
});

const EventBuilderPage = () => {
  const [events, setEvents] = useState([]);
  const [forms, setForms] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [draft, setDraft] = useState(emptyEvent());
  const [submissions, setSubmissions] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const activeForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId) || null,
    [forms, selectedFormId],
  );

  const visibleSubmissions = useMemo(() => {
    if (!selectedFormId) {
      return submissions;
    }

    return submissions.filter(
      (submission) => submission.formId === selectedFormId,
    );
  }, [selectedFormId, submissions]);

  const loadForms = async () => {
    try {
      setLoadingForms(true);
      const { data } = await api.get("/admin/forms");
      setForms(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to load forms list.",
      );
    } finally {
      setLoadingForms(false);
    }
  };

  const loadEvents = async (preferredEventId = "") => {
    try {
      setLoadingEvents(true);
      setError("");

      const { data } = await api.get("/admin/events");
      const list = Array.isArray(data) ? data : [];
      setEvents(list);

      const targetId = preferredEventId || activeEventId;
      if (!targetId) {
        return;
      }

      const found = list.find((event) => event._id === targetId);
      if (found) {
        const normalized = normalizeEvent(found);
        setDraft(normalized);
        setActiveEventId(found._id);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to load events.",
      );
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadSubmissions = async (eventId, nextSelectedFormId = "") => {
    if (!eventId) {
      setSubmissions([]);
      return;
    }

    try {
      setLoadingSubmissions(true);
      const { data } = await api.get(`/submissions/admin/${eventId}`);
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);

      const linkedForms = Array.isArray(data.event?.forms)
        ? data.event.forms
        : [];
      if (nextSelectedFormId) {
        setSelectedFormId(nextSelectedFormId);
      } else {
        setSelectedFormId(linkedForms[0]?.id || "");
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load submissions for this event.",
      );
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    loadForms();
    loadEvents();
  }, []);

  const selectEvent = async (event) => {
    const normalized = normalizeEvent(event);
    setDraft(normalized);
    setActiveEventId(event._id);

    const linkedFormIds = normalized.layout
      .filter((block) => block.type === "DYNAMIC_FORM")
      .map((block) => block.data?.formId)
      .filter(Boolean);

    const nextFormId = linkedFormIds[0] || "";
    setSelectedFormId(nextFormId);

    await loadSubmissions(event._id, nextFormId);
  };

  const createNewEvent = () => {
    const fresh = emptyEvent();
    setActiveEventId("");
    setDraft(fresh);
    setSelectedFormId("");
    setSubmissions([]);
    setNotice("Creating a new event draft.");
    setError("");
  };

  const updateDraft = (patch) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  };

  const addBlock = (type) => {
    setDraft((previous) => ({
      ...previous,
      layout: [
        ...previous.layout,
        {
          type,
          data: defaultBlockData(type),
        },
      ],
    }));
  };

  const updateBlockType = (index, type) => {
    setDraft((previous) => {
      const nextLayout = [...previous.layout];
      nextLayout[index] = {
        type,
        data: defaultBlockData(type),
      };

      return { ...previous, layout: nextLayout };
    });
  };

  const patchBlockData = (index, patch) => {
    setDraft((previous) => {
      const nextLayout = [...previous.layout];
      nextLayout[index] = {
        ...nextLayout[index],
        data: {
          ...(nextLayout[index]?.data || {}),
          ...patch,
        },
      };

      return { ...previous, layout: nextLayout };
    });
  };

  const addImageToGrid = (blockIndex) => {
    const block = draft.layout[blockIndex];
    const currentImages = Array.isArray(block?.data?.images)
      ? block.data.images
      : [];

    patchBlockData(blockIndex, {
      images: [...currentImages, { url: "", alt: "" }],
    });
  };

  const patchGridImage = (blockIndex, imageIndex, patch) => {
    const block = draft.layout[blockIndex];
    const currentImages = Array.isArray(block?.data?.images)
      ? [...block.data.images]
      : [];

    currentImages[imageIndex] = {
      ...currentImages[imageIndex],
      ...patch,
    };

    patchBlockData(blockIndex, {
      images: currentImages,
    });
  };

  const removeGridImage = (blockIndex, imageIndex) => {
    const block = draft.layout[blockIndex];
    const currentImages = Array.isArray(block?.data?.images)
      ? [...block.data.images]
      : [];

    patchBlockData(blockIndex, {
      images: currentImages.filter((_, index) => index !== imageIndex),
    });
  };

  const removeBlock = (index) => {
    setDraft((previous) => ({
      ...previous,
      layout: previous.layout.filter((_, blockIndex) => blockIndex !== index),
    }));
  };

  const moveBlock = (index, direction) => {
    setDraft((previous) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= previous.layout.length) {
        return previous;
      }

      const nextLayout = [...previous.layout];
      const [movedBlock] = nextLayout.splice(index, 1);
      nextLayout.splice(nextIndex, 0, movedBlock);

      return {
        ...previous,
        layout: nextLayout,
      };
    });
  };

  const createPayload = () => ({
    title: draft.title.trim(),
    slug: slugify(draft.slug || draft.title),
    status: draft.status,
    serverLogoUrl: draft.serverLogoUrl || "",
    manualEventPublish: Boolean(draft.manualEventPublish),
    manualWinnerPublish: Boolean(draft.manualWinnerPublish),
    winnerAnnouncement: String(draft.winnerAnnouncement || ""),
    startsAt: toIsoDateOrNull(draft.startsAt),
    endsAt: toIsoDateOrNull(draft.endsAt),
    layout: draft.layout.map((block) => {
      if (block.type === "REWARD_TIER" || block.type === "RULES_BLOCK") {
        return {
          type: block.type,
          data: {
            title:
              block.data?.title ||
              (block.type === "RULES_BLOCK" ? "Rules" : "Rewards"),
            items: Array.isArray(block.data?.items)
              ? block.data.items
              : String(block.data?.items || "")
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
          },
        };
      }

      if (block.type === "IMAGE_GRID") {
        return {
          type: block.type,
          data: {
            caption: block.data?.caption || "",
            images: Array.isArray(block.data?.images)
              ? block.data.images.filter((image) => image.url)
              : [],
          },
        };
      }

      if (block.type === "DYNAMIC_FORM") {
        return {
          type: block.type,
          data: {
            formId: String(block.data?.formId || "").toLowerCase(),
          },
        };
      }

      return {
        type: block.type,
        data: block.data || {},
      };
    }),
  });

  const saveEvent = async () => {
    const payload = createPayload();

    if (!payload.title || !payload.slug) {
      setError("Event title and slug are required.");
      return;
    }

    try {
      setSaving(true);
      setNotice("");
      setError("");

      const request = activeEventId
        ? api.put(`/admin/events/${activeEventId}`, payload)
        : api.post("/admin/events", payload);

      const { data } = await request;
      const normalized = normalizeEvent(data);

      setDraft(normalized);
      setActiveEventId(data._id);
      setNotice(activeEventId ? "Event updated." : "Event created.");

      await loadEvents(data._id);
      await loadSubmissions(data._id);
    } catch (requestError) {
      const base =
        requestError.response?.data?.message ||
        "Could not save event. Resolve validation errors and retry.";
      const details = requestError.response?.data?.errors;
      setError(Array.isArray(details) ? `${base} ${details.join(" ")}` : base);
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!activeEventId) {
      setError("Select an event to delete.");
      return;
    }

    const confirmDelete = window.confirm(
      `Delete event '${draft.title || draft.slug || activeEventId}'? This will remove event data, submissions, and associated ImageKit images.`,
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingEvent(true);
      setNotice("");
      setError("");

      const { data } = await api.delete(`/admin/events/${activeEventId}`);
      const deletedSubmissionCount = Number(data?.deletedSubmissions || 0);
      const deletedImageCount = Number(data?.cleanup?.deleted || 0);

      setActiveEventId("");
      setDraft(emptyEvent());
      setSelectedFormId("");
      setSubmissions([]);

      await loadEvents();

      setNotice(
        `${data?.message || "Event deleted."} Removed ${deletedSubmissionCount} submissions and ${deletedImageCount} ImageKit files.`,
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to delete event.",
      );
    } finally {
      setDeletingEvent(false);
    }
  };

  const markEventPublished = () => {
    updateDraft({ status: "ACTIVE", manualEventPublish: true });
    setNotice("Event marked for manual publish. Click Save Event to apply.");
    setError("");
  };

  const markWinnerPublished = () => {
    updateDraft({ manualWinnerPublish: true });
    setNotice("Winner publish enabled. Click Save Event to apply.");
    setError("");
  };

  return (
    <AdminShell
      title="Event Builder"
      subtitle="Create and edit events, then link already-built standalone forms."
      actions={
        <>
          <Button
            type="button"
            onClick={createNewEvent}
            variant="outlined"
            startIcon={<Plus size={16} />}
          >
            New Event
          </Button>
          <Button
            type="button"
            onClick={saveEvent}
            disabled={saving}
            variant="contained"
            color="primary"
          >
            {saving ? "Saving..." : "Save Event"}
          </Button>
          <Button
            type="button"
            onClick={markEventPublished}
            variant="outlined"
            color="secondary"
          >
            Publish Event
          </Button>
          <Button
            type="button"
            onClick={markWinnerPublished}
            variant="outlined"
            color="secondary"
          >
            Publish Winner
          </Button>
          <Button
            type="button"
            onClick={deleteEvent}
            disabled={!activeEventId || deletingEvent || saving}
            color="error"
            variant="outlined"
            startIcon={<Trash2 size={16} />}
          >
            {deletingEvent ? "Deleting..." : "Delete Event"}
          </Button>
        </>
      }
    >
      {notice ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, xl: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary.main">
              Server Events
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Select an event to edit.
            </Typography>

            <Stack spacing={1.25} sx={{ mt: 2 }}>
              {loadingEvents ? (
                <Skeleton
                  variant="rectangular"
                  height={96}
                  sx={{ borderRadius: 2 }}
                />
              ) : null}

              {!loadingEvents && events.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No events yet. Create your first event.
                </Typography>
              ) : null}

              {!loadingEvents
                ? events.map((event) => {
                    const isActive =
                      String(activeEventId || "") === String(event._id || "");

                    return (
                      <Button
                        key={event._id}
                        type="button"
                        onClick={() => selectEvent(event)}
                        variant={isActive ? "contained" : "outlined"}
                        color={isActive ? "secondary" : "primary"}
                        fullWidth
                        sx={{
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          textAlign: "left",
                          p: 1.5,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {event.status}
                          </Typography>
                          <Typography variant="subtitle2">
                            {event.title}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            /{event.slug}
                          </Typography>
                        </Box>
                      </Button>
                    );
                  })
                : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 9 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" color="primary.main">
                Event Settings
              </Typography>

              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    value={draft.title}
                    onChange={(event) =>
                      updateDraft({ title: event.target.value })
                    }
                    onBlur={() => {
                      if (!draft.slug.trim()) {
                        updateDraft({ slug: slugify(draft.title) });
                      }
                    }}
                    label="Title"
                    fullWidth
                    size="small"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    value={draft.slug}
                    onChange={(event) =>
                      updateDraft({ slug: slugify(event.target.value) })
                    }
                    label="Slug"
                    fullWidth
                    size="small"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    value={draft.status}
                    onChange={(event) =>
                      updateDraft({ status: event.target.value })
                    }
                    label="Status"
                    fullWidth
                    size="small"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    type="datetime-local"
                    value={draft.startsAt}
                    onChange={(event) =>
                      updateDraft({ startsAt: event.target.value })
                    }
                    label="Starts At"
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    type="datetime-local"
                    value={draft.endsAt}
                    onChange={(event) =>
                      updateDraft({ endsAt: event.target.value })
                    }
                    label="Ends At"
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ mt: 2, p: 1.5 }}>
                <Typography variant="subtitle2" color="primary.main">
                  Main Event Card Logo
                </Typography>
                <TextField
                  value={draft.serverLogoUrl || ""}
                  onChange={(event) =>
                    updateDraft({ serverLogoUrl: event.target.value })
                  }
                  placeholder="https://..."
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                />
                <Box sx={{ mt: 1.5 }}>
                  <AdminImageUpload
                    label="Card logo"
                    value={draft.serverLogoUrl || ""}
                    onChange={(url) => updateDraft({ serverLogoUrl: url })}
                    folder="/events-mgu-one/admin/card-logos"
                  />
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ mt: 2, p: 1.5 }}>
                <Typography variant="subtitle2" color="primary.main">
                  Manual Publish Controls
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mt: 1 }}
                >
                  <Switch
                    checked={Boolean(draft.manualEventPublish)}
                    onChange={(event) =>
                      updateDraft({ manualEventPublish: event.target.checked })
                    }
                  />
                  <Typography variant="body2">
                    Publish event manually (visible even if status is not
                    ACTIVE)
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Switch
                    checked={Boolean(draft.manualWinnerPublish)}
                    onChange={(event) =>
                      updateDraft({ manualWinnerPublish: event.target.checked })
                    }
                  />
                  <Typography variant="body2">
                    Publish winners manually
                  </Typography>
                </Stack>

                <TextField
                  multiline
                  rows={4}
                  value={draft.winnerAnnouncement || ""}
                  onChange={(event) =>
                    updateDraft({ winnerAnnouncement: event.target.value })
                  }
                  label="Winner Announcement"
                  placeholder="Example: Team Phoenix wins with 187 points."
                  fullWidth
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Paper>

            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                spacing={1.5}
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Typography variant="h6" color="primary.main">
                  Visual Block Builder
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {BLOCK_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      variant="outlined"
                      size="small"
                    >
                      + {type}
                    </Button>
                  ))}
                </Stack>
              </Stack>

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {draft.layout.map((block, index) => (
                  <Paper
                    key={`${block.type}-${index}`}
                    variant="outlined"
                    sx={{ p: 1.5 }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      spacing={1.5}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={`Block ${index + 1}`} size="small" />
                        <TextField
                          select
                          value={block.type}
                          onChange={(event) =>
                            updateBlockType(index, event.target.value)
                          }
                          size="small"
                          sx={{ minWidth: 180 }}
                        >
                          {BLOCK_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                      >
                        <Button
                          type="button"
                          onClick={() => moveBlock(index, -1)}
                          disabled={index === 0}
                          variant="outlined"
                          size="small"
                          startIcon={<ArrowUp size={14} />}
                        >
                          Move Up
                        </Button>
                        <Button
                          type="button"
                          onClick={() => moveBlock(index, 1)}
                          disabled={index === draft.layout.length - 1}
                          variant="outlined"
                          size="small"
                          startIcon={<ArrowDown size={14} />}
                        >
                          Move Down
                        </Button>
                        <Button
                          type="button"
                          onClick={() => removeBlock(index)}
                          color="error"
                          variant="outlined"
                          size="small"
                          startIcon={<Trash2 size={14} />}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </Stack>

                    {block.type === "HERO_EXPLOSION" ? (
                      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                        <Grid container spacing={1.25}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              label="Hero title"
                              value={block.data.title || ""}
                              onChange={(event) =>
                                patchBlockData(index, {
                                  title: event.target.value,
                                })
                              }
                              fullWidth
                              size="small"
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              label="Hero subtitle"
                              value={block.data.subtitle || ""}
                              onChange={(event) =>
                                patchBlockData(index, {
                                  subtitle: event.target.value,
                                })
                              }
                              fullWidth
                              size="small"
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              label="CTA label"
                              value={block.data.ctaLabel || ""}
                              onChange={(event) =>
                                patchBlockData(index, {
                                  ctaLabel: event.target.value,
                                })
                              }
                              fullWidth
                              size="small"
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              label="CTA href"
                              value={block.data.ctaHref || ""}
                              onChange={(event) =>
                                patchBlockData(index, {
                                  ctaHref: event.target.value,
                                })
                              }
                              fullWidth
                              size="small"
                            />
                          </Grid>
                        </Grid>

                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Hero Background Image URL
                          </Typography>
                          <TextField
                            placeholder="https://..."
                            value={block.data.imageUrl || ""}
                            onChange={(event) =>
                              patchBlockData(index, {
                                imageUrl: event.target.value,
                              })
                            }
                            fullWidth
                            size="small"
                            sx={{ mt: 1 }}
                          />
                          <Box sx={{ mt: 1.5 }}>
                            <AdminImageUpload
                              label="Hero image"
                              value={block.data.imageUrl || ""}
                              onChange={(url) =>
                                patchBlockData(index, { imageUrl: url })
                              }
                              folder="/events-mgu-one/admin/hero"
                            />
                          </Box>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Hero Logo URL
                          </Typography>
                          <TextField
                            placeholder="https://..."
                            value={block.data.logoUrl || ""}
                            onChange={(event) =>
                              patchBlockData(index, {
                                logoUrl: event.target.value,
                              })
                            }
                            fullWidth
                            size="small"
                            sx={{ mt: 1 }}
                          />
                          <Box sx={{ mt: 1.5 }}>
                            <AdminImageUpload
                              label="Hero logo"
                              value={block.data.logoUrl || ""}
                              onChange={(url) =>
                                patchBlockData(index, { logoUrl: url })
                              }
                              folder="/events-mgu-one/admin/hero-logo"
                            />
                          </Box>
                        </Paper>
                      </Stack>
                    ) : null}

                    {block.type === "TEXT_GLOW_BLOCK" ? (
                      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                        <TextField
                          label="Block heading"
                          value={block.data.heading || ""}
                          onChange={(event) =>
                            patchBlockData(index, {
                              heading: event.target.value,
                            })
                          }
                          fullWidth
                          size="small"
                        />
                        <TextField
                          multiline
                          rows={5}
                          label="Block body"
                          value={block.data.body || ""}
                          onChange={(event) =>
                            patchBlockData(index, { body: event.target.value })
                          }
                          fullWidth
                          size="small"
                        />
                      </Stack>
                    ) : null}

                    {block.type === "IMAGE_GRID" ? (
                      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                        <TextField
                          label="Grid caption"
                          value={block.data.caption || ""}
                          onChange={(event) =>
                            patchBlockData(index, {
                              caption: event.target.value,
                            })
                          }
                          fullWidth
                          size="small"
                        />

                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                          <Stack spacing={1.25}>
                            {(block.data.images || []).map(
                              (image, imageIndex) => (
                                <Paper
                                  key={`${image.url || "image"}-${imageIndex}`}
                                  variant="outlined"
                                  sx={{ p: 1.25 }}
                                >
                                  <Grid container spacing={1.25}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                      <TextField
                                        label="Image URL"
                                        value={image.url || ""}
                                        onChange={(event) =>
                                          patchGridImage(index, imageIndex, {
                                            url: event.target.value,
                                          })
                                        }
                                        fullWidth
                                        size="small"
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                      <TextField
                                        label="Image alt"
                                        value={image.alt || ""}
                                        onChange={(event) =>
                                          patchGridImage(index, imageIndex, {
                                            alt: event.target.value,
                                          })
                                        }
                                        fullWidth
                                        size="small"
                                      />
                                    </Grid>
                                  </Grid>

                                  <Box sx={{ mt: 1.5 }}>
                                    <AdminImageUpload
                                      label="Grid image"
                                      value={image.url || ""}
                                      onChange={(url) =>
                                        patchGridImage(index, imageIndex, {
                                          url,
                                        })
                                      }
                                      folder="/events-mgu-one/admin/grid"
                                    />
                                  </Box>

                                  <Button
                                    type="button"
                                    onClick={() =>
                                      removeGridImage(index, imageIndex)
                                    }
                                    color="error"
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Trash2 size={14} />}
                                    sx={{ mt: 1.25 }}
                                  >
                                    Remove Image
                                  </Button>
                                </Paper>
                              ),
                            )}

                            <Button
                              type="button"
                              onClick={() => addImageToGrid(index)}
                              variant="outlined"
                              size="small"
                              startIcon={<Plus size={14} />}
                              sx={{ alignSelf: "flex-start" }}
                            >
                              Add Grid Image
                            </Button>
                          </Stack>
                        </Paper>
                      </Stack>
                    ) : null}

                    {block.type === "REWARD_TIER" ||
                    block.type === "RULES_BLOCK" ? (
                      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                        <TextField
                          label={
                            block.type === "RULES_BLOCK"
                              ? "Rules heading"
                              : "Reward tier title"
                          }
                          value={block.data.title || ""}
                          onChange={(event) =>
                            patchBlockData(index, { title: event.target.value })
                          }
                          fullWidth
                          size="small"
                        />
                        <TextField
                          multiline
                          rows={5}
                          label={
                            block.type === "RULES_BLOCK"
                              ? "One rule per line"
                              : "One reward item per line"
                          }
                          value={
                            Array.isArray(block.data.items)
                              ? block.data.items.join("\n")
                              : ""
                          }
                          onChange={(event) =>
                            patchBlockData(index, {
                              // Keep raw lines while editing so spaces are not lost.
                              items: event.target.value.split("\n"),
                            })
                          }
                          fullWidth
                          size="small"
                        />
                      </Stack>
                    ) : null}

                    {block.type === "DYNAMIC_FORM" ? (
                      <TextField
                        select
                        label="Linked Form ID"
                        value={block.data.formId || ""}
                        onChange={(event) =>
                          patchBlockData(index, { formId: event.target.value })
                        }
                        fullWidth
                        size="small"
                        sx={{ mt: 1.5 }}
                      >
                        <MenuItem value="">Select form</MenuItem>
                        {forms.map((form) => (
                          <MenuItem key={form.id} value={form.id}>
                            {form.id} {form.title ? `- ${form.title}` : ""}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : null}
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                spacing={1.5}
                alignItems={{ xs: "flex-start", md: "center" }}
                sx={{ mb: 1 }}
              >
                <Typography variant="h6" color="primary.main">
                  Submission Viewer
                </Typography>
                <TextField
                  select
                  value={selectedFormId}
                  onChange={(event) => setSelectedFormId(event.target.value)}
                  label="Form"
                  size="small"
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">All</MenuItem>
                  {forms.map((form) => (
                    <MenuItem key={form.id} value={form.id}>
                      {form.id}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {!activeEventId ? (
                <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
                  Save or select an event to view submissions.
                </Alert>
              ) : null}

              {activeEventId && loadingSubmissions ? (
                <Skeleton
                  variant="rectangular"
                  height={96}
                  sx={{ borderRadius: 2 }}
                />
              ) : null}

              {activeEventId &&
              !loadingSubmissions &&
              visibleSubmissions.length === 0 ? (
                <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
                  No submissions yet for this selection.
                </Alert>
              ) : null}

              {activeEventId &&
              !loadingSubmissions &&
              visibleSubmissions.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Submitted At</TableCell>
                        <TableCell>Status</TableCell>
                        {(activeForm?.fields || []).map((field) => (
                          <TableCell key={field.name}>
                            {field.label || field.name}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleSubmissions.map((submission) => {
                        const values = submission.data || {};

                        return (
                          <TableRow key={submission._id}>
                            <TableCell>
                              {new Date(submission.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>{submission.status}</TableCell>
                            {(activeForm?.fields || []).map((field) => {
                              const value = values[field.name];

                              if (field.type === "image_upload" && value) {
                                return (
                                  <TableCell key={field.name}>
                                    <a
                                      href={String(value)}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      View image
                                    </a>
                                  </TableCell>
                                );
                              }

                              return (
                                <TableCell key={field.name}>
                                  {value ? String(value) : "-"}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : null}
            </Paper>

            {loadingForms ? (
              <Alert severity="info" variant="outlined">
                Loading forms list for linking...
              </Alert>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </AdminShell>
  );
};

export default EventBuilderPage;
