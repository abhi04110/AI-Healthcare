import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { ProtectedRoute, PublicAuthRedirect } from '@/components/auth/ProtectedRoute';

import { LandingBookingPage } from '@/pages/public/LandingBookingPage';
import { LoginPage } from '@/pages/public/LoginPage';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { UnauthorizedPage } from '@/pages/public/UnauthorizedPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';

import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminGovernancePage } from '@/pages/admin/AdminGovernancePage';
import { AdminPatientsPage } from '@/pages/admin/AdminPatientsPage';
import { AdminOperationsPage } from '@/pages/admin/AdminOperationsPage';
import { AdminAiKnowledgePage } from '@/pages/admin/AdminAiKnowledgePage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';

import { DoctorLayout } from '@/pages/doctor/DoctorLayout';
import { DoctorDashboard } from '@/pages/doctor/DoctorDashboard';
import { DoctorAppointmentsPage } from '@/pages/doctor/DoctorAppointmentsPage';
import { DoctorPatientsPage } from '@/pages/doctor/DoctorPatientsPage';
import { DoctorConsultationsPage } from '@/pages/doctor/DoctorConsultationsPage';
import { DoctorLabsPage } from '@/pages/doctor/DoctorLabsPage';
import { DoctorAiInsightsPage } from '@/pages/doctor/DoctorAiInsightsPage';
import { DoctorCriticalCarePage } from '@/pages/doctor/DoctorCriticalCarePage';
import { DoctorCanteenPreferencesPage } from '@/pages/doctor/DoctorCanteenPreferencesPage';

import { CanteenLayout } from '@/pages/canteen/CanteenLayout';
import { CanteenDashboard } from '@/pages/canteen/CanteenDashboard';
import { CanteenOrdersPage } from '@/pages/canteen/CanteenOrdersPage';
import { CanteenMenuPage } from '@/pages/canteen/CanteenMenuPage';
import { CanteenSettingsPage } from '@/pages/canteen/CanteenSettingsPage';

import { WorkerLayout } from '@/pages/worker/WorkerLayout';
import { WorkerDashboard } from '@/pages/worker/WorkerDashboard';
import { WorkerTasksPage } from '@/pages/worker/WorkerTasksPage';
import { WorkerStaffIntakePage } from '@/pages/worker/WorkerStaffIntakePage';

import { LabLayout } from '@/pages/lab/LabLayout';
import { LabDashboard } from '@/pages/lab/LabDashboard';

import { PharmacyLayout } from '@/pages/pharmacy/PharmacyLayout';
import { PharmacyDashboard } from '@/pages/pharmacy/PharmacyDashboard';

import { ReceptionLayout } from '@/pages/reception/ReceptionLayout';
import { ReceptionDashboard } from '@/pages/reception/ReceptionDashboard';
import { ReceptionPatientsPage } from '@/pages/reception/ReceptionPatientsPage';
import { ReceptionBillingPage } from '@/pages/reception/ReceptionBillingPage';

import { NurseLayout } from '@/pages/nurse/NurseLayout';
import { NurseDashboard } from '@/pages/nurse/NurseDashboard';

import { PatientLayout } from '@/pages/patient/PatientLayout';
import { PatientDashboard } from '@/pages/patient/PatientDashboard';
import { PatientAppointmentsPage } from '@/pages/patient/PatientAppointmentsPage';
import { PatientRecordsPage } from '@/pages/patient/PatientRecordsPage';
import { PatientPrescriptionsPage } from '@/pages/patient/PatientPrescriptionsPage';
import { PatientLabsPage } from '@/pages/patient/PatientLabsPage';
import { PatientAssistantPage } from '@/pages/patient/PatientAssistantPage';
import { PatientCanteenPage } from '@/pages/patient/PatientCanteenPage';
import { PatientBillingPage } from '@/pages/patient/PatientBillingPage';
import { PatientProfilePage } from '@/pages/patient/PatientProfilePage';
import { PatientChatPage } from '@/pages/patient/PatientChatPage';
import { StaffChatPage } from '@/pages/chat/StaffChatPage';
import type { UserRole } from '@/types/api';

const ALL_STAFF_ROLES: UserRole[] = [
  'admin',
  'sub_admin',
  'department_admin',
  'doctor',
  'nurse',
  'receptionist',
  'canteen_manager',
  'canteen_worker',
  'housekeeping_supervisor',
  'housekeeping_worker',
  'lab_technician',
  'pharmacist',
  'radiology_technician',
  'staff',
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});

