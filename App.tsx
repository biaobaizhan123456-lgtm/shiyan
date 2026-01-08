
'use client';

import React, { useState, Suspense, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GalaxyCluster } from './components/GalaxyCluster';
import { Constellations } from './components/Constellations';
import { FamilyGasCloud } from './components/FamilyGasCloud';
import { UIOverlay } from './components/UIOverlay';
import { Inspiration } from './types';
import { processInput } from './services/geminiService';

// --- 轨道参数定义 ---
const ORBIT_RX = 42; 
const ORBIT_RZ = 28; 
const ORBIT_SLOPE_X = 0.45; 
const ORBIT_SLOPE_Z = -0.65; 

export const FAMILIES = [
  { 
    name: 'Aether', 
    domain: '未来与逻辑', 
    baseColor: '#8DD1FE', 
    deepColor: '#00C2FF', 
    initialAngle: 0 
  },
  { 
    name: 'Void', 
    domain: '梦境与哲学', 
    baseColor: '#F6B3C7', 
    deepColor: '#9D4EDD', 
    initialAngle: Math.PI 
  },
  { 
    name: 'Veris', 
    domain: '生机与自然', 
    baseColor: '#8EF3C8', 
    deepColor: '#00FF9D', 
    initialAngle: 3 * Math.PI / 2 
  },
  { 
    name: 'Helios', 
    domain: '热情与创造', 
    baseColor: '#F8E7B9', 
    deepColor: '#F8E7B9', 
    initialAngle: Math.PI / 2 
  },
];

export const getOrbitPosition = (baseAngle: number, rotationOffset: number): THREE.Vector3 => {
  const theta = baseAngle + rotationOffset;
  const x = ORBIT_RX * Math.cos(theta);
  const z = ORBIT_RZ * Math.sin(theta);
  const y = x * ORBIT_SLOPE_X + z * ORBIT_SLOPE_Z; 
  return new THREE.Vector3(x, y, z);
};

