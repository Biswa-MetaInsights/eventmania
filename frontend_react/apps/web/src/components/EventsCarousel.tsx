'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Roboto } from 'next/font/google'

const roboto = Roboto({ subsets: ['latin'], style: ['normal', 'italic'] })

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CarouselEvent {
  id: string
  title: string
  date: string
  time: string
  venue: string
  price: string
  imageUrl: string
  badge?: string
  badgeType?: 'free' | 'selling-fast' | 'today' | 'sold-out'
  rating?: number
  reviewCount?: number
  isSoldOut?: boolean
  category: string
  organiser?: string
}

export interface EventsCarouselProps {
  events: CarouselEvent[]
  location: string
  seeAllHref: string
  isLoading?: boolean
  onBookNow?: (id: string) => void
}

// ─── Brand constants ───────────────────────────────────────────────────────────

const GREEN = '#184E4A'
const LINEN = '#F2EFEA'
const BORDER = '#E2DDD5'
const TEXT = '#111827'
const MUTED = '#9CA3AF'
const NAV_BORDER = '#C8C1B8'

const BADGE_CONFIG = {
  'free': { bg: '#DC2626', text: '#FFFFFF', label: 'Free' },
  'selling-fast': { bg: '#D97706', text: '#FFFFFF', label: 'Selling Fast' },
  'today': { bg: '#2563EB', text: '#FFFFFF', label: 'Today' },
  'sold-out': { bg: '#6B7280', text: '#FFFFFF', label: 'Sold Out' },
} as const

const FILTER_TABS = ['All', 'This Weekend', 'Free', 'Music', 'Food']
const ONLINE_FILTER_TABS = ['All', 'Free', 'This Weekend', 'Selling Fast']

// ─── Sample data ───────────────────────────────────────────────────────────────

