import { Outlet } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const NURSE_NAV_ITEMS: NavItem[] = [
  { label: 'Nursing Care Station', to: '/nurse/dashboard', icon: HeartPulse },
];

export function NurseLayout() {
  return (
    <PortalShell title="Nursing & Critical Care Portal" navItems={NURSE_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

