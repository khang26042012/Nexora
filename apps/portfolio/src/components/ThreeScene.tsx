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

const isMob = () => typeof window !== "undefined" && window.innerWidth < 768;
const rng = (a: number, b: number) => a + Math.random() * (b - a);

/* ── Void Stars — deep arcane sky ── */
function VoidStars() {
  const geo = useMemo(() => {
    const n = isMob() ? 2000 : 4500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 60 + Math.random() * 80;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      const v = 0.4 + Math.random() * 0.6;
      if (t < 0.25) { col[i*3]=v*0.5; col[i*3+1]=v*0.3; col[i*3+2]=v; }
      else if (t < 0.55) { col[i*3]=v*0.7; col[i*3+1]=v*0.4; col[i*3+2]=v; }
      else if (t < 0.75) { col[i*3]=v*0.2; col[i*3+1]=v*0.7; col[i*3+2]=v; }
      else { col[i*3]=v; col[i*3+1]=v; col[i*3+2]=v; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.9} vertexColors sizeAttenuation={false} transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

/* ── Arcane Portal Ring ── */
function PortalRing({ radius, speed, color, tilt, opacity }: { radius: number; speed: number; color: string; tilt: [number,number,number]; opacity: number }) {
  const ref = useRef<THREE.Group>(null!);
  const geo = useMemo(() => {
    const n = 180;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pos[i*3] = Math.cos(a) * radius;
      pos[i*3+1] = Math.sin(a) * radius;
      pos[i*3+2] = 0;
      const bright = 0.4 + (Math.sin(i * 0.35) * 0.5 + 0.5) * 0.6;
      col[i*3] = c.r * bright;
      col[i*3+1] = c.g * bright;
      col[i*3+2] = c.b * bright;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [radius, color]);

  useFrame((s) => {
    if (ref.current) ref.current.rotation.z = s.clock.elapsedTime * speed;
  });

  return (
    <group ref={ref} rotation={tilt}>
      <points geometry={geo}>
        <pointsMaterial size={2.2} vertexColors sizeAttenuation={false} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

/* ── Portal Core Glow ── */
function PortalCore() {
  const innerRef = useRef<THREE.Mesh>(null!);
  const outerRef = useRef<THREE.Mesh>(null!);
  const diskRef = useRef<THREE.Mesh>(null!);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const pulse = 0.85 + Math.sin(t * 1.4) * 0.15;
    if (innerRef.current) {
      innerRef.current.scale.setScalar(pulse);
      (innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(t * 1.4) * 0.04;
    }
    if (outerRef.current) {
      outerRef.current.scale.setScalar(1 + Math.sin(t * 0.7) * 0.08);
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(t * 0.9) * 0.02;
    }
    if (diskRef.current) {
      diskRef.current.rotation.z = t * 0.15;
      (diskRef.current.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(t * 1.1) * 0.015;
    }
  });

  return (
    <group position={[0, 0, -30]}>
      <mesh ref={innerRef}>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshBasicMaterial color="#5500ff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={outerRef}>
        <sphereGeometry args={[9, 32, 32]} />
        <meshBasicMaterial color="#3300cc" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={diskRef}>
        <ringGeometry args={[5.5, 14, 64]} />
        <meshBasicMaterial color="#7700ff" transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* ── Rune Circles ── */
function RuneCircles() {
  const rings = useMemo(() => [
    { radius: 6.5,  speed:  0.08, color: "#8833ff", tilt: [0.3, 0, 0]    as [number,number,number], opacity: 0.55 },
    { radius: 9.0,  speed: -0.05, color: "#0088ff", tilt: [0, 0.4, 0.2]  as [number,number,number], opacity: 0.35 },
    { radius: 12.0, speed:  0.035,color: "#aa00ff", tilt: [0.6, 0, -0.3] as [number,number,number], opacity: 0.25 },
    { radius: 4.0,  speed: -0.14, color: "#00ccff", tilt: [0.1, 0.5, 0]  as [number,number,number], opacity: 0.45 },
    { radius: 15.5, speed:  0.02, color: "#6600cc", tilt: [0, 0.2, 0.5]  as [number,number,number], opacity: 0.18 },
    { radius: 2.5,  speed: -0.22, color: "#ff44aa", tilt: [0.8, 0.3, 0]  as [number,number,number], opacity: 0.40 },
  ], []);
  return (
    <group position={[0, 0, -30]}>
      {rings.map((r, i) => <PortalRing key={i} {...r} />)}
    </group>
  );
}

/* ── Arcane Particles — floating motes ── */
function ArcaneMotes() {
  const COUNT = isMob() ? 200 : 500;
  const { geo, vels } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const vels: Float32Array = new Float32Array(COUNT * 3);
    const colors = ["#8833ff", "#0088ff", "#ff44aa", "#00ffcc", "#aa44ff", "#ffaa00"];
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = rng(-40, 40);
      pos[i*3+1] = rng(-25, 25);
      pos[i*3+2] = rng(-55, -5);
      vels[i*3]   = rng(-0.008, 0.008);
      vels[i*3+1] = rng(0.003, 0.015);
      vels[i*3+2] = rng(-0.005, 0.005);
      const c = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      const v = 0.5 + Math.random() * 0.5;
      col[i*3] = c.r * v; col[i*3+1] = c.g * v; col[i*3+2] = c.b * v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { geo: g, vels };
  }, []);

  useFrame(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      let x = pos.getX(i) + vels[i*3];
      let y = pos.getY(i) + vels[i*3+1];
      let z = pos.getZ(i) + vels[i*3+2];
      if (y > 28)  { y = -28; x = rng(-40, 40); }
      if (x > 45)  x = -45;
      if (x < -45) x =  45;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={1.8} vertexColors sizeAttenuation={false} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Energy Streams — from portal ── */
function EnergyStreams() {
  const COUNT = isMob() ? 60 : 140;
  const { geo, meta } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3).fill(9999);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const meta = Array.from({ length: COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: rng(2, 16),
      z: -30,
      t: Math.random(),
      speed: rng(0.12, 0.45),
      targetZ: rng(-10, 10),
    }));
    return { geo: g, meta };
  }, []);

  useFrame((_, dt) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const m = meta[i];
      m.t += dt * m.speed;
      if (m.t > 1) {
        m.t = 0;
        m.angle = Math.random() * Math.PI * 2;
        m.radius = rng(1, 16);
        m.targetZ = rng(-15, 8);
      }
      const x = Math.cos(m.angle + m.t * 1.5) * m.radius * (1 - m.t * 0.7);
      const y = Math.sin(m.angle + m.t * 1.5) * m.radius * (1 - m.t * 0.7);
      const z = m.z + (m.targetZ - m.z) * m.t;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={2.5} color="#aa55ff" sizeAttenuation={false} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Void Tendrils — wispy lines from portal ── */
function VoidTendrils() {
  const COUNT = isMob() ? 8 : 18;
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const tendrils = useMemo(() => Array.from({ length: COUNT }, (_, i) => ({
    angle: (i / COUNT) * Math.PI * 2 + rng(0, 0.5),
    length: rng(8, 22),
    speed: rng(0.04, 0.12),
    phase: rng(0, Math.PI * 2),
    color: ["#6600ff", "#0055ff", "#cc00ff", "#0099ff"][Math.floor(Math.random() * 4)],
    segs: 12,
  })), []);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const td = tendrils[i];
      const geo = mesh.geometry as THREE.BufferGeometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j <= td.segs; j++) {
        const frac = j / td.segs;
        const angle = td.angle + Math.sin(t * td.speed + td.phase + frac * 2) * 0.4;
        const r = frac * td.length;
        pos.setXYZ(j,
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          frac * -6 + Math.sin(t * td.speed * 1.5 + frac * 3) * 1.5
        );
      }
      pos.needsUpdate = true;
    });
  });

  return (
    <group position={[0, 0, -30]}>
      {tendrils.map((td, i) => (
        <mesh key={i} ref={el => { meshRefs.current[i] = el; }}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[new Float32Array((td.segs + 1) * 3), 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={td.color} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Nebula Clouds ── */
function ArcaneNebula() {
  const geo = useMemo(() => {
    const n = isMob() ? 600 : 1500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const clusters = [
      { cx: -18, cy: 10, cz: -45, sx: 22, sy: 14, r: 0.4, g: 0.0, b: 1.0 },
      { cx:  20, cy: -8, cz: -50, sx: 18, sy: 12, r: 0.6, g: 0.0, b: 0.9 },
      { cx:   0, cy:  0, cz: -35, sx: 15, sy: 10, r: 0.2, g: 0.1, b: 1.0 },
      { cx: -10, cy:-12, cz: -42, sx: 14, sy:  9, r: 0.8, g: 0.0, b: 0.7 },
    ];
    const perC = Math.floor(n / clusters.length);
    for (let c = 0; c < clusters.length; c++) {
      const cl = clusters[c];
      for (let i = 0; i < perC; i++) {
        const idx = c * perC + i;
        const bm = () => { let u=0,v=0; while(!u)u=Math.random(); while(!v)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
        pos[idx*3]   = cl.cx + bm() * cl.sx;
        pos[idx*3+1] = cl.cy + bm() * cl.sy;
        pos[idx*3+2] = cl.cz + bm() * 6;
        const v = 0.3 + Math.random() * 0.5;
        col[idx*3] = cl.r * v; col[idx*3+1] = cl.g * v; col[idx*3+2] = cl.b * v;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.003; });

  return (
    <group ref={ref}>
      <points geometry={geo}>
        <pointsMaterial size={1.2} vertexColors sizeAttenuation transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

/* ── Shooting Runes ── */
function ShootingRunes() {
  const COUNT = 5;
  const stateRef = useMemo(() => Array.from({ length: COUNT }, (_, i) => ({
    active: false, timer: i * 3.5 + Math.random() * 2,
    x: 0, y: 0, z: 0, vx: 0, vy: 0,
  })), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3).fill(9999), 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    const posArr = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const st = stateRef[i];
      st.timer -= dt;
      if (st.timer <= 0) {
        st.active = true;
        st.x = rng(-40, 40); st.y = rng(8, 22); st.z = rng(-40, -10);
        st.vx = rng(-35, -12); st.vy = rng(-18, -6);
        st.timer = rng(7, 16);
      }
      if (st.active) {
        st.x += st.vx * dt; st.y += st.vy * dt;
        if (st.y < -20 || st.x < -70) st.active = false;
      }
      posArr.setXYZ(i, st.active ? st.x : 9999, st.active ? st.y : 9999, st.active ? st.z : 9999);
    }
    posArr.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={5} color="#cc88ff" sizeAttenuation={false} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Camera parallax ── */
function SceneCamera({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const tx = useRef(0), ty = useRef(0);
  useFrame((state, dt) => {
    tx.current += (mouse.current.x * 2.2 - tx.current) * dt * 0.75;
    ty.current += (mouse.current.y * 1.4 - ty.current) * dt * 0.75;
    const t = state.clock.elapsedTime;
    state.camera.position.x = tx.current + Math.sin(t * 0.028) * 0.6;
    state.camera.position.y = ty.current + Math.sin(t * 0.021) * 0.4;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <SceneCamera mouse={mouse} />
      <ambientLight intensity={0.04} color="#2200aa" />
      <VoidStars />
      <ArcaneNebula />
      <PortalCore />
      <RuneCircles />
      <EnergyStreams />
      <VoidTendrils />
      <ArcaneMotes />
      <ShootingRunes />
    </>
  );
}

export function ThreeScene({ className }: { className?: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => { setOk(webglOk()); }, []);

  const fallback = <div className={className} style={{ background: "radial-gradient(ellipse at 50% 40%, #0a0025 0%, #000010 60%, #000000 100%)" }} />;
  if (ok === null) return fallback;
  if (!ok) return fallback;

  return (
    <div
      className={className}
      style={{
        overflow: "hidden",
        touchAction: "pan-y",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      } as React.CSSProperties}
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
          camera={{ position: [0, 0, 32], fov: 60 }}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "radial-gradient(ellipse at 50% 40%, #0a0028 0%, #04000f 50%, #000000 100%)" }}
          dpr={[1, isMob() ? 1.4 : 1.7]}
        >
          <Scene mouse={mouse} />
        </Canvas>
      </ErrBound>
    </div>
  );
}
