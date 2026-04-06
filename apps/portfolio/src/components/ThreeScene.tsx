import { useRef, useMemo, useEffect, useState, Component, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

/* ═══════════════════════════════════════════════════════
   GALAXY — spiral arms
═══════════════════════════════════════════════════════ */
function Galaxy() {
  const groupRef = useRef<THREE.Group>(null!);
  const COUNT = isMobile() ? 8000 : 16000;
  const ARMS = 4;

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);

    const armColors = [
      [0.55, 0.35, 1.0],   // violet
      [0.2,  0.6,  1.0],   // cyan-blue
      [1.0,  0.4,  0.7],   // pink
      [0.35, 0.8,  0.9],   // teal
    ];

    for (let i = 0; i < COUNT; i++) {
      const arm    = Math.floor(Math.random() * ARMS);
      const t      = Math.random();
      const radius = 1.5 + t * 14;
      const spin   = radius * 0.4;
      const angle  = (arm / ARMS) * Math.PI * 2 + spin + (Math.random() - 0.5) * 1.2;
      const spread = Math.max(0.2, (1 - t) * 2.5 + 0.3);

      positions[i * 3]     = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.3;
      positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * spread;

      const [r, g, b] = armColors[arm];
      const mixCenter  = Math.max(0, 1 - radius / 8);
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3]     = (r * (1 - mixCenter) + 1.0 * mixCenter) * brightness;
      colors[i * 3 + 1] = (g * (1 - mixCenter) + 0.95 * mixCenter) * brightness;
      colors[i * 3 + 2] = (b * (1 - mixCenter) + 0.85 * mixCenter) * brightness;
    }
    return { positions, colors };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += dt * 0.025;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geo}>
        <pointsMaterial
          size={isMobile() ? 0.045 : 0.035}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.92}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   BACKGROUND STARS
═══════════════════════════════════════════════════════ */
function BackgroundStars() {
  const geo = useMemo(() => {
    const N = isMobile() ? 1500 : 3000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 60 + Math.random() * 40;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const v = 0.5 + Math.random() * 0.5;
      const tint = Math.random();
      col[i * 3]     = tint > 0.7 ? v * 0.8 : v;
      col[i * 3 + 1] = tint > 0.7 ? v * 0.85 : v * 0.95;
      col[i * 3 + 2] = tint < 0.3 ? v * 0.8 : v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial size={1.2} vertexColors sizeAttenuation={false} transparent opacity={0.75} depthWrite={false} />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════
   PLANET with rings
═══════════════════════════════════════════════════════ */
function Planet() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.08;
    groupRef.current.rotation.x = Math.sin(t * 0.05) * 0.08;
  });

  return (
    <group ref={groupRef} position={[22, 5, -30]}>
      <mesh>
        <sphereGeometry args={[3.2, 48, 48]} />
        <meshBasicMaterial color="#3a1f6e" />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.3, 48, 48]} />
        <meshBasicMaterial color="#5c2fa0" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* glow halo */}
      <mesh>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshBasicMaterial color="#7c4fff" transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* ring */}
      <mesh rotation={[Math.PI / 2.5, 0.3, 0]}>
        <torusGeometry args={[6.2, 0.55, 3, 80]} />
        <meshBasicMaterial color="#8b6bff" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.5, 0.3, 0]}>
        <torusGeometry args={[7.5, 0.3, 3, 80]} />
        <meshBasicMaterial color="#60a0ff" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   SMALL ORBITING MOONS
