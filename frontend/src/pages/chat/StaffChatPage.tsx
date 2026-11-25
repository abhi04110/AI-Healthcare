import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ROLE_METADATA } from '@/config/roles';
import { chatService } from '@/services/chatService';
import type {
  ActiveConversation,
  ChatMessage,
  StaffWorkspaceData,
  WebSocketEvent,
} from '@/types/chat';

import { ChatSidebar } from './components/ChatSidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageFeed } from './components/ChatMessageFeed';
import { ChatInputBar } from './components/ChatInputBar';
import { StaffProfileDrawer } from './components/StaffProfileDrawer';
import { ImageLightboxModal } from './components/ImageLightboxModal';

const READ_CHANNELS_STORAGE_KEY = 'medcore_read_chat_channels';

function getLocallyReadChannels(userId?: number): Set<string> {
  try {
    const key = userId ? `medcore_read_chat_channels_${userId}` : READ_CHANNELS_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveLocallyReadChannel(channelKey: string, userId?: number): void {
  try {
    const key = userId ? `medcore_read_chat_channels_${userId}` : READ_CHANNELS_STORAGE_KEY;
    const set = getLocallyReadChannels(userId);
    set.add(channelKey);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
}

function removeLocallyReadChannel(channelKey: string, userId?: number): void {
  try {
    const key = userId ? `medcore_read_chat_channels_${userId}` : READ_CHANNELS_STORAGE_KEY;
    const set = getLocallyReadChannels(userId);
    set.delete(channelKey);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
}

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // Ignore audio restriction errors
  }
}

export function StaffChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<StaffWorkspaceData | null>(null);
  const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile Drawer
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

  // Audio mute state
  const [audioMuted, setAudioMuted] = useState(() => {
    return localStorage.getItem('medcore_chat_muted') === 'true';
  });

  // Mobile sidebar visibility
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);

  // Typing state
  const [typingText, setTypingText] = useState<string | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Ref to track activeConversation without triggering useCallback/useEffect recreations
  const activeConversationRef = useRef<ActiveConversation | null>(null);
  activeConversationRef.current = activeConversation;

  const toggleMute = () => {
    setAudioMuted((prev) => {
      const next = !prev;
      localStorage.setItem('medcore_chat_muted', String(next));
      return next;
    });
  };

  const currentRoleMeta = user ? ROLE_METADATA[user.role] : null;

  // 1. Load Workspace (Only on mount)
  const loadWorkspace = useCallback(async () => {
    try {
      setError(null);
      const data = await chatService.getWorkspace();

      const locallyRead = getLocallyReadChannels(user?.id);
      const currentActive = activeConversationRef.current;

      const sanitizedStaff = data.staff.map((s) => {
        const ckey = `dm_${s.id}`;
        const isCurrent = currentActive?.type === 'dm' && Number(currentActive.id) === s.id;
        const isDeletedMsg = Boolean(s.last_message && s.last_message.includes('deleted'));
        const isRead = isCurrent || locallyRead.has(ckey) || isDeletedMsg;
        return isRead ? { ...s, unread_count: 0 } : s;
      });

      const sanitizedDepts = data.departments.map((d) => {
        const ckey = `dept_${d.id}`;
        const isCurrent =
          currentActive?.type === 'department' && Number(currentActive.id) === d.id;
        const isRead = isCurrent || locallyRead.has(ckey);
        return isRead ? { ...d, unread_count: 0 } : d;
      });

      const isHospitalRead =
        (currentActive?.type === 'hospital' && currentActive.id === 'hospital') ||
        locallyRead.has('hospital');

      const sanitizedWorkspace: StaffWorkspaceData = {
        ...data,
        hospital_channel: data.hospital_channel
          ? {
              ...data.hospital_channel,
              unread_count: isHospitalRead ? 0 : data.hospital_channel.unread_count,
            }
          : null,
        departments: sanitizedDepts,
        staff: sanitizedStaff,
      };

      setWorkspace(sanitizedWorkspace);

      // Default active conversation to hospital broadcast channel if not already selected
      if (!currentActive && data.hospital_channel) {
        const defaultConv: ActiveConversation = {
          type: 'hospital',
          id: 'hospital',
          title: data.hospital_channel.name,
          subtitle: 'Hospital-wide Staff Broadcast & Comms',
          avatar_text: 'ALL',
        };
        setActiveConversation(defaultConv);
        saveLocallyReadChannel('hospital');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load hospital workspace data.');
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // 2. Load Messages when Active Conversation changes
  const loadMessages = useCallback(async (conv: ActiveConversation) => {
    setLoadingMessages(true);
    try {
      const history = await chatService.getMessages({
        channel_type: conv.type,
        department_id: conv.type === 'department' ? Number(conv.id) : undefined,
        recipient_id: conv.type === 'dm' ? Number(conv.id) : undefined,
      });
      setMessages(history);

      const channelKey =
        conv.type === 'hospital'
          ? 'hospital'
          : conv.type === 'department'
          ? `dept_${conv.id}`
          : `dm_${conv.id}`;

      saveLocallyReadChannel(channelKey, user?.id);

      // Mark read in DB
      const lastMsgId = history.length > 0 ? history[history.length - 1].id : 999999999;
      chatService.markAsRead(channelKey, lastMsgId).catch(() => {});

      // Ensure local state clears unread count immediately
      setWorkspace((prev) => {
        if (!prev) return prev;
        if (conv.type === 'hospital') {
          return {
            ...prev,
            hospital_channel: prev.hospital_channel
              ? { ...prev.hospital_channel, unread_count: 0 }
              : null,
          };
        }
        if (conv.type === 'department') {
          return {
            ...prev,
            departments: prev.departments.map((d) =>
              d.id === Number(conv.id) ? { ...d, unread_count: 0 } : d,
            ),
          };
        }
        if (conv.type === 'dm') {
          return {
            ...prev,
            staff: prev.staff.map((s) =>
              s.id === Number(conv.id) ? { ...s, unread_count: 0 } : s,
            ),
            patients: (prev.patients || []).map((p) =>
              p.id === Number(conv.id) ? { ...p, unread_count: 0 } : p,
            ),
          };
        }
        return prev;
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

  // 3. Setup WebSocket Listener
  useEffect(() => {
    const handleWsEvent = (event: WebSocketEvent) => {
      if (event.type === 'new_message') {
        const incoming = event.message;
        const currentActive = activeConversationRef.current;

        // Check if message belongs to current active conversation
        const isCurrentConv =
          currentActive &&
          ((currentActive.type === 'hospital' && incoming.channel_type === 'hospital') ||
            (currentActive.type === 'department' &&
              incoming.channel_type === 'department' &&
              incoming.department_id === Number(currentActive.id)) ||
            (currentActive.type === 'dm' &&
              incoming.channel_type === 'dm' &&
              (incoming.sender_id === Number(currentActive.id) ||
                incoming.recipient_id === Number(currentActive.id))));

        const isFromMe = incoming.sender_id === user?.id;

        if (isCurrentConv) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });

          // Auto mark read if active
          const channelKey =
            incoming.channel_type === 'hospital'
              ? 'hospital'
              : incoming.channel_type === 'department'
              ? `dept_${incoming.department_id}`
              : `dm_${isFromMe ? incoming.recipient_id : incoming.sender_id}`;

          saveLocallyReadChannel(channelKey);
          chatService.markAsRead(channelKey, incoming.id);

          setWorkspace((prev) => {
            if (!prev) return prev;
            if (incoming.channel_type === 'hospital') {
              return {
                ...prev,
                hospital_channel: prev.hospital_channel
                  ? { ...prev.hospital_channel, unread_count: 0 }
                  : null,
              };
            }
            if (incoming.channel_type === 'department') {
              return {
                ...prev,
                departments: prev.departments.map((d) =>
                  d.id === incoming.department_id
                    ? { ...d, unread_count: 0, last_message: incoming.content }
                    : d,
                ),
              };
            }
            if (incoming.channel_type === 'dm') {
              const otherStaffId = isFromMe ? incoming.recipient_id : incoming.sender_id;
              return {
                ...prev,
                staff: prev.staff.map((s) =>
                  s.id === otherStaffId
                    ? { ...s, unread_count: 0, last_message: incoming.content }
                    : s,
                ),
                patients: (prev.patients || []).map((p) =>
                  p.id === otherStaffId
                    ? { ...p, unread_count: 0, last_message: incoming.content }
                    : p,
                ),
              };
            }
            return prev;
          });
        } else {
          // Message not in currently active conversation
          setWorkspace((prev) => {
            if (!prev) return prev;
            if (incoming.channel_type === 'hospital') {
              return {
                ...prev,
                hospital_channel: prev.hospital_channel
                  ? {
                      ...prev.hospital_channel,
                      unread_count: isFromMe
                        ? prev.hospital_channel.unread_count
                        : prev.hospital_channel.unread_count + 1,
                    }
                  : null,
              };
            }
            if (incoming.channel_type === 'department') {
              if (!isFromMe) {
                removeLocallyReadChannel(`dept_${incoming.department_id}`);
              }
              return {
                ...prev,
                departments: prev.departments.map((d) =>
                  d.id === incoming.department_id
                    ? {
                        ...d,
                        unread_count: isFromMe ? d.unread_count : d.unread_count + 1,
                        last_message: incoming.content,
                      }
                    : d,
                ),
              };
            }
            if (incoming.channel_type === 'dm') {
              const otherStaffId = isFromMe ? incoming.recipient_id : incoming.sender_id;
              if (!isFromMe) {
                removeLocallyReadChannel(`dm_${otherStaffId}`);
              }
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
                patients: (prev.patients || []).map((p) =>
                  p.id === otherStaffId
                    ? {
                        ...p,
                        unread_count: isFromMe ? p.unread_count : p.unread_count + 1,
                        last_message: incoming.content,
                      }
                    : p,
                ),
              };
            }
            return prev;
          });

          // Play sound and show toast only if sent by someone else
          if (!isFromMe) {
            if (!audioMuted) playNotificationChime();
            toast.info(incoming.sender_name, incoming.content.slice(0, 45));
          }
        }
      } else if (event.type === 'message_edited') {
        const updated = event.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
        );
      } else if (event.type === 'message_deleted') {
        const deleted = event.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === deleted.id ? { ...m, ...deleted } : m)),
        );
        // Also update snippet preview in workspace and clear unread count for deleted thread
        setWorkspace((prev) => {
          if (!prev) return prev;
          if (deleted.channel_type === 'dm') {
            return {
              ...prev,
              staff: prev.staff.map((s) =>
                s.id === deleted.sender_id || s.id === deleted.recipient_id
                  ? { ...s, last_message: deleted.content, unread_count: 0 }
                  : s,
              ),
              patients: (prev.patients || []).map((p) =>
                p.id === deleted.sender_id || p.id === deleted.recipient_id
                  ? { ...p, last_message: deleted.content, unread_count: 0 }
                  : p,
              ),
            };
          }
          if (deleted.channel_type === 'department') {
            return {
              ...prev,
              departments: prev.departments.map((d) =>
                d.id === deleted.department_id ? { ...d, last_message: deleted.content } : d,
              ),
            };
          }
          return prev;
        });
      } else if (event.type === 'user_status') {
        setWorkspace((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            staff: prev.staff.map((s) =>
              s.id === event.user_id ? { ...s, is_online: event.status === 'online' } : s,
            ),
            patients: (prev.patients || []).map((p) =>
              p.id === event.user_id ? { ...p, is_online: event.status === 'online' } : p,
            ),
          };
        });
      } else if (event.type === 'typing') {
        if (event.user_id !== user?.id) {
          setTypingText(`${event.user_name} is typing...`);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = window.setTimeout(() => {
            setTypingText(null);
          }, 3000);
        }
      }
    };

    const unsubscribe = chatService.subscribeToEvents(handleWsEvent);
    return () => {
      unsubscribe();
    };
  }, [user?.id, audioMuted, toast]);

  // Handle Send Message
  const handleSendMessage = async (
    content: string,
    attachment?: { url: string; name: string; type: string; size: number } | null,
  ) => {
    if (!activeConversation) return;

    await chatService.sendMessage({
      channel_type: activeConversation.type,
      content,
      department_id:
        activeConversation.type === 'department'
          ? Number(activeConversation.id)
          : undefined,
      recipient_id:
        activeConversation.type === 'dm'
          ? Number(activeConversation.id)
          : undefined,
      attachment_url: attachment?.url,
      attachment_name: attachment?.name,
      attachment_type: attachment?.type,
      attachment_size: attachment?.size,
    });

    if (activeConversation.type === 'dm') {
      const channelKey = `dm_${activeConversation.id}`;
      saveLocallyReadChannel(channelKey, user?.id);
      chatService.markAsRead(channelKey, 999999999).catch(() => {});
      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          staff: prev.staff.map((s) =>
            s.id === Number(activeConversation.id) ? { ...s, unread_count: 0 } : s,
          ),
        };
      });
    }
  };

  // Handle Edit Message
  const handleEditMessage = async (messageId: number, newContent: string) => {
    await chatService.editMessage(messageId, newContent);
  };

  // Handle Delete Message
  const handleDeleteMessage = async (messageId: number) => {
    await chatService.deleteMessage(messageId);
  };

  // Handle Profile Drawer open
  const handleOpenProfile = (userId: number) => {
    setProfileUserId(userId);
    setIsProfileOpen(true);
  };

  // Start DM from profile drawer
  const handleStartDm = (targetUserId: number, targetName: string) => {
    const colleague = workspace?.staff.find((s) => s.id === targetUserId);
    const newConv: ActiveConversation = {
      type: 'dm',
      id: targetUserId,
      title: targetName,
      subtitle: `${colleague?.role || 'Staff'} • ${colleague?.is_online ? 'Online' : 'Offline'}`,
      role: colleague?.role,
      is_online: colleague?.is_online,
      user_id: targetUserId,
      avatar_text: targetName.slice(0, 2).toUpperCase(),
    };
    handleSelectConversation(newConv);
  };

  // Handle select conversation from sidebar
  const handleSelectConversation = (conv: ActiveConversation) => {
    setActiveConversation(conv);
    setMobileShowSidebar(false);

    const channelKey =
      conv.type === 'hospital'
        ? 'hospital'
        : conv.type === 'department'
        ? `dept_${conv.id}`
        : `dm_${conv.id}`;
    saveLocallyReadChannel(channelKey, user?.id);
    chatService.markAsRead(channelKey, 999999999).catch(() => {});

    // Clear unread in local state immediately
    setWorkspace((prev) => {
      if (!prev) return prev;
      if (conv.type === 'hospital') {
        return {
          ...prev,
          hospital_channel: prev.hospital_channel
            ? { ...prev.hospital_channel, unread_count: 0 }
            : null,
        };
      }
      if (conv.type === 'department') {
        return {
          ...prev,
          departments: prev.departments.map((d) =>
            d.id === Number(conv.id) ? { ...d, unread_count: 0 } : d,
          ),
        };
      }
      if (conv.type === 'dm') {
        return {
          ...prev,
          staff: prev.staff.map((s) =>
            s.id === Number(conv.id) ? { ...s, unread_count: 0 } : s,
          ),
        };
      }
      return prev;
    });
  };

  const handleTyping = () => {
    if (!activeConversation) return;
    const channelKey =
      activeConversation.type === 'hospital'
        ? 'hospital'
        : activeConversation.type === 'department'
        ? `dept_${activeConversation.id}`
        : `dm_${activeConversation.id}`;
    const recipientId =
      activeConversation.type === 'dm' ? Number(activeConversation.id) : undefined;
    chatService.sendTyping(channelKey, recipientId);
  };

  if (loadingWorkspace) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-clinical-400" />
        <p className="text-sm font-semibold">Connecting to MedCore Staff Workspace...</p>
        <p className="text-xs text-slate-400">Loading department channels & online staff</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
        <h2 className="text-base font-bold text-white mb-1">Access Restricted or Connection Failed</h2>
        <p className="text-sm text-slate-400 max-w-md mb-4">{error}</p>
        <button
          onClick={() => navigate(currentRoleMeta?.homePath || '/')}
          className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-500 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Universal Hospital Bar */}
      <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(currentRoleMeta?.homePath || '/')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {currentRoleMeta?.label || 'Portal'}</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Hospital Staff Comms Workspace</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-medium text-slate-300">{user?.name}</span>
          <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Main WhatsApp-style 2-Column Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Channels + DMs) */}
        <div
          className={`${
            mobileShowSidebar ? 'flex' : 'hidden'
          } sm:flex h-full w-full sm:w-80 md:w-96 shrink-0`}
        >
          <ChatSidebar
            hospitalChannel={workspace?.hospital_channel || null}
            departments={workspace?.departments || []}
            staff={workspace?.staff || []}
            patients={workspace?.patients || []}
            activeConversation={activeConversation}
            onSelectConversation={handleSelectConversation}
            onOpenProfile={handleOpenProfile}
            audioMuted={audioMuted}
            onToggleMute={toggleMute}
          />
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
              <ChatHeader
                conversation={activeConversation}
                onBackToSidebar={() => setMobileShowSidebar(true)}
                onOpenProfile={handleOpenProfile}
              />

              {/* Message Feed */}
              {loadingMessages ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-clinical-400" />
                </div>
              ) : (
                <ChatMessageFeed
                  messages={messages}
                  currentUserId={user?.id || 0}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onOpenProfile={handleOpenProfile}
                  onPreviewImage={(url, name) => setLightbox({ url, name })}
                  typingText={typingText}
                />
              )}

              {/* Input Bar */}
              <ChatInputBar
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                disabled={loadingMessages}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-slate-400">
              <MessageSquare className="h-12 w-12 text-slate-600 mb-2" />
              <h3 className="text-base font-semibold text-white">Select a channel or colleague</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Choose a department channel or select a doctor, nurse, or staff member from the left list to begin chatting.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Staff Profile Slide-over Drawer */}
      <StaffProfileDrawer
        userId={profileUserId}
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setProfileUserId(null);
        }}
        onStartDm={handleStartDm}
      />

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={Boolean(lightbox)}
        imageUrl={lightbox?.url || null}
        imageName={lightbox?.name || null}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
