import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  CornerUpLeft,
  Download,
  ImagePlus,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SendHorizontal,
  Smile,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IMAGE_TYPES, validateImage } from "@/data/ops";
import {
  conversationsKey,
  messagesKey,
  setConversation,
  upsertMessage,
} from "@/features/chat-cache";
import { useMiniOps, type Member } from "@/features/store";
import {
  chatApi,
  mediaUrl,
  type ApiConversation,
  type ApiMessage,
  type MessagePage,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const EMOJI = [
  "😀",
  "😂",
  "😍",
  "👍",
  "👏",
  "🙏",
  "🎉",
  "🔥",
  "✅",
  "👀",
  "💡",
  "🚀",
  "❤️",
  "😅",
  "🤔",
  "🙌",
];
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

function Avatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  const src = mediaUrl(url ?? null);
  return src ? (
    <img src={src} alt="" className={cn("size-10 shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}

function ConversationAvatar({
  convo,
  me,
  className,
}: {
  convo: ApiConversation;
  me?: number;
  className?: string;
}) {
  if (convo.kind === "group")
    return (
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground",
          className,
        )}
      >
        <Users className="size-4" />
      </span>
    );
  const other = convo.members.find((m) => m.id !== me);
  return (
    <Avatar
      name={convo.name}
      url={other?.avatar_url ?? null}
      {...(className ? { className } : {})}
    />
  );
}

/** "3:04 PM" today, "Mon" this week, else "Oct 8". */
function shortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (now.getTime() - d.getTime() < 6 * 864e5)
    return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 864e5);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function preview(m: ApiMessage | null, me?: number) {
  if (!m) return "No messages yet";
  const who = m.author === me ? "You: " : "";
  if (m.deleted) return `${who}Message deleted`;
  return who + (m.text || (m.image_url ? "📷 Photo" : ""));
}

// ---- page --------------------------------------------------------------------

/**
 * Workspace chat, shared by the employer (/chat) and employee (/employee/chat) views.
 * Anyone can message any member; only owners, admins and managers create groups.
 */
export function ChatPage({
  initial,
  className = "-m-4 md:-m-6 lg:-m-8",
}: {
  initial?: string | undefined;
  /** Negative margins that cancel the surrounding page padding. */
  className?: string;
}) {
  const { live, activeWorkspace, chatConversations, chatState, canCreateGroups, members, user } =
    useMiniOps();
  const wid = live && activeWorkspace.id !== "loading" ? Number(activeWorkspace.id) : null;
  const me = user?.id;
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(initial ? Number(initial) : null);
  const [mobileOpen, setMobileOpen] = useState(!!initial);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<null | "direct" | "group">(null);

  const active =
    chatConversations.find((c) => c.id === activeId) ?? (mobileOpen ? null : chatConversations[0]);
  const others = members.filter((m) => m.id !== me);
  const list = chatConversations.filter((c) =>
    c.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  const open = (id: number) => {
    setActiveId(id);
    setMobileOpen(true);
  };
  const startDirect = async (userId: number) => {
    if (wid === null) return;
    try {
      const convo = await chatApi.direct(wid, userId);
      setConversation(qc, wid, convo);
      open(convo.id);
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  if (!live)
    return (
      <EmptyPanel
        title="Sign in to chat"
        description="Chat with everyone in your workspace once you’re signed in."
      />
    );
  if (chatState.loading)
    return (
      <div className="grid place-items-center p-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  if (chatState.error)
    return (
      <EmptyPanel
        title="Couldn’t load chat"
        description={chatState.error}
        action={
          <Button variant="outline" onClick={chatState.retry}>
            Try again
          </Button>
        }
      />
    );

  return (
    <div className={className}>
      <div className="grid h-[calc(100dvh-4rem)] grid-cols-1 overflow-hidden bg-card md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={cn("flex min-h-0 flex-col border-r", mobileOpen && "hidden md:flex")}>
          <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-5">
            <h1 className="font-display text-2xl font-bold">Chat</h1>
            <div className="flex gap-1.5">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setDialog("direct")}
                aria-label="New message"
                title="New message"
              >
                <MessageSquarePlus />
              </Button>
              {canCreateGroups && (
                <Button size="sm" variant="outline" onClick={() => setDialog("group")}>
                  <Plus /> Group
                </Button>
              )}
            </div>
          </div>
          <div className="relative px-4 pb-3">
            <Search className="absolute left-7 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search conversations"
              className="bg-secondary pl-9"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => open(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent",
                  c.id === active?.id && "bg-primary-soft hover:bg-primary-soft",
                )}
              >
                <ConversationAvatar convo={c} {...(me ? { me } : {})} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <b className="truncate text-sm">{c.name}</b>
                    {c.last_message && (
                      <small className="shrink-0 text-[11px] text-muted-foreground">
                        {shortTime(c.last_message.created_at)}
                      </small>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-xs",
                        c.unread ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {preview(c.last_message, me)}
                    </span>
                    {c.unread > 0 && (
                      <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
            {!list.length && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {chatConversations.length ? (
                  "No conversations match."
                ) : others.length ? (
                  <>
                    No conversations yet.
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setDialog("direct")}
                    >
                      <MessageSquarePlus /> Message a teammate
                    </Button>
                  </>
                ) : (
                  "Invite teammates to this workspace to start chatting."
                )}
              </div>
            )}
          </div>
        </aside>
        {active && wid !== null ? (
          <Thread
            key={active.id}
            wid={wid}
            convo={active}
            me={me}
            members={members}
            hidden={!mobileOpen}
            onBack={() => setMobileOpen(false)}
          />
        ) : (
          <div
            className={cn("hidden place-items-center bg-background md:grid", mobileOpen && "grid")}
          >
            <p className="text-sm text-muted-foreground">Pick a conversation or start a new one.</p>
          </div>
        )}
      </div>
      <PickPeople
        open={dialog === "direct"}
        onOpenChange={(v) => !v && setDialog(null)}
        title="New message"
        description="Message anyone in this workspace."
        people={others}
        single
        onDone={async ([id]) => {
          setDialog(null);
          if (id) await startDirect(id);
        }}
      />
      {canCreateGroups && wid !== null && (
        <GroupDialog
          open={dialog === "group"}
          onOpenChange={(v) => !v && setDialog(null)}
          people={others}
          onSave={async (name, ids) => {
            const convo = await chatApi.createGroup(wid, name, ids);
            setConversation(qc, wid, convo);
            open(convo.id);
            toast.success("Group created");
          }}
        />
      )}
    </div>
  );
}

function EmptyPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl bg-card p-12 text-center shadow-card">
      <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
        <Users className="size-5" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---- thread ------------------------------------------------------------------

/** False while the browser tab is in the background (messages aren't "read" then). */
function usePageVisible() {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

function Thread({
  wid,
  convo,
  me,
  members,
  hidden,
  onBack,
}: {
  wid: number;
  convo: ApiConversation;
  me: number | undefined;
  members: Member[];
  hidden: boolean;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const pageVisible = usePageVisible();
  const key = messagesKey(wid, convo.id);
  // Loaded once when opened; new messages arrive over the socket (chat-cache.ts).
  const page = useQuery({
    queryKey: key,
    queryFn: () => chatApi.messages(wid, convo.id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const [olderLoading, setOlderLoading] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<ApiMessage | null>(null);
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = page.data?.results ?? [];
  const lastId = messages.at(-1)?.id;

  // Stick to the bottom as messages arrive.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  // Reading the thread clears its unread count (here, on other tabs and for the badge).
  // `hidden` only applies on phones; from md up the open thread is always on screen.
  useEffect(() => {
    const onScreen = !hidden || window.matchMedia("(min-width: 768px)").matches;
    if (convo.unread > 0 && onScreen && pageVisible) {
      qc.setQueryData<ApiConversation[]>(conversationsKey(wid), (l) =>
        l?.map((c) => (c.id === convo.id ? { ...c, unread: 0 } : c)),
      );
      void chatApi.read(wid, convo.id).catch(() => undefined);
    }
  }, [convo.unread, convo.id, hidden, pageVisible, wid, qc]);

  const loadOlder = async () => {
    const first = messages[0];
    if (!first) return;
    setOlderLoading(true);
    const el = scrollRef.current;
    const fromBottom = el ? el.scrollHeight - el.scrollTop : 0;
    try {
      const older = await chatApi.messages(wid, convo.id, first.id);
      qc.setQueryData<MessagePage>(key, (p) =>
        p ? { results: [...older.results, ...p.results], has_more: older.has_more } : p,
      );
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - fromBottom; // keep your place
      });
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setOlderLoading(false);
    }
  };

  const submit = async () => {
    const body = text.trim();
    if ((!body && !image) || sending) return;
    setSending(true);
    try {
      const message = await chatApi.send(wid, convo.id, {
        text: body,
        image: image?.file ?? null,
        replyTo: reply?.id ?? null,
      });
      upsertMessage(qc, wid, message);
      qc.setQueryData<ApiConversation[]>(conversationsKey(wid), (l) =>
        l
          ?.map((c) =>
            c.id === convo.id
              ? { ...c, last_message: message, last_message_at: message.created_at }
              : c,
          )
          .sort((a, b) =>
            (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at),
          ),
      );
      setText("");
      setReply(null);
      if (image) URL.revokeObjectURL(image.url);
      setImage(null);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSending(false);
    }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };
  const pick = (file?: File) => {
    if (!file) return;
    const err = validateImage(file);
    if (err) {
      toast.error(err);
      return;
    }
    setImage({ file, url: URL.createObjectURL(file) });
  };
  const remove = async (m: ApiMessage) => {
    try {
      await chatApi.deleteMessage(wid, convo.id, m.id);
      upsertMessage(qc, wid, { ...m, deleted: true, text: "", image_url: null });
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const subtitle =
    convo.kind === "group"
      ? `${convo.members.length} members · ${convo.members
          .slice(0, 4)
          .map((m) => (m.id === me ? "You" : m.name.split(" ")[0]))
          .join(", ")}${convo.members.length > 4 ? "…" : ""}`
      : (convo.members.find((m) => m.id !== me)?.email ?? "");

  return (
    <section className={cn("flex min-h-0 flex-col bg-background", hidden && "hidden md:flex")}>
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft />
        </Button>
        <ConversationAvatar convo={convo} {...(me ? { me } : {})} />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-sm">{convo.name}</b>
          <small className="block truncate text-xs text-muted-foreground">{subtitle}</small>
        </div>
        {convo.can_manage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Group options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil /> Rename or edit members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={async () => {
                  if (!confirm(`Delete “${convo.name}” and all its messages for everyone?`)) return;
                  try {
                    await chatApi.deleteGroup(wid, convo.id);
                    qc.setQueryData<ApiConversation[]>(conversationsKey(wid), (l) =>
                      l?.filter((c) => c.id !== convo.id),
                    );
                    toast.success("Group deleted");
                  } catch (e) {
                    toast.error(errorText(e));
                  }
                }}
              >
                <Trash2 /> Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-6">
        {page.isPending ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : page.error ? (
          <p className="py-10 text-center text-sm text-danger">{errorText(page.error)}</p>
        ) : (
          <>
            {page.data?.has_more && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadOlder()}
                  disabled={olderLoading}
                >
                  {olderLoading && <Loader2 className="animate-spin" />} Load earlier messages
                </Button>
              </div>
            )}
            {!messages.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {convo.kind === "group"
                  ? "Say hello to the group 👋"
                  : `Start your conversation with ${convo.name}.`}
              </p>
            )}
            {messages.map((m, i) => {
              const mine = m.author === me;
              const prev = messages[i - 1];
              const newDay =
                !prev ||
                new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
              const author = convo.members.find((p) => p.id === m.author);
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-2 text-center text-[11px] font-medium text-muted-foreground">
                      {dayLabel(m.created_at)}
                    </div>
                  )}
                  <div className={cn("group flex items-end gap-2", mine && "flex-row-reverse")}>
                    {!mine && (
                      <Avatar
                        name={m.author_name}
                        url={author?.avatar_url ?? null}
                        className="size-7 text-[10px]"
                      />
                    )}
                    <div className={cn("max-w-[78%] md:max-w-[62%]", mine && "items-end")}>
                      {!mine && convo.kind === "group" && (
                        <small className="mb-0.5 ml-1 block text-[11px] text-muted-foreground">
                          {m.author_name.split(" ")[0]}
                        </small>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm",
                          mine
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border/70 bg-card",
                          m.deleted &&
                            "border border-dashed border-border bg-transparent italic text-muted-foreground",
                        )}
                      >
                        {m.reply_to && !m.deleted && (
                          <div
                            className={cn(
                              "mb-1.5 border-l-2 pl-2 text-xs",
                              mine
                                ? "border-primary-foreground/50 text-primary-foreground/80"
                                : "border-primary text-muted-foreground",
                            )}
                          >
                            <b>{m.reply_to.author_name.split(" ")[0]}</b> ·{" "}
                            {m.reply_to.deleted
                              ? "deleted"
                              : m.reply_to.text || (m.reply_to.has_image ? "Photo" : "")}
                          </div>
                        )}
                        {m.deleted ? (
                          "This message was deleted"
                        ) : (
                          <>
                            {m.image_url && (
                              <button
                                onClick={() => setLightbox(mediaUrl(m.image_url))}
                                className="mb-1 block overflow-hidden rounded-xl"
                              >
                                <img
                                  src={mediaUrl(m.image_url) ?? ""}
                                  alt="Shared image"
                                  className="max-h-60 w-full object-cover"
                                />
                              </button>
                            )}
                            {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                          </>
                        )}
                      </div>
                      <small
                        className={cn(
                          "mt-0.5 block px-1 text-[11px] text-muted-foreground",
                          mine && "text-right",
                        )}
                      >
                        {clock(m.created_at)}
                      </small>
                    </div>
                    {!m.deleted && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="mb-5 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent focus-visible:opacity-100 group-hover:opacity-100"
                            aria-label="Message actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={mine ? "end" : "start"}>
                          <DropdownMenuItem onSelect={() => setReply(m)}>
                            <CornerUpLeft /> Reply
                          </DropdownMenuItem>
                          {m.text && (
                            <DropdownMenuItem
                              onSelect={() => {
                                void navigator.clipboard?.writeText(m.text);
                                toast.success("Copied");
                              }}
                            >
                              <Copy /> Copy text
                            </DropdownMenuItem>
                          )}
                          {mine && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => void remove(m)}
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t bg-card p-3">
        {(reply || image) && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-secondary px-3 py-2 text-xs">
            {image && (
              <img src={image.url} alt="Selected" className="size-12 rounded-lg object-cover" />
            )}
            {reply ? (
              <span className="min-w-0 flex-1 truncate border-l-2 border-primary pl-2">
                <b>
                  Replying to {reply.author === me ? "yourself" : reply.author_name.split(" ")[0]}
                </b>{" "}
                · {reply.text || "Photo"}
              </span>
            ) : (
              <span className="flex-1 text-muted-foreground">Image ready to send</span>
            )}
            <button
              onClick={() => {
                setReply(null);
                if (image) URL.revokeObjectURL(image.url);
                setImage(null);
              }}
              aria-label="Cancel"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Attach image"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            maxLength={5000}
            placeholder={`Message ${convo.name}…`}
            aria-label="Message"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-[10px] border border-input bg-secondary px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/15"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Emoji">
                <Smile />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="grid w-56 grid-cols-8 gap-1 p-2">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  onClick={() => setText((t) => t + e)}
                  className="rounded-md p-1 text-lg hover:bg-accent"
                >
                  {e}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button
            size="icon"
            onClick={() => void submit()}
            disabled={sending || (!text.trim() && !image)}
            aria-label="Send"
          >
            {sending ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
          </Button>
        </div>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-3">
          <DialogHeader className="sr-only">
            <DialogTitle>Image preview</DialogTitle>
            <DialogDescription>Shared image</DialogDescription>
          </DialogHeader>
          {lightbox && (
            <img
              src={lightbox}
              alt="Shared image"
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
          )}
          <DialogFooter>
            <Button asChild variant="outline">
              <a href={lightbox ?? "#"} download="miniops-image" target="_blank" rel="noreferrer">
                <Download /> Download
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {convo.can_manage && (
        <GroupDialog
          open={editing}
          onOpenChange={setEditing}
          people={members.filter((m) => m.id !== me)}
          initial={{
            name: convo.name,
            ids: convo.members.map((m) => m.id).filter((id) => id !== me),
          }}
          onSave={async (name, ids) => {
            const updated = await chatApi.updateGroup(wid, convo.id, { name, members: ids });
            setConversation(qc, wid, updated);
            toast.success("Group updated");
          }}
        />
      )}
    </section>
  );
}

// ---- dialogs -----------------------------------------------------------------

function PeopleList({
  people,
  selected,
  onToggle,
  single,
}: {
  people: Member[];
  selected: number[];
  onToggle: (id: number) => void;
  single?: boolean;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(
    () =>
      people.filter((p) =>
        `${p.name} ${p.email} ${p.title}`.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [people, q],
  );
  return (
    <div className="grid gap-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" />
      <div className="max-h-72 space-y-0.5 overflow-y-auto">
        {shown.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent"
          >
            {!single && (
              <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => onToggle(p.id)} />
            )}
            {single && (
              <input
                type="radio"
                className="sr-only"
                checked={selected.includes(p.id)}
                onChange={() => onToggle(p.id)}
              />
            )}
            <Avatar name={p.name} url={p.avatarUrl} className="size-8 text-[11px]" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium">{p.name}</span>
              <small className="block truncate text-xs text-muted-foreground">
                {p.title || p.email} · {p.role}
              </small>
            </span>
            {single && selected.includes(p.id) && (
              <span className="size-2 rounded-full bg-primary" />
            )}
          </label>
        ))}
        {!shown.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">No one matches.</p>
        )}
      </div>
    </div>
  );
}

function PickPeople({
  open,
  onOpenChange,
  title,
  description,
  people,
  single,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  people: Member[];
  single?: boolean;
  onDone: (ids: number[]) => void | Promise<void>;
}) {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    if (open) setIds([]);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {people.length ? (
          <PeopleList
            people={people}
            selected={ids}
            single={!!single}
            onToggle={(id) =>
              setIds((x) =>
                single ? [id] : x.includes(id) ? x.filter((i) => i !== id) : [...x, id],
              )
            }
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No one else is in this workspace yet. Invite teammates from the Team page.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ids.length} onClick={() => void onDone(ids)}>
            <MessageSquarePlus /> Start chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupDialog({
  open,
  onOpenChange,
  people,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  people: Member[];
  initial?: { name: string; ids: number[] };
  onSave: (name: string, ids: number[]) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [ids, setIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setIds(initial?.ids ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const save = async () => {
    setBusy(true);
    try {
      await onSave(name.trim(), ids);
      onOpenChange(false);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit group" : "New group"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Rename the group or change who’s in it. You stay in the group."
              : "Group chats are for a team or project. Everyone you add can chat in it."}
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="Group name, e.g. Development Team"
        />
        <PeopleList
          people={people}
          selected={ids}
          onToggle={(id) =>
            setIds((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]))
          }
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !name.trim() || !ids.length} onClick={() => void save()}>
            {busy ? <Loader2 className="animate-spin" /> : initial ? <Pencil /> : <UserPlus />}
            {initial ? "Save changes" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
