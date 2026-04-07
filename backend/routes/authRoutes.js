import express from "express";
import rateLimit from "express-rate-limit";
import { getImageKitAuthSignature } from "../controllers/imagekitAuthController.js";

const router = express.Router();

const imagekitRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 120 : 1200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many ImageKit auth requests. Please retry shortly." },
});

router.get("/imagekit", imagekitRateLimiter, getImageKitAuthSignature);

export default router;
