import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, Clock3, X } from "lucide-react";
import { addDays, format, isValid, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DISPLAY = "MMM d, yyyy";
const PARSE_FORMATS = [
  "MM/dd/yyyy",
  "M/d/yyyy",
  "yyyy-MM-dd",
  "MMM d, yyyy",
  "MMM d yyyy",
  "MMMM d, yyyy",
  "MM-dd-yyyy",
];

/** Shared MiniOps date helpers — ISO internally, "Sep 29, 2026" in the UI. */
export const toIso = (d: Date) => format(d, "yyyy-MM-dd");
export const fromIso = (v: string) => {
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
};
export const displayDate = (v: string) => {
  const d = fromIso(v);
  return d ? format(d, DISPLAY) : "";
};
export function parseDateText(text: string) {
  const t = text.trim();
  for (const f of PARSE_FORMATS) {
    const d = parse(t, f, new Date());
    if (isValid(d) && d.getFullYear() > 1900) return d;
  }
  return undefined;
}

const shell =
  "flex h-11 sm:h-10 w-full items-center gap-1 rounded-xl border border-input bg-card pl-3 pr-1 text-sm shadow-[var(--shadow-soft)] transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30";
const iconBtn =
  "grid size-10 sm:size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-light hover:text-primary";

interface DateInputProps {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  error?: string;
  label?: string;
}

export function DateInput({
  value,
  onChange,
  id,
  placeholder = "Sep 29, 2026",
  error: extError,
  label = "Date",
  ...rest
}: DateInputProps) {
  const uid = useId();
  const hintId = `${uid}-hint`;
  const errId = `${uid}-err`;
  const [text, setText] = useState(displayDate(value));
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setText(displayDate(value));
  }, [value]);
  const commit = () => {
    if (!text.trim()) {
      setError("");
      onChange("");
      return;
    }
    const d = parseDateText(text);
    if (!d) {
      setError("Enter a valid date.");
      return;
    }
    setError("");
    onChange(toIso(d));
    setText(format(d, DISPLAY));
  };
  const selected = fromIso(value);
  const shown = error || extError;
  const step = (n: number) => {
    const base = parseDateText(text) ?? selected ?? new Date();
    const d = addDays(base, n);
    setError("");
    onChange(toIso(d));
    setText(format(d, DISPLAY));
  };
  return (
    <div className="w-full min-w-0">
      <div className={cn(shell, shown && "border-danger")}>
        <input
          id={id}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="done"
          aria-label={id ? undefined : label}
          aria-invalid={!!shown || rest["aria-invalid"]}
          aria-describedby={shown ? errId : hintId}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError("");
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              triggerRef.current?.focus();
              setTimeout(() => setOpen(true), 0);
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              step(e.key === "ArrowUp" ? 1 : -1);
            } else if (e.key === "Escape" && error) {
              e.preventDefault();
              e.stopPropagation();
              setText(displayDate(value));
              setError("");
            }
          }}
          className="w-0 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground focus-visible:shadow-none"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setError("");
              onChange("");
            }}
            className={iconBtn}
            aria-label={`Clear ${label.toLowerCase()}`}
          >
            <X className="size-3.5" />
          </button>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className={iconBtn}
              aria-label={`Open calendar for ${label.toLowerCase()}`}
              aria-expanded={open}
            >
              <CalendarDays className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            collisionPadding={8}
            className="w-auto max-w-[calc(100vw-1rem)] rounded-2xl border-border p-1 shadow-lg sm:p-2"
          >
            <Calendar
              className="p-2 [--cell-size:2.5rem] sm:p-3 sm:[--cell-size:2rem]"
              mode="single"
              captionLayout="dropdown"
              startMonth={new Date(2020, 0)}
              endMonth={new Date(2032, 11)}
              selected={selected}
              defaultMonth={selected ?? new Date()}
              onSelect={(d) => {
                if (d) {
                  onChange(toIso(d));
                  setError("");
                }
                setOpen(false);
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {shown ? (
        <p id={errId} className="mt-1 text-xs text-danger" role="alert">
          {shown}
        </p>
      ) : (
        <p id={hintId} className="mt-1 text-xs font-normal text-muted-foreground">
          Type e.g. 09/29/2026 · ↑↓ change day
        </p>
      )}
    </div>
  );
}

