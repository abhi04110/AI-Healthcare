import { Outlet } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, Settings, UtensilsCrossed } from 'lucide-react';
import { PortalShell, type NavItem } from '@/components/layout/PortalShell';

const CANTEEN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Sales & Kitchen Analytics',
    to: '/canteen/dashboard',
    icon: LayoutDashboard,
    roles: ['canteen_manager'],
  },
  {
    label: 'Live Food Orders Queue',
    to: '/canteen/orders',
    icon: ClipboardList,
    roles: ['canteen_manager', 'canteen_worker'],
  },
  {
    label: 'Menu & Dietary Stock',
    to: '/canteen/menu',
    icon: UtensilsCrossed,
    roles: ['canteen_manager', 'canteen_worker'],
  },
  {
    label: 'Kitchen Workflow & Access',
    to: '/canteen/settings',
    icon: Settings,
    roles: ['canteen_manager', 'canteen_worker'],
  },
];

export function CanteenLayout() {
  return (
    <PortalShell title="Dietary & Hospital Canteen" navItems={CANTEEN_NAV_ITEMS}>
      <Outlet />
    </PortalShell>
  );
}

