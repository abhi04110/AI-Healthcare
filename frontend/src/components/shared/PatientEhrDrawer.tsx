import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Brain,
  FileText,
  FileUp,
  HeartPulse,
  ScanText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { patientService } from '@/services/patientService';
import { clinicalAiService } from '@/services/clinicalAiService';
import { useToast } from '@/context/ToastContext';
import { extractApiError, formatDateTime, formatLabel } from '@/lib/formatters';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import type { OcrValuesResponse } from '@/types/api';

export function PatientEhrDrawer({
  patientId,
  open,
  onClose,
  canRunMlPrediction = false,
}: {
  patientId: number | null;
  open: boolean;
  onClose: () => void;
  canRunMlPrediction?: boolean;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [ocrValues, setOcrValues] = useState<OcrValuesResponse | null>(null);
  const [vitalsForm, setVitalsForm] = useState({
    glucose: '',
    blood_pressure: '',
    bmi: '',
    cholesterol: '',
    heart_rate: '',
  });

  const timelineQuery = useQuery({
    queryKey: ['patient-timeline', patientId],
    queryFn: () => patientService.getTimeline(patientId!),
    enabled: open && patientId !== null,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['patient-timeline', patientId] });
    void queryClient.invalidateQueries({ queryKey: ['patients'] });
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
      toast.success('Health record saved');
      setVitalsForm({ glucose: '', blood_pressure: '', bmi: '', cholesterol: '', heart_rate: '' });
      invalidate();
    },
    onError: (err) => toast.error('Failed to add vitals', extractApiError(err)),
  });

  const uploadReportMutation = useMutation({
    mutationFn: (file: File) => patientService.uploadReport(patientId!, file),
    onSuccess: () => {
      toast.success('Report uploaded & OCR processed');
      invalidate();
    },
    onError: (err) => toast.error('Report upload failed', extractApiError(err)),
  });

  const deleteLatestReportMutation = useMutation({
    mutationFn: () => patientService.deleteLatestReport(patientId!),
    onSuccess: () => {
      toast.success('Latest medical report deleted');
      setOcrValues(null);
      invalidate();
    },
    onError: (err) => toast.error('Delete failed', extractApiError(err)),
  });

  const extractOcrMutation = useMutation({
    mutationFn: () => patientService.extractOcrValues(patientId!),
    onSuccess: (res) => {
      setOcrValues(res);
      toast.success('OCR biomarkers extracted');
    },
    onError: (err) => toast.error('OCR extraction failed', extractApiError(err)),
  });

  const createFromOcrMutation = useMutation({
    mutationFn: () => patientService.createHealthRecordFromOcr(patientId!),
    onSuccess: () => {
      toast.success('Health record created from OCR report');
      invalidate();
    },
    onError: (err) => toast.error('Could not create health record', extractApiError(err)),
  });

  const predictMutation = useMutation({
    mutationFn: () => clinicalAiService.predictPatientRisk(patientId!),
    onSuccess: (res) => {
      toast.success(
        `Risk predicted: ${res.prediction.risk.toUpperCase()}`,
        `Confidence: ${Math.round(res.prediction.confidence * 100)}%`,
      );
      invalidate();
    },
    onError: (err) => toast.error('Prediction failed', extractApiError(err)),
  });

  const data = timelineQuery.data;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadReportMutation.mutate(file);
      e.target.value = '';
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data ? `${data.patient.name} (${data.patient.patient_code})` : 'Patient EHR & Timeline'}
      subtitle={
        data
          ? `Age ${data.patient.age} • ${data.patient.gender} • ${data.patient.phone || 'No phone'}`
          : 'Loading patient timeline...'
      }
      maxWidth="max-w-4xl"
    >
      {timelineQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : timelineQuery.isError ? (
        <p className="text-sm text-rose-600">{extractApiError(timelineQuery.error)}</p>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary & History */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-900">Medical History & Demographics</p>
            <p className="mt-1 text-slate-600">
              {data.patient.medical_history || 'No medical history recorded.'}
            </p>
            {data.patient.address && (
              <p className="mt-1 text-xs text-slate-500">Address: {data.patient.address}</p>
            )}
          </div>

          {/* Add Health Record */}
          <Card>
            <CardHeader
              title="Record Vitals & Lab Biomarkers"
              subtitle="Add a structured health record for analytics and ML risk triage."
              action={
                canRunMlPrediction && (
                  <button
                    type="button"
                    onClick={() => predictMutation.mutate()}
                    disabled={predictMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-tealcare-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-tealcare-700 disabled:opacity-50"
                  >
                    <Brain className="h-4 w-4" />
                    {predictMutation.isPending ? 'Predicting...' : 'Run AI Risk Prediction'}
                  </button>
                )
              }
            />
            <CardBody>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addVitalsMutation.mutate();
                }}
                className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6"
              >
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Glucose (mg/dL)"
                  value={vitalsForm.glucose}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, glucose: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-clinical-500 focus:outline-none"
                />
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="BP Systolic"
                  value={vitalsForm.blood_pressure}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, blood_pressure: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-clinical-500 focus:outline-none"
                />
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="BMI"
                  value={vitalsForm.bmi}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, bmi: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-clinical-500 focus:outline-none"
                />
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Cholesterol"
                  value={vitalsForm.cholesterol}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, cholesterol: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-clinical-500 focus:outline-none"
                />
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Heart Rate"
                  value={vitalsForm.heart_rate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, heart_rate: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-clinical-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addVitalsMutation.isPending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clinical-600 px-3 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-50"
                >
                  <HeartPulse className="h-4 w-4" />
                  Save Vitals
                </button>
              </form>

              {data.health_records.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Recorded</th>
                        <th className="px-3 py-2 text-left">Glucose</th>
                        <th className="px-3 py-2 text-left">BP</th>
                        <th className="px-3 py-2 text-left">BMI</th>
                        <th className="px-3 py-2 text-left">Chol</th>
                        <th className="px-3 py-2 text-left">HR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.health_records.map((rec, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{formatDateTime(rec.created_at)}</td>
                          <td className="px-3 py-2">{rec.glucose ?? '—'}</td>
                          <td className="px-3 py-2">{rec.blood_pressure ?? '—'}</td>
                          <td className="px-3 py-2">{rec.bmi ?? '—'}</td>
                          <td className="px-3 py-2">{rec.cholesterol ?? '—'}</td>
                          <td className="px-3 py-2">{rec.heart_rate ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Medical Reports & Smart Scan */}
          <Card>
            <CardHeader
              title="Medical Reports & Smart Scan"
              subtitle="Upload PDF, JPG, JPEG, or PNG reports (up to 10 MB) to automatically read lab values."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-clinical-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-clinical-700">
                    <FileUp className="h-3.5 w-3.5" />
                    {uploadReportMutation.isPending ? 'Uploading...' : 'Upload Report'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {data.medical_reports.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => extractOcrMutation.mutate()}
                        disabled={extractOcrMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ScanText className="h-3.5 w-3.5 text-clinical-600" />
                        Read Report Values
                      </button>
                      <button
                        type="button"
                        onClick={() => createFromOcrMutation.mutate()}
                        disabled={createFromOcrMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Auto-Create Vitals
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLatestReportMutation.mutate()}
                        disabled={deleteLatestReportMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              }
            />
            <CardBody className="space-y-4">
              {ocrValues && (
                <div className="rounded-xl border border-clinical-200 bg-clinical-50/50 p-3.5">
                  <p className="text-xs font-semibold text-clinical-900">
                    Extracted Biomarkers ({ocrValues.report.file_name})
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(ocrValues.values)
                      .filter(([, val]) => val !== null)
                      .map(([k, val]) => (
                        <div key={k} className="rounded-lg bg-white px-2.5 py-1.5 text-xs ring-1 ring-slate-200">
                          <span className="text-slate-500">{formatLabel(k)}:</span>{' '}
                          <span className="font-semibold text-slate-900">{val}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {data.medical_reports.length === 0 ? (
                <p className="text-xs text-slate-500">No medical reports uploaded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.medical_reports.map((rep, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-clinical-600" />
                          <span className="text-sm font-semibold text-slate-900">{rep.file_name}</span>
                          <Badge variant="slate">{rep.file_type.toUpperCase()}</Badge>
                        </div>
                        <span className="text-xs text-slate-500">{formatDateTime(rep.created_at)}</span>
                      </div>
                      {rep.extracted_text && (
                        <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                          {rep.extracted_text}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Risk Predictions History */}
          {data.risk_predictions.length > 0 && (
            <Card>
              <CardHeader title="AI Risk Prediction History" />
              <CardBody className="space-y-2">
                {data.risk_predictions.map((pred, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-clinical-600" />
                      <StatusBadge status={pred.risk} />
                      <span className="font-semibold text-slate-800">
                        {Math.round(pred.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-slate-600">
                      {Object.entries(pred.probabilities || {}).map(([k, v]) => (
                        <span key={k}>
                          {formatLabel(k)}: {Math.round(v * 100)}%
                        </span>
                      ))}
                    </div>
                    <span className="text-slate-400">{formatDateTime(pred.created_at)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

