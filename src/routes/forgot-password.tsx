import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/features/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — MiniOps" }] }),
  component: ForgotPasswordPage,
});
