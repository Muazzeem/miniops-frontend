import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { activities as seedActivities, conversations as seedConversations, employee as seedEmployee, messages as seedMessages, notifications as seedNotifications, people as seedPeople, permissions, projects, tasks as seedTasks, teamActivity, timeEntries as seedTimeEntries, type Conversation, type Employee, type Message, type Notification, type Person, type Task, type TaskStatus, type TimeEntry } from "@/data/employee";

interface EmployeeStore {
 employee: Employee; projects: typeof projects; tasks: Task[]; timeEntries: TimeEntry[]; activities: typeof seedActivities; notifications: Notification[]; permissions: typeof permissions;
 people: Person[]; conversations: Conversation[]; messages: Message[]; teamActivity: typeof teamActivity;
 selectedTask: Task | null; setSelectedTask: (task: Task | null) => void; taskFormOpen: boolean; setTaskFormOpen: (open: boolean) => void;
 timeFormOpen: boolean; setTimeFormOpen: (open: boolean) => void; editingTime: TimeEntry | null; setEditingTime: (entry: TimeEntry | null) => void;
 updateTaskStatus: (id: string, status: TaskStatus) => void; saveTask: (task: Task) => void; deleteTask: (id: string) => void;
 saveTime: (entry: TimeEntry) => void; deleteTime: (id: string) => void; markNotification: (id: string) => void; markAllNotifications: () => void; updateProfile: (updates: Partial<Employee>) => void; removePhoto: () => void;
 sendMessage: (conversationId: string, message: { text?: string; image?: string; replyToId?: string; authorId?: string }) => void; deleteMessage: (id: string) => void; openConversation: (id: string) => void; startDirect: (personId: string) => string; activeChat: string; setActiveChat: (id: string) => void;
}
const StoreContext = createContext<EmployeeStore | null>(null);
const nowTime = () => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());

export function EmployeeProvider({ children }: { children: ReactNode }) {
 const [employee, setEmployee] = useState(seedEmployee); const [tasks, setTasks] = useState(seedTasks); const [timeEntries, setTimeEntries] = useState(seedTimeEntries); const [notifications, setNotifications] = useState(seedNotifications);
 const [conversations, setConversations] = useState(seedConversations); const [messages, setMessages] = useState(seedMessages);
 const [activeChat, setActiveChat] = useState("c-wilson"); const [selectedTask, setSelectedTask] = useState<Task | null>(null); const [taskFormOpen, setTaskFormOpen] = useState(false); const [timeFormOpen, setTimeFormOpen] = useState(false); const [editingTime, setEditingTime] = useState<TimeEntry | null>(null);
 // The signed-in employee's directory card mirrors their profile so photo/name updates appear everywhere.
 const people = useMemo(() => seedPeople.map(p => p.id === "jordan" ? { ...p, name: employee.name, role: employee.role, initials: employee.initials, ...(employee.photo ? { photo: employee.photo } : {}) } : p), [employee]);
 const value = useMemo<EmployeeStore>(() => ({ employee, projects, tasks, timeEntries, activities: seedActivities, notifications, permissions, people, conversations, messages, teamActivity, activeChat, setActiveChat, selectedTask, setSelectedTask, taskFormOpen, setTaskFormOpen, timeFormOpen, setTimeFormOpen, editingTime, setEditingTime,
  updateTaskStatus: (id, status) => { setTasks(v => v.map(t => t.id === id ? { ...t, status } : t)); setSelectedTask(v => v?.id === id ? { ...v, status } : v); toast.success(status === "Done" ? "Task completed" : "Task updated"); },
  saveTask: task => { setTasks(v => v.some(t => t.id === task.id) ? v.map(t => t.id === task.id ? task : t) : [task, ...v]); setSelectedTask(task); setTaskFormOpen(false); toast.success(task.createdByEmployee ? "Task updated" : "Task created"); },
  deleteTask: id => { setTasks(v => v.filter(t => t.id !== id)); setSelectedTask(null); toast.success("Task deleted"); },
  saveTime: entry => { const exists = timeEntries.some(t => t.id === entry.id); setTimeEntries(v => exists ? v.map(t => t.id === entry.id ? entry : t) : [entry, ...v]); setTimeFormOpen(false); setEditingTime(null); toast.success(exists ? "Time entry updated" : "Time entry added"); },
  deleteTime: id => { setTimeEntries(v => v.filter(t => t.id !== id)); toast.success("Time entry deleted"); },
  markNotification: id => { setNotifications(v => v.map(n => n.id === id ? { ...n, read: true } : n)); },
  markAllNotifications: () => { setNotifications(v => v.map(n => ({ ...n, read: true }))); toast.success("All notifications marked as read"); },
  updateProfile: updates => { setEmployee(v => ({ ...v, ...updates })); toast.success("Profile updated"); },
  removePhoto: () => { setEmployee(v => { const { photo: _p, ...rest } = v; return rest; }); toast.success("Photo removed"); },
  sendMessage: (conversationId, m) => { setMessages(v => [...v, { id: `m-${Date.now()}`, conversationId, authorId: "jordan", time: nowTime(), ...m }]); },
  deleteMessage: id => { setMessages(v => v.filter(m => m.id !== id)); toast.success("Message deleted"); },
  openConversation: id => setConversations(v => v.map(c => c.id === id ? { ...c, unread: 0 } : c)),
  startDirect: personId => { const existing = conversations.find(c => c.kind === "direct" && c.memberIds.includes(personId)); if (existing) return existing.id; const person = seedPeople.find(p => p.id === personId); const id = `c-${personId}`; setConversations(v => [{ id, name: person?.name ?? "Direct message", kind: "direct", memberIds: ["jordan", personId], unread: 0 }, ...v]); return id; },
 }), [employee, tasks, timeEntries, notifications, people, conversations, messages, activeChat, selectedTask, taskFormOpen, timeFormOpen, editingTime]);
 return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useEmployee() { const value = useContext(StoreContext); if (!value) throw new Error("EmployeeProvider missing"); return value; }
export const getProject = (id: string) => projects.find(project => project.id === id);
