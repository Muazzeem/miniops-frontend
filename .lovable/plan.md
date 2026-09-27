# MiniOps Premium Violet Visual Upgrade

## Goal
Polish the existing Employer experience into a modern, premium financial operations workspace while preserving every current workflow and feature.

## Implementation
- Rework the global visual system around MiniOps violet, layered neutral surfaces, semantic profit/warning/risk colors, Geist typography, refined radii, borders, shadows, focus states, and restrained motion.
- Upgrade the landing hero first: preserve its two-column structure and exact messaging, add subtle violet depth, strengthen headline hierarchy, and make the existing product preview more vivid and legible.
- Refine the application shell: white premium sidebar, tinted workspace selector, clearer active navigation, soft search field, notification indicator, and improved mobile behavior.
- Redesign the Overview presentation without changing its data or calculations: expressive KPI cards, clearer charts, semantic project health, a distinctive profit-leakage panel, and a softly tinted leads-attention panel.
- Apply the same shared card, table, input, filter, tab, modal, empty-state, and notification language across Projects, Tasks, Clients, Leads, Team, Time, Expenses, Subscriptions, Reports, Settings, and Billing.
- Audit shared selectors to prevent style leakage, preserve reduced-motion behavior, and verify no overflow or overlap at 1440, 1280, 1024, 768, and 390px.

## Technical details
- Keep all colors and shadows as semantic tokens in the global design system; components consume those tokens rather than hardcoded colors.
- Use existing Lucide icons and existing frontend state only; no new product modules, persistence, services, or architecture changes.
- Validate the landing page, Overview, key data pages, dialogs, and responsive navigation after implementation.
