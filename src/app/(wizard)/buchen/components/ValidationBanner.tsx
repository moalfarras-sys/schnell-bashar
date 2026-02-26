import { CircleAlert } from "lucide-react";

export function ValidationBanner(props: { errors: string[] }) {
  if (!props.errors.length) return null;

  return (
    <div className="booking-glass-card booking-motion-pop booking-error-inline mb-6 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="text-sm font-extrabold">Bitte pruefen Sie die markierten Angaben:</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs sm:text-sm">
            {props.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
