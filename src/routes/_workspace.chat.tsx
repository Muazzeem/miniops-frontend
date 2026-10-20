import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ChatPage } from "@/features/chat";
const CHAT_HIDDEN = false;
export const Route = createFileRoute("/_workspace/chat")({
  validateSearch: z.object({ c: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Team Chat — MiniOps" },
      { name: "description", content: "Message your agency team and project groups in one place." },
      { property: "og:title", content: "Team Chat — MiniOps" },
      {
        property: "og:description",
        content: "Message your agency team and project groups in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatRoute,
});
function ChatRoute() {
  const { c } = Route.useSearch();
  return CHAT_HIDDEN ? <div /> : <ChatPage key={c ?? "chat"} initial={c} />;
}
