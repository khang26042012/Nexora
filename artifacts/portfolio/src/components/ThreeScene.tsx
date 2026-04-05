import { useRef, useMemo, useEffect, useState, Component } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ─── dark-mode watcher ─────────────────────────────── */
function useIsDark() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ─── WebGL check ───────────────────────────────────── */
function webglOk() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/* ─── error boundary ────────────────────────────────── */
class ErrBound extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { err: boolean }
> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

/* ─── helpers ───────────────────────────────────────── */
const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

function sphereRand(rMin: number, rMax: number) {
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.acos(2 * Math.random() - 1);
  const r     = rMin + Math.random() * (rMax - rMin);
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta) * 0.55 - 4,
    r * Math.cos(phi),
  ] as const;
}

/* ═══════════════════════════════════════════════════════
   STARS
═══════════════════════════════════════════════════════ */
function Stars() {
  const groupRef = useRef<THREE.Group>(null!);

  const makeLayer = (n: number, rMin: number, rMax: number, r: number, g: number, b: number) => {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = sphereRand(rMin, rMax);
      pos[i * 3]     = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const v = 0.7 + Math.random() * 0.3;
      col[i * 3]     = r * v; col[i * 3 + 1] = g * v; col[i * 3 + 2] = b * v;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return geo;
  };

  const brightGeo = useMemo(() => makeLayer(90,  50, 75, 1,    0.95, 0.8),  []);
  const blueGeo   = useMemo(() => makeLayer(180, 45, 80, 0.65, 0.78, 1),    []);
  const whiteGeo  = useMemo(() => makeLayer(2800,40, 85, 0.9,  0.9,  1),    []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += dt * 0.003;
  });

  return (
    <group ref={groupRef}>
      <points geometry={brightGeo}>
        <pointsMaterial size={3} vertexColors sizeAttenuation={false}
          transparent opacity={0.95} depthWrite={false} />
      </points>
      <points geometry={blueGeo}>
        <pointsMaterial size={1.8} vertexColors sizeAttenuation={false}
          transparent opacity={0.8} depthWrite={false} />
      </points>
      <points geometry={whiteGeo}>
        <pointsMaterial size={1} vertexColors sizeAttenuation={false}
          transparent opacity={0.65} depthWrite={false} />
      </points>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   NEBULA clouds
═══════════════════════════════════════════════════════ */
function makeNebulaGeo(
  n: number,
  cx: number, cy: number, cz: number,
  spread: number,
  r: number, g: number, b: number
) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3]     = cx + (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = cy + (Math.random() - 0.5) * spread * 0.55;
    pos[i * 3 + 2] = cz + (Math.random() - 0.5) * spread * 0.4;
    const v = 0.3 + Math.random() * 0.7;
    col[i * 3]     = r * v; col[i * 3 + 1] = g * v; col[i * 3 + 2] = b * v;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(col, 3));
  return geo;
}

