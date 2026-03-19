import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  Zap, 
  Settings, 
  Search, 
  Layers,
  Sparkles,
  RefreshCw,
  Scissors,
  Clapperboard,
  Volume2,
  Cpu,
  Factory,
  ArrowRightLeft
} from 'lucide-react';

export type Category = 'content' | 'image' | 'video' | 'voice' | 'reverse' | 'automation';
export type OutputType = 'text' | 'prompt';

export interface Tool {
  id: number;
  name: string;
  icon: any;
  category: Category;
  description: string;
  outputType: OutputType;
}

export const TOOLS: Tool[] = [
  { id: 1, name: 'Professional Content Suite', icon: FileText, category: 'content', description: 'Advanced AI generator for articles, social media, and marketing.', outputType: 'text' },
  { id: 4, name: 'Instant AI Meta LLM', icon: Zap, category: 'content', description: 'Transform simple topics into expert-level super prompts.', outputType: 'prompt' },
  
  { id: 2, name: 'Text to image', icon: ImageIcon, category: 'image', description: 'Generate professional AI images with optimized prompts.', outputType: 'prompt' },
  { id: 6, name: 'Image Editor Generator', icon: Scissors, category: 'image', description: 'Advanced image generation prompt structure with technical control.', outputType: 'prompt' },
  
  { id: 3, name: 'Cinematic Video Prompt', icon: Video, category: 'video', description: 'Professional cinema-grade video prompts with full technical control.', outputType: 'prompt' },
  { id: 7, name: 'Viral Shorts Factory', icon: RefreshCw, category: 'video', description: 'Generate 30 varied affiliate content pieces from one topic.', outputType: 'text' },
  { id: 8, name: 'Cinematic AI Film', icon: Clapperboard, category: 'video', description: 'Award-winning film director and visual storytelling expert.', outputType: 'prompt' },
  { id: 11, name: 'One Prompt → Full Video', icon: Sparkles, category: 'video', description: 'Super prompt for ready-to-produce video plans.', outputType: 'prompt' },
  
  { id: 9, name: 'Master Sound Generator', icon: Volume2, category: 'voice', description: 'Music style, BPM, and instrument layer design.', outputType: 'prompt' },
  { id: 10, name: 'AI Voice / Narration', icon: Mic, category: 'voice', description: 'Voice settings, accent, and emotional direction.', outputType: 'text' },
  
  { id: 12, name: 'Image → Prompt Extractor', icon: Search, category: 'reverse', description: 'Deconstruct images into detailed descriptive prompts.', outputType: 'prompt' },
  { id: 13, name: 'Video → Prompt Extractor', icon: Layers, category: 'reverse', description: 'Analyze video scenes into text-to-video instructions.', outputType: 'prompt' },
  
  { id: 5, name: 'Automation Content Factory', icon: Factory, category: 'automation', description: '1 Click → 30 Contents across multiple platforms.', outputType: 'text' },
];

export const CATEGORIES = [
  { id: 'content', name: 'Content Lab', icon: FileText, color: 'text-blue-400' },
  { id: 'image', name: 'Image Studio', icon: ImageIcon, color: 'text-purple-400' },
  { id: 'video', name: 'Video Factory', icon: Clapperboard, color: 'text-red-400' },
  { id: 'voice', name: 'Voice & Sound', icon: Mic, color: 'text-orange-400' },
  { id: 'reverse', name: 'Reverse Engineering', icon: ArrowRightLeft, color: 'text-cyan-400' },
  { id: 'automation', name: 'Automation Factory', icon: Cpu, color: 'text-emerald-400' },
];
