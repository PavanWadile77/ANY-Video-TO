import { GenerationJob } from '../types.js';
import { ProviderJobResponse } from './fal.js';

const SAMPLE_VIDEOS = {
  cinematic: [
    'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-traffic-lights-at-night-42861-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4'
  ],
  cartoon: [
    'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-robot-walking-in-a-futuristic-city-43183-large.mp4'
  ],
  product: [
    'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-gold-watch-34063-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-spinning-perfume-bottle-43391-large.mp4'
  ]
};

export class MockVideoProvider {
  public readonly name = 'mock';

  public isConfigured(): boolean {
    return true;
  }

  public async createJob(job: GenerationJob): Promise<ProviderJobResponse> {
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      providerJobId: mockId,
      status: 'queued',
      progressPercent: 10
    };
  }

  public async checkStatus(providerJobId: string, modelName?: string, jobCreatedAt?: string): Promise<ProviderJobResponse> {
    const elapsed = jobCreatedAt ? Date.now() - new Date(jobCreatedAt).getTime() : 5000;
    const SIMULATION_DURATION = 4000;

    if (elapsed >= SIMULATION_DURATION) {
      const videos = SAMPLE_VIDEOS.cinematic;
      const selected = videos[Math.floor(Math.random() * videos.length)];
      return {
        providerJobId,
        status: 'completed',
        progressPercent: 100,
        videoUrl: selected,
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
      };
    }

    const percent = Math.min(90, Math.floor(10 + (elapsed / SIMULATION_DURATION) * 80));
    return {
      providerJobId,
      status: 'processing',
      progressPercent: percent
    };
  }
}
