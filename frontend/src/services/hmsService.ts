import { api, toFormBody, toFormBodyIncludeFalse } from '@/lib/api';
import type {
  Appointment,
  AssignedPatient,
  Bill,
  BillItem,
  CanteenMenuItem,
  CanteenOrder,
  Consultation,
  Department,
  EmergencyCase,
  HmsDashboardResponse,
  HousekeepingTask,
  ICUAdmission,
  LabOrder,
  LabResult,
  Medicine,
  MedicineDispensing,
  OperationTheatreCase,
  PatientAssignment,
  Prescription,
  StaffMember,
} from '@/types/api';

export const hmsService = {
  async getDashboard(): Promise<HmsDashboardResponse> {
    const { data } = await api.get<HmsDashboardResponse>('/hms/dashboard/');
    return data;
  },

  // Departments
  async listDepartments(): Promise<Department[]> {
    const { data } = await api.get<Department[]>('/hms/departments/');
    return data;
  },
  async createDepartment(payload: { name: string; code: string; description?: string }): Promise<Department> {
    const { data } = await api.post<Department>('/hms/departments/', toFormBody(payload));
    return data;
  },

  // Staff
  async listStaff(): Promise<StaffMember[]> {
    const { data } = await api.get<StaffMember[]>('/hms/staff/');
    return data;
  },
  async createStaff(payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    department_id: number;
    employee_code: string;
    designation: string;
    qualification?: string;
    specialty?: string;
    shift_start?: string;
    shift_end?: string;
  }) {
    const { data } = await api.post('/hms/staff/', toFormBody(payload));
    return data;
  },
  async deleteStaff(userId: number): Promise<{ message: string; deleted_user_id: number }> {
    const { data } = await api.delete<{ message: string; deleted_user_id: number }>(`/hms/staff/${userId}`);
    return data;
  },

  // Assignments
  async listAssignments(): Promise<PatientAssignment[]> {
    const { data } = await api.get<PatientAssignment[]>('/hms/assignments/');
    return data;
  },
  async assignPatient(patientId: number, doctorUserId: number): Promise<PatientAssignment> {
    const { data } = await api.post<PatientAssignment>(
      '/hms/assignments/',
      toFormBody({ patient_id: patientId, doctor_user_id: doctorUserId }),
    );
    return data;
  },
  async getMyAssignedPatients(): Promise<AssignedPatient[]> {
    const { data } = await api.get<AssignedPatient[]>('/hms/assignments/my-patients');
    return data;
  },

  // Appointments
  async listAppointments(): Promise<Appointment[]> {
    const { data } = await api.get<Appointment[]>('/hms/appointments/');
    return data;
  },
  async getMyDoctorAppointments(): Promise<Appointment[]> {
    const { data } = await api.get<Appointment[]>('/hms/appointments/doctor/my');
    return data;
  },
  async createAppointment(payload: {
    patient_id: number;
    doctor_user_id: number;
    appointment_date: string;
    reason?: string;
    notes?: string;
  }): Promise<Appointment> {
    const { data } = await api.post<Appointment>('/hms/appointments/', payload);
    return data;
  },
  async updateAppointmentStatus(
    appointmentId: number,
    payload: { status: string; notes?: string },
  ): Promise<Appointment> {
    const { data } = await api.patch<Appointment>(`/hms/appointments/${appointmentId}/status`, payload);
    return data;
  },

  // Consultations & Prescriptions
  async createConsultation(payload: {
    appointment_id: number;
    symptoms?: string;
    diagnosis?: string;
    treatment_plan?: string;
    follow_up_date?: string | null;
    notes?: string;
  }): Promise<Consultation> {
    const { data } = await api.post<Consultation>('/hms/consultations/', payload);
    return data;
  },
  async getMyConsultations(): Promise<Consultation[]> {
    const { data } = await api.get<Consultation[]>('/hms/consultations/my');
    return data;
  },
  async getPatientConsultations(patientId: number): Promise<Consultation[]> {
    const { data } = await api.get<Consultation[]>(`/hms/consultations/patient/${patientId}`);
    return data;
  },

  async createPrescription(payload: {
    consultation_id: number;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }): Promise<Prescription> {
    const { data } = await api.post<Prescription>('/hms/prescriptions/', payload);
    return data;
  },
  async getMyPrescriptions(): Promise<Prescription[]> {
    const { data } = await api.get<Prescription[]>('/hms/prescriptions/my');
    return data;
  },
  async getPatientPrescriptions(patientId: number): Promise<Prescription[]> {
    const { data } = await api.get<Prescription[]>(`/hms/prescriptions/patient/${patientId}`);
    return data;
  },

  // Laboratory
  async createLabOrder(payload: {
    patient_id: number;
    test_name: string;
    test_type?: string;
    priority: string;
    clinical_notes?: string;
  }): Promise<LabOrder> {
    const { data } = await api.post<LabOrder>('/hms/labs/orders/', payload);
    return data;
  },
  async getMyLabOrders(): Promise<LabOrder[]> {
    const { data } = await api.get<LabOrder[]>('/hms/labs/orders/my');
    return data;
  },
  async getPatientLabOrders(patientId: number): Promise<LabOrder[]> {
    const { data } = await api.get<LabOrder[]>(`/hms/labs/orders/patient/${patientId}`);
    return data;
  },
  async updateLabOrderStatus(orderId: number, status: string): Promise<LabOrder> {
    const { data } = await api.patch<LabOrder>(`/hms/labs/orders/${orderId}/status`, { status });
    return data;
  },
  async createLabResult(payload: {
    lab_order_id: number;
    result_value: string;
    unit?: string;
    reference_range?: string;
    interpretation?: string;
    result_status: string;
    remarks?: string;
  }): Promise<LabResult> {
    const { data } = await api.post<LabResult>('/hms/labs/results/', payload);
    return data;
  },
  async getLabResultByOrder(orderId: number): Promise<LabResult> {
    const { data } = await api.get<LabResult>(`/hms/labs/results/order/${orderId}`);
    return data;
  },

  // Pharmacy
  async listMedicines(): Promise<Medicine[]> {
    const { data } = await api.get<Medicine[]>('/hms/pharmacy/medicines/');
    return data;
  },
  async createMedicine(payload: {
    medicine_name: string;
    generic_name?: string;
    manufacturer?: string;
    category?: string;
    batch_number: string;
    quantity: number;
    unit_price: number;
    expiry_date: string;
  }): Promise<Medicine> {
    const { data } = await api.post<Medicine>('/hms/pharmacy/medicines/', payload);
    return data;
  },
  async updateMedicineStock(medicineId: number, quantity: number): Promise<Medicine> {
    const { data } = await api.patch<Medicine>(`/hms/pharmacy/medicines/${medicineId}/stock`, {
      quantity,
    });
    return data;
  },
  async deactivateMedicine(medicineId: number) {
    const { data } = await api.delete(`/hms/pharmacy/medicines/${medicineId}`);
    return data;
  },
  async dispenseMedicine(payload: {
    medicine_id: number;
    quantity: number;
    prescription_id: number;
    patient_id?: number;
    notes?: string;
  }): Promise<MedicineDispensing> {
    const { data } = await api.post<MedicineDispensing>('/hms/pharmacy/dispense/', payload);
    return data;
  },
  async getMyDispensings(): Promise<MedicineDispensing[]> {
    const { data } = await api.get<MedicineDispensing[]>('/hms/pharmacy/dispensing/my');
    return data;
  },
  async getPatientDispensings(patientId: number): Promise<MedicineDispensing[]> {
    const { data } = await api.get<MedicineDispensing[]>(`/hms/pharmacy/patient/${patientId}`);
    return data;
  },

  // Billing
  async listBills(): Promise<Bill[]> {
    const { data } = await api.get<Bill[]>('/hms/billing/bills/');
    return data;
  },
  async getBillDetail(billId: number): Promise<{ bill: Bill; items: BillItem[] }> {
    const { data } = await api.get<{ bill: Bill; items: BillItem[] }>(`/hms/billing/bills/${billId}`);
    return data;
  },
  async createBill(payload: {
    patient_id: number;
    bill_number: string;
    discount: number;
    tax: number;
    notes?: string;
  }): Promise<Bill> {
    const { data } = await api.post<Bill>('/hms/billing/bills/', toFormBodyIncludeFalse(payload));
    return data;
  },
  async addBillItem(payload: {
    bill_id: number;
    item_type: string;
    description: string;
    quantity: number;
    unit_price: number;
  }): Promise<BillItem> {
    const { data } = await api.post<BillItem>('/hms/billing/items/', toFormBodyIncludeFalse(payload));
    return data;
  },
  async updateBillPayment(billId: number, paidAmount: number): Promise<Bill> {
    const { data } = await api.patch<Bill>(
      `/hms/billing/bills/${billId}/payment`,
      toFormBodyIncludeFalse({ paid_amount: paidAmount }),
    );
    return data;
  },
  async getPatientBills(patientId: number): Promise<Bill[]> {
    const { data } = await api.get<Bill[]>(`/hms/billing/patient/${patientId}`);
    return data;
  },

  // Emergency
  async listEmergencyCases(): Promise<EmergencyCase[]> {
    const { data } = await api.get<EmergencyCase[]>('/hms/emergency/');
    return data;
  },
  async createEmergencyCase(payload: {
    patient_id: number;
    assigned_doctor_id?: number | null;
    assigned_nurse_id?: number | null;
    priority: string;
    symptoms?: string;
    vitals?: string;
    treatment_notes?: string;
    admission_required?: boolean;
  }): Promise<EmergencyCase> {
    const { data } = await api.post<EmergencyCase>('/hms/emergency/', payload);
    return data;
  },
  async updateEmergencyStatus(
    caseId: number,
    payload: { status: string; treatment_notes?: string; admission_required?: boolean },
  ): Promise<EmergencyCase> {
    const { data } = await api.patch<EmergencyCase>(`/hms/emergency/${caseId}/status`, payload);
    return data;
  },

  // ICU
  async listIcuAdmissions(): Promise<ICUAdmission[]> {
    const { data } = await api.get<ICUAdmission[]>('/hms/icu/');
    return data;
  },
  async createIcuAdmission(payload: {
    patient_id: number;
    doctor_user_id?: number | null;
    nurse_user_id?: number | null;
    bed_number: string;
    room_number?: string;
    admission_reason: string;
    vitals?: string;
    treatment_notes?: string;
  }): Promise<ICUAdmission> {
    const { data } = await api.post<ICUAdmission>('/hms/icu/', payload);
    return data;
  },
  async updateIcuStatus(
    admissionId: number,
    payload: { status: string; vitals?: string; treatment_notes?: string },
  ): Promise<ICUAdmission> {
    const { data } = await api.patch<ICUAdmission>(`/hms/icu/${admissionId}/status`, payload);
    return data;
  },

  // Operation Theatre
  async listOtCases(): Promise<OperationTheatreCase[]> {
    const { data } = await api.get<OperationTheatreCase[]>('/hms/ot/');
    return data;
  },
  async createOtCase(payload: {
    patient_id: number;
    surgeon_user_id?: number | null;
    assistant_doctor_id?: number | null;
    nurse_user_id?: number | null;
    operation_name: string;
    operation_type?: string;
    theatre_number: string;
    scheduled_at: string;
    diagnosis?: string;
    pre_op_notes?: string;
  }) {
    const { data } = await api.post('/hms/ot/', toFormBody(payload));
    return data;
  },
  async updateOtStatus(caseId: number, payload: { status: string; post_op_notes?: string }) {
    const { data } = await api.patch(`/hms/ot/${caseId}/status`, toFormBody(payload));
    return data;
  },

  // Housekeeping
  async listHousekeepingTasks(): Promise<HousekeepingTask[]> {
    const { data } = await api.get<HousekeepingTask[]>('/hms/housekeeping/');
    return data;
  },
  async createHousekeepingTask(payload: {
    task_type: string;
    area: string;
    room_number?: string;
    priority: string;
    assigned_worker_id?: number | null;
    description?: string;
  }) {
    const { data } = await api.post('/hms/housekeeping/', toFormBody(payload));
    return data;
  },
  async updateHousekeepingStatus(
    taskId: number,
    payload: { status: string; description?: string },
  ) {
    const { data } = await api.patch(`/hms/housekeeping/${taskId}/status`, toFormBody(payload));
    return data;
  },
  async assignHousekeepingWorker(taskId: number, assignedWorkerId: number) {
    const { data } = await api.patch(
      `/hms/housekeeping/${taskId}/assign`,
      toFormBody({ assigned_worker_id: assignedWorkerId }),
    );
    return data;
  },

  // Canteen
  async getAvailableMenu(): Promise<CanteenMenuItem[]> {
    const { data } = await api.get<CanteenMenuItem[]>('/hms/canteen/menu');
    return data;
  },
  async getAllMenu(): Promise<CanteenMenuItem[]> {
    const { data } = await api.get<CanteenMenuItem[]>('/hms/canteen/menu/all');
    return data;
  },
  async createMenuItem(payload: {
    item_name: string;
    category?: string;
    description?: string;
    price: number;
    available_quantity: number;
  }) {
    const { data } = await api.post('/hms/canteen/menu', toFormBodyIncludeFalse(payload));
    return data;
  },
  async updateMenuAvailability(itemId: number, isAvailable: boolean) {
    const { data } = await api.patch(
      `/hms/canteen/menu/${itemId}/availability`,
      toFormBodyIncludeFalse({ is_available: isAvailable }),
    );
    return data;
  },
  async createCanteenOrder(payload: {
    menu_item_id: number;
    quantity: number;
    patient_id?: number | null;
    notes?: string;
  }) {
    const { data } = await api.post('/hms/canteen/orders', toFormBody(payload));
    return data;
  },
  async listCanteenOrders(): Promise<CanteenOrder[]> {
    const { data } = await api.get<CanteenOrder[]>('/hms/canteen/orders');
    return data;
  },
  async updateCanteenOrderStatus(orderId: number, payload: { status: string; notes?: string }) {
    const { data } = await api.patch(`/hms/canteen/orders/${orderId}/status`, toFormBody(payload));
    return data;
  },
  async getPatientCanteenOrders(patientId: number): Promise<CanteenOrder[]> {
    const { data } = await api.get<CanteenOrder[]>(`/hms/canteen/orders/patient/${patientId}`);
    return data;
  },
};

