import type { Metadata } from "next";
import { SocialCallback } from "@/components/SocialCallback";

export const metadata: Metadata = { title: "Google sign-in | NewFind", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function GoogleCallbackPage() { return <SocialCallback provider="google" />; }
