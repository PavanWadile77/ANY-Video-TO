import { VideoCategory } from '../types/index.js';

export function enhancePrompt(prompt: string, category: VideoCategory, stylePreference?: string): string {
  const base = prompt.trim();
  if (!base) return '';

  if (category === 'cinematic') {
    return `${base}, shot on 35mm anamorphic lens, Arri Alexa Mini LF, photorealistic cinematic lighting, ultra-detailed textures, natural fluid motion, subtle depth of field, atmospheric volumetric haze, 4k master, color graded, movie still quality`;
  }

  if (category === 'cartoon') {
    const style = stylePreference || '3d_pixar';
    if (style === 'anime') {
      return `${base}, high quality modern anime aesthetic, Makoto Shinkai style, vibrant colors, expressive character animation, dynamic lighting, cel shading, highly detailed anime background, 60fps motion`;
    }
    return `${base}, premium 3D stylized animation, Pixar and DreamWorks studio quality, subsurface scattering, expressive character expressions, vibrant and harmonious color palette, raytraced reflections, whimsical lighting, smooth fluid motion`;
  }

  if (category === 'product') {
    return `${base}, professional luxury commercial studio video, clean seamless backdrop, pristine reflections, softbox studio lighting, smooth 360 turntable camera sweep, macro lens product showcase, 8k crisp details, commercial advertisement grade`;
  }

  return base;
}
