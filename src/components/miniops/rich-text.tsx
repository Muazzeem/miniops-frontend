import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  RemoveFormatting,
  SquareCode,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Older descriptions were plain text; anything not starting with a tag is shown as such. */
const isHtml = (value: string) => /^\s*</.test(value);

/** Shows a rich-text description. HTML is sanitized by the backend before it's stored. */
export function RichText({
  html,
  fallback,
  className,
}: {
  html: string;
  fallback: string;
  className?: string;
}) {
  if (!html.trim()) return <p className="text-sm text-muted-foreground">{fallback}</p>;
  if (!isHtml(html))
    return <p className={cn("whitespace-pre-line text-sm leading-6", className)}>{html}</p>;
  return (
    <div
      className={cn("rich-text rich-text-readonly", className)}
      dangerouslySetInnerHTML={{ __html: html }}
      // Images show as thumbnails; open the full size in a new tab.
      onClick={(e) => {
        if (e.target instanceof HTMLImageElement)
          window.open(e.target.src, "_blank", "noopener,noreferrer");
      }}
    />
  );
}

/**
 * Description editor: headings, bold/italic and friends, lists and checklists, links and images.
 * `value`/`onChange` are HTML ("" when empty). Images are uploaded with `onUploadImage`, which
 * returns the URL to embed; they can also be pasted or dropped in.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  onUploadImage,
}: {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  // Paste/drop handlers are set once; read the latest upload callback through a ref.
  const upload = useRef(onUploadImage);
  upload.current = onUploadImage;

  async function insertImages(editor: Editor, files: File[], pos?: number) {
    const images = files.filter((f) => IMAGE_TYPES.includes(f.type));
    if (!images.length || !upload.current) return false;
    for (const file of images) {
      setUploading((n) => n + 1);
      try {
        const src = await upload.current(file);
        const chain = editor.chain().focus();
        (pos === undefined ? chain : chain.setTextSelection(pos))
          .setImage({ src, alt: file.name })
          .run();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't upload the image.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    return true;
  }

  const editor = useEditor({
    immediatelyRender: false, // rendered on the server too
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      // Without an upload handler, images are left out entirely (pasted ones too).
      ...(onUploadImage ? [Image] : []),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: isHtml(value) ? value : plainToHtml(value),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: "rich-text min-h-32 px-3 py-2.5 focus:outline-none",
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.some((f) => IMAGE_TYPES.includes(f.type)) || !editorRef.current) return false;
        void insertImages(editorRef.current, files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.some((f) => IMAGE_TYPES.includes(f.type)) || !editorRef.current) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages(editorRef.current, files, pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  // Follow outside changes (e.g. the form being reset), but not our own updates.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current)
      editor.commands.setContent(isHtml(value) ? value : plainToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="rounded-md border border-input shadow-sm focus-within:ring-1 focus-within:ring-ring">
      {editor && (
        <Toolbar
          editor={editor}
          onPickImage={onUploadImage ? () => fileInput.current?.click() : undefined}
          uploading={uploading > 0}
        />
      )}
      <EditorContent editor={editor} />
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (editor) void insertImages(editor, files);
        }}
      />
    </div>
  );
}

function plainToHtml(text: string) {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escape(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
}: {
  editor: Editor;
  onPickImage?: (() => void) | undefined;
  uploading: boolean;
}) {
  // The editor doesn't re-render on selection changes; subscribe to what the buttons show.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      heading: ([1, 2, 3] as const).find((level) => e.isActive("heading", { level })),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      taskList: e.isActive("taskList"),
      link: e.isActive("link"),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-1.5 py-1">
      <Menu label="Text style" trigger={<Type />} active={!!state.heading}>
        <MenuItem
          icon={<Type />}
          label="Normal text"
          onSelect={() => chain().setParagraph().run()}
        />
        <MenuItem
          icon={<Heading1 />}
          label="Heading 1"
          onSelect={() => chain().toggleHeading({ level: 1 }).run()}
        />
        <MenuItem
          icon={<Heading2 />}
          label="Heading 2"
          onSelect={() => chain().toggleHeading({ level: 2 }).run()}
        />
        <MenuItem
          icon={<Heading3 />}
          label="Heading 3"
          onSelect={() => chain().toggleHeading({ level: 3 }).run()}
        />
      </Menu>
      <Divider />
      <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </ToolButton>
      <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </ToolButton>
      <Menu
        label="More formatting"
        trigger={null}
        active={state.underline || state.strike || state.code}
      >
        <MenuItem
          icon={<Underline />}
          label="Underline"
          onSelect={() => chain().toggleUnderline().run()}
        />
        <MenuItem
          icon={<Strikethrough />}
          label="Strikethrough"
          onSelect={() => chain().toggleStrike().run()}
        />
        <MenuItem icon={<Code />} label="Code" onSelect={() => chain().toggleCode().run()} />
        <MenuItem
          icon={<RemoveFormatting />}
          label="Clear formatting"
          onSelect={() => chain().unsetAllMarks().clearNodes().run()}
        />
      </Menu>
      <Divider />
      <Menu
        label="Lists"
        trigger={state.orderedList ? <ListOrdered /> : state.taskList ? <ListChecks /> : <List />}
        active={state.bulletList || state.orderedList || state.taskList}
      >
        <MenuItem
          icon={<List />}
          label="Bulleted list"
          onSelect={() => chain().toggleBulletList().run()}
        />
        <MenuItem
          icon={<ListOrdered />}
          label="Numbered list"
          onSelect={() => chain().toggleOrderedList().run()}
        />
        <MenuItem
          icon={<ListChecks />}
          label="Checklist"
          onSelect={() => chain().toggleTaskList().run()}
        />
      </Menu>
      <Divider />
      <LinkButton editor={editor} active={state.link} />
      {onPickImage && (
        <ToolButton
          label={uploading ? "Uploading image…" : "Image"}
          disabled={uploading}
          onClick={onPickImage}
        >
          <ImagePlus className={uploading ? "animate-pulse" : undefined} />
        </ToolButton>
      )}
      <Menu label="Insert" trigger={<Plus />}>
        <MenuItem
          icon={<SquareCode />}
          label="Code block"
          onSelect={() => chain().toggleCodeBlock().run()}
        />
        <MenuItem
          icon={<Quote />}
          label="Quote"
          onSelect={() => chain().toggleBlockquote().run()}
        />
        <MenuItem
          icon={<Minus />}
          label="Divider"
          onSelect={() => chain().setHorizontalRule().run()}
        />
      </Menu>
    </div>
  );
}

const toolClass = (active?: boolean) =>
  cn(
    "h-8 gap-0.5 px-1.5 text-muted-foreground [&_svg]:size-4",
    active && "bg-accent text-foreground",
  );

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={toolClass(active)}
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Menu({
  label,
  trigger,
  active,
  children,
}: {
  label: string;
  trigger: ReactNode;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title={label}
          aria-label={label}
          className={cn(toolClass(active), !trigger && "px-0.5")}
        >
          {trigger}
          <ChevronDown className="size-3.5!" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItem({
  icon,
  label,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect}>
      {icon}
      {label}
    </DropdownMenuItem>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

function LinkButton({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  function apply() {
    const href = url.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!href) chain.unsetLink().run();
    else {
      const full = /^(https?:|mailto:)/i.test(href) ? href : `https://${href}`;
      if (editor.state.selection.empty && !active)
        chain
          .insertContent({
            type: "text",
            text: href,
            marks: [{ type: "link", attrs: { href: full } }],
          })
          .run();
      else chain.setLink({ href: full }).run();
    }
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setUrl(editor.getAttributes("link")["href"] ?? "");
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Link"
          aria-label="Link"
          aria-pressed={active}
          className={toolClass(active)}
        >
          <Link2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
          />
          <Button type="button" size="sm" className="h-9" onClick={apply}>
            {url.trim() ? "Save" : "Remove"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
