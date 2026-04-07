import express from "express";
import Event from "../models/Event.js";
import Form from "../models/Form.js";

const router = express.Router();

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

router.get("/", async (req, res, next) => {
    try {
        const events = await Event.find({
            $or: [{ status: "ACTIVE" }, { manualEventPublish: true }],
        })
            .select("title slug status startsAt endsAt updatedAt layout serverLogoUrl")
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
                strapline: cardData.strapline,
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

        const forms =
            standaloneForms.length > 0
                ? standaloneForms
                : Array.isArray(event.forms)
                    ? event.forms
                    : [];

        return res.json({
            ...event,
            forms,
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
