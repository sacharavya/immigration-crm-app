Label from bbi-temp. Use via `window.BBI.Label` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface LabelProps {
htmlFor?: string; className?: string; children?: React.ReactNode; [key: string]: unknown;
}
```

## Examples

### WithInput

```jsx
() => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="lb-email">Email address</Label>
    <Input id="lb-email" type="email" placeholder="client@example.com" />
  </div>
)
```

### Required

```jsx
() => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="lb-uci">UCI number <span className="text-destructive">*</span></Label>
    <Input id="lb-uci" placeholder="0000-0000" />
  </div>
)
```

### WithCheckbox

```jsx
() => (
  <Label className="gap-2">
    <input type="checkbox" defaultChecked className="size-4 accent-primary" />
    Client consents to e-signature
  </Label>
)
```
