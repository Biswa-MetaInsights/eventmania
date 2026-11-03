import type { Metadata } from 'next';
import { getCommunityForShare } from '@/lib/community-server';
import { siteOrigin } from '@/lib/event-server';
import { locationLabel } from '@/lib/event-media';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const community = await getCommunityForShare(slug);

  if (!community) {
    return { title: "Community · NewFind" };
  }

  const members = community.member_count > 0 ? `${community.member_count} members` : "New community";
  const metaLine = `${community.category} · ${locationLabel(community)} · ${members}`;
  const description = community.description?.trim() || metaLine;
  const url = `${siteOrigin()}/community/${slug}`;

  return {
    metadataBase: new URL(siteOrigin()),
    title: `${community.name} · NewFind`,
    description,
    openGraph: {
      title: community.name,
      description: metaLine,
      siteName: "NewFind",
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: community.name,
      description: metaLine,
    },
  };
}


export default function CommunityLayout({children}:{children:React.ReactNode}){return children;}
