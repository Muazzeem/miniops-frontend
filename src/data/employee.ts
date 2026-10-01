export type TaskStatus = "To Do" | "In Progress" | "Done";
export type Priority = "High" | "Medium" | "Low";
export type ProjectStatus = "In progress" | "In review" | "Planning";

export interface Employee { id: string; name: string; displayName: string; role: string; email: string; workspace: string; status: "Active"; initials: string; photo?: string; phone: string; timezone: string }
export interface TeamMember { id: string; name: string; role: string; availability: "Available" | "Focused" | "Away"; initials: string }
export interface Project { id: string; name: string; client: string; type: string; status: ProjectStatus; role: string; progress: number; startDate: string; endDate: string; nextDeadline: string; lastActivity: string; description: string; goals: string[]; team: TeamMember[] }
export interface Task { id: string; title: string; description: string; projectId: string; priority: Priority; dueDate: string; dueLabel: string; dueTime?: string; status: TaskStatus; createdByEmployee?: boolean }
export interface TimeEntry { id: string; date: string; projectId: string; taskId: string; description: string; hours: number; billable: boolean; status: "Submitted" | "Draft" }
export interface Activity { id: string; dateGroup: "Today" | "Yesterday" | "Monday"; time: string; kind: "task" | "time" | "project" | "profile"; text: string; detail: string }
export interface Notification { id: string; title: string; message: string; time: string; read: boolean; kind: "task" | "project" | "time" | "deadline" | "chat"; relatedTaskId?: string; relatedProjectId?: string }
export interface Permissions { viewProjects: boolean; viewTasks: boolean; createTasks: boolean; editTasks: boolean; deleteTasks: boolean; logTime: boolean; editTime: boolean; deleteTime: boolean; viewTeam: boolean; viewActivity: boolean }

export const employee: Employee = { id: "emp-jordan", name: "Jordan Lee", displayName: "Jordan", role: "Senior Product Designer", email: "jordan@northstardigital.demo", workspace: "Northstar Digital", status: "Active", initials: "JL", phone: "+1 (415) 555-0142", timezone: "America/Los_Angeles" };
export const permissions: Permissions = { viewProjects: true, viewTasks: true, createTasks: true, editTasks: true, deleteTasks: true, logTime: true, editTime: true, deleteTime: true, viewTeam: true, viewActivity: true };

export const projects: Project[] = [
 { id:"acme", name:"Acme Website Redesign", client:"Acme Co.", type:"Website redesign", status:"In progress", role:"Lead Product Designer", progress:63, startDate:"Aug 12, 2026", endDate:"Oct 16, 2026", nextDeadline:"Sep 23, 2026", lastActivity:"18 minutes ago", description:"A complete redesign of Acme’s marketing website, focused on clearer product storytelling and a more accessible conversion journey.", goals:["Deliver a responsive, accessible design system","Clarify the product story across core pages","Prepare implementation-ready developer handoff"], team:[{id:"jordan",name:"Jordan Lee",role:"Senior Product Designer",availability:"Focused",initials:"JL"},{id:"alex",name:"Alex Morgan",role:"Product Designer",availability:"Available",initials:"AM"},{id:"chris",name:"Chris Walker",role:"Developer",availability:"Available",initials:"CW"}] },
 { id:"bloom", name:"Bloom Brand Identity", client:"Bloom Health", type:"Brand identity", status:"In review", role:"Brand Designer", progress:78, startDate:"Jul 28, 2026", endDate:"Oct 2, 2026", nextDeadline:"Sep 25, 2026", lastActivity:"Yesterday", description:"A confident, human brand identity for Bloom Health spanning visual direction, color, and presentation materials.", goals:["Align on a distinctive visual direction","Build an accessible color system","Deliver a concise launch presentation"], team:[{id:"jordan",name:"Jordan Lee",role:"Senior Product Designer",availability:"Focused",initials:"JL"},{id:"maya",name:"Maya Patel",role:"Creative Director",availability:"Away",initials:"MP"}] },
 { id:"nova", name:"Nova Education Platform", client:"Nova Learning", type:"Product design", status:"Planning", role:"Product Designer", progress:31, startDate:"Sep 7, 2026", endDate:"Nov 20, 2026", nextDeadline:"Sep 29, 2026", lastActivity:"2 days ago", description:"A focused learning platform that helps adult learners understand progress and complete onboarding with confidence.", goals:["Reduce onboarding friction","Make learning progress easy to understand","Define reusable dashboard states"], team:[{id:"jordan",name:"Jordan Lee",role:"Senior Product Designer",availability:"Focused",initials:"JL"},{id:"chris",name:"Chris Walker",role:"Developer",availability:"Available",initials:"CW"},{id:"sam",name:"Sam Rivera",role:"Product Strategist",availability:"Available",initials:"SR"}] }
];

