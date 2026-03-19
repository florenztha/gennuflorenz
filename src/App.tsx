import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Type } from '@google/genai';
import { ethers } from 'ethers';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  increment,
  collection,
  addDoc,
  serverTimestamp,
  doc, 
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
import { 
  Sparkles, 
  Copy, 
  Check, 
  ChevronRight, 
  LayoutDashboard,
  Menu,
  Send,
  FileText,
  Image as ImageIcon,
  Video,
  Zap,
  Factory,
  Scissors,
  RefreshCw,
  Clapperboard,
  Volume2,
  Mic,
  Search,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  Wallet,
  CreditCard,
  History,
  Coins
} from 'lucide-react';
import { TOOLS, CATEGORIES, Category, Tool } from './constants';
import { generateOptimizedPrompt, generateImage } from './services/geminiService';

declare global {
  interface Window {
    ethereum?: any;
    okxwallet?: any;
  }
}

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error.message;
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-red-50">
          <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-red-900 mb-2">Application Error</h1>
          <p className="text-red-600 max-w-md">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Web3 Config ---
const GENLAYER_CONFIG = {
  rpcUrl: 'https://zksync-os-testnet-genlayer.zksync.dev',
  chainId: 4221,
  symbol: 'GEN',
  explorer: 'https://explorer-asimov.genlayer.com',
  paymentAddress: '0xf44e824F198E87e5F0D9E0341F2B57448E0B33fB'
};

