import mongoose from "mongoose";

const { Schema } = mongoose;
const idPattern = /^[a-z0-9_-]{2,64}$/;
const submissionStatuses = ["PENDING", "APPROVED", "REJECTED"];

const submissionSchema = new Schema(
    {
        eventId: {
            type: Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            index: true,
        },
        formId: {
            type: String,
            required: true,
            index: true,
            match: idPattern,
        },
        data: {
            type: Schema.Types.Mixed,
            required: true,
            default: {},
        },
        status: {
            type: String,
            enum: submissionStatuses,
            default: "PENDING",
            index: true,
        },
        metadata: {
            ip: {
                type: String,
                maxlength: 80,
            },
            userAgent: {
                type: String,
                maxlength: 280,
            },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
    },
);

submissionSchema.index({ eventId: 1, formId: 1, createdAt: -1 });

const Submission = mongoose.model("Submission", submissionSchema);

export { submissionStatuses };
export default Submission;
