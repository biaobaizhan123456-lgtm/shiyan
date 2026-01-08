'use client';


import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { InspirationNode } from './InspirationNode';
import { Inspiration } from '../types';

// --- 鏍稿績鍏夋檿 Sprite (2D Billboard) ---
const CoreGlow = ({ color, radius, isFocused }: { color: string, radius: number, isFocused: boolean }) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
      gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.6)'); 
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)'); 
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)'); 
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    if (spriteRef.current) {
      const time = state.clock.getElapsedTime();
      const baseScale = radius * (isFocused ? 1.0 : 1.5); 
      const pulse = 1 + Math.sin(time * 1.5) * 0.05;
      spriteRef.current.scale.set(baseScale * pulse, baseScale * pulse, 1);
      spriteRef.current.material.opacity = isFocused ? 0.6 : 0.4;
    }
  });

  return (
    <sprite ref={spriteRef}>
      <spriteMaterial 
        map={texture} 
        color={color} 
        transparent 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
      />
    </sprite>
  );
};

// --- Custom Shader for Particles ---
const ParticleLayer = ({ 
  count, 
  radius, 
  color, 
  type, 
  isFocused 
}: { 
  count: number, 
  radius: number, 
  color: THREE.Color, 
  type: 'core' | 'nebula',
  isFocused: boolean 
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, colors, sizes, randoms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const rnd = new Float32Array(count);

    const baseColor = color;
    
    for (let i = 0; i < count; i++) {
      // Distribution logic
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      let r;
      if (type === 'core') {
         // Core: denser towards center
         r = Math.pow(Math.random(), 2.5) * radius * 0.6;
      } else {
         // Nebula: spread out, shell-like but volumetric
         r = (0.3 + Math.random() * 0.8) * radius;
      }

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Color variation
      const mixFactor = Math.random();
      const mixColor = type === 'core' 
        ? baseColor.clone().lerp(new THREE.Color('#ffffff'), mixFactor * 0.8) 
        : baseColor.clone().lerp(new THREE.Color('#000000'), mixFactor * 0.3);

      col[i * 3] = mixColor.r;
      col[i * 3 + 1] = mixColor.g;
      col[i * 3 + 2] = mixColor.b;

      // Size
      // Core: smaller, sharper. Nebula: larger, softer.
      sz[i] = type === 'core' ? (0.5 + Math.random() * 1.5) : (2.0 + Math.random() * 4.0);
      
      rnd[i] = Math.random();
    }
    return { positions: pos, colors: col, sizes: sz, randoms: rnd };
  }, [count, radius, color, type]);

  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 1.0 },
      uOpacity: { value: 1.0 },
      uIsNebula: { value: type === 'nebula' ? 1.0 : 0.0 }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aRandom;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uIsNebula;

      void main() {
        vColor = color;
        
        vec3 pos = position;
        
        // Gentle movement
        float speed = uIsNebula > 0.5 ? 0.2 : 0.5;
        float offset = sin(uTime * speed + aRandom * 10.0);
        pos += normalize(pos) * offset * (uIsNebula > 0.5 ? 0.3 : 0.1);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size attenuation
        // Nebula particles get bigger
        float sizeMult = uIsNebula > 0.5 ? 30.0 : 15.0;
        gl_PointSize = aSize * sizeMult * uPixelRatio * (1.0 / -mvPosition.z);
        
        // Optional depth fade
        vAlpha = 1.0; 
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uOpacity;
      uniform float uIsNebula;

      void main() {
        vec2 uv = gl_PointCoord.xy - 0.5;
        float r = length(uv);
        if (r > 0.5) discard;
        
        // Soft circle
        float glow = 1.0 - (r * 2.0);
        
        // Nebula is softer (power 1.5), Core is sharper (power 3.0)
        float softness = uIsNebula > 0.5 ? 1.0 : 2.5;
        glow = pow(glow, softness);
        
        float alpha = uOpacity * glow * vAlpha;
        
        // Additional dimming for nebula
        if (uIsNebula > 0.5) alpha *= 0.15;
        else alpha *= 0.8;

        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  }), [type]);

  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
      shaderMaterial.uniforms.uOpacity.value = isFocused ? 1.0 : 0.6;
    }
    if (pointsRef.current) {
      // Rotate layers in opposite directions for depth
      const t = state.clock.getElapsedTime();
      const rotSpeed = type === 'core' ? 0.05 : 0.02;
      pointsRef.current.rotation.y = type === 'core' ? t * rotSpeed : -t * rotSpeed;
      pointsRef.current.rotation.x = Math.sin(t * 0.1) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={1} />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  );
};

