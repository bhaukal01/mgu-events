import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowDown, ArrowUp, Download, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api.js";
import AdminShell from "../../components/admin/AdminShell.jsx";

const FIELD_TYPES = [
  "text",
  "long_text",
  "discord",
  "mc_ign",
  "image_upload",
  "dropdown",
  "selector",
];

const FORM_PURPOSE_OPTIONS = [
  {
    value: "REGISTRATION",
    label: "Registration Form (before event)",
  },
  {
    value: "POST_EVENT_SUBMISSION",
    label: "Post-event Submission (player result/winner entry)",
  },
];

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-/g, "_");

const emptyField = () => ({
  name: `field_${Date.now()}`,
  label: "",
  type: "text",
  placeholder: "",
  required: false,
  options: [],
});

const emptyForm = () => ({
  id: `form_${Date.now()}`,
  title: "",
  description: "",
  submitLabel: "Submit",
  formPurpose: "REGISTRATION",
  fields: [emptyField()],
});

const optionsToText = (options) =>
  Array.isArray(options) ? options.join("\n") : "";

const normalizeForm = (form) => ({
  id: form.id || `form_${Date.now()}`,
  title: form.title || "",
  description: form.description || "",
  submitLabel: form.submitLabel || "Submit",
  formPurpose:
    form.formPurpose === "POST_EVENT_SUBMISSION"
      ? "POST_EVENT_SUBMISSION"
      : "REGISTRATION",
  fields: Array.isArray(form.fields)
    ? form.fields.map((field) => ({
        name: field.name || `field_${Date.now()}`,
        label: field.label || "",
        type: FIELD_TYPES.includes(field.type) ? field.type : "text",
        placeholder: field.placeholder || "",
        required: Boolean(field.required),
        options: Array.isArray(field.options) ? field.options : [],
      }))
    : [emptyField()],
});