export const tasks: Task[] = [
 {id:"t1",title:"Finalize homepage design",description:"Resolve final review notes and prepare the homepage screens for approval.",projectId:"acme",priority:"High",dueDate:"2026-09-23",dueLabel:"Today",dueTime:"11:30 AM",status:"In Progress"},
 {id:"t2",title:"Review mobile onboarding screens",description:"Review mobile layouts for spacing, keyboard behavior, and completion states.",projectId:"nova",priority:"High",dueDate:"2026-09-23",dueLabel:"Today",dueTime:"2:00 PM",status:"To Do"},
 {id:"t3",title:"Prepare client presentation",description:"Build the narrative and latest screen sequence for tomorrow’s client review.",projectId:"bloom",priority:"High",dueDate:"2026-09-24",dueLabel:"Tomorrow",dueTime:"10:00 AM",status:"To Do"},
 {id:"t4",title:"Update design handoff",description:"Add component notes and update the developer-ready screen links.",projectId:"acme",priority:"Medium",dueDate:"2026-09-25",dueLabel:"Friday",status:"In Progress"},
 {id:"t5",title:"Create mobile responsive screens",description:"Adapt approved desktop screens for phone and compact tablet widths.",projectId:"acme",priority:"Medium",dueDate:"2026-09-24",dueLabel:"Tomorrow",status:"To Do"},
 {id:"t6",title:"Explore logo directions",description:"Refine the two selected identity routes with supporting marks.",projectId:"bloom",priority:"Medium",dueDate:"2026-09-22",dueLabel:"Yesterday",status:"To Do"},
 {id:"t7",title:"Prepare color system",description:"Document accessible primary, neutral, and status color usage.",projectId:"bloom",priority:"Medium",dueDate:"2026-09-25",dueLabel:"Friday",status:"In Progress"},
 {id:"t8",title:"Review accessibility states",description:"Check focus, error, and disabled states across the core website flow.",projectId:"acme",priority:"High",dueDate:"2026-09-28",dueLabel:"Monday",status:"To Do"},
 {id:"t9",title:"Design dashboard states",description:"Create empty, loading, and populated learner dashboard states.",projectId:"nova",priority:"Low",dueDate:"2026-09-30",dueLabel:"Sep 30",status:"To Do"},
 {id:"t10",title:"Homepage content audit",description:"Confirm homepage content hierarchy against the latest brief.",projectId:"acme",priority:"Low",dueDate:"2026-09-21",dueLabel:"Sep 21",status:"Done"},
 {id:"t11",title:"Build presentation deck",description:"Assemble approved identity applications into the review deck.",projectId:"bloom",priority:"Medium",dueDate:"2026-09-18",dueLabel:"Sep 18",status:"Done"},
 {id:"t12",title:"Review onboarding flow",description:"Capture friction points and recommend a shorter onboarding sequence.",projectId:"nova",priority:"High",dueDate:"2026-09-17",dueLabel:"Sep 17",status:"Done"}
];

