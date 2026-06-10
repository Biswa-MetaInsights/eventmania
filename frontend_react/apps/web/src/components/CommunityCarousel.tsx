'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Roboto } from 'next/font/google'
import { useWishlistStore } from '@eventmind/store'

const roboto = Roboto({ subsets: ['latin'], style: ['normal', 'italic'] })

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CommunityItem {
  id: string
  title: string
  date: string
  time: string
  venue: string
  price: string
  memberCount: string
  imageUrl: string
  badge?: string
  badgeType?: 'free' | 'selling-fast' | 'today' | 'sold-out' | 'recommended'
  isSoldOut?: boolean
  category: string
  organiser?: string
  logoUrl?: string
}

export interface CommunityCarouselProps {
  communities: CommunityItem[]
  location: string
  seeAllHref: string
  /** "View all" target for the Online Communities row. Defaults to seeAllHref. */
  onlineSeeAllHref?: string
  isLoading?: boolean
  onJoin?: (id: string) => void
  locationSlot?: ReactNode
}

// ─── Brand constants ───────────────────────────────────────────────────────────

const GREEN = '#184E4A'
const LINEN = '#F2EFEA'
const BORDER = '#E2DDD5'
const TEXT = '#111827'
const MUTED = '#9CA3AF'
const NAV_BORDER = '#C8C1B8'

const BADGE_CONFIG = {
  'free': { bg: '#DC2626', text: '#F2EFEA', label: 'Free' },
  'recommended': { bg: '#7C3AED', text: '#F2EFEA', label: 'Recommended' },
  'selling-fast': { bg: '#D97706', text: '#F2EFEA', label: 'Selling Fast' },
  'today': { bg: '#2563EB', text: '#F2EFEA', label: 'Today' },
  'sold-out': { bg: '#6B7280', text: '#F2EFEA', label: 'Sold Out' },
} as const

const FILTER_TABS = ['All', 'Recommended', 'Tech', 'Arts', 'Sports', 'Food']
const ONLINE_FILTER_TABS = ['All', 'Recommended', 'Free', 'This Week', 'Selling Fast']

// ─── Sample data ───────────────────────────────────────────────────────────────

