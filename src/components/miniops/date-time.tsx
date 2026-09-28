import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {addDays,endOfMonth,endOfQuarter,endOfWeek,format,isValid,parse,startOfMonth,startOfQuarter,startOfWeek,startOfYear,subMonths,subQuarters} from 'date-fns';
import type {DateRange} from 'react-day-picker';
import {CalendarDays,CalendarRange,Clock3,X} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {cn} from '@/lib/utils';

/** Display format used everywhere: "Sep 29, 2026". Values are ISO "yyyy-MM-dd". */
export const DISPLAY_DATE='MMM d, yyyy';
const DATE_PATTERNS=['MM/dd/yyyy','M/d/yyyy','MM/dd/yy','M/d/yy','yyyy-MM-dd','MMM d, yyyy','MMM d yyyy','MMMM d, yyyy','MMMM d yyyy','d MMM yyyy','MM-dd-yyyy','MM.dd.yyyy'];
export function parseDate(text:string):Date|null{const t=text.trim().replace(/(\d)(st|nd|rd|th)/g,'$1');if(!t)return null;for(const p of DATE_PATTERNS){const d=parse(t,p,new Date());if(isValid(d)&&d.getFullYear()>1900&&d.getFullYear()<2200)return d}return null}
export const toIso=(d:Date)=>format(d,'yyyy-MM-dd');
export const fromIso=(v?:string)=>{if(!v)return undefined;const d=parse(v,'yyyy-MM-dd',new Date());return isValid(d)?d:undefined};
export const formatDisplayDate=(v?:string)=>{const d=fromIso(v);return d?format(d,DISPLAY_DATE):''};
/** Sample data stores short dates like "Sep 23"; treat them as the current demo year. */
export const shortToDate=(s:string,year=2026)=>parseDate(`${s}, ${year}`);
export const displayShort=(s:string)=>{const d=shortToDate(s);return d?format(d,DISPLAY_DATE):s};

const shell='group flex h-11 w-full items-center rounded-[10px] bg-card shadow-[0_0_0_1px_var(--input)] transition-[box-shadow,background-color] duration-150 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,var(--input))] focus-within:shadow-[0_0_0_1px_var(--primary),0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)] sm:h-10';
const invalidShell='shadow-[0_0_0_1px_var(--destructive)] hover:shadow-[0_0_0_1px_var(--destructive)] focus-within:shadow-[0_0_0_1px_var(--destructive),0_0_0_4px_color-mix(in_oklab,var(--destructive)_14%,transparent)]';
const field='h-full min-w-0 flex-1 bg-transparent pl-3 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none sm:text-sm';
const iconBtn='mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-primary-soft hover:text-primary focus-visible:outline-2 sm:size-8';
const clearBtn='grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-[opacity,color] duration-150 hover:text-foreground sm:size-7 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100';
const popover='rounded-2xl border-border/60 shadow-modal data-[state=open]:duration-200';

