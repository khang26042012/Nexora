import { useRef, useMemo, useEffect, useState, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── Utils ── */
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

const isMob = () => typeof window !== "undefined" && window.innerWidth < 768;

/* ── Procedural Moon Texture ── */
function createMoonTexture(): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d")!;

  /* Base surface */
  ctx.fillStyle = "#8e8e8e";
  ctx.fillRect(0, 0, S, S);

  /* Fine grain noise */
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const v = 100 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgba(${v},${v},${v},0.18)`;
    ctx.beginPath(); ctx.arc(x, y, 0.8 + Math.random() * 1.8, 0, Math.PI * 2); ctx.fill();
  }

  /* Craters */
  const craters: { x: number; y: number; r: number }[] = [
    { x: 140, y: 180, r: 48 }, { x: 320, y: 130, r: 34 }, { x: 90,  y: 360, r: 56 },
    { x: 390, y: 290, r: 42 }, { x: 255, y: 410, r: 28 }, { x: 440, y: 95,  r: 22 },
    { x: 55,  y: 115, r: 24 }, { x: 200, y: 300, r: 38 }, { x: 360, y: 420, r: 20 },
    ...Array.from({ length: 25 }, () => ({ x: Math.random() * S, y: Math.random() * S, r: 4 + Math.random() * 14 })),
  ];

  craters.forEach(({ x, y, r }) => {
    const g1 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g1.addColorStop(0, "rgba(50,50,50,0.92)");
    g1.addColorStop(0.55, "rgba(75,75,75,0.60)");
    g1.addColorStop(0.9, "rgba(110,110,110,0.20)");
    g1.addColorStop(1, "rgba(150,150,150,0)");
    ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = g1; ctx.fill();

    /* Rim highlight */
    const g2 = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.55, x, y, r * 1.08);
    g2.addColorStop(0, "rgba(0,0,0,0)");
    g2.addColorStop(0.8, "rgba(195,195,195,0.12)");
    g2.addColorStop(1, "rgba(215,215,215,0.28)");
    ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, Math.PI * 2);
    ctx.fillStyle = g2; ctx.fill();
  });

  /* Dark maria patches */
  [{ x: 280, y: 220, rx: 80, ry: 55, op: 0.14 }, { x: 160, y: 280, rx: 60, ry: 40, op: 0.10 }].forEach(m => {
    ctx.save();
    ctx.translate(m.x, m.y); ctx.scale(m.rx / 50, m.ry / 50);
    const gm = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
    gm.addColorStop(0, `rgba(40,40,40,${m.op})`);
    gm.addColorStop(1, "rgba(40,40,40,0)");
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fillStyle = gm; ctx.fill(); ctx.restore();
  });

  return new THREE.CanvasTexture(cv);
}

/* ── Stars ── */
function Stars() {
  const geo = useMemo(() => {
    const n = isMob() ? 1400 : 2000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 60 + Math.random() * 90;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      const t = Math.random(), v = 0.55 + Math.random() * 0.45;
      col[i*3]   = t < 0.25 ? v * 0.65 : v;
      col[i*3+1] = t < 0.25 ? v * 0.78 : v;
      col[i*3+2] = t > 0.72 ? v * 0.68 : v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={1.3} vertexColors sizeAttenuation={false} transparent opacity={0.88} depthWrite={false} />
    </points>
  );
}

/* Bright twinkling accent stars */
function AccentStars() {
  const refs = useRef<THREE.Points[]>([]);
  const geo = useMemo(() => {
    const n = 60;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 50 + Math.random() * 60;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const pointsRef = useRef<THREE.Points>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pointsRef.current) {
      (pointsRef.current.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(t * 1.4) * 0.3;
    }
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial size={2.5} color="#ffffff" sizeAttenuation={false} transparent opacity={0.75} depthWrite={false} />
    </points>
  );
}

/* ── Nebula / Fog ── */
function Nebula() {
  const defs = useMemo(() => [
    { n: 900, cx: -10, cy:  5, cz: -35, sx: 22, sy: 14, sz: 6,  r: 0.50, g: 0.10, b: 0.90, op: 0.055 },
    { n: 700, cx:  14, cy: -3, cz: -42, sx: 18, sy: 12, sz: 6,  r: 0.08, g: 0.28, b: 1.00, op: 0.045 },
    { n: 600, cx:   2, cy:  8, cz: -30, sx: 16, sy: 10, sz: 5,  r: 0.80, g: 0.08, b: 0.80, op: 0.040 },
    { n: 500, cx: -20, cy: -6, cz: -38, sx: 15, sy:  8, sz: 5,  r: 0.60, g: 0.05, b: 0.70, op: 0.035 },
  ], []);

  const geos = useMemo(() => defs.map(d => {
    const pos = new Float32Array(d.n * 3);
    const col = new Float32Array(d.n * 3);
    const bm = () => {
      let u = 0, v = 0;
      while (!u) u = Math.random(); while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    for (let i = 0; i < d.n; i++) {
      pos[i*3] = d.cx + bm() * d.sx; pos[i*3+1] = d.cy + bm() * d.sy; pos[i*3+2] = d.cz + bm() * d.sz;
      const v2 = 0.35 + Math.random() * 0.65;
      col[i*3] = d.r * v2; col[i*3+1] = d.g * v2; col[i*3+2] = d.b * v2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }), [defs]);

  const grpRef = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { if (grpRef.current) grpRef.current.rotation.y += dt * 0.003; });

  return (
    <group ref={grpRef}>
      {defs.map((d, i) => (
        <points key={i} geometry={geos[i]}>
          <pointsMaterial size={0.85} vertexColors sizeAttenuation transparent opacity={d.op}
            depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      ))}
    </group>
  );
}

/* ── Moon ── */
function Moon() {
  const moonRef = useRef<THREE.Mesh>(null!);
  const mob = isMob();
  const radius = mob ? 2.8 : 4.5;
  const posX  = mob ? 7  : 12;
  const posY  = mob ? 2  : 3;

  const texture = useMemo(() => createMoonTexture(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (moonRef.current) moonRef.current.rotation.y = t * 0.015;
  });

  return (
    <group position={[posX, posY, -22]}>
      {/* Moon sphere */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} color="#d0cccc" />
      </mesh>
      {/* Subtle rim glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.06, 24, 24]} />
        <meshBasicMaterial color="#c8c8d8" transparent opacity={0.05}
          depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      {/* Very faint halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.22, 16, 16]} />
        <meshBasicMaterial color="#8888aa" transparent opacity={0.025}
          depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ── Earth (bottom edge) ── */
function Earth() {
  const earthRef = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { if (earthRef.current) earthRef.current.rotation.y += dt * 0.008; });

  const mob = isMob();
  const R = mob ? 12 : 20;
  const posY = mob ? -20 : -28;

  return (
    <group position={[0, posY, -32]}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[R, 40, 40]} />
        <meshStandardMaterial
          color="#1a4a7a"
          roughness={0.85} metalness={0}
          emissive="#082040"
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* Land masses — simplified as slightly brighter patches */}
      <mesh>
        <sphereGeometry args={[R * 1.002, 32, 32]} />
        <meshBasicMaterial color="#2a6040" transparent opacity={0.18}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Atmosphere thin layer */}
      <mesh>
        <sphereGeometry args={[R * 1.04, 28, 28]} />
        <meshBasicMaterial color="#3060c0" transparent opacity={0.10}
          depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      {/* Glow corona */}
      <mesh>
        <sphereGeometry args={[R * 1.18, 20, 20]} />
        <meshBasicMaterial color="#0050ff" transparent opacity={0.055}
          depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      {/* Wide outer glow */}
      <mesh>
        <sphereGeometry args={[R * 1.45, 16, 16]} />
        <meshBasicMaterial color="#0040cc" transparent opacity={0.022}
          depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ── Rocket Exhaust Particles ── */
function ExhaustParticles() {
  const count = 60;
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3).fill(0);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const speeds = useMemo(() => Array.from({ length: count }, () => 0.02 + Math.random() * 0.06), []);
  const lives  = useMemo(() => Array.from({ length: count }, () => Math.random()), []);
  const offX   = useMemo(() => Array.from({ length: count }, () => (Math.random() - 0.5) * 0.25), []);

  useFrame((_, dt) => {
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      lives[i] += dt * speeds[i] * 4;
      if (lives[i] > 1) { lives[i] = 0; }
      pos.setXYZ(i, offX[i] * lives[i] * 3, -lives[i] * 2.5, offX[i] * lives[i] * 0.5);
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={1.8} color="#ff5010" sizeAttenuation transparent opacity={0.55}
        depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Rocket ── */
function Rocket() {
  const groupRef = useRef<THREE.Group>(null!);
  const baseY = isMob() ? -3 : -2.5;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!groupRef.current) return;
    /* Slow upward drift with gentle bob */
    groupRef.current.position.y = baseY + Math.sin(t * 0.28) * 0.55;
    groupRef.current.rotation.z = Math.sin(t * 0.18) * 0.025;
    groupRef.current.rotation.x = Math.sin(t * 0.13) * 0.018;
  });

  const bodyMat  = <meshStandardMaterial color="#dcdce8" roughness={0.30} metalness={0.65} />;
  const shellMat = <meshStandardMaterial color="#c8c8d8" roughness={0.35} metalness={0.55} />;
  const accentMat = <meshStandardMaterial color="#8890c8" roughness={0.40} metalness={0.70} />;

  return (
    <group ref={groupRef} position={[isMob() ? 0 : -1.5, baseY, -10]}>
      {/* Main body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.38, 2.0, 16]} />
        {bodyMat}
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <coneGeometry args={[0.32, 0.85, 16]} />
        {shellMat}
      </mesh>

      {/* Nose tip accent */}
      <mesh position={[0, 1.88, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color="#aaaacc" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Engine skirt */}
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.44, 0.50, 0.22, 16]} />
        {accentMat}
      </mesh>

      {/* 3 Fins */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <mesh key={i}
            position={[Math.sin(rad) * 0.34, -0.85, Math.cos(rad) * 0.34]}
            rotation={[0, -rad, Math.PI * 0.08]}>
            <boxGeometry args={[0.06, 0.55, 0.36]} />
            {shellMat}
          </mesh>
        );
      })}

      {/* Porthole */}
      <mesh position={[0, 0.35, 0.33]}>
        <circleGeometry args={[0.13, 20]} />
        <meshStandardMaterial color="#90c0ff" emissive="#2050a0" emissiveIntensity={0.8} roughness={0.05} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.35, 0.325]}>
        <torusGeometry args={[0.135, 0.022, 8, 24]} />
        <meshStandardMaterial color="#aaaacc" roughness={0.2} metalness={0.85} />
      </mesh>

      {/* Horizontal stripe bands */}
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.335, 0.335, 0.065, 16]} />
        <meshStandardMaterial color="#6870b8" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.352, 0.352, 0.055, 16]} />
        <meshStandardMaterial color="#6870b8" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Exhaust core */}
      <mesh position={[0, -1.22, 0]}>
        <cylinderGeometry args={[0.14, 0.22, 0.20, 12]} />
        <meshBasicMaterial color="#ff8040" transparent opacity={0.75}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Exhaust glow layers */}
      <mesh position={[0, -1.45, 0]}>
        <sphereGeometry args={[0.30, 12, 12]} />
        <meshBasicMaterial color="#ff5010" transparent opacity={0.60}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -1.70, 0]}>
        <sphereGeometry args={[0.48, 10, 10]} />
        <meshBasicMaterial color="#ff2800" transparent opacity={0.28}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -2.10, 0]}>
        <sphereGeometry args={[0.72, 8, 8]} />
        <meshBasicMaterial color="#ff1000" transparent opacity={0.10}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Exhaust particle trail */}
      <ExhaustParticles />
    </group>
  );
}

/* ── Astronaut ── */
function Astronaut() {
  const groupRef = useRef<THREE.Group>(null!);
  const baseX = isMob() ? 2.0 : 3.5;
  const baseY = isMob() ? 0   : 0.5;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!groupRef.current) return;
    groupRef.current.position.y = baseY + Math.sin(t * 0.42 + 1.4) * 0.35;
    groupRef.current.rotation.z = Math.sin(t * 0.28 + 0.8) * 0.18;
    groupRef.current.rotation.y = t * 0.04;
    groupRef.current.rotation.x = Math.sin(t * 0.22) * 0.08;
  });

  const suitMat = <meshStandardMaterial color="#e0e0ea" roughness={0.45} metalness={0.15} />;
  const suitDark = <meshStandardMaterial color="#c0c0cc" roughness={0.50} metalness={0.18} />;

  return (
    <group ref={groupRef} position={[baseX, baseY, -8.5]}>
      {/* Torso */}
      <mesh>
        <capsuleGeometry args={[0.19, 0.38, 8, 14]} />
        {suitMat}
      </mesh>

      {/* Backpack (life support) */}
      <mesh position={[0, 0, -0.22]}>
        <boxGeometry args={[0.28, 0.32, 0.12]} />
        {suitDark}
      </mesh>

      {/* Helmet */}
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.24, 20, 20]} />
        {suitMat}
      </mesh>

      {/* Visor */}
      <mesh position={[0, 0.42, 0.19]}>
        <sphereGeometry args={[0.175, 14, 14]} />
        <meshStandardMaterial color="#3878c8" roughness={0.02} metalness={0.95}
          transparent opacity={0.82} envMapIntensity={1.5} />
      </mesh>

      {/* Helmet ring */}
      <mesh position={[0, 0.22, 0]}>
        <torusGeometry args={[0.205, 0.028, 8, 24]} />
        <meshStandardMaterial color="#aaaabc" roughness={0.25} metalness={0.80} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-0.28, 0.06, 0]} rotation={[0.1, 0, Math.PI / 3.2]}>
        <capsuleGeometry args={[0.085, 0.28, 6, 10]} />
        {suitMat}
      </mesh>
      {/* Left hand */}
      <mesh position={[-0.42, -0.12, 0.04]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        {suitDark}
      </mesh>

      {/* Right arm */}
      <mesh position={[0.28, 0.06, 0]} rotation={[-0.2, 0, -Math.PI / 2.8]}>
        <capsuleGeometry args={[0.085, 0.28, 6, 10]} />
        {suitMat}
      </mesh>
      {/* Right hand */}
      <mesh position={[0.42, -0.15, 0.04]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        {suitDark}
      </mesh>

      {/* Left leg */}
      <mesh position={[-0.11, -0.42, 0]} rotation={[0.08, 0, 0.08]}>
        <capsuleGeometry args={[0.095, 0.26, 6, 10]} />
        {suitMat}
      </mesh>
      {/* Left boot */}
      <mesh position={[-0.12, -0.68, 0.02]}>
        <boxGeometry args={[0.14, 0.08, 0.20]} />
        {suitDark}
      </mesh>

      {/* Right leg */}
      <mesh position={[0.11, -0.42, 0]} rotation={[-0.06, 0, -0.08]}>
        <capsuleGeometry args={[0.095, 0.26, 6, 10]} />
        {suitMat}
      </mesh>
      {/* Right boot */}
      <mesh position={[0.12, -0.68, 0.02]}>
        <boxGeometry args={[0.14, 0.08, 0.20]} />
        {suitDark}
      </mesh>
    </group>
  );
}

/* ── Camera ── */
function SceneCamera({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const tx = useRef(0), ty = useRef(0);
  useFrame((state, dt) => {
    tx.current += (mouse.current.x * 2.2 - tx.current) * dt * 1.1;
    ty.current += (mouse.current.y * 1.4 - ty.current) * dt * 1.1;
    const t = state.clock.elapsedTime;
    state.camera.position.x = tx.current + Math.sin(t * 0.038) * 1.2;
    state.camera.position.y = ty.current + Math.sin(t * 0.028) * 0.7;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ── Scene ── */
function Scene({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <SceneCamera mouse={mouse} />

      {/* Lighting for 3D objects */}
      <ambientLight intensity={0.25} color="#c0c8ff" />
      {/* Sunlight from top-left (simulating sun off-screen) */}
      <directionalLight position={[-8, 12, 6]} intensity={0.9} color="#fff8e8" />
      {/* Subtle fill from right to illuminate moon crater detail */}
      <directionalLight position={[10, -2, 5]} intensity={0.18} color="#8090ff" />
      {/* Earth ambient bounce */}
      <pointLight position={[0, -12, -15]} intensity={0.35} color="#2060cc" distance={40} />

      <Stars />
      <AccentStars />
      <Nebula />
      <Moon />
      <Earth />
      <Rocket />
      <Astronaut />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   EXPORT — Fixed full-page space background
══════════════════════════════════════════════════════ */
export function ThreeScene({ className }: { className?: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => { setOk(webglOk()); }, []);

  const fallback = (
    <div className={className} style={{ background: "#000510" }} />
  );

  if (ok === null) return fallback;
  if (!ok)         return fallback;

  return (
    <div
      className={className}
      style={{ overflow: "hidden", touchAction: "pan-y" }}
      onMouseMove={e => {
        mouse.current.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
        mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      }}
      onTouchMove={e => {
        mouse.current.x =  (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
        mouse.current.y = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      }}
    >
      <ErrBound fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 30], fov: 62 }}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "radial-gradient(ellipse at 50% 60%, #050a1a 0%, #020810 35%, #000000 75%)" }}
          dpr={[1, isMob() ? 1.5 : 2]}
        >
          <Scene mouse={mouse} />
        </Canvas>
      </ErrBound>
    </div>
  );
}
