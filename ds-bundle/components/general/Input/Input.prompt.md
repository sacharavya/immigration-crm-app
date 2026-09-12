Input from bbi-temp. Use via `window.BBI.Input` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface InputProps {
type?: string; value?: string; defaultValue?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>; placeholder?: string; name?: string; id?: string; disabled?: boolean; required?: boolean; readOnly?: boolean; "aria-invalid"?: boolean; className?: string; [key: string]: unknown;
}
```

## Examples

### Default

```jsx
() => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="in-name">Full legal name</Label>
    <Input id="in-name" placeholder="As shown on passport" />
  </div>
)
```

### Types

```jsx
() => (
  <div className="flex w-72 flex-col gap-3">
    <Input type="email" placeholder="client@example.com" />
    <Input type="tel" placeholder="+1 604 555 0142" />
    <Input type="number" placeholder="UCI number" />
    <Input type="search" placeholder="Search cases" />
  </div>
)
```

### DateField

```jsx
() => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="in-dob">Date of birth</Label>
    <Input id="in-dob" type="date" defaultValue="1991-08-23" />
  </div>
)
```

### States

```jsx
() => (
  <div className="flex w-72 flex-col gap-3">
    <Input defaultValue="Mateo Alvarez" readOnly />
    <Input placeholder="Disabled" disabled />
    <Input defaultValue="A123" aria-invalid />
  </div>
)
```