function FieldError({id,error,hint}:{id:string;error?:string|undefined;hint?:string|undefined}){if(error)return <p id={`${id}-err`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">{error}</p>;if(hint)return <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">{hint}</p>;return null}

type DateProps={id?:string;name?:string;value?:string;defaultValue?:string;onChange?:((v:string)=>void)|undefined;placeholder?:string;required?:boolean;quick?:boolean;min?:string|undefined;max?:string|undefined;hint?:string|undefined;className?:string;'aria-label'?:string};

export function DateInput({id,name,value,defaultValue,onChange,placeholder='MM/DD/YYYY',required,quick=true,min,max,hint,className,...rest}:DateProps){
  const auto=useId();const inputId=id??auto;
  const [inner,setInner]=useState(defaultValue??'');const iso=value??inner;
  const [text,setText]=useState(formatDisplayDate(iso));const [error,setError]=useState('');const [open,setOpen]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{setText(formatDisplayDate(iso))},[iso]);
  const check=(next:string)=>{if(!next)return required?'Date is required.':'';if(min&&next<min)return `Choose ${formatDisplayDate(min)} or later.`;if(max&&next>max)return `Choose ${formatDisplayDate(max)} or earlier.`;return ''};
  const commit=(next:string)=>{if(value===undefined)setInner(next);onChange?.(next);setText(formatDisplayDate(next));setError(check(next))};
  const fromText=(t:string)=>{if(!t.trim()){commit('');return}const d=parseDate(t);if(d)commit(toIso(d));else setError('Enter a valid date, e.g. 09/29/2026.')};
  // Re-validate when bounds change (e.g. start date moved after end date).
  useEffect(()=>{if(iso)setError(check(iso))},[min,max]);// eslint-disable-line react-hooks/exhaustive-deps
  const today=new Date();const selected=fromIso(iso);
  const shift=(days:number)=>{const base=selected??today;commit(toIso(addDays(base,days)))};
  const onKey=(e:KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==='Enter'){e.preventDefault();fromText(text)}
    else if((e.key==='ArrowDown'&&e.altKey)||(e.key===' '&&e.ctrlKey)){e.preventDefault();setOpen(true)}
    else if((e.key==='ArrowUp'||e.key==='ArrowDown')&&!e.altKey&&(!text||parseDate(text))){e.preventDefault();shift(e.key==='ArrowUp'?1:-1)}
    else if(e.key==='Escape'&&error){setText(formatDisplayDate(iso));setError('')}};
  const disabled=[...(min?[{before:fromIso(min)!}]:[]),...(max?[{after:fromIso(max)!}]:[])];
  return <div className={cn('min-w-0',className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn(shell,error&&invalidShell)}>
        <input ref={inputRef} id={inputId} value={text} placeholder={placeholder} required={required} autoComplete="off" inputMode="numeric" aria-invalid={!!error} aria-describedby={error?`${inputId}-err`:hint?`${inputId}-hint`:undefined} aria-label={rest['aria-label']}
          onChange={e=>{setText(e.target.value);if(error)setError('')}} onBlur={e=>fromText(e.target.value)} onFocus={e=>e.target.select()}
          onPaste={e=>{const d=parseDate(e.clipboardData.getData('text'));if(d){e.preventDefault();commit(toIso(d))}}}
          onKeyDown={onKey} className={field}/>
        {name&&<input type="hidden" name={name} value={iso}/>}
        {iso&&<button type="button" aria-label="Clear date" onClick={()=>{commit('');inputRef.current?.focus()}} className={clearBtn}><X className="size-3.5"/></button>}
        <PopoverTrigger asChild><button type="button" aria-label="Open calendar" aria-haspopup="dialog" className={iconBtn}><CalendarDays className="size-5" strokeWidth={1.75}/></button></PopoverTrigger>
      </div>
      <PopoverContent align="end" sideOffset={6} collisionPadding={8} onCloseAutoFocus={e=>{e.preventDefault();inputRef.current?.focus()}} className={cn(popover,'w-auto max-w-[calc(100vw-16px)] p-0')}>
        <Calendar mode="single" selected={selected} defaultMonth={selected??today} captionLayout="dropdown" startMonth={new Date(today.getFullYear()-5,0)} endMonth={new Date(today.getFullYear()+5,11)} disabled={disabled}
          onSelect={d=>{if(d){commit(toIso(d));setOpen(false)}}} className="pointer-events-auto p-3 [--cell-size:2.6rem] sm:[--cell-size:2.2rem]" autoFocus/>
        {quick&&<div className="flex gap-1.5 border-t border-border/60 p-2">
          {([['Yesterday',-1],['Today',0],['Tomorrow',1]] as const).map(([l,n])=><button key={l} type="button" onClick={()=>{commit(toIso(addDays(today,n)));setOpen(false)}} className="flex-1 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary focus-visible:bg-primary-soft focus-visible:text-primary sm:py-1.5">{l}</button>)}
        </div>}
      </PopoverContent>
    </Popover>
    <FieldError id={inputId} error={error} hint={hint}/>
  </div>}

/** Time values are "HH:mm" (24h); displayed as "10:30 AM". */
export function parseTime(text:string):string|null{const t=text.trim().toLowerCase().replace(/[\s.]+/g,'');if(!t)return null;const m=t.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/);if(!m)return null;let h=Number(m[1]);const min=Number(m[2]??0);const ap=m[3];if(min>59)return null;if(ap){if(h<1||h>12)return null;if(ap.startsWith('p')&&h<12)h+=12;if(ap.startsWith('a')&&h===12)h=0}else if(h>23)return null;return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`}
export function formatTime(v?:string){if(!v)return'';const [h,m]=v.split(':').map(Number);if(h===undefined||m===undefined||Number.isNaN(h))return'';const ap=h>=12?'PM':'AM';const hh=h%12||12;return `${hh}:${String(m).padStart(2,'0')} ${ap}`}
const addMinutes=(v:string,d:number)=>{const [h=0,m=0]=v.split(':').map(Number);const t=((h*60+m+d)%1440+1440)%1440;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`};

