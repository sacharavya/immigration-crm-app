Table from bbi-temp. Use via `window.BBI.Table` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TableProps {
className?: string; children?: React.ReactNode; [key: string]: unknown;
}
```

## Examples

### Cases

```jsx
() => (
  <Table>
    <TableCaption>Open cases, sorted by next deadline.</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>File</TableHead>
        <TableHead>Client</TableHead>
        <TableHead>Program</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Next deadline</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((r) => (
        <TableRow key={r.file}>
          <TableCell className="font-medium">{r.file}</TableCell>
          <TableCell>{r.client}</TableCell>
          <TableCell>{r.program}</TableCell>
          <TableCell><Badge variant={r.status === "Awaiting documents" ? "destructive" : r.status === "Submitted" ? "secondary" : "default"}>{r.status}</Badge></TableCell>
          <TableCell className="text-right text-muted-foreground">{r.due || "None"}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)
```

### FeesWithFooter

```jsx
() => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Instalment</TableHead>
        <TableHead>Due</TableHead>
        <TableHead className="text-right">Amount</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow><TableCell>Retainer</TableCell><TableCell>Paid 12 Mar 2026</TableCell><TableCell className="text-right">$2,500.00</TableCell></TableRow>
      <TableRow><TableCell>On submission</TableCell><TableCell>1 Oct 2026</TableCell><TableCell className="text-right">$2,000.00</TableCell></TableRow>
      <TableRow><TableCell>On decision</TableCell><TableCell>TBD</TableCell><TableCell className="text-right">$1,500.00</TableCell></TableRow>
    </TableBody>
    <TableFooter>
      <TableRow><TableCell colSpan={2}>Total</TableCell><TableCell className="text-right">$6,000.00</TableCell></TableRow>
    </TableFooter>
  </Table>
)
```
