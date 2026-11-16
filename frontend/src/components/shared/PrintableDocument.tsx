import React from 'react';
import { Download, Printer } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { downloadTextFile } from '@/lib/formatters';

export function PrintableDocumentModal({
  open,
  onClose,
  title,
  filename,
  plainTextSummary,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  plainTextSummary: string;
  children: React.ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="no-print flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => downloadTextFile(filename, plainTextSummary)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download TXT
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">{children}</div>
      </div>
    </Modal>
  );
}

