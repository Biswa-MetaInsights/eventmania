import { CalendarIcon, PeopleIcon, type IconProps } from "@/components/EventIcons";
import { BellIcon, HeartIcon, ChatIcon, PlusIcon, SearchIcon, TicketIcon } from "@/components/organizer/ConsoleIcons";

export function NavGlyph({ concept, className = "w-5 h-5 shrink-0" }: IconProps & { concept: string }) {
  const icons = { "❤️": HeartIcon, "🔔": BellIcon, "👥": PeopleIcon, "🔍": SearchIcon, "🎟️": TicketIcon, "➕": PlusIcon, "📊": CalendarIcon, "📋": CalendarIcon, "💬": ChatIcon };
  const Icon = icons[concept as keyof typeof icons];
  if (Icon) return <span aria-hidden="true" className="inline-flex shrink-0"><Icon className={className} /></span>;
  const paths: Record<string, string> = {
    "🚪": "M9 4H4v16h5m5-12 4 4-4 4m-6-4h13",
    "☀️": "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z",
    "🌙": "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z",
  };
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={paths[concept]} /></svg>;
}
