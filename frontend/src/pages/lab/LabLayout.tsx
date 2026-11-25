import { Outlet } from 'react-router-dom';
import { FlaskConical, MessageSquare } from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const LAB_NAV_ITEMS: NavItem[] = [
  { label: 'Lab Orders & Results', to: '/lab/dashboard', icon: FlaskConical },
  { label: 'Staff Chat (Live)', to: '/staff/chat', icon: MessageSquare },
];

export function LabLayout() {
  return (
    <PortalShell title="Diagnostics Laboratory Portal" navItems={LAB_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

