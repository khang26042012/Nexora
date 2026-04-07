import { useRef, useMemo, useEffect, useState, Component, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─── WebGL check ─── */
function webglOk() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

/* ─── Error boundary ─── */
class ErrBound extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;
const N_STARS   = () => (isMobile() ? 900 : 2000);

/* ═══════════════════════════════════════════════════════
   WARP STREAKS — stars rushing toward camera
═══════════════════════════════════════════════════════ */
function WarpStreaks({ drag }: { drag: React.MutableRefObject<{ x: number; y: number }> }) {
  const N = N_STARS();

  /* star state: [x, y, z, baseSpeed]  ×N */
  const starData = useMemo(() => {
    const d = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) initStar(d, i, true);
    return d;
  }, [N]);

  /* line-segment geometry: 2 vertices per star */
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    g.setAttribute("color",    new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    return g;
  }, [N]);

  function initStar(d: Float32Array, i: number, spread = false) {
    const hw = 18, hh = 11;
    d[i*4]   = (Math.random() - 0.5) * hw * 2;
    d[i*4+1] = (Math.random() - 0.5) * hh * 2;
    d[i*4+2] = spread ? -(Math.random() * 280 + 20) : -(200 + Math.random() * 120);
    d[i*4+3] = 0.6 + Math.random() * 1.8;
  }

  const lastT = useRef(0);
  const camTilt = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    const t  = state.clock.elapsedTime;
    const dt = Math.min(t - lastT.current, 0.05);
    lastT.current = t;

    /* smooth camera tilt from drag */
    camTilt.current.x += (drag.current.x * 3 - camTilt.current.x) * 0.04;
    camTilt.current.y += (drag.current.y * 2 - camTilt.current.y) * 0.04;
    state.camera.position.x = camTilt.current.x + Math.sin(t * 0.07) * 0.5;
    state.camera.position.y = camTilt.current.y + Math.sin(t * 0.05) * 0.3;
    state.camera.lookAt(0, 0, 0);

    /* warp speed pulse: slow → fast → slow cycle */
    const warp = 2.8 + Math.sin(t * 0.18) * 1.4 + Math.sin(t * 0.55) * 0.6;

    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const col = geo.getAttribute("color")    as THREE.BufferAttribute;

    for (let i = 0; i < N; i++) {
      let x   = starData[i*4];
      let y   = starData[i*4+1];
      let z   = starData[i*4+2];
      const v = starData[i*4+3];

      /* acceleration: faster closer to camera */
      const prox  = Math.max(0, 1 + z / 200);   // 0=far, ~1=near
      const speed = v * warp * (1 + prox * prox * 4);
      const dz    = speed * dt * 60;
      const newZ  = z + dz;
      starData[i*4+2] = newZ;

      /* perspective spread: stars appear to spread outward */
      const ps = Math.max(1, -z / 160);
      const sx = x * ps, sy = y * ps;

      /* stretch length proportional to speed */
      const stretch = Math.max(0.4, dz * 1.8 + prox * 1.5);

      /* tail → head */
      pos.setXYZ(i*2,   sx, sy, z);          // tail
      pos.setXYZ(i*2+1, sx, sy, newZ + stretch); // head

      /* brightness: dim & blue far, bright & white near */
      const br   = Math.min(1, prox * 2.8 + 0.08);
      const cool = Math.max(0, 0.6 - prox * 0.6); // blue tint far away
      col.setXYZ(i*2,   br * 0.2, br * 0.25,        br * (0.5 + cool * 0.5)); // tail dim
      col.setXYZ(i*2+1, br,       br * (0.94 + cool * 0.06), br);              // head bright

      if (newZ > 14) initStar(starData, i);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

/* ═══════════════════════════════════════════════════════
   DISTANT STAR FIELD — static dim background
═══════════════════════════════════════════════════════ */
function StarField() {
  const geo = useMemo(() => {
    const N   = isMobile() ? 600 : 1200;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 80 + Math.random() * 60;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      const v = 0.2 + Math.random() * 0.3;
      col[i*3]   = v * 0.6; col[i*3+1] = v * 0.7; col[i*3+2] = v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={1.0} vertexColors sizeAttenuation={false} transparent opacity={0.6} depthWrite={false} />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════
   WARP GLOW — central lens flare / tunnel glow
═══════════════════════════════════════════════════════ */
function WarpGlow() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.04 + Math.sin(t * 0.3) * 0.025 + Math.sin(t * 0.7) * 0.01;
  });
  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <planeGeometry args={[60, 40]} />
      <meshBasicMaterial color="#3060ff" transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════
   SCENE
═══════════════════════════════════════════════════════ */
function Scene({ drag }: { drag: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <StarField />
      <WarpGlow />
      <WarpStreaks drag={drag} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PUBLIC EXPORT
═══════════════════════════════════════════════════════ */
export function ThreeScene({ className }: { className?: string }) {
  const [canUseWebGL, setCanUseWebGL] = useState<boolean | null>(null);
  const drag = useRef({ x: 0, y: 0 });

  useEffect(() => { setCanUseWebGL(webglOk()); }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    drag.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    drag.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    drag.current.x = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
    drag.current.y = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }, []);

  const fallback = (
    <div className={className} style={{ background: "radial-gradient(ellipse at 50% 50%, #03001a 0%, #000008 100%)" }} />
  );

  if (canUseWebGL === null) return fallback;
  if (!canUseWebGL)         return fallback;

  return (
    <div
      className={className}
      style={{ overflow: "hidden", maxWidth: "100%", touchAction: "pan-y" }}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      <ErrBound fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 14], fov: 70 }}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "radial-gradient(ellipse at 50% 30%, #050018 0%, #010008 45%, #000003 100%)" }}
          dpr={[1, isMobile() ? 1.5 : 2]}
        >
          <Scene drag={drag} />
        </Canvas>
      </ErrBound>
    </div>
  );
}