function ChatRedirect() {
  const { user } = useAuth();
  if (user?.role === 'patient') {
    return <Navigate to="/patient/chat" replace />;
  }
  return <Navigate to="/staff/chat" replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <PreferencesProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingBookingPage />} />
                <Route path="/book" element={<LandingBookingPage />} />
                <Route
                  path="/login"
                  element={
                    <PublicAuthRedirect>
                      <LoginPage />
                    </PublicAuthRedirect>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicAuthRedirect>
                      <RegisterPage />
                    </PublicAuthRedirect>
                  }
                />
                <Route path="/403" element={<UnauthorizedPage />} />

                {/* Admin, Sub-Admin & Department Admin Portal */}
                <Route
                  path="/admin"
                  element={<ProtectedRoute allowedRoles={['admin', 'sub_admin', 'department_admin']} />}
                >
                  <Route element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="governance" element={<AdminGovernancePage />} />
                    <Route path="patients" element={<AdminPatientsPage />} />
                    <Route path="operations" element={<AdminOperationsPage />} />
                    <Route path="ai" element={<AdminAiKnowledgePage />} />
                    <Route path="settings" element={<AdminSettingsPage />} />
                  </Route>
                </Route>

                {/* Doctor Portal */}
                <Route path="/doctor" element={<ProtectedRoute allowedRoles={['doctor']} />}>
                  <Route element={<DoctorLayout />}>
                    <Route index element={<Navigate to="/doctor/dashboard" replace />} />
                    <Route path="dashboard" element={<DoctorDashboard />} />
                    <Route path="appointments" element={<DoctorAppointmentsPage />} />
                    <Route path="patients" element={<DoctorPatientsPage />} />
                    <Route path="consultations" element={<DoctorConsultationsPage />} />
                    <Route path="labs" element={<DoctorLabsPage />} />
                    <Route path="ai" element={<DoctorAiInsightsPage />} />
                    <Route path="critical-care" element={<DoctorCriticalCarePage />} />
                    <Route path="meals" element={<DoctorCanteenPreferencesPage />} />
                    <Route path="preferences" element={<Navigate to="/doctor/meals" replace />} />
                  </Route>
                </Route>

                {/* Canteen Portal */}
                <Route
                  path="/canteen"
                  element={<ProtectedRoute allowedRoles={['canteen_manager', 'canteen_worker']} />}
                >
                  <Route element={<CanteenLayout />}>
                    <Route index element={<Navigate to="/canteen/orders" replace />} />
                    <Route
                      path="dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['canteen_manager']}>
                          <CanteenDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="orders" element={<CanteenOrdersPage />} />
                    <Route path="menu" element={<CanteenMenuPage />} />
                    <Route path="settings" element={<CanteenSettingsPage />} />
                  </Route>
                </Route>

                {/* Hospital Worker / Housekeeping / Radiology / Staff Portal */}
                <Route
                  path="/worker"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'housekeeping_supervisor',
                        'housekeeping_worker',
                        'staff',
                        'radiology_technician',
                      ]}
                    />
                  }
                >
                  <Route element={<WorkerLayout />}>
                    <Route
                      index
                      element={
                        <ProtectedRoute
                          allowedRoles={['housekeeping_supervisor', 'staff', 'radiology_technician']}
                        >
                          <WorkerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="dashboard"
                      element={
                        <ProtectedRoute
                          allowedRoles={['housekeeping_supervisor', 'staff', 'radiology_technician']}
                        >
                          <WorkerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tasks"
                      element={
                        <ProtectedRoute
                          allowedRoles={['housekeeping_supervisor', 'housekeeping_worker']}
                        >
                          <WorkerTasksPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="intake"
                      element={
                        <ProtectedRoute allowedRoles={['staff', 'radiology_technician']}>
                          <WorkerStaffIntakePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="preferences" element={<Navigate to="/worker/dashboard" replace />} />
                  </Route>
                </Route>

                {/* Lab Technician Portal */}
                <Route path="/lab" element={<ProtectedRoute allowedRoles={['lab_technician']} />}>
                  <Route element={<LabLayout />}>
                    <Route index element={<Navigate to="/lab/dashboard" replace />} />
                    <Route path="dashboard" element={<LabDashboard />} />
                    <Route path="preferences" element={<Navigate to="/lab/dashboard" replace />} />
                  </Route>
                </Route>

                {/* Pharmacist Portal */}
                <Route path="/pharmacy" element={<ProtectedRoute allowedRoles={['pharmacist']} />}>
                  <Route element={<PharmacyLayout />}>
                    <Route index element={<Navigate to="/pharmacy/dashboard" replace />} />
                    <Route path="dashboard" element={<PharmacyDashboard />} />
                    <Route path="preferences" element={<Navigate to="/pharmacy/dashboard" replace />} />
                  </Route>
                </Route>

                {/* Receptionist Portal */}
                <Route
                  path="/reception"
                  element={<ProtectedRoute allowedRoles={['receptionist']} />}
                >
                  <Route element={<ReceptionLayout />}>
                    <Route index element={<Navigate to="/reception/dashboard" replace />} />
                    <Route path="dashboard" element={<ReceptionDashboard />} />
                    <Route path="patients" element={<ReceptionPatientsPage />} />
                    <Route path="billing" element={<ReceptionBillingPage />} />
                    <Route path="preferences" element={<Navigate to="/reception/dashboard" replace />} />
                  </Route>
                </Route>

                {/* Nurse Portal */}
                <Route path="/nurse" element={<ProtectedRoute allowedRoles={['nurse']} />}>
                  <Route element={<NurseLayout />}>
                    <Route index element={<Navigate to="/nurse/dashboard" replace />} />
                    <Route path="dashboard" element={<NurseDashboard />} />
                    <Route path="preferences" element={<Navigate to="/nurse/dashboard" replace />} />
                  </Route>
                </Route>

                {/* Patient Portal */}
                <Route path="/patient" element={<ProtectedRoute allowedRoles={['patient']} />}>
                  <Route element={<PatientLayout />}>
                    <Route index element={<Navigate to="/patient/dashboard" replace />} />
                    <Route path="dashboard" element={<PatientDashboard />} />
                    <Route path="appointments" element={<PatientAppointmentsPage />} />
                    <Route path="records" element={<PatientRecordsPage />} />
                    <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
                    <Route path="labs" element={<PatientLabsPage />} />
                    <Route path="assistant" element={<PatientAssistantPage />} />
                    <Route path="canteen" element={<PatientCanteenPage />} />
                    <Route path="billing" element={<PatientBillingPage />} />
                    <Route path="profile" element={<PatientProfilePage />} />
                    <Route path="chat" element={<PatientChatPage />} />
                  </Route>
                </Route>

                {/* Hospital Staff Real-time Comms Workspace */}
                <Route
                  path="/staff/chat"
                  element={
                    <ProtectedRoute allowedRoles={ALL_STAFF_ROLES}>
                      <StaffChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/chat" element={<ChatRedirect />} />

                {/* Fallback */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </PreferencesProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

