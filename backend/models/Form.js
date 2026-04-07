import mongoose from "mongoose";

const { Schema } = mongoose;

const formFieldTypes = [
    "text",
    "long_text",
    "discord",
    "mc_ign",
    "image_upload",
    "dropdown",
    "selector",
];

const formPurposes = ["REGISTRATION", "POST_EVENT_SUBMISSION"];

const identifierPattern = /^[a-z0-9_-]{2,64}$/;

const formFieldSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: identifierPattern,
        },
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 140,
        },
        type: {
            type: String,
            enum: formFieldTypes,
            required: true,
        },
        placeholder: {
            type: String,
            default: "",
            maxlength: 240,
        },
        required: {
            type: Boolean,
            default: false,
        },
        options: {
            type: [String],
            default: [],
        },
    },
    { _id: false },
);

const formSchema = new Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            lowercase: true,
            match: identifierPattern,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        description: {
            type: String,
            default: "",
            maxlength: 500,
        },
        submitLabel: {
            type: String,
            default: "Submit",
            maxlength: 60,
        },
        formPurpose: {
            type: String,
            enum: formPurposes,
            default: "REGISTRATION",
            index: true,
        },
        fields: {
            type: [formFieldSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    },
);

formSchema.path("fields").validate(function validateFieldsSize(fields) {
    return Array.isArray(fields) && fields.length <= 80;
}, "Form cannot exceed 80 fields.");

formSchema.path("fields").validate(function validateFieldNames(fields) {
    const names = (fields || []).map((field) => field.name);
    return new Set(names).size === names.length;
}, "Field names in a form must be unique.");

formSchema.pre("validate", function normalizeForm(next) {
    this.id = String(this.id || "").trim().toLowerCase();

    if (Array.isArray(this.fields)) {
        this.fields = this.fields.map((field) => {
            const normalizedType = String(field.type || "").trim();
            const options = Array.isArray(field.options)
                ? field.options
                    .map((option) => String(option || "").trim())
                    .filter(Boolean)
                : [];

            return {
                ...field,
                name: String(field.name || "").trim().toLowerCase(),
                options:
                    normalizedType === "dropdown" || normalizedType === "selector"
                        ? options
                        : [],
            };
        });
    }

    next();
});

const Form = mongoose.model("Form", formSchema);

export { formFieldTypes, formPurposes, identifierPattern };
export default Form;
