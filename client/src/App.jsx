import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./lib/api.js";
import EventLandingPage from "./pages/EventLandingPage.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import LegalPage from "./pages/LegalPage.jsx";
import EventBuilderPage from "./pages/admin/EventBuilderPage.jsx";
import FormBuilderPage from "./pages/admin/FormBuilderPage.jsx";
import AdminManagementPage from "./pages/admin/AdminManagementPage.jsx";

const fetchEvents = async () => {
  const response = await api.get("/events");
  return Array.isArray(response.data) ? response.data : [];
};

const fetchAdminSession = async () => {
  const response = await api.get("/admin/me");
  return response.data;
};

const eventState = (event) => {
  const now = Date.now();
  const startsAt = event?.startsAt ? new Date(event.startsAt).getTime() : null;
  const endsAt = event?.endsAt ? new Date(event.endsAt).getTime() : null;

  if (startsAt && now < startsAt) {
    return "UPCOMING";
  }

  if (endsAt && now > endsAt) {
    return "ENDED";
  }

  return "LIVE";
};

const dateRangeLabel = (event) => {
  const startsAt = event?.startsAt ? new Date(event.startsAt) : null;
  const endsAt = event?.endsAt ? new Date(event.endsAt) : null;

  if (!startsAt && !endsAt) {
    return "Open timeline";
  }

  if (startsAt && !endsAt) {
    return `Starts ${startsAt.toLocaleString()}`;
  }

  if (!startsAt && endsAt) {
    return `Ends ${endsAt.toLocaleString()}`;
  }

  return `${startsAt.toLocaleDateString()} - ${endsAt.toLocaleDateString()}`;
};

const stateClassMap = {
  LIVE: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  UPCOMING: "border-amber-400/50 bg-amber-500/10 text-amber-200",
  ENDED: "border-slate-500/55 bg-slate-700/25 text-slate-300",
};

const eventCardTintClasses = [
  "subcard-tint-cyan",
  "subcard-tint-emerald",
  "subcard-tint-amber",
  "subcard-tint-violet",
  "subcard-tint-rose",
];

