import * as React from "react";
import { Label, Input } from "bbi-temp";

export const WithInput = () => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="lb-email">Email address</Label>
    <Input id="lb-email" type="email" placeholder="client@example.com" />
  </div>
);

export const Required = () => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="lb-uci">UCI number <span className="text-destructive">*</span></Label>
    <Input id="lb-uci" placeholder="0000-0000" />
  </div>
);

export const WithCheckbox = () => (
  <Label className="gap-2">
    <input type="checkbox" defaultChecked className="size-4 accent-primary" />
    Client consents to e-signature
  </Label>
);