function Nebula() {
  const purpleGeo = useMemo(() => makeNebulaGeo(260, -8,  2, -35, 22, 0.55, 0.15, 1),    []);
  const tealGeo   = useMemo(() => makeNebulaGeo(200,  10, 4, -40, 18, 0.05, 0.75, 0.85), []);
  const pinkGeo   = useMemo(() => makeNebulaGeo(180,  2, -3, -38, 20, 0.9,  0.2,  0.65), []);
  const deepGeo   = useMemo(() => makeNebulaGeo(140, -5,  6, -45, 28, 0.25, 0.1,  0.8),  []);

  const mat = (op: number) => ({
    size: isMobile() ? 10 : 14,
    vertexColors: true as const,
    transparent: true,
    opacity: op,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  return (
    <group>
      <points geometry={purpleGeo}><pointsMaterial {...mat(0.22)} /></points>
      <points geometry={tealGeo}>  <pointsMaterial {...mat(0.18)} /></points>
      <points geometry={pinkGeo}>  <pointsMaterial {...mat(0.15)} /></points>
      <points geometry={deepGeo}>  <pointsMaterial {...mat(0.12)} /></points>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   AURORA borealis
═══════════════════════════════════════════════════════ */
interface AuroraBand {
  y: number;
  z: number;
  color: [number, number, number];
  phase: number;
  freq: number;
  amp: number;
}

const AURORA_BANDS: AuroraBand[] = [
  { y:  1.5, z: -22, color: [0.0, 0.85, 0.65], phase: 0,   freq: 1.1, amp: 1.8 },
  { y:  3.5, z: -26, color: [0.4, 0.15, 0.95], phase: 1.2, freq: 0.8, amp: 2.2 },
  { y:  5.5, z: -30, color: [0.95, 0.2, 0.6],  phase: 2.4, freq: 1.3, amp: 1.5 },
  { y:  2.5, z: -19, color: [0.1, 0.6,  0.95], phase: 0.7, freq: 0.9, amp: 1.3 },
];
const AURORA_PTS = isMobile() ? 200 : 320;

function AuroraBandMesh({ band }: { band: AuroraBand }) {
  const ref = useRef<THREE.Points>(null!);
  const basePos = useMemo(() => {
    const pos = new Float32Array(AURORA_PTS * 3);
    const col = new Float32Array(AURORA_PTS * 3);
    for (let i = 0; i < AURORA_PTS; i++) {
      const t = i / (AURORA_PTS - 1);
      const x = (t - 0.5) * 55;
      pos[i * 3]     = x;
      pos[i * 3 + 1] = band.y;
      pos[i * 3 + 2] = band.z + (Math.random() - 0.5) * 3;
      const fade = Math.sin(t * Math.PI);
      col[i * 3]     = band.color[0] * fade;
      col[i * 3 + 1] = band.color[1] * fade;
      col[i * 3 + 2] = band.color[2] * fade;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t   = state.clock.elapsedTime;
    const pos = ref.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < AURORA_PTS; i++) {
      const x    = pos.getX(i);
      const newY = band.y
        + Math.sin(x * 0.08 * band.freq + t * 0.4 + band.phase) * band.amp
        + Math.sin(x * 0.03           + t * 0.2 + band.phase * 1.3) * band.amp * 0.5;
      pos.setY(i, newY);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={basePos}>
      <pointsMaterial
        size={isMobile() ? 7 : 10}
        vertexColors
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
}

function Aurora() {
  return (
    <group>
      {AURORA_BANDS.map((b, i) => <AuroraBandMesh key={i} band={b} />)}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   SHOOTING STARS
═══════════════════════════════════════════════════════ */
function ShootingStars() {
  const ref = useRef<THREE.Points>(null!);
  const COUNT = 8;
  const state = useRef(
    Array.from({ length: COUNT }, () => ({
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0,
      life: 0, maxLife: 0, active: false,
    }))
  );

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    g.setAttribute("color",    new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    return g;
  }, []);

  useFrame((scene) => {
    const t   = scene.clock.elapsedTime;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const col = geo.getAttribute("color")    as THREE.BufferAttribute;

    for (let i = 0; i < COUNT; i++) {
      const s = state.current[i];
      if (!s.active) {
        if (Math.random() < 0.004) {
          s.active  = true;
          s.x       = (Math.random() - 0.5) * 50;
          s.y       = 8 + Math.random() * 10;
          s.z       = -20 - Math.random() * 15;
          const ang = -0.3 - Math.random() * 0.4;
          const spd = 15 + Math.random() * 20;
          s.vx      = Math.cos(ang) * spd;
          s.vy      = Math.sin(ang) * spd;
          s.life    = 0;
          s.maxLife = 0.5 + Math.random() * 0.5;
        }
      } else {
        s.life += 0.016;
        s.x    += s.vx * 0.016;
        s.y    += s.vy * 0.016;
        if (s.life >= s.maxLife) s.active = false;
      }
      const alpha = s.active ? Math.sin((s.life / s.maxLife) * Math.PI) * 0.95 : 0;
      pos.setXYZ(i, s.x, s.y, s.z);
      col.setXYZ(i, alpha, alpha, alpha);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial
        size={3}
        vertexColors
        sizeAttenuation={false}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════
   MOON
═══════════════════════════════════════════════════════ */
function Moon() {
  const ref = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 0.6) * 0.04);
    }
  });

  return (
    <group position={[18, 12, -55]}>
      <mesh ref={ref}>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#e8e8ff" />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial color="#8899ff" transparent opacity={0.06}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[5.5, 32, 32]} />
        <meshBasicMaterial color="#6677cc" transparent opacity={0.03}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   CAMERA controller
═══════════════════════════════════════════════════════ */
function CameraRig({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  const targetX = useRef(0);
  const targetY = useRef(0);
  useFrame((_, dt) => {
    targetX.current += (mouse.current.x * 0.8  - targetX.current) * 0.03;
    targetY.current += (mouse.current.y * 0.4  - targetY.current) * 0.03;
    camera.position.x += (targetX.current - camera.position.x) * 0.05;
    camera.position.y += (targetY.current - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ═══════════════════════════════════════════════════════
   SCENE root
═══════════════════════════════════════════════════════ */
function Scene({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <CameraRig mouse={mouse} />
      <Stars />
      <Nebula />
      <Aurora />
      <ShootingStars />
      <Moon />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PUBLIC EXPORT
═══════════════════════════════════════════════════════ */
export function ThreeScene({ className }: { className?: string }) {
  const isDark  = useIsDark();
  const mouse   = useRef({ x: 0, y: 0 });
  const [canUseWebGL, setCanUseWebGL] = useState<boolean | null>(null);

  useEffect(() => { setCanUseWebGL(webglOk()); }, []);

  useEffect(() => {
    const onMove  = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onTouch = (e: TouchEvent) => {
      if (!e.touches.length) return;
      mouse.current.x = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove,  { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  /* light mode — no canvas needed */
  if (!isDark) return null;

  if (canUseWebGL === null) return null;
  if (!canUseWebGL) return (
    <div className={className}>
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(80,50,180,0.18) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 20% 60%, rgba(20,120,140,0.12) 0%, transparent 60%)" }} />
    </div>
  );

  return (
    <div className={className} style={{ pointerEvents: "none" }}>
      <ErrBound fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 12], fov: 70 }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          dpr={[1, isMobile() ? 1.5 : 2]}
        >
          <Scene mouse={mouse} />
        </Canvas>
      </ErrBound>
    </div>
  );
}
