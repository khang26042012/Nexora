import { useRef, useMemo, useEffect, useState, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── Helpers ── */
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
const rng = (a: number, b: number) => a + Math.random() * (b - a);

/* ── Milky Way Galaxy Band ── */
function GalaxyBand() {
  const geo = useMemo(() => {
    const mob = isMob();
    const n = mob ? 8000 : 18000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz  = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      /* Band along Z axis, tilted */
      const angle  = rng(0, Math.PI * 2);
      const spread = Math.abs(rng(-1, 1)) * rng(0, 1) * rng(0, 1); // concentrate toward center
      const r      = rng(30, 120);
      const bandH  = spread * 10 + rng(-2, 2);

      pos[i*3]   = r * Math.cos(angle);
      pos[i*3+1] = bandH + Math.sin(angle * 3) * 4;
      pos[i*3+2] = r * Math.sin(angle) * 0.35 - 40; // flatten into band, push back

      /* Color: warm core → cool edges */
      const dist = Math.abs(spread);
      const warm = 1 - dist;
      col[i*3]   = 0.85 + warm * 0.15;
      col[i*3+1] = 0.72 + warm * 0.18;
      col[i*3+2] = 0.55 + dist * 0.45;

      sz[i] = rng(0.3, 1.8);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    g.setAttribute("size",     new THREE.BufferAttribute(sz,  1));
    return g;
  }, []);

  const grpRef = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { if (grpRef.current) grpRef.current.rotation.y += dt * 0.004; });

  return (
    <group ref={grpRef} rotation={[0.3, 0.4, 0]}>
      <points geometry={geo}>
        <pointsMaterial
          size={1.4} vertexColors sizeAttenuation={false}
          transparent opacity={0.72} depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* ── Background deep stars (tiny, dim, static) ── */
function DeepStars() {
  const geo = useMemo(() => {
    const n = isMob() ? 1200 : 2500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 80 + Math.random() * 60;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      const t = Math.random();
      const v = 0.3 + Math.random() * 0.5;
      col[i*3]   = t < 0.3 ? v * 0.6 : v;
      col[i*3+1] = t < 0.3 ? v * 0.7 : t > 0.8 ? v * 0.7 : v;
      col[i*3+2] = t > 0.7 ? v * 0.55 : v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.9} vertexColors sizeAttenuation={false} transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

/* ── Bright foreground stars (twinkling) ── */
function BrightStars() {
  const matRef = useRef<THREE.PointsMaterial>(null!);
  const geo = useMemo(() => {
    const n = 80;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 45 + Math.random() * 50;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((s) => {
    if (matRef.current) {
      matRef.current.opacity = 0.55 + Math.sin(s.clock.elapsedTime * 1.8) * 0.35;
    }
  });

  return (
    <points geometry={geo}>
      <pointsMaterial ref={matRef} size={2.8} color="#e8f0ff" sizeAttenuation={false} transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

/* ── Aurora Borealis (bottom ribbons) ── */
function Aurora() {
  const ribbons = useMemo(() => [
    { color: "#00ffaa", y: -9,  z: -18, amp: 1.4, freq: 0.55, speed: 0.22, op: 0.18, w: 60, h: 3.5 },
    { color: "#00ccff", y: -11, z: -20, amp: 1.8, freq: 0.40, speed: 0.16, op: 0.14, w: 80, h: 4.0 },
    { color: "#8844ff", y: -7,  z: -16, amp: 1.1, freq: 0.70, speed: 0.28, op: 0.12, w: 50, h: 2.8 },
    { color: "#00ff88", y: -13, z: -22, amp: 2.2, freq: 0.30, speed: 0.12, op: 0.10, w: 90, h: 5.0 },
    { color: "#44aaff", y: -5,  z: -14, amp: 0.9, freq: 0.90, speed: 0.35, op: 0.09, w: 40, h: 2.2 },
  ], []);

  const meshRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const r = ribbons[i];
      const geo = mesh.geometry as THREE.PlaneGeometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const cols = geo.attributes.position.count;
      const segsX = 40;
      for (let xi = 0; xi <= segsX; xi++) {
        for (let yi = 0; yi <= 3; yi++) {
          const idx = (yi * (segsX + 1) + xi);
          const xFrac = xi / segsX;
          const yFrac = yi / 3;
          const wave = Math.sin(xFrac * r.freq * Math.PI * 6 + t * r.speed * Math.PI * 2) * r.amp;
          const wave2 = Math.sin(xFrac * r.freq * Math.PI * 3.5 + t * r.speed * 0.7 * Math.PI * 2 + 1.2) * r.amp * 0.5;
          pos.setY(idx, wave + wave2 + yFrac * r.h);
        }
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    });
  });

  return (
    <group>
      {ribbons.map((r, i) => (
        <mesh
          key={i}
          ref={el => { if (el) meshRefs.current[i] = el; }}
          position={[0, r.y, r.z]}
        >
          <planeGeometry args={[r.w, r.h, 40, 3]} />
          <meshBasicMaterial
            color={r.color}
            transparent
            opacity={r.op}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Shooting Stars ── */
function ShootingStars() {
  const count = 6;
  const state = useMemo(() => Array.from({ length: count }, (_, i) => ({
    active: false,
    timer: i * 4.0 + Math.random() * 3,
    x: 0, y: 0, z: 0, vx: 0, vy: 0,
  })), []);

  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const matRef = useRef<THREE.PointsMaterial>(null!);

  const positions = useMemo(() => new Float32Array(count * 3), []);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const st = state[i];
      st.timer -= dt;
      if (st.timer <= 0) {
        /* Spawn */
        st.active = true;
        st.x = rng(-35, 35);
        st.y = rng(5, 20);
        st.z = rng(-30, -10);
        st.vx = rng(-25, -10);
        st.vy = rng(-12, -5);
        st.timer = rng(8, 18);
      }
      if (st.active) {
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        if (st.y < -15 || st.x < -60) { st.active = false; }
      }
      positions[i*3]   = st.active ? st.x : 9999;
      positions[i*3+1] = st.active ? st.y : 9999;
      positions[i*3+2] = st.active ? st.z : 9999;
    }
    if (geoRef.current) {
      (geoRef.current.attributes.position as THREE.BufferAttribute).set(positions);
      geoRef.current.attributes.position.needsUpdate = true;
    }
  });

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3).fill(9999), 3));
    return g;
  }, []);

  return (
    <points geometry={geo} ref={(p) => { if (p) geoRef.current = p.geometry; }}>
      <pointsMaterial
        ref={matRef}
        size={3.5} color="#ffffff" sizeAttenuation={false}
        transparent opacity={0.92} depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── AI Crystal (floating icosahedron / octahedron) ── */
type CrystalDef = { pos: [number,number,number]; geo: "ico"|"octa"|"dodeca"; scale: number; color: string; speed: number; phase: number };

function Crystal({ def }: { def: CrystalDef }) {
  const outerRef = useRef<THREE.Mesh>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);
  const glowRef  = useRef<THREE.Mesh>(null!);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const bob = Math.sin(t * def.speed + def.phase) * 0.6;
    const rot = t * def.speed * 0.45;

    [outerRef, innerRef, glowRef].forEach(r => {
      if (!r.current) return;
      r.current.position.y = def.pos[1] + bob;
      r.current.rotation.x = rot * 0.7;
      r.current.rotation.y = rot;
      r.current.rotation.z = rot * 0.4;
    });
  });

  const geoArgs: [number, number] = [def.scale, 1];
  const GeoComp =
    def.geo === "ico"   ? <icosahedronGeometry   args={geoArgs} /> :
    def.geo === "octa"  ? <octahedronGeometry     args={geoArgs} /> :
                          <dodecahedronGeometry   args={geoArgs} />;

  return (
    <>
      {/* Wireframe shell */}
      <mesh ref={outerRef} position={def.pos}>
        {GeoComp}
        <meshBasicMaterial color={def.color} wireframe transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* Solid inner — darker */}
      <mesh ref={innerRef} position={def.pos} scale={0.72}>
        {GeoComp}
        <meshBasicMaterial color={def.color} transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Glow sphere */}
      <mesh ref={glowRef} position={def.pos} scale={1.55}>
        <sphereGeometry args={[def.scale, 8, 8]} />
        <meshBasicMaterial color={def.color} transparent opacity={0.022} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

/* ── Particle streams between crystals (neural net lines) ── */
function DataStreams({ crystalPositions }: { crystalPositions: [number,number,number][] }) {
  const count = 120;

  const { geo, meta } = useMemo(() => {
    const pos  = new Float32Array(count * 3).fill(9999);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const pairs: { from: [number,number,number]; to: [number,number,number]; t: number; speed: number }[] = [];
    const n = crystalPositions.length;
    const perPair = Math.floor(count / (n * (n-1) / 2 || 1));
    for (let a = 0; a < n; a++) {
      for (let b = a+1; b < n; b++) {
        for (let k = 0; k < perPair; k++) {
          pairs.push({ from: crystalPositions[a], to: crystalPositions[b], t: Math.random(), speed: rng(0.08, 0.25) });
        }
      }
    }
    return { geo: g, meta: pairs };
  }, [crystalPositions]);

  useFrame((_, dt) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < meta.length && i < count; i++) {
      const m = meta[i];
      m.t += dt * m.speed;
      if (m.t > 1) m.t = 0;
      const t = m.t;
      pos.setXYZ(i,
        m.from[0] + (m.to[0] - m.from[0]) * t,
        m.from[1] + (m.to[1] - m.from[1]) * t,
        m.from[2] + (m.to[2] - m.from[2]) * t,
      );
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={2.2} color="#88ddff" sizeAttenuation={false} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Connection Lines (static) ── */
function ConnectionLines({ crystalPositions }: { crystalPositions: [number,number,number][] }) {
  const geo = useMemo(() => {
    const verts: number[] = [];
    const n = crystalPositions.length;
    for (let a = 0; a < n; a++) {
      for (let b = a+1; b < n; b++) {
        const dist = new THREE.Vector3(...crystalPositions[a]).distanceTo(new THREE.Vector3(...crystalPositions[b]));
        if (dist < 20) {
          verts.push(...crystalPositions[a], ...crystalPositions[b]);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    return g;
  }, [crystalPositions]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#4466cc" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

/* ── Nebula dust ── */
function Nebula() {
  const geo = useMemo(() => {
    const n = isMob() ? 500 : 1200;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const clusters = [
      { cx: -15, cy: 8,  cz: -35, sx: 20, sy: 12, r: 0.45, g: 0.10, b: 0.90 },
      { cx:  18, cy: -4, cz: -42, sx: 18, sy: 10, r: 0.10, g: 0.40, b: 0.95 },
      { cx:  -5, cy: 12, cz: -28, sx: 14, sy:  8, r: 0.80, g: 0.15, b: 0.70 },
    ];
    const perCluster = Math.floor(n / clusters.length);
    for (let c = 0; c < clusters.length; c++) {
      const cl = clusters[c];
      for (let i = 0; i < perCluster; i++) {
        const idx = c * perCluster + i;
        const bm = () => { let u=0,v=0; while(!u)u=Math.random(); while(!v)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
        pos[idx*3]   = cl.cx + bm() * cl.sx;
        pos[idx*3+1] = cl.cy + bm() * cl.sy;
        pos[idx*3+2] = cl.cz + bm() * 5;
        const v2 = 0.3 + Math.random() * 0.7;
        col[idx*3]   = cl.r * v2;
        col[idx*3+1] = cl.g * v2;
        col[idx*3+2] = cl.b * v2;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  const grpRef = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { if (grpRef.current) grpRef.current.rotation.y += dt * 0.002; });

  return (
    <group ref={grpRef}>
      <points geometry={geo}>
        <pointsMaterial size={0.9} vertexColors sizeAttenuation transparent opacity={0.038} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

/* ── Camera parallax ── */
function SceneCamera({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const tx = useRef(0), ty = useRef(0);
  useFrame((state, dt) => {
    tx.current += (mouse.current.x * 1.8 - tx.current) * dt * 0.9;
    ty.current += (mouse.current.y * 1.2 - ty.current) * dt * 0.9;
    const t = state.clock.elapsedTime;
    state.camera.position.x = tx.current + Math.sin(t * 0.032) * 0.8;
    state.camera.position.y = ty.current + Math.sin(t * 0.024) * 0.5;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ── Main Scene ── */
const CRYSTALS: CrystalDef[] = [
  { pos: [-9,  2, -14], geo: "ico",    scale: 1.35, color: "#7c4fff", speed: 0.55, phase: 0.0  },
  { pos: [ 8,  0, -16], geo: "octa",   scale: 1.10, color: "#00ccff", speed: 0.42, phase: 2.1  },
  { pos: [-4, -3, -18], geo: "dodeca", scale: 0.90, color: "#ff44aa", speed: 0.68, phase: 4.3  },
  { pos: [14,  4, -20], geo: "ico",    scale: 0.75, color: "#44ffcc", speed: 0.38, phase: 1.5  },
  { pos: [-14,-1, -22], geo: "octa",   scale: 0.65, color: "#ffaa22", speed: 0.72, phase: 3.2  },
  { pos: [ 2,  5, -12], geo: "dodeca", scale: 0.55, color: "#aa44ff", speed: 0.60, phase: 5.1  },
];

const CRYSTAL_POSITIONS = CRYSTALS.map(c => c.pos);

function Scene({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <SceneCamera mouse={mouse} />

      {/* Very dim ambient — almost no light, rely on emissive/basic materials */}
      <ambientLight intensity={0.06} color="#2030ff" />

      <DeepStars />
      <BrightStars />
      <GalaxyBand />
      <Nebula />
      <Aurora />
      <ShootingStars />

      {CRYSTALS.map((def, i) => <Crystal key={i} def={def} />)}
      <ConnectionLines crystalPositions={CRYSTAL_POSITIONS} />
      <DataStreams crystalPositions={CRYSTAL_POSITIONS} />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════════════ */
export function ThreeScene({ className }: { className?: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => { setOk(webglOk()); }, []);

  const fallback = <div className={className} style={{ background: "#000510" }} />;

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
          camera={{ position: [0, 0, 28], fov: 65 }}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "radial-gradient(ellipse at 50% 70%, #060818 0%, #030610 40%, #000000 80%)" }}
          dpr={[1, isMob() ? 1.5 : 1.8]}
        >
          <Scene mouse={mouse} />
        </Canvas>
      </ErrBound>
    </div>
  );
}
