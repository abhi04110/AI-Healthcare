import { Link } from 'react-router-dom';
import { Activity, CalendarCheck, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleHomePath } from '@/config/roles';

export function PublicNavbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinical-600 text-white shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900">MedCore AI</span>
            <span className="hidden text-xs text-slate-500 sm:block">
              Hospital Management & Clinical Intelligence
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/book"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <CalendarCheck className="h-4 w-4 text-clinical-600" />
            <span className="hidden sm:inline">Book Appointment</span>
            <span className="sm:hidden">Book</span>
          </Link>

          {user ? (
            <Link
              to={getRoleHomePath(user.role)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-clinical-700"
            >
              Open Portal
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Patient Sign Up</span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-clinical-700"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