export const timeEntries: TimeEntry[] = [
 {id:"time-1",date:"2026-09-23",projectId:"acme",taskId:"t1",description:"Homepage UI refinement",hours:3.5,billable:true,status:"Submitted"},
 {id:"time-2",date:"2026-09-23",projectId:"nova",taskId:"t2",description:"Mobile onboarding review",hours:3,billable:true,status:"Draft"},
 {id:"time-3",date:"2026-09-22",projectId:"bloom",taskId:"t6",description:"Moodboard and logo exploration",hours:5,billable:true,status:"Submitted"},
 {id:"time-4",date:"2026-09-22",projectId:"acme",taskId:"t4",description:"Internal design sync",hours:2.5,billable:false,status:"Submitted"},
 {id:"time-5",date:"2026-09-21",projectId:"acme",taskId:"t1",description:"Homepage interaction states",hours:7.5,billable:true,status:"Submitted"},
 {id:"time-6",date:"2026-09-20",projectId:"nova",taskId:"t12",description:"Onboarding flow review",hours:7,billable:true,status:"Submitted"},
 {id:"time-7",date:"2026-09-19",projectId:"bloom",taskId:"t11",description:"Team critique and documentation",hours:4.5,billable:false,status:"Submitted"}
];

export const activities: Activity[] = [
 {id:"a1",dateGroup:"Today",time:"10:42 AM",kind:"task",text:"Completed “Homepage content audit”",detail:"Acme Website Redesign"},
 {id:"a2",dateGroup:"Today",time:"9:18 AM",kind:"time",text:"Logged 3.5 hours",detail:"Acme Website Redesign · Homepage UI refinement"},
 {id:"a3",dateGroup:"Today",time:"8:46 AM",kind:"project",text:"Updated the homepage review notes",detail:"Acme Website Redesign"},
 {id:"a4",dateGroup:"Yesterday",time:"4:30 PM",kind:"task",text:"Moved “Mobile responsive screens” to To Do",detail:"Acme Website Redesign"},
 {id:"a5",dateGroup:"Yesterday",time:"2:12 PM",kind:"time",text:"Logged 5 hours",detail:"Bloom Brand Identity · Logo exploration"},
 {id:"a6",dateGroup:"Monday",time:"3:05 PM",kind:"profile",text:"Updated preferred display name",detail:"Personal profile"}
];

export const notifications: Notification[] = [
 {id:"n1",title:"New task assigned",message:"Wilson assigned you a new task.",time:"12 min ago",read:false,kind:"task",relatedTaskId:"t3"},
 {id:"n2",title:"Deadline tomorrow",message:"Acme Website Redesign is due tomorrow.",time:"45 min ago",read:false,kind:"deadline",relatedProjectId:"acme"},
 {id:"n3",title:"You were mentioned",message:"Kris mentioned you in a project update.",time:"1 hr ago",read:false,kind:"project",relatedProjectId:"bloom"},
 {id:"n4",title:"Nice work",message:"You completed 4 tasks today.",time:"2 hr ago",read:true,kind:"task"},
 {id:"n5",title:"New message",message:"New message from Wilson.",time:"3 hr ago",read:false,kind:"chat"},
 {id:"n6",title:"Time entry incomplete",message:"Your time entry for yesterday is incomplete.",time:"Yesterday",read:true,kind:"time"}
];

