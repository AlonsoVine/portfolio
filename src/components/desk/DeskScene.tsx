"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { Dictionary } from "@/i18n/dictionaries";
import { Laptop, SideMonitor, Ultrawide } from "./Displays";
import { Coffee, Phone, Tablet } from "./Gadgets";
import { EYE, LookControls } from "./LookControls";
import { Controller } from "./Controller";
import { Keyboard, Mouse } from "./Peripherals";
import { Performance, Reflections } from "./primitives";
import { Desk, Leds } from "./Room";

// Las pantallas iluminan la mesa con luces de área; sus tablas se cargan una sola vez
RectAreaLightUniformsLib.init();

type Props = { t: Dictionary["desk"]; lang: string; reduceMotion: boolean; onReady: () => void };

export default function DeskScene({ t, lang, reduceMotion, onReady }: Props) {
  return (
    <Canvas
      className="desk-canvas"
      shadows
      flat
      dpr={[1, 1.5]}
      camera={{ position: EYE, fov: 56, near: 0.02, far: 8 }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        // Nada que proyecte sombra se mueve: el mapa de sombras se calcula una vez
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
        requestAnimationFrame(onReady);
      }}
    >
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 1.3, 3]} />

      <Reflections />

      <hemisphereLight args={["#6f86c9", "#1a0f0a", 0.18]} />
      <directionalLight
        position={[-0.6, 1.8, 1.1]}
        intensity={0.35}
        color="#a8b8ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1.2}
        shadow-camera-right={1.2}
        shadow-camera-top={0.9}
        shadow-camera-bottom={-0.9}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />

      {/* Relleno cenital suave: la luz de la habitación, para que el primer plano no se pierda en negro */}
      <spotLight position={[0.1, 1.5, 1.1]} angle={0.75} penumbra={1} intensity={1.6} decay={1.2} color="#8b9ad6" />

      <Desk />
      <Leds t={t} reduceMotion={reduceMotion} />
      <Ultrawide t={t} position={[0, 0, -0.3]} />
      <Laptop t={t} position={[-0.585, 0, -0.21]} rotation={[0, 0.46, 0]} />
      <SideMonitor t={t} position={[0.675, 0, -0.22]} rotation={[0, -0.56, 0]} />
      <Keyboard position={[-0.04, 0, 0.1]} reduceMotion={reduceMotion} />
      <Mouse position={[0.27, 0, 0.13]} rotation={[0, -0.12, 0]} />
      <Phone t={t} lang={lang} position={[0.27, 0, -0.1]} rotation={[0, -0.15, 0]} />
      <Coffee position={[0.425, 0, -0.06]} reduceMotion={reduceMotion} />
      <Controller position={[-0.47, 0, 0.2]} rotation={[0, 0.38, 0]} />
      <Tablet t={t} lang={lang} position={[0.6, 0, 0.15]} rotation={[0, -0.42, 0]} />

      <LookControls reduceMotion={reduceMotion} />
      <Performance />

      <EffectComposer multisampling={4} enableNormalPass={false}>
        {/* Oclusión ambiental: asienta los objetos sobre la mesa y oscurece los rincones */}
        <N8AO halfRes aoRadius={0.06} distanceFalloff={0.5} intensity={2.2} color="#05060a" quality="medium" />
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1} luminanceSmoothing={0.25} radius={0.72} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.28} darkness={0.72} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.35} />
      </EffectComposer>
    </Canvas>
  );
}
