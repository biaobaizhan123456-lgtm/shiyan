'use client';


import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import '../types';

interface ParticleImageProps {
  imageData: string;
  themeColor: string;
  variantMode?: number; // 0: None, 1: Glitch, 2: Ghost/Negative, 3: Decay/Sepia
}

export const ParticleImage: React.FC<ParticleImageProps> = ({ imageData, themeColor, variantMode = 0 }) => {
  const meshRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  const [aspect, setAspect] = useState(1);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load texture and determine aspect ratio
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(`data:image/jpeg;base64,${imageData}`, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.format = THREE.RGBAFormat;
      
      const imgAspect = tex.image.width / tex.image.height;
      setAspect(imgAspect);
      setTexture(tex);
    });
  }, [imageData]);

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uColor: { value: new THREE.Color(themeColor) },
    uOpacity: { value: 0 }, 
    uVariant: { value: variantMode } 
  }), [texture, themeColor, variantMode]);

  useFrame((state) => {
    if (meshRef.current) {
        const mat = meshRef.current.material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value = state.clock.getElapsedTime();
        mat.uniforms.uVariant.value = variantMode; 
        mat.uniforms.uOpacity.value = THREE.MathUtils.lerp(mat.uniforms.uOpacity.value, 1, 0.03);
    }
  });

  const material = useMemo(() => {
     return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          uniform sampler2D uTexture;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uVariant; // 0=Normal, 1=Glitch, 2=Ghost, 3=Decay
          
          varying vec3 vColor;
          varying float vAlpha;
          varying float vBrightness;

          float random(vec2 st) {
              return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
          }

          void main() {
            vec3 pos = position;
            vec2 uv = uv;
            
            vec4 texColor = texture2D(uTexture, uv);
            float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            vBrightness = gray;

            // Base gentle movement
            float offset = 0.005; 
            pos.x += (random(uv) - 0.5) * offset;
            pos.y += (random(uv * 1.5) - 0.5) * offset;
            pos.z += gray * 0.5;

            // --- VARIANT 1: GLITCH (Twitchy, Grid artifacts) ---
            if (uVariant > 0.5 && uVariant < 1.5) {
                // Quantize position to form a grid look
                float grid = 0.1;
                pos.x = floor(pos.x / grid) * grid;
                
                // Aggressive jitter
                float twitch = sin(uTime * 20.0 + pos.y * 5.0) * 0.05;
                if (random(uv + uTime) > 0.9) pos.x += twitch;
                
                pos.z += sin(pos.y * 20.0 + uTime) * 0.2;
            }

            // --- VARIANT 2: GHOST (Wavy, Floating) ---
            if (uVariant > 1.5 && uVariant < 2.5) {
                // Large flowing sine waves
                float wave = sin(pos.x * 2.0 + uTime) * 0.15;
                pos.z += wave;
                pos.y += cos(pos.x * 3.0 + uTime * 0.5) * 0.1;
                
                // Expand outward
                pos.xy *= 1.0 + sin(uTime) * 0.05;
            }

            // --- VARIANT 3: DECAY (Noise, Scatter) ---
            if (uVariant > 2.5) {
                // Scatter particles downward
                float noiseVal = random(uv + uTime * 0.1);
                pos.y -= noiseVal * 0.2 * sin(uTime);
                
                // Random depth offset
                pos.z += (noiseVal - 0.5) * 0.4;
            }
            
            // Default gentle breath for Normal mode (0)
            if (uVariant < 0.5) {
               float wave = sin(uv.x * 3.0 + uTime * 0.3) * 0.02 + cos(uv.y * 2.0 + uTime * 0.2) * 0.02;
               pos.z += wave;
            }

            vColor = texColor.rgb;
            vAlpha = smoothstep(0.02, 0.15, gray); 
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            float baseSize = 2.5 + gray * 6.0; 
            gl_PointSize = baseSize * uPixelRatio * (2.8 / -mvPosition.z);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uVariant;
          
          varying vec3 vColor;
          varying float vAlpha;
          varying float vBrightness;
          
          void main() {
            if (vAlpha < 0.01) discard;

            vec2 uv = gl_PointCoord.xy - 0.5;
            float r = length(uv);
            if (r > 0.5) discard;
            
            float glow = 1.0 - r * 2.0;
            glow = pow(glow, 2.5);
            
            vec3 finalColor = mix(uColor, vColor, 0.8 + vBrightness * 0.2);
            
            // --- VARIANT 1: GLITCH (Cyan/Red Split, High Contrast) ---
            if (uVariant > 0.5 && uVariant < 1.5) {
                // Boost contrast
                finalColor = pow(finalColor, vec3(1.5));
                // Cyan tint
                finalColor = mix(finalColor, vec3(0.0, 1.0, 1.0), 0.3);
                finalColor *= 1.5;
            } 
            // --- VARIANT 2: GHOST (Inverted, Spectral) ---
            else if (uVariant > 1.5 && uVariant < 2.5) {
                // Invert colors
                finalColor = 1.0 - finalColor;
                // Tint purple/spectral
                finalColor = mix(finalColor, vec3(0.6, 0.2, 1.0), 0.4);
                // Lower brightness for spooky feel
                finalColor *= 0.8;
            }
            // --- VARIANT 3: DECAY (Sepia, Golden, Desaturated) ---
            else if (uVariant > 2.5) {
                // Grayscale
                float g = dot(finalColor, vec3(0.3, 0.59, 0.11));
                // Sepia tint
                vec3 sepia = vec3(g * 1.2, g * 1.0, g * 0.8);
                finalColor = mix(finalColor, sepia, 0.8);
                // Add noise grain look (simulated by dimming random pixels via fragment coords)
                if (mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) < 1.0) finalColor *= 0.7;
            }
            // --- NORMAL MODE ---
            else {
                finalColor *= 0.6;
            }

            gl_FragColor = vec4(finalColor, vAlpha * glow * uOpacity * 0.5); 
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
     });
  }, [uniforms]);

  const { width, height } = useMemo(() => {
    const baseScale = 4.5;
    if (aspect >= 1) {
       return { width: baseScale, height: baseScale / aspect };
    } else {
       return { width: baseScale * aspect, height: baseScale };
    }
  }, [aspect]);

  if (!texture) return null;

  return (
    <points ref={meshRef} rotation={[0, 0, 0]}>
      <planeGeometry args={[width, height, 320, 320]} />
      <primitive object={material} attach="material" />
    </points>
  );
};


