import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, ImagePlus, KeyRound, MessageSquare, Reply, Search, Send, Smile, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Person } from "@/data/employee";
import { useEmployee } from "./store";
import { Avatar, EmptyState, Field, PageHeader, Section, StatusBadge } from "./ui";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Validates an image file (JPG/JPEG/PNG/WEBP, max 5MB) and returns a local preview URL. */
export function readImage(file: File | undefined, onOk: (url: string) => void) {
  if (!file) return;
  if (!IMAGE_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, or WEBP images are supported"); return; }
  if (file.size > MAX_IMAGE_BYTES) { toast.error("Images must be 5MB or smaller"); return; }
  const reader = new FileReader(); reader.onload = () => onOk(String(reader.result)); reader.readAsDataURL(file);
}
const statusDot = (s: Person["status"]) => s === "Active" ? "bg-success" : s === "Away" ? "bg-warning" : "bg-muted-foreground/40";
function PersonAvatar({ person, size = "sm" }: { person: Person | undefined; size?: "sm" | "md" | "lg" }) {
  return <span className="relative inline-flex shrink-0"><Avatar initials={person?.initials ?? ""} photo={person?.photo} size={size} /><span className={cn("absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card", statusDot(person?.status ?? "Offline"))} /></span>;
}

/* ---------------- Team ---------------- */
export function TeamPage() {
  const { people, startDirect, setActiveChat } = useEmployee(); const navigate = useNavigate();
  const [query, setQuery] = useState(""); const [open, setOpen] = useState<Person | null>(null);
  const list = people.filter(p => (p.name + p.role + p.currentProject).toLowerCase().includes(query.toLowerCase()));
  const message = (p: Person) => { const id = startDirect(p.id); setActiveChat(id); setOpen(null); navigate({ to: "/employee/chat" }); };
  return <>
    <PageHeader title="Team" description="The people you work with at Northstar Digital." />
    <div className="relative mb-5 max-w-md"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="rounded-xl pl-9" placeholder="Search people..." value={query} onChange={e => setQuery(e.target.value)} /></div>
    {!list.length ? <Section title="People"><EmptyState icon={Users} title="No people found" description="Try a different name or role." /></Section> :
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map(p => <button key={p.id} onClick={() => setOpen(p)} className="surface flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
        <PersonAvatar person={p} size="md" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.name}{p.id === "jordan" && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(You)</span>}</p><p className="truncate text-xs text-muted-foreground">{p.role}</p><p className="mt-2 truncate text-xs text-muted-foreground">{p.currentProject}</p></div><StatusBadge status={p.status} />
      </button>)}</div>}
    <Sheet open={!!open} onOpenChange={v => !v && setOpen(null)}><SheetContent className="w-full sm:max-w-md">{open && <><SheetHeader className="text-left"><SheetTitle className="sr-only">{open.name}</SheetTitle><SheetDescription className="sr-only">Team member profile</SheetDescription></SheetHeader>
      <div className="mt-2 flex flex-col items-center text-center"><PersonAvatar person={open} size="lg" /><h2 className="mt-4 text-xl font-semibold">{open.name}</h2><p className="text-sm text-muted-foreground">{open.role}</p><div className="mt-3"><StatusBadge status={open.status} /></div></div>
      <dl className="mt-8 grid gap-4 rounded-2xl bg-secondary/60 p-5 text-sm"><div><dt className="field-label">Current project</dt><dd className="mt-1 font-medium">{open.currentProject}</dd></div><div><dt className="field-label">Activity</dt><dd className="mt-1 font-medium">{open.lastSeen}</dd></div><div><dt className="field-label">Email</dt><dd className="mt-1 font-medium">{open.email}</dd></div></dl>
      {open.id !== "jordan" && <Button className="mt-6 w-full rounded-xl" onClick={() => message(open)}><MessageSquare />Message</Button>}
    </>}</SheetContent></Sheet>
  </>;
}

