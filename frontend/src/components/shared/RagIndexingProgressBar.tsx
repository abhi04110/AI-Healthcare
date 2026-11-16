import { CheckCircle2, ChevronRight, Cpu, Database, FileText, Loader2, Sparkles, X, XCircle } from 'lucide-react';
import type { RagJobStatus } from '@/types/api';

interface RagIndexingProgressBarProps {
  jobStatus: RagJobStatus;
  onDismiss?: () => void;
}

const INDEXING_STAGES = [
  { key: 'extract', label: 'OCR & Extract', threshold: 8, icon: FileText },
  { key: 'chunk', label: 'Semantic Chunking', threshold: 25, icon: ChevronRight },
  { key: 'embed', label: 'Vector Embeddings', threshold: 30, icon: Cpu },
  { key: 'index', label: 'Vector DB Index', threshold: 92, icon: Database },
  { key: 'ready', label: 'Clinical Ready', threshold: 100, icon: Sparkles },
];

export function RagIndexingProgressBar({ jobStatus, onDismiss }: RagIndexingProgressBarProps) {
  const percent = Math.max(0, Math.min(100, jobStatus.percent ?? jobStatus.progress_percent ?? (jobStatus.status === 'completed' ? 100 : 5)));
  const isCompleted = jobStatus.status === 'completed' || percent >= 100;
  const isFailed = jobStatus.status === 'failed';
  const isRunning = !isCompleted && !isFailed;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-5 text-white shadow-xl shadow-sky-950/20 backdrop-blur-xl">
      {/* Background ambient glow effect */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-tealcare-500/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Header section with Job stage, status badge & close button */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            isFailed
              ? 'border-rose-500/40 bg-rose-500/20 text-rose-400'
              : isCompleted
              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
              : 'border-sky-500/40 bg-sky-500/20 text-sky-400 animate-pulse'
          }`}>
            {isFailed ? (
              <XCircle className="h-5 w-5" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold tracking-tight text-white">
                {isCompleted
                  ? 'Medical Knowledge Indexed Successfully'
                  : isFailed
                  ? 'RAG Indexing Encountered An Error'
                  : jobStatus.stage || 'RAG Indexing In Progress...'}
              </h4>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
                isCompleted
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : isFailed
                  ? 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border border-sky-400/40 bg-sky-400/15 text-sky-300'
              }`}>
                {isRunning && <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" />}
                {isCompleted ? 'Index Complete' : isFailed ? 'Failed' : 'HTTP Stream Active'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400 truncate max-w-md">
              {jobStatus.filename ? `Document: ${jobStatus.filename}` : 'Full Knowledge Base Synchronization'}
            </p>
          </div>
        </div>

        {/* Big Animated Percentage readout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
              {percent}%
            </span>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              {isCompleted ? 'Vectorized' : 'Progress'}
            </p>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Dismiss progress banner"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Modern Liquid Progress Bar Line with Gradient & Shimmer */}
      <div className="relative z-10 mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full border border-slate-700/60 bg-slate-800/80 p-0.5 shadow-inner">
          <div
            className={`relative h-full rounded-full transition-all duration-500 ease-out ${
              isFailed
                ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                : isCompleted
                ? 'bg-gradient-to-r from-emerald-500 to-tealcare-500 shadow-[0_0_14px_rgba(16,185,129,0.7)]'
                : 'bg-gradient-to-r from-sky-500 via-tealcare-400 to-indigo-500 shadow-[0_0_14px_rgba(14,165,233,0.7)]'
            }`}
            style={{ width: `${percent}%` }}
          >
            {/* Shimmer light bar across active line */}
            {isRunning && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
      </div>

      {/* Stepper Pipeline Indicators */}
      <div className="relative z-10 mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 text-xs">
        {INDEXING_STAGES.map((step) => {
          const reached = percent >= step.threshold;
          const StepIcon = step.icon;
          return (
            <div
              key={step.key}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors ${
                reached
                  ? 'bg-slate-800/80 text-sky-300 border border-sky-500/20'
                  : 'text-slate-500'
              }`}
            >
              <StepIcon className={`h-3 w-3 shrink-0 ${reached ? 'text-tealcare-400' : 'text-slate-600'}`} />
              <span className="truncate text-[11px] font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Worker Log Message / Terminal status info */}
      <div className="relative z-10 mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="inline-block h-2 w-2 rounded-full bg-tealcare-400" />
          <span className="font-mono text-[11px] text-slate-300">{jobStatus.message || 'Worker processing chunks...'}</span>
        </div>

        {jobStatus.current !== undefined && jobStatus.total !== undefined && (
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
            Batch {jobStatus.current} of {jobStatus.total}
          </span>
        )}

        {isCompleted && (
          <div className="text-[11px] font-medium text-emerald-400">
            ✓ Chunks synchronized with FAISS / vector index
          </div>
        )}

        {isFailed && jobStatus.error && (
          <div className="text-[11px] font-medium text-rose-400">
            Error: {jobStatus.error}
          </div>
        )}
      </div>
    </div>
  );
}

