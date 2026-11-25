import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Brain, Cpu, Network, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { clinicalAiService } from '@/services/clinicalAiService';
import { patientService } from '@/services/patientService';
import { extractApiError, formatBytes, formatDateTime, formatLabel } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { AiAssistantPanel } from '@/components/shared/AiAssistantPanel';
import { RagIndexingProgressBar } from '@/components/shared/RagIndexingProgressBar';
import type { ClusteringResponse, ManualRiskPredictionResponse, RagJobStatus } from '@/types/api';

export function AdminAiKnowledgePage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'admin';
  const isSubAdmin = user?.role === 'sub_admin';

  const [manualForm, setManualForm] = useState({
    age: '54',
    glucose: '148',
    blood_pressure: '142',
    bmi: '29.5',
    cholesterol: '228',
    heart_rate: '86',
  });
  const [manualResult, setManualResult] = useState<ManualRiskPredictionResponse | null>(null);
  const [clusterAlgo, setClusterAlgo] = useState<'kmeans' | 'dbscan' | 'hierarchical'>('kmeans');
  const [clusterCount, setClusterCount] = useState(3);
  const [clusterRes, setClusterRes] = useState<ClusteringResponse | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(() => {
    try { return localStorage.getItem('medical-rag-active-job'); } catch { return null; }
  });
  const [jobStatus, setJobStatus] = useState<RagJobStatus | null>(null);

  const trackRagJob = (jobId?: string, filename?: string) => {
    if (!jobId) return;
    setActiveJobId(jobId);
    setJobStatus({
      job_id: jobId,
      status: 'queued',
      stage: 'Connecting to Indexing Stream',
      message: 'Upload accepted. Preparing vectorization pipeline...',
      filename,
      percent: 2,
    });
    try { localStorage.setItem('medical-rag-active-job', jobId); } catch { /* storage is optional */ }
  };

  useEffect(() => {
    if (!activeJobId) return;
    const controller = new AbortController();
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const applyStatus = (next: RagJobStatus) => {
      setJobStatus(next);
      if (next.terminal) {
        if (pollTimer) clearInterval(pollTimer);
        try { localStorage.removeItem('medical-rag-active-job'); } catch { /* ignore */ }
        void queryClient.invalidateQueries({ queryKey: ['rag-knowledge'] });
      }
    };

    void (async () => {
      try {
        const initial = await clinicalAiService.getKnowledgeJobStatus(activeJobId);
        if (controller.signal.aborted) return;
        applyStatus(initial);
        if (!initial.terminal) {
          // Backup polling in case SSE connection drops or is closed by network proxy
          pollTimer = setInterval(async () => {
            if (controller.signal.aborted) return;
            try {
              const latest = await clinicalAiService.getKnowledgeJobStatus(activeJobId);
              if (!controller.signal.aborted) applyStatus(latest);
            } catch {
              // Ignore background polling errors
            }
          }, 2500);

          await clinicalAiService.streamKnowledgeJob(activeJobId, applyStatus, controller.signal);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('RAG progress stream error:', error);
          try {
            const latest = await clinicalAiService.getKnowledgeJobStatus(activeJobId);
            if (!controller.signal.aborted) applyStatus(latest);
          } catch {
            setJobStatus((current) => current ?? {
              job_id: activeJobId,
              status: 'unknown',
              stage: 'Status unavailable',
              message: 'Connecting to worker status stream...',
            });
          }
        }
      }
    })();

    return () => {
      controller.abort();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [activeJobId, queryClient]);

  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: () => patientService.listPatients() });
  const outliersQuery = useQuery({
    queryKey: ['analytics-outliers'],
    queryFn: () => clinicalAiService.getOutliers(),
  });
  const modelStatusQuery = useQuery({
    queryKey: ['ml-model-status'],
    queryFn: () => clinicalAiService.getModelStatus(),
    enabled: isSuperAdmin || isSubAdmin,
  });
  const knowledgeQuery = useQuery({
    queryKey: ['rag-knowledge'],
    queryFn: () => clinicalAiService.listKnowledgeDocuments(),
    enabled: isSuperAdmin,
  });

  const trainMutation = useMutation({
    mutationFn: () => clinicalAiService.trainModel(),
    onSuccess: () => {
      toast.success('ML classifier trained successfully');
      void queryClient.invalidateQueries({ queryKey: ['ml-model-status'] });
    },
    onError: (err) => toast.error('Model training failed', extractApiError(err)),
  });

  const manualPredictMutation = useMutation({
    mutationFn: () =>
      clinicalAiService.predictManualRisk({
        age: Number(manualForm.age),
        glucose: Number(manualForm.glucose),
        blood_pressure: Number(manualForm.blood_pressure),
        bmi: Number(manualForm.bmi),
        cholesterol: Number(manualForm.cholesterol),
        heart_rate: Number(manualForm.heart_rate),
      }),
    onSuccess: (res) => {
      setManualResult(res);
      toast.success(`Predicted Risk: ${formatLabel(res.prediction.risk)}`);
    },
    onError: (err) => toast.error('Prediction failed', extractApiError(err)),
  });

  const clusterMutation = useMutation({
    mutationFn: () => {
      if (clusterAlgo === 'kmeans') return clinicalAiService.runKMeans(clusterCount);
      if (clusterAlgo === 'hierarchical') return clinicalAiService.runHierarchical(clusterCount);
      return clinicalAiService.runDbscan(1.5, 2);
    },
    onSuccess: (res) => {
      setClusterRes(res);
      toast.success(`${res.algorithm} completed on ${res.patients_used} patients`);
    },
    onError: (err) => toast.error('Clustering failed', extractApiError(err)),
  });

  const uploadKnowledgeMutation = useMutation({
    mutationFn: (file: File) => clinicalAiService.uploadKnowledgeDocument(file),
    onSuccess: (res, file) => {
      toast.success('Document uploaded. Indexing has been queued.');
      trackRagJob(res.indexing_job?.job_id, file.name);
      void queryClient.invalidateQueries({ queryKey: ['rag-knowledge'] });
    },
    onError: (err) => toast.error('Upload failed', extractApiError(err)),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (filename: string) => clinicalAiService.deleteKnowledgeDocument(filename),
    onSuccess: (res, filename) => {
      toast.info('Document deletion has been queued.');
      trackRagJob(res.deletion_job?.job_id, filename);
    },
    onError: (err) => toast.error('Delete failed', extractApiError(err)),
  });

  const reindexMutation = useMutation({
    mutationFn: () => clinicalAiService.reindexKnowledge(),
    onSuccess: (res) => {
      toast.info('Medical knowledge reindex has been queued.');
      trackRagJob(res.indexing_job?.job_id, 'Full Knowledge Library');
    },
    onError: (err) => toast.error('Reindex failed', extractApiError(err)),
  });

  const clusterChartData = Object.entries(
    (clusterRes?.clusters ?? []).reduce<Record<string, number>>((acc, c) => {
      const label = c.cluster === -1 ? 'Noise (-1)' : `Cluster ${c.cluster}`;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      {isSubAdmin && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-purple-50/60 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-xs">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Clinical AI Decision Support & Risk Analytics
                </p>
                <p className="text-xs text-slate-600">
                  Sub-Admin access: Run patient health risk assessments, explore clustering analytics, and consult the AI Clinical Assistant.
                </p>
              </div>
            </div>
            {modelStatusQuery.data && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={modelStatusQuery.data.model.model_exists ? 'emerald' : 'amber'}>
                  ML Model: {modelStatusQuery.data.model.model_exists ? 'Active' : 'Standby'}
                </Badge>
                <Badge variant="blue">
                  Accuracy: {modelStatusQuery.data.model.accuracy !== null ? `${(modelStatusQuery.data.model.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </Badge>
                <span className="text-xs font-semibold text-slate-500">• Weights & RAG store managed by Super Admin</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Clinical Risk Prediction Model"
              subtitle="View accuracy metrics and retrain the risk model on the latest patient records."
              action={
                <button
                  type="button"
                  disabled={trainMutation.isPending}
                  onClick={() => trainMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-60"
                >
                  <Cpu className="h-4 w-4" />
                  {trainMutation.isPending ? 'Training...' : 'Train / Retrain Model'}
                </button>
              }
            />
            <CardBody className="space-y-3 text-sm">
              {modelStatusQuery.data ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={modelStatusQuery.data.model.model_exists ? 'emerald' : 'amber'}>
                      {modelStatusQuery.data.model.model_exists ? 'Model Ready' : 'Untrained'}
                    </Badge>
                    <Badge variant="blue">
                      Accuracy:{' '}
                      {modelStatusQuery.data.model.accuracy !== null
                        ? `${(modelStatusQuery.data.model.accuracy * 100).toFixed(1)}%`
                        : 'N/A'}
                    </Badge>
                    <Badge variant="slate">
                      Labelled Records: {modelStatusQuery.data.training_data.total_labelled_records}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Last trained: {formatDateTime(modelStatusQuery.data.model.last_trained_at)} •
                    Scheduler: {modelStatusQuery.data.schedule.behavior}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500">Loading ML metadata...</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Clinical Knowledge Library"
              subtitle="Upload PDF or text medical guidelines to guide AI responses."
              action={
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={reindexMutation.isPending}
                    onClick={() => reindexMutation.mutate()}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reindex
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                    <Upload className="h-3.5 w-3.5" />
                    Upload document
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.markdown,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadKnowledgeMutation.mutate(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              }
            />
            <CardBody className="space-y-3">
              {jobStatus && (
                <div className="mb-4">
                  <RagIndexingProgressBar
                    jobStatus={jobStatus}
                    onDismiss={() => {
                      setJobStatus(null);
                      setActiveJobId(null);
                      try {
                        localStorage.removeItem('medical-rag-active-job');
                      } catch {
                        /* ignore */
                      }
                    }}
                  />
                </div>
              )}
              {(knowledgeQuery.data?.documents ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">No medical knowledge documents uploaded yet.</p>
              ) : (
                knowledgeQuery.data?.documents.map((doc) => (
                  <div
                    key={doc.filename}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-clinical-600" />
                      <div>
                        <p className="font-semibold text-slate-900">{doc.filename}</p>
                        <p className="text-slate-500">
                          {formatBytes(doc.size_bytes)} • Chunks: {doc.indexed_chunks ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={doc.indexing_status} />
                      <button
                        type="button"
                        onClick={() => deleteDocMutation.mutate(doc.filename)}
                        className="rounded-lg p-1 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Clinical Risk Calculator"
            subtitle="Estimate patient risk level from vitals and lab values."
            action={<Brain className="h-4 w-4 text-clinical-600" />}
          />
          <CardBody className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                manualPredictMutation.mutate();
              }}
              className="grid grid-cols-3 gap-2.5"
            >
              {(
                [
                  ['age', 'Age'],
                  ['glucose', 'Glucose'],
                  ['blood_pressure', 'Systolic BP'],
                  ['bmi', 'BMI'],
                  ['cholesterol', 'Cholesterol'],
                  ['heart_rate', 'Heart Rate'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-[11px] font-semibold text-slate-600">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={manualForm[field]}
                    onChange={(e) => setManualForm({ ...manualForm, [field]: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm"
                  />
                </div>
              ))}
              <div className="col-span-3 flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={manualPredictMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Run Risk Prediction
                </button>
              </div>
            </form>

            {manualResult && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Predicted Tier</span>
                  <StatusBadge status={manualResult.prediction.risk} />
                </div>
                <p className="text-slate-600">
                  Confidence: {(manualResult.prediction.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-[11px] text-slate-500">{manualResult.disclaimer}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Patient Groupings & Unusual Readings"
            subtitle={`Detected unusual vital readings: ${outliersQuery.data?.total_outliers ?? 0}`}
            action={<Network className="h-4 w-4 text-violet-600" />}
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={clusterAlgo}
                onChange={(e) => setClusterAlgo(e.target.value as 'kmeans' | 'dbscan' | 'hierarchical')}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold"
              >
                <option value="kmeans">K-Means</option>
                <option value="hierarchical">Hierarchical</option>
                <option value="dbscan">DBSCAN (Density)</option>
              </select>
              {clusterAlgo !== 'dbscan' && (
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={clusterCount}
                  onChange={(e) => setClusterCount(Number(e.target.value))}
                  className="w-20 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs"
                />
              )}
              <button
                type="button"
                onClick={() => clusterMutation.mutate()}
                disabled={clusterMutation.isPending}
                className="rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
              >
                Run Clustering
              </button>
            </div>

            {clusterChartData.length > 0 && (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clusterChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <AiAssistantPanel patients={patientsQuery.data ?? []} />
    </div>
  );
}

