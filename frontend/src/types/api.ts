export type UserRole =
  | 'admin'
  | 'department_admin'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'canteen_manager'
  | 'canteen_worker'
  | 'housekeeping_supervisor'
  | 'housekeeping_worker'
  | 'lab_technician'
  | 'pharmacist'
  | 'radiology_technician'
  | 'patient'
  | 'staff';

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface PublicDoctor {
  id: number;
  name: string;
  email: string;
  specialty: string;
  qualification: string;
  department: string;
  shift_start: string;
  shift_end: string;
}

export interface AvailabilitySlot {
  value: string;
  label: string;
}

export interface PublicAvailabilityResponse {
  doctor: string;
  date: string;
  slots: AvailabilitySlot[];
}

export interface PatientResponse {
  id: number;
  patient_code: string;
  name: string;
  age: number;
  gender: string;
  phone: string | null;
  address: string | null;
  medical_history: string | null;
  created_by: number | null;
  user_id: number | null;
}

export interface HealthRecordResponse {
  id?: number;
  patient_id: number;
  glucose: number | null;
  blood_pressure: number | null;
  bmi: number | null;
  cholesterol: number | null;
  heart_rate: number | null;
  risk_label: string | null;
  created_at: string | null;
}

export interface MedicalReportResponse {
  id?: number;
  patient_id: number;
  file_name: string;
  file_path?: string;
  file_type: string;
  extracted_text: string | null;
  created_at?: string | null;
}

export interface RiskPredictionResponse {
  id?: number;
  patient_id: number;
  risk: string;
  confidence: number;
  probabilities: Record<string, number>;
  created_at: string | null;
}

export interface PatientTimelineResponse {
  status: string;
  patient: PatientResponse;
  health_records: HealthRecordResponse[];
  medical_reports: MedicalReportResponse[];
  risk_predictions: RiskPredictionResponse[];
}

export interface OcrValuesResponse {
  patient_id: number;
  report: {
    file_name: string;
    file_type: string;
    created_at: string | null;
  };
  values: Record<string, number | null>;
}

export interface CreateHealthRecordFromOcrResponse {
  status: string;
  message: string;
  patient_id: number;
  report: {
    file_name: string;
    file_type: string;
  };
  health_record: HealthRecordResponse;
  detected_values: Record<string, number | null>;
  note: string;
}

export interface ModelStatusResponse {
  status: string;
  model: {
    model_exists: boolean;
    model_path: string;
    last_trained_at: string | null;
    training_data_max_record_id: number | null;
    total_records_used: number | null;
    training_samples: number | null;
    testing_samples: number | null;
    accuracy: number | null;
    risk_class_distribution: Record<string, number>;
  };
  training_data: {
    total_labelled_records: number;
    complete_records: number;
    risk_class_distribution: Record<string, number>;
    minimum_records_required: number;
    minimum_records_per_class: number;
    latest_training_record_id: number | null;
    ready_for_training: boolean;
  };
  schedule: {
    automatic: boolean;
    interval_hours: number;
    behavior: string;
  };
}

