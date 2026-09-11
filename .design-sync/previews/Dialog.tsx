import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, Button, Field, FieldLabel, Input } from "bbi-temp";

export const Confirm = () => (
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Archive this case?</DialogTitle>
        <DialogDescription>BBI-2025-0981 will move to the archive. The client portal stays readable but no further documents can be uploaded.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Keep open</DialogClose>
        <Button variant="destructive">Archive case</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const WithForm = () => (
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add a referral agent</DialogTitle>
        <DialogDescription>Agents get a scoped login and see only the clients they referred.</DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="d-agency">Agency name</FieldLabel>
        <Input id="d-agency" placeholder="Northern Path Consulting" />
      </Field>
      <Field>
        <FieldLabel htmlFor="d-email">Contact email</FieldLabel>
        <Input id="d-email" type="email" placeholder="agent@example.com" />
      </Field>
      <DialogFooter showCloseButton>
        <Button>Send invite</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