type TimeProps={id?:string;name?:string;value?:string;defaultValue?:string;onChange?:(v:string)=>void;placeholder?:string;required?:boolean;step?:number;hint?:string|undefined;className?:string};
export function TimeInput({id,name,value,defaultValue,onChange,placeholder='e.g. 10:30 AM',required,step=15,hint,className}:TimeProps){
  const auto=useId();const inputId=id??auto;
  const [inner,setInner]=useState(defaultValue??'');const v=value??inner;
  const [text,setText]=useState(formatTime(v));const [error,setError]=useState('');const [open,setOpen]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);const listRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{setText(formatTime(v))},[v]);
  const commit=(next:string)=>{if(value===undefined)setInner(next);onChange?.(next);setText(formatTime(next));setError(!next&&required?'Time is required.':'')};
  const fromText=(t:string)=>{if(!t.trim()){commit('');return}const p=parseTime(t);if(p)commit(p);else setError('Enter a valid time, e.g. 10:30 AM.')};
  const slots=Array.from({length:(24*60)/step},(_,i)=>addMinutes('00:00',i*step));
  const options=()=>Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role=option]')??[]);
  const focusInitial=()=>{const nearest=v?slots.reduce((a,s)=>Math.abs(toMin(s)-toMin(v))<Math.abs(toMin(a)-toMin(v))?s:a,slots[0]!):'09:00';const el=options().find(o=>o.dataset['value']===nearest);el?.focus();el?.scrollIntoView({block:'center'})};
  const onListKey=(e:KeyboardEvent<HTMLDivElement>)=>{const list=options();const i=list.indexOf(document.activeElement as HTMLButtonElement);const go=(n:number)=>{e.preventDefault();const el=list[Math.max(0,Math.min(list.length-1,n))];el?.focus();el?.scrollIntoView({block:'nearest'})};
    if(e.key==='ArrowDown')go(i+1);else if(e.key==='ArrowUp')go(i-1);else if(e.key==='PageDown')go(i+4);else if(e.key==='PageUp')go(i-4);else if(e.key==='Home')go(0);else if(e.key==='End')go(list.length-1)};
  const onKey=(e:KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==='Enter'){e.preventDefault();fromText(text)}
    else if((e.key==='ArrowDown'&&e.altKey)||(e.key===' '&&e.ctrlKey)){e.preventDefault();setOpen(true)}
    else if((e.key==='ArrowUp'||e.key==='ArrowDown')&&(!text||parseTime(text))){e.preventDefault();const base=parseTime(text)??'09:00';commit(text?addMinutes(base,e.key==='ArrowUp'?step:-step):base)}
    else if(e.key==='Escape'&&error){setText(formatTime(v));setError('')}};
  return <div className={cn('min-w-0',className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn(shell,error&&invalidShell)}>
        <input ref={inputRef} id={inputId} value={text} placeholder={placeholder} required={required} autoComplete="off" aria-invalid={!!error} aria-describedby={error?`${inputId}-err`:hint?`${inputId}-hint`:undefined}
          onChange={e=>{setText(e.target.value);if(error)setError('')}} onBlur={e=>fromText(e.target.value)} onFocus={e=>e.target.select()}
          onPaste={e=>{const p=parseTime(e.clipboardData.getData('text'));if(p){e.preventDefault();commit(p)}}}
          onKeyDown={onKey} className={field}/>
        {name&&<input type="hidden" name={name} value={v}/>}
        {v&&<button type="button" aria-label="Clear time" onClick={()=>{commit('');inputRef.current?.focus()}} className={clearBtn}><X className="size-3.5"/></button>}
        <PopoverTrigger asChild><button type="button" aria-label="Open time picker" aria-haspopup="listbox" className={iconBtn}><Clock3 className="size-5" strokeWidth={1.75}/></button></PopoverTrigger>
      </div>
      <PopoverContent align="end" sideOffset={6} collisionPadding={8} onOpenAutoFocus={e=>{e.preventDefault();requestAnimationFrame(focusInitial)}} onCloseAutoFocus={e=>{e.preventDefault();inputRef.current?.focus()}} className={cn(popover,'w-[min(12rem,calc(100vw-16px))] p-1.5')}>
        <div ref={listRef} role="listbox" aria-label="Choose a time" onKeyDown={onListKey} className="max-h-72 overflow-y-auto overscroll-contain sm:max-h-64">
          {slots.map(s=><button key={s} role="option" aria-selected={s===v} type="button" data-value={s} onClick={()=>{commit(s);setOpen(false)}}
            className={cn('flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm tabular-nums outline-none transition-colors duration-150 hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:text-primary sm:py-1.5',s===v&&'bg-primary font-medium text-primary-foreground hover:bg-primary focus-visible:bg-primary focus-visible:text-primary-foreground')}>{formatTime(s)}</button>)}
        </div>
      </PopoverContent>
    </Popover>
    <FieldError id={inputId} error={error} hint={hint}/>
  </div>}
