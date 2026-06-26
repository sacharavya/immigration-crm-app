import { cn } from "@/lib/utils/index";

import { initials, staffName } from "./team";

// The RCIC reads as the accountable person, so it uses the primary fill with
// white initials. Workers use the neutral accent wash. Avatars are decorative
// (aria-hidden) and always paired with the visible name.
export function TeamAvatar({
  member,
  variant,
  className,
}: {
  member: { first_name: string; last_name: string };
  variant: "rcic" | "worker";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        variant === "rcic"
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {initials(staffName(member))}
    </span>
  );
}

// The role pill. Text carries the meaning (RCIC / Worker), never color alone.
export function RoleTag({ variant }: { variant: "rcic" | "worker" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        variant === "rcic"
          ? "bg-accent text-navy-700"
          : "bg-muted text-muted-foreground",
      )}
    >
      {variant === "rcic" ? "RCIC" : "Worker"}
    </span>
  );
}
