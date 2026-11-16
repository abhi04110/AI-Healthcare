import { Outlet } from 'react-router-dom';
import { CalendarClock, CreditCard } from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const RECEPTION_NAV_ITEMS: NavItem[] = [
  { label: 'Front Desk & Appointments', to: '/reception/dashboard', icon: CalendarClock },
  { label: 'Billing & Services', to: '/reception/billing', icon: CreditCard },
];

export function ReceptionLayout() {
  return (
    <PortalShell title="Front Desk, Intake & Billing" navItems={RECEPTION_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

