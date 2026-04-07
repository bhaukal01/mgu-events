import { IKContext, IKUpload } from "imagekitio-react";
import { useMemo, useState } from "react";
import { api } from "../../lib/api.js";

const IMAGEKIT_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "";
const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "";

const buildAuthenticator = () => async () => {
  const { data } = await api.get("/admin/imagekit-auth");

  return {
    signature: data.signature,
    expire: data.expire,
    token: data.token,
  };
};

const AdminImageUpload = ({
  value,
  onChange,
  label = "Upload image",
  folder = "/events-mgu-one/admin",
  maxFileMb = 10,
}) => {
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const authenticator = useMemo(() => buildAuthenticator(), []);

  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
    return (
      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
        Missing ImageKit public configuration on frontend.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <IKContext
        publicKey={IMAGEKIT_PUBLIC_KEY}
        urlEndpoint={IMAGEKIT_URL_ENDPOINT}
        authenticator={authenticator}
      >
        <IKUpload
          folder={folder}
          useUniqueFileName
          fileName={`admin-upload-${Date.now()}`}
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
          className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/70 p-2 text-xs text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-amber-300 file:px-3 file:py-1 file:text-xs file:font-bold file:text-slate-950"
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
      </IKContext>

      {uploading ? (
        <p className="text-xs text-amber-200">{label}: uploading...</p>
      ) : null}

      {uploadError ? (
        <p className="text-xs text-red-300">{uploadError}</p>
      ) : null}

      {value ? (
        <div className="overflow-hidden rounded-lg border border-emerald-400/20">
          <img
            src={value}
            alt="Uploaded preview"
            className="h-28 w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
};

export default AdminImageUpload;
