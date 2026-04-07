import ImageKit from "@imagekit/nodejs";
import Event from "../models/Event.js";
import Form from "../models/Form.js";

const createImageKitClient = () => {
    const { IMAGEKIT_PRIVATE_KEY } = process.env;

    if (!IMAGEKIT_PRIVATE_KEY) {
        throw new Error("ImageKit environment variables are not fully configured.");
    }

    return new ImageKit({
        privateKey: IMAGEKIT_PRIVATE_KEY,
    });
};

const blockTypeMap = {
    HERO_EXPLOSION: "HERO_EXPLOSION",
    TEXT_GLOW_BLOCK: "TEXT_GLOW_BLOCK",
    IMAGE_GRID: "IMAGE_GRID",
    REWARD_TIER: "REWARD_TIER",
    DYNAMIC_FORM: "DYNAMIC_FORM",
};

const canPublicFormUpload = async ({ eventSlug, formId }) => {
    const normalizedFormId = String(formId || "").toLowerCase().trim();

    const event = await Event.findOne({
        slug: eventSlug,
        $or: [{ status: "ACTIVE" }, { manualEventPublish: true }],
    })
        .select("layout forms")
        .lean();

    if (!event) {
        return { ok: false, reason: "Event not found or not published." };
    }

    const hasLinkedDynamicFormBlock = (event.layout || []).some((block) => {
        const type = blockTypeMap[block?.type] || "";
        return (
            type === "DYNAMIC_FORM" &&
            String(block?.data?.formId || "").toLowerCase().trim() === normalizedFormId
        );
    });

    if (!hasLinkedDynamicFormBlock) {
        return {
            ok: false,
            reason: "Form upload is not exposed in active layout.",
        };
    }

    const standaloneForm = await Form.findOne({ id: normalizedFormId }).lean();
    const legacyForm = Array.isArray(event.forms)
        ? event.forms.find((candidate) => candidate.id === normalizedFormId)
        : null;
    const form = standaloneForm || legacyForm;

    if (!form) {
        return { ok: false, reason: "Form not found for this event." };
    }

    const hasImageUploadField = (form.fields || []).some(
        (field) => field.type === "image_upload",
    );

    if (!hasImageUploadField) {
        return {
            ok: false,
            reason: "This form does not allow image uploads.",
        };
    }

    return { ok: true };
};

export const getImageKitAuthSignature = async (req, res, next) => {
    try {
        const eventSlug = String(req.query.eventSlug || "").toLowerCase().trim();
        const formId = String(req.query.formId || "").toLowerCase().trim();

        if (!eventSlug || !formId) {
            return res.status(400).json({
                message: "eventSlug and formId are required.",
            });
        }

        const uploadAccess = await canPublicFormUpload({ eventSlug, formId });
        if (!uploadAccess.ok) {
            return res.status(403).json({ message: uploadAccess.reason });
        }

        const imagekit = createImageKitClient();
        const authParams = imagekit.helper.getAuthenticationParameters();

        return res.json({
            signature: authParams.signature,
            token: authParams.token,
            expire: authParams.expire,
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
        });
    } catch (error) {
        return next(error);
    }
};
