"use client";

import { createContext, useContext } from "react";

export type DashboardProfile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  agency_id: string | null;
  role: string | null;
  agency_name: string | null;
};

type DashboardProfileState = {
  profile: DashboardProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DashboardProfileContext = createContext<DashboardProfileState | null>(
  null
);

export function useDashboardProfile() {
  const ctx = useContext(DashboardProfileContext);
  if (!ctx) {
    throw new Error(
      "useDashboardProfile must be used within DashboardProfileContext"
    );
  }
  return ctx;
}

export { DashboardProfileContext };
