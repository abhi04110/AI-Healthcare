import { ArrowLeft, Info, Hash, Building2, User } from 'lucide-react';
import type { ActiveConversation } from '@/types/chat';
import { ROLE_METADATA } from '@/config/roles';

interface ChatHeaderProps {
  conversation: ActiveConversation;
  onBackToSidebar: () => void;
  onOpenProfile: (userId: number) => void;
}

export function ChatHeader({
  conversation,
  onBackToSidebar,
  onOpenProfile,
}: ChatHeaderProps) {
  const isDm = conversation.type === 'dm' && conversation.user_id;
  const roleMeta = conversation.role ? ROLE_METADATA[conversation.role] : null;

  return (
    <div className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Mobile back */}
        <button
          onClick={onBackToSidebar}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white sm:hidden transition"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Clickable Header Info (opens profile on click) */}
        <div
          onClick={() => {
            if (isDm && conversation.user_id) {
              onOpenProfile(conversation.user_id);
            }
          }}
          className={`flex items-center gap-3 ${
            isDm ? 'cursor-pointer group' : ''
          }`}
          title={isDm ? 'Tap to view verified profile' : undefined}
        >
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 font-bold text-xs text-white group-hover:border-clinical-400 transition">
              {conversation.type === 'hospital' ? (
                <Hash className="h-5 w-5 text-indigo-400" />
              ) : conversation.type === 'department' ? (
                <Building2 className="h-5 w-5 text-clinical-400" />
              ) : (
                <User className="h-5 w-5 text-teal-400" />
              )}
            </div>
            {isDm && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                  conversation.is_online ? 'bg-emerald-500 shadow-sm' : 'bg-slate-500'
                }`}
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white group-hover:text-clinical-300 transition">
                {conversation.title}
              </h2>
              {roleMeta && (
                <span className="rounded-md bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                  {roleMeta.label}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              {isDm ? (
                <>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      conversation.is_online ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                  <span>{conversation.is_online ? 'Online' : 'Offline'}</span>
                  <span className="text-slate-400">• Tap to view profile</span>
                </>
              ) : (
                <span>{conversation.subtitle}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isDm && (
          <button
            onClick={() => {
              if (conversation.user_id) onOpenProfile(conversation.user_id);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <Info className="h-4 w-4 text-clinical-400" />
            <span className="hidden sm:inline">Profile</span>
          </button>
        )}
      </div>
    </div>
  );
}
