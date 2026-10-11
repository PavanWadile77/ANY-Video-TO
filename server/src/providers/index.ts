import { VideoProvider, ProviderCapabilities } from '../types/index.js';
import { FalVideoProvider } from './fal.js';
import { ReplicateVideoProvider } from './replicate.js';
import { MockVideoProvider } from './mock.js';

export class ProviderManager {
  private providers: Map<string, VideoProvider> = new Map();

  constructor() {
    this.register(new FalVideoProvider());
    this.register(new ReplicateVideoProvider());
    this.register(new MockVideoProvider());
  }

  public register(provider: VideoProvider): void {
    this.providers.set(provider.name, provider);
  }

  public get(name: string): VideoProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Video provider "${name}" is not registered.`);
    }
    return provider;
  }

  public getAllCapabilities(): ProviderCapabilities[] {
    return Array.from(this.providers.values()).map(p => p.getCapabilities());
  }

  public getHealthStatus(): {
    provider: string;
    isConfigured: boolean;
    status: 'healthy' | 'unconfigured' | 'offline';
  }[] {
    return Array.from(this.providers.values()).map(p => {
      const configured = p.isConfigured();
      return {
        provider: p.name,
        isConfigured: configured,
        status: configured ? 'healthy' : 'unconfigured'
      };
    });
  }

  public resolveProviderForJob(preferred?: string): VideoProvider {
    if (preferred && this.providers.has(preferred)) {
      return this.providers.get(preferred)!;
    }

    // Try Fal if configured
    const fal = this.providers.get('fal');
    if (fal && fal.isConfigured()) return fal;

    // Try Replicate if configured
    const replicate = this.providers.get('replicate');
    if (replicate && replicate.isConfigured()) return replicate;

    // Default to Sandbox Mock provider
    return this.providers.get('mock')!;
  }
}

export const providerManager = new ProviderManager();
