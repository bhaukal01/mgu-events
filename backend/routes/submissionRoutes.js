import express from "express";
import rateLimit from "express-rate-limit";
import Event from "../models/Event.js";
import Form from "../models/Form.js";
import Submission from "../models/Submission.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const isProduction = process.env.NODE_ENV === "production";
const isDiscordHandle = (value) => /^(?=.{2,32}$)(?!.*\s).+$/.test(value);
const isMinecraftIgn = (value) => /^[A-Za-z0-9_]{3,16}$/.test(value);
const isUrl = (value) => /^https?:\/\/.+/i.test(value);

const MAX_SHORT_TEXT = 320;
const MAX_LONG_TEXT = 8000;
const MAX_VALUES_PER_SUBMISSION = 150;
const selectableFieldTypes = new Set(["dropdown", "selector"]);

const submissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 80 : 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many submissions. Please retry later." },
});

const isPlainObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

const extractLinkedFormIds = (layout = []) =>
    [
        ...new Set(
            (layout || [])
                .filter((block) => block?.type === "DYNAMIC_FORM")
                .map((block) => String(block?.data?.formId || "").toLowerCase().trim())
                .filter(Boolean),
        ),
    ];

const sanitizeFormField = (field) => {
    if (!field || typeof field !== "object") {
        return null;
    }

    const name = String(field.name || "").trim();
    const label = String(field.label || "").trim();
    const type = String(field.type || "").trim();

    if (!name || !label || !type) {
        return null;
    }

    const normalizedField = {
        name,
        label,
        type,
        placeholder: String(field.placeholder || "").trim(),
        required: Boolean(field.required),
    };

    if (selectableFieldTypes.has(type)) {
        normalizedField.options = Array.isArray(field.options)
            ? field.options.map((option) => String(option || "").trim()).filter(Boolean)
            : [];
    }

    return normalizedField;
};

const sanitizeForm = (form) => {
    if (!form || typeof form !== "object") {
        return null;
    }

    const id = String(form.id || "").toLowerCase().trim();

    if (!id) {
        return null;
    }

    return {
        id,
        title: String(form.title || "").trim(),
        description: String(form.description || "").trim(),
        submitLabel: String(form.submitLabel || "Submit").trim() || "Submit",
        formPurpose: String(form.formPurpose || "REGISTRATION").trim() || "REGISTRATION",
        fields: Array.isArray(form.fields)
            ? form.fields.map(sanitizeFormField).filter(Boolean)
            : [],
    };
};

const getTrustedImagekitEndpoint = () =>
    String(process.env.IMAGEKIT_URL_ENDPOINT || "")
        .trim()
        .replace(/\/+$/, "");

const isTrustedImageUploadUrl = (value) => {
    if (!isUrl(value)) {
        return false;
    }

    const endpoint = getTrustedImagekitEndpoint();

    if (!endpoint) {
        return true;
    }

    return String(value).startsWith(`${endpoint}/`);
};

const validateFieldByType = (field, value) => {
    if (field.type === "text") {
        return typeof value === "string"
            ? { ok: true, normalized: normalizeText(value, MAX_SHORT_TEXT) }
            : { ok: false, message: `${field.label} must be text.` };
    }

    if (field.type === "long_text") {
        return typeof value === "string"
            ? { ok: true, normalized: normalizeText(value, MAX_LONG_TEXT) }
            : { ok: false, message: `${field.label} must be text.` };
    }

    if (field.type === "discord") {
        return typeof value === "string" && isDiscordHandle(value)
            ? { ok: true, normalized: normalizeText(value, 64) }
            : { ok: false, message: `${field.label} must be a valid Discord handle.` };
    }

    if (field.type === "mc_ign") {
        return typeof value === "string" && isMinecraftIgn(value)
            ? { ok: true, normalized: normalizeText(value, 16) }
            : { ok: false, message: `${field.label} must be a valid Minecraft IGN.` };
    }

    if (field.type === "image_upload") {
        return typeof value === "string" && isTrustedImageUploadUrl(value)
            ? { ok: true, normalized: normalizeText(value, 1024) }
            : {
                ok: false,
                message: `${field.label} must be a trusted ImageKit upload URL.`,
            };
    }

    if (field.type === "dropdown" || field.type === "selector") {
        const allowedOptions = Array.isArray(field.options)
            ? field.options.map((option) => String(option).trim())
            : [];
        const normalizedValue = String(value || "").trim();

        if (!allowedOptions.includes(normalizedValue)) {
            return {
                ok: false,
                message: `${field.label} must be one of the configured options.`,
            };
        }

        return { ok: true, normalized: normalizeText(normalizedValue, MAX_SHORT_TEXT) };
    }

    return { ok: false, message: `${field.label} has unsupported type.` };
};

