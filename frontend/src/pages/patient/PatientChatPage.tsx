import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Send,
  Smile,
  Stethoscope,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { chatService } from '@/services/chatService';
import { ROLE_METADATA } from '@/config/roles';
import type {
  ActiveConversation,
  ChatMessage,
  StaffMember,
  StaffWorkspaceData,
  WebSocketEvent,
} from '@/types/chat';
import { StaffProfileDrawer } from '../chat/components/StaffProfileDrawer';
import { ImageLightboxModal } from '../chat/components/ImageLightboxModal';

const COMMON_EMOJIS = ['👍', '❤️', '🙏', '🩺', '💊', '✅', '😊', '👋'];

export function PatientChatPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [workspace, setWorkspace] = useState<StaffWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editContent, setEditContent] = useState('');

  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);
  const [typingText, setTypingText] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const activeConversationRef = useRef<ActiveConversation | null>(null);
  activeConversationRef.current = activeConversation;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load workspace (care team members)
  const fetchWorkspace = useCallback(async () => {
    try {
      const data = await chatService.getWorkspace();
      setWorkspace(data);

      // Auto-select first doctor/nurse if not set
      if (!activeConversationRef.current && data.staff.length > 0) {
        const first = data.staff[0];
        const meta = ROLE_METADATA[first.role];
        setActiveConversation({
          type: 'dm',
          id: first.id,
          title: first.name,
          subtitle: `${meta?.label || first.role} • ${first.is_online ? 'Online' : 'Offline'}`,
          role: first.role,
          is_online: first.is_online,
          user_id: first.id,
          avatar_text: first.name.slice(0, 2).toUpperCase(),
        });
      }
    } catch (err: any) {
      console.error('Failed to load patient care team chat', err);
      toast.error('Could not connect to care team chat', err.response?.data?.detail);
    } finally {
      setLoadingWorkspace(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Load chat history for selected clinician
  const loadMessages = useCallback(async (conv: ActiveConversation) => {
    setLoadingMessages(true);
    try {
      const data = await chatService.getMessages({
        channel_type: 'dm',
        recipient_id: Number(conv.id),
        limit: 100,
      });
      setMessages(data);

      if (data.length > 0) {
        const lastMsg = data[data.length - 1];
        chatService.markAsRead(`dm_${conv.id}`, lastMsg.id);
      }

      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          staff: prev.staff.map((s) => (s.id === Number(conv.id) ? { ...s, unread_count: 0 } : s)),
        };
      });
    } catch (err) {
      console.error('Failed to load message history', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation, loadMessages]);

  // WebSocket for real-time messaging
  useEffect(() => {
    const handleWsEvent = (event: WebSocketEvent) => {
      if (event.type === 'new_message') {
        const incoming = event.message;
        const currentActive = activeConversationRef.current;

        const isCurrentConv =
          currentActive &&
          currentActive.type === 'dm' &&
          incoming.channel_type === 'dm' &&
          (incoming.sender_id === Number(currentActive.id) ||
            incoming.recipient_id === Number(currentActive.id));

        const isFromMe = incoming.sender_id === user?.id;

        if (isCurrentConv) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });

          chatService.markAsRead(`dm_${isFromMe ? incoming.recipient_id : incoming.sender_id}`, incoming.id);

          setWorkspace((prev) => {
            if (!prev) return prev;
            const otherStaffId = isFromMe ? incoming.recipient_id : incoming.sender_id;
            return {
              ...prev,
              staff: prev.staff.map((s) =>
                s.id === otherStaffId ? { ...s, unread_count: 0, last_message: incoming.content } : s,
              ),
            };
          });
        } else {
          // Increment unread count
          setWorkspace((prev) => {
            if (!prev) return prev;
            const otherStaffId = isFromMe ? incoming.recipient_id : incoming.sender_id;
            return {
              ...prev,
              staff: prev.staff.map((s) =>
                s.id === otherStaffId
                  ? {
                      ...s,
                      unread_count: isFromMe ? s.unread_count : s.unread_count + 1,
                      last_message: incoming.content,
                    }
                  : s,
              ),
            };
          });

          if (!isFromMe) {
            toast.info(incoming.sender_name, incoming.content.slice(0, 45));
          }
        }
      } else if (event.type === 'message_edited') {
        const updated = event.message;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      } else if (event.type === 'message_deleted') {
        const deleted = event.message;
        setMessages((prev) => prev.map((m) => (m.id === deleted.id ? { ...m, ...deleted } : m)));
      } else if (event.type === 'user_status') {
        setWorkspace((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            staff: prev.staff.map((s) =>
              s.id === event.user_id ? { ...s, is_online: event.status === 'online' } : s,
            ),
          };
        });
      } else if (event.type === 'typing') {
        if (event.user_id !== user?.id) {
          setTypingText(`${event.user_name} is typing...`);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = window.setTimeout(() => setTypingText(null), 3000);
        }
      }
    };

    const cleanupWs = chatService.subscribeToEvents(handleWsEvent);
    return () => {
      cleanupWs();
    };
  }, [user?.id, toast]);

  // Send message
  const handleSendMessage = async () => {
    if (!activeConversation || !messageInput.trim() || sending) return;

    setSending(true);
    try {
      await chatService.sendMessage({
        channel_type: 'dm',
        recipient_id: Number(activeConversation.id),
        content: messageInput.trim(),
      });
      setMessageInput('');
      setShowEmojiPicker(false);
    } catch (err: any) {
      toast.error('Failed to send message', err.response?.data?.detail);
    } finally {
      setSending(false);
    }
  };

  // Upload file attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    setUploading(true);
    try {
      const uploadRes = await chatService.uploadAttachment(file);
      await chatService.sendMessage({
        channel_type: 'dm',
        recipient_id: Number(activeConversation.id),
        content: uploadRes.attachment_name,
        attachment_url: uploadRes.attachment_url,
        attachment_name: uploadRes.attachment_name,
        attachment_type: uploadRes.attachment_type,
        attachment_size: uploadRes.attachment_size,
      });
      toast.success('File sent to your clinician');
    } catch (err: any) {
      toast.error('File upload failed', err.response?.data?.detail);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Edit message
  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;
    try {
      await chatService.editMessage(editingMessage.id, editContent.trim());
      setEditingMessage(null);
      setEditContent('');
    } catch (err: any) {
      toast.error('Failed to update message', err.response?.data?.detail);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: number) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await chatService.deleteMessage(msgId);
    } catch (err: any) {
      toast.error('Failed to delete message', err.response?.data?.detail);
    }
  };

  const handleSelectClinician = (colleague: StaffMember) => {
    const meta = ROLE_METADATA[colleague.role];
    setActiveConversation({
      type: 'dm',
      id: colleague.id,
      title: colleague.name,
      subtitle: `${meta?.label || colleague.role} • ${colleague.is_online ? 'Online' : 'Offline'}`,
      role: colleague.role,
      is_online: colleague.is_online,
      user_id: colleague.id,
      avatar_text: colleague.name.slice(0, 2).toUpperCase(),
    });
    setMobileShowSidebar(false);
  };

  if (loadingWorkspace) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center rounded-2xl bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-clinical-400" />
          <p className="text-sm text-slate-300">Connecting to your Hospital Care Team...</p>
        </div>
      </div>
    );
  }

  const careTeam = workspace?.staff || [];

  return (
    <div className="flex h-[calc(100vh-110px)] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl">
      {/* Left Sidebar: Care Team Directory */}
      <div
        className={`${
          mobileShowSidebar ? 'flex' : 'hidden'
        } sm:flex h-full w-full sm:w-80 md:w-88 flex-col border-r border-slate-800 bg-slate-900/95`}
      >
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinical-600 text-white shadow-sm">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  My Care Team
                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Direct
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">Doctors & Attending Nurses</p>
              </div>
            </div>

            <button
              onClick={() => setAudioMuted(!audioMuted)}
              title={audioMuted ? 'Unmute chimes' : 'Mute chimes'}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Clinicians List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {careTeam.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No assigned doctors or nurses found. Contact reception to link your attending physician.
            </div>
          ) : (
            careTeam.map((c) => {
              const isSelected = activeConversation?.id === c.id;
              const meta = ROLE_METADATA[c.role];
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectClinician(c)}
                  className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                    isSelected ? 'bg-clinical-600 text-white shadow-sm' : 'text-slate-200 hover:bg-slate-800/70'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProfileId(c.id);
                    }}
                    title="Tap to view doctor profile"
                    className="relative cursor-pointer shrink-0"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 font-bold text-xs text-white group-hover:border-clinical-400 transition">
                      {c.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${
                        c.is_online ? 'bg-emerald-500 shadow-sm' : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-semibold">{c.name}</p>
                      {c.unread_count > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
                      <span className="truncate">{c.last_message || c.specialty || meta?.label || c.role}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Chat Window */}
      <div
        className={`${
          mobileShowSidebar ? 'hidden' : 'flex'
        } sm:flex flex-1 flex-col h-full bg-slate-950 relative`}
      >
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileShowSidebar(true)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white sm:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div
                  onClick={() => activeConversation.user_id && setSelectedProfileId(activeConversation.user_id)}
                  className="relative cursor-pointer"
                  title="View clinician profile"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white hover:border-clinical-400 transition">
                    {activeConversation.avatar_text}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                      activeConversation.is_online ? 'bg-emerald-500 shadow-sm' : 'bg-slate-500'
                    }`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{activeConversation.title}</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        activeConversation.is_online ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    />
                    {activeConversation.subtitle}
                  </p>
                </div>
              </div>

              {activeConversation.user_id && (
                <button
                  onClick={() => setSelectedProfileId(activeConversation.user_id!)}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition shadow-xs flex items-center gap-1.5"
                >
                  <User className="h-3.5 w-3.5 text-clinical-400" />
                  View Profile
                </button>
              )}
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-clinical-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 border border-slate-700/60 text-clinical-400 shadow-sm">
                    <MessageSquare className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">Start Consultation Chat</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Message your clinician directly for medical questions, prescription inquiries, or recovery updates.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const isDeleted = msg.is_deleted;

                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                      <div
                        className={`max-w-[80%] sm:max-w-md rounded-2xl p-3 shadow-md relative transition ${
                          isMe
                            ? 'bg-clinical-600 text-white rounded-br-xs'
                            : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
                        }`}
                      >
                        {/* Header if clinician */}
                        {!isMe && (
                          <div className="flex items-center justify-between gap-2 pb-1 text-[11px] font-semibold text-clinical-300">
                            <span>{msg.sender_name}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{msg.sender_role}</span>
                          </div>
                        )}

                        {/* Attachment Display */}
                        {msg.attachment_url && !isDeleted && (
                          <div className="mb-2">
                            {msg.attachment_type === 'image' ? (
                              <img
                                src={msg.attachment_url}
                                alt={msg.attachment_name || 'Attachment'}
                                onClick={() =>
                                  setLightboxImage({
                                    url: msg.attachment_url!,
                                    title: msg.attachment_name || 'Attached Image',
                                  })
                                }
                                className="max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-90 transition border border-black/20"
                              />
                            ) : (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2.5 rounded-xl bg-black/20 p-2.5 text-xs hover:bg-black/30 transition"
                              >
                                <FileText className="h-5 w-5 text-amber-400 shrink-0" />
                                <div className="min-w-0 flex-1 truncate">
                                  <p className="font-medium truncate">{msg.attachment_name || 'Document'}</p>
                                  {msg.attachment_size && (
                                    <p className="text-[10px] text-slate-300">
                                      {(msg.attachment_size / 1024).toFixed(1)} KB
                                    </p>
                                  )}
                                </div>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Content */}
                        <p
                          className={`text-xs whitespace-pre-wrap break-words leading-relaxed ${
                            isDeleted ? 'italic text-slate-400' : ''
                          }`}
                        >
                          {msg.content}
                        </p>

                        {/* Footer (time, edited, status ticks) */}
                        <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-300/80">
                          {msg.is_edited && !isDeleted && <span>(edited)</span>}
                          <span>
                            {msg.created_at
                              ? new Date(msg.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                          {isMe && !isDeleted && (
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-300 inline" />
                          )}
                        </div>

                        {/* Action buttons (hover) for user's own messages */}
                        {isMe && !isDeleted && (
                          <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1 bg-slate-900/80 backdrop-blur-xs rounded-lg px-1.5 py-0.5 shadow-sm border border-slate-700/80">
                            <button
                              onClick={() => {
                                setEditingMessage(msg);
                                setEditContent(msg.content);
                              }}
                              title="Edit message"
                              className="text-slate-300 hover:text-white p-0.5"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Delete message"
                              className="text-rose-400 hover:text-rose-300 p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingText && (
              <div className="px-4 py-1 text-xs text-clinical-400 italic bg-slate-900/60 border-t border-slate-800">
                {typingText}
              </div>
            )}

            {/* Edit Mode Banner */}
            {editingMessage && (
              <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-4 py-2 text-xs">
                <div className="flex items-center gap-2 text-amber-400">
                  <Pencil className="h-4 w-4" />
                  <span>Editing message:</span>
                  <span className="truncate max-w-xs text-slate-300 italic">{editingMessage.content}</span>
                </div>
                <button
                  onClick={() => {
                    setEditingMessage(null);
                    setEditContent('');
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="border-t border-slate-800 bg-slate-900 p-3 relative">
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-4 z-20 flex gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-2 shadow-2xl">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        if (editingMessage) setEditContent((prev) => prev + emoji);
                        else setMessageInput((prev) => prev + emoji);
                      }}
                      className="rounded-lg p-1 text-base hover:bg-slate-700 transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="Emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50 transition"
                  title="Attach symptom photo or document"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-clinical-400" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>

                <input
                  type="text"
                  value={editingMessage ? editContent : messageInput}
                  onChange={(e) => {
                    if (editingMessage) setEditContent(e.target.value);
                    else setMessageInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (editingMessage) handleSaveEdit();
                      else handleSendMessage();
                    }
                  }}
                  placeholder={
                    editingMessage
                      ? 'Edit your message...'
                      : 'Type a message to your doctor or nurse (Press Enter)...'
                  }
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
                />

                {editingMessage ? (
                  <button
                    onClick={handleSaveEdit}
                    className="flex h-9 items-center justify-center rounded-xl bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-500 shadow-sm transition"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinical-600 text-white hover:bg-clinical-500 disabled:opacity-50 shadow-sm transition"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-clinical-400">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-sm font-semibold text-white">Select a Clinician to Begin</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Choose your assigned doctor or hospital nurse from the left sidebar to start your consultation.
            </p>
          </div>
        )}
      </div>

      {/* Clinician Profile Drawer */}
      <StaffProfileDrawer
        userId={selectedProfileId}
        isOpen={Boolean(selectedProfileId)}
        onClose={() => setSelectedProfileId(null)}
        onStartDm={(userId) => {
          setSelectedProfileId(null);
          const found = careTeam.find((c) => c.id === userId);
          if (found) handleSelectClinician(found);
        }}
      />

      {/* Lightbox for attachments */}
      <ImageLightboxModal
        imageUrl={lightboxImage?.url || null}
        imageName={lightboxImage?.title || null}
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
