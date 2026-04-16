import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../lib/api.js";
import ImageKitUpload from "./ImageKitUpload.jsx";

const discordPattern = /^(?=.{2,32}$)(?!.*\s).+$/;
const mcIgnPattern = /^[A-Za-z0-9_]{3,16}$/;
const supportedFieldTypes = new Set([
  "text",
  "long_text",
  "discord",
  "mc_ign",
  "image_upload",
  "dropdown",
  "selector",
]);
const selectableFieldTypes = new Set(["dropdown", "selector"]);

const normalizeFormFields = (form) => {
  const sourceFields = Array.isArray(form?.fields) ? form.fields : [];
  const usedNames = new Set();

  return sourceFields
    .filter((field) => field && typeof field === "object")
    .map((field) => {
      const name = String(field.name || "").trim();
      const type = supportedFieldTypes.has(field.type) ? field.type : "text";
      const label = String(field.label || name || "Field").trim();

      if (!name || usedNames.has(name)) {
        return null;
      }

      usedNames.add(name);

      const normalizedField = {
        name,
        label: label || name,
        type,
        placeholder: String(field.placeholder || "").trim(),
        required: Boolean(field.required),
      };

      if (selectableFieldTypes.has(type)) {
        normalizedField.options = Array.isArray(field.options)
          ? field.options.map((option) => String(option).trim()).filter(Boolean)
          : [];
      }

      return normalizedField;
    })
    .filter(Boolean);
};

const buildDefaultValues = (fields) => {
  const values = {};

  for (const field of fields) {
    values[field.name] = "";
  }

  values.__website = "";

  return values;
};

const buildValidationSchema = (fields) => {
  const shape = {
    __website: z.string().max(0).optional().default(""),
  };

  for (const field of fields) {
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

    if (!field.required) {
      schema = schema.optional().or(z.literal(""));
    } else {
      schema = schema.refine(
        (value) => String(value ?? "").trim().length > 0,
        `${field.label} is required.`,
      );
    }

    if (selectableFieldTypes.has(field.type)) {
      schema = schema.refine((value) => {
        const normalizedValue = String(value || "").trim();
        return !normalizedValue || fieldOptions.includes(normalizedValue);
      }, `${field.label} must be one of the available options.`);
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
  const normalizedFormId = useMemo(
    () =>
      String(form?.id || "")
        .trim()
        .toLowerCase(),
    [form],
  );
  const normalizedFields = useMemo(() => normalizeFormFields(form), [form]);
  const defaultValues = useMemo(
    () => buildDefaultValues(normalizedFields),
    [normalizedFields],
  );
  const validationSchema = useMemo(
    () => buildValidationSchema(normalizedFields),
    [normalizedFields],
  );

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

      if (!normalizedFormId) {
        setSubmitError("This form is misconfigured. Please contact an admin.");
        return;
      }

      if (values.__website) {
        setSubmitError("Submission blocked.");
        return;
      }

      const { __website, ...payloadValues } = values;

      await api.post(`/submissions/${eventSlug}`, {
        formId: normalizedFormId,
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
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" color="primary.main">
        {form?.title || "Registration Form"}
      </Typography>
      {form?.description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {form.description}
        </Typography>
      ) : null}

      <Typography
        variant="overline"
        color="secondary.main"
        sx={{ mt: 1, display: "block", letterSpacing: 1.2 }}
      >
        {getFormPurposeLeadText(form)}
      </Typography>

      <Stack
        component="form"
        spacing={2}
        sx={{ mt: 3 }}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ display: "none" }}
          {...register("__website")}
        />

        {normalizedFields.map((field) => {
          const fieldError = errors[field.name]?.message;
          const fieldOptions = Array.isArray(field.options)
            ? field.options
                .map((option) => String(option).trim())
                .filter(Boolean)
            : [];

          if (field.type === "long_text") {
            return (
              <TextField
                key={field.name}
                label={field.label}
                placeholder={field.placeholder || "Enter your response"}
                multiline
                rows={4}
                fullWidth
                {...register(field.name)}
                error={Boolean(fieldError)}
                helperText={fieldError ? String(fieldError) : " "}
              />
            );
          }

          if (field.type === "image_upload") {
            const imageValue = watch(field.name);

            return (
              <Box key={field.name}>
                <Typography
                  variant="subtitle2"
                  color="text.primary"
                  sx={{ mb: 1 }}
                >
                  {field.label}
                </Typography>
                <input type="hidden" {...register(field.name)} />
                <ImageKitUpload
                  label={field.label}
                  eventSlug={eventSlug}
                  formId={normalizedFormId}
                  folder={`/events-mgu-one/${eventSlug}/${normalizedFormId}`}
                  value={imageValue}
                  onChange={(url) =>
                    setValue(field.name, url, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                {fieldError ? (
                  <Typography
                    variant="caption"
                    color="error.main"
                    sx={{ mt: 0.5, display: "block" }}
                  >
                    {fieldError}
                  </Typography>
                ) : null}
              </Box>
            );
          }

          if (field.type === "dropdown") {
            return (
              <TextField
                key={field.name}
                select
                label={field.label}
                fullWidth
                defaultValue=""
                {...register(field.name)}
                error={Boolean(fieldError)}
                helperText={fieldError ? String(fieldError) : " "}
              >
                <MenuItem value="">Select an option</MenuItem>
                {fieldOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            );
          }

          if (field.type === "selector") {
            const selectedValue = watch(field.name);

            return (
              <Box key={field.name}>
                <Typography
                  variant="subtitle2"
                  color="text.primary"
                  sx={{ mb: 1 }}
                >
                  {field.label}
                </Typography>
                <input type="hidden" {...register(field.name)} />
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {fieldOptions.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      onClick={() =>
                        setValue(field.name, option, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      color={selectedValue === option ? "secondary" : "default"}
                      variant={selectedValue === option ? "filled" : "outlined"}
                      clickable
                      sx={{ borderRadius: 1 }}
                    />
                  ))}
                </Stack>
                {fieldError ? (
                  <Typography
                    variant="caption"
                    color="error.main"
                    sx={{ mt: 0.5, display: "block" }}
                  >
                    {fieldError}
                  </Typography>
                ) : null}
              </Box>
            );
          }

          return (
            <TextField
              key={field.name}
              type="text"
              label={field.label}
              placeholder={field.placeholder || "Enter value"}
              fullWidth
              {...register(field.name)}
              error={Boolean(fieldError)}
              helperText={fieldError ? String(fieldError) : " "}
            />
          );
        })}

        {submitError ? (
          <Alert severity="error" variant="outlined">
            {submitError}
          </Alert>
        ) : null}

        {submitSuccess ? (
          <Alert severity="success" variant="outlined">
            {submitSuccess}
          </Alert>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          variant="contained"
          color="primary"
          sx={{ alignSelf: "flex-start" }}
        >
          {isSubmitting ? "Submitting..." : form?.submitLabel || "Submit"}
        </Button>
      </Stack>
    </Paper>
  );
};

export default FormEngine;
