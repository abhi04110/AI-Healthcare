import { useState, useMemo } from 'react';
import {
  Search,
  Hash,
  Activity,
  Building2,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  ActiveConversation,
  AssignedPatientChat,
  DepartmentChannel,
  HospitalChannel,
  StaffMember,
} from '@/types/chat';
import { ROLE_METADATA } from '@/config/roles';

interface ChatSidebarProps {
  hospitalChannel: HospitalChannel | null;
  departments: DepartmentChannel[];
  staff: StaffMember[];
  patients?: AssignedPatientChat[];
  activeConversation: ActiveConversation | null;
  onSelectConversation: (conv: ActiveConversation) => void;
  onOpenProfile: (userId: number) => void;
  audioMuted: boolean;
  onToggleMute: () => void;
}

export function ChatSidebar({
  hospitalChannel,
  departments,
  staff,
  patients = [],
  activeConversation,
  onSelectConversation,
  onOpenProfile,
  audioMuted,
  onToggleMute,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'departments' | 'staff' | 'patients'>('all');

  const filteredDepartments = useMemo(() => {
    if (filterTab === 'staff' || filterTab === 'patients') return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)),
    );
  }, [departments, searchQuery, filterTab]);

  const filteredStaff = useMemo(() => {
    if (filterTab === 'departments' || filterTab === 'patients') return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.designation && s.designation.toLowerCase().includes(q)) ||
        (s.employee_code && s.employee_code.toLowerCase().includes(q)),
    );
  }, [staff, searchQuery, filterTab]);

  const filteredPatients = useMemo(() => {
    if (!patients || filterTab === 'departments' || filterTab === 'staff') return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.patient_code.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q)),
    );
  }, [patients, searchQuery, filterTab]);

  const showHospital =
    hospitalChannel &&
    (filterTab === 'all' || filterTab === 'departments') &&
    (!searchQuery || hospitalChannel.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalUnread =
    (hospitalChannel?.unread_count || 0) +
    departments.reduce((sum, d) => sum + d.unread_count, 0) +
    staff.reduce((sum, s) => sum + s.unread_count, 0) +
    patients.reduce((sum, p) => sum + p.unread_count, 0);

  return (
    <div className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/95 text-slate-100 sm:w-80 md:w-96">
      {/* Top Workspace Header */}
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinical-600 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Hospital Connect
                <span className="rounded-md bg-clinical-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-clinical-300">
                  Live
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Care Team & Patient Communications</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleMute}
              title={audioMuted ? 'Unmute notification chime' : 'Mute notification chime'}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>
            {totalUnread > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                <Bell className="h-3 w-3" />
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, doctors, patients..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-3 flex gap-1 rounded-xl bg-slate-800/60 p-1 text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 rounded-lg py-1 font-medium transition ${
              filterTab === 'all'
                ? 'bg-clinical-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab('departments')}
            className={`flex-1 rounded-lg py-1 font-medium transition ${
              filterTab === 'departments'
                ? 'bg-clinical-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setFilterTab('staff')}
            className={`flex-1 rounded-lg py-1 font-medium transition ${
              filterTab === 'staff'
                ? 'bg-clinical-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Staff ({staff.length})
          </button>
          {patients.length > 0 && (
            <button
              onClick={() => setFilterTab('patients')}
              className={`flex-1 rounded-lg py-1 font-medium transition ${
                filterTab === 'patients'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Patients ({patients.length})
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {/* Hospital Broad channel */}
        {showHospital && (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Hospital Announcements
            </p>
            <button
              onClick={() =>
                onSelectConversation({
                  type: 'hospital',
                  id: 'hospital',
                  title: hospitalChannel.name,
                  subtitle: 'Hospital-wide Staff Broadcast',
                  avatar_text: 'ALL',
                })
              }
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                activeConversation?.type === 'hospital'
                  ? 'bg-clinical-600/90 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-clinical-600 text-white font-bold text-xs shadow">
                <Hash className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-semibold">{hospitalChannel.name}</p>
                  {hospitalChannel.unread_count > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                      {hospitalChannel.unread_count}
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-slate-400">General hospital updates & alerts</p>
              </div>
            </button>
          </div>
        )}

        {/* Department Channels */}
        {filteredDepartments.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Department Stations</span>
              <span className="text-[10px] font-mono text-slate-400">{filteredDepartments.length}</span>
            </p>
            {filteredDepartments.map((dept) => {
              const isSelected =
                activeConversation?.type === 'department' && activeConversation.id === dept.id;

              return (
                <button
                  key={dept.id}
                  onClick={() =>
                    onSelectConversation({
                      type: 'department',
                      id: dept.id,
                      title: `#${dept.name}`,
                      subtitle: `Department Code: ${dept.code}`,
                      department_name: dept.name,
                      department_id: dept.id,
                      avatar_text: dept.code.slice(0, 3).toUpperCase(),
                    })
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isSelected
                      ? 'bg-clinical-600 text-white shadow-sm'
                      : 'text-slate-200 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/80 text-clinical-400 font-bold text-xs">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-semibold">#{dept.name}</p>
                      {dept.unread_count > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                          {dept.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-slate-400">
                      {dept.last_message || `Code: ${dept.code}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Staff Direct Messages */}
        {filteredStaff.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Hospital Staff & Clinicians</span>
              <span className="text-[10px] font-mono text-slate-400">{filteredStaff.length}</span>
            </p>
            {filteredStaff.map((colleague) => {
              const isSelected =
                activeConversation?.type === 'dm' && activeConversation.id === colleague.id;
              const meta = ROLE_METADATA[colleague.role];

              return (
                <div
                  key={colleague.id}
                  onClick={() =>
                    onSelectConversation({
                      type: 'dm',
                      id: colleague.id,
                      title: colleague.name,
                      subtitle: `${meta?.label || colleague.role} • ${
                        colleague.is_online ? 'Online' : 'Offline'
                      }`,
                      role: colleague.role,
                      is_online: colleague.is_online,
                      user_id: colleague.id,
                      avatar_text: colleague.name.slice(0, 2).toUpperCase(),
                    })
                  }
                  className={`group flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${
                    isSelected
                      ? 'bg-clinical-600 text-white shadow-sm'
                      : 'text-slate-200 hover:bg-slate-800/70'
                  }`}
                >
                  {/* Clickable Avatar to view profile */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(colleague.id);
                    }}
                    title="Tap to view staff profile"
                    className="relative cursor-pointer shrink-0"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 font-bold text-xs text-white group-hover:border-clinical-400 transition">
                      {colleague.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                        colleague.is_online ? 'bg-emerald-500 shadow-sm' : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  {/* Conversation info */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-semibold">{colleague.name}</p>
                      {colleague.unread_count > 0 &&
                        !colleague.last_message?.includes('deleted') && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                            {colleague.unread_count}
                          </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
                      <span className="truncate">
                        {colleague.last_message || meta?.label || colleague.role}
                      </span>
                      {colleague.employee_code && (
                        <span className="shrink-0 font-mono text-[9px] text-slate-400">
                          {colleague.employee_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assigned Patients Consultations */}
        {filteredPatients.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>Patient Consultations</span>
              <span className="text-[10px] font-mono text-emerald-400">{filteredPatients.length}</span>
            </p>
            {filteredPatients.map((pat) => {
              const isSelected =
                activeConversation?.type === 'dm' && activeConversation.id === pat.id;

              return (
                <div
                  key={pat.id}
                  onClick={() =>
                    onSelectConversation({
                      type: 'dm',
                      id: pat.id,
                      title: pat.name,
                      subtitle: `Patient (${pat.patient_code}) • ${
                        pat.is_online ? 'Online' : 'Offline'
                      }`,
                      role: 'patient',
                      is_online: pat.is_online,
                      user_id: pat.id,
                      avatar_text: pat.name.slice(0, 2).toUpperCase(),
                    })
                  }
                  className={`group flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${
                    isSelected
                      ? 'bg-clinical-600 text-white shadow-sm'
                      : 'text-slate-200 hover:bg-slate-800/70'
                  }`}
                >
                  {/* Clickable Avatar to view patient card */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(pat.id);
                    }}
                    title="Tap to view patient medical card"
                    className="relative cursor-pointer shrink-0"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/80 border border-emerald-600/50 font-bold text-xs text-emerald-300 group-hover:border-emerald-400 transition">
                      {pat.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                        pat.is_online ? 'bg-emerald-500 shadow-sm' : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  {/* Conversation click */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-semibold text-emerald-100">{pat.name}</p>
                      {pat.unread_count > 0 &&
                        !pat.last_message?.includes('deleted') && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                            {pat.unread_count}
                          </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
                      <span className="truncate">
                        {pat.last_message || 'Active Patient Chat'}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-emerald-400">
                        {pat.patient_code}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredDepartments.length === 0 &&
          filteredStaff.length === 0 &&
          filteredPatients.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No conversations match &quot;{searchQuery}&quot;
            </div>
          )}
      </div>
    </div>
  );
}