// ---- Team directory & chat (employee-safe: no cost, salary, or HR data) ----
export interface Person { id: string; name: string; role: string; initials: string; status: "Active" | "Away" | "Offline"; currentProject: string; lastSeen: string; email: string; photo?: string }
export const people: Person[] = [
 { id:"jordan", name:"Jordan Lee", role:"Senior Product Designer", initials:"JL", status:"Active", currentProject:"Acme Website Redesign", lastSeen:"Online", email:"jordan@northstardigital.demo" },
 { id:"wilson", name:"Wilson Nitunga", role:"Founder", initials:"WN", status:"Active", currentProject:"Acme Website Redesign", lastSeen:"Online", email:"wilson@northstardigital.demo" },
 { id:"kris", name:"Kris Morgan", role:"UI Designer", initials:"KM", status:"Active", currentProject:"Bloom Brand Identity", lastSeen:"Online", email:"kris@northstardigital.demo" },
 { id:"anwarul", name:"Anwarul Hasan", role:"Developer", initials:"AH", status:"Away", currentProject:"Nova Education Platform", lastSeen:"20 min ago", email:"anwarul@northstardigital.demo" },
 { id:"maya", name:"Maya Patel", role:"Creative Director", initials:"MP", status:"Offline", currentProject:"Bloom Brand Identity", lastSeen:"Yesterday", email:"maya@northstardigital.demo" },
 { id:"chris", name:"Chris Walker", role:"Developer", initials:"CW", status:"Active", currentProject:"Acme Website Redesign", lastSeen:"Online", email:"chris@northstardigital.demo" },
];
export interface Message { id: string; conversationId: string; authorId: string; text?: string; image?: string; time: string; replyToId?: string }
export interface Conversation { id: string; name: string; kind: "direct" | "group"; memberIds: string[]; unread: number }
export const conversations: Conversation[] = [
 { id:"c-wilson", name:"Wilson Nitunga", kind:"direct", memberIds:["jordan","wilson"], unread:2 },
 { id:"c-kris", name:"Kris Morgan", kind:"direct", memberIds:["jordan","kris"], unread:0 },
 { id:"c-design", name:"Design Team", kind:"group", memberIds:["jordan","kris","maya"], unread:1 },
 { id:"c-acme", name:"Acme Website", kind:"group", memberIds:["jordan","wilson","chris"], unread:0 },
];
export const messages: Message[] = [
 { id:"m1", conversationId:"c-wilson", authorId:"wilson", text:"Morning Jordan — can you take a pass at the homepage hero before 11:30?", time:"9:02 AM" },
 { id:"m2", conversationId:"c-wilson", authorId:"jordan", text:"On it. I’ll share the refined version shortly.", time:"9:05 AM" },
 { id:"m3", conversationId:"c-wilson", authorId:"wilson", text:"Great. I also assigned you the client presentation for tomorrow.", time:"9:40 AM" },
 { id:"m4", conversationId:"c-wilson", authorId:"wilson", text:"Let me know if the timeline feels tight 🙏", time:"9:41 AM" },
 { id:"m5", conversationId:"c-kris", authorId:"kris", text:"Pushed the updated color tokens to the Bloom file.", time:"Yesterday" },
 { id:"m6", conversationId:"c-kris", authorId:"jordan", text:"Thanks! The greens feel much calmer now.", time:"Yesterday" },
 { id:"m7", conversationId:"c-design", authorId:"maya", text:"Critique moved to Thursday 3pm.", time:"8:15 AM" },
 { id:"m8", conversationId:"c-design", authorId:"kris", text:"@Jordan can you bring the logo directions?", time:"8:20 AM" },
 { id:"m9", conversationId:"c-acme", authorId:"chris", text:"Handoff links are working on my side.", time:"Mon" },
];
export interface TeamActivity { id: string; personId: string; text: string; detail: string; time: string }
export const teamActivity: TeamActivity[] = [
 { id:"ta1", personId:"kris", text:"updated Brand identity project", detail:"Bloom Brand Identity", time:"25 min ago" },
 { id:"ta2", personId:"wilson", text:"assigned you a new task", detail:"Prepare client presentation", time:"1 hr ago" },
 { id:"ta3", personId:"chris", text:"completed “Set up component library”", detail:"Acme Website Redesign", time:"3 hr ago" },
 { id:"ta4", personId:"wilson", text:"changed a project deadline", detail:"Acme Website Redesign · Oct 12 → Oct 14", time:"Yesterday" },
];
