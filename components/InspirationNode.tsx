'use client';


import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Inspiration } from '../types';

interface InspirationNodeProps {
  data: Inspiration;
  isSelected: boolean;
  onSelect: (id: string, e: any) => void;
  clusterColor: string;
  isFocused: boolean;
  showLinks: boolean;
}

export const InspirationNode: React.FC<InspirationNodeProps> = ({ 
  data, 
  isSelected, 
  onSelect, 
  clusterColor,
  isFocused,
  showLinks
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const linksGroupRef = useRef<THREE.Group>(null);
  const primaryLinkMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const secondaryLinkMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Track which part is active: 'main', 'primary' index, or 'secondary' index
  const [clickedPart, setClickedPart] = useState<{ type: 'main' | 'primary' | 'secondary', index: number }>({ type: 'main', index: 0 });

  // Reset to main when deselected
  useEffect(() => {
    if (!isSelected) {
      setClickedPart({ type: 'main', index: 0 });
    }
  }, [isSelected]);

  // Generate "Inspiration Links" - Primary and Secondary layers
  const { 
    primaryLinks, 
    secondaryLinks, 
    primaryLinesGeometry, 
    secondaryLinesGeometry 
  } = useMemo(() => {
    // Seeded random for deterministic generation based on ID
    const seedStr = data.id + "links_v3"; // Updated seed version
    let seed = 0;
    for(let i=0; i<seedStr.length; i++) seed += seedStr.charCodeAt(i);
    
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const pLinks = [];
    const sLinks = [];
    const pLinePoints = [];
    const sLinePoints = [];

    // Direction from cluster center to this node
    const nodeOutwardDir = new THREE.Vector3(...data.position).normalize();

    const count = 2 + Math.floor(random() * 4); // 2 to 5 primary links

    for(let i=0; i<count; i++) {
        // --- Primary Link ---
        const u = random();
        const v = random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        const dir = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi)
        );

        if (dir.dot(nodeOutwardDir) < -0.1) dir.negate();

        // Primary Length: 2.0 to 4.5
        const len = 2.0 + random() * 2.5;
        const endPoint = dir.clone().multiplyScalar(len);
        
        // Primary Size
        const size = (0.16 + random() * 0.20) * 1.5;

        pLinks.push({ endPoint, size });
        pLinePoints.push(new THREE.Vector3(0,0,0), endPoint);

        // --- Secondary Links (Nested) ---
        // Logic Update: Only ~1/3 of primary links spawn secondary links
        if (random() < 0.33) {
            const subCount = 1 + Math.floor(random() * 3); // 1 to 3 secondary links
            for(let j=0; j<subCount; j++) {
                const u2 = random();
                const v2 = random();
                const theta2 = 2 * Math.PI * u2;
                const phi2 = Math.acos(2 * v2 - 1);

                const dir2 = new THREE.Vector3(
                    Math.sin(phi2) * Math.cos(theta2),
                    Math.sin(phi2) * Math.sin(theta2),
                    Math.cos(phi2)
                );
                
                // Secondary Length: smaller (1.0 to 2.5)
                const len2 = 1.0 + random() * 1.5;
                const endPoint2 = endPoint.clone().add(dir2.multiplyScalar(len2));
                
                // Secondary Size: smaller
                const size2 = size * 0.6;

                sLinks.push({ endPoint: endPoint2, size: size2 });
                sLinePoints.push(endPoint, endPoint2);
            }
        }
    }
    
    const pGeo = new THREE.BufferGeometry().setFromPoints(pLinePoints);
    const sGeo = new THREE.BufferGeometry().setFromPoints(sLinePoints);
    
    return { 
        primaryLinks: pLinks, 
        secondaryLinks: sLinks, 
        primaryLinesGeometry: pGeo, 
        secondaryLinesGeometry: sGeo 
    };
  }, [data.id, data.position]);

  // Sync refs array length
  useEffect(() => {
    primaryLinkMeshRefs.current = primaryLinkMeshRefs.current.slice(0, primaryLinks.length);
    secondaryLinkMeshRefs.current = secondaryLinkMeshRefs.current.slice(0, secondaryLinks.length);
  }, [primaryLinks, secondaryLinks]);

  const linkColors = useMemo(() => {
    const c = new THREE.Color(clusterColor);
    const white = new THREE.Color('#ffffff');
    return {
        line: c.clone().lerp(white, 0.6), 
        point: white 
    };
  }, [clusterColor]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const uniqueTime = time + (parseInt(data.id.substring(0, 5), 36) || 0) % 1000;
    
    // 1. MAIN NODE ANIMATION
    if (meshRef.current) {
      const isMainActive = isSelected && clickedPart.type === 'main';
      const pulseSpeed = isMainActive ? 3 : 1.2;
      const pulseAmplitude = isMainActive ? 0.15 : 0.05;
      const pulse = Math.sin(uniqueTime * pulseSpeed) * pulseAmplitude + 1;
      
      let baseScale = 1.4; 
      if (isHovered) baseScale = 1.8;
      if (isMainActive) baseScale = 2.5;

      meshRef.current.scale.setScalar(baseScale * pulse);
      meshRef.current.rotation.y = uniqueTime * 0.3;
    }

    // 2. LINKS GROUP ANIMATION (Rotation & Toggle Visibility)
    if (linksGroupRef.current) {
        linksGroupRef.current.rotation.y = -uniqueTime * 0.05;
        linksGroupRef.current.rotation.z = Math.sin(uniqueTime * 0.1) * 0.1;

        const targetScale = showLinks ? 1 : 0;
        linksGroupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
        linksGroupRef.current.visible = linksGroupRef.current.scale.x > 0.01;
    }

    // 3. PRIMARY LINKS SCALING
    primaryLinkMeshRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const isLinkActive = isSelected && clickedPart.type === 'primary' && clickedPart.index === i;
        let targetScale = 1.0; 
        if (isLinkActive) {
             const pulse = Math.sin(uniqueTime * 3) * 0.15 + 1;
             targetScale = 2.5 * pulse; 
        }
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });

    // 4. SECONDARY LINKS SCALING
    secondaryLinkMeshRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const isLinkActive = isSelected && clickedPart.type === 'secondary' && clickedPart.index === i;
        let targetScale = 1.0; 
        if (isLinkActive) {
             const pulse = Math.sin(uniqueTime * 3) * 0.15 + 1;
             targetScale = 2.5 * pulse; 
        }
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });
    
    if (lightRef.current) {
      lightRef.current.intensity = isSelected ? 12 : (isHovered ? 8 : 4);
    }
  });

  return (
    <group position={data.position}>
      {/* 3D Label Preview */}
      <Html
        distanceFactor={isFocused ? 10 : 15}
        position={[0, 0.6, 0]} 
        center
        className="pointer-events-none select-none"
      >
        <div 
          className={`whitespace-nowrap transition-all duration-700 ease-out flex flex-col items-center
            ${(isHovered || isSelected) ? 'opacity-90 translate-y-0' : 'opacity-20 translate-y-1'}`}
        >
          <span 
            className="text-[9px] uppercase tracking-[0.4em] font-light text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            style={{ color: clusterColor, filter: `drop-shadow(0 0 5px ${clusterColor})` }}
          >
            {data.title}
          </span>
          <div 
            className="w-px h-4 mt-1 transition-all duration-700" 
            style={{ 
              background: `linear-gradient(to bottom, ${clusterColor}, transparent)`,
              opacity: isHovered || isSelected ? 0.6 : 0.2
            }} 
          />
        </div>
      </Html>

      {/* Main Node Sphere */}
      <mesh 
        ref={meshRef}
        onPointerUp={(e) => {
          e.stopPropagation();
          setClickedPart({ type: 'main', index: 0 });
          onSelect(data.id, e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.4, 32, 32]} /> 
        <meshStandardMaterial 
          color={clusterColor}
          emissive={clusterColor}
          emissiveIntensity={isSelected ? 1.5 : (isHovered ? 1.0 : 0.6)}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false} 
          transparent
          opacity={isSelected ? 1.0 : 0.9}
        />
      </mesh>

      {/* Links Group */}
      <group ref={linksGroupRef}>
         {/* Primary Lines */}
         <lineSegments geometry={primaryLinesGeometry}>
            <lineBasicMaterial 
                color={linkColors.line} 
                transparent 
                opacity={0.3} 
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                linewidth={1.5}
            />
         </lineSegments>

         {/* Secondary Lines (Reduced Opacity to ~30%) */}
         <lineSegments geometry={secondaryLinesGeometry}>
            <lineBasicMaterial 
                color={linkColors.line} 
                transparent 
                opacity={0.09} 
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                linewidth={1}
            />
         </lineSegments>

         {/* Primary Points */}
         {primaryLinks.map((link, i) => (
             <mesh 
                key={`p-${i}`} 
                ref={(el) => { primaryLinkMeshRefs.current[i] = el; }}
                position={link.endPoint}
                onPointerUp={(e) => {
                    if (!showLinks) return;
                    e.stopPropagation();
                    setClickedPart({ type: 'primary', index: i });
                    // Send Derived ID: parentId + link_p + index
                    onSelect(`${data.id}_link_p_${i}`, e);
                }}
                onPointerOver={(e) => {
                    if (!showLinks) return;
                    e.stopPropagation();
                    setIsHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    if (!showLinks) return;
                    setIsHovered(false);
                    document.body.style.cursor = 'default';
                }}
             >
                 <sphereGeometry args={[link.size, 8, 8]} />
                 <meshBasicMaterial 
                    color={linkColors.point} 
                    transparent 
                    opacity={0.9} 
                    blending={THREE.AdditiveBlending}
                 />
             </mesh>
         ))}

         {/* Secondary Points (Reduced Opacity to 30%) */}
         {secondaryLinks.map((link, i) => (
             <mesh 
                key={`s-${i}`} 
                ref={(el) => { secondaryLinkMeshRefs.current[i] = el; }}
                position={link.endPoint}
                onPointerUp={(e) => {
                    if (!showLinks) return;
                    e.stopPropagation();
                    setClickedPart({ type: 'secondary', index: i });
                    // Send Derived ID: parentId + link_s + index
                    onSelect(`${data.id}_link_s_${i}`, e);
                }}
                onPointerOver={(e) => {
                    if (!showLinks) return;
                    e.stopPropagation();
                    setIsHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    if (!showLinks) return;
                    setIsHovered(false);
                    document.body.style.cursor = 'default';
                }}
             >
                 <sphereGeometry args={[link.size, 8, 8]} />
                 <meshBasicMaterial 
                    color={linkColors.point} 
                    transparent 
                    opacity={0.3} 
                    blending={THREE.AdditiveBlending}
                 />
             </mesh>
         ))}
      </group>
      
      <pointLight 
        ref={lightRef} 
        color={clusterColor} 
        distance={isSelected ? 12 : 6} 
        decay={2} 
      />
    </group>
  );
};


