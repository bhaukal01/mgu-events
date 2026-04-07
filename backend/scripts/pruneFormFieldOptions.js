import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Form from "../models/Form.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const selectableFieldTypes = ["dropdown", "selector"];

const countFormsWithRedundantOptions = async () =>
    Form.countDocuments({
        fields: {
            $elemMatch: {
                type: { $nin: selectableFieldTypes },
                options: { $exists: true },
            },
        },
    });

const run = async () => {
    const mongoUri = String(process.env.MONGODB_URI || "").trim();

    if (!mongoUri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
    });

    const before = await countFormsWithRedundantOptions();

    const result = await Form.updateMany(
        {},
        [
            {
                $set: {
                    fields: {
                        $map: {
                            input: "$fields",
                            as: "field",
                            in: {
                                $cond: [
                                    { $in: ["$$field.type", selectableFieldTypes] },
                                    "$$field",
                                    {
                                        name: "$$field.name",
                                        label: "$$field.label",
                                        type: "$$field.type",
                                        placeholder: "$$field.placeholder",
                                        required: "$$field.required",
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        ],
    );

    const after = await countFormsWithRedundantOptions();

    console.log("Forms scanned:", result.matchedCount);
    console.log("Forms updated:", result.modifiedCount);
    console.log("Forms with redundant options before:", before);
    console.log("Forms with redundant options after:", after);
};

run()
    .catch((error) => {
        console.error("Failed to prune form field options:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