═══════════════════════════════════════════════════════ */
function OrbitingMoons() {
  const moonsData = useMemo(() => [
    { radius: 28, speed: 0.12, size: 0.8, color: "#38bdf8", yOffset: 3,  tilt: 0.3 },
    { radius: 38, speed: 0.07, size: 1.2, color: "#a78bfa", yOffset: -4, tilt: -0.4 },
    { radius: 18, speed: 0.22, size: 0.5, color: "#f472b6", yOffset: 1,  tilt: 0.6 },
  ], []);

  const refs = useRef<THREE.Group[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    moonsData.forEach((m, i) => {
      if (!refs.current[i]) return;
      refs.current[i].position.x = Math.cos(t * m.speed) * m.radius;
      refs.current[i].position.z = Math.sin(t * m.speed) * m.radius;
      refs.current[i].position.y = m.yOffset + Math.sin(t * m.speed * 2 + m.tilt) * 2;
    });
  });

  return (
    <group>
      {moonsData.map((m, i) => (
        <group key={i} ref={(el) => { if (el) refs.current[i] = el; }}>
          <mesh>
            <sphereGeometry args={[m.size, 16, 16]} />
            <meshBasicMaterial color={m.color} />
          </mesh>
          <mesh>
            <sphereGeometry args={[m.size * 2.2, 16, 16]} />
            <meshBasicMaterial color={m.color} transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   NEBULA dust
═══════════════════════════════════════════════════════ */
function Nebula() {
  const clouds = useMemo(() => [
    { n: 300, cx: -12, cy: 3, cz: -8,  s: 18, r: 0.4, g: 0.1, b: 0.9 },
    { n: 250, cx:  15, cy: -2, cz: -12, s: 16, r: 0.1, g: 0.5, b: 0.9 },
    { n: 200, cx:   2, cy:  5, cz: -6,  s: 14, r: 0.9, g: 0.2, b: 0.6 },
  ], []);

  return (
    <group>
      {clouds.map((c, idx) => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(c.n * 3);
        const col = new Float32Array(c.n * 3);
        for (let i = 0; i < c.n; i++) {
          pos[i*3]   = c.cx + (Math.random()-0.5)*c.s;
          pos[i*3+1] = c.cy + (Math.random()-0.5)*c.s*0.4;
          pos[i*3+2] = c.cz + (Math.random()-0.5)*c.s*0.3;
          const v = 0.2 + Math.random()*0.8;
          col[i*3]   = c.r*v; col[i*3+1] = c.g*v; col[i*3+2] = c.b*v;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("color",    new THREE.BufferAttribute(col, 3));
        return (
          <points key={idx} geometry={geo}>
            <pointsMaterial size={isMobile() ? 0.55 : 0.7} vertexColors sizeAttenuation transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
          </points>
        );
      })}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════
   SHOOTING STARS
═══════════════════════════════════════════════════════ */
function ShootingStars() {
  const COUNT = 6;
  const state = useRef(Array.from({ length: COUNT }, () => ({ x:0,y:0,z:0,vx:0,vy:0,life:0,maxLife:0,active:false })));
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT*3), 3));
    g.setAttribute("color",    new THREE.BufferAttribute(new Float32Array(COUNT*3), 3));
    return g;
  }, []);

  useFrame(() => {
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const col = geo.getAttribute("color")    as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const s = state.current[i];
      if (!s.active) {
        if (Math.random() < 0.003) {
          s.active = true; s.x = (Math.random()-0.5)*40; s.y = 12+Math.random()*8; s.z = -15-Math.random()*10;
          const ang = -0.3-Math.random()*0.4; const spd = 18+Math.random()*18;
          s.vx = Math.cos(ang)*spd; s.vy = Math.sin(ang)*spd;
          s.life = 0; s.maxLife = 0.4+Math.random()*0.4;
        }
      } else {
        s.life += 0.016; s.x += s.vx*0.016; s.y += s.vy*0.016;
        if (s.life >= s.maxLife) s.active = false;
      }
      const alpha = s.active ? Math.sin((s.life/s.maxLife)*Math.PI)*0.9 : 0;
      pos.setXYZ(i, s.x, s.y, s.z); col.setXYZ(i, alpha, alpha*0.9, alpha);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={2.5} vertexColors sizeAttenuation={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════
   CAMERA CONTROLLER — drag + auto rotate
═══════════════════════════════════════════════════════ */
function CameraController({ drag }: { drag: React.MutableRefObject<{ x: number; y: number; isDragging: boolean }> }) {
  const { camera } = useThree();
  const autoRotAngle = useRef(0);
  const camY   = useRef(0);
  const camX   = useRef(0);
  const targetY = useRef(0);
  const targetX = useRef(0);

  useFrame((_, dt) => {
    autoRotAngle.current += dt * 0.018;

    if (drag.current.isDragging) {
      targetX.current = drag.current.x * 18;
      targetY.current = drag.current.y * 10;
    } else {
      targetX.current += (0 - targetX.current) * dt * 0.8;
      targetY.current += (0 - targetY.current) * dt * 0.8;
    }

    camX.current += (targetX.current - camX.current) * 0.06;
    camY.current += (targetY.current - camY.current) * 0.06;

    const baseAngle = autoRotAngle.current;
    const dist = 28;
    camera.position.x = Math.sin(baseAngle) * dist + camX.current;
    camera.position.z = Math.cos(baseAngle) * dist;
    camera.position.y = 8 + camY.current;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ═══════════════════════════════════════════════════════
   SCENE
═══════════════════════════════════════════════════════ */
function Scene({ drag }: { drag: React.MutableRefObject<{ x: number; y: number; isDragging: boolean }> }) {
  return (
    <>
      <CameraController drag={drag} />
      <BackgroundStars />
      <Galaxy />
      <Nebula />
      <Planet />
      <OrbitingMoons />
      <ShootingStars />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   PUBLIC EXPORT
═══════════════════════════════════════════════════════ */
export function ThreeScene({ className }: { className?: string }) {
  const [canUseWebGL, setCanUseWebGL] = useState<boolean | null>(null);
  const drag = useRef({ x: 0, y: 0, isDragging: false });
  const lastTouch = useRef({ x: 0, y: 0 });

  useEffect(() => { setCanUseWebGL(webglOk()); }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    drag.current.isDragging = true;
    drag.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    drag.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag.current.isDragging) return;
    drag.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    drag.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, []);
  const onMouseUp = useCallback(() => { drag.current.isDragging = false; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    drag.current.isDragging = true;
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    drag.current.x = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
    drag.current.y = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!drag.current.isDragging) return;
    drag.current.x = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
    drag.current.y = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }, []);
  const onTouchEnd = useCallback(() => { drag.current.isDragging = false; }, []);

  if (canUseWebGL === null) return null;
  if (!canUseWebGL) return (
    <div className={className} style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, #0d0820 0%, #020008 100%)" }} />
  );

  return (
    <div
      className={className}
      style={{ cursor: "grab", overflow: "hidden", maxWidth: "100%", touchAction: "pan-y" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <ErrBound fallback={null}>
        <Canvas
          camera={{ position: [0, 8, 28], fov: 65 }}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "radial-gradient(ellipse at 50% 50%, #0d0820 0%, #040010 50%, #000005 100%)" }}
          dpr={[1, isMobile() ? 1.5 : 2]}
        >
          <Scene drag={drag} />
        </Canvas>
      </ErrBound>
    </div>
  );
}
