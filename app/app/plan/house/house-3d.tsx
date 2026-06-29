"use client";

// The 3D house — a progressive enhancement, dynamically imported and mounted
// only when useHouse3D() clears the perf gate. It assembles exactly like the 2D
// house: each part lerps up from the foundation as the `progress` motion value
// (0..1) climbs. Reading the MotionValue inside useFrame means the 3D build
// stays in lockstep with the on-open animation and scroll, with zero React
// re-renders. Deliberately lightweight — primitive meshes, capped DPR, no
// HDR/environment fetches — to stay cheap on mobile.
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { type MotionValue } from "motion/react";
import * as THREE from "three";

const INK = "#1A1816";
const OAK = "#B8843F";
const OAK_DIM = "#8E6529";
const PAPER = "#ECE6DA";
const AMBER = "#E8B04B";

function seg(v: number, start: number, end: number): number {
  if (v <= start) return 0;
  if (v >= end) return 1;
  return (v - start) / (end - start);
}

const damp = THREE.MathUtils.damp;

/**
 * A building part that grows from its base. Reads the shared progress value and
 * its own build window each frame; `recede` optionally fades it back out (the
 * frame disappearing behind finished walls).
 */
function Part({
  progress,
  build,
  recede,
  position,
  size,
  color,
  emissive,
  emissiveBuild,
}: {
  progress: MotionValue<number>;
  build: [number, number];
  recede?: [number, number];
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive?: string;
  emissiveBuild?: [number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, dt) => {
    const p = progress.get();
    let t = seg(p, build[0], build[1]);
    if (recede) t *= 1 - 0.85 * seg(p, recede[0], recede[1]);
    const g = group.current;
    if (g) {
      const s = damp(g.scale.y, Math.max(0.0001, t), 7, dt);
      g.scale.y = s;
      g.position.y = position[1] - size[1] / 2 + (size[1] * s) / 2;
    }
    if (mat.current) {
      mat.current.opacity = damp(mat.current.opacity, t > 0.02 ? 1 : 0, 7, dt);
      if (emissive && emissiveBuild) {
        mat.current.emissiveIntensity = damp(
          mat.current.emissiveIntensity,
          seg(p, emissiveBuild[0], emissiveBuild[1]) * 1.5,
          7,
          dt,
        );
      }
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          ref={mat}
          color={color}
          transparent
          opacity={0}
          roughness={0.85}
          emissive={emissive ?? "#000000"}
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
}

function Roof({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const t = seg(progress.get(), 0.58, 0.8);
    if (group.current) {
      const s = damp(group.current.scale.y, Math.max(0.0001, t), 7, dt);
      group.current.scale.y = s;
      group.current.position.y = 1.95 + (1 - s) * 0.7;
    }
    if (mat.current) {
      mat.current.opacity = damp(mat.current.opacity, t > 0.02 ? 1 : 0, 7, dt);
    }
  });
  return (
    <group ref={group} position={[0, 1.95, 0]}>
      <mesh castShadow rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[1.95, 1.95, 2.5, 3, 1]} />
        <meshStandardMaterial ref={mat} color={OAK} transparent opacity={0} roughness={0.8} />
      </mesh>
    </group>
  );
}

function HouseModel({ progress }: { progress: MotionValue<number> }) {
  const root = useRef<THREE.Group>(null);
  const drag = useRef({ active: false, x: 0, vel: 0, rot: 0 });

  useFrame((_, dt) => {
    if (!root.current) return;
    if (!drag.current.active) drag.current.rot += dt * 0.16;
    drag.current.rot += drag.current.vel * dt;
    drag.current.vel = damp(drag.current.vel, 0, 4, dt);
    root.current.rotation.y = drag.current.rot;
  });

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
      <Part progress={progress} build={[0.12, 0.3]} position={[0, 0.15, 0]} size={[3.2, 0.3, 2.4]} color={INK} />
      {[-1.3, -0.65, 0, 0.65, 1.3].map((x) => (
        <Part
          key={x}
          progress={progress}
          build={[0.28, 0.52]}
          recede={[0.45, 0.7]}
          position={[x, 1.05, 1.05]}
          size={[0.12, 1.7, 0.12]}
          color={OAK_DIM}
        />
      ))}
      <Part progress={progress} build={[0.45, 0.7]} position={[0, 1.05, 0]} size={[3, 1.7, 2.2]} color={PAPER} />
      <Roof progress={progress} />
      <Part progress={progress} build={[0.9, 1]} position={[0.9, 2.45, 0.2]} size={[0.3, 0.7, 0.3]} color={OAK_DIM} />
      <Part progress={progress} build={[0.74, 0.92]} position={[0, 0.55, 1.11]} size={[0.5, 0.9, 0.06]} color={OAK_DIM} />
      {[-0.95, 0.95].map((x) => (
        <Part
          key={x}
          progress={progress}
          build={[0.74, 0.92]}
          position={[x, 1.1, 1.11]}
          size={[0.55, 0.5, 0.06]}
          color={AMBER}
          emissive={AMBER}
          emissiveBuild={[0.9, 1]}
        />
      ))}
    </group>
  );
}

export default function House3D({ progress }: { progress: MotionValue<number> }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows
      camera={{ position: [4.2, 3.2, 5.2], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#E4ECF4"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -2]} intensity={0.4} color="#A9C3DD" />
      <HouseModel progress={progress} />
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={10} blur={2.4} far={4} />
    </Canvas>
  );
}