const FormBuilderPage = () => {
  const [forms, setForms] = useState([]);
  const [activeFormId, setActiveFormId] = useState("");
  const [draft, setDraft] = useState(emptyForm());
  const [loadingForms, setLoadingForms] = useState(true);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingForm, setDeletingForm] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isEditing = useMemo(() => Boolean(activeFormId), [activeFormId]);

  const loadForms = async (preferredId = "") => {
    try {
      setLoadingForms(true);
      setError("");

      const { data } = await api.get("/admin/forms");
      const list = Array.isArray(data) ? data : [];
      setForms(list);

      const targetId = preferredId || activeFormId;
      if (!targetId) {
        return;
      }

      const found = list.find((form) => form.id === targetId);
      if (found) {
        setDraft(normalizeForm(found));
        setActiveFormId(found.id);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load forms.");
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const createNewForm = () => {
    setActiveFormId("");
    setDraft(emptyForm());
    setNotice("Creating a new standalone form.");
    setError("");
  };

  const selectForm = (form) => {
    setActiveFormId(form.id);
    setDraft(normalizeForm(form));
    setNotice("");
    setError("");
  };

  const updateDraft = (patch) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  };

  const patchField = (fieldIndex, patch) => {
    setDraft((previous) => {
      const nextFields = [...previous.fields];
      nextFields[fieldIndex] = {
        ...nextFields[fieldIndex],
        ...patch,
      };

      return {
        ...previous,
        fields: nextFields,
      };
    });
  };

  const addField = () => {
    setDraft((previous) => ({
      ...previous,
      fields: [...previous.fields, emptyField()],
    }));
  };

  const removeField = (fieldIndex) => {
    setDraft((previous) => ({
      ...previous,
      fields: previous.fields.filter((_, index) => index !== fieldIndex),
    }));
  };

  const moveField = (fieldIndex, direction) => {
    setDraft((previous) => {
      const nextIndex = fieldIndex + direction;

      if (nextIndex < 0 || nextIndex >= previous.fields.length) {
        return previous;
      }

      const nextFields = [...previous.fields];
      const [movedField] = nextFields.splice(fieldIndex, 1);
      nextFields.splice(nextIndex, 0, movedField);

      return {
        ...previous,
        fields: nextFields,
      };
    });
  };

  const buildPayload = () => ({
    id: slugify(draft.id),
    title: draft.title,
    description: draft.description,
    submitLabel: draft.submitLabel || "Submit",
    formPurpose:
      draft.formPurpose === "POST_EVENT_SUBMISSION"
        ? "POST_EVENT_SUBMISSION"
        : "REGISTRATION",
    fields: draft.fields.map((field) => ({
      name: slugify(field.name),
      label: field.label,
      type: field.type,
      placeholder: field.placeholder || "",
      required: Boolean(field.required),
      options:
        field.type === "dropdown" || field.type === "selector"
          ? Array.isArray(field.options)
            ? field.options
            : []
          : [],
    })),
  });

  const saveForm = async () => {
    const payload = buildPayload();

    if (!payload.id || !payload.title) {
      setError("Form id and title are required.");
      return;
    }

    try {
      setSavingForm(true);
      setNotice("");
      setError("");

      const request = isEditing
        ? api.put(`/admin/forms/${activeFormId}`, payload)
        : api.post("/admin/forms", payload);

      const { data } = await request;
      const normalized = normalizeForm(data);

      setDraft(normalized);
      setActiveFormId(normalized.id);
      setNotice(isEditing ? "Form updated." : "Form created.");

      await loadForms(normalized.id);
    } catch (requestError) {
      const base =
        requestError.response?.data?.message ||
        "Could not save form. Resolve validation errors and retry.";
      const details = requestError.response?.data?.errors;
      setError(Array.isArray(details) ? `${base} ${details.join(" ")}` : base);
    } finally {
      setSavingForm(false);
    }
  };

  const deleteForm = async () => {
    if (!activeFormId) {
      setError("Select a form to delete.");
      return;
    }

    const confirmDelete = window.confirm(
      `Delete form '${activeFormId}'? This will remove linked submissions and uploaded images tied to this form.`,
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingForm(true);
      setError("");
      setNotice("");

      const { data } = await api.delete(`/admin/forms/${activeFormId}`);
      const deletedSubmissionCount = Number(data?.deletedSubmissions || 0);
      const deletedImageCount = Number(data?.cleanup?.deleted || 0);

      setActiveFormId("");
      setDraft(emptyForm());
      await loadForms();

      setNotice(
        `${data?.message || "Form deleted."} Removed ${deletedSubmissionCount} submissions and ${deletedImageCount} ImageKit files.`,
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to delete form.",
      );
    } finally {
      setDeletingForm(false);
    }
  };

  const downloadCsv = async () => {
    if (!activeFormId) {
      setError("Select an existing form before downloading CSV.");
      return;
    }

    try {
      setDownloading(true);
      setError("");

      const response = await api.get(
        `/admin/forms/${activeFormId}/submissions.csv`,
        {
          responseType: "blob",
        },
      );

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `form-${activeFormId}-submissions.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setNotice("CSV export downloaded.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to download CSV export.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AdminShell
      title="Form Builder"
      subtitle="Build standalone forms and export form submissions as CSV."
      actions={
        <>
          <Button
            type="button"
            onClick={createNewForm}
            variant="outlined"
            startIcon={<Plus size={16} />}
          >
            New Form
          </Button>
          <Button
            type="button"
            onClick={saveForm}
            disabled={savingForm}
            variant="contained"
            color="primary"
          >
            {savingForm ? "Saving..." : "Save Form"}
          </Button>
          <Button
            type="button"
            onClick={deleteForm}
            disabled={!activeFormId || deletingForm || savingForm}
            color="error"
            variant="outlined"
            startIcon={<Trash2 size={16} />}
          >
            {deletingForm ? "Deleting..." : "Delete Form"}
          </Button>
          <Button
            type="button"
            onClick={downloadCsv}
            disabled={!activeFormId || downloading || deletingForm}
            color="secondary"
            variant="outlined"
            startIcon={<Download size={16} />}
          >
            {downloading ? "Downloading..." : "Download CSV"}
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
              Forms
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Open a form to edit.
            </Typography>

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {loadingForms ? (
                <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
              ) : null}

              {!loadingForms && forms.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No forms yet. Create your first form.
                </Typography>
              ) : null}

              {!loadingForms
                ? forms.map((form) => {
                    const isActive =
                      String(activeFormId || "") === String(form.id || "");

                    return (
                      <Button
                        key={form.id}
                        type="button"
                        onClick={() => selectForm(form)}
                        variant={isActive ? "contained" : "outlined"}
                        color={isActive ? "secondary" : "primary"}
                        fullWidth
                        sx={{
                          justifyContent: "flex-start",
                          textAlign: "left",
                          p: 1.5,
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2">{form.title}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {form.id}
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
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" color="primary.main">
              Form Configuration
            </Typography>

            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  value={draft.id}
                  onChange={(event) =>
                    updateDraft({ id: slugify(event.target.value) })
                  }
                  label="Form ID"
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  label="Title"
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  value={draft.description}
                  onChange={(event) =>
                    updateDraft({ description: event.target.value })
                  }
                  label="Description"
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  value={draft.submitLabel}
                  onChange={(event) =>
                    updateDraft({ submitLabel: event.target.value })
                  }
                  label="Submit Label"
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  select
                  value={draft.formPurpose || "REGISTRATION"}
                  onChange={(event) =>
                    updateDraft({ formPurpose: event.target.value })
                  }
                  label="Form Purpose"
                  fullWidth
                  size="small"
                >
                  {FORM_PURPOSE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {draft.fields.map((field, fieldIndex) => (
                <Paper key={`${field.name}-${fieldIndex}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                      <TextField
                        label="Field Name"
                        value={field.name}
                        onChange={(event) =>
                          patchField(fieldIndex, {
                            name: slugify(event.target.value),
                          })
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                      <TextField
                        label="Field Label"
                        value={field.label}
                        onChange={(event) =>
                          patchField(fieldIndex, { label: event.target.value })
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                      <TextField
                        select
                        label="Type"
                        value={field.type}
                        onChange={(event) =>
                          patchField(fieldIndex, {
                            type: event.target.value,
                            options:
                              event.target.value === "dropdown" ||
                              event.target.value === "selector"
                                ? field.options || []
                                : [],
                          })
                        }
                        fullWidth
                        size="small"
                      >
                        {FIELD_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextField
                        label="Placeholder"
                        value={field.placeholder}
                        onChange={(event) =>
                          patchField(fieldIndex, {
                            placeholder: event.target.value,
                          })
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        sx={{ height: "100%", pl: 1 }}
                      >
                        <Switch
                          checked={field.required}
                          onChange={(event) =>
                            patchField(fieldIndex, {
                              required: event.target.checked,
                            })
                          }
                        />
                        <Typography variant="body2">Required</Typography>
                      </Stack>
                    </Grid>
                  </Grid>

                  {field.type === "dropdown" || field.type === "selector" ? (
                    <TextField
                      label="Options (one per line)"
                      multiline
                      rows={4}
                      value={optionsToText(field.options)}
                      onChange={(event) =>
                        patchField(fieldIndex, {
                          // Keep raw lines while editing so spaces are not lost.
                          options: event.target.value.split("\n"),
                        })
                      }
                      fullWidth
                      size="small"
                      sx={{ mt: 1.25 }}
                    />
                  ) : null}

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                    <Button
                      type="button"
                      onClick={() => moveField(fieldIndex, -1)}
                      disabled={fieldIndex === 0}
                      variant="outlined"
                      size="small"
                      startIcon={<ArrowUp size={14} />}
                    >
                      Move Up
                    </Button>
                    <Button
                      type="button"
                      onClick={() => moveField(fieldIndex, 1)}
                      disabled={fieldIndex === draft.fields.length - 1}
                      variant="outlined"
                      size="small"
                      startIcon={<ArrowDown size={14} />}
                    >
                      Move Down
                    </Button>
                    <Button
                      type="button"
                      onClick={() => removeField(fieldIndex)}
                      color="error"
                      variant="outlined"
                      size="small"
                      startIcon={<Trash2 size={14} />}
                    >
                      Remove Field
                    </Button>
                  </Stack>
                </Paper>
              ))}

              <Button
                type="button"
                onClick={addField}
                variant="outlined"
                startIcon={<Plus size={16} />}
                sx={{ alignSelf: "flex-start" }}
              >
                Add Field
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </AdminShell>
  );
};

export default FormBuilderPage;
