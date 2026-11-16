import { api, getApiBaseUrl, getStoredToken, toFormBody } from '@/lib/api';
import type {
  AnalyticsSummaryResponse,
  AssistantAskResponse,
  ClusteringResponse,
  KnowledgeListResponse,
  ManualRiskPredictionResponse,
  ModelStatusResponse,
  OutliersResponse,
  PatientRiskPredictionResponse,
  RiskDistributionResponse,
  RagJobStatus,
  RagQueueResponse,
  RiskPredictionResponse,
} from '@/types/api';

export const clinicalAiService = {
  async getModelStatus(): Promise<ModelStatusResponse> {
    const { data } = await api.get<ModelStatusResponse>('/prediction/model-status');
    return data;
  },

  async trainModel() {
    const { data } = await api.post('/prediction/train');
    return data;
  },

  async predictManualRisk(payload: {
    age: number;
    glucose: number;
    blood_pressure: number;
    bmi: number;
    cholesterol: number;
    heart_rate: number;
  }): Promise<ManualRiskPredictionResponse> {
    const { data } = await api.post<ManualRiskPredictionResponse>(
      '/prediction/risk',
      toFormBody(payload),
    );
    return data;
  },

  async predictPatientRisk(patientId: number): Promise<PatientRiskPredictionResponse> {
    const { data } = await api.post<PatientRiskPredictionResponse>(`/prediction/patient/${patientId}`);
    return data;
  },

  async getPatientPredictionHistory(patientId: number): Promise<{
    status: string;
    patient_id: number;
    patient_name: string;
    predictions: RiskPredictionResponse[];
  }> {
    const { data } = await api.get(`/prediction/patient/${patientId}/history`);
    return data;
  },

  async getPredictionHistory(): Promise<{
    status: string;
    predictions: RiskPredictionResponse[];
  }> {
    const { data } = await api.get('/prediction/history');
    return data;
  },

  async runKMeans(nClusters = 3): Promise<ClusteringResponse> {
    const { data } = await api.post<ClusteringResponse>('/clustering/kmeans', null, {
      params: { n_clusters: nClusters },
    });
    return data;
  },

  async runDbscan(eps = 1.5, minSamples = 2): Promise<ClusteringResponse> {
    const { data } = await api.post<ClusteringResponse>('/clustering/dbscan', null, {
      params: { eps, min_samples: minSamples },
    });
    return data;
  },

  async runHierarchical(nClusters = 3): Promise<ClusteringResponse> {
    const { data } = await api.post<ClusteringResponse>('/clustering/hierarchical', null, {
      params: { n_clusters: nClusters },
    });
    return data;
  },

  async getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
    const { data } = await api.get<AnalyticsSummaryResponse>('/analytics/summary');
    return data;
  },

  async getRiskDistribution(): Promise<RiskDistributionResponse> {
    const { data } = await api.get<RiskDistributionResponse>('/analytics/risk-distribution');
    return data;
  },

  async getOutliers(): Promise<OutliersResponse> {
    const { data } = await api.get<OutliersResponse>('/analytics/outliers');
    return data;
  },

  async askAssistant(
    question: string,
    provider: 'auto' | 'gemini' | 'groq' = 'auto',
  ): Promise<AssistantAskResponse> {
    const { data } = await api.post<AssistantAskResponse>(
      '/assistant/ask',
      toFormBody({ question, provider }),
    );
    return data;
  },

  async listKnowledgeDocuments(): Promise<KnowledgeListResponse> {
    const { data } = await api.get<KnowledgeListResponse>('/assistant/knowledge');
    return data;
  },

  async uploadKnowledgeDocument(file: File): Promise<RagQueueResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/assistant/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteKnowledgeDocument(filename: string): Promise<RagQueueResponse> {
    const { data } = await api.delete('/assistant/knowledge', {
      params: { filename },
    });
    return data;
  },

  async reindexKnowledge(): Promise<RagQueueResponse> {
    const { data } = await api.post('/assistant/knowledge/reindex');
    return data;
  },

  async getKnowledgeJobStatus(jobId: string): Promise<RagJobStatus> {
    const { data } = await api.get<RagJobStatus>(`/assistant/knowledge/jobs/${encodeURIComponent(jobId)}`);
    return data;
  },

  async streamKnowledgeJob(
    jobId: string,
    onProgress: (status: RagJobStatus) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const token = getStoredToken();
    const response = await fetch(
      `${getApiBaseUrl()}/assistant/knowledge/jobs/${encodeURIComponent(jobId)}/stream`,
      {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal,
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Progress stream failed (${response.status})`);
    }
    if (!response.body) throw new Error('Streaming response body is unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const lines = frame.split(/\r?\n/);
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('data:')) continue;
            const raw = trimmedLine.slice(5).trim();
            if (!raw) continue;
            try {
              const payload = JSON.parse(raw) as RagJobStatus;
              if (payload.percent === undefined && payload.progress_percent !== undefined) {
                payload.percent = payload.progress_percent;
              }
              onProgress(payload);
            } catch {
              // Ignore malformed event payloads and continue reading the stream.
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};