const RequireAdmin = ({ children }) => {
  const { isLoading, isError } = useQuery({
    queryKey: ["admin-session"],
    queryFn: fetchAdminSession,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4">
        <div className="rounded-2xl border border-lime-500/20 bg-panel/80 px-6 py-4 text-sm text-slate-200">
          Verifying admin session...
        </div>
      </div>
    );
  }

  if (isError) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

const EventDirectory = () => {
  const [query, setQuery] = useState("");

  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["events-list"],
    queryFn: fetchEvents,
  });

  const enrichedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        timelineState: eventState(event),
      })),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return enrichedEvents;
    }

    return enrichedEvents.filter((event) => {
      const haystack = [event.title, event.strapline]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [enrichedEvents, query]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1320px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <header className="panel-voxel relative overflow-hidden rounded-[2.25rem] border border-emerald-400/20 p-8 shadow-neon-cube sm:p-10">
        <div className="scanline-overlay pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0">
          <img
            src="/logo.png"
            alt="MGU ONE"
            className="h-full w-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,8,20,0.88),rgba(5,8,20,0.58)_45%,rgba(5,8,20,0.84))]" />
          <div className="hero-spectrum absolute inset-0" />
        </div>

        <div className="relative grid gap-8 xl:grid-cols-[1.45fr_0.95fr]">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <div className="panel-spectrum rounded-2xl border border-sky-300/35 p-2 shadow-neon-cube">
                <img
                  src="/logo.png"
                  alt="MGU.ONE"
                  className="h-16 w-20 object-contain sm:h-20 sm:w-24"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">
                  Official MGU.ONE Network
                </p>
                <p className="text-sm text-slate-300">
                  Minecraft Events • Tournaments • Community Showdowns
                </p>
              </div>
            </div>

            <p className="mb-3 inline-flex rounded-full border border-sky-300/45 bg-gradient-to-r from-emerald-500/20 via-cyan-400/20 to-amber-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Minecraft Gamers United Event Board
            </p>
            <h1 className="text-rune-gradient max-w-4xl text-balance text-4xl font-black uppercase leading-[0.9] sm:text-5xl lg:text-6xl">
              Build. Battle. Broadcast.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-100 sm:text-base">
              Bedwars, Survival, The Pit and dedicated tournament realms.
              Explore and join live Minecraft events hosted by MGU.ONE .
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-xl border border-emerald-300/35 bg-gradient-to-br from-emerald-500/20 via-lime-400/10 to-sky-500/15 px-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-400">
                  Active Event Count
                </p>
                <p className="text-2xl font-bold text-emerald-300">
                  {enrichedEvents.length}
                </p>
              </div>
              <div className="rounded-xl border border-amber-300/40 bg-gradient-to-br from-amber-400/20 via-orange-400/12 to-sky-500/16 px-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-400">
                  Event Types
                </p>
                <p className="text-2xl font-bold text-amber-100">
                  PvP • Parkour • Survival • And More
                </p>
              </div>
            </div>
          </div>

          <div className="grid-fabric panel-spectrum rounded-2xl border border-sky-300/30 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Find Your Battleground
            </p>
            <label className="mt-3 block">
              <span className="sr-only">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by event title"
                className="w-full rounded-xl border border-emerald-400/20 bg-slate-900/75 px-3 py-2 text-sm text-ink outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/35"
              />
            </label>

            <div className="mt-4 rounded-xl border border-cyan-300/25 bg-gradient-to-r from-slate-900/65 via-cyan-500/10 to-amber-500/10 p-3">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">
                Queue Status
              </p>
              <p className="mt-1 text-sm text-slate-100">
                Showing {filteredEvents.length}{" "}
                {filteredEvents.length === 1 ? "realm event" : "realm events"}
              </p>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-cyan-100/85">
              Tip: Search modes like "SkyWars", "Anarchy", "UHC" or tournament
              names.
            </p>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-2xl border border-lime-500/10 bg-panel/70"
              />
            ))
          : null}

        {!isLoading && error ? (
          <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-red-500/50 bg-red-500/10 p-5 text-sm text-red-100">
            Unable to load events right now.
          </div>
        ) : null}

        {!isLoading && !error && filteredEvents.length === 0 ? (
          <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-emerald-400/20 bg-panel/75 p-6 text-sm text-slate-200">
            No realm events match this search right now.
          </div>
        ) : null}

        {!isLoading && !error
          ? filteredEvents.map((event, index) => {
              const mainCardImage = event.coverImage || event.cardLogo || "";
              const showCornerLogo = Boolean(
                event.cardLogo && event.cardLogo !== mainCardImage,
              );
              const tintClass =
                eventCardTintClasses[index % eventCardTintClasses.length];

              return (
                <Link
                  key={event._id || event.slug}
                  to={`/${event.slug}`}
                  className={`interactive-chip ${tintClass} group overflow-hidden rounded-2xl border hover:shadow-neon-cube`}
                >
                  <div className="relative h-44 overflow-hidden">
                    {mainCardImage ? (
                      <img
                        src={mainCardImage}
                        alt={event.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_12%_0%,rgba(245,158,11,0.22),transparent_38%),radial-gradient(circle_at_85%_100%,rgba(16,185,129,0.24),transparent_42%),linear-gradient(145deg,#070b19_0%,#0a1228_55%,#111827_100%)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/25 to-transparent" />

                    {showCornerLogo ? (
                      <div className="absolute bottom-3 right-3 rounded-lg border border-amber-300/35 bg-slate-950/80 p-1.5 backdrop-blur">
                        <img
                          src={event.cardLogo}
                          alt={`${event.title} logo`}
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                    ) : null}

                    <span
                      className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                        stateClassMap[event.timelineState]
                      }`}
                    >
                      {event.timelineState}
                    </span>
                  </div>

                  <div className="p-4">
                    <h2 className="text-xl font-bold text-slate-100 transition group-hover:text-amber-200">
                      {event.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-300">
                      {event.strapline ||
                        "Fresh Minecraft server event queued by MGU operators."}
                    </p>
                    <p className="mt-4 text-xs uppercase tracking-wider text-slate-400">
                      {dateRangeLabel(event)}
                    </p>
                    <span className="btn-prism mt-3 inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider">
                      Join Realm Event
                    </span>
                  </div>
                </Link>
              );
            })
          : null}
      </section>
    </main>
  );
};

const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-emerald-400/20 bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-300">
            Copyright © {year} MGU.ONE. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <Link
              to="/legal#terms"
              className="interactive-chip rounded px-1.5 py-0.5 hover:text-amber-200"
            >
              Terms
            </Link>
            <Link
              to="/legal#privacy"
              className="interactive-chip rounded px-1.5 py-0.5 hover:text-amber-200"
            >
              Privacy
            </Link>
            <Link
              to="/legal#cookies"
              className="interactive-chip rounded px-1.5 py-0.5 hover:text-amber-200"
            >
              Cookies
            </Link>
            <Link
              to="/legal#acceptable-use"
              className="interactive-chip rounded px-1.5 py-0.5 hover:text-amber-200"
            >
              Acceptable Use
            </Link>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500">
          MGU.ONE Events is an independent Minecraft community platform. Users
          must comply with tournament rules, platform policies, and applicable
          local regulations.
        </p>
      </div>
    </footer>
  );
};

const App = () => {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<EventDirectory />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Navigate to="/admin/events" replace />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/events"
            element={
              <RequireAdmin>
                <EventBuilderPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/forms"
            element={
              <RequireAdmin>
                <FormBuilderPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/admins"
            element={
              <RequireAdmin>
                <AdminManagementPage />
              </RequireAdmin>
            }
          />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/:slug" element={<EventLandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <SiteFooter />
    </div>
  );
};

export default App;
