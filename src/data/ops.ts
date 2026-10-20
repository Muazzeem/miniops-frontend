// Mock profile (signed-out demo). Chat and notifications come from the API.

export type NotificationType='task'|'deadline'|'time'|'expense'|'project'|'team';
export type AppNotification={id:string;type:NotificationType;title:string;description:string;ago:string;read:boolean;to:string;search?:Record<string,string>};
export type Profile={id:string;name:string;title:string;email:string;phone:string;timezone:string;avatar?:string|undefined};

export const ME='alex';
export const initialProfile:Profile={id:ME,name:'Alex Morgan',title:'Founder & Project Lead',email:'alex@northstardigital.co',phone:'+1 (415) 555-0142',timezone:'Asia/Dhaka (UTC+6)'};
export const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
export const MAX_IMAGE_BYTES=5*1024*1024;
export function validateImage(file:File){if(!IMAGE_TYPES.includes(file.type))return 'Use a JPG, PNG or WEBP image.';if(file.size>MAX_IMAGE_BYTES)return 'Image must be 5MB or smaller.';return null}
export const readImage=(file:File)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)});



export const nowLabel=()=>new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
export const initials=(name:string)=>name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
