import {
  VideoProvider,
  GenerationJob,
  ProviderJobResponse,
  ProviderStatusResponse,
  ProviderCapabilities
} from '../types/index.js';

export class ReplicateVideoProvider implements VideoProvider {
  public readonly name = 'replicate';
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.REPLICATE_API_TOKEN || process.env.AI_VIDEO_PROVIDER_API_KEY || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes('your_fal') && !this.apiKey.includes('your_replicate'));
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      name: 'replicate',
      supportedModes: ['text_to_video', 'image_to_video', 'cinematic_video', 'product_animation'],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      supportedDurations: [5],
      supportedResolutions: ['720p', '1080p'],
      audioGeneration: false,
      models: [
        {
          id: 'wan-video/wan-2.1-t2v-14b',
          name: 'Wan 2.1 14B Cinema',
          category: 'cinematic',
          costCredits: 18,
          description: 'State of the art open weights video generation model with cinematic depth'
        },
        {
          id: 'luma/ray',
          name: 'Luma Dream Machine Ray',
          category: 'product',
          costCredits: 22,
          description: 'High-speed camera motion with smooth object consistency'
        }
      ]
    };
  }

  public async createJob(job: GenerationJob): Promise<ProviderJobResponse> {
    if (!this.isConfigured()) {
      throw new Error('Replicate API key is not configured');
    }

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: job.modelName,
        input: {
          prompt: job.prompt,
          aspect_ratio: job.aspectRatio,
          negative_prompt: job.negativePrompt
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Replicate failed with HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json() as { id: string; status: string };
    return {
      providerJobId: data.id,
      status: 'queued',
      progressPercent: 5
    };
  }

  public async checkStatus(providerJobId: string): Promise<ProviderStatusResponse> {
    if (!this.isConfigured()) {
      throw new Error('Replicate API key is not configured');
    }

    const res = await fetch(`https://api.replicate.com/v1/predictions/${providerJobId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    if (!res.ok) {
      throw new Error(`Replicate status check failed: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
      output?: string | string[];
      error?: string;
    };

    if (data.status === 'succeeded') {
      const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      return {
        providerJobId,
        status: 'completed',
        progressPercent: 100,
        videoUrl
      };
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      return {
        providerJobId,
        status: data.status === 'canceled' ? 'cancelled' : 'failed',
        progressPercent: 0,
        errorMessage: data.error || 'Replicate video generation failed'
      };
    }

    return {
      providerJobId,
      status: data.status === 'processing' ? 'processing' : 'queued',
      progressPercent: data.status === 'processing' ? 50 : 10
    };
  }
}
