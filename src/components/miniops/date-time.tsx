import {useEffect,useId,useState} from 'react';
import {addDays,format,isValid,parse} from 'date-fns';
import {CalendarDays,Clock3,X} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {cn} from '@/lib/utils';

/** Display format used everywhere: "Sep 29, 2026". Values are ISO "yyyy-MM-dd". */
export const DISPLAY_DATE='MMM d, yyyy';
const DATE_PATTERNS=['MM/dd/yyyy','M/d/yyyy','MM/dd/yy','M/d/yy','yyyy-MM-dd','MMM d, yyyy','MMM d yyyy','MMMM d, yyyy','d MMM yyyy','MM-dd-yyyy','MM.dd.yyyy'];
export function parseDate(text:string):Date|null{const t=text.trim().replace(/(\d)(st|nd|rd|th)/g,'$1');if(!t)return null;for(const p of DATE_PATTERNS){const d=parse(t,p,new Date());if(isValid(d)&&d.getFullYear()>1900&&d.getFullYear()<2200)return d}return null}
const toIso=(d:Date)=>format(d,'yyyy-MM-dd');
const fromIso=(v?:string)=>{if(!v)return undefined;const d=parse(v,'yyyy-MM-dd',new Date());return isValid(d)?d:undefined};
export const formatDisplayDate=(v?:string)=>{const d=fromIso(v);return d?format(d,DISPLAY_DATE):''};

const shell='group flex h-10 w-full items-center rounded-[10px] bg-card shadow-[0_0_0_1px_var(--input)] transition-[box-shadow,background-color] duration-150 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,var(--input))] focus-within:shadow-[0_0_0_1px_var(--primary),0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]';
const invalidShell='shadow-[0_0_0_1px_var(--destructive)] focus-within:shadow-[0_0_0_1px_var(--destructive),0_0_0_4px_color-mix(in_oklab,var(--destructive)_14%,transparent)]';
const field='h-full min-w-0 flex-1 bg-transparent pl-3 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none';
const iconBtn='mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-primary-soft hover:text-primary focus-visible:outline-2';

type DateProps={id?:string;name?:string;value?:string;defaultValue?:string;onChange?:(v:string)=>void;placeholder?:string;required?:boolean;quick?:boolean;className?:string;'aria-label'?:string};

