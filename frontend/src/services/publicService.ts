import { api } from '@/lib/api';
import type {
  PatientAppointmentItem,
  PatientBillItemResponse,
  PatientLabEntry,
  PatientPrescriptionItem,
  PatientProfile,
  PatientRecordsResponse,
  PublicAvailabilityResponse,
  PublicDoctor,
} from '@/types/api';

export const publicService = {
  async getDoctors(): Promise<PublicDoctor[]> {
    const { data } = await api.get<PublicDoctor[]>('/public/doctors');
    return data;
  },

  async getAvailability(doctorUserId: number, day: string): Promise<PublicAvailabilityResponse> {
    const { data } = await api.get<PublicAvailabilityResponse>('/public/availability', {
      params: { doctor_user_id: doctorUserId, day },
    });
    return data;
  },

  async bookPublic(payload: {
    name: string;
    email: string;
    password: string;
    age: number;
    gender: string;
    phone: string;
    address?: string;
    doctor_user_id: number;
    appointment_date: string;
    reason: string;
  }) {
    const { data } = await api.post('/public/book', payload);
    return data;
  },

  async bookExisting(payload: {
    doctor_user_id: number;
    appointment_date: string;
    reason: string;
  }) {
    const { data } = await api.post('/public/book-existing', payload);
    return data;
  },

  async getMyAppointments(): Promise<{
    patient: { id: number; name: string; email: string; patient_code: string };
    appointments: PatientAppointmentItem[];
  }> {
    const { data } = await api.get('/public/my-appointments');
    return data;
  },

  async cancelMyAppointment(appointmentId: number) {
    const { data } = await api.patch(`/public/appointments/${appointmentId}/cancel`);
    return data;
  },

  async getMyProfile(): Promise<PatientProfile> {
    const { data } = await api.get<PatientProfile>('/public/my-profile');
    return data;
  },

  async updateMyProfile(payload: {
    name?: string;
    age?: number;
    gender?: string;
    phone?: string;
    address?: string;
    medical_history?: string;
  }) {
    const { data } = await api.put('/public/my-profile', payload);
    return data;
  },

  async getMyPrescriptions(): Promise<PatientPrescriptionItem[]> {
    const { data } = await api.get<PatientPrescriptionItem[]>('/public/my-prescriptions');
    return data;
  },

  async getMyBills(): Promise<PatientBillItemResponse[]> {
    const { data } = await api.get<PatientBillItemResponse[]>('/public/my-bills');
    return data;
  },

  async getMyLabs(): Promise<PatientLabEntry[]> {
    const { data } = await api.get<PatientLabEntry[]>('/public/my-labs');
    return data;
  },

  async getMyRecords(): Promise<PatientRecordsResponse> {
    const { data } = await api.get<PatientRecordsResponse>('/public/my-records');
    return data;
  },
};

