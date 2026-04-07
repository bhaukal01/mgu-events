import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import DynamicRenderer from "../components/DynamicRenderer.jsx";

const fetchEventBySlug = async (slug) => {
  const response = await api.get(`/events/${slug}`);
  return response.data;
};

const EventLandingPage = () => {
  const { slug } = useParams();

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event-detail", slug],
    queryFn: () => fetchEventBySlug(slug),
    enabled: Boolean(slug),
  });

  const eventWindow = useMemo(() => {
    if (!event) {
      return "";
    }

    const startsAt = event.startsAt ? new Date(event.startsAt) : null;
    const endsAt = event.endsAt ? new Date(event.endsAt) : null;

    if (!startsAt && !endsAt) {
      return "Open world window";
    }

    if (startsAt && !endsAt) {
      return `Starts ${startsAt.toLocaleString()}`;
    }

    if (!startsAt && endsAt) {
      return `Ends ${endsAt.toLocaleString()}`;
    }

    return `${startsAt.toLocaleDateString()} - ${endsAt.toLocaleDateString()}`;
  }, [event]);

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 h-10 w-52 animate-pulse rounded-xl bg-slate-800/70" />
        <div className="h-72 animate-pulse rounded-3xl border border-lime-500/15 bg-panel/60" />
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center px-4 py-10 sm:px-6">
        <p className="mb-2 text-xs uppercase tracking-wider text-red-300">
          Realm Lookup Error
        </p>
        <h1 className="text-3xl font-black text-ink">Unable to Open Realm</h1>
        <p className="mt-3 text-sm text-slate-300">
          The requested Minecraft event is not available right now.
        </p>
        <Link
          to="/"
          className="btn-prism mt-6 inline-flex rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-wider"
        >
          Back to Realms
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="interactive-chip inline-flex rounded-lg border border-emerald-400/20 bg-panel/80 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-amber-200"
        >
          Back to all realm events
        </Link>
      </div>

      <section className="panel-voxel mb-6 overflow-hidden rounded-3xl border border-emerald-400/20 bg-panel/80">
        <div className="relative min-h-[220px] px-6 py-8 sm:px-10 sm:py-10">
          <img
            src="/branding/mgu-one-logo.svg"
            alt="MGU ONE"
            className="absolute inset-0 h-full w-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050815]/90 via-[#050815]/80 to-[#050815]/92" />
          <div className="relative">
            <p className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-200">
              Minecraft Event Arena
            </p>
            <h1 className="text-rune-gradient mt-3 text-3xl font-black uppercase sm:text-4xl">
              {event.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-100 sm:text-base">
              {eventWindow} • Gather your crew, lock your loadout, and enter the
              bracket.
            </p>
          </div>
        </div>
      </section>

      <DynamicRenderer event={event} />
    </main>
  );
};

export default EventLandingPage;
