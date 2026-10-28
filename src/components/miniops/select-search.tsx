import {useId,useState} from 'react';
import {Check,ChevronsUpDown,X} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Command,CommandEmpty,CommandGroup,CommandInput,CommandItem,CommandList} from '@/components/ui/command';
import {cn} from '@/lib/utils';

export type Option={value:string;label:string;hint?:string};
type Props={id?:string;name?:string;options:(Option|string)[];value?:string;defaultValue?:string;onChange?:(v:string)=>void;placeholder?:string;searchPlaceholder?:string;clearable?:boolean;variant?:'field'|'filter';className?:string;'aria-label'?:string};

/** One searchable select used for forms and filters across MiniOps. */
export function SearchableSelect({id,name,options,value,defaultValue,onChange,placeholder='Select…',searchPlaceholder='Search…',clearable,variant='field',className,...rest}:Props){
  const auto=useId();const triggerId=id??auto;
  const opts=options.map(o=>typeof o==='string'?{value:o,label:o}:o);
  const [inner,setInner]=useState(defaultValue??'');const v=value??inner;const [open,setOpen]=useState(false);
  const set=(n:string)=>{if(value===undefined)setInner(n);onChange?.(n)};
  const current=opts.find(o=>o.value===v);
  const filter=variant==='filter';
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button id={triggerId} type="button" role="combobox" aria-expanded={open} aria-label={rest['aria-label']}
        className={cn('group inline-flex items-center gap-2 rounded-[10px] bg-card text-left text-sm transition-[box-shadow,color] duration-150 shadow-[0_0_0_1px_var(--input)] hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,var(--input))] focus-visible:shadow-[0_0_0_1px_var(--primary),0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)] focus-visible:outline-none',
          filter?'h-10 max-w-full px-3 font-medium':'h-11 w-full px-3 sm:h-10',filter&&current&&'text-primary shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_45%,var(--input))]',className)}>
        <span className={cn('min-w-0 flex-1 truncate',!current&&!filter&&'text-muted-foreground/70')}>{current?.label??placeholder}</span>
        {clearable&&current?<span role="button" tabIndex={-1} aria-label="Clear" onClick={e=>{e.stopPropagation();set('')}} className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"><X className="size-3.5"/></span>
          :<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75}/>}
      </button>
    </PopoverTrigger>
    {name&&<input type="hidden" name={name} value={v}/>}
    <PopoverContent align="start" sideOffset={6} collisionPadding={8} className="w-[max(var(--radix-popover-trigger-width),14rem)] max-w-[calc(100vw-16px)] rounded-2xl border-border/60 p-0 shadow-modal">
      <Command>
        {opts.length>6&&<CommandInput placeholder={searchPlaceholder}/>}
        <CommandList className="max-h-72 p-1">
          <CommandEmpty>No matches found.</CommandEmpty>
          <CommandGroup>
            {opts.map(o=><CommandItem key={o.value} value={o.label} onSelect={()=>{set(o.value);setOpen(false)}} className="gap-2 rounded-lg px-2.5 py-2.5 data-[selected=true]:bg-primary-soft sm:py-2">
              <span className="min-w-0 flex-1 truncate">{o.label}{o.hint&&<span className="ml-1.5 text-xs text-muted-foreground">{o.hint}</span>}</span>
              <Check className={cn('size-4 shrink-0 text-primary',o.value===v?'opacity-100':'opacity-0')}/>
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>}

type MultiProps={id?:string;options:Option[];value:string[];onChange:(v:string[])=>void;placeholder?:string;searchPlaceholder?:string;className?:string};

/** SearchableSelect for picking several values; stays open while you tick options. */
export function SearchableMultiSelect({id,options,value,onChange,placeholder='Select…',searchPlaceholder='Search…',className}:MultiProps){
  const auto=useId();const triggerId=id??auto;const [open,setOpen]=useState(false);
  const toggle=(v:string)=>onChange(value.includes(v)?value.filter(x=>x!==v):[...value,v]);
  const chosen=options.filter(o=>value.includes(o.value));
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button id={triggerId} type="button" role="combobox" aria-expanded={open}
        className={cn('group inline-flex h-11 w-full items-center gap-2 rounded-[10px] bg-card px-3 text-left text-sm transition-[box-shadow,color] duration-150 shadow-[0_0_0_1px_var(--input)] hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,var(--input))] focus-visible:shadow-[0_0_0_1px_var(--primary),0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)] focus-visible:outline-none sm:h-10',className)}>
        <span className={cn('min-w-0 flex-1 truncate',!chosen.length&&'text-muted-foreground/70')}>{chosen.length?chosen.map(o=>o.label).join(', '):placeholder}</span>
        {chosen.length?<span role="button" tabIndex={-1} aria-label="Clear" onClick={e=>{e.stopPropagation();onChange([])}} className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"><X className="size-3.5"/></span>
          :<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75}/>}
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" sideOffset={6} collisionPadding={8} className="w-[max(var(--radix-popover-trigger-width),14rem)] max-w-[calc(100vw-16px)] rounded-2xl border-border/60 p-0 shadow-modal">
      <Command>
        {options.length>6&&<CommandInput placeholder={searchPlaceholder}/>}
        <CommandList className="max-h-72 p-1">
          <CommandEmpty>No matches found.</CommandEmpty>
          <CommandGroup>
            {options.map(o=><CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={()=>toggle(o.value)} className="gap-2 rounded-lg px-2.5 py-2.5 data-[selected=true]:bg-primary-soft sm:py-2">
              <span className="min-w-0 flex-1 truncate">{o.label}{o.hint&&<span className="ml-1.5 text-xs text-muted-foreground">{o.hint}</span>}</span>
              <Check className={cn('size-4 shrink-0 text-primary',value.includes(o.value)?'opacity-100':'opacity-0')}/>
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>}
