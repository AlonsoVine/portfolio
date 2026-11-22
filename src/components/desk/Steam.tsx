"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, PlaneGeometry, type ShaderMaterial, type Texture } from "three";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uNoise;
  varying vec2 vUv;

  vec2 rotate2D(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c) * v;
  }

  void main() {
    vec3 p = position;
    // La cinta se retuerce más cuanto más sube, y el viento la desplaza en lo alto
    float twist = texture2D(uNoise, vec2(0.5, uv.y * 0.2 - uTime * 0.005)).r;
    p.xz = rotate2D(p.xz, twist * 10.0);
    vec2 wind = vec2(
      texture2D(uNoise, vec2(0.25, uTime * 0.01)).r - 0.5,
      texture2D(uNoise, vec2(0.75, uTime * 0.01)).r - 0.5
    );
    p.xz += wind * pow(uv.y, 2.0) * 0.9;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vUv = uv;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uNoise;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec2 suv = vUv;
    suv.x *= 0.5;
    suv.y *= 0.3;
    suv.y -= uTime * 0.03;
    float smoke = texture2D(uNoise, suv).r;
    smoke = smoothstep(0.45, 1.0, smoke);
    // Bordes difuminados: nada de cortes rectos en los lados, la base ni la punta
    smoke *= smoothstep(0.0, 0.15, vUv.x);
    smoke *= smoothstep(1.0, 0.85, vUv.x);
    smoke *= smoothstep(0.0, 0.12, vUv.y);
    smoke *= smoothstep(1.0, 0.35, vUv.y);
    gl_FragColor = vec4(uColor, smoke * uOpacity);
  }
`;

/** Vapor del café: cinta de shader con ruido que se retuerce y sube, como el de una taza recién hecha. */
export function Steam({
  position,
  height = 0.2,
  width = 0.06,
  seed = 0,
  noise,
}: {
  position: [number, number, number];
  height?: number;
  width?: number;
  seed?: number;
  noise: Texture;
}) {
  const material = useRef<ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1, 16, 64);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNoise: { value: noise },
      uColor: { value: new Color("#dfe7ff") },
      uOpacity: { value: 0.55 },
    }),
    [noise],
  );

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime * 2.2 + seed * 37;
  });

  return (
    <mesh geometry={geometry} position={position} scale={[width, height, width]}>
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
