import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ResetPasswordPage } from "@/features/auth";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ uid: z.string().optional(), token: z.string().optional() }),
  head: () => ({
    meta: [{ title: "Choose a new password — MiniOps" }, { name: "robots", content: "noindex" }],
  }),
  component: function ResetPasswordRoute() {
    const { uid, token } = Route.useSearch();
    return <ResetPasswordPage uid={uid} token={token} />;
  },
});
