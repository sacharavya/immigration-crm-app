Field from bbi-temp. Use via `window.BBI.Field` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface FieldProps {
orientation?: "vertical" | "horizontal" | "responsive"; "data-invalid"?: boolean; "data-disabled"?: boolean; className?: string; children?: React.ReactNode; [key: string]: unknown;
}
```

## Examples

### VerticalForm

```jsx
() => (
  <FieldGroup className="w-80">
    <Field>
      <FieldLabel htmlFor="f-name">Full legal name</FieldLabel>
      <Input id="f-name" placeholder="As shown on passport" />
      <FieldDescription>Include all given names.</FieldDescription>
    </Field>
    <Field>
      <FieldLabel htmlFor="f-uci">UCI number</FieldLabel>
      <Input id="f-uci" placeholder="0000-0000" />
      <FieldDescription>Found on any IRCC letter. Leave blank if this is a first application.</FieldDescription>
    </Field>
    <Button className="self-start">Continue</Button>
  </FieldGroup>
)
```

### WithError

```jsx
() => (
  <Field data-invalid className="w-80">
    <FieldLabel htmlFor="f-pass">Passport number</FieldLabel>
    <Input id="f-pass" defaultValue="AB12" aria-invalid />
    <FieldError errors={[{ message: "Passport numbers are 8 or 9 characters." }]} />
  </Field>
)
```

### HorizontalChoice

```jsx
() => (
  <Field orientation="horizontal" className="w-80">
    <input type="checkbox" id="f-consent" defaultChecked className="mt-0.5 size-4 accent-primary" />
    <FieldContent>
      <FieldTitle>Use of representative</FieldTitle>
      <FieldDescription>Authorize BBI to communicate with IRCC on your behalf (IMM 5476).</FieldDescription>
    </FieldContent>
  </Field>
)
```

### Grouped

```jsx
() => (
  <FieldSet className="w-80">
    <FieldLegend>Contact</FieldLegend>
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="f-email">Email</FieldLabel>
        <Input id="f-email" type="email" placeholder="client@example.com" />
      </Field>
      <FieldSeparator>or</FieldSeparator>
      <Field>
        <FieldLabel htmlFor="f-phone">Phone</FieldLabel>
        <Input id="f-phone" type="tel" placeholder="+1 604 555 0142" />
      </Field>
    </FieldGroup>
  </FieldSet>
)
```
