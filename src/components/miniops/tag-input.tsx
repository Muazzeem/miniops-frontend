import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Mirrors the API: tasks/models.py MAX_TAGS / MAX_TAG_LENGTH.
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

/** Tags are stored lowercase with single spaces, like the API does. */
const normalizeTag = (tag: string) =>
  tag.split(/\s+/).filter(Boolean).join(" ").toLowerCase().slice(0, MAX_TAG_LENGTH);

/** Read-only tag chips. */
export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium leading-4 text-primary"
        >
          {t}
        </span>
      ))}
    </span>
  );
}

/** Type a tag and press Enter or comma to add it; `suggestions` are tags already in use. */
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag…",
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const auto = useId();
  const listId = `${id ?? auto}-suggestions`;
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const full = value.length >= MAX_TAGS;
  const term = normalizeTag(text);
  const matches = suggestions
    .filter((s) => !value.includes(s) && (!term || s.includes(term)))
    .slice(0, 8);

  function add(raw: string) {
    const tag = normalizeTag(raw);
    if (tag && !value.includes(tag) && !full) onChange([...value, tag]);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="relative">
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[10px] bg-card px-2 py-1.5 shadow-[0_0_0_1px_var(--input)] focus-within:shadow-[0_0_0_1px_var(--primary),0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)] sm:min-h-10">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-0.5 pl-2 pr-1 text-xs font-medium text-primary"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="grid size-4 place-items-center rounded-full hover:bg-primary/15"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          // Add what was typed when leaving the field, after a suggestion click lands.
          onBlur={() => {
            setFocused(false);
            add(text);
          }}
          disabled={full}
          placeholder={full ? `Up to ${MAX_TAGS} tags` : value.length ? "" : placeholder}
          maxLength={MAX_TAG_LENGTH}
          role="combobox"
          aria-expanded={focused && matches.length > 0}
          aria-controls={listId}
          autoComplete="off"
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {focused && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-2xl border border-border/60 bg-popover p-1 shadow-modal"
        >
          {matches.map((s) => (
            <li key={s} role="option" aria-selected={false}>
              <button
                type="button"
                // mousedown fires before the input's blur, so the click isn't lost.
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(s);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-primary-soft"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
