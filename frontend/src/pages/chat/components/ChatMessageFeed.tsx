import { useEffect, useRef, useState } from 'react';
import {
  CheckCheck,
  Edit2,
  Trash2,
  FileText,
  Download,
  AlertCircle,
  Eye,
  Check,
  X,
} from 'lucide-react';
import type { ChatMessage } from '@/types/chat';
import { getApiBaseUrl } from '@/lib/api';
import { ROLE_METADATA } from '@/config/roles';

interface ChatMessageFeedProps {
  messages: ChatMessage[];
  currentUserId: number;
  onEditMessage: (messageId: number, newContent: string) => Promise<void>;
  onDeleteMessage: (messageId: number) => Promise<void>;
  onOpenProfile: (userId: number) => void;
  onPreviewImage: (url: string, name: string) => void;
  typingText?: string | null;
}

export function ChatMessageFeed({
  messages,
  currentUserId,
  onEditMessage,
  onDeleteMessage,
  onOpenProfile,
  onPreviewImage,
  typingText,
}: ChatMessageFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingText]);

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async (msgId: number) => {
    if (!editContent.trim()) return;
    setSubmittingEdit(true);
    try {
      await onEditMessage(msgId, editContent.trim());
      setEditingId(null);
    } catch (err) {
      console.error('Failed to edit message', err);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-950/40"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
          <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/80">
            <CheckCheck className="h-8 w-8 text-clinical-400" />
          </div>
          <p className="text-sm font-semibold text-white">No messages yet</p>
          <p className="text-xs text-slate-400 max-w-xs text-center">
            Start the conversation with your colleagues or share clinical updates.
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const roleMeta = ROLE_METADATA[msg.sender_role];
          const fullAttachmentUrl = msg.attachment_url
            ? msg.attachment_url.startsWith('http')
              ? msg.attachment_url
              : `${getApiBaseUrl()}${msg.attachment_url}`
            : null;

          return (
            <div
              key={msg.id}
              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                {/* Other sender's avatar (click to view profile) */}
                {!isMe && (
                  <button
                    onClick={() => onOpenProfile(msg.sender_id)}
                    title={`Tap to view ${msg.sender_name}'s profile`}
                    className="shrink-0 h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 hover:border-clinical-400 transition"
                  >
                    {msg.sender_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </button>
                )}

                {/* Message Bubble */}
                <div
                  className={`group relative rounded-2xl px-4 py-2.5 shadow-sm transition ${
                    isMe
                      ? 'bg-clinical-600 text-white rounded-br-none'
                      : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/60'
                  }`}
                >
                  {/* Sender Name & Role Header on Colleague Bubble */}
                  {!isMe && (
                    <div
                      onClick={() => onOpenProfile(msg.sender_id)}
                      className="cursor-pointer mb-1 flex items-center gap-1.5 hover:underline"
                    >
                      <span className="text-xs font-bold text-clinical-300">
                        {msg.sender_name}
                      </span>
                      {roleMeta && (
                        <span className="rounded bg-slate-900/60 border border-slate-700/80 px-1.5 py-0.2 text-[9px] font-medium text-slate-300">
                          {roleMeta.label}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Attachment View */}
                  {msg.attachment_url && !msg.is_deleted && (
                    <div className="mb-2">
                      {msg.attachment_type === 'image' ? (
                        <div
                          onClick={() =>
                            onPreviewImage(
                              fullAttachmentUrl!,
                              msg.attachment_name || 'Medical Scan',
                            )
                          }
                          className="relative cursor-pointer overflow-hidden rounded-xl border border-white/10 group-hover:opacity-95"
                        >
                          <img
                            src={fullAttachmentUrl!}
                            alt={msg.attachment_name || 'attachment'}
                            className="max-h-60 max-w-full rounded-xl object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-white text-xs font-semibold">
                            <Eye className="h-4 w-4" /> Tap to view
                          </div>
                        </div>
                      ) : (
                        <a
                          href={fullAttachmentUrl!}
                          download={msg.attachment_name || 'document'}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-3 rounded-xl p-2.5 transition ${
                            isMe
                              ? 'bg-white/10 hover:bg-white/20 text-white'
                              : 'bg-slate-900/80 hover:bg-slate-900 text-slate-100 border border-slate-700'
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clinical-500/20 text-clinical-300">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">
                              {msg.attachment_name || 'Attached Document'}
                            </p>
                            <p className="text-[10px] text-slate-300/80">
                              {formatFileSize(msg.attachment_size)} • Tap to download
                            </p>
                          </div>
                          <Download className="h-4 w-4 shrink-0 text-slate-300" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Content / Edit Box */}
                  {editingId === msg.id ? (
                    <div className="space-y-2 mt-1">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-clinical-400 p-2 text-xs text-white focus:outline-none"
                        rows={2}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={submittingEdit}
                          className="rounded p-1 text-slate-300 hover:bg-black/20"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSaveEdit(msg.id)}
                          disabled={submittingEdit || !editContent.trim()}
                          className="rounded bg-emerald-500 p-1 text-white hover:bg-emerald-400"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`text-xs whitespace-pre-wrap leading-relaxed ${
                        msg.is_deleted ? 'italic text-slate-400 flex items-center gap-1.5' : ''
                      }`}
                    >
                      {msg.is_deleted && <AlertCircle className="h-3.5 w-3.5 text-slate-400" />}
                      {msg.content}
                    </p>
                  )}

                  {/* Footer: Timestamp, Edited tag, Delivery tick */}
                  <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-slate-300/80">
                    {msg.is_edited && !msg.is_deleted && (
                      <span className="italic text-[9px] opacity-80">(edited)</span>
                    )}
                    <span>{formatMessageTime(msg.created_at)}</span>
                    {isMe && <CheckCheck className="h-3 w-3 text-emerald-300" />}
                  </div>

                  {/* Action hover menu on own message */}
                  {isMe && !msg.is_deleted && editingId !== msg.id && (
                    <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-700 p-1 shadow-lg">
                      <button
                        onClick={() => handleStartEdit(msg)}
                        title="Edit message"
                        className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this message?')) {
                            onDeleteMessage(msg.id);
                          }
                        }}
                        title="Delete message"
                        className="rounded p-1 text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Typing indicator */}
      {typingText && (
        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-clinical-400" />
          {typingText}
        </div>
      )}
    </div>
  );
}
