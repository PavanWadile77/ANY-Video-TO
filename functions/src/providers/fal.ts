import { GenerationJob } from '../types.js';

export interface ProviderJobResponse {
  providerJobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progressPercent?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

export class FalVideoProvider {
  public readonly name = 'fal';
  private apiKey: string | null;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.AI_VIDEO_PROVIDER_API_KEY || null;
    this.baseUrl = process.env.AI_VIDEO_PROVIDER_BASE_URL || 'https://queue.fal.run';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes('your_fal'));
  }

  public async createJob(job: GenerationJob): Promise<ProviderJobResponse> {
    if (!this.isConfigured()) {
      throw new Error('Fal.ai API key is not configured in Cloud Functions secrets.');
    }

    const modelEndpoint = `${this.baseUrl}/${job.modelName}`;
    const payload: Record<string, unknown> = {
      prompt: job.prompt
    };

    if (job.negativePrompt) payload.negative_prompt = job.negativePrompt;
    if (job.aspectRatio) payload.aspect_ratio = job.aspectRatio;
    if (job.inputImageUrl) payload.image_url = job.inputImageUrl;
    if (job.durationSeconds) payload.duration = `${job.durationSeconds}s`;
    if (job.seed) payload.seed = job.seed;

    const response = await fetch(modelEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Fal.ai returned HTTP ${response.status}`;
      try {
        const json = JSON.parse(errText);
        msg = json.detail || json.message || msg;
      } catch {
        msg += `: ${errText.substring(0, 150)}`;
      }
      throw new Error(msg);
    }

    const data = await response.json() as { request_id?: string };
    if (!data.request_id) {
      throw new Error('Fal.ai did not return a valid request_id');
    }

    return {
      providerJobId: data.request_id,
      status: 'queued',
      progressPercent: 5
    };
  }

  public async checkStatus(providerJobId: string, modelName: string = 'fal-ai/minimax-video/image-to-video'): Promise<ProviderJobResponse> {
    if (!this.isConfigured()) {
      throw new Error('Fal.ai API key is not configured');
    }

    const statusUrl = `${this.baseUrl}/${modelName}/requests/${providerJobId}/status`;
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${this.apiKey}` }
    });

    if (!statusRes.ok) {
      throw new Error(`Fal.ai status check failed: HTTP ${statusRes.status}`);
    }

    const statusData = await statusRes.json() as {
      status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
      progress?: number;
      error?: string;
    };

    if (statusData.status === 'COMPLETED') {
      const resultUrl = `${this.baseUrl}/${modelName}/requests/${providerJobId}`;
      const resultRes = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${this.apiKey}` }
      });
      const resultData = await resultRes.json() as {
        video?: { url?: string };
        thumbnail?: { url?: string };
      };

      const videoUrl = resultData.video?.url;
      if (!videoUrl) throw new Error('Completed job did not contain a video URL');

      return {
        providerJobId,
        status: 'completed',
        progressPercent: 100,
        videoUrl,
        thumbnailUrl: resultData.thumbnail?.url
      };
    }

    if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
      return {
        providerJobId,
        status: statusData.status === 'CANCELLED' ? 'cancelled' : 'failed',
        progressPercent: 0,
        errorMessage: statusData.error || 'Video synthesis failed'
      };
    }

    if (statusData.status === 'IN_PROGRESS') {
      let percent = 50;
      if (typeof statusData.progress === 'number') {
        percent = statusData.progress <= 1.0 && statusData.progress > 0
          ? Math.round(statusData.progress * 100)
          : Math.round(statusData.progress);
      }
      percent = Math.max(10, Math.min(95, percent));

      return {
        providerJobId,
        status: 'processing',
        progressPercent: percent
      };
    }

    return {
      providerJobId,
      status: 'queued',
      progressPercent: 5
    };
  }
}
