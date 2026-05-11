// Read-only render of a checklist (groups + items). Shared between the case
// detail Documents tab (live data) and the variant editor's preview pane
// (data the staff is editing). The live-data variant adds upload affordances;
// this preview is purely structural.

export type ChecklistPreviewItem = {
  id: string;
  documentLabel: string;
  conditionLabel: string | null;
  instructions: string | null;
};

export type ChecklistPreviewGroup = {
  code: string;
  name: string;
  displayOrder: number;
  items: ChecklistPreviewItem[];
};

export function ChecklistPreview({
  groups,
  emptyText = "This checklist is empty.",
}: {
  groups: ChecklistPreviewGroup[];
  emptyText?: string;
}) {
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.code}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            {g.name}
          </h3>
          <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
            {g.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <span
                  aria-hidden
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full border-2 border-dashed border-stone-300"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-stone-900">
                    {item.documentLabel}
                  </div>
                  {item.conditionLabel && (
                    <div className="mt-0.5 text-xs text-stone-500">
                      {item.conditionLabel}
                    </div>
                  )}
                  {item.instructions && (
                    <div className="mt-0.5 text-xs text-stone-500">
                      {item.instructions}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