export interface RiskPredictionResult {
  risk: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface ManualRiskPredictionResponse {
  status: string;
  message: string;
  prediction: RiskPredictionResult;
  data_source: string;
  disclaimer: string;
}

export interface PatientRiskPredictionResponse {
  status: string;
  message: string;
  patient: {
    id: number;
    patient_code: string;
    name: string;
    age: number;
  };
  health_record: HealthRecordResponse;
  prediction: RiskPredictionResult;
  data_source: string;
  disclaimer: string;
}

export interface ClusteringRecord {
  patient_id: number;
  patient_code: string;
  patient_name: string;
  cluster: number;
}

export interface ClusteringResponse {
  status: string;
  algorithm: string;
  patients_used: number;
  clusters: ClusteringRecord[];
}

export interface AnalyticsSummaryResponse {
  status: string;
  access_scope: string;
  analytics: {
    total_patients: number;
    total_health_records: number;
    average_age: number | null;
    average_glucose: number | null;
    average_blood_pressure: number | null;
    average_bmi: number | null;
    average_cholesterol: number | null;
    average_heart_rate: number | null;
  };
}

export interface RiskDistributionResponse {
  status: string;
  access_scope: string;
  risk_distribution: Record<string, number>;
}

export interface OutlierRecord {
  record_id: number;
  patient_id: number;
  field: string;
  value: number;
  lower_limit: number;
  upper_limit: number;
}

export interface OutliersResponse {
  status: string;
  access_scope: string;
  total_outliers: number;
  outliers: OutlierRecord[];
}

export interface AssistantAskResponse {
  status: string;
  provider: string;
  question: string;
  answer: string;
  patient_id_scope: number | null;
  patient_context_included: boolean;
  medical_knowledge_sources: Array<{
    source: string;
    page: number | null;
    similarity: number | null;
  }>;
  medical_knowledge_status: string;
  rag_warning: string | null;
  data_scope: string;
  disclaimer: string;
}

export interface KnowledgeDocument {
  filename: string;
  size_bytes: number;
  indexed_chunks: number | null;
  indexed: boolean | null;
  indexing_status: string;
}

export interface KnowledgeListResponse {
  status: string;
  documents: KnowledgeDocument[];
  supported_formats: string[];
}

export interface HmsDashboardResponse {
  access_scope: string;
  dashboard: Record<string, number>;
  emergency: Record<string, number>;
  icu: Record<string, number>;
  operation_theatre: Record<string, number>;
  housekeeping: Record<string, number>;
  canteen: Record<string, number>;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StaffMember {
  user_id: number;
  name: string;
  email: string;
  role: UserRole;
  department_id: number;
  department: string;
  employee_code: string;
  designation: string | null;
  qualification: string | null;
  specialty: string | null;
  shift_start: string | null;
  shift_end: string | null;
  is_active: boolean;
}

export interface PatientAssignment {
  assignment_id: number;
  patient_id: number;
  patient_code: string;
  patient_name: string;
  doctor_user_id: number;
  doctor_name: string;
  doctor_email: string;
  is_active: boolean;
  assigned_at: string | null;
}

export interface AssignedPatient {
  assignment_id: number;
  patient_id: number;
  patient_code: string;
  name: string;
  age: number;
  gender: string;
  phone: string | null;
}

export interface Appointment {
  id: number;
  patient_id: number;
  patient_name?: string | null;
  doctor_user_id: number;
  doctor_name?: string | null;
  doctor_email?: string | null;
  created_by_user_id: number | null;
  appointment_date: string;
  reason: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: number;
  appointment_id: number;
  patient_id: number;
  doctor_user_id: number;
  symptoms: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: number;
  consultation_id: number;
  patient_id: number;
  doctor_user_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  created_at: string;
}

export interface LabOrder {
  id: number;
  patient_id: number;
  doctor_user_id: number;
  test_name: string;
  test_type: string | null;
  priority: string;
  clinical_notes: string | null;
  status: 'ordered' | 'processing' | 'completed' | 'cancelled' | string;
  ordered_at: string;
  updated_at: string;
}

export interface LabResult {
  id: number;
  lab_order_id: number;
  patient_id: number;
  technician_user_id: number;
  result_value: string;
  unit: string | null;
  reference_range: string | null;
  interpretation: string | null;
  result_status: string;
  remarks: string | null;
  completed_at: string;
}

export interface Medicine {
  id: number;
  medicine_name: string;
  generic_name: string | null;
  category: string | null;
  manufacturer: string | null;
  batch_number: string;
  quantity: number;
  unit_price: number;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicineDispensing {
  id: number;
  medicine_id: number;
  quantity: number;
  total_price: number;
  notes: string | null;
  prescription_id: number | null;
  patient_id: number | null;
  pharmacist_user_id: number;
  unit_price: number;
  dispensed_at: string;
}

export interface BillItem {
  id: number;
  bill_id: number;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Bill {
  id: number;
  patient_id: number;
  created_by_user_id: number | null;
  bill_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  payment_status: 'pending' | 'partial' | 'paid' | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyCase {
  id: number;
  patient_id: number;
  assigned_doctor_id: number | null;
  assigned_nurse_id: number | null;
  priority: 'critical' | 'urgent' | 'normal' | string;
  symptoms: string | null;
  vitals: string | null;
  treatment_notes: string | null;
  status: 'waiting' | 'in_treatment' | 'admitted' | 'discharged' | 'cancelled' | string;
  admission_required: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ICUAdmission {
  id: number;
  patient_id: number;
  doctor_user_id: number | null;
  nurse_user_id: number | null;
  bed_number: string;
  room_number: string | null;
  admission_reason: string;
  vitals: string | null;
  treatment_notes: string | null;
  status: 'admitted' | 'critical' | 'stable' | 'discharged' | string;
  admitted_at: string;
  discharged_at: string | null;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface OperationTheatreCase {
  id: number;
  patient_id: number;
  surgeon_user_id: number | null;
  assistant_doctor_id: number | null;
  nurse_user_id: number | null;
  operation_name: string;
  operation_type: string | null;
  theatre_number: string;
  scheduled_at: string;
  diagnosis: string | null;
  pre_op_notes: string | null;
  post_op_notes: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | string;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface HousekeepingTask {
  id: number;
  task_type: string;
  area: string;
  room_number: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent' | string;
  assigned_worker_id: number | null;
  description: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | string;
  started_at: string | null;
  completed_at: string | null;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CanteenMenuItem {
  id: number;
  item_name: string;
  category: string | null;
  description: string | null;
  price: number;
  available_quantity: number;
  is_available: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CanteenOrder {
  id: number;
  patient_id: number | null;
  ordered_by_user_id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientProfile {
  id: number;
  patient_code: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  phone: string | null;
  address: string | null;
  medical_history: string | null;
  created_at: string | null;
}

export interface PatientAppointmentItem {
  id: number;
  doctor_name: string;
  doctor_email: string | null;
  appointment_date: string;
  status: string;
  reason: string | null;
  notes: string | null;
}

export interface PatientPrescriptionItem {
  id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  doctor_name: string;
  created_at: string | null;
}

export interface PatientBillItemResponse {
  id: number;
  bill_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string | null;
  items: BillItem[];
}

export interface PatientLabEntry {
  order_id: number;
  test_name: string;
  test_type: string | null;
  priority: string;
  status: string;
  clinical_notes: string | null;
  ordered_at: string | null;
  doctor_name: string | null;
  result: {
    id: number;
    result_value: string;
    unit: string | null;
    reference_range: string | null;
    interpretation: string | null;
    result_status: string;
    remarks: string | null;
    completed_at: string | null;
  } | null;
}

export interface PatientRecordsResponse {
  health_records: Array<{
    id: number;
    glucose: number | null;
    blood_pressure: number | null;
    bmi: number | null;
    cholesterol: number | null;
    heart_rate: number | null;
    risk_label: string | null;
    created_at: string | null;
  }>;
  medical_reports: Array<{
    id: number;
    file_name: string;
    file_type: string;
    extracted_text: string | null;
    created_at: string | null;
  }>;
  risk_predictions: Array<{
    id: number;
    risk: string;
    confidence: number;
    probabilities: Record<string, number>;
    created_at: string | null;
  }>;
}



export interface RagJobStatus {
  job_id: string;
  job_type?: 'index' | 'delete' | 'sync' | string;
  filename?: string | null;
  status: 'queued' | 'running' | 'completed' | 'completed_with_warnings' | 'failed' | string;
  percent?: number;
  progress_percent?: number;
  stage: string;
  message: string;
  current?: number;
  total?: number;
  terminal?: boolean;
  error?: string;
  result?: Record<string, unknown>;
  updated_at?: string | number;
}

export interface RagQueueResponse {
  status: string;
  message?: string;
  indexing_job?: { job_id: string; status: string; description?: string };
  deletion_job?: { job_id: string; status: string; description?: string };
}