router.get("/admin/:eventId", requireAuth, async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.eventId)
            .select("title slug layout forms")
            .lean();

        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }

        const linkedFormIds = extractLinkedFormIds(event.layout || []);
        const standaloneForms =
            linkedFormIds.length > 0
                ? await Form.find({ id: { $in: linkedFormIds } }).lean()
                : [];
        const sourceForms =
            standaloneForms.length > 0
                ? standaloneForms
                : Array.isArray(event.forms)
                    ? event.forms
                    : [];
        const forms = sourceForms.map(sanitizeForm).filter(Boolean);

        const submissions = await Submission.find({ eventId: event._id })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            event: {
                ...event,
                forms,
            },
            submissions,
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/:eventSlug", submissionLimiter, async (req, res, next) => {
    try {
        const eventSlug = String(req.params.eventSlug || "").toLowerCase().trim();
        const formId = String(req.body?.formId || "").toLowerCase().trim();
        const values = req.body?.values || {};

        if (!formId) {
            return res.status(400).json({ message: "formId is required." });
        }

        if (!isPlainObject(values)) {
            return res.status(400).json({ message: "Submission values must be an object." });
        }

        if (Object.keys(values).length > MAX_VALUES_PER_SUBMISSION) {
            return res.status(400).json({ message: "Submission has too many fields." });
        }

        const event = await Event.findOne({
            slug: eventSlug,
            $or: [{ status: "ACTIVE" }, { manualEventPublish: true }],
        })
            .select("_id layout forms")
            .lean();

        if (!event) {
            return res.status(404).json({ message: "Event not found or not published." });
        }

        const exposedFormIds = extractLinkedFormIds(event.layout || []);

        if (!exposedFormIds.includes(formId)) {
            return res.status(404).json({ message: "Form not linked to this event." });
        }

        const standaloneForm = sanitizeForm(await Form.findOne({ id: formId }).lean());
        const legacyForm = Array.isArray(event.forms)
            ? sanitizeForm(event.forms.find((candidate) => candidate.id === formId))
            : null;
        const form = standaloneForm || legacyForm;

        if (!form) {
            return res.status(404).json({ message: "Form not found for this event." });
        }

        const allowedFieldNames = new Set((form.fields || []).map((field) => field.name));
        const unknownFields = Object.keys(values).filter(
            (fieldName) => !allowedFieldNames.has(fieldName),
        );

        if (unknownFields.length > 0) {
            return res.status(400).json({
                message: "Submission contains unsupported fields.",
                errors: unknownFields.map((fieldName) => `Unsupported field: ${fieldName}`),
            });
        }

        const validationErrors = [];
        const sanitizedData = {};

        for (const field of form.fields || []) {
            const rawValue = values[field.name];
            const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
            const isEmpty = value === undefined || value === null || value === "";

            if (field.required && isEmpty) {
                validationErrors.push(`${field.label} is required.`);
                continue;
            }

            if (isEmpty) {
                continue;
            }

            const typedValidation = validateFieldByType(field, value);

            if (!typedValidation.ok) {
                validationErrors.push(typedValidation.message);
                continue;
            }

            sanitizedData[field.name] = typedValidation.normalized;
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Submission validation failed.",
                errors: validationErrors,
            });
        }

        const forwardedFor = req.headers["x-forwarded-for"];
        const clientIp =
            typeof forwardedFor === "string"
                ? forwardedFor.split(",")[0].trim()
                : req.socket.remoteAddress || "unknown";

        const submission = await Submission.create({
            eventId: event._id,
            formId,
            data: sanitizedData,
            status: "PENDING",
            metadata: {
                ip: normalizeText(clientIp, 80),
                userAgent: normalizeText(req.get("user-agent") || "", 280),
            },
        });

        return res.status(201).json({
            message: "Submission received.",
            submissionId: submission._id,
            status: submission.status,
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
