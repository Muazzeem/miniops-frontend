import type { Option } from "@/components/miniops/select-search";

/** Matches `Workspace.WorkingDays` in miniops-backend. */
export const WORKING_DAYS = [
  { value: "mon_fri", label: "Monday–Friday" },
  { value: "mon_sat", label: "Monday–Saturday" },
  { value: "sun_thu", label: "Sunday–Thursday" },
  { value: "sat_thu", label: "Saturday–Thursday" },
  { value: "every_day", label: "Every day" },
] as const;
export type WorkingDays = (typeof WORKING_DAYS)[number]["value"];

/** Matches `Workspace.Currency` in miniops-backend. */
export const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "BDT", label: "BDT — Bangladeshi Taka" },
] as const;
export type Currency = (typeof CURRENCIES)[number]["value"];

/** The currency symbol, e.g. "$" for USD or "৳" for BDT. */
export const currencySymbol = (currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? currency;

const offset = (zone: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
    .formatToParts()
    .find((p) => p.type === "timeZoneName")?.value ?? "";

let zones: Option[] | undefined;
/** Every IANA timezone the browser knows, labelled with its current UTC offset (searchable). */
export function timezoneOptions(): Option[] {
  zones ??= ["UTC", ...Intl.supportedValuesOf("timeZone").filter((z) => z !== "UTC")].map(
    (zone) => ({ value: zone, label: `${zone.replaceAll("_", " ")} (${offset(zone)})` }),
  );
  return zones;
}

/** The viewer's own timezone, a sensible default for a new workspace. */
export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
