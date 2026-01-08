'use client';


import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Plus, Loader2, ArrowLeft, Orbit, Mic, Type, Image as ImageIcon, X, Send, StopCircle, Globe, Wand2, Sparkles, Check, Search, Hash, MapPin, Smile, Network, Quote, Lock, Unlock, Heart, Play, Pause, Volume2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { Inspiration } from '../types';
import { FAMILIES } from '../App';
import { editImageInspiration, mergePoeticInspirations } from '../services/geminiService';
import { ParticleImage } from './ParticleImage';

const POETIC_POOL = [
  "时间在此时坍缩成点",
  "万物皆为星尘的呼吸",
  "寂静是宇宙最深的底噪",
  "光是亿万年前的告白",
  "我们在逻辑的尽头拥抱感性",
  "意识是维度间的涟漪",
  "暗物质里藏着未说的秘密",
  "每一颗原子的相遇都是久别重逢",
  "引力是孤独在寻找共鸣"
];

const SEARCH_CATEGORIES = [
  {
    id: 'scene',
    label: '场景 · SCENE',
    icon: <MapPin size={12} />,
    tags: ['风景', '夜晚', '城市', '自然']
  },
  {
    id: 'emotion',
    label: '情绪 · EMOTION',
    icon: <Smile size={12} />,
    tags: ['平静', '焦虑', '喜悦', '沉思']
  },
  {
    id: 'abstract',
    label: '主题 · THEME',
    icon: <Hash size={12} />,
    tags: ['未来', '记忆', '孤独', '灵感']
  }
];

// --- TEXT MUTATION TEMPLATES ---
const VARIANT_TEMPLATES = [
  {
    // Mode 1: Skeptic/Inversion
    name: "Inverse",
    titleTransform: (t: string) => `反转：${t}`,
    contentTransform: (c: string) => {
      const segments = c.split(/[，。！？]/).filter(s => s.length > 2);
      const main = segments[0] || c;
      return `"${main}"……但如果这只是观测者的错觉？在事物的反面，逻辑也许并不成立。我们看见的光，或许是黑暗的影子。`;
    }
  },
  {
    // Mode 2: Fragment/Decay
    name: "Decay",
    titleTransform: (t: string) => `残响：${t.substring(0, Math.min(t.length, 4))}...`,
    contentTransform: (c: string) => {
      const chars = c.split('');
      const fragmented = chars.filter((_, i) => i % 3 !== 0).join('');
      return `数据丢失……${fragmented} ……信号源无法确认。记忆正在熵增中瓦解。`;
    }
  },
  {
    // Mode 3: Future/Expansion
    name: "Echo",
    titleTransform: (t: string) => `回响：${t}`,
    contentTransform: (c: string) => {
      return `基于"${c.substring(0, 10)}..."的推演：如果在五维空间审视这段因果，结局早已注定。这是来自未来的回声。`;
    }
  },
  {
    // Mode 4: Distortion/Dream
    name: "Dream",
    titleTransform: (t: string) => `异化：${t}`,
    contentTransform: (c: string) => {
      const segments = c.split('').reverse().join('');
      return `梦境逻辑：${c} ... 或者说是... ${segments.substring(0, 10)}？真实与虚幻的界限已溶解。`;
    }
  }
];

