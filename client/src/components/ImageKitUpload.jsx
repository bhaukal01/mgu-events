import { IKContext, IKUpload } from "imagekitio-react";
import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { api } from "../lib/api.js";

const IMAGEKIT_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "";
const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "";

const buildAuthenticator =
  ({ eventSlug, formId }) =>
  async () => {
    if (!eventSlug || !formId) {
      throw new Error("Image upload context is missing eventSlug or formId.");
    }

    const { data } = await api.get("/auth/imagekit", {
      params: {
        eventSlug,
        formId,
      },
    });

    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
    };
  };

const ImageKitUpload = ({
  value,
  onChange,
  label = "Upload image",
  eventSlug = "",
  formId = "",
  folder = "/events-mgu-one",
  maxFileMb = 10,
}) => {
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const authenticator = useMemo(
    () => buildAuthenticator({ eventSlug, formId }),
    [eventSlug, formId],
  );

  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
    return (
      <Alert severity="warning" variant="outlined">
        Missing ImageKit public configuration on frontend.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <IKContext
        publicKey={IMAGEKIT_PUBLIC_KEY}
        urlEndpoint={IMAGEKIT_URL_ENDPOINT}
        authenticator={authenticator}
      >
        <Paper sx={{ p: 1.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block" }}
          >
            {label}
          </Typography>
          <IKUpload
            folder={folder}
            useUniqueFileName
            fileName={`upload-${Date.now()}`}
            accept="image/png,image/jpeg,image/webp,image/gif"
            validateFile={(file) => {
              const allowed = [
                "image/png",
                "image/jpeg",
                "image/webp",
                "image/gif",
              ];

              if (!allowed.includes(file.type)) {
                setUploadError(
                  "Only PNG, JPG, WEBP, and GIF images are allowed.",
                );
                return false;
              }

              if (file.size > maxFileMb * 1024 * 1024) {
                setUploadError(`File must be under ${maxFileMb} MB.`);
                return false;
              }

              return true;
            }}
            className="ik-upload-input"
            onError={(error) => {
              setUploading(false);
              setUploadError(error?.message || "Image upload failed.");
            }}
            onUploadStart={() => {
              setUploadError("");
              setUploading(true);
            }}
            onSuccess={(response) => {
              setUploading(false);
              setUploadError("");
              onChange(response.url || "");
            }}
          />
        </Paper>
      </IKContext>

      {uploading ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={14} />
          <Typography variant="caption">{label}: uploading...</Typography>
        </Stack>
      ) : null}

      {uploadError ? (
        <Alert severity="error" variant="outlined">
          {uploadError}
        </Alert>
      ) : null}

      {value ? (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <img
            src={value}
            alt="Uploaded preview"
            style={{ height: 144, width: "100%", objectFit: "cover" }}
          />
        </Box>
      ) : null}
    </Stack>
  );
};

export default ImageKitUpload;