/** Time values are stored as "HH:mm" (24h) and shown as "10:30 AM". */
export const displayTime = (v: string) => {
  const d = parse(v, "HH:mm", new Date());
  return isValid(d) ? format(d, "h:mm a") : "";
};
export function parseTimeText(text: string) {
  const t = text
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/(\d)(AM|PM)/, "$1 $2");
  for (const f of ["h:mm a", "h a", "H:mm", "HH:mm", "Hmm", "h:mma"]) {
    const d = parse(t, f, new Date());
    if (isValid(d)) return format(d, "HH:mm");
  }
  return undefined;
}
const QUICK = Array.from(
  { length: 48 },
  (_, i) =>
    `${String(Math.floor(i / 4) + 7).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
).filter((v) => v <= "20:00");

interface TimeInputProps {
  value: string;
  onChange: (hhmm: string) => void;
  id?: string;
  placeholder?: string;
  error?: string;
  label?: string;
}

export function TimeInput({
  value,
  onChange,
  id,
  placeholder = "10:30 AM",
  error: extError,
  label = "Time",
}: TimeInputProps) {
  const uid = useId();
  const hintId = `${uid}-hint`;
  const errId = `${uid}-err`;
  const [text, setText] = useState(displayTime(value));
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setText(displayTime(value));
  }, [value]);
  const commit = () => {
    if (!text.trim()) {
      setError("");
      onChange("");
      return;
    }
    const v = parseTimeText(text);
    if (!v) {
      setError("Enter a valid time.");
      return;
    }
    setError("");
    onChange(v);
    setText(displayTime(v));
  };
  const shown = error || extError;
  const step = (n: number) => {
    const cur = parseTimeText(text) ?? value ?? "09:00";
    const [h, m] = (cur || "09:00").split(":").map(Number);
    const t = ((((h ?? 9) * 60 + (m ?? 0) + n) % 1440) + 1440) % 1440;
    const v = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    setError("");
    onChange(v);
    setText(displayTime(v));
  };
  return (
    <div className="w-full min-w-0">
      <div className={cn(shell, shown && "border-danger")}>
        <input
          id={id}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="done"
          aria-label={id ? undefined : label}
          aria-invalid={!!shown}
          aria-describedby={shown ? errId : hintId}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError("");
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              triggerRef.current?.focus();
              setTimeout(() => setOpen(true), 0);
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              step(e.key === "ArrowUp" ? 15 : -15);
            } else if (e.key === "Escape" && error) {
              e.preventDefault();
              e.stopPropagation();
              setText(displayTime(value));
              setError("");
            }
          }}
          className="w-0 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground focus-visible:shadow-none"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setError("");
              onChange("");
            }}
            className={iconBtn}
            aria-label={`Clear ${label.toLowerCase()}`}
          >
            <X className="size-3.5" />
          </button>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className={iconBtn}
              aria-label={`Choose ${label.toLowerCase()}`}
              aria-expanded={open}
            >
              <Clock3 className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 rounded-2xl border-border p-1 shadow-lg">
            <div className="max-h-60 overflow-y-auto" role="listbox" aria-label="Times">
              {QUICK.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="option"
                  aria-selected={v === value}
                  onClick={() => {
                    onChange(v);
                    setError("");
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 sm:py-1.5 text-left text-sm transition-colors hover:bg-primary-light",
                    v === value && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {displayTime(v)}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {shown ? (
        <p id={errId} className="mt-1 text-xs text-danger" role="alert">
          {shown}
        </p>
      ) : (
        <p id={hintId} className="mt-1 text-xs font-normal text-muted-foreground">
          Type e.g. 10:30 AM · ↑↓ 15 min
        </p>
      )}
    </div>
  );
}
