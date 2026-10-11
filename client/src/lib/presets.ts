import { VideoCategory } from '../types/index.js';

export interface PromptPreset {
  id: string;
  title: string;
  category: VideoCategory;
  description: string;
  prompt: string;
  negativePrompt?: string;
  recommendedAspect: '16:9' | '9:16' | '1:1';
  recommendedDuration: 3 | 5 | 10;
  badge: string;
  thumbnail: string;
}

export const PRESETS: PromptPreset[] = [
  // 1. REALISTIC / CINEMATIC PRESETS
  {
    id: 'cine-neon-rain',
    title: 'Neo-Tokyo Cyberpunk Rain',
    category: 'cinematic',
    description: 'Slow drone tracking shot across a rain-drenched cyberpunk street with towering neon holograms.',
    prompt: 'Cinematic wide tracking shot through a rain-slicked futuristic Neo-Tokyo alleyway, glowing neon kanji signs reflecting in street puddles, atmospheric steam rising from metal grates, hyper-detailed textures, shot on 35mm anamorphic lens, shallow depth of field, slow fluid camera motion, 4k master',
    negativePrompt: 'blurry, jerky motion, low resolution, bad anatomy, artificial lighting, oversaturated cartoon',
    recommendedAspect: '16:9',
    recommendedDuration: 5,
    badge: 'Cinematic',
    thumbnail: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'cine-aurora-fjord',
    title: 'Nordic Fjord Aurora Borealis',
    category: 'cinematic',
    description: 'Breathtaking cinematic dolly forward above calm glacial waters reflecting dancing green auroras.',
    prompt: 'Majestic cinematic aerial drone sweep over pristine Arctic fjord in Norway, vibrant green aurora borealis dancing across the midnight sky, mirror reflections on still glacial waters, snowy peaks in background, crisp 8k photorealism, award-winning cinematography',
    negativePrompt: 'grainy, low framerate, compression artifacts, cartoonish, low contrast',
    recommendedAspect: '16:9',
    recommendedDuration: 5,
    badge: 'Nature Drone',
    thumbnail: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'cine-vintage-monologue',
    title: '35mm Film Noir Close-Up',
    category: 'cinematic',
    description: 'Intense cinematic portrait with venetian blind shadows and subtle emotional facial acting.',
    prompt: 'Vintage 1950s film noir close-up of a detective with fedora, Venetian blind shadows cast across his face, cigarette smoke swirling slowly into a single tungsten beam, cinematic grain, moody dramatic lighting, subtle slow-motion breathing',
    negativePrompt: '3D render, cartoon, digital art, plastic skin, flat lighting',
    recommendedAspect: '16:9',
    recommendedDuration: 5,
    badge: 'Film Noir',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80'
  },

  // 2. CARTOON / 3D / ANIME PRESETS
  {
    id: 'toon-mech-pup',
    title: 'Pixar 3D Mech Explorer',
    category: 'cartoon',
    description: 'Adorable golden mechanical companion exploring a glowing enchanted fairy tale woodland.',
    prompt: 'Pixar 3D studio quality character animation: an adorable small brass robotic puppy with glowing sapphire eyes discovering a magical bioluminescent flower, inquisitive head tilt and tail wag, subsurface scattering, rich whimsical color palette, Raytraced reflections, 60fps fluid CGI',
    negativePrompt: 'photorealistic human, horror, ugly, deformed, flat 2d, low poly',
    recommendedAspect: '16:9',
    recommendedDuration: 5,
    badge: 'Pixar 3D',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'toon-shinkai-train',
    title: 'Makoto Shinkai Anime Station',
    category: 'cartoon',
    description: 'Emotional Japanese anime scene with cherry blossoms fluttering across a sunlit train crossing.',
    prompt: 'Makoto Shinkai aesthetic anime scene: gentle spring breeze carrying pink sakura petals across a sun-drenched suburban Tokyo railroad crossing, gorgeous cumulus clouds painted in pastel blues and warm golden hour light, exquisite cel shading, anime masterpiece',
    negativePrompt: '3D CGI render, western cartoon, dark, grim, realistic photo',
    recommendedAspect: '16:9',
    recommendedDuration: 5,
    badge: 'Anime',
    thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'toon-clay-bakery',
    title: 'Cozy Claymation Bakery',
    category: 'cartoon',
    description: 'Charming stop-motion clay style animal baker pulling fresh glowing pastries from an oven.',
    prompt: 'Aardman style stop-motion claymation: cheerful little badger wearing a miniature chef hat in a warm clay bakery, pulling freshly baked steaming bread rolls from a stone hearth, tactile clay textures, subtle thumbprint imperfections, warm rustic lighting',
    negativePrompt: 'smooth 3d cgi, photorealistic, harsh lighting, fast camera shaking',
    recommendedAspect: '1:1',
    recommendedDuration: 5,
    badge: 'Claymation',
    thumbnail: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80'
  },

  // 3. OBJECT / PRODUCT PRESETS
  {
    id: 'prod-watch-360',
    title: '360° Luxury Chronograph Showcase',
    category: 'product',
    description: 'Pristine 360-degree rotation of a luxury chronograph watch with metallic rim reflections.',
    prompt: 'Commercial luxury product advertisement: premium titanium chronograph wristwatch slowly rotating 360 degrees on a polished matte obsidian platform, dual softbox rim lighting catching chamfered bezel edges, macro close-up of ticking second hand, pristine reflections, 8k crisp details',
    negativePrompt: 'dust, scratches, hands holding, cheap plastic, shaky camera, low lighting',
    recommendedAspect: '1:1',
    recommendedDuration: 5,
    badge: '360° Showcase',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-perfume-floating',
    title: 'Floating Perfume & Water Droplets',
    category: 'product',
    description: 'Zero-gravity floating luxury perfume bottle surrounded by slow-motion water splashes.',
    prompt: 'High-end cosmetic advertisement: crystal glass perfume bottle suspended weightlessly in mid-air, crystalline water droplets and iridescent flower petals swirling smoothly in slow-motion orbit around the bottle, backlit studio diffusion, clean luxury aesthetic',
    negativePrompt: 'dark shadows, murky water, distorted text, low resolution',
    recommendedAspect: '9:16',
    recommendedDuration: 5,
    badge: 'Zero-G Float',
    thumbnail: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-sneaker-explode',
    title: 'Futuristic Sneaker Deconstruct',
    category: 'product',
    description: 'Dynamic commercial teaser of an aerodynamic sneaker suspended in an ultra-modern studio.',
    prompt: 'Nike-style commercial teaser: aerodynamic futuristic running sneaker hovering at a 45-degree angle in an infinite white cyclorama studio, dynamic camera orbit with speed ramp, neon accent lights sweeping across textured mesh and sole cushioning, high energy',
    negativePrompt: 'blurry, dirty shoes, realistic floor, slow pacing',
    recommendedAspect: '16:9',
    recommendedDuration: 5,
    badge: 'Ad Commercial',
    thumbnail: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80'
  }
];
