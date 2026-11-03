'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@eventmind/store';
import { collaboration, currentUserId } from '@/lib/operations';
import { Navbar } from '@/components/navbar/Navbar';
import { GUTTERS } from '@/lib/layout';
import { inputCls } from '@/components/FormControls';

export function EventRooms({roomId}: {roomId?: string}) {
  const router = useRouter();
  const ready = useAuthStore(s=>s._hasHydrated);
  const authenticated = useAuthStore(s=>s.isAuthenticated);
  const client = useQueryClient();
  const [text, setText] = useState('');
  const request = useRef({id: '', text: ''});
  const userId = currentUserId();
  useEffect(()=>{if (ready && !authenticated) router.replace('/auth');},[ready, authenticated, router]);
  const rooms = useQuery({queryKey:['event-rooms',userId],queryFn:()=>collaboration.rooms().then(r=>r.data),enabled:ready&&authenticated,refetchInterval:15000});
  const messages = useInfiniteQuery({queryKey:['event-messages',roomId,userId],initialPageParam:undefined as string|undefined,queryFn:({pageParam})=>collaboration.messages(roomId!,pageParam).then(r=>r.data),getNextPageParam:last=>last.length===50?last[0].created_at:undefined,enabled:ready&&authenticated&&!!roomId,refetchInterval:5000});
  const history=messages.data?.pages.slice().reverse().flat();
  const latest = messages.data?.pages[0]?.at(-1)?.id;
  useEffect(()=>{if(roomId && latest) void collaboration.readRoom(roomId).then(()=>client.invalidateQueries({queryKey:['event-rooms',userId]})).catch(()=>{});},[roomId,latest,client,userId]);
  const post = useMutation({mutationFn:()=> {
    if(request.current.text!==text || !request.current.id) request.current={id:crypto.randomUUID(),text};
    return collaboration.post(roomId!,text,request.current.id);
  },onSuccess:()=>{setText('');request.current={id:'',text:''};void client.invalidateQueries({queryKey:['event-messages',roomId,userId]});}});
  if(!ready||!authenticated) return null;
  const room = rooms.data?.find(r=>r.id===roomId);
  return <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]"><Navbar/><main className={`py-8 ${GUTTERS}`}>
    <h1 className="text-[28px] font-bold mb-6">Event conversations</h1>
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <nav aria-label="Event rooms" className="border border-[var(--brand-border)] rounded-lg p-4 space-y-3">
        {rooms.isPending?<p>Loading conversations…</p>:rooms.isError?<p role="alert">Conversations could not be loaded.</p>:rooms.data?.length?rooms.data.map(r=><Link key={r.id} href={`/chat/${r.id}`} className={`block p-3 rounded-lg hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)] ${r.id===roomId?'font-bold':''}`}>{r.name}{r.unread_count>0&&<span className="ml-2">({r.unread_count} unread)</span>}</Link>):<p>Your booked and organised events will appear here.</p>}
      </nav>
      <section className="border border-[var(--brand-border)] rounded-lg p-4 sm:p-6 min-w-0">
        {!roomId?<p>Choose an event to open its conversation.</p>:<>
          <h2 className="text-[22px] font-bold">{room?.name ?? 'Event room'}</h2>
          <p className="my-3">Only ticket holders and the organiser can read or post here.</p>
          {messages.isPending?<p>Loading messages…</p>:messages.isError?<p role="alert">This conversation is unavailable. You need a ticket or organiser access.</p>:<>
            <div className="space-y-4 max-h-[55dvh] overflow-y-auto py-4" aria-label="Messages" aria-live="polite">
              {messages.hasNextPage&&<button className="underline p-3" disabled={messages.isFetchingNextPage} onClick={()=>void messages.fetchNextPage()}>{messages.isFetchingNextPage?'Loading…':'Load older messages'}</button>}
              {!history?.length&&<p>No messages yet. Start the conversation.</p>}
              {history?.map(message=><article key={message.id} className="rounded-lg border border-[var(--brand-border)] p-4 break-words">
                <p className="font-bold">{message.name}{message.is_organizer?' · Organiser':''}</p>
                <time className="text-[15px]" dateTime={message.created_at}>{new Date(message.created_at.endsWith('Z')?message.created_at:message.created_at+'Z').toLocaleString()}</time>
                <p className="mt-2 whitespace-pre-wrap text-[18px]">{message.content}</p>
              </article>)}
            </div>
            <form onSubmit={e=>{e.preventDefault();if(text.trim())post.mutate();}} className="space-y-3">
              <label className="block font-semibold">Your message<textarea className={`${inputCls(false)} block w-full mt-2`} value={text} onChange={e=>setText(e.target.value)} maxLength={4000} required rows={3}/></label>
              <button disabled={post.isPending||!text.trim()} className="px-6 py-3 rounded-lg font-bold bg-[var(--brand-green)] text-[var(--brand-on-green)]">{post.isPending?'Sending…':'Send message'}</button>
              {post.isError&&<p role="alert">The message could not be sent. Retry to send the same message safely.</p>}
            </form>
          </>}
        </>}
      </section>
    </div>
  </main></div>;
}
