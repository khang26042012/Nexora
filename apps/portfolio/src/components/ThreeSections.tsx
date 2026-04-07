import { useRef, useMemo, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

class ErrBound extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

/* ═══════════════════════════════════════════════════════
   SKILLS SECTION — Orbital atom rings + drifting particles
═══════════════════════════════════════════════════════ */
const RING_DEFS = [
  { count: 60, r: 3.8, tilt: [Math.PI/2.8,  0.4,  0  ] as [number,number,number], speed:  0.22, color: [0.35, 0.55, 1.0] as [number,number,number] },
  { count: 48, r: 2.9, tilt: [Math.PI/4,   -0.6,  0.3] as [number,number,number], speed: -0.16, color: [0.6,  0.25, 1.0] as [number,number,number] },
  { count: 36, r: 4.8, tilt: [0.3,          1.2, -0.2] as [number,number,number], speed:  0.11, color: [0.0,  0.8,  0.9] as [number,number,number] },
];

function SingleRing({ def, groupRef }: { def: typeof RING_DEFS[0]; groupRef: (el: THREE.Group | null) => void }) {
  const geo = useMemo(() => {
    const pts = new Float32Array(def.count * 3);
    const col = new Float32Array(def.count * 3);
    for (let i = 0; i < def.count; i++) {
      const a = (i / def.count) * Math.PI * 2;
      pts[i*3]   = Math.cos(a) * def.r;
      pts[i*3+1] = Math.sin(a) * def.r;
      pts[i*3+2] = 0;
      const br = 0.5 + (i % 3 === 0 ? 0.5 : 0.2);
      col[i*3]   = def.color[0] * br;
      col[i*3+1] = def.color[1] * br;
      col[i*3+2] = def.color[2] * br;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, [def]);

  return (
    <group ref={groupRef} rotation={def.tilt}>
      <points geometry={geo}>
        <pointsMaterial size={2.2} vertexColors sizeAttenuation={false} transparent opacity={0.65}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function OrbitalRings() {
  const groups = useRef<(THREE.Group | null)[]>([null, null, null]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    RING_DEFS.forEach((ring, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.rotation.z = ring.speed * t;
    });
  });

  return (
    <group>
      {RING_DEFS.map((def, ri) => (
        <SingleRing key={ri} def={def} groupRef={(el) => { groups.current[ri] = el; }} />
      ))}
    </group>
  );
}

function CoreGlow() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!meshRef.current) return;
    const s = 0.88 + Math.sin(t * 1.1) * 0.12;
    meshRef.current.scale.setScalar(s);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(t * 1.1) * 0.06;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#7c4fff" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function AtomScene() {
  return (
    <>
      <OrbitalRings />
      <CoreGlow />
    </>
  );
}

export function ThreeAbout({ className }: { className?: string }) {
  return (
    <div className={className} style={{ pointerEvents: "none" }}>
      <ErrBound>
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
          dpr={[1, isMobile() ? 1 : 1.5]}>
          <AtomScene />
        </Canvas>
      </ErrBound>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PROJECTS SECTION — Hex grid circuit with data pulses
═══════════════════════════════════════════════════════ */
function buildHexGrid() {
  const nodes: THREE.Vector3[] = [];
  const edges: [number, number][] = [];

  /* Hex grid: offset rows */
  const cols = 10, rows = 6;
  const hx = 1.8, hy = 1.56;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col - cols/2) * hx + (row % 2 === 0 ? 0 : hx/2);
      const y = (row - rows/2) * hy;
      nodes.push(new THREE.Vector3(x, y, 0));
    }
  }

  /* Connect neighboring nodes */
  const threshold = hx * 1.15;
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      if (nodes[a].distanceTo(nodes[b]) < threshold) edges.push([a, b]);
    }
  }
  return { nodes, edges };
}

const HEX = buildHexGrid();

