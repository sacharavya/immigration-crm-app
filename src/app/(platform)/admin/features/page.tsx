import { Card, CardContent } from "@/components/ui/card";
import { getFeatureCatalogue } from "@/lib/tenant/server";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  const catalogue = await getFeatureCatalogue();

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-xl font-semibold text-stone-900">Features</h1>
        <p className="mt-1 text-sm text-stone-600">
          The switch list every firm is configured against. A firm with no
          explicit setting follows the default here.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Feature</th>
                <th className="px-4 py-2.5 font-medium">Key</th>
                <th className="px-4 py-2.5 font-medium">Default</th>
              </tr>
            </thead>
            <tbody>
              {catalogue.map((f) => (
                <tr key={f.key} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900">{f.label}</div>
                    <div className="text-xs text-stone-500">{f.description}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600">
                    {f.key}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {f.default_enabled ? "On" : "Off"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-stone-500">
        Adding a row to the feature catalogue in the database makes a new
        switch appear on every firm&apos;s page automatically.
      </p>
    </div>
  );
}
