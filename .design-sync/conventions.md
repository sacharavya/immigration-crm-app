# BBI CRM conventions

BBI is an immigration-consulting CRM (cases, clients, checklists, retainers, appointments). Its UI is shadcn-style components on Base UI primitives, styled with Tailwind v4 utilities and CSS variables. Dense, square, quiet: `--radius: 0` (every corner is sharp, `rounded-*` utilities resolve to 0) and all box-shadows are disabled globally. Do not fake rounding or shadows.

## Setup

No provider is needed. Load `styles.css` and `_ds_bundle.js`; every component reads its colors from CSS variables on `:root`. Dark mode: put class `dark` on any ancestor. Body text is Inter (`--font-inter`, applied to `body`); headings use `font-heading` (Geist). Both families load from Google Fonts through `styles.css`.

## Components on `window.BBI`

- `Button` (`variant`: default, outline, secondary, ghost, destructive, link; `size`: xs, sm, default, lg, icon, icon-xs, icon-sm, icon-lg). Icons inside a button need `data-icon="inline-start"` or `"inline-end"` for correct padding.
- `Badge` (same `variant` set minus sizes). Status pills: default = active, secondary = neutral, destructive = overdue, outline = category.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`; `size="sm"` for tiles.
- `Input` (all HTML input props; `type="date"` automatically renders `DateInput`, a masked YYYY-MM-DD field with a calendar button), `Label`, `Separator` (`orientation`).
- `Field`, `FieldLabel`, `FieldDescription`, `FieldError` (`errors={[{message}]}`), `FieldGroup`, `FieldSet`, `FieldLegend`, `FieldSeparator`, `FieldContent`, `FieldTitle`. Set `data-invalid` on `Field` plus `aria-invalid` on the input for the error state.
- `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`.
- `Dialog` (`open`, `onOpenChange`), `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` (`showCloseButton`), `DialogClose` (use `render={<Button variant="outline" />}` to style it).

## Styling idiom: Tailwind utilities with semantic color names

Use only classes that exist in `styles.css` (its `@import` of `_ds_bundle.css` is the compiled Tailwind output; grep it when unsure). Never write raw hex.

| Purpose | Classes |
|---|---|
| Action / brand blue | `bg-primary text-primary-foreground`, `text-primary`, `border-primary` |
| Page and cards | `bg-background text-foreground`, `bg-card text-card-foreground`, `border-border` |
| Secondary text and fills | `text-muted-foreground`, `bg-muted`, `bg-secondary text-secondary-foreground` |
| Selected / highlighted | `bg-accent text-accent-foreground` |
| Danger | `text-destructive`, `bg-destructive/10` (soft), `bg-destructive text-destructive-foreground` |
| Status fills | `bg-[var(--success-subtle)] text-[var(--success-text)]`, `bg-[var(--warning-subtle)] text-[var(--warning-text)]` |
| Brand scales | `bg-navy-50 … bg-navy-900`, `text-navy-700`, `text-gold`, `bg-maple-500` |
| Sidebar | `bg-sidebar text-sidebar-foreground` |
| Type | `text-xs text-sm text-base text-lg text-2xl`, `font-medium font-semibold`, `font-heading` |
| Layout | `flex grid gap-2 gap-4 p-4 px-4 w-full max-w-md grid-cols-2 items-center justify-between border-b` |

Tokens live on `:root` in `_ds_bundle.css` as `--primary`, `--muted-foreground`, `--navy-700`, `--gold`, `--success-subtle`, and so on; `var(--name)` works anywhere a class does not exist.

## Idiomatic snippet

```jsx
const { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, Badge, Button } = window.BBI;

<Card className="w-96">
  <CardHeader>
    <CardTitle>Spousal sponsorship, inland</CardTitle>
    <CardDescription>File BBI-2026-0142 opened 14 Mar 2026</CardDescription>
    <CardAction><Badge>In progress</Badge></CardAction>
  </CardHeader>
  <CardContent>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Applicant</dt><dd>Mateo Alvarez</dd>
      <dt className="text-muted-foreground">Next deadline</dt><dd>Police certificate, 30 Sep</dd>
    </dl>
  </CardContent>
  <CardFooter className="gap-2">
    <Button size="sm">Open case</Button>
    <Button size="sm" variant="outline">Send checklist</Button>
  </CardFooter>
</Card>
```