/* ---------------- Chat ---------------- */
const EMOJI = ["👍", "🙏", "🎉", "😊", "😂", "🔥", "👀", "✅", "❤️", "💡", "🚀", "👏"];
export function ChatPage() {
  const { conversations, messages, people, activeChat, setActiveChat, openConversation, sendMessage, deleteMessage } = useEmployee();
  const [query, setQuery] = useState(""); const [text, setText] = useState(""); const [image, setImage] = useState<string | null>(null); const [replyTo, setReplyTo] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null); const [typing, setTyping] = useState(false); const [mobileThread, setMobileThread] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null); const endRef = useRef<HTMLDivElement>(null);
  const convo = conversations.find(c => c.id === activeChat) ?? conversations[0];
  const thread = messages.filter(m => m.conversationId === convo?.id);
  const person = (id: string) => people.find(p => p.id === id);
  const other = convo?.kind === "direct" ? person(convo.memberIds.find(id => id !== "jordan") ?? "") : undefined;
  const filtered = useMemo(() => conversations.filter(c => c.name.toLowerCase().includes(query.toLowerCase())), [conversations, query]);
  useEffect(() => { if (convo) openConversation(convo.id); }, [convo?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [thread.length, typing, convo?.id]);
  if (!convo) return <Section title="Chat"><EmptyState icon={MessageSquare} title="No conversations yet" description="Message a teammate from the Team page." /></Section>;
  const send = () => {
    if (!text.trim() && !image) return;
    sendMessage(convo.id, { ...(text.trim() ? { text: text.trim() } : {}), ...(image ? { image } : {}), ...(replyTo ? { replyToId: replyTo } : {}) });
    setText(""); setImage(null); setReplyTo(null);
    const replier = convo.memberIds.find(id => id !== "jordan");
    if (replier) { setTyping(true); window.setTimeout(() => { setTyping(false); sendMessage(convo.id, { authorId: replier, text: image ? "Nice, thanks for sharing 🙌" : "Thanks, Jordan — got it 👍" }); }, 1600); }
  };
  const pick = (e: ChangeEvent<HTMLInputElement>) => { readImage(e.target.files?.[0], setImage); e.target.value = ""; };
  const replyMsg = replyTo ? messages.find(m => m.id === replyTo) : undefined;
  const select = (id: string) => { setActiveChat(id); setMobileThread(true); setReplyTo(null); };
  return <>
    <div className="surface flex h-[calc(100dvh-7.5rem)] min-h-[480px] overflow-hidden rounded-[20px] lg:h-[calc(100dvh-8.5rem)]">
      <aside className={cn("flex w-full flex-col border-r border-border/70 md:w-80", mobileThread && "hidden md:flex")}>
        <div className="p-4"><h1 className="text-lg font-semibold">Chat</h1><div className="relative mt-3"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="rounded-xl bg-secondary/60 pl-9" placeholder="Search conversations..." value={query} onChange={e => setQuery(e.target.value)} /></div></div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">{filtered.map(c => { const last = [...messages].reverse().find(m => m.conversationId === c.id); const o = c.kind === "direct" ? person(c.memberIds.find(id => id !== "jordan") ?? "") : undefined; return <button key={c.id} onClick={() => select(c.id)} className={cn("flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-primary-soft", c.id === convo.id && "bg-primary-light")}>
          {o ? <PersonAvatar person={o} size="md" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"><Users className="size-4 text-muted-foreground" /></span>}
          <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><span className="truncate text-sm font-semibold">{c.name}</span><span className="shrink-0 text-[11px] text-muted-foreground">{last?.time}</span></span><span className={cn("block truncate text-xs", c.unread ? "font-medium text-foreground" : "text-muted-foreground")}>{last?.image && !last.text ? "📷 Image" : last?.text}</span></span>
          {c.unread > 0 && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{c.unread}</span>}
        </button>; })}</div>
      </aside>
      <section className={cn("flex min-w-0 flex-1 flex-col", !mobileThread && "hidden md:flex")}>
        <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileThread(false)} aria-label="Back to conversations"><ArrowLeft /></Button>{other ? <PersonAvatar person={other} /> : <span className="grid size-8 place-items-center rounded-full bg-secondary"><Users className="size-4 text-muted-foreground" /></span>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{convo.name}</p><p className="text-xs text-muted-foreground">{other ? (other.status === "Active" ? "Online" : `Last seen ${other.lastSeen}`) : `${convo.memberIds.length} members`}</p></div></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-app/60 px-4 py-5">{thread.map(m => { const mine = m.authorId === "jordan"; const author = person(m.authorId); const quoted = m.replyToId ? messages.find(x => x.id === m.replyToId) : undefined; return <div key={m.id} className={cn("group flex items-end gap-2", mine && "flex-row-reverse")}>
          {!mine && <Avatar initials={author?.initials ?? ""} photo={author?.photo} size="xs" />}
          <div className={cn("max-w-[78%] sm:max-w-[65%]", mine && "items-end text-right")}>
            {!mine && convo.kind === "group" && <p className="mb-1 text-[11px] font-medium text-muted-foreground">{author?.name}</p>}
            <div className={cn("inline-block rounded-2xl px-3.5 py-2 text-left text-sm shadow-[var(--shadow-soft)]", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card")}>
              {quoted && <div className={cn("mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs", mine ? "border-primary-foreground/60 bg-primary-foreground/15" : "border-primary bg-primary-soft")}>{quoted.text ?? "Image"}</div>}
              {m.image && <button onClick={() => setLightbox(m.image ?? null)} className="mb-1 block overflow-hidden rounded-xl"><img src={m.image} alt="Shared image" className="max-h-60 w-full object-cover" /></button>}
              {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
            </div>
            <div className={cn("mt-1 flex items-center gap-1 text-[11px] text-muted-foreground", mine && "justify-end")}><span>{m.time}</span>
              <span className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button className="rounded p-1 hover:text-foreground" aria-label="Reply" onClick={() => setReplyTo(m.id)}><Reply className="size-3.5" /></button>
                {m.text && <button className="rounded p-1 hover:text-foreground" aria-label="Copy text" onClick={() => { void navigator.clipboard?.writeText(m.text ?? ""); toast.success("Copied"); }}><Copy className="size-3.5" /></button>}
                {mine && <button className="rounded p-1 hover:text-danger" aria-label="Delete message" onClick={() => deleteMessage(m.id)}><Trash2 className="size-3.5" /></button>}
              </span></div>
          </div></div>; })}
          {typing && <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex gap-1 rounded-2xl bg-card px-3 py-2.5 shadow-[var(--shadow-soft)]">{[0, 1, 2].map(i => <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${i * 120}ms` }} />)}</span>typing…</div>}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border/70 bg-card p-3">
          {replyMsg && <div className="mb-2 flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-xs"><Reply className="size-3.5 text-primary" /><span className="min-w-0 flex-1 truncate">Replying to <strong>{person(replyMsg.authorId)?.name}</strong>: {replyMsg.text ?? "Image"}</span><button onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="size-3.5" /></button></div>}
          {image && <div className="relative mb-2 inline-block"><img src={image} alt="Image preview" className="h-20 rounded-xl object-cover" /><button onClick={() => setImage(null)} className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-foreground text-background" aria-label="Remove image"><X className="size-3" /></button></div>}
          <div className="flex items-end gap-1">
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => fileRef.current?.click()} aria-label="Attach image"><ImagePlus /></Button>
            <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl" aria-label="Add emoji"><Smile /></Button></PopoverTrigger><PopoverContent side="top" className="w-auto rounded-2xl p-2"><div className="grid grid-cols-6 gap-1">{EMOJI.map(e => <button key={e} className="rounded-lg p-1.5 text-lg hover:bg-secondary" onClick={() => setText(t => t + e)}>{e}</button>)}</div></PopoverContent></Popover>
            <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={`Message ${convo.name}`} aria-label="Message" className="max-h-32 min-h-10 flex-1 resize-none rounded-xl bg-secondary/60 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
            <Button size="icon" className="rounded-xl" onClick={send} disabled={!text.trim() && !image} aria-label="Send message"><Send /></Button>
          </div>
        </div>
      </section>
    </div>
    <Dialog open={!!lightbox} onOpenChange={v => !v && setLightbox(null)}><DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none"><DialogHeader className="sr-only"><DialogTitle>Image preview</DialogTitle><DialogDescription>Full size shared image</DialogDescription></DialogHeader>{lightbox && <img src={lightbox} alt="Shared image full size" className="max-h-[80vh] w-full rounded-2xl object-contain" />}</DialogContent></Dialog>
  </>;
}

/* ---------------- Settings ---------------- */
export function SettingsPage() {
  const { employee, updateProfile } = useEmployee(); const navigate = useNavigate();
  const [prefs, setPrefs] = useState({ compact: false, weekStartsMonday: true, taskEmails: true, mentions: true, deadlines: true, timeReminders: false });
  const toggle = (k: keyof typeof prefs) => { setPrefs(p => ({ ...p, [k]: !p[k] })); toast.success("Preference saved"); };
  const Row = ({ label, hint, k }: { label: string; hint: string; k: keyof typeof prefs }) => <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 hover:bg-primary-soft"><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div><Switch checked={prefs[k]} onCheckedChange={() => toggle(k)} aria-label={label} /></div>;
  return <><PageHeader title="Settings" description="Your personal MiniOps preferences." />
    <Tabs defaultValue="profile" className="mx-auto max-w-3xl"><TabsList className="mb-5 rounded-xl bg-secondary p-1"><TabsTrigger value="profile" className="rounded-lg">Profile</TabsTrigger><TabsTrigger value="preferences" className="rounded-lg">Preferences</TabsTrigger><TabsTrigger value="notifications" className="rounded-lg">Notifications</TabsTrigger><TabsTrigger value="security" className="rounded-lg">Security</TabsTrigger></TabsList>
      <TabsContent value="profile"><Section title="Profile" caption="Your name, photo, and contact details"><div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-center"><Avatar initials={employee.initials} photo={employee.photo} size="lg" /><div className="flex-1"><p className="font-semibold">{employee.name}</p><p className="text-sm text-muted-foreground">{employee.role} · {employee.email}</p></div><Button variant="outline" className="rounded-xl" onClick={() => navigate({ to: "/employee/profile" })}>Edit profile</Button></div></Section></TabsContent>
      <TabsContent value="preferences"><Section title="Preferences"><div className="px-2 pb-2"><Row k="compact" label="Compact lists" hint="Show more rows in task and time lists" /><Row k="weekStartsMonday" label="Week starts on Monday" hint="Used for My Time and calendar views" /></div><div className="px-5 pb-5"><Field label="Timezone"><Input value={employee.timezone} onChange={e => updateProfile({ timezone: e.target.value })} className="rounded-xl" /></Field></div></Section></TabsContent>
      <TabsContent value="notifications"><Section title="Notifications" caption="Choose what you hear about"><div className="px-2 pb-2"><Row k="taskEmails" label="Task assignments" hint="When someone assigns you a task" /><Row k="mentions" label="Mentions and messages" hint="When you’re mentioned or messaged" /><Row k="deadlines" label="Deadline reminders" hint="A day before your work is due" /><Row k="timeReminders" label="Time reminders" hint="End-of-day nudge to log your time" /></div></Section></TabsContent>
      <TabsContent value="security"><SecurityPanel /></TabsContent>
    </Tabs></>;
}
export function SecurityPanel() {
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const save = () => { if (!cur) { toast.error("Enter your current password"); return; } if (next.length < 8) { toast.error("New password must be at least 8 characters"); return; } if (next !== confirm) { toast.error("Passwords don’t match"); return; } setCur(""); setNext(""); setConfirm(""); toast.success("Password updated"); };
  return <Section title="Password & security" caption="Demo only — no real credentials are changed"><div className="grid gap-4 px-5 pb-5 sm:grid-cols-2"><Field label="Current password" className="sm:col-span-2"><Input type="password" value={cur} onChange={e => setCur(e.target.value)} className="rounded-xl" /></Field><Field label="New password"><Input type="password" value={next} onChange={e => setNext(e.target.value)} className="rounded-xl" /></Field><Field label="Confirm new password"><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="rounded-xl" /></Field><div className="sm:col-span-2"><Button className="rounded-xl" onClick={save}><KeyRound />Update password</Button></div></div></Section>;
}
