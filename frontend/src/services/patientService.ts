import { api, toFormBody } from '@/lib/api';
import type {
  CreateHealthRecordFromOcrResponse,
  HealthRecordResponse,
  MedicalReportResponse,
  OcrValuesResponse,
  PatientResponse,
  PatientTimelineResponse,
} from '@/types/api';

export const patientService = {
  async createPatient(payload: {
    patient_code?: string;
    name: string;
    age: number;
    gender: string;
    phone?: string;
    address?: string;
    medical_history?: string;
  }): Promise<PatientResponse> {
    const { data } = await api.post<PatientResponse>('/patients', toFormBody(payload));
    return data;
  },

  async listPatients(): Promise<PatientResponse[]> {
    const { data } = await api.get<PatientResponse[]>('/patients');
    return data;
  },

  async getPatient(patientId: number): Promise<PatientResponse> {
    const { data } = await api.get<PatientResponse>(`/patients/${patientId}`);
    return data;
  },

  async updatePatient(
    patientId: number,
    payload: {
      name?: string;
      age?: number;
      gender?: string;
      phone?: string;
      address?: string;
      medical_history?: string;
    },
  ): Promise<PatientResponse> {
    const { data } = await api.put<PatientResponse>(`/patients/${patientId}`, toFormBody(payload));
    return data;
  },

  async deletePatient(patientId: number) {
    const { data } = await api.delete(`/patients/${patientId}`);
    return data;
  },

  async createHealthRecord(
    patientId: number,
    payload: {
      glucose?: number;
      blood_pressure?: number;
      bmi?: number;
      cholesterol?: number;
      heart_rate?: number;
    },
  ): Promise<HealthRecordResponse> {
    const { data } = await api.post<HealthRecordResponse>(
      `/patients/${patientId}/health-records`,
      toFormBody(payload),
    );
    return data;
  },

  async getHealthRecords(patientId: number): Promise<HealthRecordResponse[]> {
    const { data } = await api.get<HealthRecordResponse[]>(`/patients/${patientId}/health-records`);
    return data;
  },

  async updateLatestHealthRecord(
    patientId: number,
    payload: {
      glucose?: number;
      blood_pressure?: number;
      bmi?: number;
      cholesterol?: number;
      heart_rate?: number;
    },
  ): Promise<HealthRecordResponse> {
    const { data } = await api.put<HealthRecordResponse>(
      `/patients/${patientId}/health-records`,
      toFormBody(payload),
    );
    return data;
  },

  async deleteLatestHealthRecord(patientId: number) {
    const { data } = await api.delete(`/patients/${patientId}/health-records`);
    return data;
  },

  async getTimeline(patientId: number): Promise<PatientTimelineResponse> {
    const { data } = await api.get<PatientTimelineResponse>(`/patients/${patientId}/timeline`);
    return data;
  },

  async uploadReport(patientId: number, file: File): Promise<MedicalReportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<MedicalReportResponse>(`/reports/${patientId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getReports(patientId: number): Promise<MedicalReportResponse[]> {
    const { data } = await api.get<MedicalReportResponse[]>(`/reports/${patientId}`);
    return data;
  },

  async deleteLatestReport(patientId: number) {
    const { data } = await api.delete(`/reports/${patientId}/latest`);
    return data;
  },

  async extractOcrValues(patientId: number): Promise<OcrValuesResponse> {
    const { data } = await api.get<OcrValuesResponse>(`/ocr/patient/${patientId}/values`);
    return data;
  },

  async createHealthRecordFromOcr(patientId: number): Promise<CreateHealthRecordFromOcrResponse> {
    const { data } = await api.post<CreateHealthRecordFromOcrResponse>(
      `/ocr/patient/${patientId}/create-health-record`,
    );
    return data;
  },
};

