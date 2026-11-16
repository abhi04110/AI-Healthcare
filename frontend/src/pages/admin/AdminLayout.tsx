import { Outlet } from 'react-router-dom';
import {
  Activity,
  Brain,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Command Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Governance & Staff', to: '/admin/governance', icon: Building2 },
  { label: 'Patients & EHR', to: '/admin/patients', icon: Users },
  { label: 'Hospital Operations', to: '/admin/operations', icon: ClipboardList },
  { label: 'AI, ML & Knowledge', to: '/admin/ai', icon: Brain },
  { label: 'System Health & Diagnostics', to: '/admin/settings', icon: Settings },
];

export function AdminLayout() {
  return (
    <PortalShell
      title="Hospital Administration & Command"
      navItems={ADMIN_NAV_ITEMS.map((item) => ({
        ...item,
        icon: item.icon || Activity,
      }))}
    >
      <Outlet />
    </PortalShell>
  );
}

