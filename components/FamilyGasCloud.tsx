'use client';


import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../types';

interface FamilyGasCloudProps {
  position: [number, number, number];
  color: string;
  radius: number;
}

// --- NEW: 鐜鍏夋檿 (Ambient Glow) ---
// 浣跨敤 Sprite 瀹炵幇锛岀‘淇濆厜鏅曟€绘槸鏌斿拰鍦伴潰鍚戠浉鏈猴紝瑕嗙洊鍒版渶澶栧眰杞ㄩ亾
const AmbientGlow = ({ color, radius }: { color: string, radius: number }) => {
  const spriteRef = useRef<THREE.Sprite>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 鍒涘缓闈炲父鏌斿拰鐨勫緞鍚戞笎鍙?
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');       // 涓績锛氱櫧鑹叉渶浜?
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');   // 鍐呭湀锛氳繀閫熻“鍑?
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');   // 涓湀锛氭贰娣＄殑棰滆壊
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');             // 澶栧湀锛氬畬鍏ㄩ€忔槑
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    if (spriteRef.current) {
      const t = state.clock.getElapsedTime();
      // 鍛煎惛鏁堟灉锛氳交寰缉鏀?
      const pulse = 1 + Math.sin(t * 0.8) * 0.05;
      
      // 灏哄璁惧畾锛?
      // 鏍稿績鍗婂緞 * 3.8 纭繚鍏夋檿瓒冲澶э紝鑳藉寘瑁逛綇澶栧眰杞ㄩ亾 (杞ㄩ亾鏈€杩滅害 radius * 1.2)
      // 3.8 / 2 = 1.9 (鍗婂緞鍊嶆暟)锛岃冻浠ヨ鐩?1.2 鐨勮建閬撳苟鑷劧娑堟暎
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
        // 娴呮祬鐨勫彂鍏夛細浣庝笉閫忔槑搴?+ 鍙犲姞娣峰悎
        opacity={0.15} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
      />
    </sprite>
  );
};

// --- MODIFIED: 寰皬鏄熺偣 (Micro Stars) ---
// 淇敼锛氭暟閲?0锛屽父浜紝灏哄500-1000闅忔満锛屽鍔犺繛绾?
const MicroStars = ({ radius, color }: { radius: number; color: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  const count = 20; 

  // 鍚屾椂璁＄畻鐐圭殑浣嶇疆鍜岀嚎娈电殑鍑犱綍鏁版嵁
  const { positions, randoms, linePositions } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rands = new Float32Array(count); 
    const vec3s: THREE.Vector3[] = [];

    // 1. 鐢熸垚鏄熺偣浣嶇疆
    for (let i = 0; i < count; i++) {
      // 鍦ㄧ悆浣撳唴閮ㄩ殢鏈哄垎甯冿紝绋嶅井鍚戜腑蹇冭仛闆?
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

    // 2. 鐢熸垚杩炵嚎 (杩炴帴鏈€杩戠殑3涓偦灞咃紝褰㈡垚鏄熷骇鎰?
    const linePosList: number[] = [];
    for (let i = 0; i < count; i++) {
      // 璁＄畻褰撳墠鐐瑰埌鎵€鏈夊叾浠栫偣鐨勮窛绂?
      const distances = vec3s.map((v, idx) => ({ idx, d: v.distanceTo(vec3s[i]) }));
      // 鎺掑簭锛堟帓闄よ嚜宸憋紝鍥犱负璺濈涓?锛?
      distances.sort((a, b) => a.d - b.d);
      
      // 杩炴帴鏈€杩戠殑3涓偣
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
          
          vAlpha = 0.95; // 淇濇寔楂樹寒搴?
          
          // 澶у皬璁惧畾锛?00.0 (鍩虹) + 500.0 (闅忔満) = 鑼冨洿 [500, 1000]
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
          
          // 鏌斿拰杈圭紭
          float glow = 1.0 - (r * 2.0);
          glow = pow(glow, 1.5);
          
          // 澧炲己鐧借壊鏍稿績
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
        // 鏁翠釜鏄熺偣+杩炵嚎缁勮繘琛岀紦鎱㈣嚜杞?
        // 淇敼锛氶€熷害澧炲姞涓ゅ€?(0.03 -> 0.06)
        groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 鏋佺粏鐨勮繛绾?*/}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={linePositions.length / 3} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial 
          color={color} 
          transparent 
          opacity={0.12} // 鏋佷綆鐨勯€忔槑搴︼紝闅愮害鍙
          linewidth={1} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* 鏄熺偣 */}
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

// --- 1. 杈圭紭鍏夋檿鐞冧綋 (Fresnel Rim) - 浠呯敤浜庡唴灞傛牳蹇?---
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

// --- 2. 椋樻暎闆炬皵绮掑瓙 (Drifting Mist) ---
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

// --- 3. 杞ㄩ亾鐜?(Orbital Ring) ---
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
      
      // 娣诲姞鍖€閫熻嚜杞?
      // 淇敼锛氶€熷害澧炲姞涓ゅ€?(0.12 -> 0.24)
      groupRef.current.rotation.y = t * 0.24;
    }
  });

  return (
    <group position={position} ref={groupRef}>
      
      {/* 0. NEW: 寤朵几鍒板灞傜殑娴呰壊鍏夋檿 (Ambient Glow) */}
      <AmbientGlow color={color} radius={radius} />

      {/* 2. 鍐呭眰锛氫繚鐣欏師鏈夌殑楂樺厜鑳介噺鏍稿績 (RimSphere - Unchanged) */}
      <RimSphere radius={radius * 0.85} color={color} power={3.5} intensity={0.7} />

      {/* 鍐呴儴椋樻暎鐨勯浘姘?(Mist) */}
      <MistParticles radius={radius * 1.0} color={color} />

      {/* NEW: 鍐呴儴寰皬鏄熺偣 (Micro Stars) */}
      <MicroStars radius={radius} color={color} />

      {/* 杞ㄩ亾鐜郴缁?(Orbital Rings) */}
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


