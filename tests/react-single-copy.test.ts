// Regression: "Cannot read properties of null (reading 'useRef')" in TooltipProvider
// happens when Radix resolves a different React copy than the app. Ensure one copy.
import { expect, test } from "bun:test";
import { createRequire } from "node:module";
import path from "node:path";
const root = createRequire(path.resolve("package.json"));
test("radix tooltip and app share one React", () => {
  const tooltip = createRequire(root.resolve("@radix-ui/react-tooltip"));
  expect(tooltip.resolve("react")).toBe(root.resolve("react"));
  expect(tooltip.resolve("react-dom")).toBe(root.resolve("react-dom"));
});
