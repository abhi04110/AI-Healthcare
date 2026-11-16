import { Outlet } from 'react-router-dom';
import {
  Ambulance,
  Brain,
  CalendarClock,
  FilePlus2,
  FlaskConical,
  LayoutDashboard,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const DOCTOR_NAV_ITEMS: NavItem[] = [
  { label: 'Clinical Overview', to: '/doctor/dashboard', icon: LayoutDashboard },
  { label: 'Appointments & Slots', to: '/doctor/appointments', icon: CalendarClock },
  { label: 'Assigned Patients & EHR', to: '/doctor/patients', icon: Users },
  { label: 'Consultations & Rx', to: '/doctor/consultations', icon: FilePlus2 },
  { label: 'Lab Orders & Results', to: '/doctor/labs', icon: FlaskConical },
  { label: 'AI Diagnostics & Risk', to: '/doctor/ai', icon: Brain },
  { label: 'ER / ICU / OT Care', to: '/doctor/critical-care', icon: Ambulance },
  { label: 'On-Call Meal Orders', to: '/doctor/meals', icon: UtensilsCrossed },
];

export function DoctorLayout() {
  return (
    <PortalShell title="Doctor Clinical Workspace" navItems={DOCTOR_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

