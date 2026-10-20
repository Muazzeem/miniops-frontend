import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NotificationFeed } from "@/features/notifications";
import { useMiniOps } from "@/features/store";
import { notificationKind } from "@/lib/notifications";
import { ActivityList } from "./pages";
import { todayIso, useEmployee, type Activity } from "./store";
import { Avatar, EmptyState, Field, PageHeader, Section, StatusBadge } from "./ui";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** "Today", "Yesterday", "Monday", or "Sep 23" for a local ISO date. */
function dayLabel(date: string) {
  const diff = Math.round(
    (new Date(`${todayIso()}T12:00:00`).getTime() - new Date(`${date}T12:00:00`).getTime()) / 864e5,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const d = new Date(`${date}T12:00:00`);
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const KIND_LABEL = {
  all: "All",
  task: "Tasks",
  time: "Time",
  project: "Projects",
  expense: "Expenses",
} as const;

export function ActivityPage() {
  const { myActivity } = useEmployee();
  const [tab, setTab] = useState<"all" | Activity["kind"]>("all");
  const groups = useMemo(() => {
    const shown = tab === "all" ? myActivity : myActivity.filter((a) => a.kind === tab);
    const map = new Map<string, Activity[]>();
    for (const a of shown) {
      const day = localDate(a.at);
      map.set(day, [...(map.get(day) ?? []), a]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [myActivity, tab]);
  const kinds = (["all", "task", "time", "project", "expense"] as const).filter(
    (k) => k === "all" || myActivity.some((a) => a.kind === k),
  );
  return (
    <>
      <PageHeader title="Activity" description="A record of your recent work in this workspace." />
      <div className="mx-auto max-w-4xl space-y-5">
        {kinds.length > 2 && (
          <div className="flex gap-1">
            {kinds.map((k) => (
              <Button
                key={k}
                size="sm"
                variant={tab === k ? "secondary" : "ghost"}
                onClick={() => setTab(k)}
              >
                {KIND_LABEL[k]}
              </Button>
            ))}
          </div>
        )}
        {groups.length ? (
          groups.map(([day, items]) => (
            <Section key={day} title={dayLabel(day)}>
              <ActivityList activities={items} />
            </Section>
          ))
        ) : (
          <Section title="Activity">
            <EmptyState
              title="No activity yet"
              description="Tasks you create or complete and time you log will appear here."
            />
          </Section>
        )}
      </div>
    </>
  );
}

/** Crop to a centred square JPEG (same as the employer profile page). */
async function squareJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 320;
    canvas
      .getContext("2d")!
      .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 320, 320);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Couldn't read the image."))),
        "image/jpeg",
        0.9,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfilePage() {
  const { me } = useEmployee();
  const { saveProfile, uploadAvatar, removeAvatar, user } = useMiniOps();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", phone: "", timezone: "" });
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const begin = () => {
    setForm({ name: me.name, title: me.title, phone: me.phone, timezone: me.timezone });
    setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Enter your name.");
      return;
    }
    const ok = await run(
      () =>
        saveProfile({
          name: form.name.trim(),
          title: form.title.trim(),
          phone: form.phone.trim(),
          timezone: form.timezone.trim(),
        }),
      "Profile updated",
    );
    if (ok) setOpen(false);
  };
  const pick = (file?: File) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error("Use a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Images must be 5 MB or smaller.");
      return;
    }
    setPreview({ url: URL.createObjectURL(file), file });
  };
  return (
    <>
      <PageHeader
        title="Profile"
        description="Your personal information, shown to your teammates."
      />
      <div className="mx-auto max-w-3xl space-y-5">
        <Section
          title="Personal details"
          action={
            <Button variant="outline" size="sm" className="rounded-xl" onClick={begin}>
              <Pencil />
              Edit profile
            </Button>
          }
        >
          <div className="px-5 pb-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar initials={me.initials} photo={me.photo} size="lg" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{me.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {me.title || "No job title yet"}
                </p>
                <div className="mt-2">
                  <StatusBadge status={me.roleLabel} />
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera />
                  Change Photo
                </Button>
                {user?.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-danger hover:text-danger"
                    disabled={busy}
                    onClick={() => void run(removeAvatar, "Photo removed")}
                  >
                    Remove Photo
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">JPG, PNG or WEBP · up to 5 MB</p>
            <dl className="mt-6 grid gap-5 rounded-2xl bg-secondary/60 p-5 sm:grid-cols-2">
              <ProfileField label="Full name" value={me.name} />
              <ProfileField label="Job title" value={me.title || "—"} />
              <ProfileField label="Email" value={me.email} />
              <ProfileField label="Phone" value={me.phone || "—"} />
              <ProfileField label="Timezone" value={me.timezone || "—"} />
              <ProfileField label="Workspace" value={`${me.workspace} · ${me.roleLabel}`} />
            </dl>
          </div>
        </Section>
      </div>
      <Dialog
        open={!!preview}
        onOpenChange={(v) => {
          if (!v && preview) URL.revokeObjectURL(preview.url);
          if (!v) setPreview(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Preview new photo</DialogTitle>
            <DialogDescription>
              It’s cropped to a square and shown across MiniOps.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <img
              src={preview.url}
              alt="New profile photo preview"
              className="mx-auto size-40 rounded-full object-cover"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!preview) return;
                const ok = await run(
                  async () => uploadAvatar(await squareJpeg(preview.file)),
                  "Photo updated",
                );
                if (ok) setPreview(null);
              }}
            >
              {busy ? "Saving…" : "Save photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update the personal information shown in MiniOps.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Job title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Timezone">
              <Input
                value={form.timezone}
                placeholder="e.g. Asia/Dhaka"
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <Input value={me.email} disabled />
              <span className="text-xs font-normal text-muted-foreground">
                Your email comes from your Google account.
              </span>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

export function NotificationsPage() {
  const { openTask } = useEmployee();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Assignments, reviews, reminders and changes to your work."
      />
      <div className="mx-auto max-w-4xl">
        <NotificationFeed
          onOpen={(n) => {
            const kind = notificationKind(n);
            if (
              (kind === "task" || kind === "deadline") &&
              n.data.slug &&
              n.verb !== "task.deleted"
            )
              openTask(n.data.slug);
            else if (kind === "project" && n.data.project)
              void navigate({ to: "/employee/projects/$id", params: { id: n.data.project } });
            else if (kind === "time") void navigate({ to: "/employee/time" });
            else if (kind === "team") void navigate({ to: "/employee/team" });
          }}
          settings={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ to: "/employee/settings" })}
            >
              Settings
            </Button>
          }
        />
      </div>
    </>
  );
}
