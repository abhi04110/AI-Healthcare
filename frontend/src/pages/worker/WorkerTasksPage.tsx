import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { usePreferences } from '@/context/PreferencesContext';
import { hmsService } from '@/services/hmsService';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import type { HousekeepingTask } from '@/types/api';

export function WorkerTasksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { prefs } = usePreferences();
  const queryClient = useQueryClient();
  const isSupervisor = user?.role === 'housekeeping_supervisor';
  const [statusFilter, setStatusFilter] = useState('all');

  const tasksQuery = useQuery({
    queryKey: ['worker-housekeeping'],
    queryFn: () => hmsService.listHousekeepingTasks(),
    refetchInterval: prefs.autoRefreshSeconds > 0 ? prefs.autoRefreshSeconds * 1000 : false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hmsService.updateHousekeepingStatus(id, { status }),
    onSuccess: () => {
      toast.success('Task status updated');
      void queryClient.invalidateQueries({ queryKey: ['worker-housekeeping'] });
    },
    onError: (err) => toast.error('Status update failed', extractApiError(err)),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, workerId }: { id: number; workerId: number }) =>
      hmsService.assignHousekeepingWorker(id, workerId),
    onSuccess: () => {
      toast.success('Worker assigned');
      void queryClient.invalidateQueries({ queryKey: ['worker-housekeeping'] });
    },
    onError: (err) => toast.error('Assignment failed', extractApiError(err)),
  });

  const filtered = (tasksQuery.data ?? []).filter((t) =>
    statusFilter === 'all' ? true : t.status === statusFilter,
  );

  const columns: ColumnDef<HousekeepingTask>[] = [
    {
      key: 'area',
      header: 'Location & Task Type',
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-900">
            Task {t.id} — {t.area} {t.room_number ? `(Room ${t.room_number})` : ''}
          </p>
          <p className="text-xs text-slate-500">
            {t.task_type} • {t.description || 'Standard sanitization protocol'}
          </p>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
    {
      key: 'worker',
      header: 'Assigned Worker',
      render: (t) => (
        <span className="text-xs text-slate-700">
          {t.assigned_worker_id ? `Worker ID ${t.assigned_worker_id}` : 'Unassigned'}
        </span>
      ),
    },
    { key: 'created', header: 'Logged', render: (t) => formatDateTime(t.created_at) },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'actions',
      header: 'Workflow Update',
      render: (t) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {t.status !== 'completed' && t.status !== 'cancelled' && (
            <select
              value={t.status}
              onChange={(e) => updateStatusMutation.mutate({ id: t.id, status: e.target.value })}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="pending" disabled={!isSupervisor}>
                Pending
              </option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              {isSupervisor && <option value="cancelled">Cancelled</option>}
            </select>
          )}
          {isSupervisor && t.status !== 'completed' && (
            <button
              type="button"
              onClick={() => {
                const workerStr = window.prompt(
                  `Assign worker User ID to task ${t.id}:`,
                  t.assigned_worker_id ? String(t.assigned_worker_id) : '',
                );
                if (workerStr && Number(workerStr) > 0) {
                  assignMutation.mutate({ id: t.id, workerId: Number(workerStr) });
                }
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Assign ID
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={isSupervisor ? 'All Housekeeping & Maintenance Tickets' : 'My Assigned Duty Queue'}
          subtitle="Update room turnaround, cleaning, and sanitization status in real time."
          action={<ClipboardCheck className="h-5 w-5 text-emerald-600" />}
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {['all', 'pending', 'assigned', 'in_progress', 'completed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(t) => t.id}
            isLoading={tasksQuery.isLoading}
            searchPlaceholder="Search area, room, or description..."
            searchFn={(t, q) =>
              `${t.area} ${t.room_number ?? ''} ${t.task_type} ${t.description ?? ''}`
                .toLowerCase()
                .includes(q)
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}

