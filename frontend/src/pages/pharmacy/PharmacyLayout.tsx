import { Outlet } from 'react-router-dom';
import { MessageSquare, Pill } from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const PHARMACY_NAV_ITEMS: NavItem[] = [
  { label: 'Inventory & Dispensing', to: '/pharmacy/dashboard', icon: Pill },
  { label: 'Staff Chat (Live)', to: '/staff/chat', icon: MessageSquare },
];

export function PharmacyLayout() {
  return (
    <PortalShell title="Hospital Pharmacy Operations" navItems={PHARMACY_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

