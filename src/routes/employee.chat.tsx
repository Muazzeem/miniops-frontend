import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ChatPage } from "@/features/chat";

export const Route = createFileRoute("/employee/chat")({
  validateSearch: z.object({ c: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Chat — MiniOps" },
      { name: "description", content: "Message your teammates." },
    ],
  }),
  component: function EmployeeChatRoute() {
    const { c } = Route.useSearch();
    // Cancel the employee shell's page padding so chat fills the screen.
    return (
      <ChatPage key={c ?? "chat"} initial={c} className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8" />
    );
  },
});
