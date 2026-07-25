import type { Metadata } from "next";
import Link from "next/link";
import BlogNavigation from "./BlogNavigation";

// SEO Metadata for the Blog section
export const metadata: Metadata = {
  title: "News Stories & Updates | IN the GAME with DOC",
  description:
    "Latest news, updates, and stories from IN the GAME with DOC. Catch up on coach interviews, athlete spotlights, behind-the-scenes content, and team announcements.",
  keywords: [
    "Sports News",
    "High School Football",
    "Coach Stories",
    "Athlete Spotlights",
    "Team Updates",
    "DOC Sports Blog",
    "Area Sports News",
    "Football Recruiting",
    "Sports Broadcasting",
  ],
  openGraph: {
    title: "News Stories & Updates | IN the GAME with DOC",
    description:
      "Latest news, updates, and stories from IN the GAME with DOC. Catch up on coach interviews, athlete spotlights, and team announcements.",
    type: "website",
    siteName: "IN the GAME with DOC",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "News Stories & Updates | IN the GAME with DOC",
    description:
      "Latest news, updates, and stories from IN the GAME with DOC.",
  },
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Blog Header */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Link
                href="/blog"
                className="inline-block text-4xl md:text-5xl font-black hover:text-cyan-400 transition"
              >
                📰 News Stories
              </Link>
              <p className="text-lg text-blue-200 mt-2">
                Updates, stories, and announcements from the team
              </p>
            </div>
            {/* RSS / Subscribe placeholder */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-300/60 uppercase tracking-wider hidden md:block">
                Stay Connected
              </span>
              <div className="flex gap-2">
                <a
                  href="/blog"
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition"
                  title="Subscribe to RSS feed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.18 15.64a2.18 2.18 0 010 4.36 2.18 2.18 0 010-4.36M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93v-2.83z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inner Navigation Bar */}
      <BlogNavigation />

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">{children}</div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
            {/* About Card */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                About This Blog
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Stay up to date with the latest news, coach interviews, athlete
                spotlights, and behind-the-scenes stories from{" "}
                <strong className="text-white">IN the GAME with DOC</strong>.
              </p>
            </div>

            {/* Quick Links */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                Quick Links
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/shows"
                    className="text-sm text-zinc-400 hover:text-cyan-400 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Show Calendar
                  </Link>
                </li>
                <li>
                  <Link
                    href="/media"
                    className="text-sm text-zinc-400 hover:text-cyan-400 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Media Gallery
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profiles"
                    className="text-sm text-zinc-400 hover:text-cyan-400 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Coach & Athlete Profiles
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-zinc-400 hover:text-cyan-400 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact DOC
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories Widget - populated client-side */}
            <CategoriesWidget />

            {/* Tags Cloud */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                Tags
              </h3>
              <p className="text-xs text-zinc-500">
                Browse posts by tag on individual articles.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Client-side categories widget
function CategoriesWidget() {
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5">
      <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
        Categories
      </h3>
      <div id="blog-categories-widget">
        <p className="text-xs text-zinc-500">Loading categories...</p>
      </div>
    </div>
  );
}
