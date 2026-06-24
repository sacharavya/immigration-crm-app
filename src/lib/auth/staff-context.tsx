"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  staffCan,
  type Permission,
  type StaffWithOverrides,
} from "./permissions";

const StaffContext = createContext<StaffWithOverrides | null>(null);

export function StaffProvider({
  staff,
  children,
}: {
  staff: StaffWithOverrides;
  children: ReactNode;
}) {
  return (
    <StaffContext.Provider value={staff}>{children}</StaffContext.Provider>
  );
}

/**
 * Read the active staff record. Throws if used outside the (staff) layout
 * — that's deliberate. If a component renders outside the authenticated
 * tree, the bug is upstream and a thrown error surfaces it loudly.
 */
export function useStaff(): StaffWithOverrides {
  const staff = useContext(StaffContext);
  if (!staff) {
    throw new Error(
      "useStaff() must be called inside the (staff) layout's StaffProvider",
    );
  }
  return staff;
}
