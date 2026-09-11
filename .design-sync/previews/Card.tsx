import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, Badge, Button, Separator } from "bbi-temp";

export const CaseSummary = () => (
  <Card className="w-96">
    <CardHeader>
      <CardTitle>Spousal sponsorship, inland</CardTitle>
      <CardDescription>File BBI-2026-0142 opened 14 Mar 2026</CardDescription>
      <CardAction><Badge>In progress</Badge></CardAction>
    </CardHeader>
    <CardContent>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">Applicant</dt><dd>Mateo Alvarez</dd>
        <dt className="text-muted-foreground">Sponsor</dt><dd>Hannah Alvarez</dd>
        <dt className="text-muted-foreground">Next deadline</dt><dd>Police certificate, 30 Sep</dd>
        <dt className="text-muted-foreground">Agent</dt><dd>Northern Path Consulting</dd>
      </dl>
    </CardContent>
    <CardFooter className="gap-2">
      <Button size="sm">Open case</Button>
      <Button size="sm" variant="outline">Send checklist</Button>
    </CardFooter>
  </Card>
);

export const Small = () => (
  <Card size="sm" className="w-72">
    <CardHeader>
      <CardTitle>Upcoming appointments</CardTitle>
      <CardDescription>This week</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      <div className="flex justify-between"><span>Consultation, Lin Wei</span><span className="text-muted-foreground">Tue 10:00</span></div>
      <Separator />
      <div className="flex justify-between"><span>Biometrics prep, Omar Haddad</span><span className="text-muted-foreground">Thu 14:30</span></div>
    </CardContent>
  </Card>
);

export const Stat = () => (
  <div className="flex gap-3">
    <Card size="sm" className="w-40">
      <CardHeader><CardDescription>Open cases</CardDescription><CardTitle className="text-2xl">38</CardTitle></CardHeader>
    </Card>
    <Card size="sm" className="w-40">
      <CardHeader><CardDescription>Fees outstanding</CardDescription><CardTitle className="text-2xl">$12,450</CardTitle></CardHeader>
    </Card>
  </div>
);
