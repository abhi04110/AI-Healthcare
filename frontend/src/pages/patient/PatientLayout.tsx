import { Outlet } from 'react-router-dom';
import {
  Bot,
  CalendarClock,
  CreditCard,
  FileHeart,
  FlaskConical,
  LayoutDashboard,
  Pill,
  UserCog,
  UtensilsCrossed,
} from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const PATIENT_NAV_ITEMS: NavItem[] = [
  { label: 'My Care Summary', to: '/patient/dashboard', icon: LayoutDashboard },
  { label: 'Book & Track Visits', to: '/patient/appointments', icon: CalendarClock },
  { label: 'Health Records & Reports', to: '/patient/records', icon: FileHeart },
  { label: 'Prescriptions', to: '/patient/prescriptions', icon: Pill },
  { label: 'Lab Reports', to: '/patient/labs', icon: FlaskConical },
  { label: 'AI Health Assistant', to: '/patient/assistant', icon: Bot },
  { label: 'Dietary Canteen', to: '/patient/canteen', icon: UtensilsCrossed },
  { label: 'Billing & Invoices', to: '/patient/billing', icon: CreditCard },
  { label: 'Profile & Settings', to: '/patient/profile', icon: UserCog },
];

export function PatientLayout() {
  return (
    <PortalShell title="Patient Care & Self-Service Portal" navItems={PATIENT_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

