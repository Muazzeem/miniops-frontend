import { createFileRoute } from "@tanstack/react-router";
import { Team } from "@/features/team";
const TEAM_HIDDEN = false;
export const Route = createFileRoute("/_workspace/team/")({
  head: () => ({
    meta: [
      { title: "Team — MiniOps" },
      { name: "description", content: "Manage team capacity and access." },
      { property: "og:title", content: "Team — MiniOps" },
      { property: "og:description", content: "Manage team capacity and access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (TEAM_HIDDEN ? <div /> : <Team />),
});
