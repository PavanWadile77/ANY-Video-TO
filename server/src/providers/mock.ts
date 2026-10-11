import {
  VideoProvider,
  GenerationJob,
  ProviderJobResponse,
  ProviderStatusResponse,
  ProviderCapabilities
} from '../types/index.js';

interface SimulatedJobState {
  startedAt: number;
  category: string;
  durationSeconds: number;
}

const activeSimulations = new Map<string, SimulatedJobState>();

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

export class MockVideoProvider implements VideoProvider {
  public readonly name = 'mock';

  public isConfigured(): boolean {
    return true; // Always available for offline dev, CI/CD, and demonstrations
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      name: 'mock',
      supportedModes: [
        'text_to_video',
        'image_to_video',
        'product_animation',
        'cartoon_animation',
        'cinematic_video'
      ],
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      supportedDurations: [3, 5, 10],
      supportedResolutions: ['720p', '1080p', '4k'],
      audioGeneration: true,
      models: [
        {
          id: 'animora/sandbox-cinematic-v1',
          name: 'Sandbox Cinematic Engine (Demo/Dev)',
          category: 'cinematic',
          costCredits: 5,
          description: 'Simulated photorealistic cinematic rendering for testing workflows'
        },
        {
          id: 'animora/sandbox-toon-v1',
          name: 'Sandbox 3D & Toon Engine (Demo/Dev)',
          category: 'cartoon',
          costCredits: 5,
          description: 'Simulated 3D animation workflow for development and tests'
        },
        {
          id: 'animora/sandbox-product-v1',
          name: 'Sandbox 360 Product Showcase (Demo/Dev)',
          category: 'product',
          costCredits: 5,
          description: 'Simulated commercial studio 360 showcase generation'
        }
      ]
    };
  }

  public async createJob(job: GenerationJob): Promise<ProviderJobResponse> {
    const mockId = `mock_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    activeSimulations.set(mockId, {
      startedAt: Date.now(),
      category: job.category,
      durationSeconds: job.durationSeconds || 5
    });

    return {
      providerJobId: mockId,
      status: 'queued',
      progressPercent: 10
    };
  }

  public async checkStatus(providerJobId: string): Promise<ProviderStatusResponse> {
    const sim = activeSimulations.get(providerJobId);
    if (!sim) {
      // Completed previously or static
      return {
        providerJobId,
        status: 'completed',
        progressPercent: 100,
        videoUrl: SAMPLE_VIDEOS.cinematic[0]
      };
    }

    const elapsed = Date.now() - sim.startedAt;
    // Simulate generation taking ~4 seconds in sandbox mode
    const TOTAL_SIM_MS = 4000;

    if (elapsed >= TOTAL_SIM_MS) {
      activeSimulations.delete(providerJobId);
      const cat = (sim.category as keyof typeof SAMPLE_VIDEOS) || 'cinematic';
      const videos = SAMPLE_VIDEOS[cat] || SAMPLE_VIDEOS.cinematic;
      const selectedVideo = videos[Math.floor(Math.random() * videos.length)];

      return {
        providerJobId,
        status: 'completed',
        progressPercent: 100,
        videoUrl: selectedVideo,
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
      };
    }

    const percent = Math.min(95, Math.floor(10 + (elapsed / TOTAL_SIM_MS) * 85));
    return {
      providerJobId,
      status: 'processing',
      progressPercent: percent
    };
  }

  public async cancelJob(providerJobId: string): Promise<boolean> {
    return activeSimulations.delete(providerJobId);
  }
}
