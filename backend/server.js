import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import Admin from "./models/Admin.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === "production";

const corsAllowList = String(
    process.env.CORS_ORIGIN || "http://localhost:5173",
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const parseTrustProxyValue = () => {
    const rawValue = process.env.TRUST_PROXY;

    if (rawValue === undefined) {
        return 1;
    }

    if (rawValue === "true") {
        return 1;
    }

    if (rawValue === "false") {
        return false;
    }

    const numericValue = Number(rawValue);
    if (Number.isFinite(numericValue)) {
        return numericValue;
    }

    return rawValue;
};

const validateCriticalEnv = () => {
    const required = ["MONGODB_URI", "JWT_SECRET"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    const jwtSecret = String(process.env.JWT_SECRET || "").trim();
    if (
        isProduction &&
        (jwtSecret.length < 32 || jwtSecret.includes("replace-with-strong-secret"))
    ) {
        throw new Error(
            "In production, JWT_SECRET must be at least 32 characters and not a placeholder.",
        );
    }
};

const connectToDatabase = async () => {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
    });

    mongoose.connection.on("error", (error) => {
        console.error("MongoDB connection error:", error);
    });
};

const warnIfNoAdminAccounts = async () => {
    const adminCount = await Admin.estimatedDocumentCount();

    if (adminCount === 0) {
        console.warn(
            "No admin account exists yet. Bootstrap one through /api/v1/admin/bootstrap.",
        );
    }
};

const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isProduction ? 180 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please retry shortly." },
});

const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (corsAllowList.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
};

app.disable("x-powered-by");
app.set("trust proxy", parseTrustProxyValue());

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
);
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(morgan(isProduction ? "combined" : "dev"));

app.get("/api/v1/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        now: new Date().toISOString(),
    });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/submissions", submissionRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
    if (error?.message === "Not allowed by CORS") {
        return res.status(403).json({ message: "Origin is not allowed." });
    }

    if (error?.name === "ValidationError") {
        return res
            .status(400)
            .json({ message: "Validation failed.", details: error.message });
    }

    if (error?.name === "CastError") {
        return res.status(400).json({ message: "Invalid request parameter." });
    }

    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({ message: "Internal server error." });
});

const startServer = async () => {
    validateCriticalEnv();
    await connectToDatabase();
    await warnIfNoAdminAccounts();

    app.listen(port, () => {
        console.log(`Backend running on http://localhost:${port}`);
    });
};

startServer().catch((error) => {
    console.error("Failed to start backend:", error);
    process.exit(1);
});
