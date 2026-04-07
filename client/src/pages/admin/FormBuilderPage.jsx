import { useEffect, useMemo, useState } from "react";
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
          <button
            type="button"
            onClick={createNewForm}
            className="rounded-lg border border-emerald-400/20 bg-slate-900/70 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            New Form
          </button>
          <button
            type="button"
            onClick={saveForm}
            disabled={savingForm}
            className="btn-prism rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingForm ? "Saving..." : "Save Form"}
          </button>
          <button
            type="button"
            onClick={deleteForm}
            disabled={!activeFormId || deletingForm || savingForm}
            className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 disabled:opacity-55"
          >
            {deletingForm ? "Deleting..." : "Delete Form"}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!activeFormId || downloading || deletingForm}
            className="rounded-lg border border-amber-300/45 bg-amber-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-100 disabled:opacity-60"
          >
            {downloading ? "Downloading..." : "Download CSV"}
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
          <h2 className="text-lg font-black uppercase text-ink">Forms</h2>
          <p className="mt-1 text-xs text-slate-400">Open a form to edit.</p>

          <div className="mt-4 space-y-2">
            {loadingForms ? (
              <div className="h-24 animate-pulse rounded-xl border border-emerald-400/20 bg-slate-900/50" />
            ) : null}

            {!loadingForms && forms.length === 0 ? (
              <p className="rounded-xl border border-emerald-400/15 bg-slate-900/45 px-3 py-2 text-xs text-slate-400">
                No forms yet. Create your first form.
              </p>
            ) : null}

            {!loadingForms
              ? forms.map((form) => {
                  const isActive =
                    String(activeFormId || "") === String(form.id || "");

                  return (
                    <button
                      key={form.id}
                      type="button"
                      onClick={() => selectForm(form)}
                      className={`interactive-chip w-full rounded-xl border px-3 py-2 text-left ${
                        isActive
                          ? "is-active border-amber-300/70 bg-amber-500/15"
                          : "border-emerald-400/20 bg-slate-900/45"
                      }`}
                    >
                      <p className="text-sm font-bold text-ink">{form.title}</p>
                      <p
                        className={`mt-1 truncate text-xs ${
                          isActive ? "text-amber-100/85" : "text-slate-400"
                        }`}
                      >
                        {form.id}
                      </p>
                    </button>
                  );
                })
              : null}
          </div>
        </aside>

        <section className="rounded-2xl border border-emerald-400/20 bg-panel/80 p-4 sm:p-5">
          <h2 className="text-lg font-black uppercase text-ink">
            Form Configuration
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Form ID
              </span>
              <input
                value={draft.id}
                onChange={(event) =>
                  updateDraft({ id: slugify(event.target.value) })
                }
                className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Title
              </span>
              <input
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Description
              </span>
              <input
                value={draft.description}
                onChange={(event) =>
                  updateDraft({ description: event.target.value })
                }
                className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Submit Label
              </span>
              <input
                value={draft.submitLabel}
                onChange={(event) =>
                  updateDraft({ submitLabel: event.target.value })
                }
                className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Form Purpose
              </span>
              <select
                value={draft.formPurpose || "REGISTRATION"}
                onChange={(event) =>
                  updateDraft({ formPurpose: event.target.value })
                }
                className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/65 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300"
              >
                {FORM_PURPOSE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {draft.fields.map((field, fieldIndex) => (
              <div
                key={`${field.name}-${fieldIndex}`}
                className="rounded-xl border border-emerald-400/20 bg-slate-950/55 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <input
                    placeholder="field_name"
                    value={field.name}
                    onChange={(event) =>
                      patchField(fieldIndex, {
                        name: slugify(event.target.value),
                      })
                    }
                    className="rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                  />
                  <input
                    placeholder="Field label"
                    value={field.label}
                    onChange={(event) =>
                      patchField(fieldIndex, { label: event.target.value })
                    }
                    className="rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                  />
                  <select
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
                    className="rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Placeholder"
                    value={field.placeholder}
                    onChange={(event) =>
                      patchField(fieldIndex, {
                        placeholder: event.target.value,
                      })
                    }
                    className="rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 sm:col-span-2"
                  />
                  <label className="inline-flex items-center gap-2 rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        patchField(fieldIndex, {
                          required: event.target.checked,
                        })
                      }
                    />
                    Required
                  </label>
                </div>

                {field.type === "dropdown" || field.type === "selector" ? (
                  <div className="mt-2">
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">
                      Options (one per line)
                    </label>
                    <textarea
                      rows={4}
                      value={optionsToText(field.options)}
                      onChange={(event) =>
                        patchField(fieldIndex, {
                          // Keep raw lines while editing so spaces are not lost.
                          options: event.target.value.split("\n"),
                        })
                      }
                      className="w-full rounded border border-emerald-400/20 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => removeField(fieldIndex)}
                  className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-200"
                >
                  Remove Field
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addField}
              className="rounded border border-emerald-400/20 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300"
            >
              + Add Field
            </button>
          </div>
        </section>
      </div>
    </AdminShell>
  );
};

export default FormBuilderPage;
