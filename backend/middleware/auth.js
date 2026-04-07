import jwt from "jsonwebtoken";

const getTokenFromHeader = (authHeader = "") => {
    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.slice(7);
};

const getTokenFromCookie = (cookies = {}) => {
    const cookieToken = cookies?.mgu_admin_token;
    return typeof cookieToken === "string" && cookieToken.trim()
        ? cookieToken.trim()
        : null;
};

const getTokenFromRequest = (req) =>
    getTokenFromHeader(req.headers.authorization || "") ||
    getTokenFromCookie(req.cookies || {});

export const getAuthCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "strict" : "lax",
        path: "/",
        maxAge: 12 * 60 * 60 * 1000,
    };
};

export const signAdminToken = (admin) => {
    const jwtSecret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || "12h";

    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not configured.");
    }

    return jwt.sign(
        {
            sub: String(admin._id),
            role: admin.role,
        },
        jwtSecret,
        {
            algorithm: "HS256",
            expiresIn,
            issuer: "events.mgu.one",
            audience: "events-mgu-admin",
        },
    );
};

export const requireAuth = (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({ message: "Missing or invalid auth token." });
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const decoded = jwt.verify(token, jwtSecret, {
            algorithms: ["HS256"],
            issuer: "events.mgu.one",
            audience: "events-mgu-admin",
        });

        if (decoded?.role !== "admin") {
            return res.status(403).json({ message: "Admin role required." });
        }

        req.admin = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized request." });
    }
};
