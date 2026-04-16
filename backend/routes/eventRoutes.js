import express from "express";
import Event from "../models/Event.js";
import Form from "../models/Form.js";

const router = express.Router();
const selectableFieldTypes = new Set(["dropdown", "selector"]);

const extractCardData = (layout = []) => {
    const heroBlock =
        layout.find((block) => block.type === "HERO_EXPLOSION") || null;
    const imageBlock = layout.find((block) => block.type === "IMAGE_GRID") || null;

    return {
        coverImage: heroBlock?.data?.imageUrl || imageBlock?.data?.images?.[0]?.url || "",
        cardLogo: heroBlock?.data?.logoUrl || "",
        strapline: heroBlock?.data?.subtitle || imageBlock?.data?.caption || "",
    };
};

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

router.get("/", async (req, res, next) => {
    try {
        const events = await Event.find({
            $or: [{ status: "ACTIVE" }, { manualEventPublish: true }],
        })
            .select("title slug status startsAt endsAt updatedAt layout serverLogoUrl cardStrapline")
            .sort({ updatedAt: -1 })
            .lean();

        const list = events.map((event) => {
            const cardData = extractCardData(event.layout || []);
            return {
                _id: event._id,
                title: event.title,
                slug: event.slug,
                status: event.status,
                startsAt: event.startsAt,
                endsAt: event.endsAt,
                updatedAt: event.updatedAt,
                coverImage: cardData.coverImage,
                cardLogo: event.serverLogoUrl || cardData.cardLogo,
                strapline: event.cardStrapline || cardData.strapline,
            };
        });

        return res.json(list);
    } catch (error) {
        return next(error);
    }
});

router.get("/:slug", async (req, res, next) => {
    try {
        const normalizedSlug = String(req.params.slug || "").toLowerCase().trim();
        const event = await Event.findOne({
            slug: normalizedSlug,
            $or: [{ status: "ACTIVE" }, { manualEventPublish: true }],
        }).lean();

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

        return res.json({
            ...event,
            forms,
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