export const SAMPLE_COMMUNITIES: CommunityItem[] = [
  {
    id: 'com-001',
    title: 'ReactKerala — Frontend Developers Meetup',
    date: 'Sat, 14 Jun',
    time: '5:00 PM',
    venue: 'Technopark Phase I, Trivandrum',
    organiser: 'ReactKerala Core Team',
    price: 'Free',
    memberCount: '2.3k',
    imageUrl: 'https://picsum.photos/seed/com001/800/450',
    badge: 'Free',
    badgeType: 'free',
    category: 'tech',
  },
  {
    id: 'com-002',
    title: 'TVM Photography Club — Weekend Shoots',
    date: 'Sun, 15 Jun',
    time: '6:30 AM',
    venue: 'Shanghumugham Beach, Trivandrum',
    organiser: 'TVM Photo Circle',
    price: '₹199/month onwards',
    memberCount: '870',
    imageUrl: 'https://picsum.photos/seed/com002/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    category: 'arts',
  },
  {
    id: 'com-003',
    title: 'Kerala Running Club — Sunday Long Run',
    date: 'Sun, 15 Jun',
    time: '5:30 AM',
    venue: 'Vellayambalam Ground, Trivandrum',
    organiser: 'Kerala Runners Network',
    price: 'Free',
    memberCount: '1.1k',
    imageUrl: 'https://picsum.photos/seed/com003/800/450',
    badge: 'Today',
    badgeType: 'today',
    category: 'sports',
  },
  {
    id: 'com-004',
    title: 'Trivandrum Foodies — Street Food Walks',
    date: 'Sat, 14 Jun',
    time: '7:00 PM',
    venue: 'East Fort, Trivandrum',
    organiser: 'Trivandrum Food Collective',
    price: 'Free',
    memberCount: '3.8k',
    imageUrl: 'https://picsum.photos/seed/com004/800/450',
    badge: 'Free',
    badgeType: 'free',
    category: 'food',
  },
  {
    id: 'com-005',
    title: 'Kerala Blockchain & Web3 Network',
    date: 'Fri, 13 Jun',
    time: '7:00 PM',
    venue: 'IIM Kozhikode TVM Campus',
    organiser: 'Web3Kerala',
    price: '₹499/year onwards',
    memberCount: '540',
    imageUrl: 'https://picsum.photos/seed/com005/800/450',
    badge: 'Sold Out',
    badgeType: 'sold-out',
    isSoldOut: true,
    category: 'tech',
  },
  {
    id: 'com-006',
    title: 'Trivandrum Book Club — Monthly Reads',
    date: 'Sat, 14 Jun',
    time: '4:00 PM',
    venue: 'British Library, Trivandrum',
    organiser: 'TVM Readers Circle',
    price: 'Free',
    memberCount: '620',
    imageUrl: 'https://picsum.photos/seed/com006/800/450',
    category: 'arts',
  },
  {
    id: 'com-007',
    title: 'CrossFit TVM — Open Box Saturday',
    date: 'Sat, 14 Jun',
    time: '7:00 AM',
    venue: 'Pettah, Trivandrum',
    organiser: 'CrossFit Trivandrum',
    price: '₹799/month onwards',
    memberCount: '310',
    imageUrl: 'https://picsum.photos/seed/com007/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    category: 'sports',
  },
  {
    id: 'com-008',
    title: 'Kerala Startup Founders Network',
    date: 'Sun, 15 Jun',
    time: '10:00 AM',
    venue: 'Kerala Startup Mission HQ, Kazhakuttam',
    organiser: 'KSUM Community',
    price: 'Free',
    memberCount: '4.2k',
    imageUrl: 'https://picsum.photos/seed/com008/800/450',
    badge: 'Free',
    badgeType: 'free',
    category: 'tech',
  },
  {
    id: 'com-009',
    title: 'TVM Cyclists Guild — Early Morning Rides',
    date: 'Sun, 15 Jun',
    time: '5:00 AM',
    venue: 'Kanakakunnu Palace, Trivandrum',
    organiser: 'TVM Cyclists',
    price: 'Free',
    memberCount: '780',
    imageUrl: 'https://picsum.photos/seed/com009/800/450',
    badge: 'Today',
    badgeType: 'today',
    category: 'sports',
  },
  {
    id: 'com-010',
    title: 'Carnatic Musicians Collective Kerala',
    date: 'Sat, 14 Jun',
    time: '5:00 PM',
    venue: 'Tagore Theatre, Trivandrum',
    organiser: 'Kerala Sangeetha Circle',
    price: 'Free',
    memberCount: '1.5k',
    imageUrl: 'https://picsum.photos/seed/com010/800/450',
    badge: 'Free',
    badgeType: 'free',
    category: 'arts',
  },
  // ── Online communities ──
  {
    id: 'com-011',
    title: 'Kerala Python & Data Science Community',
    date: 'Sat, 14 Jun',
    time: '7:00 PM',
    venue: 'Online (Discord)',
    organiser: 'PyKerala',
    price: 'Free',
    memberCount: '6.1k',
    imageUrl: 'https://picsum.photos/seed/com011/800/450',
    badge: 'Free',
    badgeType: 'free',
    category: 'online',
  },
  {
    id: 'com-012',
    title: 'Kerala Indie Game Developers',
    date: 'Sun, 15 Jun',
    time: '8:00 PM',
    venue: 'Online (Discord)',
    organiser: 'IndieDevKerala',
    price: 'Free',
    memberCount: '2.9k',
    imageUrl: 'https://picsum.photos/seed/com012/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    category: 'online',
  },
  {
    id: 'com-013',
    title: 'Malayalam Creative Writers Circle',
    date: 'Sat, 14 Jun',
    time: '6:00 PM',
    venue: 'Online (Zoom)',
    organiser: 'KeralaWrites',
    price: 'Free',
    memberCount: '1.4k',
    imageUrl: 'https://picsum.photos/seed/com013/800/450',
    badge: 'Today',
    badgeType: 'today',
    category: 'online',
  },
  {
    id: 'com-014',
    title: 'South Indian Food Science & Culture Network',
    date: 'Sun, 15 Jun',
    time: '4:00 PM',
    venue: 'Online (Google Meet)',
    organiser: 'Food Science Kerala',
    price: '₹299/month onwards',
    memberCount: '980',
    imageUrl: 'https://picsum.photos/seed/com014/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    category: 'online',
  },
  {
    id: 'com-015',
    title: 'Kerala UX & Product Design Guild',
    date: 'Sat, 14 Jun',
    time: '5:00 PM',
    venue: 'Online (Figma Community)',
    organiser: 'DesignKerala',
    price: 'Free',
    memberCount: '3.3k',
    imageUrl: 'https://picsum.photos/seed/com015/800/450',
    badge: 'Free',
    badgeType: 'free',
    category: 'online',
  },
]

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ border: `1px solid ${NAV_BORDER}`, backgroundColor: LINEN }}
    >
      <div className="w-full aspect-video bg-gray-200" />
      <div className="p-4 flex flex-col gap-2.5">
        <div className="h-2.5 bg-gray-200 rounded-full w-16" />
        <div className="h-4 bg-gray-200 rounded-full w-full" />
        <div className="h-4 bg-gray-200 rounded-full w-4/5" />
        <div className="h-3 bg-gray-200 rounded-full w-1/2 mt-1" />
        <div className="h-3 bg-gray-200 rounded-full w-3/5" />
        <div className="flex justify-between mt-3">
          <div className="h-4 bg-gray-200 rounded-full w-20" />
          <div className="h-3 bg-gray-200 rounded-full w-16" />
        </div>
      </div>
    </div>
  )
}

