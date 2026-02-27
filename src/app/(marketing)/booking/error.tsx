"use client";

export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-900 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-100">
        <h2 className="text-xl font-extrabold">Buchung konnte nicht geladen werden</h2>
        <p className="mt-2 text-sm font-semibold">{error.message || "Unerwarteter Fehler."}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-xl border border-red-400/70 bg-white px-4 py-2 text-sm font-bold text-red-800 dark:bg-transparent dark:text-red-100"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
