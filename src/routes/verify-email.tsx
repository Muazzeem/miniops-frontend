import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { VerifyEmailPage } from "@/features/auth";

export const Route = createFileRoute("/verify-email")({
  validateSearch: z.object({ token: z.string().optional(), next: z.string().optional() }),
  head: () => ({
    meta: [{ title: "Confirm your email — MiniOps" }, { name: "robots", content: "noindex" }],
  }),
  component: function VerifyEmailRoute() {
    const { token, next } = Route.useSearch();
    return <VerifyEmailPage token={token} next={next} />;
  },
});
