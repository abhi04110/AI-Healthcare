import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Brain, Sparkles } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { clinicalAiService } from '@/services/clinicalAiService';
import { patientService } from '@/services/patientService';
import { extractApiError, formatDateTime, formatLabel } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { AiAssistantPanel } from '@/components/shared/AiAssistantPanel';
import type { PatientRiskPredictionResponse } from '@/types/api';

export function DoctorAiInsightsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientPrediction, setPatientPrediction] = useState<PatientRiskPredictionResponse | null>(null);

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.listPatients(),
  });

  const historyQuery = useQuery({
    queryKey: ['prediction-history'],
    queryFn: () => clinicalAiService.getPredictionHistory(),
  });

  const outliersQuery = useQuery({
    queryKey: ['analytics-outliers'],
    queryFn: () => clinicalAiService.getOutliers(),
  });

  const predictMutation = useMutation({
    mutationFn: () => clinicalAiService.predictPatientRisk(Number(selectedPatientId)),
    onSuccess: (res) => {
      setPatientPrediction(res);
      toast.success(`Risk Tier: ${formatLabel(res.prediction.risk)}`);
      void queryClient.invalidateQueries({ queryKey: ['prediction-history'] });
    },
    onError: (err) => toast.error('Prediction failed', extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Patient Risk Assessment"
            subtitle="Analyze a patient's latest recorded vitals to estimate clinical risk level."
            action={<Brain className="h-5 w-5 text-clinical-600" />}
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select accessible patient...</option>
                {(patientsQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.patient_code})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedPatientId || predictMutation.isPending}
                onClick={() => predictMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {predictMutation.isPending ? 'Analyzing...' : 'Predict Risk'}
              </button>
            </div>

            {patientPrediction && (
              <div className="rounded-xl border border-clinical-200 bg-clinical-50/50 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    {patientPrediction.patient.name} ({patientPrediction.patient.patient_code})
                  </span>
                  <StatusBadge status={patientPrediction.prediction.risk} />
                </div>
                <p className="text-slate-700">
                  Model Confidence: {(patientPrediction.prediction.confidence * 100).toFixed(1)}%
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(patientPrediction.prediction.probabilities).map(([k, v]) => (
                    <Badge key={k} variant="slate">
                      {formatLabel(k)}: {(v * 100).toFixed(0)}%
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">{patientPrediction.disclaimer}</p>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-700">
                Biomarker Outliers Detected ({outliersQuery.data?.total_outliers ?? 0})
              </p>
              <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                {(outliersQuery.data?.outliers ?? []).slice(0, 6).map((o) => (
                  <div
                    key={`${o.record_id}-${o.field}`}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs"
                  >
                    <span className="font-medium text-slate-800">
                      Patient {o.patient_id} • {formatLabel(o.field)}
                    </span>
                    <Badge variant="rose">
                      {o.value} (Normal range {o.lower_limit.toFixed(0)}–{o.upper_limit.toFixed(0)})
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent Clinical Risk Predictions"
            subtitle="Past risk assessments for patients under your care."
            action={<Activity className="h-5 w-5 text-emerald-600" />}
          />
          <CardBody className="space-y-2 max-h-80 overflow-y-auto">
            {(historyQuery.data?.predictions ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">No risk predictions logged yet.</p>
            ) : (
              historyQuery.data?.predictions.slice(0, 10).map((pred, idx) => (
                <div
                  key={pred.id ?? idx}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900">Patient ID {pred.patient_id}</p>
                    <p className="text-slate-500">{formatDateTime(pred.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">{(pred.confidence * 100).toFixed(0)}%</span>
                    <StatusBadge status={pred.risk} />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <AiAssistantPanel
        patients={patientsQuery.data ?? []}
        quickPrompts={[
          'Summarize risk indicators and follow-up suggestions',
          'Check contraindications or lifestyle targets for hypertension',
        ]}
      />
    </div>
  );
}

