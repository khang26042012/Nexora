import { useRef, useMemo, useEffect, useState, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT_DESKTOP = 900;
const PARTICLE_COUNT_MOBILE = 400;
const CONNECTION_THRESHOLD = 3.2;
const MAX_CONNECTIONS = 2400;

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

class WebGLErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function CSSFallbackBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 30%, rgba(100,80,255,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 70%, rgba(60,100,255,0.09) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 50% 50%, rgba(130,60,255,0.06) 0%, transparent 70%)
          `,
        }}
      />
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#60a5fa" : "white",
            opacity: 0.3 + Math.random() * 0.4,
            animation: `float${i % 4} ${8 + Math.random() * 8}s ${Math.random() * 4}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

function ParticleNetwork({
  mouse,
}: {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const pointsRef = useRef<THREE.Points>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);

  const count = isMobile() ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const spread = isMobile() ? 12 : 18;
      const zSpread = isMobile() ? 5 : 8;
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = (Math.random() - 0.5) * (spread * 0.6);
      positions[i3 + 2] = (Math.random() - 0.5) * zSpread;

      velocities[i3] = (Math.random() - 0.5) * 0.004;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.002;

      const t = Math.random();
      if (t < 0.6) {
        colors[i3] = 0.85 + Math.random() * 0.15;
        colors[i3 + 1] = 0.85 + Math.random() * 0.15;
        colors[i3 + 2] = 1;
      } else if (t < 0.85) {
        colors[i3] = 0.45 + Math.random() * 0.15;
        colors[i3 + 1] = 0.5 + Math.random() * 0.15;
        colors[i3 + 2] = 1;
      } else {
        colors[i3] = 0.65 + Math.random() * 0.15;
        colors[i3 + 1] = 0.35 + Math.random() * 0.1;
        colors[i3 + 2] = 1;
      }
    }

    return { positions: positions.slice(), velocities, colors };
  }, [count]);

  const linePositions = useMemo(() => new Float32Array(MAX_CONNECTIONS * 6), []);
  const lineColors = useMemo(() => new Float32Array(MAX_CONNECTIONS * 6), []);
  const posRef = useRef(positions.slice());
  const targetRotX = useRef(0);
  const targetRotY = useRef(0);
  const currentRotX = useRef(0);
  const currentRotY = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !pointsRef.current || !linesRef.current) return;

    const pos = posRef.current;
    const spread = isMobile() ? 12 : 18;
    const halfY = spread * 0.3;
    const halfZ = isMobile() ? 5 : 8;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] += velocities[i3];
      pos[i3 + 1] += velocities[i3 + 1];
      pos[i3 + 2] += velocities[i3 + 2];
      if (pos[i3] > spread / 2 || pos[i3] < -spread / 2) velocities[i3] *= -1;
      if (pos[i3 + 1] > halfY || pos[i3 + 1] < -halfY) velocities[i3 + 1] *= -1;
      if (pos[i3 + 2] > halfZ || pos[i3 + 2] < -halfZ) velocities[i3 + 2] *= -1;
    }

    const geo = pointsRef.current.geometry as THREE.BufferGeometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    posAttr.array.set(pos);
    posAttr.needsUpdate = true;

    let lineIdx = 0;
    const threshold2 = CONNECTION_THRESHOLD * CONNECTION_THRESHOLD;
    const maxConn = isMobile() ? 600 : MAX_CONNECTIONS;

    for (let i = 0; i < count - 1 && lineIdx < maxConn; i++) {
      const i3 = i * 3;
      for (let j = i + 1; j < count && lineIdx < maxConn; j++) {
        const j3 = j * 3;
        const dx = pos[i3] - pos[j3];
        const dy = pos[i3 + 1] - pos[j3 + 1];
        const dz = pos[i3 + 2] - pos[j3 + 2];
        const dist2 = dx * dx + dy * dy + dz * dz;
        if (dist2 < threshold2) {
          const alpha = (1 - Math.sqrt(dist2) / CONNECTION_THRESHOLD) * 0.5;
          const l6 = lineIdx * 6;
          linePositions[l6] = pos[i3];
          linePositions[l6 + 1] = pos[i3 + 1];
          linePositions[l6 + 2] = pos[i3 + 2];
          linePositions[l6 + 3] = pos[j3];
          linePositions[l6 + 4] = pos[j3 + 1];
          linePositions[l6 + 5] = pos[j3 + 2];
          lineColors[l6] = colors[i3] * alpha;
          lineColors[l6 + 1] = colors[i3 + 1] * alpha;
          lineColors[l6 + 2] = colors[i3 + 2] * alpha;
          lineColors[l6 + 3] = colors[j3] * alpha;
          lineColors[l6 + 4] = colors[j3 + 1] * alpha;
          lineColors[l6 + 5] = colors[j3 + 2] * alpha;
          lineIdx++;
        }
      }
    }

    const lGeo = linesRef.current.geometry as THREE.BufferGeometry;
    const lPosAttr = lGeo.getAttribute("position") as THREE.BufferAttribute;
    const lColAttr = lGeo.getAttribute("color") as THREE.BufferAttribute;
    lPosAttr.array.set(linePositions);
    lColAttr.array.set(lineColors);
    lPosAttr.needsUpdate = true;
    lColAttr.needsUpdate = true;
    lGeo.setDrawRange(0, lineIdx * 2);

    targetRotY.current = mouse.current.x * 0.35;
    targetRotX.current = -mouse.current.y * 0.2;
    const lerpSpeed = 1 - Math.pow(0.04, delta);
    currentRotX.current += (targetRotX.current - currentRotX.current) * lerpSpeed;
    currentRotY.current += (targetRotY.current - currentRotY.current) * lerpSpeed;

    groupRef.current.rotation.x = currentRotX.current;
    groupRef.current.rotation.y = currentRotY.current + performance.now() * 0.00008;
  });

  const pointsGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions), 3)
    );
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  const linesGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(MAX_CONNECTIONS * 6), 3)
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(MAX_CONNECTIONS * 6), 3)
    );
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={pointsGeo}>
        <pointsMaterial
          size={isMobile() ? 0.06 : 0.045}
          vertexColors
          transparent
          opacity={0.75}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef} geometry={linesGeo}>
        <lineBasicMaterial vertexColors transparent opacity={1} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

