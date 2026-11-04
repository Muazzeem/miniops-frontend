import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  Download,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  GripVertical,
  Link2,
  Lock,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Section } from "@/components/miniops/forms";
import { formatDisplayDate, toIso } from "@/components/miniops/date-time";
import {
  projectFilesApi,
  projectLinksApi,
  ROLE_LABELS,
  type ApiProjectFile,
  type ApiProjectFolder,
  type ApiProjectLink,
  type ResourceVisibility,
  type ProjectLinkWrite,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMiniOps } from "./store";

/** How many files upload at the same time; the rest wait their turn. */
const PARALLEL_UPLOADS = 3;

type Upload = {
  id: string;
  file: File;
  folder: number | null;
  status: "queued" | "uploading" | "error";
  error?: string;
  abort?: AbortController;
};

type Editing = {
  kind: "folder" | "file";
  id: number;
  name: string;
  visibility: ResourceVisibility;
};
type Deleting = { kind: "folder" | "file"; id: number; name: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

function fileIcon(type: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("audio/")) return FileAudio;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (type.startsWith("text/") || ["pdf", "doc", "docx", "txt", "md"].includes(ext))
    return FileText;
  return FileIcon;
}

/** A project's Files section: a Files tab (folders and uploads) and a Links tab. */
export function ProjectFiles({ project }: { project: string }) {
  const { live } = useMiniOps();
  const [tab, setTab] = useState<"files" | "links">("files");

  if (!live)
    return (
      <Section title="Resources">
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sign in to store folders, files and links for this project.
        </p>
      </Section>
    );

  return (
    <Section
      title="Resources"
      subtitle={
        tab === "files"
          ? "Folders, documents, images and videos for this project."
          : "Useful links for this project, in order."
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="files">
            <Folder /> Files
          </TabsTrigger>
          <TabsTrigger value="links">
            <Link2 /> Links
          </TabsTrigger>
        </TabsList>
        {/* Stays mounted so uploads in progress survive a look at the Links tab. */}
        <TabsContent value="files" forceMount className="data-[state=inactive]:hidden">
          <FileBrowser project={project} />
        </TabsContent>
        <TabsContent value="links">
          <ProjectLinks project={project} />
        </TabsContent>
      </Tabs>
    </Section>
  );
}

/** Folders and files for one project: browse, create folders, upload anything. */
function FileBrowser({ project }: { project: string }) {
  const { activeWorkspace, live, can } = useMiniOps();
  const canEdit = can("projects", "edit");
  const visibilities = visibilitiesFor(activeWorkspace.role);
  const wid = Number(activeWorkspace.id);
  const qc = useQueryClient();
  const [folder, setFolder] = useState<number | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [newFolder, setNewFolder] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [preview, setPreview] = useState<ApiProjectFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const enabled = live && Number.isFinite(wid);
  const foldersKey = ["project-folders", wid, project, folder] as const;
  const filesKey = ["project-files", wid, project, folder] as const;
  const folders = useQuery({
    queryKey: foldersKey,
    queryFn: () => projectFilesApi.folders(wid, project, folder),
    enabled,
  });
  const files = useQuery({
    queryKey: filesKey,
    queryFn: () => projectFilesApi.files(wid, project, folder),
    enabled,
  });
  const current = useQuery({
    queryKey: ["project-folder", wid, project, folder],
    queryFn: () => projectFilesApi.folder(wid, project, folder!),
    enabled: enabled && folder !== null,
  });

  const refresh = useCallback(
    (target: number | null) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["project-folders", wid, project, target] }),
        qc.invalidateQueries({ queryKey: ["project-files", wid, project, target] }),
      ]),
    [qc, wid, project],
  );

  const patch = (id: string, change: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...change } : u)));
  const drop = (id: string) => setUploads((list) => list.filter((u) => u.id !== id));

  // Start queued uploads while fewer than PARALLEL_UPLOADS are running.
  useEffect(() => {
    const running = uploads.filter((u) => u.status === "uploading").length;
    const next = uploads.filter((u) => u.status === "queued").slice(0, PARALLEL_UPLOADS - running);
    for (const u of next) {
      const abort = new AbortController();
      patch(u.id, { status: "uploading", abort });
      projectFilesApi
        .upload(wid, project, u.file, u.folder, abort.signal)
        // Keep the placeholder until the real tile has loaded, so nothing flickers.
        .then(() => refresh(u.folder))
        .then(() => drop(u.id))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") drop(u.id);
          else
            patch(u.id, {
              status: "error",
              error: err instanceof Error ? err.message : "Upload failed.",
            });
        });
    }
  }, [uploads, wid, project, refresh]);

  // Don't let a tab close silently drop uploads in progress.
  const busy = uploads.some((u) => u.status === "uploading" || u.status === "queued");
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function addFiles(list: FileList | File[]) {
    const picked = Array.from(list);
    if (!picked.length) return;
    setUploads((current) => [
      ...current,
      ...picked.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        folder,
        status: "queued" as const,
      })),
    ]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (canEdit) addFiles(e.dataTransfer.files);
  }

  async function removeItem(item: Deleting) {
    try {
      if (item.kind === "folder") await projectFilesApi.removeFolder(wid, project, item.id);
      else await projectFilesApi.removeFile(wid, project, item.id);
      void refresh(folder);
      toast.success(`${item.name} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const loading = folders.isPending || files.isPending;
  const error = folders.error ?? files.error;
  const path = folder === null ? [] : (current.data?.path ?? []);
  const here = uploads.filter((u) => u.folder === folder);
  const empty = !loading && !folders.data?.length && !files.data?.length && !here.length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setFolder(null)}
            className={cn(
              "rounded px-1.5 py-0.5 hover:bg-accent",
              folder === null ? "font-semibold" : "text-muted-foreground",
            )}
          >
            All files
          </button>
          {path.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setFolder(f.id)}
                className={cn(
                  "rounded px-1.5 py-0.5 hover:bg-accent",
                  i === path.length - 1 ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {f.name}
              </button>
            </span>
          ))}
        </nav>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setNewFolder(true)}>
              <FolderPlus /> New folder
            </Button>
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload /> Upload
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "relative min-h-40 rounded-xl border transition-colors",
          dragging && "border-dashed border-primary bg-primary-soft/40",
        )}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl text-sm font-medium text-primary">
            Drop files to upload here
          </div>
        )}
        {error ? (
          <p className="p-8 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Couldn't load files."}
          </p>
        ) : loading ? (
          <div
            aria-busy="true"
            aria-label="Loading files"
            className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          >
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        ) : empty ? (
          <div className="grid place-items-center gap-2 p-10 text-center">
            <Folder className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? "This folder is empty. Drag files here or use Upload."
                : "This folder is empty."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {folders.data?.map((f) => (
              <FolderRow
                key={`d${f.id}`}
                folder={f}
                canEdit={canEdit}
                showVisibility={visibilities.length > 1}
                onOpen={() => setFolder(f.id)}
                onEdit={() => setEditing({ kind: "folder", ...f })}
                onDelete={() => setDeleting({ kind: "folder", id: f.id, name: f.name })}
              />
            ))}
            {files.data?.map((f) => (
              <FileRow
                key={`f${f.id}`}
                file={f}
                canEdit={canEdit}
                showVisibility={visibilities.length > 1}
                onOpen={() =>
                  f.content_type.startsWith("image/") || f.content_type.startsWith("video/")
                    ? setPreview(f)
                    : window.open(f.url, "_blank", "noopener")
                }
                onEdit={() => setEditing({ kind: "file", ...f })}
                onDelete={() => setDeleting({ kind: "file", id: f.id, name: f.name })}
              />
            ))}
            {here.map((u) => (
              <UploadTile
                key={u.id}
                upload={u}
                onCancel={() => (u.status === "queued" ? drop(u.id) : u.abort?.abort())}
                onRetry={() => patch(u.id, { status: "queued", error: "" })}
                onRemove={() => drop(u.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <NameDialog
        open={newFolder}
        title="New folder"
        label="Folder name"
        submitLabel="Create folder"
        initial=""
        visibilities={visibilities}
        // A new folder starts with the same visibility as the one it's in.
        initialVisibility={(folder !== null && current.data?.visibility) || "everyone"}
        onClose={() => setNewFolder(false)}
        onSubmit={async (name, visibility) => {
          await projectFilesApi.createFolder(wid, project, { name, parent: folder, visibility });
          await refresh(folder);
          toast.success(`Folder ${name} created`);
        }}
      />
      <NameDialog
        open={editing !== null}
        title={editing?.kind === "folder" ? "Edit folder" : "Edit file"}
        label="Name"
        submitLabel="Save"
        initial={editing?.name ?? ""}
        visibilities={visibilities}
        initialVisibility={editing?.visibility ?? "everyone"}
        hint={
          editing?.kind === "folder"
            ? "Hiding a folder also hides everything inside it."
            : undefined
        }
        onClose={() => setEditing(null)}
        onSubmit={async (name, visibility) => {
          if (!editing) return;
          if (editing.kind === "folder")
            await projectFilesApi.updateFolder(wid, project, editing.id, { name, visibility });
          else await projectFilesApi.updateFile(wid, project, editing.id, { name, visibility });
          await refresh(folder);
        }}
      />
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.kind === "folder"
                ? "This deletes the folder and everything inside it, including subfolders. This can't be undone."
                : "This permanently deletes the file. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && void removeItem(deleting)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PreviewDialog file={preview} onClose={() => setPreview(null)} />
    </>
  );
}

const VISIBILITY_LABELS: Record<ResourceVisibility, string> = {
  owner: "Owner",
  managers: "Owner + Project managers",
  everyone: "Everyone",
};

/** The visibilities a role may see and give a folder, file or link; the API enforces the same
 * rule. */
const visibilitiesFor = (role: string): ResourceVisibility[] =>
  role === ROLE_LABELS.employer
    ? ["owner", "managers", "everyone"]
    : role === ROLE_LABELS.project_manager
      ? ["managers", "everyone"]
      : ["everyone"];

function VisibilityField({
  id,
  options,
  value,
  onChange,
  hint,
}: {
  id: string;
  options: ResourceVisibility[];
  value: ResourceVisibility;
  onChange: (v: ResourceVisibility) => void;
  hint?: string | undefined;
}) {
  return (
    <div>
      <Label htmlFor={id}>Who can see it</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ResourceVisibility)}>
        <SelectTrigger id={id} className="mt-1.5 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((v) => (
            <SelectItem key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A project's links in order (drag to reorder): Title and Link, with add, edit and delete. */
function ProjectLinks({ project }: { project: string }) {
  const { activeWorkspace, live, can } = useMiniOps();
  const canEdit = can("projects", "edit");
  const visibilities = visibilitiesFor(activeWorkspace.role);
  // Employees only ever see links shared with everyone, so they don't need the column.
  const showVisibility = visibilities.length > 1;
  const wid = Number(activeWorkspace.id);
  const qc = useQueryClient();
  // null: closed; "new": adding; a link: editing it.
  const [editing, setEditing] = useState<ApiProjectLink | "new" | null>(null);
  const [deleting, setDeleting] = useState<ApiProjectLink | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const key = ["project-links", wid, project] as const;
  const links = useQuery({
    queryKey: key,
    queryFn: () => projectLinksApi.list(wid, project),
    enabled: live && Number.isFinite(wid),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  // Show the new order right away; the API renumbers the links and sends them back.
  async function move(id: number, to: number) {
    const list = links.data ?? [];
    const from = list.findIndex((l) => l.id === id);
    if (from < 0 || to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    next.splice(to, 0, ...next.splice(from, 1));
    qc.setQueryData(key, next);
    try {
      qc.setQueryData(
        key,
        await projectLinksApi.reorder(
          wid,
          project,
          next.map((l) => l.id),
        ),
      );
    } catch (err) {
      qc.setQueryData(key, list);
      toast.error(err instanceof Error ? err.message : "Couldn't reorder the links.");
    }
  }

  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };

  async function remove(link: ApiProjectLink) {
    try {
      await projectLinksApi.remove(wid, project, link.id);
      void refresh();
      toast.success(`${link.title} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Add link
          </Button>
        </div>
      )}
      <div className="rounded-xl border">
        {links.error ? (
          <p className="p-8 text-center text-sm text-destructive">
            {links.error instanceof Error ? links.error.message : "Couldn't load links."}
          </p>
        ) : links.isPending ? (
          <div aria-busy="true" aria-label="Loading links" className="grid gap-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : !links.data.length ? (
          <div className="grid place-items-center gap-2 p-10 text-center">
            <Link2 className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? "No links yet. Add design files, staging sites or docs with Add link."
                : "No links yet."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {canEdit && <TableHead className="w-10" />}
                <TableHead>Title</TableHead>
                <TableHead>Link</TableHead>
                {showVisibility && <TableHead className="w-48">Visible to</TableHead>}
                {canEdit && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.data.map((link, i) => {
                const from = links.data.findIndex((l) => l.id === dragging);
                const target = dragging !== null && over === link.id && dragging !== link.id;
                return (
                  <TableRow
                    key={link.id}
                    draggable={canEdit}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(link.id));
                      setDragging(link.id);
                    }}
                    onDragOver={(e) => {
                      if (dragging === null) return;
                      e.preventDefault();
                      setOver(link.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragging !== null) void move(dragging, i);
                      endDrag();
                    }}
                    onDragEnd={endDrag}
                    className={cn(
                      dragging === link.id && "opacity-40",
                      // A line where the link will land: above when moving up, below when moving down.
                      target &&
                        (from > i
                          ? "shadow-[inset_0_2px_0_var(--primary)]"
                          : "shadow-[inset_0_-2px_0_var(--primary)]"),
                    )}
                  >
                    {canEdit && (
                      <TableCell className="w-10 pr-0">
                        <GripVertical
                          aria-hidden
                          className="size-4 cursor-grab text-muted-foreground active:cursor-grabbing"
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{link.title}</TableCell>
                    <TableCell className="max-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
                        title={link.url}
                      >
                        <span className="truncate">{link.url}</span>
                        <ExternalLink className="size-3.5 shrink-0" />
                      </a>
                    </TableCell>
                    {showVisibility && (
                      <TableCell className="text-sm text-muted-foreground">
                        {VISIBILITY_LABELS[link.visibility]}
                      </TableCell>
                    )}
                    {canEdit && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`Actions for ${link.title}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(link)}>
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={i === 0}
                              onSelect={() => void move(link.id, i - 1)}
                            >
                              <ArrowUp /> Move up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={i === links.data.length - 1}
                              onSelect={() => void move(link.id, i + 1)}
                            >
                              <ArrowDown /> Move down
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => setDeleting(link)}
                              className="text-destructive"
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <LinkDialog
        link={editing}
        visibilities={visibilities}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (editing === "new") await projectLinksApi.create(wid, project, input);
          else if (editing) await projectLinksApi.update(wid, project, editing.id, input);
          await refresh();
          toast.success(editing === "new" ? `${input.title} added` : "Link updated");
        }}
      />
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the link from the project. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && void remove(deleting)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const looksLikeUrl = (v: string) => {
  try {
    return ["http:", "https:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};

/** Add or edit a link. A new link goes at the end of the list. */
function LinkDialog({
  link,
  visibilities,
  onClose,
  onSubmit,
}: {
  link: ApiProjectLink | "new" | null;
  visibilities: ResourceVisibility[];
  onClose: () => void;
  onSubmit: (input: ProjectLinkWrite) => Promise<void>;
}) {
  const existing = link && link !== "new" ? link : null;
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [visibility, setVisibility] = useState<ResourceVisibility>("everyone");
  const [errors, setErrors] = useState<Partial<Record<"title" | "url" | "form", string>>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!link) return;
    setTitle(existing?.title ?? "");
    setUrl(existing?.url ?? "");
    setVisibility(existing?.visibility ?? "everyone");
    setErrors({});
  }, [link, existing]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!title.trim()) found.title = "Enter a title.";
    if (!looksLikeUrl(url.trim())) found.url = "Enter a full link, starting with https://";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), url: url.trim(), visibility });
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (key: keyof typeof errors) =>
    errors[key] && (
      <p role="alert" className="mt-1.5 text-xs text-destructive">
        {errors[key]}
      </p>
    );

  return (
    <Dialog open={link !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{existing ? "Edit link" : "Add link"}</DialogTitle>
            <DialogDescription>
              {existing
                ? "Change the title, link or who can see it."
                : "It's added at the end; drag to reorder."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            <div>
              <Label htmlFor="link-title">Title</Label>
              <Input
                id="link-title"
                className="mt-1.5"
                value={title}
                maxLength={200}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={!!errors.title}
              />
              {fieldError("title")}
            </div>
            <div>
              <Label htmlFor="link-url">Link</Label>
              <Input
                id="link-url"
                className="mt-1.5"
                type="url"
                placeholder="https://"
                value={url}
                maxLength={2000}
                onChange={(e) => setUrl(e.target.value)}
                aria-invalid={!!errors.url}
              />
              {fieldError("url")}
            </div>
            {visibilities.length > 1 && (
              <VisibilityField
                id="link-visibility"
                options={visibilities}
                value={visibility}
                onChange={setVisibility}
              />
            )}
            {fieldError("form")}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : existing ? "Save" : "Add link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A file still uploading: a skeleton tile, or an error with Retry. */
function UploadTile({
  upload: u,
  onCancel,
  onRetry,
  onRemove,
}: {
  upload: Upload;
  onCancel: () => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const failed = u.status === "error";
  return (
    <li
      className="relative min-w-0 overflow-hidden rounded-xl border bg-card"
      aria-busy={!failed}
      aria-label={failed ? `${u.file.name} failed to upload` : `Uploading ${u.file.name}`}
    >
      {failed ? (
        <span className="grid aspect-[4/3] place-items-center gap-2 bg-destructive/5 p-3 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <span className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7" onClick={onRetry}>
              Retry
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={onRemove}>
              Remove
            </Button>
          </span>
        </span>
      ) : (
        <Skeleton className="aspect-[4/3] rounded-none" />
      )}
      <span className="block p-2.5">
        <b className="block truncate text-sm font-medium">{u.file.name}</b>
        {failed ? (
          <small role="alert" className="block truncate text-xs text-destructive" title={u.error}>
            {u.error}
          </small>
        ) : (
          <Skeleton className="mt-1.5 h-3 w-2/3" />
        )}
      </span>
      {!failed && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute right-2 top-2 size-8 bg-card/90 shadow-sm"
          aria-label={`Cancel ${u.file.name}`}
          onClick={onCancel}
        >
          <X />
        </Button>
      )}
    </li>
  );
}

function RowMenu({
  label,
  canEdit,
  download,
  onEdit,
  onDelete,
}: {
  label: string;
  canEdit: boolean;
  download?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!canEdit && !download) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="absolute right-2 top-2 z-10 size-8 bg-card/90 opacity-100 shadow-sm backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100"
          aria-label={`Actions for ${label}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {download && (
          <DropdownMenuItem asChild>
            <a href={download} download target="_blank" rel="noopener">
              <Download /> Download
            </a>
          </DropdownMenuItem>
        )}
        {canEdit && (
          <>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-destructive">
              <Trash2 /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const fmtDate = (iso: string) => formatDisplayDate(toIso(new Date(iso)));

/** A gallery tile: a preview area with the name and details underneath. */
function Tile({
  label,
  preview,
  meta,
  visibility,
  onOpen,
  menu,
}: {
  label: string;
  preview: ReactNode;
  meta: string;
  /** Shown as a badge when the item isn't shared with everyone. */
  visibility?: ResourceVisibility | undefined;
  onOpen: () => void;
  menu: ReactNode;
}) {
  return (
    <li className="group relative min-w-0 overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-card">
      <button type="button" onClick={onOpen} className="block w-full text-left" title={label}>
        <span className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-muted">
          {preview}
          {visibility && visibility !== "everyone" && (
            <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-3.5rem)] items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
              <Lock className="size-3 shrink-0" />
              <span className="truncate">{VISIBILITY_LABELS[visibility]}</span>
            </span>
          )}
        </span>
        <span className="block p-2.5">
          <b className="block truncate text-sm font-medium">{label}</b>
          <small className="block truncate text-xs text-muted-foreground">{meta}</small>
        </span>
      </button>
      {menu}
    </li>
  );
}

function FolderRow({
  folder,
  canEdit,
  showVisibility,
  onOpen,
  onEdit,
  onDelete,
}: {
  folder: ApiProjectFolder;
  canEdit: boolean;
  showVisibility: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Tile
      label={folder.name}
      meta={`Folder · ${fmtDate(folder.created_at)}`}
      visibility={showVisibility ? folder.visibility : undefined}
      onOpen={onOpen}
      preview={
        <span className="grid size-full place-items-center bg-primary-soft text-primary">
          <Folder className="size-12" strokeWidth={1.5} />
        </span>
      }
      menu={<RowMenu label={folder.name} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />}
    />
  );
}

function FileRow({
  file,
  canEdit,
  showVisibility,
  onOpen,
  onEdit,
  onDelete,
}: {
  file: ApiProjectFile;
  canEdit: boolean;
  showVisibility: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = fileIcon(file.content_type, file.name);
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : "";
  const preview = file.content_type.startsWith("image/") ? (
    <img src={file.url} alt="" loading="lazy" className="size-full object-cover" />
  ) : file.content_type.startsWith("video/") ? (
    <>
      {/* #t=0.1 makes browsers show the first frame as the thumbnail. */}
      <video
        src={`${file.url}#t=0.1`}
        preload="metadata"
        muted
        playsInline
        className="size-full object-cover"
      />
      <span className="absolute grid size-10 place-items-center rounded-full bg-black/55 text-white">
        <Play className="size-4 fill-current" />
      </span>
    </>
  ) : (
    <span className="grid place-items-center gap-1.5 text-muted-foreground">
      <Icon className="size-10" strokeWidth={1.5} />
      {ext && <span className="text-[11px] font-semibold tracking-wide">{ext}</span>}
    </span>
  );
  return (
    <Tile
      label={file.name}
      meta={`${formatBytes(file.size)} · ${fmtDate(file.created_at)}`}
      visibility={showVisibility ? file.visibility : undefined}
      onOpen={onOpen}
      preview={preview}
      menu={
        <RowMenu
          label={file.name}
          canEdit={canEdit}
          download={file.url}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      }
    />
  );
}

/** A name, plus "Who can see it" when the member's role has a choice. */
function NameDialog({
  open,
  title,
  label,
  submitLabel,
  initial,
  visibilities,
  initialVisibility,
  hint,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  submitLabel: string;
  initial: string;
  visibilities: ResourceVisibility[];
  initialVisibility: ResourceVisibility;
  hint?: string | undefined;
  onClose: () => void;
  onSubmit: (name: string, visibility: ResourceVisibility) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setName(initial);
      setVisibility(initialVisibility);
      setError("");
    }
  }, [open, initial, initialVisibility]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter a name.");
    setSaving(true);
    try {
      await onSubmit(name.trim(), visibility);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">{label}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            <div>
              <Label htmlFor="file-name">{label}</Label>
              <Input
                id="file-name"
                className="mt-1.5"
                value={name}
                maxLength={255}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!error}
              />
              {error && (
                <p role="alert" className="mt-1.5 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
            {visibilities.length > 1 && (
              <VisibilityField
                id="file-visibility"
                options={visibilities}
                value={visibility}
                onChange={setVisibility}
                hint={hint}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ file, onClose }: { file: ApiProjectFile | null; onClose: () => void }) {
  return (
    <Dialog open={file !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{file?.name}</DialogTitle>
          <DialogDescription>
            {file && `${formatBytes(file.size)} · ${file.uploaded_by_name || "Someone"}`}
          </DialogDescription>
        </DialogHeader>
        {file?.content_type.startsWith("video/") ? (
          <video src={file.url} controls className="max-h-[70vh] w-full rounded-lg bg-black" />
        ) : file ? (
          <img
            src={file.url}
            alt={file.name}
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        ) : null}
        <DialogFooter>
          {file && (
            <Button asChild variant="outline">
              <a href={file.url} download target="_blank" rel="noopener">
                <Download /> Download
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
