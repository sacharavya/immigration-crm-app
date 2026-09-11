import * as React from "react";
import { Button } from "bbi-temp";
import { Plus, Download, Trash2, ArrowRight } from "lucide-react";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Button>Save case</Button>
    <Button variant="outline">Cancel</Button>
    <Button variant="secondary">Assign agent</Button>
    <Button variant="ghost">View history</Button>
    <Button variant="destructive">Delete draft</Button>
    <Button variant="link">Open client portal</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Button size="xs">Extra small</Button>
    <Button size="sm">Small</Button>
    <Button>Default</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const WithIcons = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Button><Plus data-icon="inline-start" />New client</Button>
    <Button variant="outline">Export CSV<Download data-icon="inline-end" /></Button>
    <Button variant="secondary">Next step<ArrowRight data-icon="inline-end" /></Button>
    <Button size="icon" variant="outline" aria-label="Download"><Download /></Button>
    <Button size="icon-sm" variant="ghost" aria-label="Delete"><Trash2 /></Button>
  </div>
);

export const Disabled = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Button disabled>Submitting...</Button>
    <Button variant="outline" disabled>Cancel</Button>
    <Button variant="destructive" disabled>Delete draft</Button>
  </div>
);