const toMin=(v:string)=>{const [h=0,m=0]=v.split(':').map(Number);return h*60+m};

/** Range value: ISO start/end strings; empty strings mean "all dates". */
export type IsoRange={from:string;to:string};
const PRESETS:[string,(t:Date)=>[Date,Date]][]=[
  ['This Week',t=>[startOfWeek(t),endOfWeek(t)]],['This Month',t=>[startOfMonth(t),endOfMonth(t)]],['Last Month',t=>{const m=subMonths(t,1);return [startOfMonth(m),endOfMonth(m)]}],
  ['This Quarter',t=>[startOfQuarter(t),endOfQuarter(t)]],['Last Quarter',t=>{const q=subQuarters(t,1);return [startOfQuarter(q),endOfQuarter(q)]}],['YTD',t=>[startOfYear(t),t]]];
export const rangeLabel=(r:IsoRange)=>r.from?`${formatDisplayDate(r.from)} — ${formatDisplayDate(r.to||r.from)}`:'All dates';
export function inRange(d:Date|null,r:IsoRange){if(!r.from||!d)return true;const iso=toIso(d);return iso>=r.from&&iso<=(r.to||r.from)}

export function DateRangePicker({value,onChange,className}:{value:IsoRange;onChange:(r:IsoRange)=>void;className?:string}){
  const [open,setOpen]=useState(false);const [draft,setDraft]=useState<DateRange|undefined>();
  const today=new Date();
  useEffect(()=>{if(open)setDraft(value.from?{from:fromIso(value.from),to:fromIso(value.to)}:undefined)},[open,value]);
  const apply=(r?:DateRange)=>{onChange(r?.from?{from:toIso(r.from),to:toIso(r.to??r.from)}:{from:'',to:''});setOpen(false)};
  const active=!!value.from;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" aria-label={`Date range: ${rangeLabel(value)}`} className={cn('inline-flex h-10 max-w-full items-center gap-2 rounded-[10px] bg-card px-3 text-sm font-medium shadow-[0_0_0_1px_var(--input)] transition-[box-shadow,color] duration-150 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,var(--input))]',active&&'text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_45%,var(--input))]',className)}>
      <CalendarRange className="size-4 shrink-0" strokeWidth={1.75}/><span className="truncate tabular-nums">{rangeLabel(value)}</span></button></PopoverTrigger>
    <PopoverContent align="start" sideOffset={6} collisionPadding={8} className={cn(popover,'w-auto max-w-[calc(100vw-16px)] p-0')}>
      <div className="flex flex-col sm:flex-row">
        <div className="flex gap-1 overflow-x-auto border-b border-border/60 p-2 sm:w-36 sm:flex-col sm:border-b-0 sm:border-r">
          {PRESETS.map(([l,fn])=>{const [f,t]=fn(today);return <button key={l} type="button" onClick={()=>apply({from:f,to:t})} className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary focus-visible:bg-primary-soft focus-visible:text-primary sm:py-1.5">{l}</button>})}
          <button type="button" onClick={()=>apply(undefined)} className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary sm:py-1.5">All dates</button>
        </div>
        <div>
          <Calendar mode="range" selected={draft} onSelect={setDraft} defaultMonth={draft?.from??today} captionLayout="dropdown" startMonth={new Date(today.getFullYear()-5,0)} endMonth={new Date(today.getFullYear()+5,11)} className="pointer-events-auto p-3 [--cell-size:2.6rem] sm:[--cell-size:2.2rem]" autoFocus/>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 p-2 pl-3">
            <span className="min-w-0 truncate text-xs text-muted-foreground tabular-nums">{draft?.from?rangeLabel({from:toIso(draft.from),to:draft.to?toIso(draft.to):''}):'Pick a start date'}</span>
            <button type="button" disabled={!draft?.from} onClick={()=>apply(draft)} className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-40">Apply</button>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>}