function FloatingOrb() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * 0.12;
    meshRef.current.rotation.y = t * 0.18;
    meshRef.current.position.y = Math.sin(t * 0.4) * 0.18;
  });
  return (
    <mesh ref={meshRef} position={[0, 0, -3]}>
      <icosahedronGeometry args={[1.2, 1]} />
      <meshBasicMaterial color="#6655ff" wireframe transparent opacity={0.08} />
    </mesh>
  );
}

function FloatingTorus() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * 0.09;
    meshRef.current.rotation.y = t * 0.14;
    meshRef.current.position.x = Math.sin(t * 0.25) * 0.3;
    meshRef.current.position.y = Math.cos(t * 0.3) * 0.15;
  });
  return (
    <mesh ref={meshRef} position={[isMobile() ? 2 : 4.5, -1, -2]}>
      <torusKnotGeometry args={[0.7, 0.2, 80, 12]} />
      <meshBasicMaterial color="#9966ff" wireframe transparent opacity={0.07} />
    </mesh>
  );
}

function ThreeContent({
  mouse,
}: {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}) {
  return (
    <>
      <ParticleNetwork mouse={mouse} />
      <FloatingOrb />
      <FloatingTorus />
    </>
  );
}

interface ThreeSceneProps {
  className?: string;
}

export function ThreeScene({ className }: ThreeSceneProps) {
  const mouse = useRef({ x: 0, y: 0 });
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglOk(isWebGLAvailable());
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.current.x = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
        mouse.current.y = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      }
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("touchmove", handleTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleTouch);
    };
  }, []);

  if (webglOk === null) return null;
  if (!webglOk) return <div className={className}><CSSFallbackBackground /></div>;

  return (
    <div className={className} style={{ pointerEvents: "none" }}>
      <WebGLErrorBoundary fallback={<CSSFallbackBackground />}>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 65 }}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: "high-performance",
          }}
          dpr={[1, isMobile() ? 1.5 : 2]}
        >
          <ThreeContent mouse={mouse} />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
