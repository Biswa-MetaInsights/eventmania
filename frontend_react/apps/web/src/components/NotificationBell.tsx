'use client';
import Link from 'next/link';
import { BellIcon } from './organizer/ConsoleIcons';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collaboration, currentUserId } from '@/lib/operations';
import { useAuthStore } from '@eventmind/store';

export function NotificationList() {
  const userId = currentUserId();
  const auth = useAuthStore(s=>s.isAuthenticated);
  const client = useQueryClient();
  const notices = useQuery({queryKey:['notifications',userId],queryFn:()=>collaboration.notices().then(r=>r.data),enabled:auth,refetchInterval:30000});
  const [error,setError] = useState('');
  return <div className="space-y-3">
    <div className="flex justify-between items-center gap-3"><h2 className="font-bold text-[20px]">Notifications</h2><button className="text-[15px] underline p-2" onClick={async()=>{try{await collaboration.readAll();await client.invalidateQueries({queryKey:['notifications',userId]});}catch{setError('Notifications could not be marked as read.');}}}>Mark all read</button></div>
    {error&&<p role="alert">{error}</p>}
    {notices.isPending?<p>Loading notifications…</p>:notices.isError?<p role="alert">Notifications could not be loaded.</p>:!notices.data?.items.length?<p>No notifications yet. Event updates will appear here.</p>:<ul className="space-y-2 max-h-[55dvh] overflow-y-auto">{notices.data.items.map(n=><li key={n.id}><Link href={n.href} className={`block rounded-lg p-3 hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)] ${!n.read_at?'font-bold':''}`} onClick={()=>{void collaboration.read(n.id).then(()=>client.invalidateQueries({queryKey:['notifications',userId]})).catch(()=>{});}}>{n.title}<span className="block font-normal text-[15px] mt-1">{n.body}</span></Link></li>)}</ul>}
  </div>;
}
export function NotificationBell() {
  const [open,setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const userId = currentUserId();
  const notices = useQuery({queryKey:['notifications',userId],queryFn:()=>collaboration.notices().then(r=>r.data),refetchInterval:30000});
  useEffect(()=>{if(!open)return;const close=(e:MouseEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('mousedown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',escape);};},[open]);
  return <div className="relative" ref={ref}><button type="button" aria-label="Notifications" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="relative p-2 rounded-lg hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)]">
    <BellIcon className="w-[21px] h-[21px]" />
    {!!notices.data?.unread_count&&<span className="absolute -top-1 -right-1 rounded-full bg-[var(--brand-terracotta)] text-[var(--brand-on-terracotta)] px-1 text-[15px]">{notices.data.unread_count}</span>}
  </button>{open&&<section aria-label="Notifications" className="absolute right-0 mt-2 w-[min(360px,85vw)] rounded-lg shadow-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 z-[80]"><NotificationList/></section>}</div>;
}
