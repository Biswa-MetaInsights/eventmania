'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@eventmind/api';
import { useAuthStore } from '@eventmind/store';
import { inputCls } from '@/components/FormControls';
interface Review {id:string;rating:number;comment:string;name:string}
export function CommunityReviews({communityId}:{communityId:string}){
  const authenticated=useAuthStore(s=>s.isAuthenticated);
  const client=useQueryClient();
  const [rating,setRating]=useState(5),[comment,setComment]=useState('');
  const reviews=useQuery({queryKey:['community-reviews',communityId],queryFn:()=>apiClient.get<{items:Review[];count:number;average_rating:number|null}>(`/community/${communityId}/reviews`).then(r=>r.data)});
  const post=useMutation({mutationFn:()=>apiClient.post(`/community/${communityId}/reviews`,{rating,comment}),onSuccess:()=>{setComment('');void client.invalidateQueries({queryKey:['community-reviews',communityId]});}});
  return <section className="my-8 space-y-4"><h2 className="text-[24px] font-bold">Community reviews</h2>
    {reviews.isPending?<p>Loading reviews…</p>:reviews.isError?<p>Reviews are temporarily unavailable.</p>:<><p>{reviews.data?.count?`${reviews.data.average_rating?.toFixed(1)} / 5 · ${reviews.data.count} reviews`:'No community reviews yet.'}</p>{reviews.data?.items.map(r=><article key={r.id} className="border border-[var(--brand-border)] rounded-lg p-4"><p className="font-bold">{r.name} · {r.rating}/5</p><p className="mt-2 whitespace-pre-wrap">{r.comment}</p></article>)}</>}
    {authenticated&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();post.mutate();}}><p>Members can publish one review. Organisers cannot review their own community.</p><label className="block">Rating<select value={rating} onChange={e=>setRating(Number(e.target.value))} className={`${inputCls(false)} ml-3`}>{[5,4,3,2,1].map(n=><option key={n}>{n}</option>)}</select></label><label className="block">Your review<textarea className={`${inputCls(false)} block w-full mt-2`} value={comment} onChange={e=>setComment(e.target.value)} minLength={5} maxLength={4000} required rows={3}/></label><button disabled={post.isPending} className="px-5 py-3 rounded-lg bg-[var(--brand-green)] text-[var(--brand-on-green)] font-bold">{post.isPending?'Publishing…':'Publish review'}</button>{post.isError&&<p role="alert">Review not published. You must be a member and may only review once.</p>}{post.isSuccess&&<p role="status">Your review was published.</p>}</form>}
  </section>;
}
