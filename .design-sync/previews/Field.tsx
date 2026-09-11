import * as React from "react";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldSet, FieldLegend, FieldSeparator, FieldContent, FieldTitle, Input, Button } from "bbi-temp";

export const VerticalForm = () => (
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
);

export const WithError = () => (
  <Field data-invalid className="w-80">
    <FieldLabel htmlFor="f-pass">Passport number</FieldLabel>
    <Input id="f-pass" defaultValue="AB12" aria-invalid />
    <FieldError errors={[{ message: "Passport numbers are 8 or 9 characters." }]} />
  </Field>
);

export const HorizontalChoice = () => (
  <Field orientation="horizontal" className="w-80">
    <input type="checkbox" id="f-consent" defaultChecked className="mt-0.5 size-4 accent-primary" />
    <FieldContent>
      <FieldTitle>Use of representative</FieldTitle>
      <FieldDescription>Authorize BBI to communicate with IRCC on your behalf (IMM 5476).</FieldDescription>
    </FieldContent>
  </Field>
);

export const Grouped = () => (
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
);
