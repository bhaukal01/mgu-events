import mongoose from "mongoose";

const { Schema } = mongoose;

const eventStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"];
const layoutBlockTypes = [
    "HERO_EXPLOSION",
    "TEXT_GLOW_BLOCK",
    "IMAGE_GRID",
    "REWARD_TIER",
    "RULES_BLOCK",
    "DYNAMIC_FORM",
];

const layoutBlockSchema = new Schema(
    {
        type: {
            type: String,
            enum: layoutBlockTypes,
            required: true,
        },
        data: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    { _id: false },
);

const eventSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
            match: /^[a-z0-9-]{2,120}$/,
        },
        status: {
            type: String,
            enum: eventStatuses,
            default: "DRAFT",
            index: true,
        },
        serverLogoUrl: {
            type: String,
            default: "",
            maxlength: 1200,
        },
        cardStrapline: {
            type: String,
            default: "",
            maxlength: 480,
        },
        startsAt: {
            type: Date,
            default: null,
        },
        endsAt: {
            type: Date,
            default: null,
        },
        manualEventPublish: {
            type: Boolean,
            default: false,
            index: true,
        },
        manualWinnerPublish: {
            type: Boolean,
            default: false,
        },
        winnerAnnouncement: {
            type: String,
            default: "",
            maxlength: 3000,
        },
        layout: {
            type: [layoutBlockSchema],
            default: [],
        },
        // Legacy embedded forms are preserved for backward compatibility but not used
        // in new workflows where forms are managed in their own collection.
        forms: {
            type: [Schema.Types.Mixed],
            default: [],
        },
    },
    {
        timestamps: true,
    },
);

eventSchema.path("layout").validate(function validateLayoutSize(layout) {
    return Array.isArray(layout) && layout.length <= 120;
}, "Event layout cannot exceed 120 blocks.");

eventSchema.pre("validate", function normalizeEventFields(next) {
    if (!this.slug && this.title) {
        this.slug = this.title;
    }

    if (this.slug) {
        this.slug = String(this.slug)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
    }

    this.serverLogoUrl = String(this.serverLogoUrl || "").trim();
    this.cardStrapline = String(this.cardStrapline || "").trim();
    this.winnerAnnouncement = String(this.winnerAnnouncement || "").trim();

    next();
});

const Event = mongoose.model("Event", eventSchema);

export { eventStatuses, layoutBlockTypes };
export default Event;
