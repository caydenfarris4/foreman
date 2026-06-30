"use client";

// The 3D house — "detailed stylized realism". A progressive enhancement,
// dynamically imported and mounted only behind the useHouse3D perf gate.
//
// Detail without download weight: all surface detail (plank grain, shingle
// rows, lap siding, brick courses) comes from procedural canvas textures +
// bump maps generated on the device (see textures.ts), not downloaded assets.
// Geometry stays modest and is reused. Performance is held up with the usual
// game tricks: a device quality tier, soft shadows only on strong devices, a
// generated environment map (no HDR fetch), and drei's PerformanceMonitor +
// AdaptiveDpr (which drops render resolution — slightly "pixelating" — under
// load instead of dropping frames). Every part still rises into place as the
// `progress` motion value (0..1) climbs, in lockstep with the 2D house.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  AdaptiveDpr,
  PerformanceMonitor,
} from "@react-three/drei";
import { type MotionValue } from "motion/react";
import * as THREE from "three";
import {
  woodColor,
  woodBump,
  shingleColor,
  shingleBump,
  sidingColor,
  sidingBump,
  brickColor,
  brickBump,
  envTexture,
} from "./textures";

const AMBER = "#E8B04B";
const damp = THREE.MathUtils.damp;

function seg(v: number, a: number, b: number): number {
  if (v <= a) return 0;
  if (v >= b) return 1;
  return (v - a) / (b - a);
}

type Tier = "high" | "standard";
function detectTier(): Tier {
  if (typeof navigator === "undefined") return "standard";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if ((mem && mem >= 8) || (cores && cores >= 8)) return "high";
  return "standard";
}

// ---- House dimensions (world units) ---------------------------------------
const W = 3; // width
const D = 2.4; // depth
const WH = 1.8; // wall height
const FH = 0.4; // foundation height
const WALL_TOP = FH + WH;

// Gable roof, built from two pitched planes (predictable, unlike a rotated
// prism) plus pentagon gable-end fills under the slopes.
const OVERHANG = 0.35;
const HALF_SPAN = W / 2 + OVERHANG; // eave reaches here from the ridge
const RISE = 1.0; // ridge height above the wall top
const SLANT = Math.hypot(HALF_SPAN, RISE);
const ROOF_ANGLE = Math.atan2(RISE, HALF_SPAN);
const ROOF_LEN = D + OVERHANG * 2;
const GABLE_R0 = RISE * (1 - W / 2 / HALF_SPAN); // roof height at the wall edge

// A group that builds into place as progress crosses its window. `mode`:
//   up   — grows from its base (foundation, walls, chimney)
//   down — drops from above (the roof landing on the frame)
//   pop  — scales up in place with a touch of overshoot (windows, door, trim)
function Build({
  progress,
  range,
  mode = "up",
  drop = 1.2,
  position = [0, 0, 0],
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  mode?: "up" | "down" | "pop";
  drop?: number;
  position?: [number, number, number];
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const group = g.current;
    if (!group) return;
    const t = seg(progress.get(), range[0], range[1]);
    if (mode === "pop" || mode === "down") {
      // Uniform scale so rotated roof planes don't skew while building in.
      const s = damp(group.scale.x, Math.max(0.0001, t), 9, dt);
      group.scale.setScalar(s);
      if (mode === "down") group.position.y = position[1] + (1 - s) * drop;
    } else {
      const s = damp(group.scale.y, Math.max(0.0001, t), 8, dt);
      group.scale.y = s;
    }
  });
  return (
    <group ref={g} position={position}>
      {children}
    </group>
  );
}

