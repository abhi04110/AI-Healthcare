import { Outlet } from 'react-router-dom';
import { CalendarClock, Users, CreditCard, MessageSquare } from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const RECEPTION_NAV_ITEMS: NavItem[] = [
  { label: 'Front Desk Overview', to: '/reception/dashboard', icon: CalendarClock },
  { label: 'Patients & Intake', to: '/reception/patients', icon: Users },
  { label: 'Billing & Invoices', to: '/reception/billing', icon: CreditCard },
  { label: 'Staff Chat (Live)', to: '/staff/chat', icon: MessageSquare },
];

export function ReceptionLayout() {
  return (
    <PortalShell title="Front Desk, Intake & Billing" navItems={RECEPTION_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