function HexGrid() {
  const geo = useMemo(() => {
    const positions = new Float32Array(HEX.edges.length * 6);
    HEX.edges.forEach(([a, b], i) => {
      positions[i*6]   = HEX.nodes[a].x; positions[i*6+1] = HEX.nodes[a].y; positions[i*6+2] = 0;
      positions[i*6+3] = HEX.nodes[b].x; positions[i*6+4] = HEX.nodes[b].y; positions[i*6+5] = 0;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#2540a0" transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

function HexNodes() {
  const phaseData = useMemo(() =>
    HEX.nodes.map(() => Math.random() * Math.PI * 2), []);

  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const geo = useMemo(() => {
    const pos = new Float32Array(HEX.nodes.length * 3);
    const col = new Float32Array(HEX.nodes.length * 3);
    HEX.nodes.forEach((n, i) => {
      pos[i*3] = n.x; pos[i*3+1] = n.y; pos[i*3+2] = 0;
      col[i*3] = 0.2; col[i*3+1] = 0.35; col[i*3+2] = 0.85;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  geoRef.current = geo;

  useFrame((state) => {
    const t   = state.clock.elapsedTime;
    const col = geo.getAttribute("color") as THREE.BufferAttribute;
    HEX.nodes.forEach((_, i) => {
      const pulse = 0.3 + Math.sin(t * 0.8 + phaseData[i]) * 0.2;
      col.setXYZ(i, pulse * 0.25, pulse * 0.5, pulse);
    });
    col.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={3.5} vertexColors sizeAttenuation={false} transparent opacity={0.9}
        depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

const MAX_PULSES = isMobile() ? 8 : 18;
interface Pulse { edgeIdx: number; progress: number; speed: number; active: boolean }

function DataPulses() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PULSES * 3), 3));
    g.setAttribute("color",    new THREE.BufferAttribute(new Float32Array(MAX_PULSES * 3), 3));
    return g;
  }, []);

  const pulses = useRef<Pulse[]>(
    Array.from({ length: MAX_PULSES }, () => ({ edgeIdx: 0, progress: 0, speed: 0, active: false }))
  );
  const nextSpawn = useRef(0);

  useFrame((state) => {
    const t   = state.clock.elapsedTime;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const col = geo.getAttribute("color")    as THREE.BufferAttribute;

    if (t > nextSpawn.current) {
      nextSpawn.current = t + 0.18 + Math.random() * 0.25;
      const free = pulses.current.findIndex(p => !p.active);
      if (free !== -1) {
        pulses.current[free] = {
          edgeIdx: Math.floor(Math.random() * HEX.edges.length),
          progress: 0,
          speed: 0.6 + Math.random() * 0.8,
          active: true,
        };
      }
    }

    for (let i = 0; i < MAX_PULSES; i++) {
      const p = pulses.current[i];
      if (!p.active) { pos.setXYZ(i, 0, -9999, 0); col.setXYZ(i, 0, 0, 0); continue; }
      p.progress += p.speed * 0.016;
      if (p.progress >= 1) { p.active = false; continue; }
      const [a, b] = HEX.edges[p.edgeIdx];
      const na = HEX.nodes[a], nb = HEX.nodes[b];
      pos.setXYZ(i, na.x + (nb.x - na.x) * p.progress, na.y + (nb.y - na.y) * p.progress, 0);
      const br = Math.sin(p.progress * Math.PI);
      col.setXYZ(i, br * 0.2, br * 0.7, br);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={5} vertexColors sizeAttenuation={false} transparent opacity={1}
        depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function CircuitScene() {
  return (
    <>
      <HexGrid />
      <HexNodes />
      <DataPulses />
    </>
  );
}

export function ThreeProjects({ className }: { className?: string }) {
  return (
    <div className={className} style={{ pointerEvents: "none" }}>
      <ErrBound>
        <Canvas camera={{ position: [0, 0, 8], fov: 65 }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
          dpr={[1, isMobile() ? 1 : 1.5]}>
          <CircuitScene />
        </Canvas>
      </ErrBound>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CONTACT SECTION — Signal ripple waves
═══════════════════════════════════════════════════════ */
const MAX_RINGS = 6;
interface Ring { progress: number; speed: number; color: THREE.Color }

function SignalRings() {
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const rings = useRef<Ring[]>(
    Array.from({ length: MAX_RINGS }, (_, i) => ({
      progress: i / MAX_RINGS,
      speed: 0.18 + Math.random() * 0.08,
      color: new THREE.Color().setHSL(0.72 + i * 0.04, 0.9, 0.65),
    }))
  );

  useFrame((_, dt) => {
    rings.current.forEach((ring, i) => {
      ring.progress = (ring.progress + ring.speed * dt) % 1.0;
      const mesh = ringRefs.current[i];
      if (!mesh) return;
      const scale = 0.5 + ring.progress * 7;
      mesh.scale.setScalar(scale);
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, (1 - ring.progress) * 0.25);
    });
  });

  return (
    <group>
      {rings.current.map((ring, i) => (
        <mesh key={i} ref={(el) => { ringRefs.current[i] = el; }}>
          <ringGeometry args={[0.92, 1.0, 64]} />
          <meshBasicMaterial color={ring.color} transparent opacity={0.2}
            side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function SignalDots() {
  const N = 120;
  const geo = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 2); // vx, vy
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 5;
      pos[i*3]   = Math.cos(a) * r;
      pos[i*3+1] = Math.sin(a) * r;
      pos[i*3+2] = 0;
      vel[i*2]   = (Math.random() - 0.5) * 0.006;
      vel[i*2+1] = (Math.random() - 0.5) * 0.006;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.userData.vel = vel;
    return g;
  }, []);

  useFrame(() => {
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const vel = geo.userData.vel as Float32Array;
    for (let i = 0; i < N; i++) {
      const x = pos.getX(i) + vel[i*2];
      const y = pos.getY(i) + vel[i*2+1];
      const r = Math.sqrt(x*x + y*y);
      if (r > 5) {
        pos.setXYZ(i, x * -0.1, y * -0.1, 0);
      } else {
        pos.setXYZ(i, x, y, 0);
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={1.5} color="#8060ff" sizeAttenuation={false} transparent opacity={0.4}
        depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function ContactScene() {
  return (
    <>
      <SignalRings />
      <SignalDots />
    </>
  );
}

export function ThreeContact({ className }: { className?: string }) {
  return (
    <div className={className} style={{ pointerEvents: "none" }}>
      <ErrBound>
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
          dpr={[1, isMobile() ? 1 : 1.5]}>
          <ContactScene />
        </Canvas>
      </ErrBound>
    </div>
  );
}
