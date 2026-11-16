import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, Plus, Sparkles, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { extractApiError } from '@/lib/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { WorkerStaffIntakePage } from './WorkerStaffIntakePage';

export function WorkerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isSupervisor = user?.role === 'housekeeping_supervisor';

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    task_type: 'ward_sanitization',
    area: '',
    room_number: '',
    priority: 'normal',
    assigned_worker_id: '',
    description: '',
  });

  const tasksQuery = useQuery({
    queryKey: ['worker-housekeeping'],
    queryFn: () => hmsService.listHousekeepingTasks(),
    enabled: isSupervisor,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      hmsService.createHousekeepingTask({
        task_type: form.task_type,
        area: form.area,
        room_number: form.room_number || undefined,
        priority: form.priority,
        assigned_worker_id: form.assigned_worker_id ? Number(form.assigned_worker_id) : null,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      toast.success('Cleaning / facility ticket dispatched');
      setModalOpen(false);
      setForm({
        task_type: 'ward_sanitization',
        area: '',
        room_number: '',
        priority: 'normal',
        assigned_worker_id: '',
        description: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['worker-housekeeping'] });
    },
    onError: (err) => toast.error('Ticket creation failed', extractApiError(err)),
  });

  if (!isSupervisor) {
    return <WorkerStaffIntakePage />;
  }

  const tasks = tasksQuery.data ?? [];
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const active = tasks.filter((t) => t.status === 'assigned' || t.status === 'in_progress').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Housekeeping Supervisor Console</h2>
          <p className="mt-1 text-xs text-slate-500">
            Create ward/room sanitization tickets, assign workers, and monitor real-time turnaround.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Dispatch Ticket
          </button>
          <Link
            to="/worker/tasks"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open Task Queue
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending Dispatch" value={pending} icon={ClipboardList} tone="amber" />
        <StatCard label="Assigned / Active" value={active} icon={UserCheck} tone="blue" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="emerald" />
      </div>

      <Card>
        <CardHeader
          title="Supervisor Quick Guidelines"
          action={<Sparkles className="h-4 w-4 text-emerald-600" />}
        />
        <CardBody className="text-xs text-slate-600 space-y-1.5">
          <p>
            • Open <strong>Housekeeping Tasks</strong> to assign specific worker User IDs or update
            ticket progress.
          </p>
          <p>• Once a task is marked Completed, the backend locks status against reverting to pending.</p>
        </CardBody>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Housekeeping Ticket">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Task Type</label>
              <input
                required
                value={form.task_type}
                onChange={(e) => setForm({ ...form, task_type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Area / Ward</label>
              <input
                required
                placeholder="e.g. ICU Ward / OT-2"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Room Number</label>
              <input
                placeholder="e.g. 304"
                value={form.room_number}
                onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Assign Worker User ID (optional)
            </label>
            <input
              type="number"
              min={1}
              value={form.assigned_worker_id}
              onChange={(e) => setForm({ ...form, assigned_worker_id: e.target.value })}
              placeholder="Numeric Worker User ID"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Instructions</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Dispatch Ticket
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

