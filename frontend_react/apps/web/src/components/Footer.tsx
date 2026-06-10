import Link from "next/link";

const GREEN = "#184E4A";
const LINEN = "#F2EFEA";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Discover",
    links: [
      { label: "Explore Events", href: "/explore?view=events" },
      { label: "Communities", href: "/explore?view=communities" },
    ],
  },
  {
    title: "For Organisers",
    links: [
      { label: "Create Event", href: "/organizer/create" },
      { label: "Organizer Console", href: "/organizer" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Help", href: "#" },
    ],
  },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-[15px] no-underline transition-opacity hover:opacity-70"
      style={{ color: LINEN }}
    >
      {label}
    </Link>
  );
}

export function Footer() {
  return (
    <footer style={{ backgroundColor: GREEN, color: LINEN }}>
      <div className="px-4 sm:px-6 lg:px-12 py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Brand */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold"
                style={{ backgroundColor: LINEN, color: GREEN }}
              >
                E
              </div>
              <span className="text-[19px] font-extrabold tracking-[0.2px]">NewFind</span>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "rgba(242,239,234,0.75)" }}>
              AI-powered event discovery — find events, communities, and experiences near you.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-14">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(242,239,234,0.6)" }}>
                  {col.title}
                </p>
                {col.links.map((l) => (
                  <FooterLink key={l.label} href={l.href} label={l.label} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ borderTop: "1px solid rgba(242,239,234,0.18)" }}
        >
          <p className="text-sm" style={{ color: "rgba(242,239,234,0.7)" }}>
            © {new Date().getFullYear()} EventMind. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {/* Social icons */}
            <Link href="#" aria-label="Twitter / X" className="transition-opacity hover:opacity-70" style={{ color: LINEN }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </Link>
            <Link href="#" aria-label="Instagram" className="transition-opacity hover:opacity-70" style={{ color: LINEN }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 1.802c-3.15 0-3.522.012-4.76.069-2.39.109-3.514 1.234-3.623 3.623-.057 1.238-.069 1.61-.069 4.743 0 3.155.012 3.522.069 4.76.109 2.388 1.232 3.514 3.623 3.623 1.238.057 1.61.069 4.76.069 3.149 0 3.522-.012 4.76-.069 2.388-.109 3.514-1.234 3.622-3.623.057-1.238.069-1.605.069-4.76 0-3.149-.012-3.522-.069-4.743-.108-2.389-1.232-3.514-3.622-3.623-1.238-.057-1.611-.069-4.76-.069zm0 3.064a5.97 5.97 0 100 11.94 5.97 5.97 0 000-11.94zm0 9.852a3.882 3.882 0 110-7.764 3.882 3.882 0 010 7.764zm6.406-10.845a1.396 1.396 0 11-2.792 0 1.396 1.396 0 012.792 0z" /></svg>
            </Link>
            <Link href="#" aria-label="LinkedIn" className="transition-opacity hover:opacity-70" style={{ color: LINEN }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
