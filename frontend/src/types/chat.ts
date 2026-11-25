import type { UserRole } from './api';

export type ChannelType = 'hospital' | 'department' | 'dm';

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: UserRole;
  channel_type: ChannelType;
  department_id?: number | null;
  recipient_id?: number | null;
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: 'image' | 'document' | string | null;
  attachment_size?: number | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentChannel {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  unread_count: number;
  last_message?: string | null;
  last_message_time?: string | null;
}

export interface HospitalChannel {
  id: string; // 'hospital'
  name: string;
  code: string;
  unread_count: number;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department_id?: number | null;
  designation?: string | null;
  specialty?: string | null;
  employee_code?: string | null;
  is_online: boolean;
  unread_count: number;
  last_message?: string | null;
  last_message_time?: string | null;
}

export interface AssignedPatientChat {
  id: number; // User ID (for DM recipient_id)
  patient_id: number;
  patient_code: string;
  name: string;
  email: string;
  role: 'patient';
  gender?: string | null;
  age?: number | null;
  phone?: string | null;
  is_online: boolean;
  unread_count: number;
  last_message?: string | null;
  last_message_time?: string | null;
}

export interface StaffWorkspaceData {
  hospital_channel?: HospitalChannel | null;
  departments: DepartmentChannel[];
  staff: StaffMember[];
  patients?: AssignedPatientChat[];
  online_user_ids: number[];
}

export interface PatientProfileData {
  patient_id?: number | null;
  patient_code: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  medical_history?: string | null;
}

export interface StaffProfileDetail {
  id: number;
  name: string;
  email: string;
  role: UserRole | 'patient';
  is_online: boolean;
  created_at?: string | null;
  staff_profile?: {
    employee_code: string;
    designation: string;
    qualification: string;
    specialty: string;
    shift_start: string;
    shift_end: string;
    is_active: boolean;
    department_id?: number | null;
    department_name: string;
    department_code: string;
  };
  patient_profile?: PatientProfileData;
}

export interface ActiveConversation {
  type: ChannelType;
  id: string | number; // 'hospital', department_id (number), or recipient staff_id (number)
  title: string;
  subtitle: string;
  role?: UserRole;
  is_online?: boolean;
  department_name?: string;
  department_id?: number;
  avatar_text: string;
  user_id?: number; // for DM target staff member
}

export type WebSocketEvent =
  | { type: 'new_message'; message: ChatMessage }
  | { type: 'message_edited'; message: ChatMessage }
  | { type: 'message_deleted'; message: ChatMessage }
  | { type: 'user_status'; user_id: number; status: 'online' | 'offline' }
  | { type: 'typing'; user_id: number; user_name: string; channel_key: string }
  | { type: 'pong' };