function Window({
  progress,
  position,
  width = 0.62,
  height = 0.72,
  trimMat,
}: {
  progress: MotionValue<number>;
  position: [number, number, number];
  width?: number;
  height?: number;
  trimMat: THREE.Material;
}) {
  const glass = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    if (glass.current) {
      // Lights on at finishing.
      const lit = seg(progress.get(), 0.9, 1);
      glass.current.emissiveIntensity = damp(
        glass.current.emissiveIntensity,
        lit * 1.6,
        7,
        dt,
      );
    }
  });
  const t = 0.06; // frame thickness
  return (
    <Build progress={progress} range={[0.74, 0.92]} mode="pop" position={position}>
      {/* frame */}
      <mesh castShadow material={trimMat}>
        <boxGeometry args={[width + t * 2, height + t * 2, 0.1]} />
      </mesh>
      {/* glass */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[width, height, 0.04]} />
        <meshStandardMaterial
          ref={glass}
          color="#22384f"
          roughness={0.08}
          metalness={0.1}
          envMapIntensity={1.4}
          emissive={AMBER}
          emissiveIntensity={0}
        />
      </mesh>
      {/* mullions (cross) */}
      <mesh position={[0, 0, 0.06]} material={trimMat}>
        <boxGeometry args={[width, 0.04, 0.04]} />
      </mesh>
      <mesh position={[0, 0, 0.06]} material={trimMat}>
        <boxGeometry args={[0.04, height, 0.04]} />
      </mesh>
      {/* sill */}
      <mesh position={[0, -height / 2 - t, 0.07]} castShadow material={trimMat}>
        <boxGeometry args={[width + t * 4, 0.07, 0.16]} />
      </mesh>
    </Build>
  );
}

