import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleHomePath } from '@/config/roles';

export function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <FileQuestion className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">404 — Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page you requested does not exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to={user ? getRoleHomePath(user.role) : '/'}
            className="rounded-xl bg-clinical-600 px-4 py-2 text-sm font-semibold text-white hover:bg-clinical-700"
          >
            {user ? 'Return to My Portal' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}

