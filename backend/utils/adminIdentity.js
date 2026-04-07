import crypto from "node:crypto";

const ADMIN_USERNAME_PATTERN = /^[a-z0-9._-]{3,80}$/;

const normalizeAdminUsername = (value) =>
    String(value || "")
        .trim()
        .toLowerCase();

const isValidAdminUsername = (value) => ADMIN_USERNAME_PATTERN.test(value);

const deriveAdminCryptoKey = () => {
    const seed = String(
        process.env.ADMIN_CRYPTO_KEY || process.env.JWT_SECRET || "",
    ).trim();

    if (!seed) {
        throw new Error("ADMIN_CRYPTO_KEY or JWT_SECRET is required.");
    }

    return crypto
        .createHash("sha256")
        .update(`mgu-admin-identity:${seed}`)
        .digest();
};

const encodeBase64Url = (buffer) => buffer.toString("base64url");
const decodeBase64Url = (value) => Buffer.from(String(value || ""), "base64url");

const encryptAdminUsername = (username) => {
    const normalized = normalizeAdminUsername(username);

    if (!isValidAdminUsername(normalized)) {
        throw new Error("Admin username has an invalid format.");
    }

    const key = deriveAdminCryptoKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const ciphertext = Buffer.concat([
        cipher.update(normalized, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
        "v1",
        encodeBase64Url(iv),
        encodeBase64Url(authTag),
        encodeBase64Url(ciphertext),
    ].join(".");
};

const decryptAdminUsername = (encryptedUsername) => {
    const [version, ivEncoded, authTagEncoded, ciphertextEncoded] = String(
        encryptedUsername || "",
    ).split(".");

    if (version !== "v1" || !ivEncoded || !authTagEncoded || !ciphertextEncoded) {
        throw new Error("Invalid encrypted admin username payload.");
    }

    const key = deriveAdminCryptoKey();
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        decodeBase64Url(ivEncoded),
    );

    decipher.setAuthTag(decodeBase64Url(authTagEncoded));

    const decrypted = Buffer.concat([
        decipher.update(decodeBase64Url(ciphertextEncoded)),
        decipher.final(),
    ]).toString("utf8");

    return normalizeAdminUsername(decrypted);
};

const createAdminUsernameLookupHash = (username) => {
    const normalized = normalizeAdminUsername(username);

    if (!isValidAdminUsername(normalized)) {
        throw new Error("Admin username has an invalid format.");
    }

    const key = deriveAdminCryptoKey();
    return crypto
        .createHmac("sha256", key)
        .update(normalized)
        .digest("hex");
};

export {
    ADMIN_USERNAME_PATTERN,
    createAdminUsernameLookupHash,
    decryptAdminUsername,
    encryptAdminUsername,
    isValidAdminUsername,
    normalizeAdminUsername,
};
