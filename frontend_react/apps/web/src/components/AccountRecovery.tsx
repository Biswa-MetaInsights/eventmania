'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient, isAxiosError } from '@eventmind/api';
import { useAuthStore } from '@eventmind/store';
import { Navbar } from '@/components/navbar/Navbar';
import { inputCls } from '@/components/FormControls';
export function AccountRecovery({mode}:{mode:'forgot-password'|'reset-password'|'verify-email'}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[token,setToken]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  useEffect(()=>{const value=new URLSearchParams(window.location.hash.slice(1)).get('token');if(value){queueMicrotask(()=>setToken(value));window.history.replaceState(null,'',window.location.pathname);}},[]);
  const title=mode==='forgot-password'?'Reset your password':mode==='reset-password'?'Choose a new password':'Verify your email';
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const {data}=await apiClient.post(`/auth/${mode}`,mode==='forgot-password'?{email}:mode==='reset-password'?{token,password}:{token});setMessage(data.message);setToken('');if(mode==='reset-password')useAuthStore.getState().clearAuth();}catch(e){setError(isAxiosError(e)&&typeof e.response?.data?.detail==='string'?e.response.data.detail:'The request could not be completed. Please try again.');}finally{setBusy(false);}}
  return <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]"><Navbar/><main className="max-w-lg mx-auto px-5 py-12"><h1 className="text-[28px] font-bold mb-6">{title}</h1>{message?<p role="status">{message}</p>:<form onSubmit={submit} className="space-y-5">{mode==='forgot-password'?<label className="block">Account email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className={`${inputCls(false)} mt-2 w-full`}/></label>:<>{!token&&<p role="alert">Open the secure link from your email. Links expire after 30 minutes and work once.</p>}{mode==='reset-password'&&<label className="block">New password<input type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={password} onChange={e=>setPassword(e.target.value)} className={`${inputCls(false)} mt-2 w-full`}/></label>}</>}<button disabled={busy||(mode!=='forgot-password'&&!token)} className="px-6 py-3 rounded-lg font-bold bg-[var(--brand-green)] text-[var(--brand-on-green)] disabled:opacity-50">{busy?'Please wait…':mode==='forgot-password'?'Send recovery email':mode==='reset-password'?'Update password':'Verify email'}</button>{error&&<p role="alert">{error}</p>}</form>}<Link href="/auth" className="block mt-8 underline">Return to sign in</Link></main></div>;
}