export const SAMPLE_EVENTS: CarouselEvent[] = [
  {
    id: 'evt-001',
    title: 'Indie Music Night — Live at Kovalam Beach',
    date: 'Sat, 14 Jun',
    time: '7:00 PM',
    venue: 'Kovalam Beach Amphitheatre',
    organiser: 'EventMind Presents',
    price: '₹499 onwards',
    imageUrl: 'https://picsum.photos/seed/evt001/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    rating: 4.7,
    reviewCount: 128,
    category: 'music',
  },
  {
    id: 'evt-002',
    title: 'Kerala Street Food Festival 2025',
    date: 'Sun, 15 Jun',
    time: '11:00 AM',
    venue: 'Central Stadium Grounds, Palayam',
    organiser: 'Kerala Tourism Board',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt002/800/450',
    badge: 'Free',
    badgeType: 'free',
    rating: 4.5,
    reviewCount: 312,
    category: 'food',
  },
  {
    id: 'evt-003',
    title: 'TechTVM — AI & Future of Work Summit',
    date: 'Sat, 14 Jun',
    time: '10:00 AM',
    venue: 'Online (Zoom)',
    organiser: 'TechTVM Community',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt003/800/450',
    badge: 'Today',
    badgeType: 'today',
    rating: 4.8,
    reviewCount: 87,
    category: 'online',
  },
  {
    id: 'evt-004',
    title: 'Morning Yoga & Meditation at Shanghumugham',
    date: 'Sun, 15 Jun',
    time: '6:30 AM',
    venue: 'Shanghumugham Beach',
    organiser: 'Wellness Kerala',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt004/800/450',
    badge: 'Free',
    badgeType: 'free',
    rating: 4.3,
    reviewCount: 59,
    category: 'wellness',
  },
  {
    id: 'evt-005',
    title: 'Standup Comedy Showcase ft. Rahul Subramanian',
    date: 'Fri, 13 Jun',
    time: '8:00 PM',
    venue: 'Casino Hotel, Wellington Island',
    organiser: 'Laugh Track India',
    price: '₹799 onwards',
    imageUrl: 'https://picsum.photos/seed/evt005/800/450',
    badge: 'Sold Out',
    badgeType: 'sold-out',
    isSoldOut: true,
    rating: 4.9,
    reviewCount: 254,
    category: 'comedy',
  },
  {
    id: 'evt-006',
    title: 'Contemporary Art Walk — Kashi Gallery Fort Kochi',
    date: 'Sat, 14 Jun',
    time: '5:00 PM',
    venue: 'Kashi Art Gallery, Fort Kochi',
    organiser: 'Kashi Art Foundation',
    price: '₹200 onwards',
    imageUrl: 'https://picsum.photos/seed/evt006/800/450',
    rating: 4.3,
    reviewCount: 44,
    category: 'art',
  },
  {
    id: 'evt-007',
    title: 'Jazz & Blues Evening Under the Stars',
    date: 'Sat, 14 Jun',
    time: '6:00 PM',
    venue: 'Taj Green Cove, Kovalam',
    organiser: 'Taj Hotels Kerala',
    price: '₹999 onwards',
    imageUrl: 'https://picsum.photos/seed/evt007/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    rating: 4.6,
    reviewCount: 91,
    category: 'music',
  },
  {
    id: 'evt-008',
    title: 'Cloud Chef: Home Cook Battle — Virtual Edition',
    date: 'Sun, 15 Jun',
    time: '3:00 PM',
    venue: 'Online (YouTube Live)',
    organiser: 'Cloud Kitchen Network',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt008/800/450',
    badge: 'Free',
    badgeType: 'free',
    rating: 4.2,
    reviewCount: 38,
    category: 'food',
  },
  {
    id: 'evt-009',
    title: 'Thiruvananthapuram Food Truck Meetup',
    date: 'Sat, 14 Jun',
    time: '12:00 PM',
    venue: 'Technopark Phase I Gate',
    organiser: 'Trivandrum Food Collective',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt009/800/450',
    badge: 'Today',
    badgeType: 'today',
    rating: 4.4,
    reviewCount: 67,
    category: 'food',
  },
  {
    id: 'evt-010',
    title: 'Full-Stack Dev Bootcamp — Weekend Cohort',
    date: 'Sun, 15 Jun',
    time: '9:00 AM',
    venue: 'Online (Google Meet)',
    organiser: 'CodeCraft Academy',
    price: '₹1,299 onwards',
    imageUrl: 'https://picsum.photos/seed/evt010/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    rating: 4.7,
    reviewCount: 143,
    category: 'online',
  },
  {
    id: 'evt-011',
    title: 'Kerala Fusion Kitchen — Masterclass with Chef Arun',
    date: 'Sat, 14 Jun',
    time: '4:00 PM',
    venue: 'Vivanta Trivandrum',
    organiser: 'Vivanta Culinary Arts',
    price: '₹599 onwards',
    imageUrl: 'https://picsum.photos/seed/evt011/800/450',
    rating: 4.5,
    reviewCount: 72,
    category: 'food',
  },
  {
    id: 'evt-012',
    title: 'Carnatic Music Evening — Sangeetha Sabha',
    date: 'Sun, 15 Jun',
    time: '5:30 PM',
    venue: 'Tagore Theatre, Trivandrum',
    organiser: 'Kerala Sangeetha Sabha',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt012/800/450',
    badge: 'Free',
    badgeType: 'free',
    rating: 4.8,
    reviewCount: 196,
    category: 'music',
  },
  // ── Online events (10 total) ──
  {
    id: 'evt-013',
    title: 'UX Design Fundamentals — Live Workshop',
    date: 'Sat, 14 Jun',
    time: '2:00 PM',
    venue: 'Online (Zoom)',
    organiser: 'Designify Studio',
    price: '₹399 onwards',
    imageUrl: 'https://picsum.photos/seed/evt013/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    rating: 4.6,
    reviewCount: 83,
    category: 'online',
  },
  {
    id: 'evt-014',
    title: 'Python for Data Science — Weekend Bootcamp',
    date: 'Sun, 15 Jun',
    time: '9:00 AM',
    venue: 'Online (Google Meet)',
    organiser: 'DataQuest Academy',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt014/800/450',
    badge: 'Free',
    badgeType: 'free',
    rating: 4.7,
    reviewCount: 215,
    category: 'online',
  },
  {
    id: 'evt-015',
    title: 'Startup Pitch Night — Virtual Demo Day',
    date: 'Fri, 13 Jun',
    time: '7:00 PM',
    venue: 'Online (YouTube Live)',
    organiser: 'Kerala Startup Hub',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt015/800/450',
    badge: 'Today',
    badgeType: 'today',
    rating: 4.5,
    reviewCount: 61,
    category: 'online',
  },
  {
    id: 'evt-016',
    title: 'Mindful Living — Mental Wellness Webinar',
    date: 'Sat, 14 Jun',
    time: '11:00 AM',
    venue: 'Online (Zoom)',
    organiser: 'Mind Matters Collective',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt016/800/450',
    badge: 'Free',
    badgeType: 'free',
    rating: 4.4,
    reviewCount: 97,
    category: 'online',
  },
  {
    id: 'evt-017',
    title: 'Photography Masterclass — Composition & Editing',
    date: 'Sun, 15 Jun',
    time: '3:00 PM',
    venue: 'Online (Zoom)',
    organiser: 'Lens & Light Academy',
    price: '₹299 onwards',
    imageUrl: 'https://picsum.photos/seed/evt017/800/450',
    rating: 4.3,
    reviewCount: 52,
    category: 'online',
  },
  {
    id: 'evt-018',
    title: 'React & Next.js Advanced Patterns',
    date: 'Sat, 14 Jun',
    time: '5:00 PM',
    venue: 'Online (Discord Stage)',
    organiser: 'ReactKerala Community',
    price: '₹599 onwards',
    imageUrl: 'https://picsum.photos/seed/evt018/800/450',
    badge: 'Selling Fast',
    badgeType: 'selling-fast',
    rating: 4.9,
    reviewCount: 178,
    category: 'online',
  },
  {
    id: 'evt-019',
    title: 'Entrepreneurship 101 — Free Webinar for Students',
    date: 'Sun, 15 Jun',
    time: '6:00 PM',
    venue: 'Online (Zoom)',
    organiser: 'Kerala Startup Ecosystem',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt019/800/450',
    badge: 'Free',
    badgeType: 'free',
    rating: 4.2,
    reviewCount: 134,
    category: 'online',
  },
  {
    id: 'evt-020',
    title: 'Carnatic Classical — Online Intro Class',
    date: 'Sat, 14 Jun',
    time: '8:00 AM',
    venue: 'Online (Google Meet)',
    organiser: 'Bhajan & Beyond',
    price: 'Free',
    imageUrl: 'https://picsum.photos/seed/evt020/800/450',
    badge: 'Free',
    badgeType: 'free',
    rating: 4.6,
    reviewCount: 44,
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
        aria-label="Share event"
        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{ backgroundColor: '#F2EFEA' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
          stroke={hovered ? GREEN : MUTED} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
        </svg>
      </button>
      {hovered && (
        <span
          className="text-[16px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#F2EFEA', color: GREEN }}
        >
          Share
        </span>
      )}
    </div>
  )
}

// ─── Heart / favourite button ──────────────────────────────────────────────────

function HeartButton() {
  const [liked, setLiked] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <div className="flex items-center gap-1.5">
      {(hovered || liked) && (
        <span
          className="text-[16px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#F2EFEA', color: GREEN }}
        >
          {liked ? 'Added!' : 'Add to wishlist'}
        </span>
      )}
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setLiked((v) => !v)
        }}
        aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{ backgroundColor: '#F2EFEA' }}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill={liked ? GREEN : 'none'}
          stroke={liked ? GREEN : '#9CA3AF'}
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
          />
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

