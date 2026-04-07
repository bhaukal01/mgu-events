import mongoose from "mongoose";

const { Schema } = mongoose;

const adminSchema = new Schema(
    {
        usernameEncrypted: {
            type: String,
            required: true,
        },
        usernameLookupHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
            sparse: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["admin"],
            default: "admin",
        },
    },
    {
        timestamps: true,
    }
);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