const BuyCredits = ({ 
  walletAddress, 
  onClose, 
  onSuccess 
}: { 
  walletAddress: string; 
  onClose: () => void;
  onSuccess: (credits: number) => void;
}) => {
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBuy = async () => {
    if (!window.ethereum && !window.okxwallet) {
      setError('Please install MetaMask or OKX Wallet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum || window.okxwallet);
      const signer = await provider.getSigner();
      
      // Check network
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== GENLAYER_CONFIG.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${GENLAYER_CONFIG.chainId.toString(16)}`,
              chainName: 'GenLayer Testnet',
              nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
              rpcUrls: [GENLAYER_CONFIG.rpcUrl],
              blockExplorerUrls: [GENLAYER_CONFIG.explorer]
            }]
          });
        } catch (e) {
          throw new Error('Please switch to GenLayer Testnet');
        }
      }

      const tx = await signer.sendTransaction({
        to: GENLAYER_CONFIG.paymentAddress,
        value: ethers.parseEther(amount.toString())
      });

      // Save pending transaction to Firebase
      const creditsToAdd = amount * 1000;
      try {
        await setDoc(doc(db, 'transactions', tx.hash), {
          txHash: tx.hash,
          uid: auth.currentUser?.uid,
          amount: amount,
          creditsAdded: creditsToAdd,
          timestamp: new Date().toISOString(),
          status: 'pending'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `transactions/${tx.hash}`);
      }

      // Wait for confirmation
      await tx.wait();

      // Update user credits
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      try {
        await updateDoc(userRef, {
          credits: increment(creditsToAdd),
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser!.uid}`);
      }

      // Update transaction status
      const txRef = doc(db, 'transactions', tx.hash);
      try {
        await setDoc(txRef, { status: 'completed' }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `transactions/${tx.hash}`);
      }

      onSuccess(creditsToAdd);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
        <Coins className="w-8 h-8 text-emerald-600" />
        <div>
          <h3 className="font-bold text-emerald-900">Buy AI Credits</h3>
          <p className="text-xs text-emerald-600">1 GEN = 1000 Credits</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Amount (GEN)</label>
          <input 
            type="number" 
            min="1"
            className="input-field w-full" 
            value={amount} 
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <p className="text-xs text-gray-500">You will receive {amount * 1000} credits</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button 
          onClick={handleBuy}
          disabled={loading}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay with Wallet
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// --- Tool Components ---

const PromptOutput = ({ prompt, result, imageUrl, loading, toolId, outputType }: { prompt: string; result?: string; imageUrl?: string; loading: boolean; toolId?: number; outputType?: 'text' | 'prompt' }) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2000);
    }
  };

  const handleDownload = () => {
    const content = result || prompt;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `ai-result-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  if (!prompt && !loading && !imageUrl && !result) return null;

  return (
    <div className="mt-8 space-y-8">
      {/* Result Section (The actual content) */}
      {(result || loading || imageUrl) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-600 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              {toolId === 6 ? 'RESULT IMAGE' : 'GENERATION RESULT (GEMINI 3.1 PRO)'}
            </h3>
            <div className="flex items-center gap-3">
              {result && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors font-medium bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                  title="Download as Text"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
              {result && (
                <button
                  onClick={handleCopyResult}
                  className="flex items-center gap-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors font-medium px-4 py-1.5 rounded-lg shadow-sm"
                >
                  {copiedResult ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedResult ? 'Copied!' : 'Copy Result'}
                </button>
              )}
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative glass-panel p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap min-h-[100px] text-gray-800 border-emerald-100 bg-emerald-50/30 shadow-sm">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
                  <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 animate-pulse font-medium">Elite AI is crafting your content...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-100 shadow-lg bg-white p-2">
                      <img src={imageUrl} alt="Generated AI" className="w-full h-auto rounded-lg" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {result && (
                    <div className="text-gray-800 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prompt Section (The master prompt) */}
      {prompt && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2 text-blue-500 uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              MASTER PROMPT
            </h3>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-600 transition-colors font-medium"
            >
              {copiedPrompt ? <Check className="w-3 h-3 text-blue-500" /> : <Copy className="w-3 h-3" />}
              {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
            </button>
          </div>
          <div className="p-6 rounded-xl bg-gray-50 border border-gray-200 text-sm font-mono text-gray-600 whitespace-pre-wrap leading-relaxed">
            {prompt}
          </div>
        </div>
      )}
    </div>
  );
};

// Tool 1: Professional Content Suite
const ContentSuite = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({
    type: 'Article Professional',
    objective: 'Authority Building',
    tone: 'Professional',
    audience: 'Startup Founder',
    outputFormat: 'None',
    topic: '',
    mention: '',
    hashtag: '',
  });

  const isTwitter = formData.type.toLowerCase().includes('twitter');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Content Type</label>
          <select className="input-field w-full" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
            {['Article Professional', 'Twitter/X Engagement Post', 'LinkedIn Authority Post', 'Marketing Campaign', 'Project Feedback Report', 'Product Launch Content', 'Brand Storytelling', 'SEO Blog'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Objective</label>
          <select className="input-field w-full" value={formData.objective} onChange={(e) => setFormData({...formData, objective: e.target.value})}>
            {['Authority Building', 'Lead Generation', 'Sales Conversion', 'Education', 'Community Growth', 'Brand Awareness', 'Viral Engagement'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Tone Style</label>
          <select className="input-field w-full" value={formData.tone} onChange={(e) => setFormData({...formData, tone: e.target.value})}>
            {['Professional', 'Persuasive', 'Minimalist', 'Storytelling', 'Technical Expert', 'Emotional', 'Premium Luxury'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Target Audience</label>
          <select className="input-field w-full" value={formData.audience} onChange={(e) => setFormData({...formData, audience: e.target.value})}>
            {['Startup Founder', 'Creator Economy', 'Corporate', 'AI Enthusiast', 'Developer', 'General Audience'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-gray-700">Output Format (Optional)</label>
          <select className="input-field w-full" value={formData.outputFormat} onChange={(e) => setFormData({...formData, outputFormat: e.target.value})}>
            {['None', '2 tweet 240-280 character', '1 tweet 250-380 character', '1 social media caption', 'Article', 'Story', 'Tutorial'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        {isTwitter && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Mention (@)</label>
              <input 
                className="input-field w-full" 
                placeholder="e.g. @elonmusk" 
                value={formData.mention} 
                onChange={(e) => setFormData({...formData, mention: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Hashtags (#)</label>
              <input 
                className="input-field w-full" 
                placeholder="e.g. #AI #Web3" 
                value={formData.hashtag} 
                onChange={(e) => setFormData({...formData, hashtag: e.target.value})} 
              />
            </div>
          </>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Topic Details</label>
        <textarea className="input-field w-full min-h-[120px]" placeholder="Describe what you want to write about..." value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading || !formData.topic}>
        <Sparkles className="w-5 h-5" /> Generate Professional Content
      </button>
    </div>
  );
};

// Tool 2: Text to Image
const TextToImage = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({
    subject: '',
    style: 'photorealistic',
    lighting: 'cinematic lighting',
    camera: '50mm lens, shallow depth of field, bokeh',
    composition: 'close-up',
    environment: '',
    mood: 'dramatic',
    colorGrading: 'teal and orange',
    details: 'skin detail, realistic texture',
    effects: 'light leaks'
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Visual Style</label>
          <select className="input-field w-full" value={formData.style} onChange={(e) => setFormData({...formData, style: e.target.value})}>
            {['photorealistic', 'anime', 'cyberpunk', 'cinematic', 'editorial fashion'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Lighting</label>
          <select className="input-field w-full" value={formData.lighting} onChange={(e) => setFormData({...formData, lighting: e.target.value})}>
            {['cinematic lighting', 'soft natural light', 'neon glow', 'golden hour', 'studio light'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Camera & Lens</label>
          <input className="input-field w-full" placeholder="e.g. 50mm lens, bokeh" value={formData.camera} onChange={(e) => setFormData({...formData, camera: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Composition</label>
          <select className="input-field w-full" value={formData.composition} onChange={(e) => setFormData({...formData, composition: e.target.value})}>
            {['close-up', 'wide shot', 'rule of thirds', 'symmetrical'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Mood</label>
          <select className="input-field w-full" value={formData.mood} onChange={(e) => setFormData({...formData, mood: e.target.value})}>
            {['dramatic', 'vibrant', 'dark moody', 'dreamy', 'peaceful'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Color Grading</label>
          <select className="input-field w-full" value={formData.colorGrading} onChange={(e) => setFormData({...formData, colorGrading: e.target.value})}>
            {['teal and orange', 'warm tone', 'pastel', 'high contrast', 'monochrome'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Main Subject</label>
        <textarea className="input-field w-full min-h-[80px]" placeholder="What is the main subject?" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Environment Details</label>
        <textarea className="input-field w-full min-h-[80px]" placeholder="Describe the location/background..." value={formData.environment} onChange={(e) => setFormData({...formData, environment: e.target.value})} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Details (Texture, Skin, etc.)</label>
          <input className="input-field w-full" placeholder="e.g. skin detail, realistic texture" value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Effects (Rain, Fog, etc.)</label>
          <input className="input-field w-full" placeholder="e.g. light leaks, fog" value={formData.effects} onChange={(e) => setFormData({...formData, effects: e.target.value})} />
        </div>
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading || !formData.subject}>
        <ImageIcon className="w-5 h-5" /> Generate Prompt & Image
      </button>
    </div>
  );
};

// Tool 3: Text to Video
const TextToVideo = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({
    roleType: 'Cinematography',
    roleOption: 'Professional Film Director',
    genre: 'Cinematic Movie Scene',
    motion: 'Static Tripod Shot',
    aspectRatio: '16:9 (YouTube / Film Standar)',
    focus: 'Extreme Close Up',
    emotion: 'Melancholic & Lonely',
    lighting: 'Natural Soft Daylight',
    texture: 'Worn clothes, dust flying in the air',
    weather: 'Sunny Clear Sky',
    soundDesign: 'Ambient city noise',
    duration: '10s',
    description: ''
  });

  const roles = {
    'Cinematography': [
      'Professional Film Director',
      'Hollywood Cinematographer',
      'Indie Film Creator',
      'Documentary Filmmaker',
      'Award-Winning Movie Director'
    ],
    'Modern Content': [
      'Viral TikTok Creator',
      'Travel Vlogger',
      'YouTube Documentary Creator',
      'Lifestyle Content Creator',
      'Social Media Storyteller'
    ],
    'Artistic': [
      'Visual Story Artist',
      'Experimental Film Artist',
      'Fashion Film Director',
      'Music Video Director',
      'Cinematic Photographer'
    ]
  };

  const handleRoleTypeChange = (type: string) => {
    setFormData({
      ...formData,
      roleType: type,
      roleOption: roles[type as keyof typeof roles][0]
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Role Category</label>
          <select className="input-field w-full" value={formData.roleType} onChange={(e) => handleRoleTypeChange(e.target.value)}>
            {Object.keys(roles).map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Specific Role</label>
          <select className="input-field w-full" value={formData.roleOption} onChange={(e) => setFormData({...formData, roleOption: e.target.value})}>
            {roles[formData.roleType as keyof typeof roles].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Video Genre</label>
          <select className="input-field w-full" value={formData.genre} onChange={(e) => setFormData({...formData, genre: e.target.value})}>
            {['Cinematic Movie Scene', 'Documentary Realism', 'Action Thriller', 'Romantic Drama', 'Horror Atmosphere', 'Sci-Fi Futuristic', 'Fantasy Epic', 'Slice of Life Realistic', 'Travel Vlog Style', 'Cyberpunk Neo City', 'Historical Period Drama', 'Comedy Light Tone', 'Mystery Investigation', 'Post-Apocalyptic Survival', 'Commercial Advertisement Style'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Camera Motion</label>
          <select className="input-field w-full" value={formData.motion} onChange={(e) => setFormData({...formData, motion: e.target.value})}>
            {['Static Tripod Shot', 'Slow Cinematic Dolly In', 'Dolly Out Reveal Shot', 'Handheld Realistic Camera', 'Smooth Tracking Shot', 'Drone Aerial Flyover', 'Orbit Camera Movement', 'Over-the-Shoulder Follow Shot', 'Slow Push-In Emotional Shot', 'Cinematic Crane Shot'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Aspect Ratio</label>
          <select className="input-field w-full" value={formData.aspectRatio} onChange={(e) => setFormData({...formData, aspectRatio: e.target.value})}>
            {['16:9 (YouTube / Standard Film)', '9:16 (Reels / TikTok / Shorts)', '1:1 (Instagram Square)', '2.39:1 (Ultra Cinematic Scope)', '4:3 (Vintage Film Look)', '3:2 (Photography Style)', '21:9 (Ultra Wide Cinema)'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Camera Focus</label>
          <select className="input-field w-full" value={formData.focus} onChange={(e) => setFormData({...formData, focus: e.target.value})}>
            {['Extreme Close Up', 'Close Up Portrait', 'Medium Shot', 'Full Body Shot', 'Wide Environmental Shot', 'Deep Focus Scene', 'Shallow Depth of Field (Bokeh)', 'Rack Focus Transition'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Emotional Focus</label>
          <select className="input-field w-full" value={formData.emotion} onChange={(e) => setFormData({...formData, emotion: e.target.value})}>
            {['Melancholic & Lonely', 'Hopeful & Inspiring', 'Tense & Suspenseful', 'Warm & Nostalgic', 'Romantic & Soft', 'Dark & Mysterious', 'Joyful & Energetic', 'Dramatic & Epic'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Lighting</label>
          <select className="input-field w-full" value={formData.lighting} onChange={(e) => setFormData({...formData, lighting: e.target.value})}>
            {['Natural Soft Daylight', 'Golden Hour Sunset', 'Blue Hour Cinematic', 'Low Key Dramatic Lighting', 'High Key Bright Lighting', 'Neon Cyberpunk Lighting', 'Moody Shadow Lighting', 'Overcast Diffused Light'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Realism Texture Details</label>
          <select className="input-field w-full" value={formData.texture} onChange={(e) => setFormData({...formData, texture: e.target.value})}>
            {['Worn clothes, dust flying in the air', 'Wet streets, faint light reflections', 'Cracked walls and peeling paint', 'Thin smoke and visible air particles', 'Natural facial skin with clear pores', 'Mud, soil stains, and dirty shoes', 'Thin fog mixed with dim light', 'Crowded environment with messy random objects'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Weather Variations</label>
          <select className="input-field w-full" value={formData.weather} onChange={(e) => setFormData({...formData, weather: e.target.value})}>
            {['Sunny Clear Sky', 'Light Rain Drizzle', 'Heavy Rain Storm', 'Foggy Morning', 'Cloudy Overcast', 'Golden Sunset Weather', 'Windy Atmosphere', 'Thunderstorm Lightning', 'Snowfall Soft', 'Humid Tropical Heat'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Sound Design</label>
          <select className="input-field w-full" value={formData.soundDesign} onChange={(e) => setFormData({...formData, soundDesign: e.target.value})}>
            {['Ambient city noise', 'Quiet cinematic room tone', 'Wind blowing atmosphere', 'Rain ambience', 'Thunderstorm environment', 'Forest nature ambience', 'Ocean waves sound', 'Busy street market sound', 'Footsteps and fabric movement', 'Distant traffic ambience', 'Industrial mechanical background', 'Night ambience insects', 'Fire crackling sound', 'Crowd murmur atmosphere', 'Urban neon nightlife ambience'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Video Duration</label>
          <select className="input-field w-full" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})}>
            {['5s', '8s', '10s', '12s', '15s', '20s', '25s', '30s'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Main Scene Description</label>
        <textarea className="input-field w-full min-h-[100px]" placeholder="Describe the main scene..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading || !formData.description}>
        <Video className="w-5 h-5" /> Generate Video Script
      </button>
    </div>
  );
};

// Tool 4: Instant AI Meta LLM
const InstantPrompt = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({ topic: '', goal: '', keywords: '', platform: 'ChatGPT/Claude' });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Goal</label>
          <input className="input-field w-full" placeholder="e.g. Write a technical guide" value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Platform</label>
          <select className="input-field w-full" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
            {['ChatGPT/Claude', 'Midjourney', 'Stable Diffusion', 'Runway Gen-2', 'Pika Labs'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Topic & Keywords</label>
        <textarea className="input-field w-full min-h-[100px]" placeholder="Enter topic and keywords..." value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading || !formData.topic}>
        <Zap className="w-5 h-5" /> Generate Super Prompt
      </button>
    </div>
  );
};

// Tool 5: Automation Content Factory
const AutomationFactory = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({ topic: '', niche: '', platform: 'Multi-platform', goal: 'Viral Growth' });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Niche</label>
          <input className="input-field w-full" placeholder="e.g. AI SaaS, Fitness" value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Platform Target</label>
          <select className="input-field w-full" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
            {['Multi-platform', 'TikTok/Reels', 'Twitter/X', 'LinkedIn', 'YouTube'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Main Topic</label>
        <textarea className="input-field w-full min-h-[100px]" placeholder="Main Topic..." value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading || !formData.topic}>
        <Factory className="w-5 h-5" /> Generate 30 Content Pieces
      </button>
    </div>
  );
};

// Tool 6: Image Editor Generator
const ImageEditor = ({ onGenerate, loading, generatedPrompt, generatedImage }: { onGenerate: (data: any) => void; loading: boolean; generatedPrompt?: string; generatedImage?: string }) => {
  const [formData, setFormData] = useState({
    originalImage: '',
    referenceImage: '',
    mode: 'enhancement',
    style: 'photorealistic',
    lighting: 'exposure correction',
    color: 'color grading',
    detail: 'sharpen',
    instruction: '',
    refPurpose: 'style transfer',
    preservationRules: ['identity', 'pose', 'perspective', 'proportions', 'realism'],
    negativeConstraints: 'avoid distortion, artifacts, warped face, fake texture, watermark, text errors'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'originalImage' | 'referenceImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadEditedImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `edited-image-${Date.now()}.png`;
    link.click();
  };

  const preservationOptions = ['identity', 'pose', 'perspective', 'proportions', 'realism'];

  return (
    <div className="space-y-12 pb-10">
      {/* Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Source */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Original Image</h3>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider">Required</span>
          </div>
          <div className="aspect-square bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm relative group">
            {formData.originalImage ? (
              <>
                <img src={formData.originalImage} alt="Source" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, originalImage: '' }))}
                  className="absolute top-4 right-4 p-2.5 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-3">
                <div className="p-6 bg-gray-50 rounded-full border border-dashed border-gray-200">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest">No image uploaded yet</span>
              </div>
            )}
            {!formData.originalImage && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            )}
            <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'originalImage')} accept="image/*" className="hidden" />
          </div>
        </div>

        {/* Reference */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Reference Image</h3>
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-wider">Optional</span>
          </div>
          <div className="aspect-square bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm relative group">
            {formData.referenceImage ? (
              <>
                <img src={formData.referenceImage} alt="Reference" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, referenceImage: '' }))}
                  className="absolute top-4 right-4 p-2.5 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-3">
                <div className="p-6 bg-gray-50 rounded-full border border-dashed border-gray-200">
                  <Upload className="w-8 h-8" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest">Style/Color Reference</span>
              </div>
            )}
            {!formData.referenceImage && (
              <button 
                onClick={() => refInputRef.current?.click()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            )}
            <input type="file" ref={refInputRef} onChange={(e) => handleFileUpload(e, 'referenceImage')} accept="image/*" className="hidden" />
          </div>
          {formData.referenceImage && (
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Reference Purpose</label>
              <select 
                value={formData.refPurpose}
                onChange={(e) => setFormData({...formData, refPurpose: e.target.value})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-semibold text-gray-900 focus:ring-2 ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
              >
                {['style transfer', 'color reference', 'lighting reference', 'character consistency'].map(opt => (
                  <option key={opt} value={opt}>{opt.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">AI Edited Result</h3>
            {generatedImage && <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-wider">Done</span>}
          </div>
          <div className="aspect-square bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm relative group">
            <AnimatePresence mode="wait">
              {generatedImage ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full relative"
                >
                  <img src={generatedImage} alt="Edited" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={downloadEditedImage}
                      className="p-4 bg-white text-gray-900 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]"
                    >
                      <Download className="w-4 h-4 text-blue-600" /> Download
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-3">
                  <div className="p-6 bg-gray-50 rounded-full border border-dashed border-gray-200">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest">AI edit result will appear here</span>
                </div>
              )}
            </AnimatePresence>

            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-10">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-blue-600 animate-pulse uppercase tracking-widest text-[10px]">AI is editing...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Master Prompt Display */}
      <AnimatePresence>
        {generatedPrompt && generatedImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Optimized Master Prompt</h3>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedPrompt);
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                Copy Prompt
              </button>
            </div>
            <div className="bg-black/50 rounded-2xl p-6 border border-gray-800">
              <pre className="text-gray-400 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                {generatedPrompt}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Controls Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-[2.5rem] p-8 lg:p-12 shadow-sm space-y-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Edit Mode */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Edit Mode</label>
            <select 
              value={formData.mode}
              onChange={(e) => setFormData({...formData, mode: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-900 focus:ring-2 ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
            >
              {['enhancement', 'inpainting', 'outpainting', 'relighting', 'recolor', 'retouch', 'style transfer', 'object replace'].map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Style Control */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Style Control</label>
            <select 
              value={formData.style}
              onChange={(e) => setFormData({...formData, style: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-900 focus:ring-2 ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
            >
              {['photorealistic', 'cinematic', 'fashion editorial', 'anime style', 'luxury commercial'].map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Lighting */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Lighting Adjustment</label>
            <select 
              value={formData.lighting}
              onChange={(e) => setFormData({...formData, lighting: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-900 focus:ring-2 ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
            >
              {['exposure correction', 'cinematic lighting', 'shadow balance'].map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Grading Adjustment</label>
            <select 
              value={formData.color}
              onChange={(e) => setFormData({...formData, color: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-900 focus:ring-2 ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
            >
              {['color grading', 'tone adjustment', 'white balance'].map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Detail */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Detail Enhancement</label>
            <select 
              value={formData.detail}
              onChange={(e) => setFormData({...formData, detail: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-900 focus:ring-2 ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
            >
              {['sharpen', 'denoise', 'texture recovery'].map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Preservation Rules */}
          <div className="space-y-3 lg:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Preservation Rules</label>
            <div className="flex flex-wrap gap-3">
              {preservationOptions.map(rule => (
                <button
                  key={rule}
                  onClick={() => {
                    const newRules = formData.preservationRules.includes(rule)
                      ? formData.preservationRules.filter(r => r !== rule)
                      : [...formData.preservationRules, rule];
                    setFormData({...formData, preservationRules: newRules});
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    formData.preservationRules.includes(rule)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  {rule}
                </button>
              ))}
            </div>
          </div>

          {/* Negative Constraints */}
          <div className="space-y-3 lg:col-span-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Negative Constraints</label>
            <textarea
              value={formData.negativeConstraints}
              onChange={(e) => setFormData({...formData, negativeConstraints: e.target.value})}
              rows={2}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none placeholder:text-gray-300 text-xs font-medium"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-1 ml-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Edit Instruction</label>
              <p className="text-[9px] text-gray-400 italic">Feel free to type anything you want to edit in the box below.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                'remove background', 'change outfit', 'make cinematic lighting', 'upscale image', 'fix face', 'add object',
                'change background', 'recolor hair', 'add sunglasses', 'make it sunset', 'add snow effect', 'make it vintage',
                'add neon glow', 'remove object', 'change eye color', 'add tattoos', 'make it anime style', 'add rain effect',
                'change season to autumn', 'make it black and white'
              ].map(action => (
                <button
                  key={action}
                  onClick={() => {
                    const current = formData.instruction.trim();
                    const newValue = current ? `${current}, ${action}` : action;
                    setFormData({...formData, instruction: newValue});
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-6">
            <textarea
              value={formData.instruction}
              onChange={(e) => setFormData({...formData, instruction: e.target.value})}
              placeholder="Describe exactly what you want to change..."
              rows={4}
              className="w-full px-8 py-6 bg-gray-50 border border-gray-100 rounded-[2rem] focus:ring-4 ring-blue-500/5 focus:border-blue-500 outline-none transition-all resize-none placeholder:text-gray-300 text-base font-medium"
            />
            
            <div className="flex justify-end">
              <button
                onClick={() => onGenerate(formData)}
                disabled={loading || !formData.originalImage || !formData.instruction.trim()}
                className="px-12 py-5 bg-blue-600 text-white font-bold rounded-[1.5rem] shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3 text-xs uppercase tracking-widest"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {loading ? 'Processing...' : 'Apply AI Edit'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Tool 7: Viral Shorts Factory
const ViralShorts = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({ product: '', audience: '', problem: '', platform: 'TikTok' });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Target Audience</label>
          <input className="input-field w-full" placeholder="e.g. Busy Professionals" value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Platform</label>
          <select className="input-field w-full" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
            {['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Multi-platform'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Product/Topic</label>
        <textarea className="input-field w-full min-h-[80px]" placeholder="Product/Topic..." value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Main Problem Solved</label>
        <textarea className="input-field w-full min-h-[80px]" placeholder="Main Problem Solved..." value={formData.problem} onChange={e => setFormData({...formData, problem: e.target.value})} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading || !formData.product}>
        <RefreshCw className="w-5 h-5" /> Generate 30 Viral Contents
      </button>
    </div>
  );
};

// Tool 8: Cinematic AI Film
const CinematicFilm = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({ title: '', idea: '', genre: 'Cinematic Drama' });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Film Title</label>
          <input className="input-field w-full" placeholder="Enter title..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Genre</label>
          <select className="input-field w-full" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})}>
            {['Cinematic Drama', 'Sci-Fi', 'Documentary', 'Thriller', 'Luxury Commercial', 'Cyberpunk', 'Fantasy', 'Noir'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Core Idea / Message</label>
        <textarea className="input-field w-full min-h-[100px]" placeholder="Core Idea / Message..." value={formData.idea} onChange={e => setFormData({...formData, idea: e.target.value})} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading || !formData.idea}>
        <Clapperboard className="w-5 h-5" /> Generate Film Sequence
      </button>
    </div>
  );
};

// Tool 9: Master Sound Generator
const SoundGenerator = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({ genre: 'Cinematic', bpm: '120', mood: 'Epic' });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Genre</label>
          <select className="input-field w-full" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})}>
            {['Cinematic', 'Ambient', 'EDM', 'Lo-Fi', 'Epic Orchestra', 'Horror', 'Meditation'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">BPM</label>
          <input className="input-field w-full" type="number" value={formData.bpm} onChange={e => setFormData({...formData, bpm: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Mood</label>
          <input className="input-field w-full" placeholder="e.g. Dark, Uplifting" value={formData.mood} onChange={e => setFormData({...formData, mood: e.target.value})} />
        </div>
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading}>
        <Volume2 className="w-5 h-5" /> Generate Sound Prompt
      </button>
    </div>
  );
};

// Tool 10: AI Voice / Narration
const VoiceGenerator = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [formData, setFormData] = useState({ gender: 'Male', age: 'Adult', emotion: 'Professional', script: '' });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Gender</label>
          <select className="input-field w-full" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
            <option>Male</option><option>Female</option><option>Neutral</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Age</label>
          <select className="input-field w-full" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})}>
            <option>Child</option><option>Teen</option><option>Adult</option><option>Senior</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Emotion</label>
          <select className="input-field w-full" value={formData.emotion} onChange={e => setFormData({...formData, emotion: e.target.value})}>
            <option>Professional</option><option>Excited</option><option>Calm</option><option>Dramatic</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Script / Topic</label>
        <textarea className="input-field w-full min-h-[120px]" placeholder="Enter script or topic..." value={formData.script} onChange={e => setFormData({...formData, script: e.target.value})} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate(formData)} disabled={loading || !formData.script}>
        <Mic className="w-5 h-5" /> Generate Narration Script
      </button>
    </div>
  );
};

// Tool 11: One Prompt → Full Video
const FullVideo = ({ onGenerate, loading }: { onGenerate: (data: any) => void; loading: boolean }) => {
  const [topic, setTopic] = useState('');
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Video Topic</label>
        <textarea className="input-field w-full min-h-[150px]" placeholder="Create a cinematic video about..." value={topic} onChange={e => setTopic(e.target.value)} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate({ topic })} disabled={loading || !topic}>
        <Sparkles className="w-5 h-5" /> Generate Full Video Plan
      </button>
    </div>
  );
};

// Tool 12 & 13: Reverse Engineering
const ReverseExtractor = ({ type, onGenerate, loading }: { type: 'image' | 'video'; onGenerate: (data: any) => void; loading: boolean }) => {
  const [description, setDescription] = useState('');
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 font-medium">Describe the {type} you want to reverse engineer into a prompt.</p>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">{type === 'image' ? 'Image' : 'Video'} Details</label>
        <textarea className="input-field w-full min-h-[150px]" placeholder={`Describe the ${type} details...`} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <button className="btn-primary w-full" onClick={() => onGenerate({ description })} disabled={loading || !description}>
        <Search className="w-5 h-5" /> Extract Prompt
      </button>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeCategory, setActiveCategory] = useState<Category>('content');
  const [activeTool, setActiveTool] = useState<Tool>(TOOLS[0]);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generatedResult, setGeneratedResult] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Web3 & Firebase State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              walletAddress: '',
              credits: 100, // Give 100 free credits to start
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
        
        // Listen to user credits
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setCredits(docSnap.data().credits || 0);
            setWalletAddress(docSnap.data().walletAddress || '');
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        });
      } else {
        setUser(null);
        setCredits(0);
        setWalletAddress('');
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum && !window.okxwallet) {
      alert('Please install MetaMask or OKX Wallet');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum || window.okxwallet);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      
      setWalletAddress(address);

      // Save to Firebase
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              walletAddress: address,
              credits: 0,
              updatedAt: new Date().toISOString()
            });
          } else {
            await updateDoc(userRef, {
              walletAddress: address,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const handleGenerate = async (data: any) => {
    if (credits < 10) {
      setShowBuyCredits(true);
      return;
    }

    setLoading(true);
    setGeneratedPrompt('');
    setGeneratedResult('');
    setGeneratedImage('');

    let systemInstruction = "";
    
    // Extract images if present
    const images: string[] = [];
    const cleanData = { ...data };
    if (data.originalImage) {
      images.push(data.originalImage);
      delete cleanData.originalImage;
    }
    if (data.referenceImage) {
      images.push(data.referenceImage);
      delete cleanData.referenceImage;
    }

    const dualOutputTools = [1, 4, 2, 6, 12, 13, 3, 7, 8, 11];
    const isDualOutput = dualOutputTools.includes(activeTool.id);

    let userInput = JSON.stringify(cleanData);

    switch (activeTool.id) {
      case 1:
        systemInstruction = `
        You are an expert Copywriter. Your goal is to generate a single, high-quality, READY-TO-PUBLISH content piece based on the user's input.
        
        Inputs: ${userInput}
        
        Instructions:
        - Do not provide a suite of options or meta-commentary.
        - Generate ONLY the final content (e.g., the actual tweet, post, or article).
        - If the content type is a social media post (Twitter, LinkedIn, etc.), ensure it is engaging, concise, and follows platform best practices.
        - If Mentions (@) are provided, incorporate them naturally.
        - If Hashtags (#) are provided, append them at the end.
        - Maintain the requested Tone and address the Target Audience.
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": The professional Master Prompt used to generate this content.
        - "result": The actual generated content piece.
        `;
        break;
      case 2:
        systemInstruction = `
        You are an expert AI Visual Director and Prompt Engineer.
        Generate a highly detailed, technical, and artistic image generation prompt.
        
        Inputs: ${userInput}
        
        Include specific details: Subject, Style, Lighting, Camera, and Color Grade.
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": Put ONLY the complete optimized text-to-image prompt here.
        - "result": Put the FULL structured breakdown (ROLE, GOAL, IMAGE TITLE, etc.) here.
        `;
        break;
      case 3:
        systemInstruction = `
        You are an Elite Cinematic Video Prompt Engineer.
        Generate a highly detailed cinematic text-to-video prompt using this structure:
        [GENRE] + [CAMERA MOTION] + [ASPECT RATIO] + [LENS/FOCUS] + [EMOTIONAL TONE] + [LIGHTING] + [TEXTURE/REALISM] + [WEATHER/ATMOSPHERE] + [SOUND DESIGN CUE]
        
        Inputs: ${userInput}
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": Put ONLY the complete optimized text-to-video prompt here.
        - "result": Put a detailed breakdown of the scene and why choices were made.
        `;
        break;
      case 4:
        systemInstruction = `
        You are a Meta-Prompt Architect. 
        Transform the user's simple topic into an expert-level "Super Prompt".
        
        Inputs: ${userInput}
        
        The Super Prompt should include: 
        - Role Definition
        - Context & Constraints
        - Step-by-Step Reasoning (Chain of Thought)
        - Output Format Specifications
        - Negative Constraints
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": The professional Master Prompt used to generate this.
        - "result": The actual Super Prompt itself, ready to be pasted into another AI.
        `;
        break;
      case 5:
        systemInstruction = `
        You are a Content Automation Master. 
        Generate 30 distinct, high-quality content pieces. 
        
        Inputs: ${userInput}
        
        Include:
        - 5 Blog Post Intros
        - 5 Twitter/X Threads
        - 5 Short-form Video Scripts
        - 5 Viral Hooks
        - 5 Instagram/LinkedIn Captions
        - 5 Unique Content Angles
        
        Provide the ACTUAL FINAL TEXT.
        `;
        break;
      case 6:
        systemInstruction = `
        You are an Advanced AI Image Manipulation Expert.
        Generate a highly detailed prompt for an image-to-image AI model to perform the requested edit.
        
        Inputs: ${userInput}
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": The professional Master Prompt used to generate this.
        - "result": A detailed breakdown of the edits being made.
        `;
        break;
      case 7:
        systemInstruction = `
        You are a Viral Affiliate Marketing Expert. 
        Generate 30 distinct, high-converting affiliate content pieces. 
        
        Inputs: ${userInput}
        
        Organize into: 10 Hooks, 10 Problem-Solution Scripts, 10 Trust-Building Captions.
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": The professional Master Prompt used to generate this.
        - "result": The actual generated content.
        `;
        break;
      case 8:
        systemInstruction = `
        You are an Award-Winning Film Director. 
        Create a detailed cinematic film sequence prompt. 
        
        Inputs: ${userInput}
        
        Structure:
        - ACT 1: The Setup
        - ACT 2: The Conflict/Action
        - ACT 3: The Resolution
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": Put ONLY the complete optimized film prompt here.
        - "result": Put the FULL structured breakdown (ACT 1-3, SHOT LIST, etc.) here.
        `;
        break;
      case 9:
        systemInstruction = `
        You are a Master Sound Designer. 
        Generate a professional sound generation prompt.
        
        Inputs: ${userInput}
        
        Include: Genre, BPM, Instrument Layers, Spatial Audio Details, and Atmospheric Texture.
        `;
        break;
      case 10:
        systemInstruction = `
        You are a Professional Voiceover Scriptwriter. 
        Generate a final, polished narration script. 
        
        Inputs: ${userInput}
        
        Include emotional cues in brackets.
        `;
        break;
      case 11:
        systemInstruction = `
        You are a Full-Stack Video Production AI. 
        Generate a complete, ready-to-produce video production plan.
        
        Inputs: ${userInput}
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": Put ONLY the complete optimized video prompt here.
        - "result": Put the FULL structured breakdown (Visuals, Camera, Music, Script, etc.) here.
        `;
        break;
      case 12:
        systemInstruction = `
        You are a Reverse Engineering Image Expert. 
        Deconstruct the described image into its core DNA.
        
        Inputs: ${userInput}
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": The professional Master Prompt used to generate this.
        - "result": The full deconstructed breakdown.
        `;
        break;
      case 13:
        systemInstruction = `
        You are a Video Analysis & Deconstruction Expert. 
        Analyze the described video into scene breakdowns and shot types.
        
        Inputs: ${userInput}
        
        JSON OUTPUT INSTRUCTIONS:
        - "prompt": The professional Master Prompt used to generate this.
        - "result": The full deconstructed breakdown.
        `;
        break;
    }

    const result = await generateOptimizedPrompt(systemInstruction, userInput, images, {
      responseMimeType: isDualOutput ? "application/json" : "text/plain",
      responseSchema: isDualOutput ? {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING },
          result: { type: Type.STRING }
        },
        required: ["prompt"]
      } : undefined
    });

    if (isDualOutput) {
      try {
        const parsed = JSON.parse(result);
        setGeneratedPrompt(parsed.prompt || "");
        setGeneratedResult(parsed.result || "");
      } catch (e) {
        setGeneratedPrompt(result);
      }
    } else {
      setGeneratedPrompt(result);
    }

    if ((activeTool.id === 2 || activeTool.id === 6) && !result.startsWith("Error:")) {
      try {
        const promptToUse = isDualOutput ? (JSON.parse(result).prompt || result) : result;
        const imageUrl = await generateImage(promptToUse, activeTool.id === 6 ? images : []);
        setGeneratedImage(imageUrl);
      } catch (error) {
        console.error("Image generation failed:", error);
      }
    }

    // Deduct credits
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, {
          credits: increment(-10)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }

    setLoading(false);
  };

  const filteredTools = TOOLS.filter(t => t.category === activeCategory);

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8F9FA] p-8">
        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-2xl mb-8">
        <img src="/nuflorenz.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Genlayer Studio AI</h1>
        <p className="text-gray-500 mb-8 text-center max-w-sm">
          Connect your account to access elite AI tools and manage your credits.
        </p>
        <button 
          onClick={loginWithGoogle}
          className="px-8 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 font-bold text-gray-700"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden text-gray-900">
      {/* Buy Credits Modal */}
      <AnimatePresence>
        {showBuyCredits && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setShowBuyCredits(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Trash2 className="w-5 h-5 text-gray-400" />
              </button>
              
              <div className="p-8">
                <BuyCredits 
                  walletAddress={walletAddress} 
                  onClose={() => setShowBuyCredits(false)}
                  onSuccess={(added) => {
                    // Success notification could go here
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="border-r border-gray-200 bg-white flex-shrink-0 overflow-hidden hidden md:flex flex-col shadow-sm"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg">
            <img src="/nuflorenz.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-gray-900">Genlayer</h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Studio AI</p>
            </div>
          </div>

          <nav className="space-y-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as Category);
                  setActiveTool(TOOLS.find(t => t.category === cat.id)!);
                  setGeneratedPrompt('');
                }}
                className={`sidebar-item w-full ${activeCategory === cat.id ? 'active' : ''}`}
              >
                <cat.icon className={`w-5 h-5 ${activeCategory === cat.id ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="font-semibold">{cat.name}</span>
              </button>
            ))}
          </nav>

          {/* Credits & Wallet */}
          <div className="mt-8 space-y-4 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">{credits} Credits</span>
              </div>
              <button 
                onClick={() => setShowBuyCredits(true)}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
              >
                Top Up
              </button>
            </div>

            {walletAddress ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Wallet className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-mono text-gray-500 truncate">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>

          {/* User Profile & Logout */}
          <div className="mt-auto p-6 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}`} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-900 truncate">{user.displayName || 'AI User'}</p>
                <p className="text-[9px] text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3 h-3" />
              Sign Out
            </button>
          </div>

          <div className="p-6 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-4 text-[10px] text-gray-500 font-medium">
            <p>Professional Prompt Toolkit v1.0</p>
            <p className="mt-1">Powered by Gemini AI</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 md:block hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <LayoutDashboard className="w-4 h-4" />
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-gray-900 font-semibold">{CATEGORIES.find(c => c.id === activeCategory)?.name}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-emerald-600 font-bold">{activeTool.name}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">System Online</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Tool Selector (Horizontal for the category) */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {filteredTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool);
                    setGeneratedPrompt('');
                  }}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTool.id === tool.id 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {tool.name}
                </button>
              ))}
            </div>

            {/* Active Tool Panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-8 shadow-xl shadow-gray-200/50"
              >
                <div className="flex items-start gap-4 mb-8">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                    <activeTool.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{activeTool.name}</h2>
                    <p className="text-gray-500 text-sm mt-1 font-medium">{activeTool.description}</p>
                  </div>
                </div>

                {/* Dynamic Tool Form */}
                {activeTool.id === 1 && <ContentSuite onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 2 && <TextToImage onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 3 && <TextToVideo onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 4 && <InstantPrompt onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 5 && <AutomationFactory onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 6 && <ImageEditor onGenerate={handleGenerate} loading={loading} generatedPrompt={generatedPrompt} generatedImage={generatedImage} />}
                {activeTool.id === 7 && <ViralShorts onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 8 && <CinematicFilm onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 9 && <SoundGenerator onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 10 && <VoiceGenerator onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 11 && <FullVideo onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 12 && <ReverseExtractor type="image" onGenerate={handleGenerate} loading={loading} />}
                {activeTool.id === 13 && <ReverseExtractor type="video" onGenerate={handleGenerate} loading={loading} />}

                {activeTool.id !== 6 && (
                  <PromptOutput 
                    prompt={generatedPrompt} 
                    result={generatedResult}
                    imageUrl={generatedImage} 
                    loading={loading} 
                    toolId={activeTool.id}
                    outputType={activeTool.outputType}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Info */}
        <footer className="p-4 text-center text-[10px] text-gray-400 font-bold border-t border-gray-100 bg-white">
          GENLAYER STUDIO AI &copy; 2026 • PROFESSIONAL PROMPT ENGINEERING SYSTEM
        </footer>
      </main>
    </div>
  );
}
