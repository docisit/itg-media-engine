'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface DropdownItem {
  label: string;
  href: string;
  description?: string;
  icon?: string;
  gradient?: string;
}

interface NavDropdownProps {
  items: DropdownItem[];
  children: React.ReactNode;
}

export default function NavDropdown({ items, children }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger */}
      <div className="cursor-pointer">
        {children}
      </div>

      {/* Dropdown - slides down with unfold effect */}
      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50 transition-all duration-200 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        style={{ minWidth: '280px' }}
      >
        {/* Arrow */}
        <div className="flex justify-center mb-0">
          <div className="w-3 h-3 bg-zinc-900 border-l border-t border-zinc-700 rotate-45 -mb-[6px]" />
        </div>
        
        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl overflow-hidden shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="py-2">
            {items.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="group flex items-start gap-4 px-5 py-4 hover:bg-zinc-800/80 transition-all duration-150"
                onClick={() => setIsOpen(false)}
              >
                {/* Icon */}
                {item.icon && (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    item.gradient || 'bg-cyan-500/10'
                  }`}>
                    {item.icon}
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm group-hover:text-cyan-400 transition-colors">
                    {item.label}
                    <span className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 inline-block text-cyan-400">→</span>
                  </div>
                  {item.description && (
                    <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          
          {/* Bottom glow accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
