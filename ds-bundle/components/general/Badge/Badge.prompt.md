Badge from bbi-temp. Use via `window.BBI.Badge` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface BadgeProps {
variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"; className?: string; children?: React.ReactNode; render?: React.ReactElement; [key: string]: unknown;
}
```

## Examples

### Variants

```jsx
() => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge>Active</Badge>
    <Badge variant="secondary">Draft</Badge>
    <Badge variant="destructive">Overdue</Badge>
    <Badge variant="outline">Study Permit</Badge>
    <Badge variant="ghost">Archived</Badge>
    <Badge variant="link">View file</Badge>
  </div>
)
```

### WithIcons

```jsx
() => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="secondary"><Clock data-icon="inline-start" />Awaiting documents</Badge>
    <Badge><CheckCircle2 data-icon="inline-start" />Retainer signed</Badge>
  </div>
)
```

### CaseStatusRow

```jsx
() => (
  <div className="flex w-80 items-center justify-between rounded-lg border p-3 text-sm">
    <div>
      <div className="font-medium">Priya Raman</div>
      <div className="text-muted-foreground">Express Entry, CRS 487</div>
    </div>
    <Badge>ITA received</Badge>
  </div>
)
```
