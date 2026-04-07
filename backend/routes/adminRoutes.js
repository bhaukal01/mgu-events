import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import Admin from "../models/Admin.js";
import Event, { layoutBlockTypes } from "../models/Event.js";
import Form, {
    formFieldTypes,
    formPurposes,
    identifierPattern,
} from "../models/Form.js";
import Submission from "../models/Submission.js";
import { getAuthCookieOptions, requireAuth, signAdminToken } from "../middleware/auth.js";
import {
    collectImagekitUrlsFromValue,
    createImageKitClient,
    purgeImagekitUrls,
} from "../utils/imagekitMedia.js";
import {
    createAdminUsernameLookupHash,
    decryptAdminUsername,
    encryptAdminUsername,
    isValidAdminUsername,
    normalizeAdminUsername,
} from "../utils/adminIdentity.js";

const router = express.Router();

const eventStatuses = new Set(["DRAFT", "ACTIVE", "ARCHIVED"]);
const blockTypeSet = new Set(layoutBlockTypes);
const fieldTypeSet = new Set(formFieldTypes);
const formPurposeSet = new Set(formPurposes);

const MAX_LAYOUT_BLOCKS = 120;
const MAX_REWARD_ITEMS = 80;
const MAX_FORM_FIELDS = 80;
const MAX_FORM_OPTIONS = 80;
const MIN_ADMIN_PASSWORD_LENGTH = 10;
const MAX_ADMIN_PASSWORD_LENGTH = 128;

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 25 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { message: "Too many login attempts. Please wait and retry." },
});

const normalizeText = (value, maxLength = 240) =>
    String(value || "").trim().slice(0, maxLength);

const normalizeSlug = (value) =>
    normalizeText(value, 120)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

const normalizeDateOrNull = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeRewardItems = (items) => {
    const source = Array.isArray(items)
        ? items
        : String(items || "")
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);

    return source.slice(0, MAX_REWARD_ITEMS).map((item) => normalizeText(item, 220));
};

const normalizeStringList = (value, maxLength = 120, maxItems = MAX_FORM_OPTIONS) => {
    const source = Array.isArray(value)
        ? value
        : String(value || "")
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);

    return source
        .slice(0, maxItems)
        .map((item) => normalizeText(item, maxLength))
        .filter(Boolean);
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

const collectEventImageUrls = (event) => {
    const urls = new Set();

    collectImagekitUrlsFromValue(event?.serverLogoUrl || "", urls);
    collectImagekitUrlsFromValue(event?.layout || [], urls);

    return urls;
};

const buildImageUploadFieldMap = (forms = []) => {
    const map = new Map();

    for (const form of forms) {
        const formId = String(form?.id || "").toLowerCase().trim();
        if (!formId) {
            continue;
        }

        const imageFieldNames = (Array.isArray(form?.fields) ? form.fields : [])
            .filter((field) => field?.type === "image_upload")
            .map((field) => String(field?.name || "").trim())
            .filter(Boolean);

        map.set(formId, imageFieldNames);
    }

    return map;
};

const collectSubmissionImageUrls = (submissions = [], imageUploadFieldsByForm = new Map()) => {
    const urls = new Set();

    for (const submission of submissions) {
        const formId = String(submission?.formId || "").toLowerCase().trim();
        const data = submission?.data && typeof submission.data === "object" ? submission.data : {};
        const imageFields = imageUploadFieldsByForm.get(formId);

        if (Array.isArray(imageFields)) {
            for (const fieldName of imageFields) {
                collectImagekitUrlsFromValue(data[fieldName], urls);
            }
            continue;
        }

        // Fallback for legacy submissions where form schema may no longer be available.
        collectImagekitUrlsFromValue(data, urls);
    }

    return urls;
};

const mapLegacyBlockType = (value) => {
    const type = String(value || "").trim();

    if (blockTypeSet.has(type)) {
        return type;
    }

    const legacy = {
        hero: "HERO_EXPLOSION",
        text: "TEXT_GLOW_BLOCK",
        image: "IMAGE_GRID",
        reward: "REWARD_TIER",
        rules: "RULES_BLOCK",
        form: "DYNAMIC_FORM",
    };

    return legacy[type] || "TEXT_GLOW_BLOCK";
};

