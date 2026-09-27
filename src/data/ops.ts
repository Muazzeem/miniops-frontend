// Mock operational services: chat, notifications, profile.
// Shapes are backend-ready; swap the seed functions for API calls later.
import type {Project,Task,TeamMember} from './mock';

export type ChatMessage={id:string;author:string;text?:string|undefined;image?:string|undefined;time:string;replyTo?:string|undefined;deleted?:boolean};
export type Conversation={id:string;kind:'direct'|'group';name:string;memberIds:string[];project?:string|undefined;unread:number;messages:ChatMessage[]};
export type NotificationType='project'|'task'|'message'|'team';
export type AppNotification={id:string;type:NotificationType;title:string;description:string;ago:string;read:boolean;to:string;search?:Record<string,string>};
export type Profile={id:string;name:string;title:string;email:string;phone:string;timezone:string;avatar?:string|undefined};

export const ME='alex';
export const initialProfile:Profile={id:ME,name:'Alex Morgan',title:'Founder & Project Lead',email:'alex@northstardigital.co',phone:'+1 (415) 555-0142',timezone:'Asia/Dhaka (UTC+6)'};
export const ONLINE=new Set(['jordan','maya','priya']);
export const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
export const MAX_IMAGE_BYTES=5*1024*1024;
export function validateImage(file:File){if(!IMAGE_TYPES.includes(file.type))return 'Use a JPG, PNG or WEBP image.';if(file.size>MAX_IMAGE_BYTES)return 'Image must be 5MB or smaller.';return null}
export const readImage=(file:File)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)});

export function seedConversations(prefix:string,team:TeamMember[],projects:Project[]):Conversation[]{const others=team.filter(m=>m[0]!==ME);if(!others.length)return [];const o=(i:number)=>others[i%others.length]![0];const name=(i:number)=>String(others[i%others.length]![1]);const p=projects[0]?.name??'Website Redesign';const seeds:Conversation[]=[
{id:`${prefix}-dm-1`,kind:'direct',name:name(0),memberIds:[ME,o(0)],unread:2,messages:[{id:'m1',author:ME,text:'Morning! How is the homepage coming along?',time:'9:12 AM'},{id:'m2',author:o(0),text:'Almost there — just polishing the hero section.',time:'9:20 AM'},{id:'m3',author:o(0),text:'Can you review the homepage before lunch?',time:'9:41 AM'}]},
{id:`${prefix}-dm-2`,kind:'direct',name:name(1),memberIds:[ME,o(1)],unread:1,messages:[{id:'m1',author:o(1),text:'Pushed the portal fixes to staging.',time:'Yesterday'},{id:'m2',author:ME,text:'Great, I will test it this afternoon.',time:'Yesterday'},{id:'m3',author:o(1),text:'I will finish the dashboard today.',time:'8:55 AM'}]},
{id:`${prefix}-grp-design`,kind:'group',name:'Design Team',memberIds:[ME,o(0),o(3)],unread:0,messages:[{id:'m1',author:o(3),text:'I uploaded the latest design to the project.',time:'Mon'},{id:'m2',author:ME,text:'Looks sharp. Let’s present it Thursday.',time:'Mon'}]},
{id:`${prefix}-grp-project`,kind:'group',name:`Project: ${p}`,project:p,memberIds:[ME,o(0),o(1),o(2)],unread:3,messages:[{id:'m1',author:o(2),text:'Client approved the update 🎉',time:'10:02 AM'},{id:'m2',author:o(1),text:'Nice! Moving QA tasks to this week.',time:'10:05 AM'},{id:'m3',author:o(0),text:'I will send the final assets tonight.',time:'10:09 AM'}]},
{id:`${prefix}-dm-3`,kind:'direct',name:name(2),memberIds:[ME,o(2)],unread:0,messages:[{id:'m1',author:o(2),text:'Thanks for the feedback on the proposal.',time:'Sep 22'}]}];return seeds.filter((c,i,a)=>a.findIndex(x=>x.name===c.name)===i).map(c=>({...c,memberIds:[...new Set(c.memberIds)]}))}

export function seedNotifications(prefix:string,{projects,tasks,team,conversations}:{projects:Project[];tasks:Task[];team:TeamMember[];conversations:Conversation[]}):AppNotification[]{const list:AppNotification[]=[];const risky=projects.find(p=>p.health!=='Healthy');if(risky)list.push({id:`${prefix}-n1`,type:'project',title:'Deadline approaching',description:`${risky.name} is approaching its deadline.`,ago:'12m',read:false,to:`/projects/${risky.id}`});const convo=conversations.find(c=>c.unread>0);if(convo)list.push({id:`${prefix}-n4`,type:'message',title:'New message',description:`New message from ${convo.name}.`,ago:'1h',read:false,to:'/chat',search:{c:convo.id}});const member=team[1];if(member)list.push({id:`${prefix}-n5`,type:'team',title:'Work completed',description:`${String(member[1]).split(' ')[0]} completed 4 tasks.`,ago:'2h',read:true,to:'/team'});const open=tasks.filter(t=>t[5]!=='Done').length;if(open)list.push({id:`${prefix}-n6`,type:'task',title:'Tasks overdue',description:`${Math.min(3,open)} tasks are overdue.`,ago:'3h',read:true,to:'/tasks'});return list}

export const nowLabel=()=>new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
export const initials=(name:string)=>name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
