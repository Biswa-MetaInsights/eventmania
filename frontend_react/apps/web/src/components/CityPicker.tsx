'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocationStore, DEFAULT_CITY } from '@eventmind/store';
import { LocationPinIcon } from './EventIcons';
import { LocationSelector } from './LocationSelector';
export function CityPicker({variant='pill'}:{variant?:'pill'|'icon'|'inline'}={}) {
  const ready=useLocationStore(s=>s._hasHydrated);
  const selected=useLocationStore(s=>s.selectedCity);
  const setCity=useLocationStore(s=>s.setCity);
  const city=ready?selected:DEFAULT_CITY;
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!open)return;const outside=(e:MouseEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('mousedown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape);};},[open]);
  return <div className="relative min-w-0" ref={ref}><button type="button" onClick={()=>setOpen(v=>!v)} aria-label="Select city" aria-expanded={open} className="flex items-center gap-2 rounded-lg px-3 py-2 max-w-[180px] hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)]"><LocationPinIcon className="w-4 h-4 shrink-0"/>{variant!=='icon'&&<span className="truncate">{city.name}</span>}</button>{open&&<div className="absolute right-0 top-full mt-2 p-4 w-[320px] max-w-[calc(100vw-24px)] rounded-lg shadow-xl z-[90] border border-[var(--brand-border)] bg-[var(--brand-surface)]"><LocationSelector value={city} onChange={next=>{setCity(next);setOpen(false);}}/></div>}</div>;
}