const normalizeBlock = (block = {}) => {
    const type = mapLegacyBlockType(block.type);
    const data = block?.data && typeof block.data === "object" ? block.data : {};

    if (type === "HERO_EXPLOSION") {
        return {
            type,
            data: {
                title: normalizeText(data.title, 180),
                subtitle: normalizeText(data.subtitle, 480),
                imageUrl: normalizeText(data.imageUrl, 1200),
                logoUrl: normalizeText(data.logoUrl, 1200),
                ctaLabel: normalizeText(data.ctaLabel, 80),
                ctaHref: normalizeText(data.ctaHref, 1200),
            },
        };
    }

    if (type === "TEXT_GLOW_BLOCK") {
        return {
            type,
            data: {
                heading: normalizeText(data.heading, 180),
                body: normalizeText(data.body, 10000),
            },
        };
    }

    if (type === "IMAGE_GRID") {
        const images = Array.isArray(data.images)
            ? data.images.slice(0, 18).map((item) => ({
                url: normalizeText(item?.url, 1200),
                alt: normalizeText(item?.alt, 180),
            }))
            : [];

        return {
            type,
            data: {
                caption: normalizeText(data.caption, 360),
                images,
            },
        };
    }

    if (type === "REWARD_TIER" || type === "RULES_BLOCK") {
        return {
            type,
            data: {
                title: normalizeText(
                    data.title,
                    140,
                ) || (type === "RULES_BLOCK" ? "Rules" : "Rewards"),
                items: normalizeRewardItems(data.items),
            },
        };
    }

    return {
        type,
        data: {
            formId: normalizeText(data.formId, 64).toLowerCase(),
        },
    };
};

const normalizeEventPayload = (payload = {}) => ({
    title: normalizeText(payload.title, 180),
    slug: normalizeSlug(payload.slug || payload.title),
    status: eventStatuses.has(payload.status) ? payload.status : "DRAFT",
    serverLogoUrl: normalizeText(payload.serverLogoUrl, 1200),
    manualEventPublish: Boolean(payload.manualEventPublish),
    manualWinnerPublish: Boolean(payload.manualWinnerPublish),
    winnerAnnouncement: normalizeText(payload.winnerAnnouncement, 3000),
    layout: Array.isArray(payload.layout)
        ? payload.layout.slice(0, MAX_LAYOUT_BLOCKS).map(normalizeBlock)
        : [],
    startsAt: normalizeDateOrNull(payload.startsAt),
    endsAt: normalizeDateOrNull(payload.endsAt),
});

const validateEventPayload = async (payload, options = {}) => {
    const errors = [];

    if (!payload.title) {
        errors.push("Event title is required.");
    }

    if (!payload.slug) {
        errors.push("Event slug is required.");
    }

    if (payload.layout.length === 0) {
        errors.push("At least one layout block is required.");
    }

    const referencedFormIds = [];

    for (const block of payload.layout) {
        if (!blockTypeSet.has(block.type)) {
            errors.push(`Unsupported layout block type '${block.type}'.`);
            continue;
        }

        if (block.type !== "DYNAMIC_FORM") {
            continue;
        }

        const linkedFormId = String(block?.data?.formId || "").toLowerCase().trim();

        if (!linkedFormId) {
            errors.push("DYNAMIC_FORM block requires a formId.");
            continue;
        }

        if (!identifierPattern.test(linkedFormId)) {
            errors.push(`DYNAMIC_FORM formId '${linkedFormId}' is invalid.`);
            continue;
        }

        referencedFormIds.push(linkedFormId);
    }

    const uniqueFormIds = [...new Set(referencedFormIds)];

    if (uniqueFormIds.length > 0) {
        const existingForms = await Form.find({ id: { $in: uniqueFormIds } })
            .select("id")
            .lean();
        const existingIds = new Set(existingForms.map((form) => form.id));
        const legacyAllowedIds = new Set(
            (options?.existingEvent?.forms || [])
                .map((form) => String(form?.id || "").toLowerCase().trim())
                .filter(Boolean),
        );

        for (const formId of uniqueFormIds) {
            if (!existingIds.has(formId) && !legacyAllowedIds.has(formId)) {
                errors.push(`DYNAMIC_FORM block references missing form id: ${formId}.`);
            }
        }
    }

    if (payload.startsAt && payload.endsAt) {
        const starts = new Date(payload.startsAt).getTime();
        const ends = new Date(payload.endsAt).getTime();

        if (starts > ends) {
            errors.push("startsAt cannot be later than endsAt.");
        }
    }

    return errors;
};

