import ImageKit from "@imagekit/nodejs";

const MAX_ASSET_PAGE_SIZE = 100;
const MAX_ASSET_LOOKUP_PAGES = 30;

const normalizeComparableUrl = (value) => {
    try {
        const parsed = new URL(String(value || "").trim());
        parsed.hash = "";
        parsed.search = "";
        return `${parsed.origin}${parsed.pathname}`;
    } catch {
        return "";
    }
};

export const getTrustedImagekitEndpoint = () =>
    String(process.env.IMAGEKIT_URL_ENDPOINT || "")
        .trim()
        .replace(/\/+$/, "");

export const createImageKitClient = () => {
    const { IMAGEKIT_PRIVATE_KEY } = process.env;

    if (!IMAGEKIT_PRIVATE_KEY) {
        throw new Error("ImageKit environment variables are not fully configured.");
    }

    return new ImageKit({
        privateKey: IMAGEKIT_PRIVATE_KEY,
    });
};

const parseTrustedImagekitUrl = (rawUrl) => {
    const endpoint = getTrustedImagekitEndpoint();

    if (!endpoint) {
        return null;
    }

    try {
        const endpointUrl = new URL(endpoint);
        const parsedUrl = new URL(String(rawUrl || "").trim());

        if (parsedUrl.origin !== endpointUrl.origin) {
            return null;
        }

        const endpointPathPrefix = endpointUrl.pathname.replace(/\/+$/, "");
        let candidatePath = parsedUrl.pathname;

        if (endpointPathPrefix) {
            if (candidatePath === endpointPathPrefix) {
                return null;
            }

            if (!candidatePath.startsWith(`${endpointPathPrefix}/`)) {
                return null;
            }

            candidatePath = candidatePath.slice(endpointPathPrefix.length);
        }

        if (!candidatePath.startsWith("/")) {
            candidatePath = `/${candidatePath}`;
        }

        const decodedPath = decodeURIComponent(candidatePath);
        const lastSlashIndex = decodedPath.lastIndexOf("/");

        if (lastSlashIndex < 0 || lastSlashIndex === decodedPath.length - 1) {
            return null;
        }

        const folderPath =
            lastSlashIndex === 0
                ? "/"
                : `${decodedPath.slice(0, lastSlashIndex + 1)}`;
        const fileName = decodedPath.slice(lastSlashIndex + 1);

        return {
            originalUrl: String(rawUrl || "").trim(),
            normalizedUrl: normalizeComparableUrl(rawUrl),
            filePath: decodedPath,
            folderPath,
            fileName,
        };
    } catch {
        return null;
    }
};

export const isTrustedImagekitUrl = (value) => Boolean(parseTrustedImagekitUrl(value));

export const collectImagekitUrlsFromValue = (value, sink = new Set()) => {
    if (typeof value === "string") {
        if (isTrustedImagekitUrl(value)) {
            sink.add(String(value).trim());
        }

        return sink;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectImagekitUrlsFromValue(item, sink);
        }

        return sink;
    }

    if (value && typeof value === "object") {
        for (const nestedValue of Object.values(value)) {
            collectImagekitUrlsFromValue(nestedValue, sink);
        }
    }

    return sink;
};

const findAssetByUrl = async (imagekit, lookup) => {
    for (let page = 0; page < MAX_ASSET_LOOKUP_PAGES; page += 1) {
        const skip = page * MAX_ASSET_PAGE_SIZE;
        const assets = await imagekit.assets.list({
            type: "file",
            path: lookup.folderPath,
            limit: MAX_ASSET_PAGE_SIZE,
            skip,
        });

        if (!Array.isArray(assets) || assets.length === 0) {
            return null;
        }

        const matched = assets.find((asset) => {
            const assetPath = String(asset?.filePath || "");
            if (assetPath && assetPath === lookup.filePath) {
                return true;
            }

            const assetUrl = normalizeComparableUrl(asset?.url || "");
            return Boolean(assetUrl && assetUrl === lookup.normalizedUrl);
        });

        if (matched?.fileId) {
            return matched;
        }

        if (assets.length < MAX_ASSET_PAGE_SIZE) {
            return null;
        }
    }

    return null;
};

export const purgeImagekitUrls = async (urls = []) => {
    const uniqueUrls = [
        ...new Set(
            (Array.isArray(urls) ? urls : [])
                .map((value) => String(value || "").trim())
                .filter(Boolean),
        ),
    ];

    const summary = {
        requested: uniqueUrls.length,
        trusted: 0,
        skippedUntrusted: 0,
        resolved: 0,
        deleted: 0,
        missing: 0,
        failed: [],
    };

    if (uniqueUrls.length === 0) {
        return summary;
    }

    const lookups = uniqueUrls.map(parseTrustedImagekitUrl).filter(Boolean);

    summary.trusted = lookups.length;
    summary.skippedUntrusted = uniqueUrls.length - lookups.length;

    if (lookups.length === 0) {
        return summary;
    }

    const imagekit = createImageKitClient();

    for (const lookup of lookups) {
        try {
            const asset = await findAssetByUrl(imagekit, lookup);

            if (!asset?.fileId) {
                summary.missing += 1;
                continue;
            }

            summary.resolved += 1;
            await imagekit.files.delete(asset.fileId);
            summary.deleted += 1;
        } catch (error) {
            if (error?.status === 404) {
                summary.missing += 1;
                continue;
            }

            summary.failed.push({
                url: lookup.originalUrl,
                message: error?.error?.message || error?.message || "Unknown ImageKit deletion error.",
            });
        }
    }

    if (summary.failed.length > 0) {
        const cleanupError = new Error("Image cleanup failed for one or more ImageKit assets.");
        cleanupError.statusCode = 502;
        cleanupError.cleanupSummary = summary;
        throw cleanupError;
    }

    return summary;
};
