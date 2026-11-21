"use client";

import { Canvas } from "@react-three/fiber";
import type { Dictionary } from "@/i18n/dictionaries";
import { EYE, LookControls } from "./LookControls";
import { BackLeds, Coffee, Controller, Desk, Keyboard, Laptop, Mouse, Phone, SideMonitor, Tablet, Ultrawide } from "./Props";

export default function DeskScene({ t, reduceMotion }: { t: Dictionary["desk"]; reduceMotion: boolean }) {
  return (
    <Canvas
      className="desk-canvas"
      shadows
      dpr={[1, 1.5]}
      camera={{ position: EYE, fov: 58, near: 0.02, far: 10 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#07080d"]} />
      <fog attach="fog" args={["#07080d", 1.2, 3.2]} />
      <hemisphereLight args={["#8fa8ff", "#2a1a12", 0.35]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[0.6, 1.6, 1.2]}
        intensity={0.45}
        color="#b9c8ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-1.1}
        shadow-camera-right={1.1}
        shadow-camera-top={0.8}
        shadow-camera-bottom={-0.8}
        shadow-bias={-0.0004}
      />
      {/* Luz que emiten las pantallas sobre la mesa */}
      <pointLight position={[0, 0.3, -0.15]} color="#7fb8ff" intensity={0.8} distance={1.1} />

      <Desk />
      <BackLeds />
      <Ultrawide copy={t.screens} position={[0, 0, -0.32]} />
      <Laptop copy={t.screens} position={[-0.66, 0, -0.14]} rotation={[0, 0.6, 0]} />
      <SideMonitor copy={t.screens} position={[0.68, 0, -0.22]} rotation={[0, -0.6, 0]} />
      <Keyboard position={[-0.03, 0, 0.1]} />
      <Mouse position={[0.29, 0, 0.13]} rotation={[0, -0.1, 0]} />
      <Phone copy={t.screens} position={[0.29, 0, -0.08]} rotation={[0, -0.12, 0]} />
      <Coffee position={[0.44, 0, -0.06]} />
      <Controller position={[-0.5, 0, 0.2]} rotation={[0, 0.35, 0]} />
      <Tablet position={[0.62, 0, 0.18]} rotation={[0, -0.45, 0]} />

      <LookControls reduceMotion={reduceMotion} />
    </Canvas>
  );
}