const normalizeFormField = (field = {}) => {
    const normalizedType = fieldTypeSet.has(field.type) ? field.type : "text";

    return {
        name: normalizeText(field.name, 64).toLowerCase(),
        label: normalizeText(field.label, 160),
        type: normalizedType,
        placeholder: normalizeText(field.placeholder, 240),
        required: Boolean(field.required),
        options:
            normalizedType === "dropdown" || normalizedType === "selector"
                ? normalizeStringList(field.options, 120, MAX_FORM_OPTIONS)
                : [],
    };
};

const normalizeFormPayload = (payload = {}) => ({
    id: normalizeText(payload.id, 64).toLowerCase(),
    title: normalizeText(payload.title, 180),
    description: normalizeText(payload.description, 500),
    submitLabel: normalizeText(payload.submitLabel || "Submit", 60),
    formPurpose: formPurposeSet.has(payload.formPurpose)
        ? payload.formPurpose
        : "REGISTRATION",
    fields: Array.isArray(payload.fields)
        ? payload.fields.slice(0, MAX_FORM_FIELDS).map(normalizeFormField)
        : [],
});

const validateFormPayload = (payload) => {
    const errors = [];

    if (!payload.id) {
        errors.push("Form id is required.");
    } else if (!identifierPattern.test(payload.id)) {
        errors.push("Form id must be 2-64 chars with lowercase letters, numbers, underscores, or hyphens.");
    }

    if (!payload.title) {
        errors.push("Form title is required.");
    }

    if (!formPurposeSet.has(payload.formPurpose)) {
        errors.push("Form purpose must be REGISTRATION or POST_EVENT_SUBMISSION.");
    }

    if (!Array.isArray(payload.fields) || payload.fields.length === 0) {
        errors.push("Form must include at least one field.");
    }

    const fieldNames = payload.fields.map((field) => field.name);
    if (new Set(fieldNames).size !== fieldNames.length) {
        errors.push("Field names must be unique inside a form.");
    }

    for (const field of payload.fields) {
        if (!field.name || !identifierPattern.test(field.name)) {
            errors.push(`Field name '${field.name || "(empty)"}' is invalid.`);
        }

        if (!fieldTypeSet.has(field.type)) {
            errors.push(`Field '${field.name || "(empty)"}' has unsupported type '${field.type}'.`);
        }

        if (!field.label) {
            errors.push(`Field '${field.name || "(empty)"}' requires a label.`);
        }

        if (
            (field.type === "dropdown" || field.type === "selector") &&
            (!Array.isArray(field.options) || field.options.length === 0)
        ) {
            errors.push(`Field '${field.name || "(empty)"}' requires options for type '${field.type}'.`);
        }
    }

    return errors;
};

