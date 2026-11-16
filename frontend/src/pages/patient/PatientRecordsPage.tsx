import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileHeart, FileText, FileUp, Printer, ScanText } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { publicService } from '@/services/publicService';
import { patientService } from '@/services/patientService';
import { extractApiError, formatDateTime, formatLabel } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';

export function PatientRecordsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [printOpen, setPrintOpen] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    glucose: '',
    blood_pressure: '',
    bmi: '',
    cholesterol: '',
    heart_rate: '',
  });

  const profileQuery = useQuery({
    queryKey: ['patient-my-profile'],
    queryFn: () => publicService.getMyProfile(),
  });
  const recordsQuery = useQuery({
    queryKey: ['patient-my-records'],
    queryFn: () => publicService.getMyRecords(),
  });

  const patientId = profileQuery.data?.id;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['patient-my-records'] });
  };

  const addVitalsMutation = useMutation({
    mutationFn: () =>
      patientService.createHealthRecord(patientId!, {
        glucose: vitalsForm.glucose ? Number(vitalsForm.glucose) : undefined,
        blood_pressure: vitalsForm.blood_pressure ? Number(vitalsForm.blood_pressure) : undefined,
        bmi: vitalsForm.bmi ? Number(vitalsForm.bmi) : undefined,
        cholesterol: vitalsForm.cholesterol ? Number(vitalsForm.cholesterol) : undefined,
        heart_rate: vitalsForm.heart_rate ? Number(vitalsForm.heart_rate) : undefined,
      }),
    onSuccess: () => {
      toast.success('Vitals saved to your EHR');
      setVitalsForm({ glucose: '', blood_pressure: '', bmi: '', cholesterol: '', heart_rate: '' });
      invalidate();
    },
    onError: (err) => toast.error('Failed to save vitals', extractApiError(err)),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => patientService.uploadReport(patientId!, file),
    onSuccess: () => {
      toast.success('Medical report uploaded & scanned');
      invalidate();
    },
    onError: (err) => toast.error('Upload failed', extractApiError(err)),
  });

  const ocrRecordMutation = useMutation({
    mutationFn: () => patientService.createHealthRecordFromOcr(patientId!),
    onSuccess: (res) => {
      toast.success(res.message || 'Vitals imported from your latest uploaded report');
      invalidate();
    },
    onError: (err) => toast.error('Could not import vitals from report', extractApiError(err)),
  });

  const records = recordsQuery.data?.health_records ?? [];
  const reports = recordsQuery.data?.medical_reports ?? [];
  const predictions = recordsQuery.data?.risk_predictions ?? [];

  const summaryText = [
    `Personal Health Summary — ${profileQuery.data?.name ?? 'Patient'} (${profileQuery.data?.patient_code ?? ''})`,
    `Health Records: ${records.length} | Medical Reports: ${reports.length} | Risk Assessments: ${predictions.length}`,
    '',
    'Latest Vitals:',
    ...records.slice(0, 5).map(
      (r) =>
        `- ${formatDateTime(r.created_at)}: Glucose=${r.glucose ?? '-'}, BP=${r.blood_pressure ?? '-'}, BMI=${r.bmi ?? '-'}, Chol=${r.cholesterol ?? '-'}, HR=${r.heart_rate ?? '-'}`,
    ),
    '',
    'AI Risk Assessments:',
    ...predictions.slice(0, 5).map(
      (p) => `- ${formatDateTime(p.created_at)}: ${formatLabel(p.risk)} (${(p.confidence * 100).toFixed(0)}%)`,
    ),
  ].join('\n');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Health Records, Vitals & Medical Reports</h2>
          <p className="text-xs text-slate-500">
            Log home readings, upload external lab/imaging PDFs or images, and print your complete health summary.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {patientId && (
            <>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700">
                <FileUp className="h-4 w-4" />
                Upload Report (PDF/Image)
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMutation.mutate(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                disabled={ocrRecordMutation.isPending || reports.length === 0}
                onClick={() => ocrRecordMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-clinical-200 bg-clinical-50 px-3.5 py-2 text-xs font-semibold text-clinical-700 hover:bg-clinical-100 disabled:opacity-50"
              >
                <ScanText className="h-4 w-4" />
                Import Vitals from Report
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Export Summary
          </button>
        </div>
      </div>

      {patientId && (
        <Card>
          <CardHeader
            title="Log New Vitals Reading"
            subtitle="Add home or clinic glucose, blood pressure, BMI, cholesterol, or heart rate readings."
            action={<FileHeart className="h-5 w-5 text-rose-600" />}
          />
          <CardBody>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addVitalsMutation.mutate();
              }}
              className="grid gap-3 sm:grid-cols-6"
            >
              <input
                type="number"
                step="0.1"
                placeholder="Glucose"
                value={vitalsForm.glucose}
                onChange={(e) => setVitalsForm({ ...vitalsForm, glucose: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Systolic BP"
                value={vitalsForm.blood_pressure}
                onChange={(e) => setVitalsForm({ ...vitalsForm, blood_pressure: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="BMI"
                value={vitalsForm.bmi}
                onChange={(e) => setVitalsForm({ ...vitalsForm, bmi: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Cholesterol"
                value={vitalsForm.cholesterol}
                onChange={(e) => setVitalsForm({ ...vitalsForm, cholesterol: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Heart Rate"
                value={vitalsForm.heart_rate}
                onChange={(e) => setVitalsForm({ ...vitalsForm, heart_rate: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={addVitalsMutation.isPending}
                className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
              >
                Save Reading
              </button>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Vitals History (${records.length})`} />
          <CardBody className="space-y-3 max-h-96 overflow-y-auto">
            {records.length === 0 ? (
              <p className="text-xs text-slate-500">No vitals records yet.</p>
            ) : (
              records.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900">Record {r.id}</span>
                    <span className="text-slate-500">{formatDateTime(r.created_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="slate">Glucose: {r.glucose ?? '—'}</Badge>
                    <Badge variant="slate">BP: {r.blood_pressure ?? '—'}</Badge>
                    <Badge variant="slate">BMI: {r.bmi ?? '—'}</Badge>
                    <Badge variant="slate">Chol: {r.cholesterol ?? '—'}</Badge>
                    <Badge variant="slate">HR: {r.heart_rate ?? '—'}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Uploaded Reports & AI Risk History (${reports.length})`} />
          <CardBody className="space-y-3 max-h-96 overflow-y-auto">
            {predictions.map((p) => (
              <div
                key={`pred-${p.id}`}
                className="flex items-center justify-between rounded-xl border border-clinical-200 bg-clinical-50/50 p-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">AI Clinical Risk Assessment</p>
                  <p className="text-slate-500">{formatDateTime(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{(p.confidence * 100).toFixed(0)}% conf</span>
                  <StatusBadge status={p.risk} />
                </div>
              </div>
            ))}
            {reports.map((rep) => (
              <div key={rep.id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                    <FileText className="h-3.5 w-3.5 text-clinical-600" />
                    {rep.file_name}
                  </span>
                  <Badge variant="blue">{rep.file_type}</Badge>
                </div>
                {rep.extracted_text && (
                  <p className="line-clamp-3 whitespace-pre-line text-slate-600">
                    {rep.extracted_text}
                  </p>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <PrintableDocumentModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title="Personal Health Records Summary"
        filename={`health-summary-${profileQuery.data?.patient_code ?? 'patient'}.txt`}
        plainTextSummary={summaryText}
      >
        <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800">{summaryText}</pre>
      </PrintableDocumentModal>
    </div>
  );
}

