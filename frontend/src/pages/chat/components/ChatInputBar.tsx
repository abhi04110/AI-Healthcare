import { useState, useRef } from 'react';
import {
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { chatService } from '@/services/chatService';

interface AttachmentInfo {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface ChatInputBarProps {
  onSendMessage: (content: string, attachment?: AttachmentInfo | null) => Promise<void>;
  onTyping: () => void;
  disabled?: boolean;
}

export function ChatInputBar({
  onSendMessage,
  onTyping,
  disabled = false,
}: ChatInputBarProps) {
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<AttachmentInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await chatService.uploadAttachment(file);
      setAttachment({
        url: res.attachment_url,
        name: res.attachment_name,
        type: res.attachment_type,
        size: res.attachment_size,
      });
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if ((!trimmed && !attachment) || isSending || isUploading || disabled) return;

    setIsSending(true);
    try {
      await onSendMessage(trimmed || '📎 Sent attachment', attachment);
      setContent('');
      setAttachment(null);
      setUploadError(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to dispatch message', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping();

    // Auto-adjust height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/95 p-3 sm:p-4">
      {/* Upload error banner */}
      {uploadError && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="p-0.5 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-800 border border-slate-700 p-2.5 max-w-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-clinical-500/20 text-clinical-400">
              {attachment.type === 'image' ? (
                <ImageIcon className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{attachment.name}</p>
              <p className="text-[10px] text-slate-400">
                {(attachment.size / 1024).toFixed(1)} KB • Ready to send
              </p>
            </div>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isSending || disabled}
          title="Attach medical scan, report, or document"
          className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-clinical-400" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>

        {/* Text Input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isSending || disabled}
            placeholder="Type a clinical message or staff update (Press Enter to send)..."
            rows={1}
            className="w-full resize-none rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!content.trim() && !attachment) || isSending || isUploading || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clinical-600 text-white shadow-md transition hover:bg-clinical-500 disabled:opacity-40 disabled:hover:bg-clinical-600"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
