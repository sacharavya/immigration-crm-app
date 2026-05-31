import { CalendarDays } from "lucide-react";

// PART D placeholder. The list view is the v1 deliverable; week-grid
// calendar is a polish pass once the firm is using the list comfortably.
// Switch on by replacing this component's body with a CSS-grid week view.
export function AppointmentsCalendar() {
  return (
    <div className="rounded-md border border-dashed border-stone-200 bg-stone-50 px-6 py-12 text-center">
      <CalendarDays className="mx-auto h-8 w-8 text-stone-400" />
      <p className="mt-3 text-sm font-medium text-stone-700">
        Calendar view coming soon
      </p>
      <p className="mt-1 text-xs text-stone-500">
        Use the list view for now — it shows everything in chronological order
        with the same filters.
      </p>
    </div>
  );
}
