import { Link } from "react-router-dom";

const sections = [
  {
    id: "terms",
    title: "Terms of Service",
    body: [
      "By using MGU.ONE Events, you agree to follow server rules, competition policies, and all applicable laws in your region.",
      "Users are responsible for account security, submitted content accuracy, and conduct during events.",
      "MGU.ONE may suspend access for abuse, cheating, harassment, fraud, or attempts to disrupt platform operations.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy Notice",
    body: [
      "We process registration data, profile data, and technical metadata solely for event operations, security, and moderation.",
      "Admin authentication credentials are stored in MongoDB with strong password hashing and encrypted identity fields.",
      "We do not sell personal data. Access is restricted to authorized operators for legitimate platform administration.",
    ],
  },
  {
    id: "cookies",
    title: "Cookie Policy",
    body: [
      "We use essential HTTP-only session cookies for secure admin authentication.",
      "These cookies are required for login persistence and cannot be disabled without impacting protected features.",
      "Cookie settings and retention are aligned with security best practices and operational requirements.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    body: [
      "Do not upload malicious files, offensive material, or copyrighted content without proper authorization.",
      "Automated abuse, scraping, account takeover attempts, and cheating tools are strictly prohibited.",
      "Violation of these rules may lead to disqualification, account suspension, or permanent bans.",
    ],
  },
];

const LegalPage = () => {
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="panel-voxel rounded-3xl border border-emerald-400/20 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
          Legal & Compliance
        </p>
        <h1 className="text-rune-gradient mt-2 text-4xl font-black uppercase">
          MGU.ONE Policies
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200">
          This page outlines platform terms, privacy principles, cookie usage,
          and acceptable use requirements for MGU.ONE Events.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Last updated: {lastUpdated}
        </p>
      </section>

      <div className="mt-6 space-y-4">
        {sections.map((section) => (
          <article
            id={section.id}
            key={section.id}
            className="rounded-2xl border border-emerald-400/15 bg-panel/80 p-5"
          >
            <h2 className="text-2xl font-black uppercase text-amber-200">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-200">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <Link
        to="/"
        className="btn-prism mt-8 inline-flex rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider"
      >
        Back to Events
      </Link>
    </main>
  );
};

export default LegalPage;
