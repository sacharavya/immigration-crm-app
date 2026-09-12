DateInput from bbi-temp. Use via `window.BBI.DateInput` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DateInputProps {
value?: string; defaultValue?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>; name?: string; id?: string; placeholder?: string; disabled?: boolean; required?: boolean; min?: string; max?: string; className?: string; [key: string]: unknown;
}
```

## Examples

### Default

```jsx
() => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="di-1">Passport expiry</Label>
    <DateInput id="di-1" defaultValue="2031-05-02" />
  </div>
)
```

### Empty

```jsx
() => (
  <div className="w-72"><DateInput name="entry_date" /></div>
)
```

### Bounded

```jsx
() => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="di-3">Intended arrival (2026 only)</Label>
    <DateInput id="di-3" min="2026-01-01" max="2026-12-31" defaultValue="2026-11-15" />
  </div>
)
```

### Disabled

```jsx
() => (
  <div className="w-72"><DateInput defaultValue="2024-02-29" disabled /></div>
)
```
