import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RegisterPage } from "@/features/auth";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Create your account — MiniOps" },
      { name: "description", content: "Sign up for MiniOps." },
    ],
  }),
  component: function RegisterRoute() {
    const { next } = Route.useSearch();
    return <RegisterPage next={next} />;
  },
});
