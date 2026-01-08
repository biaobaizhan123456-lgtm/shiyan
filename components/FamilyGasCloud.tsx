
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../types';

interface FamilyGasCloudProps {
  position: [number, number, number];
  color: string;
  radius: number;
}

// --- NEW: 环境光晕 (Ambient Glow) ---
// 使用 Sprite 实现，确保光晕总是柔和地面向相机，覆盖到最外层轨道
const AmbientGlow = ({ color, radius }: { color: string, radius: number }) => {
  const spriteRef = useRef<THREE.Sprite>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 创建非常柔和的径向渐变
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');       // 中心：白色最亮
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');   // 内圈：迅速衰减
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');   // 中圈：淡淡的颜色
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');             // 外圈：完全透明
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    if (spriteRef.current) {
      const t = state.clock.getElapsedTime();
      // 呼吸效果：轻微缩放
      const pulse = 1 + Math.sin(t * 0.8) * 0.05;
      
      // 尺寸设定：
      // 核心半径 * 3.8 确保光晕足够大，能包裹住外层轨道 (轨道最远约 radius * 1.2)
      // 3.8 / 2 = 1.9 (半径倍数)，足以覆盖 1.2 的轨道并自然消散
      const scale = radius * 3.8 * pulse;
      
      spriteRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <sprite ref={spriteRef}>
      <spriteMaterial 
        map={texture} 
        color={color} 
        transparent 
        // 浅浅的发光：低不透明度 + 叠加混合
        opacity={0.15} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
      />
    </sprite>
  );
};

