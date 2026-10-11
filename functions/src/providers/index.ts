import { FalVideoProvider } from './fal.js';
import { MockVideoProvider } from './mock.js';

export function resolveProvider(preferred?: string, apiKey?: string) {
  if (preferred === 'fal') {
    return new FalVideoProvider(apiKey);
  }
  if (!preferred) {
    const fal = new FalVideoProvider(apiKey);
    if (fal.isConfigured()) return fal;
  }
  return new MockVideoProvider();
}
