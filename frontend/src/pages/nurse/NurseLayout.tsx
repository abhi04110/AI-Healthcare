import { Outlet } from 'react-router-dom';
import { HeartPulse, MessageSquare } from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const NURSE_NAV_ITEMS: NavItem[] = [
  { label: 'Nursing Care Station', to: '/nurse/dashboard', icon: HeartPulse },
  { label: 'Staff Chat (Live)', to: '/staff/chat', icon: MessageSquare },
];

export function NurseLayout() {
  return (
    <PortalShell title="Nursing & Critical Care Portal" navItems={NURSE_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

