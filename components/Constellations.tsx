
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getOrbitPosition } from '../App'; // 导入轨道计算函数
import '../types';

interface Cluster {
  id: number;
  color: string;
  center: [number, number, number]; // 局部相对位置
  family: string;
  initialAngle: number; // 从 App 传递过来的初始角度
}

interface ConstellationsProps {
  clusters: Cluster[];
  galaxyRotationRef: React.MutableRefObject<number>;
}

export const Constellations: React.FC<ConstellationsProps> = ({ clusters, galaxyRotationRef }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  
  // 预先计算连接关系，避免每帧重复计算
  const connections = useMemo(() => {
    const pairs: { startCluster: Cluster, endCluster: Cluster, color: string }[] = [];
    
    // Group clusters by family
    const families: Record<string, Cluster[]> = {};
    clusters.forEach(c => {
      if (!families[c.family]) families[c.family] = [];
      families[c.family].push(c);
    });

    // Connect clusters within each family
    Object.values(families).forEach(group => {
      for (let i = 0; i < group.length - 1; i++) {
        pairs.push({
          startCluster: group[i],
          endCluster: group[i + 1],
          color: group[i].color
        });
      }
      if (group.length > 2) {
        pairs.push({
          startCluster: group[group.length - 1],
          endCluster: group[0],
          color: group[0].color
        });
      }
    });
    return pairs;
  }, [clusters]);

  // 创建几何体 Attribute buffer
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(connections.length * 6); // 2 points * 3 coords
    const col = new Float32Array(connections.length * 6); // 2 points * 3 rgb
    
    connections.forEach((conn, i) => {
      const c = new THREE.Color(conn.color);
      // 颜色是静态的，只设置一次
      col[i*6+0] = c.r; col[i*6+1] = c.g; col[i*6+2] = c.b;
      col[i*6+3] = c.r; col[i*6+4] = c.g; col[i*6+5] = c.b;
    });
    
    return [pos, col];
  }, [connections]);

  useFrame(() => {
    if (!lineRef.current) return;
    
    const positionsAttr = lineRef.current.geometry.attributes.position;
    const currentRotation = galaxyRotationRef.current;
    
    connections.forEach((conn, i) => {
      // 1. 计算 Start Cluster 的世界坐标
      const startHubPos = getOrbitPosition(conn.startCluster.initialAngle, currentRotation);
      const startWorldX = startHubPos.x + conn.startCluster.center[0];
      const startWorldY = startHubPos.y + conn.startCluster.center[1];
      const startWorldZ = startHubPos.z + conn.startCluster.center[2];

      // 2. 计算 End Cluster 的世界坐标
      const endHubPos = getOrbitPosition(conn.endCluster.initialAngle, currentRotation);
      const endWorldX = endHubPos.x + conn.endCluster.center[0];
      const endWorldY = endHubPos.y + conn.endCluster.center[1];
      const endWorldZ = endHubPos.z + conn.endCluster.center[2];

      // 3. 更新 Buffer
      positionsAttr.setXYZ(i * 2, startWorldX, startWorldY, startWorldZ);
      positionsAttr.setXYZ(i * 2 + 1, endWorldX, endWorldY, endWorldZ);
    });
    
    positionsAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          usage={THREE.DynamicDrawUsage} // 提示 Three.js 这个几何体经常变
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        vertexColors 
        transparent 
        opacity={0.08} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false}
      />
    </lineSegments>
  );
};
