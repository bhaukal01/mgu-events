import { useEffect, useMemo, useState } from "react";
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
          <button
            type="button"
            onClick={createNewEvent}
            className="rounded-lg border border-emerald-400/20 bg-slate-900/70 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            New Event
          </button>
          <button
            type="button"
            onClick={saveEvent}
            disabled={saving}
            className="btn-prism rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Event"}
          </button>
          <button
            type="button"
            onClick={markEventPublished}
            className="rounded-lg border border-cyan-300/45 bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-100"
          >
            Publish Event
          </button>
          <button
            type="button"
            onClick={markWinnerPublished}
            className="rounded-lg border border-amber-300/45 bg-amber-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-100"
          >
            Publish Winner
          </button>
          <button
            type="button"
            onClick={deleteEvent}
            disabled={!activeEventId || deletingEvent || saving}
            className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 disabled:opacity-55"
          >
            {deletingEvent ? "Deleting..." : "Delete Event"}
          </button>
        </>
      }
    >
      {notice ? (
        <p className="mb-4 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/45 bg-red-500/12 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-emerald-400/20 bg-panel/80 p-4">
          <h2 className="text-lg font-black uppercase text-ink">
            Server Events
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Select an event to edit.
          </p>

          <div className="mt-4 space-y-2">
            {loadingEvents ? (
              <div className="h-24 animate-pulse rounded-xl border border-emerald-400/20 bg-slate-900/50" />
            ) : null}

            {!loadingEvents && events.length === 0 ? (
              <p className="rounded-xl border border-emerald-400/15 bg-slate-900/45 px-3 py-2 text-xs text-slate-400">
                No events yet. Create your first event.
              </p>
            ) : null}

            {!loadingEvents
              ? events.map((event) => {
                  const isActive =
                    String(activeEventId || "") === String(event._id || "");

                  return (
                    <button
                      key={event._id}
                      type="button"
                      onClick={() => selectEvent(event)}
                      className={`interactive-chip w-full rounded-xl border px-3 py-2 text-left ${
                        isActive
                          ? "is-active border-amber-300/70 bg-amber-500/15"
                          : "border-emerald-400/20 bg-slate-900/45"
                      }`}
                    >
                      <p
                        className={`text-xs uppercase tracking-wider ${
                          isActive ? "text-amber-100" : "text-slate-400"
                        }`}
                      >
                        {event.status}
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink">
                        {event.title}
                      </p>
                      <p
                        className={`mt-1 truncate text-xs ${
                          isActive ? "text-amber-100/85" : "text-slate-400"
                        }`}
                      >
                        /{event.slug}
                      </p>
                    </button>
                  );
                })
              : null}
          </div>
        </aside>

        <section className="space-y-6">
          <article className="rounded-2xl border border-emerald-400/20 bg-panel/80 p-4 sm:p-5">
            <h2 className="text-lg font-black uppercase text-ink">
              Event Settings
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Title
                </span>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    updateDraft({ title: event.target.value })
                  }
                  onBlur={() => {
                    if (!draft.slug.trim()) {
                      updateDraft({ slug: slugify(draft.title) });
                    }
                  }}
                  className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Slug
                </span>
                <input
                  value={draft.slug}
                  onChange={(event) =>
                    updateDraft({ slug: slugify(event.target.value) })
                  }
                  className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Status
                </span>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    updateDraft({ status: event.target.value })
                  }
                  className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Starts At
                </span>
                <input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(event) =>
                    updateDraft({ startsAt: event.target.value })
                  }
                  className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Ends At
                </span>
                <input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(event) =>
                    updateDraft({ endsAt: event.target.value })
                  }
                  className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-400/15 bg-slate-900/45 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Main Event Card Logo
              </p>
              <input
                value={draft.serverLogoUrl || ""}
                onChange={(event) =>
                  updateDraft({ serverLogoUrl: event.target.value })
                }
                placeholder="https://..."
                className="mt-2 w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-xs text-slate-100"
              />
              <div className="mt-2">
                <AdminImageUpload
                  label="Card logo"
                  value={draft.serverLogoUrl || ""}
                  onChange={(url) => updateDraft({ serverLogoUrl: url })}
                  folder="/events-mgu-one/admin/card-logos"
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-cyan-300/20 bg-slate-900/45 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100">
                Manual Publish Controls
              </p>

              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(draft.manualEventPublish)}
                  onChange={(event) =>
                    updateDraft({ manualEventPublish: event.target.checked })
                  }
                />
                Publish event manually (visible even if status is not ACTIVE)
              </label>

              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(draft.manualWinnerPublish)}
                  onChange={(event) =>
                    updateDraft({ manualWinnerPublish: event.target.checked })
                  }
                />
                Publish winners manually
              </label>

              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">
                  Winner Announcement
                </span>
                <textarea
                  rows={4}
                  value={draft.winnerAnnouncement || ""}
                  onChange={(event) =>
                    updateDraft({ winnerAnnouncement: event.target.value })
                  }
                  placeholder="Example: Team Phoenix wins with 187 points."
                  className="w-full rounded border border-cyan-300/20 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                />
              </label>
            </div>
          </article>

          <article className="rounded-2xl border border-emerald-400/20 bg-panel/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black uppercase text-ink">
                Visual Block Builder
              </h2>
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="rounded-lg border border-emerald-400/20 bg-slate-900/60 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300"
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {draft.layout.map((block, index) => (
                <div
                  key={`${block.type}-${index}`}
                  className="rounded-xl border border-emerald-400/20 bg-slate-950/55 p-3"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                        Block {index + 1}
                      </span>
                      <select
                        value={block.type}
                        onChange={(event) =>
                          updateBlockType(index, event.target.value)
                        }
                        className="rounded border border-emerald-400/20 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                      >
                        {BLOCK_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeBlock(index)}
                      className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-200"
                    >
                      Remove
                    </button>
                  </div>

                  {block.type === "HERO_EXPLOSION" ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          placeholder="Hero title"
                          value={block.data.title || ""}
                          onChange={(event) =>
                            patchBlockData(index, { title: event.target.value })
                          }
                          className="rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        />
                        <input
                          placeholder="Hero subtitle"
                          value={block.data.subtitle || ""}
                          onChange={(event) =>
                            patchBlockData(index, {
                              subtitle: event.target.value,
                            })
                          }
                          className="rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        />
                        <input
                          placeholder="CTA label"
                          value={block.data.ctaLabel || ""}
                          onChange={(event) =>
                            patchBlockData(index, {
                              ctaLabel: event.target.value,
                            })
                          }
                          className="rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        />
                        <input
                          placeholder="CTA href"
                          value={block.data.ctaHref || ""}
                          onChange={(event) =>
                            patchBlockData(index, {
                              ctaHref: event.target.value,
                            })
                          }
                          className="rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        />
                      </div>

                      <div className="rounded border border-emerald-400/15 bg-slate-900/60 p-3">
                        <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">
                          Hero Background Image URL
                        </label>
                        <input
                          placeholder="https://..."
                          value={block.data.imageUrl || ""}
                          onChange={(event) =>
                            patchBlockData(index, {
                              imageUrl: event.target.value,
                            })
                          }
                          className="w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                        />
                        <div className="mt-2">
                          <AdminImageUpload
                            label="Hero image"
                            value={block.data.imageUrl || ""}
                            onChange={(url) =>
                              patchBlockData(index, { imageUrl: url })
                            }
                            folder="/events-mgu-one/admin/hero"
                          />
                        </div>
                      </div>

                      <div className="rounded border border-emerald-400/15 bg-slate-900/60 p-3">
                        <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">
                          Hero Logo URL
                        </label>
                        <input
                          placeholder="https://..."
                          value={block.data.logoUrl || ""}
                          onChange={(event) =>
                            patchBlockData(index, {
                              logoUrl: event.target.value,
                            })
                          }
                          className="w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                        />
                        <div className="mt-2">
                          <AdminImageUpload
                            label="Hero logo"
                            value={block.data.logoUrl || ""}
                            onChange={(url) =>
                              patchBlockData(index, { logoUrl: url })
                            }
                            folder="/events-mgu-one/admin/hero-logo"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {block.type === "TEXT_GLOW_BLOCK" ? (
                    <div className="space-y-2">
                      <input
                        placeholder="Block heading"
                        value={block.data.heading || ""}
                        onChange={(event) =>
                          patchBlockData(index, { heading: event.target.value })
                        }
                        className="w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      />
                      <textarea
                        rows={5}
                        placeholder="Block body"
                        value={block.data.body || ""}
                        onChange={(event) =>
                          patchBlockData(index, { body: event.target.value })
                        }
                        className="w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                  ) : null}

                  {block.type === "IMAGE_GRID" ? (
                    <div className="space-y-2">
                      <input
                        placeholder="Grid caption"
                        value={block.data.caption || ""}
                        onChange={(event) =>
                          patchBlockData(index, { caption: event.target.value })
                        }
                        className="w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      />

                      <div className="space-y-2 rounded border border-emerald-400/15 bg-slate-900/60 p-3">
                        {(block.data.images || []).map((image, imageIndex) => (
                          <div
                            key={`${image.url || "image"}-${imageIndex}`}
                            className="rounded border border-emerald-400/15 bg-slate-900/70 p-2"
                          >
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                placeholder="Image URL"
                                value={image.url || ""}
                                onChange={(event) =>
                                  patchGridImage(index, imageIndex, {
                                    url: event.target.value,
                                  })
                                }
                                className="rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                              />
                              <input
                                placeholder="Image alt"
                                value={image.alt || ""}
                                onChange={(event) =>
                                  patchGridImage(index, imageIndex, {
                                    alt: event.target.value,
                                  })
                                }
                                className="rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                              />
                            </div>

                            <div className="mt-2">
                              <AdminImageUpload
                                label="Grid image"
                                value={image.url || ""}
                                onChange={(url) =>
                                  patchGridImage(index, imageIndex, { url })
                                }
                                folder="/events-mgu-one/admin/grid"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeGridImage(index, imageIndex)}
                              className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-200"
                            >
                              Remove Image
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addImageToGrid(index)}
                          className="rounded border border-emerald-400/20 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300"
                        >
                          + Add Grid Image
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {block.type === "REWARD_TIER" ||
                  block.type === "RULES_BLOCK" ? (
                    <div className="space-y-2">
                      <input
                        placeholder={
                          block.type === "RULES_BLOCK"
                            ? "Rules heading"
                            : "Reward tier title"
                        }
                        value={block.data.title || ""}
                        onChange={(event) =>
                          patchBlockData(index, { title: event.target.value })
                        }
                        className="w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      />
                      <textarea
                        rows={5}
                        placeholder={
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
                        className="w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                  ) : null}

                  {block.type === "DYNAMIC_FORM" ? (
                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                        Linked Form ID
                      </span>
                      <select
                        value={block.data.formId || ""}
                        onChange={(event) =>
                          patchBlockData(index, { formId: event.target.value })
                        }
                        className="w-full rounded border border-emerald-400/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="">Select form</option>
                        {forms.map((form) => (
                          <option key={form.id} value={form.id}>
                            {form.id} {form.title ? `- ${form.title}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-emerald-400/20 bg-panel/80 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black uppercase text-ink">
                Submission Viewer
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Form
                </label>
                <select
                  value={selectedFormId}
                  onChange={(event) => setSelectedFormId(event.target.value)}
                  className="rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="">All</option>
                  {forms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!activeEventId ? (
              <p className="rounded-xl border border-emerald-400/20 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
                Save or select an event to view submissions.
              </p>
            ) : null}

            {activeEventId && loadingSubmissions ? (
              <div className="h-24 animate-pulse rounded-xl border border-emerald-400/20 bg-slate-900/50" />
            ) : null}

            {activeEventId &&
            !loadingSubmissions &&
            visibleSubmissions.length === 0 ? (
              <p className="rounded-xl border border-emerald-400/20 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
                No submissions yet for this selection.
              </p>
            ) : null}

            {activeEventId &&
            !loadingSubmissions &&
            visibleSubmissions.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-emerald-400/20">
                <table className="min-w-full divide-y divide-emerald-400/15 text-left text-xs text-slate-200">
                  <thead className="bg-slate-900/80">
                    <tr>
                      <th className="px-3 py-2 font-semibold uppercase tracking-wider text-slate-400">
                        Submitted At
                      </th>
                      <th className="px-3 py-2 font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </th>
                      {(activeForm?.fields || []).map((field) => (
                        <th
                          key={field.name}
                          className="px-3 py-2 font-semibold uppercase tracking-wider text-slate-400"
                        >
                          {field.label || field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-400/15 bg-slate-950/40">
                    {visibleSubmissions.map((submission) => {
                      const values = submission.data || {};

                      return (
                        <tr key={submission._id}>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                            {new Date(submission.createdAt).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                            {submission.status}
                          </td>
                          {(activeForm?.fields || []).map((field) => {
                            const value = values[field.name];

                            if (field.type === "image_upload" && value) {
                              return (
                                <td key={field.name} className="px-3 py-2">
                                  <a
                                    href={String(value)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-300 underline decoration-cyan-400/40 underline-offset-2"
                                  >
                                    View image
                                  </a>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={field.name}
                                className="px-3 py-2 text-slate-300"
                              >
                                {value ? String(value) : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>

          {loadingForms ? (
            <p className="rounded-xl border border-emerald-400/20 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
              Loading forms list for linking...
            </p>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
};

export default EventBuilderPage;
