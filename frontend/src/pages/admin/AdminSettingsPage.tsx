import { useQuery } from '@tanstack/react-query';
import { Activity, Database, RefreshCw, Table2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { getApiBaseUrl } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function AdminSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin';
  let configuredUrl = 'Not configured (set VITE_API_URL)';
  try {
    configuredUrl = getApiBaseUrl();
  } catch {
    // Render-safe fallback when VITE_API_URL is omitted locally
  }

  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: () => authService.getHealth(),
  });

  const dbQuery = useQuery({
    queryKey: ['db-check'],
    queryFn: () => authService.checkDatabase(),
    enabled: isSuperAdmin,
  });

  const tablesQuery = useQuery({
    queryKey: ['db-tables'],
    queryFn: () => authService.getTables(),
    enabled: isSuperAdmin,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Backend Connectivity & Database Diagnostics"
          subtitle={`Configured API Base URL: ${configuredUrl}`}
          action={
            <button
              type="button"
              onClick={() => {
                void healthQuery.refetch();
                if (isSuperAdmin) {
                  void dbQuery.refetch();
                  void tablesQuery.refetch();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-check
            </button>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Activity className="h-4 w-4 text-clinical-600" />
                  API Service (`/health`)
                </span>
                <Badge variant={healthQuery.data?.status === 'ok' ? 'emerald' : 'amber'}>
                  {healthQuery.isLoading ? 'Checking...' : healthQuery.data?.status ?? 'Unknown'}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Application service status verified against the live hospital server.
              </p>
            </div>

            {isSuperAdmin && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Database className="h-4 w-4 text-emerald-600" />
                    Database Connection
                  </span>
                  <Badge variant={dbQuery.data?.status === 'ok' ? 'emerald' : 'rose'}>
                    {dbQuery.isLoading ? 'Checking...' : dbQuery.data?.status ?? 'Error'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {dbQuery.data?.message ?? 'Verifying active database connection.'}
                </p>
              </div>
            )}
          </div>

          {isSuperAdmin && tablesQuery.data?.tables && (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Table2 className="h-4 w-4" />
                Live Database Schema Tables ({tablesQuery.data.tables.length})
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tablesQuery.data.tables.map((t) => (
                  <Badge key={t} variant="slate">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
