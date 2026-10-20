import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LoginPage } from "@/features/auth";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Log in — MiniOps" },
      { name: "description", content: "Log in to your MiniOps workspace." },
    ],
  }),
  component: function LoginRoute() {
    const { next } = Route.useSearch();
    return <LoginPage next={next} />;
  },
});
