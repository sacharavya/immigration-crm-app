import * as React from "react";
import { Input, Label } from "bbi-temp";

export const Default = () => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="in-name">Full legal name</Label>
    <Input id="in-name" placeholder="As shown on passport" />
  </div>
);

export const Types = () => (
  <div className="flex w-72 flex-col gap-3">
    <Input type="email" placeholder="client@example.com" />
    <Input type="tel" placeholder="+1 604 555 0142" />
    <Input type="number" placeholder="UCI number" />
    <Input type="search" placeholder="Search cases" />
  </div>
);

export const DateField = () => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="in-dob">Date of birth</Label>
    <Input id="in-dob" type="date" defaultValue="1991-08-23" />
  </div>
);

export const States = () => (
  <div className="flex w-72 flex-col gap-3">
    <Input defaultValue="Mateo Alvarez" readOnly />
    <Input placeholder="Disabled" disabled />
    <Input defaultValue="A123" aria-invalid />
  </div>
);
