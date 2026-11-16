import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'blue' | 'teal' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';

const TONE_CLASSES: Record<Tone, string> = {
  blue: 'bg-sky-50 text-sky-600 ring-sky-100',
  teal: 'bg-teal-50 text-teal-600 ring-teal-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  purple: 'bg-violet-50 text-violet-600 ring-violet-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={cn('rounded-xl p-2.5 ring-1', TONE_CLASSES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

