import { Outlet } from 'react-router-dom';
import {
  Activity,
  Brain,
  Building2,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Command Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Governance & Staff', to: '/admin/governance', icon: Building2 },
  { label: 'Patients & EHR', to: '/admin/patients', icon: Users },
  { label: 'Hospital Operations', to: '/admin/operations', icon: ClipboardList },
  { label: 'AI, ML & Knowledge', to: '/admin/ai', icon: Brain },
  { label: 'Staff Chat (Live)', to: '/staff/chat', icon: MessageSquare },
  { label: 'System Health & Diagnostics', to: '/admin/settings', icon: Settings, roles: ['admin'] },
];

export function AdminLayout() {
  const { user } = useAuth();

  const title =
    user?.role === 'sub_admin'
      ? 'Hospital Operations Command (Sub-Admin)'
      : user?.role === 'department_admin'
      ? 'Department Operations Portal'
      : 'Hospital Command Center (Super Admin)';

  return (
    <PortalShell
      title={title}
      navItems={ADMIN_NAV_ITEMS.map((item) => ({
        ...item,
        icon: item.icon || Activity,
      }))}
    >
      <Outlet />
    </PortalShell>
  );
}

