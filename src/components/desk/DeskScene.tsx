"use client";

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { Bloom, EffectComposer, HueSaturation, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { Dictionary } from "@/i18n/dictionaries";
import { Laptop, SideMonitor, Ultrawide } from "./Displays";
import { Coffee, Phone, Tablet } from "./Gadgets";
import { EYE, LookControls } from "./LookControls";
import { Controller } from "./Controller";
import { Guitar } from "./Guitar";
import { Keyboard, Mouse } from "./Peripherals";
import { Plants } from "./Plants";
import { ContactShadows, Reflections, Warmup } from "./primitives";
import { drawSoftDot } from "./screens";
import { useCanvasTexture } from "./useCanvasTexture";
import { Headphones, MapFrame, Rug, Shelf, WallCalendar, WallClock } from "./Decor";
import { Desk, Leds, WALL_Z } from "./Room";

// Las pantallas iluminan la mesa con luces de área; sus tablas se cargan una sola vez
RectAreaLightUniformsLib.init();

// Hay transparencias (cristales, manchas de luz, vapor) y N8AO las detecta solo: entonces vuelve a pintar
// la escena dos veces por fotograma. Las transparentes no deben ocluir nada, así que se desactiva.
const opaqueAO = (pass: { autoDetectTransparency: boolean; configuration: { transparencyAware: boolean } } | null) => {
  if (!pass) return;
  pass.autoDetectTransparency = false;
  pass.configuration.transparencyAware = false;
};

function ContactBlobs() {
  const dot = useCanvasTexture(128, 128, drawSoftDot);
  return <ContactShadows map={dot} />;
}

type Props = { t: Dictionary["desk"]; lang: string; reduceMotion: boolean; onReady: () => void };

export default function DeskScene({ t, lang, reduceMotion, onReady }: Props) {
  const [low, setLow] = useState(false);
  return (
    <Canvas
      className="desk-canvas"
      shadows
      flat
      dpr={[1, 1.25]}
      camera={{ position: EYE, fov: 56, near: 0.02, far: 8 }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        // Nada que proyecte sombra se mueve: el mapa de sombras se calcula una vez
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
      }}
    >
      <color attach="background" args={["#05060a"]} />

      <Reflections />

      <hemisphereLight args={["#6f86c9", "#2b1d14", 0.28]} />
      <directionalLight
        position={[-0.6, 1.8, 1.1]}
        intensity={0.35}
        color="#a8b8ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-1.2}
        shadow-camera-right={1.2}
        shadow-camera-top={0.9}
        shadow-camera-bottom={-0.9}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />

      {/* Relleno cenital suave: la luz de la habitación, para que el primer plano no se pierda en negro */}
      <spotLight position={[0.1, 1.5, 1.1]} angle={0.75} penumbra={1} intensity={0.7} decay={1.2} color="#fff1de" />

      <Desk />
      <ContactBlobs />
      <Leds t={t} reduceMotion={reduceMotion} />
      <Ultrawide t={t} position={[0, 0, -0.3]} />
      <Laptop t={t} position={[-0.615, 0, -0.22]} rotation={[0, 0.46, 0]} />
      <SideMonitor t={t} position={[0.655, 0, -0.22]} rotation={[0, -0.56, 0]} />
      {/* Lo que va sobre el tapete se apoya en su cara superior (4 mm), no lo atraviesa */}
      <group position={[0, 0.004, 0]}>
        <Keyboard position={[-0.04, 0, 0.1]} reduceMotion={reduceMotion} />
        <Controller position={[-0.47, 0, 0.2]} rotation={[0, 0.38, 0]} />
        <Phone t={t} lang={lang} position={[0.27, 0, -0.1]} rotation={[0, -0.15, 0]} />
        <Coffee position={[0.425, 0, -0.06]} reduceMotion={reduceMotion} />
        <Tablet t={t} lang={lang} position={[0.6, 0, 0.15]} rotation={[0, -0.42, 0]} />
      </group>
      <Mouse position={[0.27, 0, 0.13]} rotation={[0, -0.12, 0]} />
      <Plants reduceMotion={reduceMotion} />
      <Rug />
      {/* Cascos colgados de un gancho bajo el canto, en el extremo derecho */}
      <Headphones position={[0.74, -0.045, 0.3]} />
      {/* Pared del fondo: la balda equilibra el portátil; reloj y calendario, el monitor lateral */}
      <Shelf position={[-0.6, 0.76, WALL_Z]} />
      <WallClock position={[0.6, 0.8, WALL_Z]} />
      <WallCalendar position={[0.86, 0.71, WALL_Z]} lang={lang} />
      {/* Pared izquierda: un mapa enmarcado, al mismo alto que la guitarra de enfrente */}
      <MapFrame position={[-1.049, 0.47, 0.22]} rotation={[0, Math.PI / 2, 0]} />
      <Guitar position={[1.02, 0.1, 0.11]} rotation={[0, -Math.PI / 2, 0]} />

      <LookControls reduceMotion={reduceMotion} />
      <Warmup onReady={onReady} onLow={() => setLow(true)} />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        {/* Oclusión ambiental: asienta los objetos sobre la mesa y oscurece los rincones */}
        <>{!low && <N8AO ref={opaqueAO} halfRes aoRadius={0.08} distanceFalloff={0.8} intensity={2} color="#000000" quality="performance" />}</>
        <Bloom mipmapBlur levels={5} intensity={0.24} luminanceThreshold={0.95} luminanceSmoothing={0.2} radius={0.75} />
        {/* El neón tal cual sale del render satura más que cualquier foto: se le quita un punto */}
        <HueSaturation saturation={-0.1} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.3} darkness={0.45} />
        {/* SMAA en vez de MSAA: sobre un buffer HalfFloat a resolución completa sale mucho más barato */}
        <SMAA />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.03} />
      </EffectComposer>
    </Canvas>
  );
}