function HouseModel({
  progress,
  tier,
}: {
  progress: MotionValue<number>;
  tier: Tier;
}) {
  const root = useRef<THREE.Group>(null);
  const drag = useRef({ active: false, x: 0, vel: 0, rot: -0.5 });
  const q = tier === "high" ? 512 : 256;

  const mats = useMemo(() => {
    const siding = new THREE.MeshStandardMaterial({
      map: sidingColor(q),
      bumpMap: sidingBump(q),
      bumpScale: 0.04,
      roughness: 0.82,
      side: THREE.DoubleSide, // gable fills are single planes
    });
    const wood = new THREE.MeshStandardMaterial({
      map: woodColor(q),
      bumpMap: woodBump(q),
      bumpScale: 0.05,
      roughness: 0.7,
    });
    const shingle = new THREE.MeshStandardMaterial({
      map: shingleColor(q),
      bumpMap: shingleBump(q),
      bumpScale: 0.08,
      roughness: 0.9,
    });
    const brick = new THREE.MeshStandardMaterial({
      map: brickColor(q),
      bumpMap: brickBump(q),
      bumpScale: 0.06,
      roughness: 0.95,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: "#F2EADB",
      roughness: 0.65,
    });
    const leaf = new THREE.MeshStandardMaterial({
      color: "#4A6B3A",
      roughness: 1,
    });
    return { siding, wood, shingle, brick, trim, leaf };
  }, [q]);

  // Pentagon gable-end fill that sits exactly under the roof slopes.
  const gableGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0);
    s.lineTo(W / 2, 0);
    s.lineTo(W / 2, GABLE_R0);
    s.lineTo(0, RISE);
    s.lineTo(-W / 2, GABLE_R0);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  // Dispose generated materials/geometry on unmount (textures are shared).
  useEffect(() => {
    const m = mats;
    const g = gableGeo;
    return () => {
      Object.values(m).forEach((x) => x.dispose());
      g.dispose();
    };
  }, [mats, gableGeo]);

  useFrame((_, dt) => {
    if (!root.current) return;
    if (!drag.current.active) drag.current.rot += dt * 0.14;
    drag.current.rot += drag.current.vel * dt;
    drag.current.vel = damp(drag.current.vel, 0, 4, dt);
    root.current.rotation.y = drag.current.rot;
  });

  const front = D / 2 + 0.01;

  return (
    <group
      ref={root}
      onPointerDown={(e) => {
        drag.current.active = true;
        drag.current.x = e.clientX;
      }}
      onPointerUp={() => (drag.current.active = false)}
      onPointerLeave={() => (drag.current.active = false)}
      onPointerMove={(e) => {
        if (!drag.current.active) return;
        const dx = e.clientX - drag.current.x;
        drag.current.x = e.clientX;
        drag.current.rot += dx * 0.01;
        drag.current.vel = dx * 0.6;
      }}
    >
      {/* Foundation (brick) */}
      <Build progress={progress} range={[0.12, 0.3]} mode="up" position={[0, 0, 0]}>
        <mesh castShadow receiveShadow position={[0, FH / 2, 0]} material={mats.brick}>
          <boxGeometry args={[W + 0.18, FH, D + 0.18]} />
        </mesh>
      </Build>

      {/* Frame posts — show during framing, recede behind the walls. */}
      <FramePosts progress={progress} mat={mats.wood} />

      {/* Walls (lap siding) */}
      <Build progress={progress} range={[0.45, 0.7]} mode="up" position={[0, FH, 0]}>
        <mesh castShadow receiveShadow position={[0, WH / 2, 0]} material={mats.siding}>
          <boxGeometry args={[W, WH, D]} />
        </mesh>
        {/* corner trim boards (high tier only) */}
        {tier === "high"
          ? ([
              [-W / 2, -D / 2],
              [W / 2, -D / 2],
              [-W / 2, D / 2],
              [W / 2, D / 2],
            ] as [number, number][]).map(([x, z], i) => (
              <mesh key={i} position={[x, WH / 2, z]} material={mats.trim}>
                <boxGeometry args={[0.1, WH, 0.1]} />
              </mesh>
            ))
          : null}
        {/* gable-end fills under the roof slopes (front + back) */}
        <mesh geometry={gableGeo} position={[0, WH, D / 2]} material={mats.siding} />
        <mesh geometry={gableGeo} position={[0, WH, -D / 2]} material={mats.siding} />
      </Build>

      {/* Roof — two pitched shingle planes + ridge cap, dropping onto the frame */}
      <Build
        progress={progress}
        range={[0.58, 0.8]}
        mode="down"
        drop={1.5}
        position={[0, WALL_TOP, 0]}
      >
        <mesh
          castShadow
          position={[-HALF_SPAN / 2, RISE / 2, 0]}
          rotation={[0, 0, ROOF_ANGLE]}
          material={mats.shingle}
        >
          <boxGeometry args={[SLANT, 0.1, ROOF_LEN]} />
        </mesh>
        <mesh
          castShadow
          position={[HALF_SPAN / 2, RISE / 2, 0]}
          rotation={[0, 0, -ROOF_ANGLE]}
          material={mats.shingle}
        >
          <boxGeometry args={[SLANT, 0.1, ROOF_LEN]} />
        </mesh>
        {/* ridge cap */}
        <mesh position={[0, RISE + 0.02, 0]} material={mats.wood}>
          <boxGeometry args={[0.16, 0.12, ROOF_LEN]} />
        </mesh>
      </Build>

      {/* Chimney (brick + cap) */}
      <Build progress={progress} range={[0.9, 1]} mode="up" position={[0.85, WALL_TOP, 0.2]}>
        <mesh castShadow position={[0, 0.45, 0]} material={mats.brick}>
          <boxGeometry args={[0.34, 0.95, 0.34]} />
        </mesh>
        <mesh position={[0, 0.95, 0]} material={mats.trim}>
          <boxGeometry args={[0.44, 0.08, 0.44]} />
        </mesh>
      </Build>

      {/* Windows */}
      <Window progress={progress} position={[-0.85, FH + 1.05, front]} trimMat={mats.trim} />
      <Window progress={progress} position={[0.85, FH + 1.05, front]} trimMat={mats.trim} />
      <Window
        progress={progress}
        position={[W / 2 + 0.01, FH + 1.05, 0]}
        trimMat={mats.trim}
        width={0.5}
      />

      {/* Door + frame + step */}
      <Build progress={progress} range={[0.74, 0.92]} mode="pop" position={[0, FH, front]}>
        <mesh position={[0, 0.55, 0.03]} castShadow material={mats.trim}>
          <boxGeometry args={[0.72, 1.16, 0.08]} />
        </mesh>
        <mesh position={[0, 0.52, 0.06]} castShadow material={mats.wood}>
          <boxGeometry args={[0.58, 1.04, 0.07]} />
        </mesh>
        {/* knob */}
        <mesh position={[0.2, 0.5, 0.11]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#caa24a" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* stoop */}
        <mesh position={[0, -0.06, 0.28]} receiveShadow castShadow material={mats.brick}>
          <boxGeometry args={[1.0, 0.14, 0.5]} />
        </mesh>
      </Build>

      {/* Landscaping + fence (high tier only — pure decoration) */}
      {tier === "high" ? (
        <Build progress={progress} range={[0.92, 1]} mode="pop" position={[0, 0, 0]}>
          {[
            [-1.1, front + 0.35],
            [1.15, front + 0.3],
            [1.45, front + 0.6],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.16, z]} castShadow material={mats.leaf}>
              <icosahedronGeometry args={[0.2 + (i % 2) * 0.06, 1]} />
            </mesh>
          ))}
        </Build>
      ) : null}

      {/* Grass + path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial color="#6f834d" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, front + 1.1]} receiveShadow material={mats.brick}>
        <planeGeometry args={[0.7, 1.8]} />
      </mesh>
    </group>
  );
}

function FramePosts({
  progress,
  mat,
}: {
  progress: MotionValue<number>;
  mat: THREE.Material;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const p = progress.get();
    const t = seg(p, 0.28, 0.52) * (1 - 0.9 * seg(p, 0.45, 0.7));
    g.current.scale.y = damp(g.current.scale.y, Math.max(0.0001, t), 8, dt);
    g.current.visible = g.current.scale.y > 0.02;
  });
  return (
    <group ref={g} position={[0, FH, 0]}>
      {[-1.3, -0.65, 0, 0.65, 1.3].map((x) => (
        <mesh key={x} position={[x, WH / 2, D / 2]} material={mat}>
          <boxGeometry args={[0.1, WH, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, WH, D / 2]} material={mat}>
        <boxGeometry args={[W, 0.12, 0.12]} />
      </mesh>
    </group>
  );
}

function Environment() {
  const { scene } = useThree();
  useEffect(() => {
    const tex = envTexture();
    scene.environment = tex;
    return () => {
      scene.environment = null;
    };
  }, [scene]);
  return null;
}

export default function House3D({ progress }: { progress: MotionValue<number> }) {
  const [tier, setTier] = useState<Tier>("standard");
  const [dpr, setDpr] = useState(1.25);

  useEffect(() => {
    // ?tier=high|standard overrides detection (manual testing / recording).
    const override = new URLSearchParams(window.location.search).get("tier");
    const t: Tier =
      override === "high" || override === "standard"
        ? (override as Tier)
        : detectTier();
    setTier(t);
    setDpr(t === "high" ? 2 : 1.5);
  }, []);

  return (
    <Canvas
      dpr={dpr}
      shadows
      camera={{ position: [5.6, 3.7, 6.6], fov: 32 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.35, 0)}
      gl={{ antialias: tier === "high", powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#E4ECF4"]} />
      <fog attach="fog" args={["#dde7f1", 13, 24]} />

      <Environment />

      <hemisphereLight args={["#d4e4f5", "#b29a78", 0.55]} />
      <directionalLight
        position={[6, 9, 5]}
        intensity={1.6}
        castShadow
        shadow-mapSize={tier === "high" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.35} color="#cfe0f2" />

      <HouseModel progress={progress} tier={tier} />

      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={9} blur={2.6} far={4} />

      {/* Game-style adaptive performance: drop render resolution under load
          (slight pixelation) rather than dropping frames. */}
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(tier === "high" ? 2 : 1.5, d + 0.25))}
      />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
