import React from 'react';
import { HelpCircle, Sparkles, Clapperboard, Palette, Box, CheckCircle2, Terminal } from 'lucide-react';

export const Help: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <HelpCircle className="w-7 h-7 text-purple-400" />
          <span>Help & Documentation</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Master prompt engineering for photorealistic cinema, stylized 3D cartoons, and product commercials.
        </p>
      </div>

      {/* Guide Section 1: Realistic / Cinematic */}
      <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">1. Realistic / Cinematic Video Generation</h2>
            <p className="text-xs text-muted-foreground">Techniques for achieving film-grade results</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            • <strong className="text-foreground">Camera Optics:</strong> Mention lenses like <span className="font-mono text-purple-300">35mm anamorphic</span>, <span className="font-mono text-purple-300">shallow depth of field</span>, or <span className="font-mono text-purple-300">macro lens</span> to guide physical perspective.
          </p>
          <p>
            • <strong className="text-foreground">Camera Movements:</strong> Specify camera directions such as <span className="font-mono text-purple-300">drone flyover tracking shot</span>, <span className="font-mono text-purple-300">slow dolly forward</span>, or <span className="font-mono text-purple-300">steadicam orbit</span>.
          </p>
          <p>
            • <strong className="text-foreground">Lighting & Mood:</strong> Use descriptive atmosphere cues: <span className="font-mono text-purple-300">volumetric atmospheric fog</span>, <span className="font-mono text-purple-300">golden hour dusk lighting</span>, or <span className="font-mono text-purple-300">rain-slicked neon reflections</span>.
          </p>
        </div>
      </div>

      {/* Guide Section 2: Cartoon / 3D / Anime */}
      <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-pink-500/15 text-pink-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">2. Cartoon / 3D / Anime Animation</h2>
            <p className="text-xs text-muted-foreground">Stylized character and world animation guidelines</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            • <strong className="text-foreground">3D CGI (Pixar/DreamWorks):</strong> Specify <span className="font-mono text-pink-300">Pixar 3D stylized character</span>, <span className="font-mono text-pink-300">subsurface scattering on skin/fur</span>, and <span className="font-mono text-pink-300">expressive character gestures</span>.
          </p>
          <p>
            • <strong className="text-foreground">Anime (Makoto Shinkai/Ghibli):</strong> Use <span className="font-mono text-pink-300">hand-painted skies</span>, <span className="font-mono text-pink-300">crisp cel shading</span>, <span className="font-mono text-pink-300">expressive anime eyes</span>, and <span className="font-mono text-pink-300">sunlight flaring through sakura trees</span>.
          </p>
        </div>
      </div>

      {/* Guide Section 3: Object / Product Showcase */}
      <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">3. Object / Product Animation</h2>
            <p className="text-xs text-muted-foreground">Commercial showcases and advertising clips</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            • <strong className="text-foreground">Turntable Spans:</strong> Specify <span className="font-mono text-sky-300">seamless 360-degree rotation on matte pedestal</span>.
          </p>
          <p>
            • <strong className="text-foreground">Studio Setup:</strong> Request <span className="font-mono text-sky-300">dual softbox lighting with chamfered rim highlights</span> and <span className="font-mono text-sky-300">pristine specular reflections</span>.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
        <h2 className="text-base font-bold text-foreground">Frequently Asked Questions</h2>
        <div className="space-y-3 text-xs">
          <div>
            <h4 className="font-bold text-foreground">How does credit deduction work?</h4>
            <p className="text-muted-foreground mt-0.5">
              Credits are atomic: reserved when generation starts, and only permanently settled once your video renders. If an upstream AI provider errors out, the reserved credits are automatically refunded.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-foreground">How do I configure my own API key?</h4>
            <p className="text-muted-foreground mt-0.5">
              Set <code className="text-purple-300">AI_VIDEO_PROVIDER_API_KEY</code> in your environment variables. The server will automatically connect to Fal.ai or Replicate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