// --- Meteor Shower Component ---
const MeteorShower: React.FC<{ active: boolean, themeColor: string, refreshKey?: number, likeCount?: number }> = ({ active, themeColor, refreshKey = 0, likeCount = 0 }) => {
  const [meteors, setMeteors] = useState<{ id: number, color: string, delay: number, duration: number, top: number, right: number, size: number }[]>([]);
  const allColors = FAMILIES.map(f => f.baseColor);

  useEffect(() => {
    if (active) {
      // Update: Meteor count is exactly 1/4 of the like count
      const calculateMeteorCount = (likes: number) => {
        return Math.floor(Math.max(0, likes) / 4);
      };

      const totalCount = calculateMeteorCount(likeCount);
      const newMeteors: any[] = [];
      
      // Creating waves of meteors to prevent too many starting at once if count is high
      const numWaves = totalCount > 40 ? 4 : (totalCount > 10 ? 2 : 1);
      const meteorsPerWave = Math.ceil(totalCount / numWaves);
      
      for (let w = 0; w < numWaves; w++) {
        const waveBaseDelay = w * 0.25;
        for (let i = 0; i < meteorsPerWave; i++) {
          if (newMeteors.length >= totalCount) break;
          
          // Color Logic: 60% Theme, 30% White, 10% Random
          const rand = Math.random();
          let color;
          if (rand < 0.6) {
             color = themeColor;
          } else if (rand < 0.9) {
             color = '#FFFFFF';
          } else {
             color = allColors[Math.floor(Math.random() * allColors.length)];
          }

          newMeteors.push({
            id: Math.random(),
            color,
            delay: waveBaseDelay + Math.random() * 0.6, 
            duration: 0.8 + Math.random() * 1.2,
            top: Math.random() * 30 - 5, // Start from top -5% to 25% area
            right: Math.random() * 45 - 40, // Start from right -40% to 5% area
            size: 0.6 + Math.random() * 1.6
          });
        }
      }
      setMeteors(newMeteors);
      
      // Cleanup after animation
      const timer = setTimeout(() => setMeteors([]), 8000);
      return () => clearTimeout(timer);
    }
  }, [active, themeColor, refreshKey, likeCount]);

  if (meteors.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <style>{`
        @keyframes meteor-streak {
          0% { opacity: 1; transform: translate(0, 0) rotate(135deg) scale(1); }
          100% { opacity: 0; transform: translate(-150vh, 150vh) rotate(135deg) scale(0.5); }
        }
      `}</style>
      {meteors.map(m => (
        <div
          key={m.id}
          className="absolute"
          style={{
            top: `${m.top}%`,
            right: `${m.right}%`,
            width: `${240 * m.size}px`, 
            height: `${3.5 * m.size}px`,
            // Gradient tail: transparent at left (tail), color at right (head)
            background: `linear-gradient(to left, ${m.color}FF 0%, ${m.color}99 35%, ${m.color}22 65%, transparent 100%)`,
            boxShadow: `0 0 35px ${m.color}44`,
            opacity: 0,
            animation: `meteor-streak ${m.duration}s cubic-bezier(0.2, 0.1, 0.25, 1.0) ${m.delay}s forwards`,
            clipPath: 'polygon(0% 50%, 82% 12%, 100% 50%, 82% 88%, 0% 50%)' // Arrow/Meteor shape pointing Right by default
          }}
        >
          {/* Head of the meteor */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white" style={{ width: `${10 * m.size}px`, height: `${10 * m.size}px`, boxShadow: `0 0 40px 10px white, 0 0 60px 18px ${m.color}`, filter: 'blur(0.3px)' }} />
        </div>
      ))}
    </div>
  );
};

// --- Heart Explosion Particles ---
const HeartExplosion = () => {
  const particles = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-20">
      {particles.map((_, i) => {
        const angle = (i / 12) * 360; 
        const dist = 18 + Math.random() * 12; // Distance from center
        const delay = Math.random() * 0.1;
        const size = 2 + Math.random() * 2;
        
        // Convert to Cartesian
        const radian = (angle * Math.PI) / 180;
        const tx = Math.cos(radian) * dist;
        const ty = Math.sin(radian) * dist;

        return (
          <div
            key={i}
            className="absolute bg-red-500 rounded-full animate-heart-particle opacity-0"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animationDelay: `${delay}s`,
              boxShadow: '0 0 4px rgba(239,68,68, 0.6)'
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
};

// --- Nebula Navigator (Finite List / No Duplicates) ---
const NebulaNavigator: React.FC<{
  items: Inspiration[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  themeColor: string;
}> = ({ items, selectedId, onSelect, themeColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevSelectedId = useRef<string | null>(null);
  
  // Physics state managed in ref to avoid re-renders during 60fps animation
  const state = useRef({
    current: 0,       // Current floating index position
    target: 0,        // Target integer index
    isDragging: false,
    dragStartY: 0,
    dragStartX: 0,
    dragStartCurrent: 0,
  });

  // Sync scroll position when selectedId changes (Context Switching)
  useEffect(() => {
     if (selectedId) {
        const rawId = selectedId.split('_link_')[0];
        const idx = items.findIndex(i => i.id === rawId);
        
        if (idx !== -1) {
            const currentPos = state.current.current;
            const diff = Math.abs(idx - currentPos);
            
            // Condition 1: Transition from Level 2 (null) to Level 3
            // Condition 2: Item is far off-screen / invisible (keep it accessible)
            const wasNull = prevSelectedId.current === null;
            const isOffScreen = diff > 2.0; 
            
            if (wasNull || isOffScreen) {
                state.current.target = idx;
                // If entering from Level 2, snap instantly to avoid disorienting scroll
                if (wasNull) {
                    state.current.current = idx;
                }
            }
        }
     }
     prevSelectedId.current = selectedId;
  }, [selectedId, items]);

  // Main Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    
    const update = () => {
      const s = state.current;
      const len = items.length;
      
      // Clamp target to bounds [0, len-1]
      s.target = Math.max(0, Math.min(len - 1, s.target));
      
      if (!s.isDragging) {
        const diff = s.target - s.current;
        if (Math.abs(diff) > 0.001) {
            s.current += diff * 0.15;
        } else {
            s.current = s.target;
        }
      }
      
      const ITEM_HEIGHT = 50; // Distance between items
      
      // Update DOM nodes directly for performance
      items.forEach((item, i) => {
        const el = itemRefs.current[i];
        if (!el) return;

        // Calculate offset without wrapping (Finite List) - Physics based on scroll
        const offset = i - s.current;
        const dist = Math.abs(offset);
        
        // Visibility Optimization
        if (dist > 3.0) {
           el.style.opacity = '0';
           el.style.pointerEvents = 'none';
           return;
        }
        el.style.pointerEvents = 'auto';
        
        // Visual Calculations based on scroll position (Fisheye effect)
        const y = offset * ITEM_HEIGHT;
        const scale = 1.0 - Math.min(dist, 1) * 0.15;
        const opacity = 1.0 - Math.min(dist, 1) * 0.6;
        
        // Apply transform
        el.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
        el.style.opacity = opacity.toFixed(2);
        
        // Silky Color Interpolation via DOM manipulation
        const textWrapper = el.children[0] as HTMLElement;
        const dotWrapper = el.children[1] as HTMLElement;
        const themeDot = dotWrapper.children[0] as HTMLElement;
        const whiteDot = dotWrapper.children[1] as HTMLElement;
        
        // Text slide animation
        const xShift = Math.min(dist, 1) * 8;
        textWrapper.style.transform = `translateX(${xShift}px)`;
        
        // Highlight Logic: 
        // 1. If an item is Selected, that item is Bright (regardless of scroll pos).
        // 2. If NO item is Selected (browsing), the Center item is Bright.
        let isHighlight = false;
        if (selectedId) {
            const rawSelected = selectedId.split('_link_')[0];
            isHighlight = item.id === rawSelected;
        } else {
            isHighlight = dist < 0.5;
        }

        // Text Visibility
        textWrapper.style.opacity = isHighlight ? '1' : '0';

        // Dot Styling
        if (themeDot && whiteDot) {
            if (isHighlight) {
                // Bright active dot
                themeDot.style.opacity = '1';
                themeDot.style.transform = 'scale(1.0)';
                whiteDot.style.opacity = '0';
            } else {
                // Dim inactive dot
                themeDot.style.opacity = '0';
                const inactiveVisibility = 1.0 - Math.min(dist, 1.5) * 0.6;
                whiteDot.style.opacity = (inactiveVisibility * 0.4).toFixed(2);
            }
        }
      });
      
      animationFrameId = requestAnimationFrame(update);
    };
    
    update();
    return () => cancelAnimationFrame(animationFrameId);
  }, [items, themeColor, selectedId]); 
  
  const handlePointerDown = (e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      state.current.isDragging = true;
      state.current.dragStartY = e.clientY;
      state.current.dragStartCurrent = state.current.current;
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
      if (!state.current.isDragging) return;
      e.preventDefault();
      const deltaY = e.clientY - state.current.dragStartY;
      const ITEM_HEIGHT = 50;
      const rawNext = state.current.dragStartCurrent - (deltaY / ITEM_HEIGHT);
      state.current.current = Math.max(-0.5, Math.min(items.length - 0.5, rawNext));
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
      if (!state.current.isDragging) return;
      state.current.isDragging = false;
      
      const deltaY = Math.abs(e.clientY - state.current.dragStartY);
      const ITEM_HEIGHT = 50;

      if (deltaY < 5) {
          // Click detection logic
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
             const centerY = rect.top + rect.height / 2;
             const clickOffset = (e.clientY - centerY) / ITEM_HEIGHT;
             const clickedIndex = Math.round(state.current.current + clickOffset);
             
             if (clickedIndex >= 0 && clickedIndex < items.length) {
                 onSelect(items[clickedIndex].id);
             }
          }
      } else {
          // Snap scroll to nearest integer item
          state.current.target = Math.round(state.current.current);
      }
      
      (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <div 
        ref={containerRef}
        className="fixed right-6 top-1/2 -translate-y-1/2 h-[160px] w-48 z-[60] touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={(e) => {
            state.current.target += Math.sign(e.deltaY) * 1.0;
        }}
    >
        {/* Anchor point: Center of the container */}
        <div className="absolute top-1/2 right-0 w-full h-0"> 
            {items.map((item, i) => (
                <div
                   key={item.id}
                   ref={el => { itemRefs.current[i] = el; }}
                   className="absolute top-0 right-0 flex items-center justify-end gap-4 w-full h-0 origin-right transition-none will-change-transform"
                >
                    {/* Text */}
                    <div className="flex flex-col items-end transition-none">
                         <span className="serif-font text-white text-sm tracking-[0.2em] whitespace-nowrap drop-shadow-md">{item.title}</span>
                    </div>
                    
                    {/* Dot Container */}
                    <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                         <div className="absolute inset-0 rounded-full z-10 transition-none" style={{ backgroundColor: themeColor, boxShadow: `0 0 12px ${themeColor}` }} />
                         <div className="absolute inset-0 rounded-full bg-white transition-none" /> 
                    </div>
                </div>
            ))}
        </div>
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/0 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/0 to-transparent pointer-events-none" />
    </div>
  );
};

// --- Audio Player Component ---
const AudioPlayer = ({ base64Audio, themeColor }: { base64Audio: string, themeColor: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Construct the audio element once
        const audio = new Audio(base64Audio);
        audio.onended = () => setIsPlaying(false);
        audioRef.current = audio;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        }
    }, [base64Audio]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="flex items-center gap-4 py-3 px-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <button 
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95"
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                     <Volume2 size={12} className="text-white/40" />
                     <span className="text-[10px] uppercase tracking-widest text-white/60">Voice Note</span>
                 </div>
                 <div className="flex items-center gap-1 h-3 w-32">
                     {/* Fake visualizer bars */}
                     {Array.from({ length: 16 }).map((_, i) => (
                         <div 
                            key={i} 
                            className="w-1 bg-white/30 rounded-full transition-all duration-300"
                            style={{ 
                                height: isPlaying ? `${30 + Math.random() * 70}%` : '30%',
                                backgroundColor: isPlaying ? themeColor : 'rgba(255,255,255,0.3)',
                                opacity: isPlaying ? 0.8 : 0.3
                            }}
                         />
                     ))}
                 </div>
            </div>
        </div>
    );
};


interface UIOverlayProps {
  inspirations: Inspiration[];
  onAddInspiration: (type: 'text' | 'voice' | 'image', data: string, targetFamily?: string) => Promise<void>;
  onUpdateInspiration?: (id: string, newMediaData: string) => void;
  onSelect: (id: string) => void;
  onBack: () => void;
  selectedId: string | null;
  focusedFamily: string | null;
  isGenerating: boolean;
  themeColor: string;
  isCommunityMode?: boolean;
  onToggleCommunity?: () => void;
  showLinks: boolean;
  onToggleLinks: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  inspirations,
  onAddInspiration,
  onUpdateInspiration,
  onSelect,
  onBack,
  selectedId,
  focusedFamily,
  isGenerating,
  themeColor,
  isCommunityMode,
  onToggleCommunity,
  showLinks,
  onToggleLinks
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<'none' | 'text' | 'voice' | 'image'>('none');
  const [selectedFamilyForInput, setSelectedFamilyForInput] = useState<string>(focusedFamily || FAMILIES[0].name);
  const [textValue, setTextValue] = useState('');
  const [preMergeBackup, setPreMergeBackup] = useState<string>(''); 
  const [isRecording, setIsRecording] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [meteorTrigger, setMeteorTrigger] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTag, setActiveSearchTag] = useState<string | null>(null);
  const [stardust, setStardust] = useState<{ text: string, status: 'arriving' | 'expanded' | 'leaving' | 'dragging', dragOffset: { x: number, y: number } } | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isCreationPublic, setIsCreationPublic] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  
  // Media Recorder State
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const inputRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logic to Resolve Virtual "Link" Inspirations
  const selectedInspiration = useMemo(() => {
    if (!selectedId) return null;
    
    // 1. Direct Match
    const direct = inspirations.find(i => i.id === selectedId);
    if (direct) return direct;

    // 2. Derived Match (Link Click)
    if (selectedId.includes('_link_')) {
        const parts = selectedId.split('_link_');
        const parentId = parts[0];
        const typeInfo = parts[1];
        const [typeChar, indexStr] = typeInfo.split('_');
        const index = parseInt(indexStr);
        
        const parent = inspirations.find(i => i.id === parentId);
        if (parent) {
            const templateIndex = (index + (typeChar === 'p' ? 0 : 2)) % VARIANT_TEMPLATES.length;
            const template = VARIANT_TEMPLATES[templateIndex];
            const visualMode = (templateIndex % 3) + 1;

            return {
                ...parent,
                id: selectedId,
                title: template.titleTransform(parent.title),
                content: template.contentTransform(parent.content),
                isVariant: true,
                variantMode: visualMode,
                variantLabel: template.name
            } as Inspiration & { isVariant?: boolean, variantMode?: number, variantLabel?: string };
        }
    }
    return null;
  }, [selectedId, inspirations]);

  const isNewInspiration = useMemo(() => {
     if (!selectedInspiration) return false;
     const checkId = selectedInspiration.id.split('_link_')[0];
     if (checkId.startsWith('community-')) return false;
     return !checkId.startsWith('preset-');
  }, [selectedInspiration]);

  const likeCount = useMemo(() => {
    if (!selectedInspiration) return 0;
    
    const baseId = selectedInspiration.id.split('_link_')[0];
    
    // Logic update: New user inspirations (random IDs) should start with 0 likes.
    // Only 'preset-' and 'community-' items get the seeded "fake" likes.
    if (!baseId.startsWith('preset-') && !baseId.startsWith('community-')) {
        return 0;
    }

    let hash = 0;
    for (let i = 0; i < baseId.length; i++) {
      hash = ((hash << 5) - hash) + baseId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 1001;
  }, [selectedInspiration?.id]);

  const filteredInspirations = useMemo(() => {
    if (!searchQuery && !activeSearchTag) return [];
    const query = (activeSearchTag || searchQuery).toLowerCase();
    return inspirations.filter(ins => ins.title.toLowerCase().includes(query) || ins.content.toLowerCase().includes(query) || ins.type.includes(query));
  }, [inspirations, searchQuery, activeSearchTag]);

  useEffect(() => {
    if (focusedFamily) setSelectedFamilyForInput(focusedFamily);
  }, [focusedFamily]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 200)}px`;
    }
  }, [textValue]);

  useEffect(() => {
    setIsEditMode(false);
    setEditPrompt('');
    setIsEditingImage(false);
    setMeteorTrigger(0);
    setIsPublic(true);
    setIsLiked(false);
  }, [selectedId]);

  // Clean up recognition on unmount
  useEffect(() => {
      return () => {
          if (recognitionRef.current) {
              recognitionRef.current.stop();
          }
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
          }
      };
  }, []);

  useEffect(() => {
    let timer: any;
    if (activeInput === 'text' && !stardust && !activeTag) {
      timer = setTimeout(() => {
        const randomText = POETIC_POOL[Math.floor(Math.random() * POETIC_POOL.length)];
        setStardust({ text: randomText, status: 'arriving', dragOffset: { x: 0, y: 0 } });
        setTimeout(() => setStardust(prev => prev?.status === 'arriving' ? { ...prev, status: 'expanded' } : prev), 7000);
        setTimeout(() => {
          setStardust(prev => prev?.status === 'expanded' ? { ...prev, status: 'leaving' } : prev);
          setTimeout(() => setStardust(null), 1600);
        }, 11000); 
      }, 4000 + Math.random() * 4000);
    }
    return () => clearTimeout(timer);
  }, [activeInput, stardust, activeTag]);

  const toggleMenu = () => {
    if (activeInput !== 'none') {
      setActiveInput('none');
      setIsMenuOpen(false);
      setActiveTag(null);
      setStardust(null);
      setPreMergeBackup('');
      setIsCreationPublic(true);
      setTextValue('');
      if (recognitionRef.current) {
          recognitionRef.current.stop();
          setIsRecording(false);
      }
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
      }
      setRecordedAudioBase64(null);
    } else {
      setIsMenuOpen(!isMenuOpen);
    }
  };

  const handleTextSubmit = async () => {
    if (!textValue.trim()) return;
    
    let dataToSend = textValue;
    
    // If it's voice input, we use the recorded audio blob as the data source
    // But we pass it with type 'voice', App.tsx handles the separation of procedural art vs audio
    if (activeInput === 'voice' && recordedAudioBase64) {
        dataToSend = recordedAudioBase64;
    }

    await onAddInspiration(activeInput === 'voice' ? 'voice' : 'text', dataToSend, selectedFamilyForInput);
    
    setTextValue('');
    setActiveTag(null);
    setPreMergeBackup('');
    setActiveInput('none');
    setIsMenuOpen(false);
    setIsCreationPublic(true);
    setRecordedAudioBase64(null);
  };

  const toggleVoiceRecording = useCallback(async () => {
    if (isRecording) {
        // Stop recording
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    } else {
        // Start recording
        // 1. Setup Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("当前浏览器不支持语音转文字功能。");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN'; 
        const startText = textValue; 

        recognition.onresult = (event: any) => {
            let sessionTranscript = '';
            let interimTranscript = '';
            for (let i = 0; i < event.results.length; ++i) {
                let transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    transcript = transcript.trim();
                    if (!/[，。？！：,?!:;]/.test(transcript.slice(-1))) {
                        transcript += '，';
                    }
                    sessionTranscript += transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTextValue(startText + sessionTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
            // FIX: Remove trailing comma when recording is officially finished
            setTextValue(prev => prev.trim().replace(/[锛?]+$/, ''));
            
            // Stop media recorder if speech stops automatically
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };

        // 2. Setup Media Recorder
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    setRecordedAudioBase64(base64String);
                };
                // Stop tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            recognitionRef.current = recognition;
            recognition.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("无法访问麦克风。");
        }
    }
  }, [isRecording, textValue]);

  const handleImageEditSubmit = async () => {
    if (!editPrompt.trim() || !selectedInspiration?.mediaData || !onUpdateInspiration) return;
    setIsEditingImage(true);
    try {
      const updateId = selectedInspiration.id.split('_link_')[0];
      const newImageData = await editImageInspiration(selectedInspiration.mediaData, editPrompt);
      onUpdateInspiration(updateId, newImageData);
      setIsEditMode(false);
      setEditPrompt('');
    } catch (error) {
      console.error("Failed to edit image:", error);
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleDragStart = (e: React.PointerEvent) => {
    if (stardust?.status !== 'expanded') return;
    setStardust(prev => prev ? { ...prev, status: 'dragging' } : null);
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (stardust?.status !== 'dragging') return;
    setStardust(prev => prev ? { ...prev, dragOffset: { x: e.clientX - window.innerWidth / 2, y: e.clientY - (window.innerHeight * 0.4) } } : null);
  };

  const handleDragEnd = async (e: React.PointerEvent) => {
    if (stardust?.status !== 'dragging') return;
    const dropZone = inputRef.current?.getBoundingClientRect();
    
    // Robust drop detection: Check if dropped roughly in the bottom area or specific drop zone
    const isInDropZone = dropZone 
        ? e.clientY > dropZone.top - 150 
        : e.clientY > window.innerHeight * 0.7;

    if (isInDropZone) {
      const suggestion = stardust.text;
      setPreMergeBackup(textValue); 
      setStardust(null);
      setActiveTag(suggestion);
      setIsMerging(true);
      try {
        const merged = await mergePoeticInspirations(textValue, suggestion);
        setTextValue(merged);
        setIsMerging(false);
      } catch (err) {
        console.error("Inspiration weaving failed", err);
        setIsMerging(false);
      }
    } else {
      setStardust(prev => prev ? { ...prev, status: 'leaving', dragOffset: { x: 0, y: 0 } } : null);
      setTimeout(() => setStardust(null), 1500);
    }
  };

  const handleRemoveTag = () => {
    setActiveTag(null);
    setIsMerging(false);
    if (preMergeBackup) {
      setTextValue(preMergeBackup); 
      setPreMergeBackup('');
    }
  };

  const handleQuote = () => {
    if (!selectedInspiration) return;
    const text = selectedInspiration.content;
    const snippet = text.length > 12 ? text.substring(0, 12) + "..." : text;
    
    onSelect(selectedInspiration.id);
    
    setTimeout(() => {
        setActiveInput('text');
        setStardust({
            text: snippet,
            status: 'expanded',
            dragOffset: { x: 0, y: 0 }
        });
    }, 300);
  };

  const currentSelectionColor = focusedFamily ? themeColor : (FAMILIES.find(f => f.name === selectedFamilyForInput)?.baseColor || themeColor);

  // --- LOGIC TO CONTROL NAVIGATOR VISIBILITY ---
  const shouldShowNavigator = useMemo(() => {
    if (isMenuOpen || activeInput !== 'none') return false;

    // 1. Level 3: A node is selected
    if (selectedId) {
        // Hide if derived link mode
        if (selectedId.includes('_link_')) return false;
        // Hide if community node
        if (selectedId.startsWith('community-')) return false;
        // Show if standard inspiration node
        return true;
    }

    // 2. Level 2: Family focused but no selection
    if (focusedFamily) return true;

    return false;
  }, [isMenuOpen, activeInput, selectedId, focusedFamily]);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 overflow-hidden">
      <style>{`
        @keyframes wavy-drift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-45px); }
        }
        .animate-stardust-wavy { animation: wavy-drift 5s ease-in-out infinite; }
        @keyframes tag-bloom {
          0% { transform: scale(0.8); opacity: 0; filter: blur(12px); }
          100% { transform: scale(1); opacity: 1; filter: blur(0); }
        }
        .animate-bloom { animation: tag-bloom 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .themed-selection::selection { background-color: ${currentSelectionColor}44; color: white; }
        .custom-textarea-scroll::-webkit-scrollbar { width: 3px; }
        .custom-textarea-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        
        @keyframes heart-burst {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        .animate-heart-particle {
          animation: heart-burst 0.6s ease-out forwards;
        }
      `}</style>
      
      {/* Meteor Shower Effect - Only active for 'preset-' items, specifically EXCLUDING user items */}
      <MeteorShower 
         active={!!selectedInspiration && selectedInspiration.id.startsWith('preset-') && !(selectedInspiration as any).isVariant} 
         themeColor={themeColor} 
         refreshKey={meteorTrigger} 
         likeCount={likeCount} 
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              await onAddInspiration('image', base64, selectedFamilyForInput);
              setActiveInput('none');
              setIsMenuOpen(false);
            };
            reader.readAsDataURL(file);
          }
        }} 
      />

      {/* Floating Stardust */}
      {stardust && activeInput === 'text' && (
        <div 
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          className={`absolute left-1/2 top-[40%] transition-all pointer-events-auto flex flex-col items-center group
            ${stardust.status === 'arriving' ? '-translate-x-[150vw] opacity-0 duration-[7000ms] cubic-bezier(0.25, 1, 0.5, 1)' : ''}
            ${stardust.status === 'expanded' ? '-translate-x-1/2 opacity-100 duration-1000 ease-out-expo' : ''}
            ${stardust.status === 'leaving' ? 'translate-x-[150vw] opacity-0 duration-[1500ms] cubic-bezier(0.5, 0, 0.75, 0)' : ''}
            ${stardust.status === 'dragging' ? 'transition-none duration-0 z-50 -translate-x-1/2' : ''}
          `}
          style={stardust.status === 'dragging' ? { left: `calc(50% + ${stardust.dragOffset.x}px)`, top: `calc(40% + ${stardust.dragOffset.y}px)` } : undefined}
        >
          <div className={`flex flex-col items-center ${stardust.status === 'arriving' ? 'animate-stardust-wavy' : ''}`}>
            <div className="relative mb-6 flex flex-col items-center">
                <div className={`serif-font text-[11px] tracking-[0.3em] uppercase text-center select-none whitespace-nowrap px-5 py-2.5 bg-white/5 backdrop-blur-3xl border rounded-full transition-all duration-1000 shadow-2xl
                    ${stardust.status === 'expanded' || stardust.status === 'dragging' ? 'opacity-100 scale-100 blur-0 translate-y-0' : 'opacity-0 scale-75 blur-3xl translate-y-6 pointer-events-none'}
                  `}
                  style={{ color: focusedFamily ? 'rgba(255, 255, 255, 0.8)' : currentSelectionColor, borderColor: `${currentSelectionColor}44`, textShadow: focusedFamily ? 'none' : `0 0 12px ${currentSelectionColor}44`, boxShadow: `0 0 20px ${currentSelectionColor}11`, maxWidth: '75vw' }}>
                  {stardust.text}
                </div>
                <div className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-1000
                    ${stardust.status === 'expanded' || stardust.status === 'dragging' ? 'w-0.5 h-0.5 mt-9 opacity-30' : 'w-2 h-2 opacity-100'}
                  `} 
                  style={{ boxShadow: (stardust.status === 'expanded' || stardust.status === 'dragging') ? `0 0 8px ${currentSelectionColor}` : `0 0 15px #fff, 0 0 40px ${currentSelectionColor}, 0 0 80px ${currentSelectionColor}` }} />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Top Left */}
      {!selectedInspiration && (
        <div className="fixed top-8 left-8 flex flex-col items-start gap-4 pointer-events-auto z-20">
          {focusedFamily ? (
            <div className="flex flex-col gap-6">
              <button 
                onClick={onBack}
                style={{ borderColor: `${themeColor}33`, color: `${themeColor}cc` }}
                className="flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-xl border rounded-full hover:bg-white/10 transition-all shadow-xl group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs uppercase tracking-[0.3em] font-light">杩斿洖鏄熷浘</span>
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/30 uppercase tracking-[0.5em] mb-1">姝ｅ湪鎺㈢储鏄熷煙</span>
                <h1 className="text-3xl font-light tracking-[0.6em] uppercase serif-font" style={{ color: themeColor, textShadow: `0 0 25px ${themeColor}66` }}>
                  {focusedFamily}
                </h1>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="items-center gap-3 mb-2 flex">
                <Orbit className="text-white/40" size={20} />
                <h1 className="text-white/80 text-2xl font-light tracking-[0.5em] uppercase">Nebula Archive</h1>
              </div>
              <p className="text-[9px] text-white/30 tracking-[0.4em] uppercase">鐐瑰嚮鏄熺皣浠ヨ繘鍏ョ壒瀹氶鍩熺殑鐏垫劅娴锋磱</p>
            </div>
          )}
        </div>
      )}
      
      {/* Top Right Controls */}
      {!selectedInspiration && !isMenuOpen && activeInput === 'none' && (
        <div className="fixed top-8 right-8 z-30 pointer-events-auto flex items-center gap-3">
          <button onClick={() => setIsSearchOpen(true)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all active:scale-95 hover:scale-105" title="鎼滅储鎬濈华">
            <Search size={18} />
          </button>
          
          {focusedFamily && (
             <button 
                onClick={onToggleLinks} 
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${showLinks ? 'bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/80'}`} 
                title={showLinks ? "Hide Inspiration Links" : "Show Inspiration Links"}
             >
                <Network size={18} />
             </button>
          )}

          {!focusedFamily && onToggleCommunity && (
            <button onClick={onToggleCommunity} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 ${isCommunityMode ? 'bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/80'}`} title="鍒囨崲鏄熷煙">
              <Globe size={18} />
            </button>
          )}
        </div>
      )}

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-md animate-in fade-in duration-500 flex flex-col pointer-events-auto">
          <div className="pt-20 px-8 pb-4 max-w-4xl mx-auto w-full flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                   <Search size={18} className="text-white/50" />
                 </div>
                 <div className="flex flex-col">
                   <h2 className="text-xl font-light text-white tracking-[0.25em] serif-font">NEBULA SEARCH</h2>
                   <span className="text-[9px] text-white/30 tracking-[0.3em] uppercase">Semantic Signal Retrieval</span>
                 </div>
             </div>
             <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setActiveSearchTag(null); }} className="w-12 h-12 rounded-full border border-white/10 hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center hover:scale-105 active:scale-95">
                <X size={20} />
             </button>
          </div>

          <div className="px-8 max-w-4xl mx-auto w-full mb-12 relative">
             <input 
                autoFocus 
                type="text" 
                placeholder="Type to search via neural link..." 
                className="w-full bg-transparent border-b border-white/10 py-6 text-lg font-light text-white placeholder:text-white/20 outline-none focus:border-white/40 transition-all tracking-wide serif-font" 
                value={searchQuery} 
                onChange={(e) => { setSearchQuery(e.target.value); setActiveSearchTag(null); }} 
             />
             {(searchQuery || activeSearchTag) && (
               <button onClick={() => { setSearchQuery(''); setActiveSearchTag(null); }} className="absolute right-8 top-1/2 -translate-y-1/2 text-xs uppercase tracking-widest text-white/30 hover:text-white/80 transition-colors">
                 Clear Signal
               </button>
             )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-20 max-w-4xl mx-auto w-full">
              {(!searchQuery && !activeSearchTag) ? (
                <div className="flex flex-col gap-10 animate-in slide-in-from-bottom-5 duration-700">
                   {SEARCH_CATEGORIES.map((category) => (
                     <div key={category.id} className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-white/30">
                           {category.icon}
                           <span className="text-[10px] uppercase tracking-[0.3em] font-medium">{category.label}</span>
                           <div className="h-px bg-white/5 flex-1" />
                        </div>
                        <div className="flex flex-wrap gap-3">
                           {category.tags.map(tag => (
                             <button 
                                key={tag} 
                                onClick={() => setActiveSearchTag(tag)}
                                className="group relative px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 overflow-hidden"
                             >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                <span className="relative z-10 text-sm font-light text-white/70 group-hover:text-white tracking-widest">{tag}</span>
                             </button>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 mb-6">
                       <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Signal Detected</span>
                       <div className="w-1 h-1 rounded-full bg-green-500/50 animate-pulse" />
                       <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 ml-auto">{filteredInspirations.length} Results</span>
                    </div>

                    {filteredInspirations.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-white/20 gap-4">
                         <div className="w-16 h-16 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                           <Search size={24} />
                         </div>
                         <span className="text-xs tracking-widest font-light">No matching signals found in this sector.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {filteredInspirations.map(ins => (
                            <button 
                              key={ins.id} 
                              onClick={() => { onSelect(ins.id); setIsSearchOpen(false); }} 
                              className="group flex flex-col p-5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-sm transition-all text-left relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between mb-3 relative z-10">
                                   <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">{new Date(ins.timestamp).toLocaleDateString()}</span>
                                   <div className={`w-1.5 h-1.5 rounded-full ${ins.type === 'text' ? 'bg-blue-400/50' : ins.type === 'image' ? 'bg-purple-400/50' : 'bg-red-400/50'} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                                </div>
                                <h3 className="text-lg text-white/90 group-hover:text-white font-light serif-font tracking-wider mb-2 transition-colors">{ins.title}</h3>
                                <p className="text-xs text-white/40 group-hover:text-white/60 line-clamp-2 leading-relaxed font-light tracking-wide">{ins.content}</p>
                                
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                            </button>
                         ))}
                      </div>
                    )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Navigator */}
      {shouldShowNavigator && (
        <NebulaNavigator 
          items={inspirations} 
          selectedId={selectedId} 
          onSelect={onSelect} 
          themeColor={themeColor} 
        />
      )}

      {/* Centralized Action Interface */}
      {!selectedInspiration && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center w-full max-w-lg z-20 px-6">
          <div className={`mb-4 w-full flex flex-col items-center transition-all duration-500 ${activeInput !== 'none' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}>
            {activeTag && activeInput === 'text' && (
              <div className="mb-4 animate-bloom">
                <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border text-white transition-all group shadow-lg" style={{ borderColor: `${currentSelectionColor}88` }}>
                   <Sparkles size={12} style={{ color: currentSelectionColor }} />
                   <span className="serif-font text-[11px] uppercase tracking-[0.2em] font-light" style={{ color: focusedFamily ? 'rgba(255, 255, 255, 0.8)' : `${currentSelectionColor}dd` }}>{activeTag}</span>
                   <button onClick={handleRemoveTag} className="ml-2 p-0.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"><X size={12} className="text-white/40 group-hover:text-white" /></button>
                </div>
              </div>
            )}
            {!focusedFamily && activeInput !== 'none' && (
              <div className="w-[95%] relative mb-6">
                <div className="absolute inset-0 bg-white/[0.01] rounded-full blur-xl -z-10" />
                <div className="flex justify-center items-center gap-5 bg-white/5 backdrop-blur-3xl py-4 px-8 rounded-full border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.03)]">
                  {FAMILIES.map(f => (
                    <button key={f.name} onClick={() => setSelectedFamilyForInput(f.name)} className="flex flex-col items-center gap-1.5 group transition-all">
                      <div className={`w-2 h-2 rounded-full transition-all duration-500 ${selectedFamilyForInput === f.name ? 'scale-125' : 'scale-90 opacity-40 hover:opacity-100'}`} style={{ backgroundColor: f.baseColor, boxShadow: selectedFamilyForInput === f.name ? `0 0 12px ${f.baseColor}` : 'none' }} />
                      <span className={`text-[8px] tracking-[0.2em] uppercase whitespace-nowrap font-light transition-all duration-500 ${selectedFamilyForInput === f.name ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'}`} style={{ color: f.baseColor }}>{f.domain}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeInput === 'text' && (
              <div className="w-full flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-center">
                   <button 
                      onClick={() => setIsCreationPublic(!isCreationPublic)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 backdrop-blur-md ${isCreationPublic ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                   >
                      {isCreationPublic ? <Unlock size={10} /> : <Lock size={10} />}
                      <span className="text-[9px] uppercase tracking-widest pt-0.5">{isCreationPublic ? "Public" : "Private"}</span>
                   </button>
                </div>

                <div className="w-full flex items-end gap-2">
                  <div ref={inputRef} className="flex-1 relative group">
                     {/* Animated Border */}
                     <div 
                        className={`absolute -inset-[1px] rounded-2xl pointer-events-none z-0 transition-opacity duration-500 ${(isMerging || isGenerating) ? 'opacity-100' : 'opacity-0'}`}
                     >
                        {/* 1. Diffuse Glow Background */}
                        <div className="absolute inset-0 rounded-2xl opacity-40 transition-all duration-500"
                             style={{
                                 background: currentSelectionColor,
                                 filter: 'blur(15px)'
                             }}
                        />
                        
                        {/* 2. Rotating Border Beam - Smoother Animation and Blurred Gradient */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            maskComposite: 'exclude',
                            WebkitMaskComposite: 'xor',
                            padding: '1.5px'
                        }}>
                           <div className="absolute inset-[-100%] animate-[spin_2.5s_linear_infinite]" 
                                style={{
                                    background: `conic-gradient(from 0deg, transparent 0%, transparent 10%, ${currentSelectionColor} 50%, transparent 90%)`,
                                    filter: 'blur(8px)'
                                }}
                           />
                        </div>
                        
                        {/* 3. Outer Glow Box Shadow - More diffuse */}
                         <div className="absolute inset-0 rounded-2xl transition-all duration-500" 
                              style={{ 
                                  boxShadow: (isMerging || isGenerating) ? `0 0 20px 2px ${currentSelectionColor}55` : 'none'
                              }} 
                         />
                     </div>

                    <textarea 
                        ref={textAreaRef} 
                        autoFocus 
                        rows={1} 
                        placeholder="鍦ㄦ璁板綍浣犵殑鎬濈华..." 
                        className="w-full custom-textarea-scroll bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 text-white placeholder:text-white/40 outline-none text-sm resize-none overflow-y-auto max-h-[150px] relative z-10 focus:border-white/40 transition-colors" 
                        value={textValue} 
                        onChange={(e) => setTextValue(e.target.value)} 
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }} 
                    />
                  </div>
                  <button onClick={handleTextSubmit} disabled={isGenerating} className="w-11 h-11 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all flex-shrink-0">
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            )}
            {activeInput === 'voice' && (
              <div className="flex flex-col items-center gap-4 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
                <div className="relative">
                    <button onClick={toggleVoiceRecording} className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all shadow-2xl z-10 relative ${isRecording ? 'bg-red-500/20 border-red-500/40 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
                      {isRecording ? <StopCircle size={36} /> : <Mic size={36} style={{ color: currentSelectionColor }} />}
                    </button>
                    {isRecording && <div className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />}
                </div>
                
                <div className={`w-full flex flex-col gap-2 transition-all duration-500 ${textValue || isRecording ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                     <textarea 
                        ref={textAreaRef} 
                        rows={3} 
                        placeholder="鑱嗗惉涓?.." 
                        className="w-full custom-textarea-scroll bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 text-white placeholder:text-white/40 outline-none text-sm resize-none overflow-y-auto min-h-[80px]" 
                        value={textValue} 
                        onChange={(e) => setTextValue(e.target.value)} 
                    />
                    <div className="flex justify-center">
                         <button 
                            onClick={handleTextSubmit} 
                            disabled={isGenerating || (!textValue.trim() && !recordedAudioBase64) || isRecording} 
                            className="px-8 py-2 bg-white/10 border border-white/20 rounded-full flex items-center gap-2 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            <span className="text-xs tracking-widest uppercase">鐢熸垚鐏垫劅</span>
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>
          
          <div className={`flex gap-6 mb-8 transition-all duration-500 ${isMenuOpen && activeInput === 'none' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'}`}>
            <button onClick={() => { setActiveInput('voice'); setTextValue(''); }} className="w-14 h-14 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"><Mic size={22} /></button>
            <button onClick={() => setActiveInput('text')} className="w-14 h-14 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"><Type size={22} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"><ImageIcon size={22} /></button>
          </div>
          
          <button disabled={isGenerating} onClick={toggleMenu} style={{ borderColor: (focusedFamily || isMenuOpen || activeInput !== 'none') ? `${currentSelectionColor}88` : 'rgba(255,255,255,0.1)', boxShadow: (isGenerating || isMenuOpen || activeInput !== 'none') ? `0 0 35px ${currentSelectionColor}22` : 'none' }} className={`w-20 h-20 bg-white/5 backdrop-blur-3xl border text-white rounded-full flex items-center justify-center hover:bg-white/10 transition-all shadow-2xl active:scale-90`}>
            {isGenerating ? <Loader2 size={32} className="animate-spin" style={{ color: currentSelectionColor }} /> : (isMenuOpen || activeInput !== 'none') ? <X size={32} /> : <Plus size={32} className="transition-transform duration-500 hover:rotate-90" />}
          </button>
        </div>
      )}

      {selectedInspiration && (
        <div className="fixed inset-0 z-50 flex flex-col animate-in fade-in duration-700">
           <div className="absolute inset-0 bg-black/70 backdrop-blur-3xl" onClick={() => onSelect(selectedInspiration.id)} />
           <div className="relative z-10 w-full h-full flex flex-col pointer-events-none">
                <div className="fixed top-10 right-28 flex flex-row-reverse items-center gap-3 pointer-events-none z-[60] animate-in fade-in slide-in-from-right-10 duration-1000 delay-500">
                  {/* Like Counter / Meteor Trigger - Only for standard nodes */}
                  {!((selectedInspiration as any).isVariant || selectedInspiration.id.startsWith('community-')) && (
                    <div onClick={() => setMeteorTrigger(prev => prev + 1)} className="pointer-events-auto px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center gap-2.5 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer group">
                      <Sparkles size={13} style={{ color: themeColor }} className="group-hover:animate-spin" />
                      <span className="text-[11px] font-light tracking-[0.15em] text-white/90 serif-font">{likeCount.toLocaleString()}</span>
                    </div>
                  )}
                  {((selectedInspiration as any).isVariant || selectedInspiration.id.startsWith('community-')) && (
                    <>
                        <button onClick={handleQuote} className="pointer-events-auto w-10 h-10 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-xl active:scale-95" title="寮曠敤姝ゆ€濈华">
                          <Quote size={14} />
                        </button>
                         <button 
                            onClick={() => setIsLiked(!isLiked)} 
                            className={`pointer-events-auto relative w-10 h-10 rounded-full backdrop-blur-2xl border flex items-center justify-center transition-all shadow-xl active:scale-95 ${isLiked ? 'bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                            title="鍠滅埍"
                        >
                          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                          {isLiked && <HeartExplosion />}
                        </button>
                    </>
                  )}
                  {/* Public/Private Toggle for Standard Nodes */}
                  {!((selectedInspiration as any).isVariant || selectedInspiration.id.startsWith('community-')) && (
                    <button 
                        onClick={() => setIsPublic(!isPublic)}
                        className={`pointer-events-auto w-10 h-10 rounded-full backdrop-blur-2xl border flex items-center justify-center transition-all shadow-xl active:scale-95 ${isPublic ? 'bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'}`}
                        title={isPublic ? "设为私密" : "公开至星域"}
                    >
                        {isPublic ? <Unlock size={14} /> : <Lock size={14} />}
                    </button>
                  )}
                </div>
              <div className="h-[60%] w-full relative flex items-center justify-center">
                   <div className="absolute top-8 right-8 pointer-events-auto z-20">
                      <button onClick={() => onSelect(selectedInspiration.id)} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center active:scale-90"><X size={28} /></button>
                   </div>
                   {selectedInspiration.mediaData && (
                       <div className="w-full h-full pointer-events-auto relative">
                           {/* Add visual "Variant" badge if it's a derived link */}
                           {(selectedInspiration as any).isVariant && (
                               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none z-0 opacity-20 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 animate-pulse mix-blend-overlay" />
                           )}
                           <div className="w-full h-full animate-in zoom-in-95 duration-1000">
                             <Canvas gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
                                 <PerspectiveCamera makeDefault position={[0, 0, 4.5]} fov={45} />
                                 <ParticleImage 
                                    imageData={selectedInspiration.mediaData} 
                                    themeColor={themeColor} 
                                    variantMode={(selectedInspiration as any).variantMode} 
                                 />
                                 <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.5} />
                             </Canvas>
                           </div>
                           
                           {/* Edit Input Box - In Image Area */}
                           {isEditMode && (
                             <div className="absolute bottom-20 left-6 right-6 md:right-auto md:w-96 pointer-events-auto animate-in slide-in-from-bottom-5 duration-300 z-30">
                               <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex gap-3 shadow-2xl">
                                  <input type="text" autoFocus placeholder="杈撳叆鎸囦护浠ラ噸濉戞槦浜戝浘鍍?.." className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40 font-light" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleImageEditSubmit(); }} />
                                  <div className="flex gap-2">
                                     <button disabled={!editPrompt.trim() || isEditingImage} onClick={handleImageEditSubmit} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all">{isEditingImage ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}</button>
                                     <button onClick={() => { setIsEditMode(false); setEditPrompt(''); }} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all"><X size={16} /></button>
                                  </div>
                               </div>
                             </div>
                           )}
                       </div>
                   )}
              </div>
              <div className="h-[40%] w-full bg-black/90 backdrop-blur-3xl border-t border-white/10 p-8 md:p-14 pt-24 md:pt-32 flex flex-col gap-8 pointer-events-auto animate-in slide-in-from-bottom-20 duration-1000 ease-out-expo z-20 shadow-2xl relative">
                   
                   {/* Magic Wand Button (Inside the black box, aligned top-left with padding-matched positioning) */}
                   {selectedInspiration.mediaData && (
                      <div className="absolute top-8 left-8 md:top-14 md:left-14 z-50 pointer-events-auto">
                          <button onClick={() => setIsEditMode(prev => !prev)} className={`w-12 h-12 rounded-full border border-white/10 backdrop-blur-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all shadow-lg active:scale-95 ${isEditMode ? 'bg-white/20 text-white border-white/30' : 'bg-white/5'}`}>
                              {isEditingImage ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
                          </button>
                      </div>
                   )}

                   <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}` }} />
                          <span className="text-[11px] uppercase tracking-[0.4em] text-white/40 font-light">{new Date(selectedInspiration.timestamp).toLocaleDateString()}</span>
                          <div className="flex-1 h-px bg-white/5" />
                          <span className="text-[10px] uppercase tracking-[0.3em] text-white/20">
                              {/* Show Variant Label if exists */}
                              {(selectedInspiration as any).isVariant ? (selectedInspiration as any).variantLabel : `${selectedInspiration.type} Node`}
                          </span>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-light text-white tracking-widest serif-font leading-tight">{selectedInspiration.title}</h1>
                      
                      {/* Audio Player for Voice Nodes */}
                      {selectedInspiration.type === 'voice' && selectedInspiration.audioData && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                             <AudioPlayer base64Audio={selectedInspiration.audioData} themeColor={themeColor} />
                        </div>
                      )}
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-6 -mr-4">
                       <p className={`text-xl md:text-2xl text-white/70 font-light leading-relaxed serif-font tracking-wide ${(selectedInspiration as any).isVariant ? 'italic text-white/60' : ''}`}>
                         {selectedInspiration.content}
                       </p>
                   </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};







