import React from 'react';
import { cn } from '@/lib/cn';
import { formatLabel } from '@/lib/formatters';

export type BadgeVariant = 'blue' | 'teal' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function Badge({
  children,
  variant = 'slate',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  completed: 'emerald',
  delivered: 'emerald',
  paid: 'emerald',
  discharged: 'emerald',
  stable: 'emerald',
  low: 'emerald',
  ready: 'teal',
  active: 'emerald',
  indexed: 'emerald',
  scheduled: 'blue',
  ordered: 'blue',
  assigned: 'blue',
  admitted: 'blue',
  normal: 'blue',
  preparing: 'amber',
  processing: 'amber',
  in_progress: 'amber',
  in_treatment: 'amber',
  partial: 'amber',
  pending: 'amber',
  waiting: 'amber',
  medium: 'amber',
  urgent: 'amber',
  high: 'rose',
  critical: 'rose',
  abnormal: 'rose',
  cancelled: 'rose',
  no_show: 'slate',
  inactive: 'slate',
};

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status || '').toLowerCase();
  const variant = STATUS_MAP[key] || 'slate';
  return <Badge variant={variant}>{formatLabel(status)}</Badge>;
}