// Define props interface for GalaxyCluster
interface GalaxyClusterProps {
  id: number;
  center: [number, number, number];
  color: string;
  inspirations: Inspiration[];
  onSelect: (id: string, e: any) => void;
  onClick: (e: any) => void;
  selectedId: string | null;
  isFocused: boolean;
  showLinks: boolean;
}

export const GalaxyCluster: React.FC<GalaxyClusterProps> = ({ 
  id, 
  center, 
  color, 
  inspirations, 
  onSelect, 
  onClick,
  selectedId,
  isFocused,
  showLinks
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const shellMeshRef = useRef<THREE.Mesh>(null);
  const shellMatRef = useRef<any>(null);
  
  const coreCount = isFocused ? 1500 : 500; 
  const nebulaCount = isFocused ? 1200 : 400; 
  
  const radius = isFocused ? 8.5 : 6.0;

  const renderColor = useMemo(() => {
    const c = new THREE.Color(color);
    if (!isFocused) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      c.setHSL(hsl.h, hsl.s * 0.5, hsl.l); // Keep some saturation
    }
    return c;
  }, [color, isFocused]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const phase = id * 2.1;

    if (groupRef.current) {
      groupRef.current.position.y = center[1] + Math.sin(time * 0.35 + phase) * (isFocused ? 0.3 : 0.6);
      // Gentle cluster rotation handled by layers now, but we can rotate the container slightly too
      groupRef.current.rotation.z = Math.sin(time * 0.1) * 0.05;
    }

    if (shellMatRef.current) {
      const pulse = Math.sin(time * 0.6 + phase);
      shellMatRef.current.distortion = 0.4 + pulse * 0.2;
      // Fade shell when not focused to reduce visual noise
      shellMatRef.current.opacity = isFocused ? 0.3 : 0.1;
    }

    if (shellMeshRef.current) {
      const s = 1 + Math.sin(time * 1.8 + phase) * 0.02;
      shellMeshRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={center} ref={groupRef}>
      <CoreGlow color={color} radius={radius} isFocused={isFocused} />

      <mesh 
        ref={shellMeshRef}
        onPointerUp={onClick}
        onPointerOver={() => { if(!isFocused) document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[radius * 0.8, 64, 64]} />
        <MeshTransmissionMaterial
          ref={shellMatRef}
          backside
          samples={isFocused ? 6 : 3} 
          resolution={256} 
          thickness={isFocused ? 2.5 : 1.5}
          roughness={0.05}
          transmission={1.0}
          ior={1.4}
          chromaticAberration={0.3}
          anisotropy={0.5}
          distortion={0.5}
          distortionScale={0.8}
          temporalDistortion={0.2}
          clearcoat={1.0}
          attenuationDistance={radius * 2}
          attenuationColor={renderColor}
          color={renderColor}
          transparent
          opacity={isFocused ? 0.3 : 0.1}
        />
      </mesh>

      {/* Layer 1: Core (Sharp, Bright, Dense) */}
      <ParticleLayer 
        count={coreCount} 
        radius={radius} 
        color={renderColor} 
        type="core" 
        isFocused={isFocused} 
      />

      {/* Layer 2: Nebula (Soft, Large, Gaseous) */}
      <ParticleLayer 
        count={nebulaCount} 
        radius={radius * 1.4} 
        color={renderColor} 
        type="nebula" 
        isFocused={isFocused} 
      />

      <group scale={isFocused ? 1 : 0.5}>
        {inspirations.map((ins) => (
          <InspirationNode
            key={ins.id}
            data={ins}
            isSelected={selectedId === ins.id || (selectedId ? selectedId.startsWith(ins.id + '_link_') : false)}
            onSelect={onSelect}
            clusterColor={color}
            isFocused={isFocused}
            showLinks={showLinks}
          />
        ))}
      </group>
    </group>
  );
};