// ─── Share button ─────────────────────────────────────────────────────────────

function ShareButton() {
  const [hovered, setHovered] = useState(false)
  return (
    <div className="flex items-center gap-1.5">
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        aria-label="Share community"
        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{ backgroundColor: LINEN }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
          stroke={hovered ? GREEN : MUTED} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
        </svg>
      </button>
      {hovered && (
        <span className="text-[16px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: LINEN, color: GREEN }}>
          Share
        </span>
      )}
    </div>
  )
}

// ─── Heart / favourite button ──────────────────────────────────────────────────

function HeartButton({ community }: { community: CommunityItem }) {
  const toggle = useWishlistStore((s) => s.toggleItem)
  const liked = useWishlistStore((s) => s.items.some((i) => i.id === community.id))
  const [hovered, setHovered] = useState(false)
  return (
    <div className="flex items-center gap-1.5">
      {(hovered || liked) && (
        <span className="text-[16px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: LINEN, color: GREEN }}>
          {liked ? 'Added!' : 'Add to wishlist'}
        </span>
      )}
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggle({
            kind: 'community',
            id: community.id,
            title: community.title,
            date: community.date,
            time: community.time,
            venue: community.venue,
            price: community.price,
            imageUrl: community.imageUrl,
            badge: community.badge,
            badgeType: community.badgeType,
            isSoldOut: community.isSoldOut,
            category: community.category,
            memberCount: community.memberCount,
          })
        }}
        aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{ backgroundColor: LINEN }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24"
          fill={liked ? GREEN : 'none'} stroke={liked ? GREEN : MUTED} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      </button>
    </div>
  )
}

// ─── Edit location button ─────────────────────────────────────────────────────

