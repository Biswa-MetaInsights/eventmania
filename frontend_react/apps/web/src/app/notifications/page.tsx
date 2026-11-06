'use client';
import { useAuthStore } from '@eventmind/store';
import Link from 'next/link';
import { Navbar } from '@/components/navbar/Navbar';
import { NotificationList } from '@/components/NotificationBell';
import { GUTTERS } from '@/lib/layout';
export default function NotificationsPage(){const ready=useAuthStore(s=>s._hasHydrated);const auth=useAuthStore(s=>s.isAuthenticated);return <><Navbar/><main className={`py-10 ${GUTTERS}`}>{!ready?<p>Loading…</p>:auth?<NotificationList/>:<p><Link href="/auth">Sign in to view notifications</Link></p>}</main></>;}