// --- MODIFIED: 微小星点 (Micro Stars) ---
// 修改：数量20，常亮，尺寸500-1000随机，增加连线
const MicroStars = ({ radius, color }: { radius: number; color: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  const count = 20; 

  // 同时计算点的位置和线段的几何数据
  const { positions, randoms, linePositions } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rands = new Float32Array(count); 
    const vec3s: THREE.Vector3[] = [];

    // 1. 生成星点位置
    for (let i = 0; i < count; i++) {
      // 在球体内部随机分布，稍微向中心聚集
      const r = Math.cbrt(Math.random()) * radius * 0.85; 
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      rands[i] = Math.random();
      vec3s.push(new THREE.Vector3(x, y, z));
    }

    // 2. 生成连线 (连接最近的3个邻居，形成星座感)
    const linePosList: number[] = [];
    for (let i = 0; i < count; i++) {
      // 计算当前点到所有其他点的距离
      const distances = vec3s.map((v, idx) => ({ idx, d: v.distanceTo(vec3s[i]) }));
      // 排序（排除自己，因为距离为0）
      distances.sort((a, b) => a.d - b.d);
      
      // 连接最近的3个点
      const connections = 3;
      for (let k = 1; k <= connections; k++) {
        if (distances[k]) {
          const targetIdx = distances[k].idx;
          linePosList.push(vec3s[i].x, vec3s[i].y, vec3s[i].z);
          linePosList.push(vec3s[targetIdx].x, vec3s[targetIdx].y, vec3s[targetIdx].z);
        }
      }
    }

    return { 
      positions: pos, 
      randoms: rands,
      linePositions: new Float32Array(linePosList)
    };
  }, [radius]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 1.0 }
      },
      vertexShader: `
        attribute float aRandom;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = 0.95; // 保持高亮度
          
          // 大小设定：500.0 (基础) + 500.0 (随机) = 范围 [500, 1000]
          float baseSize = 500.0 + 500.0 * aRandom; 
          
          gl_PointSize = baseSize * uPixelRatio * (1.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        
        void main() {
          vec2 uv = gl_PointCoord.xy - 0.5;
          float r = length(uv);
          if (r > 0.5) discard;
          
          // 柔和边缘
          float glow = 1.0 - (r * 2.0);
          glow = pow(glow, 1.5);
          
          // 增强白色核心
          float core = smoothstep(0.2, 0.0, r);
          vec3 finalColor = mix(uColor, vec3(1.0), core * 0.9);
          
          gl_FragColor = vec4(finalColor, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [color]);

  useFrame((state) => {
    if (material) {
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
    if (groupRef.current) {
        // 整个星点+连线组进行缓慢自转
        // 修改：速度增加两倍 (0.03 -> 0.06)
        groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 极细的连线 */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={linePositions.length / 3} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial 
          color={color} 
          transparent 
          opacity={0.12} // 极低的透明度，隐约可见
          linewidth={1} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* 星点 */}
      <points raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={1} />
        </bufferGeometry>
        <primitive object={material} attach="material" />
      </points>
    </group>
  );
};

// --- 1. 边缘光晕球体 (Fresnel Rim) - 仅用于内层核心 ---
const RimSphere = ({ 
  radius, 
  color, 
  power = 1.5, 
  intensity = 0.45 
}: { 
  radius: number; 
  color: string;
  power?: number;
  intensity?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
        uRimPower: { value: power },   
        uRimIntensity: { value: intensity } 
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uRimPower;
        uniform float uRimIntensity;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          float dotProd = dot(normal, viewDir);
          float rim = 1.0 - max(dotProd, 0.0);
          
          float breath = 0.9 + 0.1 * sin(uTime * 0.3 + vViewPosition.y * 0.1);
          
          float alpha = pow(rim, uRimPower) * uRimIntensity * breath;
          
          gl_FragColor = vec4(uColor, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide
    });
  }, [color, power, intensity]);

  useFrame((state) => {
    if (material) {
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} raycast={() => null}>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// --- 2. 飘散雾气粒子 (Drifting Mist) ---
const MistParticles = ({ radius, color }: { radius: number; color: string }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 120; 

  const { positions, directions, randoms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const dirs = new Float32Array(count * 3);
    const rands = new Float32Array(count); 

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.sin(phi) * Math.sin(theta);
      const nz = Math.cos(phi);

      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      dirs[i * 3] = nx;
      dirs[i * 3 + 1] = ny;
      dirs[i * 3 + 2] = nz;

      rands[i] = Math.random();
    }
    return { positions: pos, directions: dirs, randoms: rands };
  }, []);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uRadius: { value: radius },
        uTexture: { value: texture }
      },
      vertexShader: `
        attribute vec3 direction;
        attribute float aRandom;
        
        uniform float uTime;
        uniform float uRadius;
        
        varying float vOpacity;
        
        void main() {
          float speed = 0.3 + aRandom * 0.4; 
          float t = uTime * speed + aRandom * 10.0;
          float currentDist = mod(t, uRadius); 
          vec3 newPos = direction * currentDist;
          float normDist = currentDist / uRadius;
          vOpacity = smoothstep(0.0, 0.2, normDist) * (1.0 - smoothstep(0.6, 1.0, normDist));
          float size = 8.0 * (1.0 + normDist);
          vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (20.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform sampler2D uTexture;
        varying float vOpacity;
        
        void main() {
          vec4 texColor = texture2D(uTexture, gl_PointCoord);
          if (texColor.a < 0.01) discard;
          gl_FragColor = vec4(uColor, texColor.a * vOpacity * 0.3);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, [color, radius, texture]);

  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <points ref={pointsRef} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-direction" count={count} array={directions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={1} />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  );
};

// --- 3. 轨道环 (Orbital Ring) ---
const OrbitalRing = ({ 
  radius, 
  color, 
  speed, 
  axis, 
  opacity = 0.6,
  thickness = 0.04
}: { 
  radius: number, 
  color: string, 
  speed: number, 
  axis: [number, number, number],
  opacity?: number,
  thickness?: number
}) => {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.getElapsedTime();
      ref.current.rotation.x = time * speed * axis[0];
      ref.current.rotation.y = time * speed * axis[1];
      ref.current.rotation.z = time * speed * axis[2];
    }
  });

  return (
    <mesh ref={ref} raycast={() => null}>
      <torusGeometry args={[radius, thickness, 6, 64]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={opacity} 
        side={THREE.DoubleSide} 
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export const FamilyGasCloud: React.FC<FamilyGasCloudProps> = ({ position, color, radius }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.5;
      
      // 添加匀速自转
      // 修改：速度增加两倍 (0.12 -> 0.24)
      groupRef.current.rotation.y = t * 0.24;
    }
  });

  return (
    <group position={position} ref={groupRef}>
      
      {/* 0. NEW: 延伸到外层的浅色光晕 (Ambient Glow) */}
      <AmbientGlow color={color} radius={radius} />

      {/* 2. 内层：保留原有的高光能量核心 (RimSphere - Unchanged) */}
      <RimSphere radius={radius * 0.85} color={color} power={3.5} intensity={0.7} />

      {/* 内部飘散的雾气 (Mist) */}
      <MistParticles radius={radius * 1.0} color={color} />

      {/* NEW: 内部微小星点 (Micro Stars) */}
      <MicroStars radius={radius} color={color} />

      {/* 轨道环系统 (Orbital Rings) */}
      <OrbitalRing radius={radius} color={color} speed={0.15} axis={[0.2, 1.0, 0.1]} thickness={0.05} opacity={0.15} />
      <OrbitalRing radius={radius * 0.95} color={color} speed={0.12} axis={[1.0, 0.2, 0.3]} thickness={0.04} opacity={0.12} />
      <OrbitalRing radius={radius * 0.75} color={color} speed={-0.2} axis={[0.5, 0.5, 1.0]} thickness={0.03} opacity={0.1} />
      <OrbitalRing radius={radius * 1.15} color={color} speed={0.05} axis={[0, 0.1, 1]} thickness={0.02} opacity={0.08} />
      <OrbitalRing radius={radius * 1.2} color={color} speed={0.04} axis={[0.5, 0.8, 0]} thickness={0.02} opacity={0.06} />
      <OrbitalRing radius={radius * 1.08} color={color} speed={-0.08} axis={[0.2, 0, 1]} thickness={0.015} opacity={0.08} />
      <OrbitalRing radius={radius * 1.18} color={color} speed={0.15} axis={[1, 0.5, 0.5]} thickness={0.01} opacity={0.05} />

    </group>
  );
};