const validateAdminPassword = (value) => {
    const password = String(value || "");

    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters long.`;
    }

    if (password.length > MAX_ADMIN_PASSWORD_LENGTH) {
        return `Password must be at most ${MAX_ADMIN_PASSWORD_LENGTH} characters long.`;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return "Password must include at least one letter and one number.";
    }

    return "";
};

const getSafeAdminUsername = (admin) => {
    if (admin?.usernameEncrypted) {
        try {
            return decryptAdminUsername(admin.usernameEncrypted);
        } catch {
            return "";
        }
    }

    const legacyUsername = normalizeAdminUsername(admin?.username);
    return isValidAdminUsername(legacyUsername) ? legacyUsername : "";
};

const buildAdminResponse = (admin) => ({
    id: admin._id,
    username: getSafeAdminUsername(admin),
    role: admin.role,
    createdAt: admin.createdAt,
});

const createAdminAccount = async ({ username, password }) => {
    const normalizedUsername = normalizeAdminUsername(username);

    if (!isValidAdminUsername(normalizedUsername)) {
        const error = new Error(
            "Username must be 3-80 chars using lowercase letters, numbers, dots, underscores, or hyphens.",
        );
        error.statusCode = 400;
        throw error;
    }

    const passwordError = validateAdminPassword(password);
    if (passwordError) {
        const error = new Error(passwordError);
        error.statusCode = 400;
        throw error;
    }

    const usernameLookupHash = createAdminUsernameLookupHash(normalizedUsername);
    const existingAdmin = await Admin.findOne({ usernameLookupHash }).select("_id").lean();

    if (existingAdmin) {
        const error = new Error("An admin with this username already exists.");
        error.statusCode = 409;
        throw error;
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    return Admin.create({
        usernameEncrypted: encryptAdminUsername(normalizedUsername),
        usernameLookupHash,
        passwordHash,
        role: "admin",
    });
};

const migrateLegacyAdminRecord = async (normalizedUsername) => {
    const legacyAdmin = await Admin.collection.findOne({
        username: normalizedUsername,
        usernameLookupHash: { $exists: false },
    });

    if (!legacyAdmin?._id || !legacyAdmin?.passwordHash) {
        return null;
    }

    const usernameLookupHash = createAdminUsernameLookupHash(normalizedUsername);

    await Admin.collection.updateOne(
        { _id: legacyAdmin._id },
        {
            $set: {
                usernameEncrypted: encryptAdminUsername(normalizedUsername),
                usernameLookupHash,
            },
            $unset: {
                username: "",
            },
        },
    );

    return Admin.findById(legacyAdmin._id);
};

const getAdminByUsername = async (username) => {
    const usernameLookupHash = createAdminUsernameLookupHash(username);
    const admin = await Admin.findOne({ usernameLookupHash });

    if (admin) {
        return admin;
    }

    return migrateLegacyAdminRecord(username);
};

const csvEscape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);

    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
};

router.get("/bootstrap-status", async (req, res, next) => {
    try {
        const adminCount = await Admin.estimatedDocumentCount();
        return res.json({ requiresSetup: adminCount === 0 });
    } catch (error) {
        return next(error);
    }
});

router.post("/bootstrap", loginLimiter, async (req, res, next) => {
    try {
        const adminCount = await Admin.estimatedDocumentCount();

        if (adminCount > 0) {
            return res.status(409).json({
                message: "Bootstrap is disabled after the first admin account is created.",
            });
        }

        const username = normalizeAdminUsername(req.body?.username);
        const password = String(req.body?.password || "");

        if (!username || !password) {
            return res.status(400).json({ message: "username and password are required." });
        }

        const admin = await createAdminAccount({ username, password });
        const token = signAdminToken({
            _id: admin._id,
            role: admin.role,
        });

        res.cookie("mgu_admin_token", token, getAuthCookieOptions());

        return res.status(201).json({
            message: "Initial admin created.",
            admin: buildAdminResponse(admin),
        });
    } catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }

        if (error?.code === 11000) {
            return res.status(409).json({ message: "An admin with this username already exists." });
        }

        return next(error);
    }
});

router.post("/login", loginLimiter, async (req, res, next) => {
    try {
        const username = normalizeAdminUsername(req.body?.username);
        const password = String(req.body?.password || "");

        if (!username || !password) {
            return res.status(400).json({ message: "username and password are required." });
        }

        if (!isValidAdminUsername(username)) {
            return res.status(400).json({
                message:
                    "Username must be 3-80 chars using lowercase letters, numbers, dots, underscores, or hyphens.",
            });
        }

        const admin = await getAdminByUsername(username);

        if (!admin) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const token = signAdminToken({
            _id: admin._id,
            role: admin.role,
        });

        res.cookie("mgu_admin_token", token, getAuthCookieOptions());

        return res.json({
            admin: buildAdminResponse(admin),
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/logout", (req, res) => {
    res.clearCookie("mgu_admin_token", {
        ...getAuthCookieOptions(),
        maxAge: 0,
    });

    return res.status(204).send();
});

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.admin.sub)
            .select("username usernameEncrypted role createdAt")
            .lean();

        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        return res.json(buildAdminResponse(admin));
    } catch (error) {
        return next(error);
    }
});

router.put("/me/password", requireAuth, async (req, res, next) => {
    try {
        const currentPassword = String(req.body?.currentPassword || "");
        const newPassword = String(req.body?.newPassword || "");
        const confirmNewPassword = String(req.body?.confirmNewPassword || "");

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "currentPassword and newPassword are required." });
        }

        if (confirmNewPassword && newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: "New password confirmation does not match." });
        }

        const passwordError = validateAdminPassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const admin = await Admin.findById(req.admin.sub).select("passwordHash");

        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        const isReusingCurrentPassword = await bcrypt.compare(newPassword, admin.passwordHash);
        if (isReusingCurrentPassword) {
            return res.status(400).json({ message: "New password must be different from the current password." });
        }

        admin.passwordHash = await bcrypt.hash(newPassword, 12);
        await admin.save();

        return res.json({ message: "Password updated successfully." });
    } catch (error) {
        return next(error);
    }
});

router.get("/imagekit-auth", requireAuth, async (req, res, next) => {
    try {
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
});

router.get("/admins", requireAuth, async (req, res, next) => {
    try {
        const admins = await Admin.find({})
            .select("username usernameEncrypted role createdAt")
            .sort({ createdAt: -1 })
            .lean();

        return res.json(admins.map(buildAdminResponse));
    } catch (error) {
        return next(error);
    }
});

router.post("/admins", requireAuth, async (req, res, next) => {
    try {
        const username = normalizeAdminUsername(req.body?.username);
        const password = String(req.body?.password || "");

        if (!username || !password) {
            return res.status(400).json({ message: "username and password are required." });
        }

        const admin = await createAdminAccount({ username, password });

        return res.status(201).json({
            message: "Admin account created.",
            admin: buildAdminResponse(admin),
        });
    } catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }

        if (error?.code === 11000) {
            return res.status(409).json({ message: "An admin with this username already exists." });
        }

        return next(error);
    }
});

router.delete("/admins/:id", requireAuth, async (req, res, next) => {
    try {
        const targetAdminId = String(req.params.id || "").trim();

        if (!targetAdminId) {
            return res.status(400).json({ message: "Admin id is required." });
        }

        if (targetAdminId === String(req.admin.sub || "")) {
            return res.status(400).json({ message: "You cannot delete your own account from this action." });
        }

        const adminCount = await Admin.countDocuments();
        if (adminCount <= 1) {
            return res.status(400).json({ message: "Cannot delete the last admin account." });
        }

        const deleted = await Admin.findByIdAndDelete(targetAdminId).lean();

        if (!deleted) {
            return res.status(404).json({ message: "Admin not found." });
        }

        return res.json({
            message: "Admin account deleted.",
            admin: buildAdminResponse(deleted),
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/forms", requireAuth, async (req, res, next) => {
    try {
        const forms = await Form.find({}).sort({ updatedAt: -1 }).lean();
        return res.json(forms);
    } catch (error) {
        return next(error);
    }
});

router.get("/forms/:id", requireAuth, async (req, res, next) => {
    try {
        const formId = normalizeText(req.params.id, 64).toLowerCase();
        const form = await Form.findOne({ id: formId }).lean();

        if (!form) {
            return res.status(404).json({ message: "Form not found." });
        }

        return res.json(form);
    } catch (error) {
        return next(error);
    }
});

router.post("/forms", requireAuth, async (req, res, next) => {
    try {
        const payload = normalizeFormPayload(req.body);
        const errors = validateFormPayload(payload);

        if (errors.length > 0) {
            return res.status(400).json({ message: "Validation failed.", errors });
        }

        const form = await Form.create(payload);
        return res.status(201).json(form);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "A form with this id already exists." });
        }

        return next(error);
    }
});

router.put("/forms/:id", requireAuth, async (req, res, next) => {
    try {
        const routeFormId = normalizeText(req.params.id, 64).toLowerCase();
        const payload = normalizeFormPayload({
            ...req.body,
            id: routeFormId,
        });
        const errors = validateFormPayload(payload);

        if (errors.length > 0) {
            return res.status(400).json({ message: "Validation failed.", errors });
        }

        const updated = await Form.findOneAndUpdate({ id: routeFormId }, payload, {
            new: true,
            runValidators: true,
        }).lean();

        if (!updated) {
            return res.status(404).json({ message: "Form not found." });
        }

        return res.json(updated);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "A form with this id already exists." });
        }

        return next(error);
    }
});

router.delete("/forms/:id", requireAuth, async (req, res, next) => {
    try {
        const formId = normalizeText(req.params.id, 64).toLowerCase();
        const form = await Form.findOne({ id: formId }).lean();

        if (!form) {
            return res.status(404).json({ message: "Form not found." });
        }

        const submissions = await Submission.find({ formId })
            .select("_id formId data")
            .lean();

        const imageUploadFields = (Array.isArray(form.fields) ? form.fields : [])
            .filter((field) => field?.type === "image_upload")
            .map((field) => String(field?.name || "").trim())
            .filter(Boolean);

        const imageUrls = new Set();

        for (const submission of submissions) {
            const data = submission?.data && typeof submission.data === "object" ? submission.data : {};

            for (const fieldName of imageUploadFields) {
                collectImagekitUrlsFromValue(data[fieldName], imageUrls);
            }
        }

        const cleanup = await purgeImagekitUrls([...imageUrls]);

        const [
            deletedFormResult,
            deletedSubmissionsResult,
            unlinkedLayoutResult,
            unlinkedLegacyFormsResult,
        ] = await Promise.all([
            Form.deleteOne({ id: formId }),
            Submission.deleteMany({ formId }),
            Event.updateMany(
                { "layout.type": "DYNAMIC_FORM" },
                {
                    $pull: {
                        layout: {
                            type: "DYNAMIC_FORM",
                            "data.formId": formId,
                        },
                    },
                },
            ),
            Event.updateMany(
                { forms: { $elemMatch: { id: formId } } },
                {
                    $pull: {
                        forms: { id: formId },
                    },
                },
            ),
        ]);

        if (deletedFormResult.deletedCount === 0) {
            return res.status(404).json({ message: "Form not found." });
        }

        return res.json({
            message: "Form deleted successfully.",
            cleanup,
            deletedSubmissions: deletedSubmissionsResult.deletedCount || 0,
            unlinkedEvents: (unlinkedLayoutResult.modifiedCount || 0) + (unlinkedLegacyFormsResult.modifiedCount || 0),
        });
    } catch (error) {
        if (error?.statusCode === 502) {
            return res.status(502).json({
                message: error.message,
                cleanup: error.cleanupSummary,
            });
        }

        return next(error);
    }
});

router.get("/forms/:id/submissions.csv", requireAuth, async (req, res, next) => {
    try {
        const formId = normalizeText(req.params.id, 64).toLowerCase();
        const form = await Form.findOne({ id: formId }).lean();

        if (!form) {
            return res.status(404).json({ message: "Form not found." });
        }

        const submissions = await Submission.find({ formId })
            .sort({ createdAt: -1 })
            .lean();

        const eventIds = [
            ...new Set(submissions.map((submission) => String(submission.eventId || "")).filter(Boolean)),
        ];

        const events =
            eventIds.length > 0
                ? await Event.find({ _id: { $in: eventIds } }).select("_id slug title").lean()
                : [];

        const eventMap = new Map(events.map((event) => [String(event._id), event]));

        const headers = [
            "submissionId",
            "eventSlug",
            "eventTitle",
            "submittedAt",
            "status",
            ...(form.fields || []).map((field) => field.name),
        ];

        const rows = submissions.map((submission) => {
            const event = eventMap.get(String(submission.eventId || ""));
            const values = submission.data || {};

            return [
                submission._id,
                event?.slug || "",
                event?.title || "",
                submission.createdAt ? new Date(submission.createdAt).toISOString() : "",
                submission.status || "",
                ...(form.fields || []).map((field) => values[field.name] || ""),
            ];
        });

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => csvEscape(cell)).join(","))
            .join("\n");

        const fileName = `form-${formId}-submissions.csv`;

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

        return res.status(200).send(csv);
    } catch (error) {
        return next(error);
    }
});

router.get("/events", requireAuth, async (req, res, next) => {
    try {
        const events = await Event.find({}).sort({ updatedAt: -1 }).lean();
        return res.json(events);
    } catch (error) {
        return next(error);
    }
});

router.get("/events/:id", requireAuth, async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id).lean();

        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }

        return res.json(event);
    } catch (error) {
        return next(error);
    }
});

router.post("/events", requireAuth, async (req, res, next) => {
    try {
        const payload = normalizeEventPayload(req.body);
        const errors = await validateEventPayload(payload);

        if (errors.length > 0) {
            return res.status(400).json({ message: "Validation failed.", errors });
        }

        const event = await Event.create(payload);
        return res.status(201).json(event);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "An event with this slug already exists." });
        }

        return next(error);
    }
});

router.put("/events/:id", requireAuth, async (req, res, next) => {
    try {
        const existingEvent = await Event.findById(req.params.id)
            .select("forms")
            .lean();

        if (!existingEvent) {
            return res.status(404).json({ message: "Event not found." });
        }

        const payload = normalizeEventPayload(req.body);
        const errors = await validateEventPayload(payload, {
            existingEvent,
        });

        if (errors.length > 0) {
            return res.status(400).json({ message: "Validation failed.", errors });
        }

        const updated = await Event.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        }).lean();

        if (!updated) {
            return res.status(404).json({ message: "Event not found." });
        }

        return res.json(updated);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: "An event with this slug already exists." });
        }

        return next(error);
    }
});

router.delete("/events/:id", requireAuth, async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id)
            .select("_id slug title serverLogoUrl layout forms")
            .lean();

        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }

        const submissions = await Submission.find({ eventId: event._id })
            .select("_id formId data")
            .lean();

        const linkedFormIds = extractLinkedFormIds(event.layout || []);
        const standaloneForms =
            linkedFormIds.length > 0
                ? await Form.find({ id: { $in: linkedFormIds } })
                    .select("id fields")
                    .lean()
                : [];
        const legacyForms = Array.isArray(event.forms) ? event.forms : [];

        const imageFieldMap = buildImageUploadFieldMap([...standaloneForms, ...legacyForms]);
        const imageUrls = collectEventImageUrls(event);
        const submissionImageUrls = collectSubmissionImageUrls(submissions, imageFieldMap);

        for (const url of submissionImageUrls) {
            imageUrls.add(url);
        }

        const cleanup = await purgeImagekitUrls([...imageUrls]);

        const [deletedEventResult, deletedSubmissionsResult] = await Promise.all([
            Event.deleteOne({ _id: event._id }),
            Submission.deleteMany({ eventId: event._id }),
        ]);

        if (deletedEventResult.deletedCount === 0) {
            return res.status(404).json({ message: "Event not found." });
        }

        return res.json({
            message: "Event deleted successfully.",
            cleanup,
            deletedSubmissions: deletedSubmissionsResult.deletedCount || 0,
        });
    } catch (error) {
        if (error?.statusCode === 502) {
            return res.status(502).json({
                message: error.message,
                cleanup: error.cleanupSummary,
            });
        }

        return next(error);
    }
});

export default router;
