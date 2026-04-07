import { useRef, useMemo, useEffect, useState, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function webglOk() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

class ErrBound extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

/* ═══════════════════════════════════════════════════════
   LARGE GLOWING STARS — layered sizes
═══════════════════════════════════════════════════════ */
function StarLayer({ n, size, opacity, rMin, rMax }: { n: number; size: number; opacity: number; rMin: number; rMax: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = rMin + Math.random() * (rMax - rMin);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      const v   = 0.5 + Math.random() * 0.5;
      const t   = Math.random();
      col[i*3]   = t < 0.3 ? v * 0.6 : v;
      col[i*3+1] = t < 0.3 ? v * 0.75 : t > 0.7 ? v * 0.85 : v;
      col[i*3+2] = t > 0.7 ? v * 0.65 : v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, [n, rMin, rMax]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={size} vertexColors sizeAttenuation={false} transparent opacity={opacity} depthWrite={false} />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════
   NEBULA CLOUDS — gaussian particle clusters
═══════════════════════════════════════════════════════ */
const NEBULA_DEFS = [
  { n: 2200, cx:  -8, cy: 6,  cz: -30, sx: 30, sy: 18, sz: 8,  r: 0.55, g: 0.12, b: 1.0,  op: 0.09 }, // purple
  { n: 1800, cx:  12, cy: -2, cz: -35, sx: 25, sy: 14, sz: 8,  r: 0.10, g: 0.30, b: 1.0,  op: 0.08 }, // blue
  { n: 1400, cx:  -2, cy: 10, cz: -28, sx: 20, sy: 12, sz: 6,  r: 0.85, g: 0.10, b: 0.90, op: 0.07 }, // magenta
  { n: 1200, cx:  20, cy: -8, cz: -40, sx: 22, sy: 10, sz: 6,  r: 0.20, g: 0.50, b: 1.0,  op: 0.07 }, // cyan-blue
  { n: 1000, cx: -18, cy: -4, cz: -32, sx: 18, sy: 9,  sz: 5,  r: 0.70, g: 0.05, b: 0.80, op: 0.06 }, // violet
];

function buildNebulaGeo(d: typeof NEBULA_DEFS[0]) {
  const pos = new Float32Array(d.n * 3);
  const col = new Float32Array(d.n * 3);
  for (let i = 0; i < d.n; i++) {
    const bm = () => {
      let u = 0, v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    pos[i*3]   = d.cx + bm() * d.sx;
    pos[i*3+1] = d.cy + bm() * d.sy;
    pos[i*3+2] = d.cz + bm() * d.sz;
    const v2 = 0.3 + Math.random() * 0.7;
    col[i*3]   = d.r * v2; col[i*3+1] = d.g * v2; col[i*3+2] = d.b * v2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
  return g;
}

function NebulaClouds() {
  const groupRef = useRef<THREE.Group>(null!);
  const geos = useMemo(() => NEBULA_DEFS.map(d => buildNebulaGeo(d)), []);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.004;
  });

  return (
    <group ref={groupRef}>
      {NEBULA_DEFS.map((d, idx) => (
        <points key={idx} geometry={geos[idx]}>
          <pointsMaterial
            size={isMobile() ? 0.6 : 0.9} vertexColors sizeAttenuation
            transparent opacity={d.op} depthWrite={false} blending={THREE.AdditiveBlending}
          />
        </points>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   AURORA RIBBONS — undulating sine-curve bands
═══════════════════════════════════════════════════════ */
const AURORA_DEFS = [
  { pts: 200, y: 5,  z: -20, amp: 2.5, freq: 0.8, speed: 0.3,  r: 0.4, g: 0.0, b: 1.0,  op: 0.18 },
  { pts: 160, y: 2,  z: -18, amp: 1.8, freq: 1.1, speed: -0.2, r: 0.1, g: 0.8, b: 1.0,  op: 0.12 },
  { pts: 140, y: 8,  z: -24, amp: 3.2, freq: 0.6, speed: 0.18, r: 0.9, g: 0.1, b: 0.8,  op: 0.10 },
];

function AuroraRibbons() {
  const geos = useMemo(() =>
    AURORA_DEFS.map(d => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(d.pts * 3), 3));
      g.setAttribute("color",    new THREE.BufferAttribute(new Float32Array(d.pts * 3), 3));
      return g;
    }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    AURORA_DEFS.forEach((d, di) => {
      const geo = geos[di];
      const pos = geo.getAttribute("position") as THREE.BufferAttribute;
      const col = geo.getAttribute("color")    as THREE.BufferAttribute;
      const W = 60;
      for (let i = 0; i < d.pts; i++) {
        const x   = -W/2 + (i / (d.pts - 1)) * W;
        const y   = d.y + Math.sin(i * d.freq * 0.1 + t * d.speed) * d.amp
                       + Math.sin(i * d.freq * 0.25 + t * d.speed * 1.7) * d.amp * 0.4;
        pos.setXYZ(i, x, y, d.z);
        const alpha = Math.sin((i / d.pts) * Math.PI) * (0.5 + Math.sin(i * 0.15 + t * 0.5) * 0.5);
        col.setXYZ(i, d.r * alpha, d.g * alpha, d.b * alpha);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
    });
  });

  return (
    <group>
      {AURORA_DEFS.map((d, di) => (
        <points key={di} geometry={geos[di]}>
          <pointsMaterial size={2.0} vertexColors sizeAttenuation={false} transparent opacity={d.op}
            depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   GLOWING ORBS — floating large spheres
═══════════════════════════════════════════════════════ */
function FloatingOrb({ pos, color, size, speed, phase }: {
  pos: [number,number,number]; color: string; size: number; speed: number; phase: number;
}) {
  const g1 = useRef<THREE.Mesh>(null!);
  const g2 = useRef<THREE.Mesh>(null!);
  const g3 = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dy = Math.sin(t * speed + phase) * 0.8;
    [g1, g2, g3].forEach(r => { if (r.current) r.current.position.y = pos[1] + dy; });
    if (g2.current) (g2.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(t * speed * 1.4 + phase) * 0.05;
    if (g3.current) (g3.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(t * speed * 0.9 + phase) * 0.02;
  });
  const c = new THREE.Color(color);
  return (
    <group>
      <mesh ref={g1} position={pos}>
        <sphereGeometry args={[size, 20, 20]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <mesh ref={g2} position={pos}>
        <sphereGeometry args={[size * 2.5, 16, 16]} />
        <meshBasicMaterial color={c} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={g3} position={pos}>
        <sphereGeometry args={[size * 5, 12, 12]} />
        <meshBasicMaterial color={c} transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   CAMERA — slow drift + mouse parallax
═══════════════════════════════════════════════════════ */
function SceneCamera({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const tiltX = useRef(0);
  const tiltY = useRef(0);
  useFrame((state, dt) => {
    tiltX.current += (mouse.current.x * 2.5 - tiltX.current) * dt * 1.2;
    tiltY.current += (mouse.current.y * 1.5 - tiltY.current) * dt * 1.2;
    const t = state.clock.elapsedTime;
    state.camera.position.x = tiltX.current + Math.sin(t * 0.04) * 1.5;
    state.camera.position.y = tiltY.current + Math.sin(t * 0.03) * 0.8;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ═══════════════════════════════════════════════════════
   SCENE
═══════════════════════════════════════════════════════ */
function Scene({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <SceneCamera mouse={mouse} />
      <StarLayer n={isMobile() ? 2000 : 5000} size={0.9} opacity={0.55} rMin={60}  rMax={120} />
      <StarLayer n={isMobile() ? 300  : 700}  size={1.6} opacity={0.80} rMin={50}  rMax={100} />
      <StarLayer n={isMobile() ? 60   : 150}  size={2.6} opacity={0.90} rMin={40}  rMax={80}  />
      <NebulaClouds />
      <AuroraRibbons />
      <FloatingOrb pos={[-14,  3, -18]} color="#6020e0" size={0.6} speed={0.28} phase={0.0} />
      <FloatingOrb pos={[ 18, -2, -22]} color="#0088ff" size={0.5} speed={0.21} phase={2.1} />
      <FloatingOrb pos={[  4,  8, -15]} color="#c040ff" size={0.4} speed={0.35} phase={4.3} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════════════ */
export function ThreeScene({ className }: { className?: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => { setOk(webglOk()); }, []);

  const fallback = (
    <div className={className} style={{ background: "radial-gradient(ellipse at 50% 40%, #12003a 0%, #04000f 70%)" }} />
  );

  if (ok === null) return fallback;
  if (!ok)         return fallback;

  return (
    <div
      className={className}
      style={{ overflow: "hidden", touchAction: "pan-y" }}
      onMouseMove={e => {
        mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
        mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      }}
      onTouchMove={e => {
        mouse.current.x = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
        mouse.current.y = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      }}
    >
      <ErrBound fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 28], fov: 65 }}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "radial-gradient(ellipse at 50% 35%, #12003a 0%, #08001e 40%, #04000f 80%, #020008 100%)" }}
          dpr={[1, isMobile() ? 1.5 : 2]}
        >
          <Scene mouse={mouse} />
        </Canvas>
      </ErrBound>
    </div>
  );
}
