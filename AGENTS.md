<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep all mock operational data inside the workspace-scoped MiniOps provider so switching agencies never mixes visible records or financial totals.
- Chat, notifications and profile live in `src/data/ops.ts` (seed/services) and the MiniOps store; chat and notifications are keyed per workspace — keeps UI backend-ready and workspaces isolated.
- /billing, /notifications and /reports* redirect (Billing → Settings, others → /app); header bell/avatar replace sidebar entries — product is operations-first.
- All date/time fields use DateInput/TimeInput from src/components/miniops/date-time.tsx (ISO values, 'Sep 29, 2026' display) — one consistent picker + typing behavior.
