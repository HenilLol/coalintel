import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-1.5 text-xs text-[#9EADB7] font-mono">
      <Link href="/dashboard" className="hover:text-[#35D3CE] transition-colors flex items-center gap-1">
        <Home className="h-3.5 w-3.5" />
        <span>Platform</span>
      </Link>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-3.5 w-3.5 text-[#2C3D49] shrink-0" />
          {item.href ? (
            <Link href={item.href} className="hover:text-[#35D3CE] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#F1F5F7] font-semibold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
