import { Outlet } from 'react-router-dom';
import { ClipboardCheck, LayoutDashboard, ScanText } from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const WORKER_NAV_ITEMS: NavItem[] = [
  {
    label: 'Operations Overview',
    to: '/worker/dashboard',
    icon: LayoutDashboard,
    roles: ['housekeeping_supervisor', 'staff', 'radiology_technician'],
  },
  {
    label: 'Housekeeping Tasks',
    to: '/worker/tasks',
    icon: ClipboardCheck,
    roles: ['housekeeping_supervisor', 'housekeeping_worker'],
  },
  {
    label: 'Patient Intake & Reports',
    to: '/worker/intake',
    icon: ScanText,
    roles: ['staff', 'radiology_technician'],
  },
];

export function WorkerLayout() {
  return (
    <PortalShell title="Hospital Operations & Support Portal" navItems={WORKER_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

