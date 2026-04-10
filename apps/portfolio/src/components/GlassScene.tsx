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

const mob = () => typeof window !== "undefined" && window.innerWidth < 768;
const rng = (a: number, b: number) => a + Math.random() * (b - a);

/* ── Deep Star Field ── */
function Stars() {
  const geo = useMemo(() => {
    const n = mob() ? 1800 : 3500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 55 + Math.random() * 70;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      const v = 0.3 + Math.random() * 0.7;
      if (t < 0.3)      { col[i*3]=v*0.4; col[i*3+1]=v*0.6; col[i*3+2]=v; }
      else if (t < 0.6) { col[i*3]=v*0.2; col[i*3+1]=v*0.8; col[i*3+2]=v; }
      else if (t < 0.8) { col[i*3]=v*0.6; col[i*3+1]=v*0.3; col[i*3+2]=v; }
      else              { col[i*3]=v;      col[i*3+1]=v;      col[i*3+2]=v; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.85} vertexColors sizeAttenuation={false} transparent opacity={0.65} depthWrite={false} />
    </points>
  );
}

/* ── Floating Glowing Orbs ── */
function FloatingOrb({ pos, color, speed, size }: { pos: [number,number,number]; color: string; speed: number; size: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (ref.current) {
      ref.current.position.y = pos[1] + Math.sin(t * speed + phase) * 1.8;
      ref.current.position.x = pos[0] + Math.cos(t * speed * 0.7 + phase) * 1.2;
      const pulse = 0.88 + Math.sin(t * speed * 2 + phase) * 0.12;
      ref.current.scale.setScalar(pulse);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(t * speed * 1.5 + phase) * 0.03;
    }
  });
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[size, 24, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function FloatingOrbs() {
  const orbs = useMemo(() => [
    { pos: [-12, 4, -20] as [number,number,number],  color: "#00d4ff", speed: 0.18, size: 5.5 },
    { pos: [14, -3, -22] as [number,number,number],  color: "#7c3aed", speed: 0.14, size: 7 },
    { pos: [0, 8, -28] as [number,number,number],    color: "#06b6d4", speed: 0.22, size: 4 },
    { pos: [-18, -6, -18] as [number,number,number], color: "#818cf8", speed: 0.12, size: 6 },
    { pos: [20, 10, -24] as [number,number,number],  color: "#34d399", speed: 0.16, size: 3.5 },
  ], []);
  return (
    <>
      {orbs.map((o, i) => <FloatingOrb key={i} {...o} />)}
    </>
  );
}

/* ── Aurora Ribbon ── */
function AuroraRibbon({ offset, color, amplitude, speed }: { offset: number; color: string; amplitude: number; speed: number }) {
  const COUNT = mob() ? 80 : 160;
  const geo = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const frac = i / COUNT;
      const x = (frac - 0.5) * 90;
      const y = offset + Math.sin(frac * Math.PI * 3 + t * speed) * amplitude + Math.sin(frac * Math.PI * 7 + t * speed * 0.6) * (amplitude * 0.35);
      const z = -38 + Math.cos(frac * Math.PI * 2 + t * 0.08) * 6;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={1.6} color={color} sizeAttenuation={false} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function AuroraRibbons() {
  const ribbons = useMemo(() => [
    { offset:  8, color: "#00d4ff", amplitude: 3.5, speed: 0.25 },
    { offset:  5, color: "#7c3aed", amplitude: 4,   speed: 0.18 },
    { offset: -2, color: "#06b6d4", amplitude: 3,   speed: 0.30 },
    { offset: -7, color: "#818cf8", amplitude: 4.5, speed: 0.20 },
    { offset: 12, color: "#34d399", amplitude: 2.5, speed: 0.35 },
  ], []);
  return (
    <>
      {ribbons.map((r, i) => <AuroraRibbon key={i} {...r} />)}
    </>
  );
}

/* ── Neural Network Particles ── */
function NeuralParticles() {
  const COUNT = mob() ? 120 : 280;
  const { geo, vels } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const vels = new Float32Array(COUNT * 3);
    const palette = ["#00d4ff", "#7c3aed", "#06b6d4", "#818cf8", "#34d399", "#a78bfa"];
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = rng(-45, 45);
      pos[i*3+1] = rng(-28, 28);
      pos[i*3+2] = rng(-50, -5);
      vels[i*3]   = rng(-0.006, 0.006);
      vels[i*3+1] = rng(0.002, 0.01);
      vels[i*3+2] = rng(-0.003, 0.003);
      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      const v = 0.4 + Math.random() * 0.6;
      col[i*3] = c.r*v; col[i*3+1] = c.g*v; col[i*3+2] = c.b*v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return { geo: g, vels };
  }, []);

  useFrame(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      let x = pos.getX(i) + vels[i*3];
      let y = pos.getY(i) + vels[i*3+1];
      let z = pos.getZ(i) + vels[i*3+2];
      if (y > 30)  { y = -30; x = rng(-45, 45); }
      if (x > 50)  x = -50;
      if (x < -50) x =  50;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={1.6} vertexColors sizeAttenuation={false} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Shooting Stars ── */
function ShootingStars() {
  const COUNT = 6;
  const stateRef = useMemo(() => Array.from({ length: COUNT }, (_, i) => ({
    active: false, timer: i * 4 + Math.random() * 3,
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
        st.x = rng(-42, 42); st.y = rng(10, 24); st.z = rng(-40, -12);
        st.vx = rng(-30, -10); st.vy = rng(-16, -5);
        st.timer = rng(6, 14);
      }
      if (st.active) {
        st.x += st.vx * dt; st.y += st.vy * dt;
        if (st.y < -22 || st.x < -70) st.active = false;
      }
      posArr.setXYZ(i, st.active ? st.x : 9999, st.active ? st.y : 9999, st.active ? st.z : 9999);
    }
    posArr.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={5} color="#00e5ff" sizeAttenuation={false} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── Camera ── */
function SceneCamera({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const tx = useRef(0), ty = useRef(0);
  useFrame((state, dt) => {
    tx.current += (mouse.current.x * 2 - tx.current) * dt * 0.65;
    ty.current += (mouse.current.y * 1.2 - ty.current) * dt * 0.65;
    const t = state.clock.elapsedTime;
    state.camera.position.x = tx.current + Math.sin(t * 0.025) * 0.5;
    state.camera.position.y = ty.current + Math.sin(t * 0.018) * 0.4;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <SceneCamera mouse={mouse} />
      <ambientLight intensity={0.03} color="#001133" />
      <Stars />
      <FloatingOrbs />
      <AuroraRibbons />
      <NeuralParticles />
      <ShootingStars />
    </>
  );
}

export function GlassScene({ className }: { className?: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => { setOk(webglOk()); }, []);

  const fallback = (
    <div className={className} style={{ background: "radial-gradient(ellipse at 50% 40%, #050e2a 0%, #020813 60%, #000000 100%)" }} />
  );
  if (ok === null) return fallback;
  if (!ok) return fallback;

  return (
    <div
      className={className}
      style={{ overflow: "hidden", touchAction: "pan-y", transform: "translateZ(0)", willChange: "transform" } as React.CSSProperties}
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
          camera={{ position: [0, 0, 30], fov: 60 }}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "radial-gradient(ellipse at 50% 40%, #060d25 0%, #020810 55%, #000000 100%)" }}
          dpr={[1, mob() ? 1.3 : 1.6]}
        >
          <Scene mouse={mouse} />
        </Canvas>
      </ErrBound>
    </div>
  );
}
