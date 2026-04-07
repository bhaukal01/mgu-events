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
      <section className="rounded-2xl border border-emerald-400/20 bg-panel/80 p-6 text-sm text-slate-200">
        This realm is warming up. Event content will drop soon.
      </section>
    );
  }

  return (
    <div className="space-y-7 pb-12">
      {showWinnerAnnouncement ? (
        <section className="reveal rounded-2xl border border-cyan-300/45 bg-cyan-500/10 p-5 sm:p-6">
          <h2 className="text-2xl font-black uppercase text-cyan-100">
            Winner Announcement
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-100 sm:text-base">
            {winnerAnnouncement ||
              "Winners have been published by the event administration."}
          </p>
        </section>
      ) : null}

      {layout.map((rawBlock, index) => {
        try {
          const type = mapLegacyType(rawBlock?.type);
          const data = rawBlock?.data || {};
          const delay = `${Math.min(index, 8) * 60}ms`;

          if (type === "HERO_EXPLOSION") {
            const heroImage = data.imageUrl || "";
            const logoUrl = data.logoUrl || "/branding/mgu-one-logo.svg";

            return (
              <section
                key={`hero-explosion-${index}`}
                className="panel-voxel reveal relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-panel/90"
                style={{ animationDelay: delay }}
              >
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={data.title || event.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-30"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(245,158,11,0.28),transparent_36%),radial-gradient(circle_at_80%_100%,rgba(16,185,129,0.24),transparent_40%),linear-gradient(145deg,rgba(5,8,21,0.96),rgba(5,8,21,0.8))]" />

                <div className="relative px-5 py-10 sm:px-10 sm:py-14">
                  <img
                    src={logoUrl}
                    alt="MGU ONE"
                    className="mb-4 h-16 w-auto opacity-95 sm:h-20"
                  />

                  <p className="mb-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Realm Broadcast
                  </p>
                  <h2 className="text-rune-gradient max-w-4xl text-3xl font-black uppercase leading-tight sm:text-5xl">
                    {data.title || event.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm text-slate-100 sm:text-base">
                    {data.subtitle ||
                      "Server gates are open. Rally your team and chase the crown."}
                  </p>

                  {data.ctaLabel && data.ctaHref ? (
                    <a
                      href={data.ctaHref}
                      className="btn-prism mt-6 inline-flex rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wider"
                    >
                      {data.ctaLabel}
                    </a>
                  ) : null}
                </div>
              </section>
            );
          }

          if (type === "TEXT_GLOW_BLOCK") {
            return (
              <section
                key={`text-glow-${index}`}
                className="reveal lime-glow-panel rounded-2xl border border-emerald-400/20 bg-panel/85 p-5 sm:p-6"
                style={{ animationDelay: delay }}
              >
                {data.heading ? (
                  <h2 className="text-2xl font-black uppercase text-slate-50">
                    {data.heading}
                  </h2>
                ) : null}
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-200 sm:text-base">
                  {data.body || ""}
                </p>
              </section>
            );
          }

          if (type === "IMAGE_GRID") {
            const imageItems = normalizeImageGridItems(data);

            return (
              <section
                key={`image-grid-${index}`}
                className="reveal rounded-2xl border border-emerald-400/20 bg-panel/85 p-4 sm:p-5"
                style={{ animationDelay: delay }}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {imageItems.length > 0
                    ? imageItems.map((item, imageIndex) => (
                        <figure
                          key={`${item.url}-${imageIndex}`}
                          className="overflow-hidden rounded-xl border border-emerald-400/20 bg-slate-900/60"
                        >
                          <img
                            src={item.url}
                            alt={item.alt || "Event image"}
                            className="h-44 w-full object-cover"
                          />
                        </figure>
                      ))
                    : null}
                </div>
                {data.caption ? (
                  <p className="mt-3 text-xs text-slate-300 sm:text-sm">
                    {data.caption}
                  </p>
                ) : null}
              </section>
            );
          }

          if (type === "REWARD_TIER" || type === "RULES_BLOCK") {
            const rewards = normalizeRewardItems(data);
            const isRulesBlock = type === "RULES_BLOCK";

            return (
              <section
                key={`${isRulesBlock ? "rules" : "reward-tier"}-${index}`}
                className={`reveal rounded-2xl border p-5 sm:p-6 ${
                  isRulesBlock
                    ? "border-cyan-300/45 bg-cyan-500/10"
                    : "border-amber-300/45 bg-amber-500/10"
                }`}
                style={{ animationDelay: delay }}
              >
                <h2
                  className={`text-2xl font-black uppercase ${
                    isRulesBlock ? "text-cyan-100" : "text-amber-200"
                  }`}
                >
                  {data.title || (isRulesBlock ? "Rules" : "Reward Tier")}
                </h2>
                {rewards.length > 0 ? (
                  <ul className="mt-3 grid gap-2 text-sm text-slate-100 sm:grid-cols-2">
                    {rewards.map((item, rewardIndex) => (
                      <li
                        key={`${item}-${rewardIndex}`}
                        className={`rounded-lg border bg-slate-900/55 px-3 py-2 ${
                          isRulesBlock
                            ? "border-cyan-300/35"
                            : "border-amber-300/35"
                        }`}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-200">
                    {isRulesBlock
                      ? "Rulebook will be published before launch."
                      : "Loot table will be revealed before launch."}
                  </p>
                )}
              </section>
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
                <section
                  key={`dynamic-form-missing-${index}`}
                  className="reveal rounded-2xl border border-red-500/45 bg-red-500/10 p-5 text-sm text-red-100"
                  style={{ animationDelay: delay }}
                >
                  DYNAMIC_FORM block references missing form id:{" "}
                  {String(data.formId || "")}
                </section>
              );
            }

            return (
              <div
                key={`dynamic-form-${linkedForm.id}-${index}`}
                className="reveal"
                style={{ animationDelay: delay }}
              >
                <FormEngine eventSlug={event.slug} form={linkedForm} />
              </div>
            );
          }

          return null;
        } catch (renderError) {
          console.error("Failed to render layout block", renderError, rawBlock);

          return (
            <section
              key={`layout-render-error-${index}`}
              className="reveal rounded-2xl border border-red-500/45 bg-red-500/10 p-5 text-sm text-red-100"
            >
              A layout section could not be rendered due to invalid block data.
            </section>
          );
        }
      })}
    </div>
  );
};

export default DynamicRenderer;
