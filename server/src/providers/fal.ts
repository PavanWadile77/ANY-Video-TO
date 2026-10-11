import {
  VideoProvider,
  GenerationJob,
  ProviderJobResponse,
  ProviderStatusResponse,
  ProviderCapabilities
} from '../types/index.js';

export class FalVideoProvider implements VideoProvider {
  public readonly name = 'fal';
  private apiKey: string | null;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.AI_VIDEO_PROVIDER_API_KEY || null;
    this.baseUrl = process.env.AI_VIDEO_PROVIDER_BASE_URL || 'https://queue.fal.run';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes('your_fal'));
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      name: 'fal',
      supportedModes: [
        'text_to_video',
        'image_to_video',
        'product_animation',
        'cartoon_animation',
        'cinematic_video'
      ],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      supportedDurations: [3, 5, 10],
      supportedResolutions: ['720p', '1080p'],
      audioGeneration: false,
      models: [
        {
          id: 'fal-ai/minimax-video/image-to-video',
          name: 'Minimax Hailuo Video-01',
          category: 'cinematic',
          costCredits: 20,
          description: 'Top-tier realistic cinematic motion, lighting, and physical realism'
        },
        {
          id: 'fal-ai/kling-video/v1.5/pro',
          name: 'Kling 1.5 Pro',
          category: 'cinematic',
          costCredits: 25,
          description: 'High-definition cinematic camera motion and photorealistic human/scene dynamics'
        },
        {
          id: 'fal-ai/animatediff/v2',
          name: 'AnimateDiff Anime / Cartoon V2',
          category: 'cartoon',
          costCredits: 12,
          description: 'Stylized 3D, cel-shaded anime, and whimsical character animation'
        },
        {
          id: 'fal-ai/ltx-video',
          name: 'LTX Fast 3D & Product Video',
          category: 'product',
          costCredits: 15,
          description: 'Fast latent product showcase, 360 rotation sweeps, and commercial studio rendering'
        }
      ]
    };
  }

  public async createJob(job: GenerationJob): Promise<ProviderJobResponse> {
    if (!this.isConfigured()) {
      throw new Error(
        'Fal.ai API key is not configured. Please set AI_VIDEO_PROVIDER_API_KEY in your environment.'
      );
    }

    const modelEndpoint = `${this.baseUrl}/${job.modelName}`;

    // Official Fal.ai payload structure
    const payload: Record<string, unknown> = {
      prompt: job.prompt
    };

    if (job.negativePrompt) {
      payload.negative_prompt = job.negativePrompt;
    }
    if (job.aspectRatio) {
      payload.aspect_ratio = job.aspectRatio;
    }
    if (job.inputImageUrl) {
      payload.image_url = job.inputImageUrl;
    }
    if (job.durationSeconds) {
      payload.duration = `${job.durationSeconds}s`;
    }
    if (job.seed) {
      payload.seed = job.seed;
    }

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
      let errorMsg = `Fal.ai submission failed with HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.detail || parsed.message || errorMsg;
      } catch {
        errorMsg += `: ${errText.substring(0, 200)}`;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json() as { request_id?: string };
    if (!data.request_id) {
      throw new Error('Fal.ai did not return a valid request_id');
    }

    return {
      providerJobId: data.request_id,
      status: 'queued',
      progressPercent: 5,
      rawResponse: data
    };
  }

  public async checkStatus(providerJobId: string, modelName: string = 'fal-ai/minimax-video/image-to-video'): Promise<ProviderStatusResponse> {
    if (!this.isConfigured()) {
      throw new Error('Fal.ai API key is not configured');
    }

    const statusUrl = `${this.baseUrl}/${modelName}/requests/${providerJobId}/status`;
    const statusRes = await fetch(statusUrl, {
      headers: {
        'Authorization': `Key ${this.apiKey}`
      }
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
      // Fetch completed result
      const resultUrl = `${this.baseUrl}/${modelName}/requests/${providerJobId}`;
      const resultRes = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${this.apiKey}` }
      });
      if (!resultRes.ok) {
        throw new Error(`Fal.ai result fetch failed: HTTP ${resultRes.status}`);
      }
      const resultData = await resultRes.json() as {
        video?: { url?: string };
        thumbnail?: { url?: string };
      };

      const videoUrl = resultData.video?.url;
      if (!videoUrl) {
        throw new Error('Completed job did not contain a video output URL');
      }

      return {
        providerJobId,
        status: 'completed',
        progressPercent: 100,
        videoUrl,
        thumbnailUrl: resultData.thumbnail?.url,
        rawResponse: resultData
      };
    }

    if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
      return {
        providerJobId,
        status: statusData.status === 'CANCELLED' ? 'cancelled' : 'failed',
        progressPercent: 0,
        errorMessage: statusData.error || 'Job failed during AI video synthesis'
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

  public async cancelJob(providerJobId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const cancelUrl = `${this.baseUrl}/requests/${providerJobId}/cancel`;
      const res = await fetch(cancelUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Key ${this.apiKey}` }
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
