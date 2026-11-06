import type { Metadata } from "next";
import { SocialCallback } from "@/components/SocialCallback";

export const metadata: Metadata = { title: "Facebook sign-in | NewFind", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function FacebookCallbackPage() { return <SocialCallback provider="facebook" />; }
