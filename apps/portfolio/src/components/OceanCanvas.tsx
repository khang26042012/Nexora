import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Bubbles({ count = 120 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 24,
      y: (Math.random() - 0.5) * 14,
      z: (Math.random() - 0.5) * 8,
      speed: 0.002 + Math.random() * 0.006,
      offset: Math.random() * Math.PI * 2,
      scale: 0.04 + Math.random() * 0.18,
      drift: (Math.random() - 0.5) * 0.003,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const y = p.y + ((t * p.speed * 2 + p.offset) % 14) - 7;
      const x = p.x + Math.sin(t * 0.4 + p.offset) * 0.5;
      dummy.position.set(x, y, p.z);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshPhongMaterial
        color="#38bdf8"
        transparent
        opacity={0.12}
        shininess={80}
        emissive="#0077b6"
        emissiveIntensity={0.3}
      />
    </instancedMesh>
  );
}

function WaveMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(30, 16, 64, 32), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z =
        Math.sin(x * 0.4 + t * 0.6) * 0.25 +
        Math.sin(y * 0.3 + t * 0.4) * 0.2 +
        Math.sin((x + y) * 0.2 + t * 0.3) * 0.15;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geo} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -4, -2]}>
      <meshPhongMaterial
        color="#0077b6"
        transparent
        opacity={0.08}
        shininess={60}
        side={THREE.DoubleSide}
        emissive="#003566"
        emissiveIntensity={0.5}
        wireframe
      />
    </mesh>
  );
}

function FloatingRings() {
  const rings = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        radius: 1.2 + i * 0.7,
        speed: 0.08 + i * 0.03,
        phase: (i / 6) * Math.PI * 2,
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 8,
        z: -3 - i * 0.5,
        tilt: Math.random() * Math.PI,
      })),
    []
  );

  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.children.forEach((child: THREE.Object3D, i: number) => {
      const r = rings[i];
      child.rotation.z = r.tilt + t * r.speed;
      child.rotation.x = r.tilt * 0.5 + t * r.speed * 0.3;
      child.position.y = r.y + Math.sin(t * 0.4 + r.phase) * 0.6;
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((r, i) => (
        <mesh key={i} position={[r.x, r.y, r.z]}>
          <torusGeometry args={[r.radius, 0.015, 8, 64]} />
          <meshPhongMaterial
            color="#00b4d8"
            transparent
            opacity={0.18}
            emissive="#0077b6"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

export function OceanCanvas() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} color="#0077b6" />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#38bdf8" />
        <pointLight position={[-5, -3, 2]} intensity={0.5} color="#0077b6" />
        <Bubbles count={100} />
        <WaveMesh />
        <FloatingRings />
      </Canvas>
    </div>
  );
}
