import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.js";
import ImageKitUpload from "./ImageKitUpload.jsx";

const discordPattern = /^(?=.{2,32}$)(?!.*\s).+$/;
const mcIgnPattern = /^[A-Za-z0-9_]{3,16}$/;

const buildDefaultValues = (form) => {
  const values = {};

  for (const field of form.fields || []) {
    values[field.name] = "";
  }

  values.__website = "";

  return values;
};

const buildValidationSchema = (form) => {
  const shape = {
    __website: z.string().max(0).optional().default(""),
  };

  for (const field of form.fields || []) {
    let schema = z.string();
    const fieldOptions = Array.isArray(field.options)
      ? field.options.map((option) => String(option).trim()).filter(Boolean)
      : [];

    if (field.type === "discord") {
      schema = schema.regex(
        discordPattern,
        `${field.label} must be a valid Discord handle.`,
      );
    }

    if (field.type === "mc_ign") {
      schema = schema.regex(
        mcIgnPattern,
        `${field.label} must be a valid Minecraft IGN.`,
      );
    }

    if (field.type === "image_upload") {
      schema = schema.url(`${field.label} must be a valid uploaded URL.`);
    }

    if (field.type === "dropdown" || field.type === "selector") {
      schema = schema.refine(
        (value) => !value || fieldOptions.includes(value),
        `${field.label} must be one of the available options.`,
      );
    }

    if (!field.required) {
      schema = schema.optional().or(z.literal(""));
    } else {
      schema = schema.min(1, `${field.label} is required.`);
    }

    shape[field.name] = schema;
  }

  return z.object(shape);
};

const getFormPurposeLeadText = (form) => {
  if (form?.formPurpose === "POST_EVENT_SUBMISSION") {
    return "Submit your end-of-event results for winner review.";
  }

  return "Register your Minecraft profile to secure a tournament slot.";
};

const FormEngine = ({ eventSlug, form }) => {
  const defaultValues = useMemo(() => buildDefaultValues(form), [form]);
  const validationSchema = useMemo(() => buildValidationSchema(form), [form]);

  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues,
    resolver: zodResolver(validationSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit = async (values) => {
    try {
      setSubmitError("");
      setSubmitSuccess("");

      if (values.__website) {
        setSubmitError("Submission blocked.");
        return;
      }

      const { __website, ...payloadValues } = values;

      await api.post(`/submissions/${eventSlug}`, {
        formId: form.id,
        values: payloadValues,
      });

      setSubmitSuccess("Submission received successfully.");
      reset(defaultValues);
    } catch (requestError) {
      const baseMessage =
        requestError.response?.data?.message ||
        "Submission failed. Please try again.";
      const details = requestError.response?.data?.errors;

      if (Array.isArray(details) && details.length > 0) {
        setSubmitError(`${baseMessage} ${details.join(" ")}`);
        return;
      }

      setSubmitError(baseMessage);
    }
  };

  return (
    <section className="panel-voxel rounded-2xl border border-emerald-400/25 bg-panel/85 p-5 shadow-neon-cube sm:p-6">
      <h3 className="text-rune-gradient text-2xl font-black uppercase">
        {form.title}
      </h3>
      {form.description ? (
        <p className="mt-1 text-sm text-slate-300">{form.description}</p>
      ) : null}

      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-emerald-200/90">
        {getFormPurposeLeadText(form)}
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <input
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          {...register("__website")}
        />

        {(form.fields || []).map((field) => {
          const fieldError = errors[field.name]?.message;
          const fieldOptions = Array.isArray(field.options)
            ? field.options
                .map((option) => String(option).trim())
                .filter(Boolean)
            : [];

          if (field.type === "long_text") {
            return (
              <label key={field.name} className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-200">
                  {field.label}
                </span>
                <textarea
                  rows={4}
                  placeholder={field.placeholder || "Enter your response"}
                  className="w-full rounded-xl border border-emerald-400/20 bg-slate-900/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                  {...register(field.name)}
                />
                {fieldError ? (
                  <span className="mt-1 block text-xs text-red-300">
                    {fieldError}
                  </span>
                ) : null}
              </label>
            );
          }

          if (field.type === "image_upload") {
            const imageValue = watch(field.name);

            return (
              <div key={field.name}>
                <label className="mb-1 block text-sm font-semibold text-slate-200">
                  {field.label}
                </label>
                <input type="hidden" {...register(field.name)} />
                <ImageKitUpload
                  label={field.label}
                  eventSlug={eventSlug}
                  formId={form.id}
                  folder={`/events-mgu-one/${eventSlug}/${form.id}`}
                  value={imageValue}
                  onChange={(url) =>
                    setValue(field.name, url, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                {fieldError ? (
                  <span className="mt-1 block text-xs text-red-300">
                    {fieldError}
                  </span>
                ) : null}
              </div>
            );
          }

          if (field.type === "dropdown") {
            return (
              <label key={field.name} className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-200">
                  {field.label}
                </span>
                <select
                  className="w-full rounded-xl border border-emerald-400/20 bg-slate-900/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                  {...register(field.name)}
                >
                  <option value="">Select an option</option>
                  {fieldOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldError ? (
                  <span className="mt-1 block text-xs text-red-300">
                    {fieldError}
                  </span>
                ) : null}
              </label>
            );
          }

          if (field.type === "selector") {
            const selectedValue = watch(field.name);

            return (
              <div key={field.name}>
                <span className="mb-1 block text-sm font-semibold text-slate-200">
                  {field.label}
                </span>
                <input type="hidden" {...register(field.name)} />
                <div className="flex flex-wrap gap-2">
                  {fieldOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setValue(field.name, option, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      className={`interactive-chip rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                        selectedValue === option
                          ? "is-active border-amber-300/70 bg-amber-500/20 text-amber-100"
                          : "border-emerald-400/20 bg-slate-900/65 text-slate-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {fieldError ? (
                  <span className="mt-1 block text-xs text-red-300">
                    {fieldError}
                  </span>
                ) : null}
              </div>
            );
          }

          return (
            <label key={field.name} className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-200">
                {field.label}
              </span>
              <input
                type="text"
                placeholder={field.placeholder || "Enter value"}
                className="w-full rounded-xl border border-emerald-400/20 bg-slate-900/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30"
                {...register(field.name)}
              />
              {fieldError ? (
                <span className="mt-1 block text-xs text-red-300">
                  {fieldError}
                </span>
              ) : null}
            </label>
          );
        })}

        {submitError ? (
          <p className="rounded-lg border border-red-500/45 bg-red-500/12 px-3 py-2 text-xs text-red-100">
            {submitError}
          </p>
        ) : null}

        {submitSuccess ? (
          <p className="rounded-lg border border-emerald-400/45 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {submitSuccess}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-prism inline-flex rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : form.submitLabel || "Submit"}
        </button>
      </form>
    </section>
  );
};

export default FormEngine;
