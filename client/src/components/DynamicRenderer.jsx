import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Trophy } from "lucide-react";
import FormEngine from "./FormEngine.jsx";

const mapLegacyType = (type) => {
  const normalized = String(type || "").trim();

  const legacyMap = {
    hero: "HERO_EXPLOSION",
    text: "TEXT_GLOW_BLOCK",
    image: "IMAGE_GRID",
    reward: "REWARD_TIER",
    rules: "RULES_BLOCK",
    form: "DYNAMIC_FORM",
  };

  return legacyMap[normalized] || normalized;
};

const normalizeImageGridItems = (data) => {
  if (Array.isArray(data?.images)) {
    return data.images
      .map((item) => ({
        url: String(item?.url || "").trim(),
        alt: String(item?.alt || "").trim(),
      }))
      .filter((item) => item.url);
  }

  if (typeof data?.src === "string" && data.src.trim()) {
    return [
      {
        url: data.src.trim(),
        alt: String(data?.alt || "").trim(),
      },
    ];
  }

  return [];
};

const normalizeRewardItems = (data) => {
  if (Array.isArray(data?.items)) {
    return data.items.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof data?.items === "string") {
    return data.items
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const DynamicRenderer = ({ event }) => {
  const forms = Array.isArray(event?.forms)
    ? event.forms.filter((form) => form && typeof form === "object")
    : [];
  const layout = Array.isArray(event?.layout)
    ? event.layout.filter((block) => block && typeof block === "object")
    : [];
  const formMap = new Map(
    forms
      .map((form) => [
        String(form.id || "")
          .toLowerCase()
          .trim(),
        form,
      ])
      .filter(([formId]) => Boolean(formId)),
  );
  const showWinnerAnnouncement = Boolean(event?.manualWinnerPublish);
  const winnerAnnouncement = String(event?.winnerAnnouncement || "").trim();

  if (layout.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        This realm is warming up. Event content will drop soon.
      </Paper>
    );
  }

  return (
    <Stack spacing={3} sx={{ pb: 6 }}>
      {showWinnerAnnouncement ? (
        <Alert
          severity="info"
          variant="outlined"
          icon={<Trophy size={18} />}
          sx={{ p: 2 }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            Winner Announcement
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
            {winnerAnnouncement ||
              "Winners have been published by the event administration."}
          </Typography>
        </Alert>
      ) : null}

      {layout.map((rawBlock, index) => {
        try {
          const type = mapLegacyType(rawBlock?.type);
          const data = rawBlock?.data || {};

          if (type === "HERO_EXPLOSION") {
            const heroImage = data.imageUrl || "";
            const logoUrl = data.logoUrl || "/branding/mgu-one-logo.svg";

            return (
              <Paper
                key={`hero-explosion-${index}`}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  p: { xs: 2.5, sm: 4 },
                }}
              >
                {heroImage ? (
                  <Box
                    component="img"
                    src={heroImage}
                    alt={data.title || event.title}
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.14,
                    }}
                  />
                ) : null}
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                  }}
                />

                <Box sx={{ position: "relative" }}>
                  <Box
                    component="img"
                    src={logoUrl}
                    alt="MGU ONE"
                    sx={{ height: { xs: 48, sm: 64 }, width: "auto", mb: 2 }}
                  />

                  <Chip
                    label="Realm Broadcast"
                    color="secondary"
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    variant="h3"
                    color="primary.main"
                    sx={{ maxWidth: 960 }}
                  >
                    {data.title || event.title}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1.5, maxWidth: 640 }}>
                    {data.subtitle ||
                      "Server gates are open. Rally your team and chase the crown."}
                  </Typography>

                  {data.ctaLabel && data.ctaHref ? (
                    <Button
                      component="a"
                      href={data.ctaHref}
                      variant="contained"
                      color="primary"
                      sx={{ mt: 3 }}
                    >
                      {data.ctaLabel}
                    </Button>
                  ) : null}
                </Box>
              </Paper>
            );
          }

          if (type === "TEXT_GLOW_BLOCK") {
            return (
              <Paper key={`text-glow-${index}`} sx={{ p: { xs: 2, sm: 3 } }}>
                {data.heading ? (
                  <Typography variant="h5" color="primary.main">
                    {data.heading}
                  </Typography>
                ) : null}
                <Typography
                  variant="body1"
                  color="text.primary"
                  sx={{ mt: 1.5, whiteSpace: "pre-line" }}
                >
                  {data.body || ""}
                </Typography>
              </Paper>
            );
          }

          if (type === "IMAGE_GRID") {
            const imageItems = normalizeImageGridItems(data);

            return (
              <Paper key={`image-grid-${index}`} sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(3, minmax(0, 1fr))",
                    },
                  }}
                >
                  {imageItems.length > 0
                    ? imageItems.map((item, imageIndex) => (
                        <Paper
                          key={`${item.url}-${imageIndex}`}
                          sx={{ borderRadius: 2, overflow: "hidden" }}
                        >
                          <Box
                            component="img"
                            src={item.url}
                            alt={item.alt || "Event image"}
                            sx={{
                              width: "100%",
                              height: 176,
                              objectFit: "cover",
                            }}
                          />
                        </Paper>
                      ))
                    : null}
                </Box>
                {data.caption ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5 }}
                  >
                    {data.caption}
                  </Typography>
                ) : null}
              </Paper>
            );
          }

          if (type === "REWARD_TIER" || type === "RULES_BLOCK") {
            const rewards = normalizeRewardItems(data);
            const isRulesBlock = type === "RULES_BLOCK";

            return (
              <Paper
                key={`${isRulesBlock ? "rules" : "reward-tier"}-${index}`}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderColor: isRulesBlock ? "#c3d6eb" : "#d9c3a6",
                  backgroundColor: isRulesBlock ? "#f6f9fd" : "#fcf7f1",
                }}
              >
                <Typography variant="h5" color="primary.main">
                  {data.title || (isRulesBlock ? "Rules" : "Reward Tier")}
                </Typography>
                {rewards.length > 0 ? (
                  <Box
                    sx={{
                      mt: 2,
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    }}
                  >
                    {rewards.map((item, rewardIndex) => (
                      <Paper key={`${item}-${rewardIndex}`} sx={{ p: 1.5 }}>
                        <Typography variant="body2">{item}</Typography>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5 }}
                  >
                    {isRulesBlock
                      ? "Rulebook will be published before launch."
                      : "Loot table will be revealed before launch."}
                  </Typography>
                )}
              </Paper>
            );
          }

          if (type === "DYNAMIC_FORM") {
            const linkedForm = formMap.get(
              String(data.formId || "")
                .toLowerCase()
                .trim(),
            );

            if (!linkedForm) {
              return (
                <Alert
                  key={`dynamic-form-missing-${index}`}
                  severity="error"
                  variant="outlined"
                >
                  DYNAMIC_FORM block references missing form id:{" "}
                  {String(data.formId || "")}
                </Alert>
              );
            }

            return (
              <Box key={`dynamic-form-${linkedForm.id}-${index}`}>
                <FormEngine eventSlug={event.slug} form={linkedForm} />
              </Box>
            );
          }

          return null;
        } catch (renderError) {
          console.error("Failed to render layout block", renderError, rawBlock);

          return (
            <Alert
              key={`layout-render-error-${index}`}
              severity="error"
              variant="outlined"
            >
              A layout section could not be rendered due to invalid block data.
            </Alert>
          );
        }
      })}
    </Stack>
  );
};

export default DynamicRenderer;
