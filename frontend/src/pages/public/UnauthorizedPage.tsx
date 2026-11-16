import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleHomePath, ROLE_METADATA } from '@/config/roles';
import { Badge } from '@/components/ui/Badge';

export function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">403 — Unauthorized Access</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account role does not have permission to open this workspace or route.
        </p>
        {user && (
          <div className="mt-3 flex justify-center">
            <Badge variant={ROLE_METADATA[user.role]?.badgeVariant ?? 'slate'}>
              Current role: {ROLE_METADATA[user.role]?.label ?? user.role}
            </Badge>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={user ? getRoleHomePath(user.role) : '/login'}
            className="rounded-xl bg-clinical-600 px-4 py-2 text-sm font-semibold text-white hover:bg-clinical-700"
          >
            {user ? 'Go to My Portal' : 'Sign In'}
          </Link>
          {user && (
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