// ─── Individual event card ─────────────────────────────────────────────────────

function EventCardItem({
  event,
  onBookNow,
}: {
  event: CarouselEvent
  onBookNow?: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const badgeCfg = event.badgeType ? BADGE_CONFIG[event.badgeType] : null
  const priceFg = event.isSoldOut ? MUTED : GREEN

  return (
    <Link
      href={`/event/${event.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: LINEN,
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        border: hovered ? `2px solid ${GREEN}` : '2px solid transparent',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Image */}
      <div className={['relative w-full aspect-video overflow-hidden', event.isSoldOut ? 'grayscale opacity-60' : ''].join(' ')}>
        <Image
          src={event.imageUrl}
          alt={event.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) calc(100vw - 96px), (max-width: 1024px) calc(50vw - 72px), (max-width: 1280px) calc(33vw - 60px), calc(25vw - 60px)"
        />
        <div className={`absolute top-2 left-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}><ShareButton /></div>
        <div className={`absolute top-2 right-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}><HeartButton /></div>
        {badgeCfg && !event.isSoldOut && (
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

        {/* Title */}
        <h3 className="text-[20px] font-bold leading-snug line-clamp-2" style={{ color: TEXT }}>
          {event.title}
        </h3>

        {/* Date + venue */}
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarIcon color={TEXT} />
          <span className="text-[18px] shrink-0" style={{ color: TEXT }}>
            {event.date} · {event.time}
          </span>
          {event.venue && (
            <>
              <span className="text-[18px] shrink-0" style={{ color: TEXT }}>·</span>
              <LocationPinIcon color={TEXT} />
              <span className="text-[18px] line-clamp-1 min-w-0" style={{ color: TEXT }}>
                {event.venue}
              </span>
            </>
          )}
        </div>

        {/* Price (left) + Book Now button (right) */}
        <div className="flex items-center justify-between mt-auto pt-1.5 gap-2">
          <span style={{ color: priceFg }}>
            {event.isSoldOut ? (
              <span className="text-[20px] font-bold">Sold Out</span>
            ) : event.price.includes('onwards') ? (
              <>
                <span className="text-[20px] font-bold">{event.price.replace(' onwards', '')}</span>
                <span className="text-[18px] font-normal"> onwards</span>
              </>
            ) : (
              <span className="text-[20px] font-bold">{event.price}</span>
            )}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBookNow?.(event.id) }}
            aria-label={`Book ${event.title}`}
            disabled={event.isSoldOut}
            className="shrink-0 px-4 py-1.5 rounded-xl text-[20px] font-bold transition-all duration-150 active:scale-[0.98]"
            style={{
              backgroundColor: event.isSoldOut ? MUTED : GREEN,
              color: LINEN,
              cursor: event.isSoldOut ? 'not-allowed' : 'pointer',
            }}
          >
            {event.isSoldOut ? 'Sold Out' : 'Book Now'}
          </button>
        </div>
      </div>
    </Link>
  )
}

// ─── Online event card (kept separate for future experimentation) ──────────────

function OnlineEventCard({
  event,
  onBookNow,
}: {
  event: CarouselEvent
  onBookNow?: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const badgeCfg = event.badgeType ? BADGE_CONFIG[event.badgeType] : null
  const priceFg = event.isSoldOut ? MUTED : GREEN

  return (
    <Link
      href={`/event/${event.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: LINEN,
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        border: hovered ? `2px solid ${GREEN}` : '2px solid transparent',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Image */}
      <div className={['relative w-full aspect-video overflow-hidden', event.isSoldOut ? 'grayscale opacity-60' : ''].join(' ')}>
        <Image
          src={event.imageUrl}
          alt={event.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) calc(100vw - 96px), (max-width: 1024px) calc(50vw - 72px), (max-width: 1280px) calc(33vw - 60px), calc(25vw - 60px)"
          style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.3s ease' }}
        />
        <div className={`absolute top-2 left-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}><ShareButton /></div>
        <div className={`absolute top-2 right-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}><HeartButton /></div>
        {badgeCfg && !event.isSoldOut && (
          <div className={`absolute bottom-2 left-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <span className="px-2.5 py-1 rounded-full text-[16px] font-bold"
              style={{ backgroundColor: badgeCfg.bg, color: badgeCfg.text }}>
              {badgeCfg.label}
            </span>
          </div>
        )}
      </div>

      {/* Card body — Roboto */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">

        {/* Title */}
        <h3 className="text-[20px] font-bold leading-snug line-clamp-2" style={{ color: TEXT }}>
          {event.title}
        </h3>

        {/* Date, time + venue in one row */}
        <div className="flex items-center gap-1.5">
          <CalendarIcon color={TEXT} />
          <span className="text-[18px] shrink-0" style={{ color: TEXT }}>
            {event.date} · {event.time}
          </span>
          {event.venue && (
            <>
              <span className="text-[18px]" style={{ color: TEXT }}>·</span>
              <VideoCallIcon color={TEXT} />
              <span className="text-[18px] line-clamp-1" style={{ color: TEXT }}>
                {event.venue}
              </span>
            </>
          )}
        </div>

        {/* Price (left) + Book Now button (right) */}
        <div className="flex items-center justify-between mt-auto pt-1.5 gap-2">
          <span style={{ color: priceFg }}>
            {event.isSoldOut ? (
              <span className="text-[20px] font-bold">Sold Out</span>
            ) : event.price.includes('onwards') ? (
              <>
                <span className="text-[20px] font-bold">{event.price.replace(' onwards', '')}</span>
                <span className="text-[18px] font-normal"> onwards</span>
              </>
            ) : (
              <span className="text-[20px] font-bold">{event.price}</span>
            )}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBookNow?.(event.id) }}
            aria-label={`Book ${event.title}`}
            disabled={event.isSoldOut}
            className="shrink-0 px-4 py-1.5 rounded-xl text-[20px] font-bold transition-all duration-150 active:scale-[0.98]"
            style={{
              backgroundColor: event.isSoldOut ? MUTED : GREEN,
              color: LINEN,
              cursor: event.isSoldOut ? 'not-allowed' : 'pointer',
            }}
          >
            {event.isSoldOut ? 'Sold Out' : 'Book Now'}
          </button>
        </div>
      </div>
    </Link>
  )
}

// ─── Online events row ─────────────────────────────────────────────────────────

function OnlineEventsRow({
  events,
  seeAllHref,
  onBookNow,
}: {
  events: CarouselEvent[]
  seeAllHref: string
  onBookNow?: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState('All')
  const onlineEvents = events.filter((e) => e.category === 'online')
  if (onlineEvents.length === 0) return null

  const filteredOnline: CarouselEvent[] = (() => {
    if (activeTab === 'All') return onlineEvents
    if (activeTab === 'Free')
      return onlineEvents.filter((e) => e.badgeType === 'free' || e.price === 'Free')
    if (activeTab === 'This Weekend')
      return onlineEvents.filter((e) => e.badgeType === 'today' || e.badgeType === 'selling-fast')
    if (activeTab === 'Selling Fast')
      return onlineEvents.filter((e) => e.badgeType === 'selling-fast')
    return onlineEvents
  })()

  const showSeeAll = onlineEvents.length > GRID_LIMIT
  const visibleOnlineEvents = showSeeAll ? filteredOnline.slice(0, GRID_LIMIT - 1) : filteredOnline

  return (
    <section aria-label="Online Events" className="pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-12 mb-4">
        <h2 className="font-extrabold tracking-[-0.5px]" style={{ fontSize: 30, color: TEXT }}>
          Online Events
        </h2>
        <Link
          href={seeAllHref}
          aria-label="View all online events"
          className="flex items-center gap-1.5 text-base font-semibold transition-opacity hover:opacity-70"
          style={{ color: GREEN }}
        >
          View all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="px-12 mb-5">
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
                    ? { backgroundColor: GREEN, color: '#FFFFFF', border: `1.5px solid ${GREEN}` }
                    : { backgroundColor: 'transparent', color: TEXT, border: `1.5px solid ${BORDER}` }
                }
              >
                {tab}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-12 pb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visibleOnlineEvents.map((event) => (
            <OnlineEventCard key={event.id} event={event} onBookNow={onBookNow} />
          ))}
          {showSeeAll && <SeeAllTile events={onlineEvents} href={seeAllHref} />}
        </div>
      </div>
    </section>
  )
}

// ─── "See All" grid tile ───────────────────────────────────────────────────────

function SeeAllTile({ events, href }: { events: CarouselEvent[]; href: string }) {
  const [hovered, setHovered] = useState(false)
  const previews = events.slice(0, 4)
  const placeholders = Math.max(0, 4 - previews.length)

  const tileBg = hovered ? GREEN : LINEN
  const labelFg = hovered ? LINEN : TEXT
  const subFg = hovered ? 'rgba(242,239,234,0.8)' : MUTED

  return (
    <Link
      href={href}
      aria-label="View all events"
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
        {previews.map((e, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden" style={{ backgroundColor: BORDER }}>
            <Image src={e.imageUrl} alt="" fill className="object-cover" sizes="65px" />
          </div>
        ))}
        {Array.from({ length: placeholders }).map((_, i) => (
          <div key={`ph-${i}`} className="rounded-lg"
            style={{ backgroundColor: hovered ? 'rgba(242,239,234,0.2)' : BORDER }} />
        ))}
      </div>

      {/* Label — font sizes intentionally match event title (text-[20px] font-bold)
          and date/venue line (text-[18px]) so they stay in sync when those change */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[20px] font-bold" style={{ color: labelFg, transition: 'color 0.15s ease' }}>
          View all
        </span>
        <span className="text-[18px] flex items-center gap-1"
          style={{ color: labelFg, transition: 'color 0.15s ease' }}>
          Browse all events
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

function PinIcon({ color = MUTED }: { color?: string }) {
  return (
    <svg
      className="w-3 h-3 shrink-0"
      style={{ color }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}

function StarIcon({ color = '#F59E0B' }: { color?: string }) {
  return (
    <svg className="w-3 h-3" style={{ color }} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </svg>
  )
}

function LocationPinIcon({ color = TEXT }: { color?: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill={color} d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" />
      <circle cx="12" cy="9" r="2.6" fill="white" />
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

const GRID_LIMIT = 4 // max cells before the See All tile takes the last slot (keeps grid to one row at XL)

export function EventsCarousel({
  events,
  location,
  seeAllHref,
  isLoading = false,
  onBookNow,
}: EventsCarouselProps) {
  const [activeTab, setActiveTab] = useState('All')

  const offlineEvents = events.filter((e) => e.category !== 'online')

  const filteredEvents: CarouselEvent[] = (() => {
    if (activeTab === 'All') return offlineEvents
    if (activeTab === 'Free')
      return offlineEvents.filter((e) => e.badgeType === 'free' || e.price === 'Free')
    if (activeTab === 'This Weekend')
      return offlineEvents.filter((e) => e.badgeType === 'today' || e.badgeType === 'selling-fast')
    return offlineEvents.filter((e) => e.category.toLowerCase() === activeTab.toLowerCase())
  })()

  // When there are more events than the grid limit, show 7 cards + See All tile = 8 cells.
  const showSeeAll = offlineEvents.length > GRID_LIMIT
  const visibleEvents = showSeeAll
    ? filteredEvents.slice(0, GRID_LIMIT - 1)
    : filteredEvents

  return (
    <section aria-label={`Events in ${location}`} className={`${roboto.className} py-8`}>

      {/* ── Section header ── */}
      <div className="flex items-center justify-between px-12 mb-5">
        <h2 className="font-extrabold tracking-[-0.5px] flex items-center gap-2" style={{ fontSize: 30, color: TEXT }}>
          <span>
            Events in{' '}
            <span style={{ color: GREEN }}>{location}</span>
          </span>
          <EditLocationButton />
        </h2>
        <Link
          href={seeAllHref}
          aria-label={`View all events in ${location}`}
          className="flex items-center gap-1.5 text-base font-semibold transition-opacity hover:opacity-70"
          style={{ color: GREEN }}
        >
          View all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* ── Filter tabs ── */}
      <div className="px-12 mb-5">
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
                    ? { backgroundColor: GREEN, color: '#FFFFFF', border: `1.5px solid ${GREEN}` }
                    : { backgroundColor: 'transparent', color: TEXT, border: `1.5px solid ${BORDER}` }
                }
              >
                {tab}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Event grid ── */}
      <div className="px-12 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: GRID_LIMIT }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: MUTED }}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" />
            </svg>
            <p className="text-sm">No events in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visibleEvents.map((event) => (
              <EventCardItem key={event.id} event={event} onBookNow={onBookNow} />
            ))}
            {showSeeAll && <SeeAllTile events={events} href={seeAllHref} />}
          </div>
        )}
      </div>

      <OnlineEventsRow events={events} seeAllHref={seeAllHref} onBookNow={onBookNow} />
    </section>
  )
}

// ─── Usage example ─────────────────────────────────────────────────────────────
// <EventsCarousel
//   events={SAMPLE_EVENTS}
//   location="Thiruvananthapuram"
//   seeAllHref="/events/thiruvananthapuram"
// />
