import { X, Download, ExternalLink } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  imageName: string | null;
  onClose: () => void;
}

export function ImageLightboxModal({
  isOpen,
  imageUrl,
  imageName,
  onClose,
}: ImageLightboxModalProps) {
  if (!isOpen || !imageUrl) return null;

  const fullUrl = imageUrl.startsWith('http')
    ? imageUrl
    : `${getApiBaseUrl()}${imageUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-200">
          <p className="max-w-[60vw] truncate text-sm font-medium">{imageName || 'Medical Attachment'}</p>
          <div className="flex items-center gap-2">
            <a
              href={fullUrl}
              download={imageName || 'image'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image preview */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
          <img
            src={fullUrl}
            alt={imageName || 'Medical attachment'}
            className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