const generateProceduralArt = (family: string) => {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const width = 600;
  const height = 450;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 0, height);

  if (family === 'Aether') {
    grad.addColorStop(0, '#020024');
    grad.addColorStop(0.5, '#090979');
    grad.addColorStop(1, '#00d4ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 50, 60, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00C2FF';
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    const horizon = height * 0.6;
    for (let i = -width; i < width * 2; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, height);
        ctx.lineTo(width / 2 + (i - width/2) * 0.1, horizon);
        ctx.stroke();
    }
    for (let i = horizon; i < height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }
  } else if (family === 'Void') {
    grad.addColorStop(0, '#1a0b2e');
    grad.addColorStop(1, '#430d4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    for(let i=0; i<8; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = 50 + Math.random() * 150;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(157, 78, 221, 0.3)' : 'rgba(255, 0, 100, 0.1)';
        ctx.filter = 'blur(40px)'; 
        ctx.fill();
    }
    ctx.filter = 'none';
    ctx.fillStyle = '#fff';
    for(let i=0; i<100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const s = Math.random() * 2;
        ctx.globalAlpha = Math.random();
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (family === 'Veris') {
    grad.addColorStop(0, '#051c14'); 
    grad.addColorStop(1, '#1b4d3e'); 
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(100, 100, 40, 0, Math.PI*2);
    ctx.fillStyle = '#ccffdd';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00FF9D';
    ctx.fill();
    ctx.shadowBlur = 0;
    const drawMountain = (yOffset: number, color: string) => {
        ctx.beginPath();
        ctx.moveTo(0, height);
        let x = 0;
        let y = yOffset;
        while (x < width) {
            x += 10 + Math.random() * 20;
            y = yOffset + (Math.random() - 0.5) * 50;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.fillStyle = color;
        ctx.fill();
    };
    drawMountain(height * 0.6, '#0f382a');
    drawMountain(height * 0.8, '#001a11');
  } else if (family === 'Helios') {
    grad.addColorStop(0, '#7D5A00'); 
    grad.addColorStop(0.4, '#B8860B'); 
    grad.addColorStop(1, '#F8E7B9'); 
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(width/2, height*0.7, 100, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.2, height);
    ctx.lineTo(width * 0.5, height * 0.4);
    ctx.lineTo(width * 0.8, height);
    ctx.stroke();
  }
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

const CosmicCompass = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  const getPlaneY = (x: number, z: number) => x * ORBIT_SLOPE_X + z * ORBIT_SLOPE_Z;

  const radialLines = useMemo(() => {
    const points = [];
    const count = 12;
    const innerRadius = 25;
    const outerRadius = 180;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const x1 = c * innerRadius;
      const z1 = s * innerRadius;
      points.push(new THREE.Vector3(x1, getPlaneY(x1, z1), z1));
      const x2 = c * outerRadius;
      const z2 = s * outerRadius;
      points.push(new THREE.Vector3(x2, getPlaneY(x2, z2), z2));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const arcLines = useMemo(() => {
    const points = [];
    const radii = [
        { x: ORBIT_RX * 1.2, z: ORBIT_RZ * 1.2 }, 
        { x: ORBIT_RX * 1.8, z: ORBIT_RZ * 1.8 },
        { x: ORBIT_RX * 2.5, z: ORBIT_RZ * 2.5 }
    ];
    radii.forEach(r => {
        const segments = 3;
        for(let i=0; i<segments; i++) {
            const startAngle = Math.random() * Math.PI * 2;
            const length = Math.PI * 0.5 + Math.random() * 1.0; 
            const curve = new THREE.EllipseCurve(0, 0, r.x, r.z, startAngle, startAngle + length, false, 0);
            const pts = curve.getPoints(64).map(p => {
              const x = p.x;
              const z = p.y; 
              return new THREE.Vector3(x, getPlaneY(x, z), z);
            });
            for(let j=0; j<pts.length -1; j++) {
                points.push(pts[j]);
                points.push(pts[j+1]);
            }
        }
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const dottedGeometry = useMemo(() => {
    const pts = [];
    const count = 120;
    const rx = ORBIT_RX * 3.2;
    const rz = ORBIT_RZ * 3.2;
    for(let i=0; i<count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = rx * Math.cos(angle);
        const z = rz * Math.sin(angle);
        const y = getPlaneY(x, z);
        pts.push(x, y, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);

  const markerGeometry = useMemo(() => {
     const points = [];
     const size = 1.5;
     const markers = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
     markers.forEach(angle => {
         const rx = ORBIT_RX * 2.2;
         const rz = ORBIT_RZ * 2.2;
         const centerX = rx * Math.cos(angle);
         const centerZ = rz * Math.sin(angle);
         const addPoint = (x: number, z: number) => {
           points.push(new THREE.Vector3(x, getPlaneY(x, z), z));
         };
         addPoint(centerX - size, centerZ);
         addPoint(centerX + size, centerZ);
         addPoint(centerX, centerZ - size);
         addPoint(centerX, centerZ + size);
     });
     return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <group ref={groupRef} position={[0, -10, 0]}> 
      <lineSegments geometry={radialLines}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={arcLines}>
        <lineBasicMaterial color="#aaccff" transparent opacity={0.18} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={markerGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
      <points geometry={dottedGeometry}>
        <pointsMaterial size={1.2} color="#ffffff" transparent opacity={0.25} depthWrite={false} sizeAttenuation={true} />
      </points>
    </group>
  );
};

// --- Single Community Star Item (Mesh-based for Interaction) ---
const CommunityStarItem = ({ 
  index,
  offset, 
  familyAngle, 
  color, 
  random,
  galaxyRotationRef,
  onClick
}: { 
  index: number,
  offset: THREE.Vector3, 
  familyAngle: number, 
  color: THREE.Color, 
  random: number,
  galaxyRotationRef: React.MutableRefObject<number>,
  onClick: (index: number) => void
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const currentRotation = galaxyRotationRef.current;

    // Replicate Vertex Shader Logic in CPU
    const currentAngle = familyAngle + currentRotation;
    const hubX = ORBIT_RX * Math.cos(currentAngle);
    const hubZ = ORBIT_RZ * Math.sin(currentAngle);
    const hubY = hubX * ORBIT_SLOPE_X + hubZ * ORBIT_SLOPE_Z;

    const drift = new THREE.Vector3(
      Math.sin(t * 0.5 + random * 10.0),
      Math.cos(t * 0.3 + random * 20.0),
      Math.sin(t * 0.4 + random * 15.0)
    ).multiplyScalar(1.5);

    if (meshRef.current) {
       meshRef.current.position.set(hubX, hubY, hubZ).add(offset).add(drift);
       // Billboarding: always look at camera
       meshRef.current.lookAt(state.camera.position);
    }
    
    // Shader Uniforms Update
    if (materialRef.current) {
        const breath = 0.5 + 0.5 * Math.sin(t * 2.5 + random * 100.0);
        materialRef.current.uniforms.uAlpha.value = 0.6 + 0.4 * breath;
    }
  });

  const material = useMemo(() => new THREE.ShaderMaterial({
     uniforms: {
        uColor: { value: color },
        uAlpha: { value: 1.0 }
     },
     vertexShader: `
       varying vec2 vUv;
       void main() {
         vUv = uv;
         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
       }
     `,
     fragmentShader: `
       uniform vec3 uColor;
       uniform float uAlpha;
       varying vec2 vUv;
       void main() {
         vec2 uv = vUv - 0.5;
         float r = length(uv);
         if (r > 0.5) discard;
         
         float d = r * 2.0; 
         float core = smoothstep(0.15, 0.05, d);
         float glow = exp(-d * 4.0) * 0.3;
         
         float ringRadius = 0.75;
         float ringWidth = 0.05;
         float ring = smoothstep(ringWidth, 0.0, abs(d - ringRadius));
         ring *= 0.8;
         
         float totalAlpha = core + glow + ring;
         vec3 finalColor = mix(uColor, vec3(1.0), core * 0.9);
         
         gl_FragColor = vec4(finalColor, uAlpha * totalAlpha);
       }
     `,
     transparent: true,
     blending: THREE.AdditiveBlending,
     depthWrite: false,
     side: THREE.DoubleSide
  }), [color]);

  // Size calculation based on original shader
  const size = (1.8 + random * 0.8) * 3; // Increased by 3x

  return (
    <mesh 
       ref={meshRef} 
       onClick={(e) => {
         e.stopPropagation();
         onClick(index);
       }}
       onPointerOver={() => document.body.style.cursor = 'pointer'}
       onPointerOut={() => document.body.style.cursor = 'default'}
    >
       <planeGeometry args={[size, size]} />
       <primitive object={material} attach="material" ref={materialRef} />
    </mesh>
  );
}

// --- Community Stars ---
const CommunityStars = ({ 
  galaxyRotationRef,
  onSelect
}: { 
  galaxyRotationRef: React.MutableRefObject<number>,
  onSelect: (index: number) => void
}) => {
  const countPerFamily = 10;
  
  const starsData = useMemo(() => {
    const data = [];
    let index = 0;
    FAMILIES.forEach((family) => {
      const baseColor = new THREE.Color(family.baseColor);
      for (let i = 0; i < countPerFamily; i++) {
        const r = 16 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const dx = r * Math.sin(phi) * Math.cos(theta);
        const dy = r * Math.sin(phi) * Math.sin(theta);
        const dz = r * Math.cos(phi);

        const c = baseColor.clone();
        c.offsetHSL(0, -0.2, (Math.random() - 0.5) * 0.1);

        data.push({
           index: index++,
           offset: new THREE.Vector3(dx, dy, dz),
           familyAngle: family.initialAngle,
           color: c,
           random: Math.random()
        });
      }
    });
    return data;
  }, []);

  return (
    <group>
      {starsData.map((star) => (
         <CommunityStarItem 
            key={star.index}
            {...star}
            galaxyRotationRef={galaxyRotationRef}
            onClick={onSelect}
         />
      ))}
    </group>
  );
};

const OrbitalStarField = () => {
  const count = 500; 
  const pointsRef = useRef<THREE.Points>(null);
  const starRx = ORBIT_RX * 0.75; 
  const starRz = ORBIT_RZ * 0.75;

  const { positions, angles, offsets, sizes, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ang = new Float32Array(count);
    const off = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      ang[i] = angle;
      const rOffset = (Math.random() - 0.65) * 35.0;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const dx = c * rOffset;
      const dz = s * rOffset;
      const dyPlane = dx * ORBIT_SLOPE_X + dz * ORBIT_SLOPE_Z;
      const dyJitter = (Math.random() - 0.5) * 8.0;
      off[i * 3] = dx;
      off[i * 3 + 1] = dyPlane + dyJitter;
      off[i * 3 + 2] = dz;
      sz[i] = 25; 
      ph[i] = Math.random() * Math.PI * 2;
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
    }
    return { positions: pos, angles: ang, offsets: off, sizes: sz, phases: ph };
  }, [starRx, starRz]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 1.0 },
        uRx: { value: starRx },
        uRz: { value: starRz },
        uSlopeX: { value: ORBIT_SLOPE_X },
        uSlopeZ: { value: ORBIT_SLOPE_Z }
      },
      vertexShader: `
        attribute float aAngle;
        attribute vec3 aOffset;
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uRx;
        uniform float uRz;
        uniform float uSlopeX;
        uniform float uSlopeZ;
        varying float vAlpha;
        void main() {
          float currentAngle = aAngle + uTime * 0.05;
          float bx = uRx * cos(currentAngle);
          float bz = uRz * sin(currentAngle);
          float by = bx * uSlopeX + bz * uSlopeZ;
          float bob = sin(uTime * 1.0 + aPhase) * 1.5;
          vec3 finalPos = vec3(bx, by, bz) + aOffset;
          finalPos.y += bob;
          vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float twinkle = sin(uTime * 2.0 + aPhase);
          vAlpha = (0.4 + 0.6 * (0.5 + 0.5 * twinkle)) * 0.4;
          gl_PointSize = aSize * 40.0 * uPixelRatio * (1.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord.xy - 0.5;
          float r = length(uv);
          if (r > 0.5) discard;
          float glow = 1.0 - (r * 2.0);
          glow = pow(glow, 2.0);
          gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [starRx, starRz]);

  useFrame((state) => {
    if (material) {
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aAngle" count={count} array={angles} itemSize={1} />
        <bufferAttribute attach="attributes-aOffset" count={count} array={offsets} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phases} itemSize={1} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
};

const OrbitingObject = ({
  initialAngle,
  rotationRef,
  children
}: React.PropsWithChildren<{ initialAngle: number, rotationRef: React.MutableRefObject<number> }>) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (groupRef.current) {
      const pos = getOrbitPosition(initialAngle, rotationRef.current);
      groupRef.current.position.copy(pos);
    }
  });
  return <group ref={groupRef}>{children}</group>;
};

const SceneManager = ({ 
  focusedFamily, 
  selectedId, 
  inspirations,
  clusters,
  galaxyRotationRef
}: { 
  focusedFamily: string | null, 
  selectedId: string | null,
  inspirations: Inspiration[],
  clusters: any[],
  galaxyRotationRef: React.MutableRefObject<number>
}) => {
  const { camera, controls, size } = useThree() as any;
  const isMobile = size.width < size.height;
  const multiplier = isMobile ? 2.5 : 1.4;
  const defaultPos = useMemo(() => new THREE.Vector3(0, 30, 120 * multiplier), [multiplier]);
  const targetPos = useRef(defaultPos.clone());
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isTransitioning = useRef(false);
  const prevFamily = useRef<string | null>(null);
  const prevSelectedId = useRef<string | null>(null);

  useEffect(() => {
    const familyChanged = focusedFamily !== prevFamily.current;
    const returnedFromDetail = prevSelectedId.current !== null && selectedId === null && focusedFamily !== null;
    if (familyChanged || returnedFromDetail) {
      isTransitioning.current = true; 
    }
    prevFamily.current = focusedFamily;
    prevSelectedId.current = selectedId;
    
    if (!controls) return;
    const startInteraction = () => { isTransitioning.current = false; };
    controls.addEventListener('start', startInteraction);
    return () => controls.removeEventListener('start', startInteraction);
  }, [controls, focusedFamily, selectedId]);

  useFrame(() => {
    const currentRotation = galaxyRotationRef.current || 0;
    const lerpFactor = selectedId ? 0.1 : 0.05;

    if (selectedId) {
      let ins = inspirations.find(i => i.id === selectedId);
      if (!ins && selectedId.includes('_link_')) {
          const parentId = selectedId.split('_link_')[0];
          ins = inspirations.find(i => i.id === parentId);
      }
      
      // If it is a Community ID (not found in user inspirations), we check if it starts with 'community-'
      // For community nodes, we don't zoom the camera (or we could, but they are moving constantly). 
      // We'll keep the camera in Overview mode or just maintain current position if it's a community node to avoid dizziness.
      if (selectedId.startsWith('community-')) {
         // Optionally gentle drift or maintain overview. 
         // Let's just maintain Default Pos but maybe slightly closer?
         // Actually, do nothing allows user to pan around freely while overlay is open.
         // Or revert to Overview logic:
         targetLookAt.current.set(0, 0, 0);
         // Keep overview but maybe slightly blurred background logic is handled by overlay
         camera.position.lerp(defaultPos, 0.025);
         if (controls) {
             controls.target.lerp(targetLookAt.current, 0.025);
             controls.update();
         }
         return; 
      }

      if (ins) {
        const cluster = clusters.find(c => c.id === ins.clusterId);
        if (cluster) {
          const familyDef = FAMILIES.find(f => f.name === cluster.family);
          const familyHubPos = familyDef 
            ? getOrbitPosition(familyDef.initialAngle, currentRotation)
            : new THREE.Vector3(0,0,0);
          const clusterOffset = new THREE.Vector3(...cluster.center);
          const nodeWorldPos = familyHubPos.clone().add(clusterOffset).add(new THREE.Vector3(...ins.position));
          const balanceOffset = isMobile ? 0.4 : 0.2;
          targetLookAt.current.set(nodeWorldPos.x, nodeWorldPos.y - balanceOffset, nodeWorldPos.z);
          const dist = isMobile ? 9.0 : 7.0;
          targetPos.current.set(nodeWorldPos.x + dist, nodeWorldPos.y + 2.5, nodeWorldPos.z + dist);
          camera.position.lerp(targetPos.current, lerpFactor);
          if (controls) {
            controls.target.lerp(targetLookAt.current, lerpFactor);
            controls.update();
          }
        }
      }
    } else if (focusedFamily) {
      const familyDef = FAMILIES.find(f => f.name === focusedFamily);
      if (familyDef) {
        const hubPos = getOrbitPosition(familyDef.initialAngle, currentRotation);
        targetLookAt.current.copy(hubPos);
        if (controls) {
            controls.target.lerp(targetLookAt.current, 0.1);
            controls.update();
        }
        if (isTransitioning.current) {
           const zoomFactor = isMobile ? 22 : 16;
           const idealCameraPos = new THREE.Vector3(
             hubPos.x + zoomFactor,
             hubPos.y + zoomFactor * 0.6,
             hubPos.z + zoomFactor
           );
           camera.position.lerp(idealCameraPos, 0.08);
           if (camera.position.distanceTo(idealCameraPos) < 2.0) {
             isTransitioning.current = false;
           }
        }
      }
    } else {
      targetLookAt.current.set(0, 0, 0);
      targetPos.current.copy(defaultPos);
      camera.position.lerp(targetPos.current, 0.025);
      if (controls) {
          controls.target.lerp(targetLookAt.current, 0.025);
          controls.update();
      }
    }
  });

  return null;
};

const App: React.FC = () => {
  const clusters = useMemo(() => {
    const clusterField = [];
    let idCounter = 0;
    FAMILIES.forEach((family) => {
      const subClusterCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < subClusterCount; i++) {
        const offset = 5.5; 
        const center: [number, number, number] = [
          (Math.random() - 0.5) * offset * 2.8,
          (Math.random() - 0.5) * offset * 2.8,
          (Math.random() - 0.5) * offset * 3.6, 
        ];
        const color = new THREE.Color(family.deepColor);
        color.offsetHSL((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
        clusterField.push({
          id: idCounter++,
          color: `#${color.getHexString()}`,
          center,
          family: family.name,
          initialAngle: family.initialAngle 
        });
      }
    });
    return clusterField;
  }, []);

  // --- Mock Community Data Generation ---
  const communityInspirations = useMemo(() => {
     const items: Inspiration[] = [];
     const totalStars = FAMILIES.length * 10;
     const contents = [
       "来自另一条时间线的问候。", "这里也是一片孤独的星域吗？", "我们在寻找丢失的信号。", "光是唯一的语言。", "记忆是灵魂的备份。",
       "每一个原子都是一个宇宙。", "听见了吗？那是虚空的脉搏。", "我们在梦境中相遇。", "熵增是宇宙最温柔的拥抱。", "请不要忘记这瞬间的感动。"
     ];
     for(let i=0; i<totalStars; i++) {
        const familyIdx = Math.floor(i / 10);
        const family = FAMILIES[familyIdx];
        items.push({
           id: `community-${i}`,
           title: `来自 ${family.name} 的回响`,
           content: contents[i % contents.length],
           type: 'text',
           timestamp: Date.now() - Math.random() * 10000000000,
           clusterId: -1, // Special ID
           position: [0,0,0], // Not used for spatial layout
           mediaData: generateProceduralArt(family.name)
        });
     }
     return items;
  }, []);

  const [inspirations, setInspirations] = useState<Inspiration[]>(() => {
    const PRESETS = [
      { family: 'Aether', title: '数字地平线', content: '算法在虚空中沉思，逻辑的尽头是无限的诗篇。', type: 'text' },
      { family: 'Aether', title: '熵减协议', content: '我们在混乱的数据洪流中，寻找那唯一的有序结构。', type: 'text' },
      { family: 'Aether', title: '量子纠缠', content: '即便相隔亿万光年，此刻的思绪依然与你共振。', type: 'text' },
      { family: 'Void', title: '深渊回响', content: '当你凝视宇宙时，星辰也在以光年为单位回望你的灵魂。', type: 'text' },
      { family: 'Void', title: '星尘梦呓', content: '在这个维度的缝隙里，梦境比现实更加坚硬。', type: 'text' },
      { family: 'Void', title: '永恒静默', content: '沉默不是空无一物，而是所有声音的休止符。', type: 'text' },
      { family: 'Veris', title: '虚空之花', content: '生命在绝对零度中绽放，对抗着熵增的宿命。', type: 'text' },
      { family: 'Veris', title: '时光年轮', content: '每一颗恒星的熄灭，都是宇宙在树干上刻下的一圈纹路。', type: 'text' },
      { family: 'Veris', title: '碳基奇迹', content: '我们是会呼吸的星尘，在此刻拥有了短暂的意识。', type: 'text' },
      { family: 'Helios', title: '创世火花', content: '热情燃烧的瞬间，新的宇宙在意识中诞生。', type: 'text' },
      { family: 'Helios', title: '光子风暴', content: '灵感如耀斑爆发，瞬间照亮了未知的黑暗领域。', type: 'text' },
      { family: 'Helios', title: '恒星脉冲', content: '心跳与引力波同步，演奏着无声的狂想曲。', type: 'text' },
    ];
    const initialData: Inspiration[] = [];
    PRESETS.forEach((preset, index) => {
      const familyClusters = clusters.filter(c => c.family === preset.family);
      if (familyClusters.length > 0) {
        const targetCluster = familyClusters[Math.floor(Math.random() * familyClusters.length)];
        const art = generateProceduralArt(preset.family);
        initialData.push({
          id: `preset-${index}`,
          title: preset.title,
          content: preset.content,
          position: [
            (Math.random() - 0.5) * 3.0,
            (Math.random() - 0.5) * 3.0,
            (Math.random() - 0.5) * 3.0
          ],
          timestamp: Date.now() - Math.floor(Math.random() * 100000000), 
          clusterId: targetCluster.id,
          type: preset.type as 'text' | 'voice' | 'image',
          mediaData: art 
        });
      }
    });
    return initialData;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [focusedFamily, setFocusedFamily] = useState<string | null>(null);
  const [isCommunityMode, setIsCommunityMode] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const rotationVelocity = useRef(0);
  const galaxyRotation = useRef(0); 
  
  const isLevel1 = !focusedFamily && !selectedId;

  // Combine for UIOverlay lookup
  const combinedInspirations = useMemo(() => {
     return [...inspirations, ...communityInspirations];
  }, [inspirations, communityInspirations]);

  const activeThemeColor = useMemo(() => {
    if (selectedId) {
      if (selectedId.startsWith('community-')) {
          // Find family of the community item (hacky logic based on index)
          const idx = parseInt(selectedId.split('-')[1]);
          if (!isNaN(idx)) {
              const famIdx = Math.floor(idx / 10) % FAMILIES.length;
              return FAMILIES[famIdx].deepColor;
          }
          return '#ffffff';
      }
      let actualId = selectedId;
      if (selectedId.includes('_link_')) {
          actualId = selectedId.split('_link_')[0];
      }
      const ins = inspirations.find(i => i.id === actualId);
      if (ins) {
        const cluster = clusters.find(c => c.id === ins.clusterId);
        if (cluster) return cluster.color;
      }
    }
    if (focusedFamily) {
      const family = FAMILIES.find(f => f.name === focusedFamily);
      return family?.deepColor || '#ffffff';
    }
    return '#ffffff';
  }, [selectedId, focusedFamily, inspirations, clusters]);

  const visibleClusters = useMemo(() => {
    if (!focusedFamily) return clusters;
    return clusters.filter(c => c.family === focusedFamily);
  }, [clusters, focusedFamily]);

  const handleAddInspiration = async (type: 'text' | 'voice' | 'image', data: string, targetFamilyName?: string) => {
    setIsGenerating(true);
    try {
      const result = await processInput(type, data);
      const familyToUse = targetFamilyName || focusedFamily || FAMILIES[0].name; 
      const targetPool = clusters.filter(c => c.family === familyToUse);
      const finalPool = targetPool.length > 0 ? targetPool : clusters;
      const targetCluster = finalPool[Math.floor(Math.random() * finalPool.length)];
      
      // Determine mediaData (Visual) and audioData (Sound)
      let visualData = data;
      let audioData = undefined;

      if (type === 'voice') {
          // For voice, we generate procedural art for the node visual, but keep the audio data
          visualData = generateProceduralArt(familyToUse);
          audioData = data;
      } else if (type === 'text') {
          visualData = generateProceduralArt(familyToUse);
      }
      // For type === 'image', data is already the base64 image, so visualData = data

      const newInspiration: Inspiration = {
        id: Math.random().toString(36).substr(2, 9),
        title: result.title,
        content: result.content,
        position: [
          (Math.random() - 0.5) * 3.0,
          (Math.random() - 0.5) * 3.0,
          (Math.random() - 0.5) * 3.0
        ],
        timestamp: Date.now(),
        clusterId: targetCluster.id,
        type: type,
        mediaData: visualData,
        audioData: audioData
      };
      setInspirations(prev => [newInspiration, ...prev]);
      setSelectedId(newInspiration.id);
    } catch (error) {
      console.error("Failed to manifest inspiration", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateInspiration = useCallback((id: string, newMediaData: string) => {
    setInspirations(prev => prev.map(item => 
      item.id === id ? { ...item, mediaData: newMediaData } : item
    ));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    if (isLevel1) {
      isDragging.current = true;
      lastMouseX.current = e.clientX;
      document.body.style.cursor = 'grabbing';
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current && isLevel1) {
      const deltaX = e.clientX - lastMouseX.current;
      lastMouseX.current = e.clientX;
      rotationVelocity.current -= deltaX * 0.001; 
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
  };

  const PhysicsLoop = () => {
    useFrame(() => {
      if (isLevel1) {
        galaxyRotation.current += rotationVelocity.current;
        if (!isDragging.current) {
          rotationVelocity.current *= 0.95;
          galaxyRotation.current += 0.0012; 
        }
      } else {
        rotationVelocity.current = 0;
      }
    });
    return null;
  };

  const handleClusterInteraction = (familyName: string, e: any) => {
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (Math.sqrt(dx * dx + dy * dy) < 10 && !focusedFamily) {
      setFocusedFamily(familyName);
      setSelectedId(null);
    }
  };

  const handleNodeInteraction = (id: string, e: any) => {
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      e.stopPropagation();
      let actualId = id;
      if (id.includes('_link_')) {
          actualId = id.split('_link_')[0];
      }
      const ins = inspirations.find(i => i.id === actualId);
      if (ins) {
        setSelectedId(prev => (prev === id ? null : id));
        const cluster = clusters.find(c => c.id === ins.clusterId);
        if (cluster && cluster.family !== focusedFamily) {
          setFocusedFamily(cluster.family);
        }
      }
    }
  };

  return (
    <div 
      className="w-full h-screen relative bg-[#000000] select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Suspense fallback={null}>
        <Canvas 
          gl={{ 
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            powerPreference: 'high-performance'
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#000000']} />
          <PerspectiveCamera makeDefault fov={38} />
          <PhysicsLoop />
          <SceneManager 
            focusedFamily={focusedFamily} 
            selectedId={selectedId}
            inspirations={combinedInspirations}
            clusters={clusters}
            galaxyRotationRef={galaxyRotation}
          />
          
          <OrbitControls 
            makeDefault
            enableDamping 
            dampingFactor={0.06} 
            rotateSpeed={0.5} 
            zoomSpeed={0.8}
            minDistance={1}
            maxDistance={250}
            enableRotate={!isLevel1} 
          />

          <Environment preset="city" />
          <ambientLight intensity={0.25} />
          <spotLight position={[50, 50, 50]} angle={0.15} penumbra={1} intensity={2} />
          
          <directionalLight 
            position={[-10, 20, 10]} 
            intensity={focusedFamily ? 2.5 : 1.2} 
            color={focusedFamily ? activeThemeColor : '#aaccff'} 
          />
          
          <Stars radius={300} depth={100} count={focusedFamily ? 3000 : 5000} factor={7} saturation={1} fade speed={0} />

          {!focusedFamily && <CosmicCompass />}
          {!focusedFamily && <OrbitalStarField />}

          {/* Interactive Community Stars - NOW WITH CLICK HANDLER */}
          {!focusedFamily && isCommunityMode && (
             <CommunityStars 
                galaxyRotationRef={galaxyRotation} 
                onSelect={(index) => {
                   const ins = communityInspirations[index];
                   if (ins) setSelectedId(ins.id);
                }} 
             />
          )}

          {!focusedFamily && FAMILIES.map((family) => (
            <OrbitingObject 
              key={`cloud-${family.name}`} 
              initialAngle={family.initialAngle} 
              rotationRef={galaxyRotation}
            >
              <FamilyGasCloud 
                position={[0,0,0]} 
                color={family.baseColor} 
                radius={20} 
              />
            </OrbitingObject>
          ))}

          {!focusedFamily && (
             <Constellations 
                clusters={visibleClusters} 
                galaxyRotationRef={galaxyRotation} 
             />
          )}

          {visibleClusters.map((cluster) => {
             const family = FAMILIES.find(f => f.name === cluster.family);
             return (
               <OrbitingObject
                  key={cluster.id}
                  initialAngle={family ? family.initialAngle : 0}
                  rotationRef={galaxyRotation}
               >
                 <GalaxyCluster
                    id={cluster.id}
                    center={cluster.center} 
                    color={cluster.color} 
                    onSelect={(id, e) => handleNodeInteraction(id, e)}
                    onClick={(e) => handleClusterInteraction(cluster.family, e)}
                    selectedId={selectedId}
                    isFocused={!!focusedFamily}
                    inspirations={inspirations.filter(ins => ins.clusterId === cluster.id)}
                    showLinks={showLinks}
                  />
               </OrbitingObject>
             );
          })}

          <EffectComposer multisampling={2} enableNormalPass={false}>
            <Bloom 
              luminanceThreshold={0.15} 
              mipmapBlur 
              intensity={focusedFamily ? 1.5 : 0.8} 
              radius={0.7} 
            />
            <ChromaticAberration offset={new THREE.Vector2(0.0008, 0.0008)} />
            <Noise opacity={0.04} />
            <Vignette darkness={1.2} offset={0.2} />
          </EffectComposer>
        </Canvas>
      </Suspense>

      <UIOverlay 
        inspirations={combinedInspirations.filter(ins => {
           // 1. Always ensure the currently selected item is present (for Detail View), even if it's community
           if (selectedId && (ins.id === selectedId || selectedId.startsWith(ins.id + '_link_'))) return true;

           // 2. Filter out Community/Echo items from the sidebar list (they start with 'community-')
           if (ins.id.startsWith('community-')) return false;

           // 3. Filter by Family Focus (only show nodes belonging to current family)
           if (focusedFamily) {
              const cluster = clusters.find(c => c.id === ins.clusterId);
              return cluster?.family === focusedFamily;
           }
           
           // Default: show everything (filtered above)
           return true;
        })} 
        onAddInspiration={handleAddInspiration} 
        onUpdateInspiration={handleUpdateInspiration}
        onSelect={(id) => setSelectedId(prev => prev === id ? null : id)}
        onBack={() => {
          setFocusedFamily(null);
          setSelectedId(null);
        }}
        selectedId={selectedId}
        focusedFamily={focusedFamily}
        isGenerating={isGenerating}
        themeColor={activeThemeColor}
        isCommunityMode={isCommunityMode}
        onToggleCommunity={() => setIsCommunityMode(prev => !prev)}
        showLinks={showLinks}
        onToggleLinks={() => setShowLinks(prev => !prev)}
      />
    </div>
  );
};

export default App;
