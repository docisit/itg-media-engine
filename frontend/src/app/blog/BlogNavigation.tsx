"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function BlogNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Detect if we're on a single post page
  const isSinglePost = pathname !== "/blog" && pathname.startsWith("/blog/");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/blog/categories/`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/blog?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  const navItems = [
    { label: "All Posts", href: "/blog", icon: "📰" },
    { label: "Latest", href: "/blog?sort=latest", icon: "🆕" },
    { label: "Popular", href: "/blog?sort=popular", icon: "🔥" },
  ];

  return (
    <div className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between h-12">
          {/* Left: Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/blog"
                  ? pathname === "/blog"
                  : pathname.startsWith(item.href.split("?")[0]);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-600/20 text-cyan-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}

            {/* Categories Dropdown */}
            {categories.length > 0 && (
              <div className="relative group">
                <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition flex items-center gap-1">
                  📂 Categories
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-2 space-y-0.5">
                    <Link
                      href="/blog"
                      className="block px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                    >
                      All Categories
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat}
                        href={`/blog?category=${encodeURIComponent(cat)}`}
                        className="block px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Breadcrumb for single post */}
            {isSinglePost && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-zinc-700">
                <Link
                  href="/blog"
                  className="text-xs text-zinc-500 hover:text-cyan-400 transition"
                >
                  ← Back
                </Link>
              </div>
            )}
          </div>

          {/* Right: Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-cyan-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex items-center justify-between h-12">
            {/* Mobile Nav Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/blog"
                    ? pathname === "/blog"
                    : pathname.startsWith(item.href.split("?")[0]);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? "bg-cyan-600/20 text-cyan-400"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.icon} {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="ml-2 p-2 text-zinc-400 hover:text-white"
              aria-label="Toggle blog menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Expanded Menu */}
          {isMenuOpen && (
            <div className="pb-3 border-t border-zinc-800">
              {/* Search */}
              <form onSubmit={handleSearch} className="p-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="px-3 pb-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 px-1">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Link
                      href="/blog"
                      onClick={() => setIsMenuOpen(false)}
                      className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition"
                    >
                      All
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat}
                        href={`/blog?category=${encodeURIComponent(cat)}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition"
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="px-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 px-1">
                  Quick Links
                </p>
                <div className="space-y-1">
                  <Link
                    href="/shows"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                  >
                    📅 Show Calendar
                  </Link>
                  <Link
                    href="/media"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                  >
                    🎬 Media Gallery
                  </Link>
                  <Link
                    href="/profiles"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                  >
                    👥 Profiles
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                  >
                    📧 Contact DOC
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
