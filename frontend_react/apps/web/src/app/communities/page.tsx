'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '@eventmind/api';
import { Navbar } from '@/components/navbar/Navbar';
import { GUTTERS } from '@/lib/layout';
import { inputCls } from '@/components/FormControls';
export default function CommunitiesPage(){
  const [q,setQ]=useState(''),[search,setSearch]=useState('');
  const groups=useQuery({queryKey:['communities',search],queryFn:()=>communityApi.search({q:search,limit:100}).then(r=>r.data)});
  return <><Navbar/><main className={`py-10 ${GUTTERS}`}><div className="flex flex-wrap gap-4 items-center justify-between mb-6"><h1 className="text-[32px] font-bold">Communities</h1><Link className="px-5 py-3 rounded-lg bg-[var(--brand-green)] text-[var(--brand-on-green)] font-bold" href="/community/create">Create a community</Link></div><p className="text-[18px] mb-6">Find people who share your interests. Membership is free.</p>
    <form className="flex gap-3 mb-8 max-w-xl" onSubmit={e=>{e.preventDefault();setSearch(q.trim());}}><label className="flex-1 min-w-0"><span className="sr-only">Search communities</span><input className={`${inputCls(false)} w-full`} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search communities" maxLength={200}/></label><button className="px-4 py-3 rounded-lg border-2 border-[var(--brand-control-border)] font-bold">Search</button></form>
    {groups.isPending?<p>Loading communities…</p>:groups.isError?<p role="alert">Communities could not be loaded. Please retry.</p>:!groups.data?.length?<p>No matching communities yet.</p>:<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{groups.data.map(c=><article key={c.id} className="rounded-lg border border-[var(--brand-border)] p-6"><h2 className="font-bold text-[22px]"><Link href={`/community/${c.slug??c.id}`}>{c.name}</Link></h2><p className="my-3 line-clamp-3 text-[17px]">{c.description}</p><p>{c.member_count} {c.member_count===1?'member':'members'}</p><Link className="inline-block mt-5 font-bold underline" href={`/community/${c.slug??c.id}`}>View community</Link></article>)}</div>}
  </main></>;
}
