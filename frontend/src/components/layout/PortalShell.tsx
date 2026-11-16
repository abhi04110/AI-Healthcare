import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Activity, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { ROLE_METADATA } from '@/config/roles';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/types/api';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export function PortalShell({
  title,
  navItems,
  children,
}: {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { prefs } = usePreferences();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const meta = ROLE_METADATA[user.role];
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(user.role));

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <Link to={meta.homePath} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinical-500 text-white shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">MedCore AI</p>
            <p className="text-[11px] text-slate-400">{meta.portalName}</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-clinical-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl bg-slate-800/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <Badge variant={meta.badgeVariant} className="shrink-0">
              {meta.label}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-rose-600/90 hover:border-rose-500 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw]">{sidebarContent}</aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {title}
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">{meta.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 md:inline-flex shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Hospital Network Online
            </span>
            <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
          </div>
        </header>

        <main
          className={cn(
            'mx-auto w-full max-w-7xl flex-1',
            prefs.compactDensity ? 'p-3 sm:p-4' : 'p-4 sm:p-6',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

