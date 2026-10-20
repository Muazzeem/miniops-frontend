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
