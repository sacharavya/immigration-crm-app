Separator from bbi-temp. Use via `window.BBI.Separator` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SeparatorProps {
orientation?: "horizontal" | "vertical"; className?: string; [key: string]: unknown;
}
```

## Examples

### Horizontal

```jsx
() => (
  <div className="w-80 text-sm">
    <div className="font-medium">Retainer agreement</div>
    <div className="text-muted-foreground">Signed 12 Mar 2026</div>
    <Separator className="my-3" />
    <div className="font-medium">Fee schedule</div>
    <div className="text-muted-foreground">Three instalments, first paid</div>
  </div>
)
```

### Vertical

```jsx
() => (
  <div className="flex h-5 items-center gap-3 text-sm">
    <span>Cases</span>
    <Separator orientation="vertical" />
    <span>Clients</span>
    <Separator orientation="vertical" />
    <span>Appointments</span>
  </div>
)
```