export function DateInput({id,name,value,defaultValue,onChange,placeholder='Select date',required,quick=true,className,...rest}:DateProps){
  const auto=useId();const inputId=id??auto;
  const [inner,setInner]=useState(defaultValue??'');const iso=value??inner;
  const [text,setText]=useState(formatDisplayDate(iso));const [error,setError]=useState('');const [open,setOpen]=useState(false);
  useEffect(()=>{setText(formatDisplayDate(iso))},[iso]);
  const commit=(next:string)=>{if(value===undefined)setInner(next);onChange?.(next);setText(formatDisplayDate(next));setError('')};
  const fromText=(t:string)=>{if(!t.trim()){commit('');return}const d=parseDate(t);if(d)commit(toIso(d));else setError('Enter a valid date.')};
  const today=new Date();const selected=fromIso(iso);
  return <div className={cn('min-w-0',className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn(shell,error&&invalidShell)}>
        <input id={inputId} value={text} placeholder={placeholder} required={required} autoComplete="off" aria-invalid={!!error} aria-describedby={error?`${inputId}-err`:undefined} aria-label={rest['aria-label']}
          onChange={e=>{setText(e.target.value);if(error)setError('')}} onBlur={e=>fromText(e.target.value)}
          onPaste={e=>{const t=e.clipboardData.getData('text');const d=parseDate(t);if(d){e.preventDefault();commit(toIso(d))}}}
          onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();fromText(text)}if(e.key==='ArrowDown'&&e.altKey){e.preventDefault();setOpen(true)}}}
          className={field}/>
        {name&&<input type="hidden" name={name} value={iso}/>}
        {iso&&<button type="button" aria-label="Clear date" onClick={()=>commit('')} className={cn(iconBtn,'mr-0 size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}><X className="size-3.5"/></button>}
        <PopoverTrigger asChild><button type="button" aria-label="Open calendar" className={iconBtn}><CalendarDays className="size-[18px]" strokeWidth={1.75}/></button></PopoverTrigger>
      </div>
      <PopoverContent align="end" sideOffset={6} collisionPadding={8} className="w-auto rounded-2xl border-border/60 p-0 shadow-modal">
        <Calendar mode="single" selected={selected} defaultMonth={selected??today} captionLayout="dropdown" startMonth={new Date(today.getFullYear()-5,0)} endMonth={new Date(today.getFullYear()+5,11)}
          onSelect={d=>{if(d){commit(toIso(d));setOpen(false)}}} className="pointer-events-auto p-3" autoFocus/>
        {quick&&<div className="flex gap-1.5 border-t border-border/60 p-2">
          {([['Yesterday',-1],['Today',0],['Tomorrow',1]] as const).map(([l,n])=><button key={l} type="button" onClick={()=>{commit(toIso(addDays(today,n)));setOpen(false)}} className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary">{l}</button>)}
        </div>}
      </PopoverContent>
    </Popover>
    {error&&<p id={`${inputId}-err`} className="mt-1 text-xs text-destructive">{error}</p>}
  </div>}

/** Time values are "HH:mm" (24h); displayed as "10:30 AM". */
export function parseTime(text:string):string|null{const t=text.trim().toLowerCase().replace(/\s+/g,'');if(!t)return null;const m=t.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/);if(!m)return null;let h=Number(m[1]);const min=Number(m[2]??0);const ap=m[3];if(min>59)return null;if(ap){if(h<1||h>12)return null;if(ap.startsWith('p')&&h<12)h+=12;if(ap.startsWith('a')&&h===12)h=0}else if(h>23)return null;return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`}
export function formatTime(v?:string){if(!v)return'';const [h,m]=v.split(':').map(Number);if(h===undefined||m===undefined||Number.isNaN(h))return'';const ap=h>=12?'PM':'AM';const hh=h%12||12;return `${hh}:${String(m).padStart(2,'0')} ${ap}`}

type TimeProps={id?:string;name?:string;value?:string;defaultValue?:string;onChange?:(v:string)=>void;placeholder?:string;required?:boolean;step?:number;className?:string};
export function TimeInput({id,name,value,defaultValue,onChange,placeholder='Select time',required,step=15,className}:TimeProps){
  const auto=useId();const inputId=id??auto;
  const [inner,setInner]=useState(defaultValue??'');const v=value??inner;
  const [text,setText]=useState(formatTime(v));const [error,setError]=useState('');const [open,setOpen]=useState(false);
  useEffect(()=>{setText(formatTime(v))},[v]);
  const commit=(next:string)=>{if(value===undefined)setInner(next);onChange?.(next);setText(formatTime(next));setError('')};
  const fromText=(t:string)=>{if(!t.trim()){commit('');return}const p=parseTime(t);if(p)commit(p);else setError('Enter a valid time.')};
  const slots=Array.from({length:(24*60)/step},(_,i)=>{const mins=i*step;return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`});
  useEffect(()=>{if(!open)return;const target=v||'09:00';requestAnimationFrame(()=>document.querySelector(`[data-slot-time="${inputId}-${target}"]`)?.scrollIntoView({block:'center'}))},[open,v,inputId]);
  return <div className={cn('min-w-0',className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn(shell,error&&invalidShell)}>
        <input id={inputId} value={text} placeholder={placeholder} required={required} autoComplete="off" aria-invalid={!!error} aria-describedby={error?`${inputId}-err`:undefined}
          onChange={e=>{setText(e.target.value);if(error)setError('')}} onBlur={e=>fromText(e.target.value)}
          onPaste={e=>{const p=parseTime(e.clipboardData.getData('text'));if(p){e.preventDefault();commit(p)}}}
          onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();fromText(text)}if(e.key==='ArrowDown'&&e.altKey){e.preventDefault();setOpen(true)}}}
          className={field}/>
        {name&&<input type="hidden" name={name} value={v}/>}
        {v&&<button type="button" aria-label="Clear time" onClick={()=>commit('')} className={cn(iconBtn,'mr-0 size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}><X className="size-3.5"/></button>}
        <PopoverTrigger asChild><button type="button" aria-label="Open time picker" className={iconBtn}><Clock3 className="size-[18px]" strokeWidth={1.75}/></button></PopoverTrigger>
      </div>
      <PopoverContent align="end" sideOffset={6} collisionPadding={8} className="w-44 rounded-2xl border-border/60 p-1.5 shadow-modal">
        <div role="listbox" aria-label="Times" className="max-h-64 overflow-y-auto">
          {slots.map(s=><button key={s} role="option" aria-selected={s===v} type="button" data-slot-time={`${inputId}-${s}`} onClick={()=>{commit(s);setOpen(false)}}
            className={cn('flex w-full items-center rounded-lg px-3 py-1.5 text-left text-sm tabular-nums transition-colors duration-150 hover:bg-primary-soft',s===v&&'bg-primary font-medium text-primary-foreground hover:bg-primary')}>{formatTime(s)}</button>)}
        </div>
      </PopoverContent>
    </Popover>
    {error&&<p id={`${inputId}-err`} className="mt-1 text-xs text-destructive">{error}</p>}
  </div>}