function EditLocationButton() {
  const [hovered, setHovered] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        aria-label="Edit location"
        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
        style={{ color: hovered ? GREEN : MUTED }}
      >
        <svg className="w-4 h-4" viewBox="0 -0.5 21 21" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd"
            d="M0,20 L20.616532,20 L20.616532,18.042095 L0,18.042095 L0,20 Z M7.215786,13.147332 L7.215786,10.51395 L13.094591,5.344102 L15.146966,7.493882 L9.903151,13.147332 L7.215786,13.147332 Z M16.244797,2.64513 L18.059052,4.363191 L16.645788,5.787567 L14.756283,3.993147 L16.244797,2.64513 Z M21,4.64513 L16.132437,0 L5.154133,9.687714 L5.154133,15.105237 L10.78657,15.105237 L21,4.64513 Z"
          />
        </svg>
      </button>
      {hovered && (
        <span
          className="absolute left-full ml-2 whitespace-nowrap text-[16px] font-semibold px-3 py-1 rounded-full z-10"
          style={{ backgroundColor: LINEN, color: GREEN, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        >
          Click here to edit location
        </span>
      )}
    </span>
  )
}

// ─── Individual community card ─────────────────────────────────────────────────

export function CommunityCardItem({
  community,
  onJoin,
}: {
  community: CommunityItem
  onJoin?: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const badgeCfg = community.badgeType ? BADGE_CONFIG[community.badgeType] : null

  return (
    <Link
      href={`/community/${community.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${roboto.className} relative rounded-2xl overflow-hidden flex flex-col`}
      style={{
        backgroundColor: LINEN,
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        border: hovered ? `2px solid ${GREEN}` : '2px solid transparent',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Image */}
      <div className={['relative w-full aspect-video overflow-hidden', community.isSoldOut ? 'grayscale opacity-60' : ''].join(' ')}>
        <Image
          src={community.imageUrl}
          alt={community.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) calc(100vw - 96px), (max-width: 1024px) calc(50vw - 72px), (max-width: 1280px) calc(33vw - 60px), calc(25vw - 60px)"
        />
        <div className={`absolute top-2 left-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}><ShareButton /></div>
        <div className={`absolute top-2 right-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}><HeartButton community={community} /></div>
        {badgeCfg && !community.isSoldOut && (
          <div className={`absolute bottom-2 left-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <span className="px-2.5 py-1 rounded-full text-[16px] font-bold"
              style={{ backgroundColor: badgeCfg.bg, color: badgeCfg.text }}>
              {badgeCfg.label}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 pt-3.5 pb-4 flex flex-col gap-1.5 flex-1">

        {/* Logo (top-left) + title & venue (right) */}
        <div className="flex items-start gap-3">
          <div
            className="relative w-12 h-12 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: GREEN, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            {community.logoUrl ? (
              <Image src={community.logoUrl} alt="" fill className="object-cover" sizes="48px" />
            ) : (
              <span className="text-[20px] font-bold select-none" style={{ color: LINEN }}>
                {community.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-[20px] font-bold leading-snug line-clamp-2" style={{ color: TEXT }}>
              {community.title}
            </h3>
            {community.venue && (
              <div className="flex items-center gap-1.5 min-w-0">
                <LocationPinIcon color={TEXT} />
                <span className="text-[18px] line-clamp-1 min-w-0" style={{ color: TEXT }}>
                  {community.venue}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Member count (left) + Join button (right) */}
        <div className="flex items-center justify-between mt-auto pt-1.5 gap-2">
          <span>
            {community.isSoldOut ? (
              <span className="text-[20px] font-bold" style={{ color: MUTED }}>Full</span>
            ) : (
              <>
                <span className="text-[20px] font-bold" style={{ color: GREEN }}>{community.memberCount}</span>
                <span className="text-[18px] font-normal" style={{ color: TEXT }}> members</span>
              </>
            )}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin?.(community.id) }}
            aria-label={`Join ${community.title}`}
            disabled={community.isSoldOut}
            className="shrink-0 px-4 py-1.5 rounded-xl text-[20px] font-bold transition-all duration-150 active:scale-[0.98]"
            style={{
              backgroundColor: community.isSoldOut ? MUTED : GREEN,
              color: LINEN,
              cursor: community.isSoldOut ? 'not-allowed' : 'pointer',
            }}
          >
            {community.isSoldOut ? 'Full' : 'Join'}
          </button>
        </div>
      </div>
    </Link>
  )
}

// ─── Online community card ─────────────────────────────────────────────────────

function OnlineCommunityCard({
  community,
  onJoin,
}: {
  community: CommunityItem
  onJoin?: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const badgeCfg = community.badgeType ? BADGE_CONFIG[community.badgeType] : null

  return (
    <Link
      href={`/community/${community.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${roboto.className} relative rounded-2xl overflow-hidden flex flex-col`}
      style={{
        backgroundColor: LINEN,
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        border: hovered ? `2px solid ${GREEN}` : '2px solid transparent',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Image */}
      <div className={['relative w-full aspect-video overflow-hidden', community.isSoldOut ? 'grayscale opacity-60' : ''].join(' ')}>
        <Image
          src={community.imageUrl}
          alt={community.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) calc(100vw - 96px), (max-width: 1024px) calc(50vw - 72px), (max-width: 1280px) calc(33vw - 60px), calc(25vw - 60px)"
          style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.3s ease' }}
        />
        <div className={`absolute top-2 left-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}><ShareButton /></div>
        <div className={`absolute top-2 right-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}><HeartButton community={community} /></div>
        {badgeCfg && !community.isSoldOut && (
          <div className={`absolute bottom-2 left-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <span className="px-2.5 py-1 rounded-full text-[16px] font-bold"
              style={{ backgroundColor: badgeCfg.bg, color: badgeCfg.text }}>
              {badgeCfg.label}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">

        {/* Logo (top-left) + title & venue (right) */}
        <div className="flex items-start gap-3">
          <div
            className="relative w-12 h-12 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: GREEN, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            {community.logoUrl ? (
              <Image src={community.logoUrl} alt="" fill className="object-cover" sizes="48px" />
            ) : (
              <span className="text-[20px] font-bold select-none" style={{ color: LINEN }}>
                {community.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-[20px] font-bold leading-snug line-clamp-2" style={{ color: TEXT }}>
              {community.title}
            </h3>
            {community.venue && (
              <div className="flex items-center gap-1.5 min-w-0">
                <VideoCallIcon color={TEXT} />
                <span className="text-[18px] line-clamp-1 min-w-0" style={{ color: TEXT }}>
                  {community.venue}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Member count (left) + Join button (right) */}
        <div className="flex items-center justify-between mt-auto pt-1.5 gap-2">
          <span>
            {community.isSoldOut ? (
              <span className="text-[20px] font-bold" style={{ color: MUTED }}>Full</span>
            ) : (
              <>
                <span className="text-[20px] font-bold" style={{ color: GREEN }}>{community.memberCount}</span>
                <span className="text-[18px] font-normal" style={{ color: TEXT }}> members</span>
              </>
            )}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin?.(community.id) }}
            aria-label={`Join ${community.title}`}
            disabled={community.isSoldOut}
            className="shrink-0 px-4 py-1.5 rounded-xl text-[20px] font-bold transition-all duration-150 active:scale-[0.98]"
            style={{
              backgroundColor: community.isSoldOut ? MUTED : GREEN,
              color: LINEN,
              cursor: community.isSoldOut ? 'not-allowed' : 'pointer',
            }}
          >
            {community.isSoldOut ? 'Full' : 'Join'}
          </button>
        </div>
      </div>
    </Link>
  )
}

// ─── Online communities row ────────────────────────────────────────────────────

function OnlineCommunitiesRow({
  communities,
  seeAllHref,
  onJoin,
  isLoading = false,
}: {
  communities: CommunityItem[]
  seeAllHref: string
  onJoin?: (id: string) => void
  isLoading?: boolean
}) {
  const [activeTab, setActiveTab] = useState('All')
  const onlineCommunities = communities.filter((c) => c.category === 'online')

  const filtered: CommunityItem[] = (() => {
    if (activeTab === 'All') return onlineCommunities
    if (activeTab === 'Recommended')
      return onlineCommunities.filter((c) => c.badgeType === 'recommended')
    if (activeTab === 'Free')
      return onlineCommunities.filter((c) => c.price === 'Free')
    if (activeTab === 'This Week')
      return onlineCommunities.filter((c) => c.badgeType === 'today')
    if (activeTab === 'Selling Fast')
      return onlineCommunities.filter((c) => c.badgeType === 'selling-fast')
    return onlineCommunities
  })()

  const showSeeAll = onlineCommunities.length > GRID_LIMIT
  const visible = showSeeAll ? filtered.slice(0, GRID_LIMIT - 1) : filtered

  return (
    <section aria-label="Online Communities" className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-12 mb-4">
        <h2 className="font-extrabold tracking-[-0.5px]" style={{ fontSize: "clamp(22px, 4vw, 30px)", color: TEXT }}>
          Online Communities
        </h2>
        <Link
          href={seeAllHref}
          aria-label="View all online communities"
          className="flex items-center gap-1.5 text-lg font-semibold transition-opacity hover:opacity-70"
          style={{ color: GREEN }}
        >
          View all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="px-4 sm:px-6 lg:px-12 mb-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {ONLINE_FILTER_TABS.map((tab) => {
            const active = tab === activeTab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={active}
                className="flex-none px-4 py-1.5 rounded-full text-[20px] font-semibold whitespace-nowrap transition-all duration-150"
                style={
                  active
                    ? { backgroundColor: GREEN, color: '#F2EFEA', border: `1.5px solid ${GREEN}` }
                    : { backgroundColor: 'transparent', color: TEXT, border: `1.5px solid ${BORDER}` }
                }
              >
                {tab}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-12 pb-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: GRID_LIMIT }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : onlineCommunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: MUTED }}>
            <VideoCallIcon color={MUTED} />
            <p className="text-lg">No online communities right now. Check back soon.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: MUTED }}>
            <VideoCallIcon color={MUTED} />
            <p className="text-lg">No online communities in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {visible.map((c) => (
              <OnlineCommunityCard key={c.id} community={c} onJoin={onJoin} />
            ))}
            {showSeeAll && <SeeAllTile communities={onlineCommunities} href={seeAllHref} />}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── "See All" grid tile ───────────────────────────────────────────────────────

function SeeAllTile({ communities, href }: { communities: CommunityItem[]; href: string }) {
  const [hovered, setHovered] = useState(false)
  const previews = communities.slice(0, 4)
  const placeholders = Math.max(0, 4 - previews.length)

  const tileBg = hovered ? GREEN : LINEN
  const labelFg = hovered ? LINEN : TEXT

  return (
    <Link
      href={href}
      aria-label="View all communities"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl flex flex-col items-center justify-center gap-5"
      style={{
        backgroundColor: tileBg,
        border: `1px solid ${NAV_BORDER}`,
        minHeight: 240,
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, background-color 0.15s ease',
      }}
    >
      {/* 2×2 preview grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 136, height: 136 }}>
        {previews.map((c, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden" style={{ backgroundColor: BORDER }}>
            <Image src={c.imageUrl} alt="" fill className="object-cover" sizes="65px" />
          </div>
        ))}
        {Array.from({ length: placeholders }).map((_, i) => (
          <div key={`ph-${i}`} className="rounded-lg"
            style={{ backgroundColor: hovered ? 'rgba(242,239,234,0.2)' : BORDER }} />
        ))}
      </div>

      {/* Label — font sizes match community title (text-[20px] font-bold) and date/venue (text-[18px]) */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[20px] font-bold" style={{ color: labelFg, transition: 'color 0.15s ease' }}>
          View all
        </span>
        <span className="text-[18px] flex items-center gap-1"
          style={{ color: labelFg, transition: 'color 0.15s ease' }}>
          Browse all communities
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function CalendarIcon({ color = TEXT }: { color?: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 1024 1024" fill={color}>
      <path d="M960 95.888l-256.224.001V32.113c0-17.68-14.32-32-32-32s-32 14.32-32 32v63.76h-256v-63.76c0-17.68-14.32-32-32-32s-32 14.32-32 32v63.76H64c-35.344 0-64 28.656-64 64v800c0 35.343 28.656 64 64 64h896c35.344 0 64-28.657 64-64v-800c0-35.329-28.656-63.985-64-63.985zm0 863.985H64v-800h255.776v32.24c0 17.679 14.32 32 32 32s32-14.321 32-32v-32.224h256v32.24c0 17.68 14.32 32 32 32s32-14.32 32-32v-32.24H960v799.984zM736 511.888h64c17.664 0 32-14.336 32-32v-64c0-17.664-14.336-32-32-32h-64c-17.664 0-32 14.336-32 32v64c0 17.664 14.336 32 32 32zm0 255.984h64c17.664 0 32-14.32 32-32v-64c0-17.664-14.336-32-32-32h-64c-17.664 0-32 14.336-32 32v64c0 17.696 14.336 32 32 32zm-192-128h-64c-17.664 0-32 14.336-32 32v64c0 17.68 14.336 32 32 32h64c17.664 0 32-14.32 32-32v-64c0-17.648-14.336-32-32-32zm0-255.984h-64c-17.664 0-32 14.336-32 32v64c0 17.664 14.336 32 32 32h64c17.664 0 32-14.336 32-32v-64c0-17.68-14.336-32-32-32zm-256 0h-64c-17.664 0-32 14.336-32 32v64c0 17.664 14.336 32 32 32h64c17.664 0 32-14.336 32-32v-64c0-17.68-14.336-32-32-32zm0 255.984h-64c-17.664 0-32 14.336-32 32v64c0 17.68 14.336 32 32 32h64c17.664 0 32-14.32 32-32v-64c0-17.648-14.336-32-32-32z" />
    </svg>
  )
}

function LocationPinIcon({ color = TEXT }: { color?: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill={color} d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" />
      <circle cx="12" cy="9" r="2.6" fill="#F2EFEA" />
    </svg>
  )
}

function VideoCallIcon({ color = TEXT }: { color?: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill={color}>
      <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
    </svg>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

const GRID_LIMIT = 4

export function CommunityCarousel({
  communities,
  location,
  seeAllHref,
  onlineSeeAllHref,
  isLoading = false,
  onJoin,
  locationSlot,
}: CommunityCarouselProps) {
  const [activeTab, setActiveTab] = useState('All')

  const offlineCommunities = communities.filter((c) => c.category !== 'online')

  const filtered: CommunityItem[] = (() => {
    if (activeTab === 'All') return offlineCommunities
    if (activeTab === 'Recommended')
      return offlineCommunities.filter((c) => c.badgeType === 'recommended')
    if (activeTab === 'Tech') return offlineCommunities.filter((c) => c.category === 'tech')
    if (activeTab === 'Arts') return offlineCommunities.filter((c) => c.category === 'arts')
    if (activeTab === 'Sports') return offlineCommunities.filter((c) => c.category === 'sports')
    if (activeTab === 'Food') return offlineCommunities.filter((c) => c.category === 'food')
    return offlineCommunities
  })()

  const showSeeAll = offlineCommunities.length > GRID_LIMIT
  const visible = showSeeAll ? filtered.slice(0, GRID_LIMIT - 1) : filtered

  return (
    <section aria-label={`Communities in ${location}`} className={`${roboto.className} py-8`}>

      {/* ── Section header ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-12 mb-5">
        <h2 className="font-extrabold tracking-[-0.5px] flex items-center gap-1" style={{ fontSize: "clamp(22px, 4vw, 30px)", color: TEXT }}>
          Communities in{' '}
          <span className="relative inline-flex items-center gap-2">
            <span style={{ color: GREEN }}>{location}</span>
            {locationSlot ?? <EditLocationButton />}
          </span>
        </h2>
        <Link
          href={seeAllHref}
          aria-label={`View all communities in ${location}`}
          className="flex items-center gap-1.5 text-lg font-semibold transition-opacity hover:opacity-70"
          style={{ color: GREEN }}
        >
          View all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* ── Filter tabs ── */}
      <div className="px-4 sm:px-6 lg:px-12 mb-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {FILTER_TABS.map((tab) => {
            const active = tab === activeTab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={active}
                className="flex-none px-4 py-1.5 rounded-full text-[20px] font-semibold whitespace-nowrap transition-all duration-150"
                style={
                  active
                    ? { backgroundColor: GREEN, color: '#F2EFEA', border: `1.5px solid ${GREEN}` }
                    : { backgroundColor: 'transparent', color: TEXT, border: `1.5px solid ${BORDER}` }
                }
              >
                {tab}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Community grid ── */}
      <div className="px-4 sm:px-6 lg:px-12 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: GRID_LIMIT }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: MUTED }}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <p className="text-lg">No communities in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {visible.map((c) => (
              <CommunityCardItem key={c.id} community={c} onJoin={onJoin} />
            ))}
            {showSeeAll && <SeeAllTile communities={communities} href={seeAllHref} />}
          </div>
        )}
      </div>

      <OnlineCommunitiesRow communities={communities} seeAllHref={onlineSeeAllHref ?? seeAllHref} onJoin={onJoin} isLoading={isLoading} />
    </section>
  )
}

// ─── Usage example ─────────────────────────────────────────────────────────────
// <CommunityCarousel
//   communities={SAMPLE_COMMUNITIES}
//   location="Thiruvananthapuram"
//   seeAllHref="/communities/thiruvananthapuram"
// />
