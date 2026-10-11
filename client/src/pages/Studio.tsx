import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Clapperboard,
  Palette,
  Box,
  Upload,
  Image as ImageIcon,
  X,
  Wand2,
  AlertCircle,
  Coins,
  Loader2,
  Video,
  CheckCircle2,
  Settings2,
  HelpCircle,
  ChevronDown,
  Layers,
  Camera,
  SunMedium
} from 'lucide-react';
import { api, AuthMeResponse, ProvidersResponse } from '../lib/api.js';
import { VideoCategory, GenerationMode, AspectRatio, VideoDuration, VideoResolution, GenerationJob } from '../types/index.js';
import { PRESETS } from '../lib/presets.js';
import { VideoPlayerModal } from '../components/VideoPlayerModal.js';
import { useAuth } from '../context/AuthContext.js';
import { uploadReferenceImage } from '../lib/firebase.js';

export const Studio: React.FC = () => {
  const { currentUser, credits: authCredits } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Category and Mode
  const [category, setCategory] = useState<VideoCategory>('cinematic');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('text_to_video');

  // Prompts
  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [showNegative, setShowNegative] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

  // Uploaded Image (Supabase Storage)
  const [uploadedImage, setUploadedImage] = useState<{ fileUrl: string; filename: string } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [motionStrength, setMotionStrength] = useState<number>(1.0);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  // Provider & Model
  const [selectedProvider, setSelectedProvider] = useState<string>('fal');
  const [selectedModel, setSelectedModel] = useState<string>('fal-ai/minimax-video/image-to-video');

  // Metadata & System States
  const [authData, setAuthData] = useState<AuthMeResponse | null>(null);
  const [providersData, setProvidersData] = useState<ProvidersResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [completedJobModal, setCompletedJobModal] = useState<GenerationJob | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Load URL parameters (e.g. ?category=product&prompt=...)
  useEffect(() => {
    const cat = searchParams.get('category') as VideoCategory;
    if (cat && ['cinematic', 'cartoon', 'product'].includes(cat)) {
      setCategory(cat);
      if (cat === 'product') setGenerationMode('product_animation');
      else if (cat === 'cartoon') setGenerationMode('cartoon_animation');
      else setGenerationMode('cinematic_video');
    }

    const tplId = searchParams.get('template');
    if (tplId) {
      const preset = PRESETS.find(p => p.id === tplId);
      if (preset) {
        setCategory(preset.category);
        setPrompt(preset.prompt);
        if (preset.negativePrompt) {
          setNegativePrompt(preset.negativePrompt);
          setShowNegative(true);
        }
        setAspectRatio(preset.recommendedAspect);
        setDuration(preset.recommendedDuration);
      }
    }

    const p = searchParams.get('prompt');
    if (p) setPrompt(p);
  }, [searchParams]);

  // Load user & providers
  useEffect(() => {
    api.getMe().then(setAuthData).catch(console.error);
    api.getProviders().then(data => {
      setProvidersData(data);
      // Auto-select preferred available model
      const preferred = data.capabilities.find(c => c.name === 'fal') || data.capabilities[0];
      if (preferred) {
        setSelectedProvider(preferred.name);
        const model = preferred.models.find(m => m.category === category) || preferred.models[0];
        if (model) setSelectedModel(model.id);
      }
    }).catch(console.error);
  }, [category]);

  // Update model when category or provider changes
  useEffect(() => {
    if (!providersData) return;
    const providerCaps = providersData.capabilities.find(c => c.name === selectedProvider);
    if (providerCaps) {
      const matched = providerCaps.models.find(m => m.category === category) || providerCaps.models[0];
      if (matched) setSelectedModel(matched.id);
    }
  }, [category, selectedProvider, providersData]);

  // Calculate estimated credit cost
  const estimatedCost = React.useMemo(() => {
    if (!providersData) return 15;
    const p = providersData.capabilities.find(c => c.name === selectedProvider);
    const m = p?.models.find(mod => mod.id === selectedModel);
    return m?.costCredits || 15;
  }, [providersData, selectedProvider, selectedModel]);

  // Prompt Enhancer
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await api.enhancePrompt(prompt, category);
      setPrompt(res.enhanced);
    } catch (err) {
      console.warn('Enhancement failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Image Upload handler
  // Image & Media Upload handler with Supabase Storage progress tracking
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setFailedFile(null);
    setUploadProgress(0);

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setUploadError('Please upload an image file (PNG, JPG, WEBP) or reference clip (MP4, WEBM)');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Media size exceeds 50MB limit');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Primary: Upload directly to private Supabase Storage 'ai-videos' via verified backend
      const res = await api.uploadSourceMedia(file, (percent) => {
        setUploadProgress(percent);
      });

      setUploadedImage({ fileUrl: res.signedUrl, filename: res.filename });
      if (generationMode === 'text_to_video') {
        setGenerationMode('image_to_video');
      }
    } catch (err: unknown) {
      console.warn('Supabase Storage upload notice, testing fallback:', err);
      // Fallback to Firebase Storage if authenticated
      if (currentUser?.uid) {
        try {
          const fbRes = await uploadReferenceImage(file, currentUser.uid, (p) => setUploadProgress(Math.round(p)));
          setUploadedImage({ fileUrl: fbRes.downloadUrl, filename: fbRes.filename });
          if (generationMode === 'text_to_video') {
            setGenerationMode('image_to_video');
          }
          return;
        } catch {
          // continue to error handling
        }
      }

      setFailedFile(file);
      setUploadError(err instanceof Error ? err.message : 'Media upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Preset selector
  const handleApplyPreset = (presetId: string) => {
    const tpl = PRESETS.find(p => p.id === presetId);
    if (!tpl) return;
    setPrompt(tpl.prompt);
    if (tpl.negativePrompt) {
      setNegativePrompt(tpl.negativePrompt);
      setShowNegative(true);
    }
    setAspectRatio(tpl.recommendedAspect);
    setDuration(tpl.recommendedDuration);
  };

  // Append camera movement keyword
  const appendCameraMovement = (movement: string) => {
    setPrompt(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${movement}` : movement;
    });
  };

  // Generation execution
  const executeGeneration = async () => {
    if (!currentUser) {
      setShowConfirmModal(false);
      setErrorMessage('Please sign in to generate AI videos. Accounts receive complimentary starting credits.');
      return;
    }

    setShowConfirmModal(false);
    setErrorMessage(null);
    setIsGenerating(true);

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      const job = await api.createJob({
        category,
        generationMode,
        prompt: prompt.trim(),
        negativePrompt: showNegative ? negativePrompt.trim() : undefined,
        inputImageUrl: uploadedImage?.fileUrl,
        aspectRatio,
        durationSeconds: duration,
        resolution,
        motionStrength,
        seed: seed ? Number(seed) : undefined,
        audioEnabled,
        provider: selectedProvider as 'fal' | 'replicate' | 'mock',
        modelName: selectedModel,
        idempotencyKey: `client_gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      });

      setActiveJob(job);

      // Deduct balance locally for snappy feedback
      if (authData) {
        setAuthData({
          ...authData,
          credits: {
            ...authData.credits,
            balance: Math.max(0, authData.credits.balance - estimatedCost),
            reservedBalance: authData.credits.reservedBalance + estimatedCost
          }
        });
      }

      // Poll status with bounded backoff and timeout
      pollJobStatus(job.id);
    } catch (err: unknown) {
      setIsGenerating(false);
      setErrorMessage(err instanceof Error ? err.message : 'Generation request failed');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setErrorMessage(null);
    setIsGenerating(true);
    try {
      const retried = await api.retryJob(jobId);
      setActiveJob(retried);
      pollJobStatus(retried.id);
    } catch (err) {
      setIsGenerating(false);
      setErrorMessage(err instanceof Error ? err.message : 'Retry failed');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const cancelled = await api.cancelJob(jobId);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsGenerating(false);
      setActiveJob(cancelled);
      api.getMe().then(setAuthData).catch(console.error);
    } catch (err) {
      console.warn('Cancel error:', err);
    }
  };

  const pollJobStatus = (jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const startTime = Date.now();
    const MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes max duration
    let consecutiveErrors = 0;

    pollIntervalRef.current = setInterval(async () => {
      // 1. Timeout protection
      if (Date.now() - startTime > MAX_DURATION_MS) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsGenerating(false);
        setErrorMessage('Video generation timed out after 10 minutes. Reserved credits have been refunded.');
        setActiveJob(prev => prev ? { ...prev, status: 'failed', errorMessage: 'Generation timed out' } : null);
        api.getMe().then(setAuthData).catch(console.error);
        return;
      }

      try {
        const job = await api.getJob(jobId);
        consecutiveErrors = 0;
        setActiveJob(job);

        if (job.status === 'completed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          setCompletedJobModal(job);
          api.getMe().then(setAuthData).catch(console.error);
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          setErrorMessage(job.errorMessage || 'Generation failed. Credits have been refunded.');
          api.getMe().then(setAuthData).catch(console.error);
        }
      } catch (pollErr: unknown) {
        consecutiveErrors++;
        console.warn(`Status poll attempt failed (${consecutiveErrors}/5):`, pollErr);
        if (consecutiveErrors >= 5) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          setErrorMessage('Unable to contact video generation status service. Please check your Dashboard or connection.');
        }
      }
    }, 2500);
  };

  const categoryPresets = PRESETS.filter(p => p.category === category);
  const currentBalance = authCredits?.balance ?? authData?.credits?.balance ?? 150;
  const hasEnoughCredits = currentBalance >= estimatedCost;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              AI Video Creation Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              v2.4
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Produce professional cinematic videos, animated storytelling, and 3D product reels.
          </p>
        </div>

        {/* Live Credits Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-muted-foreground">Balance:</span>
          <span className="text-sm font-bold text-white">{currentBalance}</span>
          <span className="text-xs text-purple-300/80">credits</span>
        </div>
      </div>

      {/* Main Studio Grid: Left Controls (2 Cols) | Right Preview & Cost (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Steps A to D */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP A: CATEGORY & GENERATION MODE SELECTION */}
          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-[11px] font-mono">1</span>
                Category & Generation Mode
              </span>
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setCategory('cinematic');
                  setGenerationMode('cinematic_video');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'cinematic'
                    ? 'bg-purple-600/20 border-purple-500/50 shadow-md shadow-purple-600/10'
                    : 'bg-secondary/40 border-border/40 hover:bg-secondary/70'
                }`}
              >
                <Clapperboard className={`w-5 h-5 mb-2 ${category === 'cinematic' ? 'text-purple-400' : 'text-muted-foreground'}`} />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Cinematic</h4>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">Photorealistic & Movies</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('cartoon');
                  setGenerationMode('cartoon_animation');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'cartoon'
                    ? 'bg-pink-600/20 border-pink-500/50 shadow-md shadow-pink-600/10'
                    : 'bg-secondary/40 border-border/40 hover:bg-secondary/70'
                }`}
              >
                <Palette className={`w-5 h-5 mb-2 ${category === 'cartoon' ? 'text-pink-400' : 'text-muted-foreground'}`} />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Cartoon / 3D</h4>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">Pixar & Anime Style</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('product');
                  setGenerationMode('product_animation');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  category === 'product'
                    ? 'bg-sky-600/20 border-sky-500/50 shadow-md shadow-sky-600/10'
                    : 'bg-secondary/40 border-border/40 hover:bg-secondary/70'
                }`}
              >
                <Box className={`w-5 h-5 mb-2 ${category === 'product' ? 'text-sky-400' : 'text-muted-foreground'}`} />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Product</h4>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">360° Commercial Showcase</p>
                </div>
              </button>
            </div>

            {/* Mode Selector Pill Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { id: 'text_to_video', label: 'Text to Video' },
                { id: 'image_to_video', label: 'Image to Video' },
                { id: 'cinematic_video', label: 'Cinematic Flow' },
                { id: 'cartoon_animation', label: 'Cartoon / Anime' },
                { id: 'product_animation', label: '360° Product Orbit' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setGenerationMode(mode.id as GenerationMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    generationMode === mode.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* STEP B: PROMPT & ENHANCEMENT */}
          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-[11px] font-mono">2</span>
                Scene Description & Prompt
              </span>

              {/* AI Enhance Button */}
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !prompt.trim()}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/40 hover:to-pink-600/40 text-purple-200 border border-purple-500/30 transition-all disabled:opacity-40"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>Enhancing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-pink-400" />
                    <span>AI Enhance Prompt</span>
                  </>
                )}
              </button>
            </div>

            {/* Prompt Textarea */}
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  category === 'cinematic'
                    ? "Describe scene, lighting, camera movement, and action (e.g. A solitary samurai walking through a dense bamboo forest during heavy snowfall, slow motion tracking shot, 35mm lens, atmospheric mist...)"
                    : category === 'cartoon'
                    ? "Describe character, world, and cartoon aesthetic (e.g. A cheerful 3D Pixar style red panda pilot adjusting goggles inside a whimsical wooden biplane cockpit, soaring over candy clouds...)"
                    : "Describe product, turntable spin, and studio lighting (e.g. Sleek futuristic noise-cancelling headphones hovering and rotating 360 degrees on polished black stone, soft rim lighting...)"
                }
                rows={4}
                className="w-full rounded-xl bg-background/80 border border-border/70 p-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 resize-y transition-all"
              />
            </div>

            {/* Quick Prompt Presets */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">Load 1-Click Preset Template:</p>
              <div className="flex flex-wrap gap-2">
                {categoryPresets.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyPreset(tpl.id)}
                    className="px-2.5 py-1 text-xs rounded-md bg-secondary/60 hover:bg-secondary border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Cinematic Camera & Lighting Quick Pills */}
            <div className="space-y-2 pt-1 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Camera className="w-3.5 h-3.5 text-purple-400" />
                <span>Camera Direction:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Slow pan right',
                  'Drone flyover tracking shot',
                  '360-degree rotation',
                  'Smooth dolly forward',
                  'Dynamic orbit sweep'
                ].map((cam) => (
                  <button
                    key={cam}
                    type="button"
                    onClick={() => appendCameraMovement(cam)}
                    className="px-2 py-0.5 text-[11px] rounded bg-secondary/40 hover:bg-secondary/80 border border-border/40 text-muted-foreground hover:text-foreground"
                  >
                    + {cam}
                  </button>
                ))}
              </div>
            </div>

            {/* Negative Prompt Collapsible */}
            <div className="pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowNegative(!showNegative)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                <span>Negative Prompt (Optional)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showNegative ? 'rotate-180' : ''}`} />
              </button>

              {showNegative && (
                <div className="mt-2 animate-in fade-in duration-200">
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Things to avoid (e.g. blurry, jerky camera, bad anatomy, low resolution, artifacts)"
                    rows={2}
                    className="w-full rounded-xl bg-background/80 border border-border/70 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                  />
                </div>
              )}
            </div>
          </div>

          {/* STEP C: IMAGE UPLOAD (FOR IMAGE-TO-VIDEO / PRODUCT REFERENCE) */}
          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-[11px] font-mono">3</span>
                Input / Reference Image (Optional)
              </span>
              <span className="text-[11px] text-muted-foreground">PNG, JPG, WEBP &lt; 10MB</span>
            </div>

            {uploadedImage ? (
              <div className="relative rounded-xl border border-purple-500/40 bg-background/80 p-3 flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-border/60 bg-black flex-shrink-0">
                  <img
                    src={uploadedImage.fileUrl}
                    alt="Uploaded preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {uploadedImage.filename}
                  </p>
                  <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Uploaded to secure private storage
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Will be utilized as keyframe reference
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-border/70 hover:border-purple-500/50 rounded-xl p-6 text-center bg-background/40 hover:bg-background/70 transition-all flex flex-col items-center justify-center gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2.5 w-full max-w-xs py-2">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    <p className="text-xs text-muted-foreground font-medium">
                      Uploading to Supabase Storage ({uploadProgress ?? 0}%)
                    </p>
                    <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-150" 
                        style={{ width: `${uploadProgress ?? 0}%` }} 
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Click to upload or drag & drop reference image
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Protected in private Supabase Storage bucket <code className="text-purple-300 font-mono">ai-videos</code>
                    </p>
                  </>
                )}
              </div>
            )}

            {uploadError && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {uploadError}
                </span>
                {failedFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileUpload(failedFile);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive font-semibold transition-colors text-[11px]"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {/* STEP D: VIDEO SETTINGS */}
          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-[11px] font-mono">4</span>
              Video Settings & Controls
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        aspectRatio === ratio
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Duration</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([3, 5, 10] as VideoDuration[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        duration === d
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Resolution</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['720p', '1080p', '4k'] as VideoResolution[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setResolution(res)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        resolution === res
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced: Motion & Seed */}
            <div className="pt-2 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Motion Dynamic Strength</span>
                  <span className="font-mono text-purple-300">{motionStrength.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.8"
                  step="0.1"
                  value={motionStrength}
                  onChange={(e) => setMotionStrength(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-secondary rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Seed (Reproducibility)</span>
                  <span className="text-[10px] text-muted-foreground">Optional</span>
                </div>
                <input
                  type="number"
                  placeholder="Random seed"
                  value={seed || ''}
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded-lg bg-background/80 border border-border/70 px-3 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Model Selection, Live Cost Preview, Generate Button & Active Job Tracker */}
        <div className="space-y-6">
          {/* Engine & Provider Selection Card */}
          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-purple-400" />
              AI Model & Provider Architecture
            </h3>

            {/* Provider Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Backend Engine Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background/80 border border-border/70 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              >
                <option value="fal">Fal.ai (Minimax Video-01 / Kling 1.5 / LTX)</option>
                <option value="replicate">Replicate (Wan 2.1 / Luma Ray)</option>
                <option value="mock">Animora Sandbox Engine (Local Dev / CI)</option>
              </select>
            </div>

            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">AI Generation Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background/80 border border-border/70 text-xs font-mono text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              >
                {providersData?.capabilities
                  .find(c => c.name === selectedProvider)
                  ?.models.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.name} ({mod.costCredits} credits)
                    </option>
                  )) || (
                  <option value={selectedModel}>{selectedModel}</option>
                )}
              </select>
            </div>
          </div>

          {/* Cost Preview & Generation Trigger Card */}
          <div className="p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-card/60 backdrop-blur-md space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
              Estimated Generation Cost
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Base Model Execution:</span>
                <span className="font-semibold text-foreground">{estimatedCost} credits</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Duration ({duration}s):</span>
                <span className="font-semibold text-foreground">Included</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Resolution ({resolution}):</span>
                <span className="font-semibold text-foreground">Standard</span>
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-between items-center text-sm">
                <span className="font-bold text-foreground">Total Required Credits:</span>
                <span className="font-extrabold text-purple-300 text-base">{estimatedCost} credits</span>
              </div>
            </div>

            {/* Credit Availability Alert */}
            {!hasEnoughCredits ? (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Insufficient Credits
                </p>
                <p className="text-[11px]">
                  You have {currentBalance} credits available, but {estimatedCost} are required.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/80">
                Credits are reserved immediately and only settled upon successful completion. Failed jobs are 100% refunded.
              </p>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                {errorMessage}
              </div>
            )}

            {/* Primary Generate Button */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isGenerating || !prompt.trim() || !hasEnoughCredits}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Video...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Video ({estimatedCost} credits)</span>
                </>
              )}
            </button>
          </div>

          {/* Active Job Real-Time Card */}
          {activeJob && (
            <div className="p-5 rounded-2xl border border-purple-500/40 bg-purple-950/20 backdrop-blur-md space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  Live Generation Status
                </span>
                <span className="text-xs font-mono text-purple-300 font-bold">{activeJob.progressPercent}%</span>
              </div>

              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${activeJob.progressPercent}%` }}
                />
              </div>

              <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                <p>Status: <span className="text-purple-300 uppercase font-bold">{activeJob.status}</span></p>
                <p>Job ID: {activeJob.id}</p>
                {activeJob.providerJobId && <p>Provider Request: {activeJob.providerJobId}</p>}
                {activeJob.errorMessage && (
                  <p className="text-destructive font-sans font-semibold mt-1">
                    Failed reason: {activeJob.errorMessage}
                  </p>
                )}
              </div>

              {activeJob.status === 'completed' && (
                <button
                  onClick={() => setCompletedJobModal(activeJob)}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  Watch Completed Video
                </button>
              )}

              {(activeJob.status === 'failed' || activeJob.status === 'cancelled') && (
                <button
                  onClick={() => handleRetryJob(activeJob.id)}
                  disabled={isGenerating}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
                >
                  Retry Generation
                </button>
              )}

              {(activeJob.status === 'processing' || activeJob.status === 'queued') && (
                <button
                  onClick={() => handleCancelJob(activeJob.id)}
                  className="w-full py-1.5 rounded-lg border border-destructive/40 hover:bg-destructive/15 text-destructive text-xs font-semibold transition-all"
                >
                  Cancel Generation
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL BEFORE SPENDING CREDITS (Requirement 5) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Confirm Generation Request</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are about to launch a video generation job with the following parameters:
            </p>

            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/50 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="text-foreground capitalize">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration & Aspect:</span>
                <span className="text-foreground">{duration}s · {aspectRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model Engine:</span>
                <span className="text-purple-300 truncate max-w-[180px]">{selectedModel}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/50 font-bold">
                <span className="text-foreground">Credits to Reserve:</span>
                <span className="text-purple-300">{estimatedCost} credits</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeGeneration}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md transition-colors"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED VIDEO PREVIEW MODAL */}
      {completedJobModal && (
        <VideoPlayerModal
          job={completedJobModal}
          onClose={() => setCompletedJobModal(null)}
          onUsePrompt={(p, cat) => {
            setPrompt(p);
            setCategory(cat as VideoCategory);
            setCompletedJobModal(null);
          }}
        />
      )}
    </div>
  );
};
