"use client";

import { useLayoutEffect, useRef } from "react";
import { BackSide, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, type InstancedMesh, Object3D, Path, Shape, ShapeGeometry, Vector2 } from "three";
import { RoundedBox } from "./primitives";
import { drawFretboard, drawSoftDot, drawSpruceTop } from "./screens";
import { useCanvasTexture } from "./useCanvasTexture";

type Placed = { position: [number, number, number]; rotation?: [number, number, number] };

// Media silueta de una dreadnought en metros: y = 0 en la culata, 0,5 en el tacón del mástil
const HALF: [number, number][] = [
  [0, 0],
  [0.1, 0.006],
  [0.165, 0.04],
  [0.195, 0.11],
  [0.188, 0.19],
  [0.15, 0.25],
  [0.128, 0.29],
  [0.138, 0.35],
  [0.146, 0.41],
  [0.125, 0.465],
  [0.07, 0.495],
  [0, 0.5],
];
const DEPTH = 0.1;
const BEVEL = 0.004;
const FRONT = DEPTH + BEVEL;
const SCALE = 0.645;
// Catorce trastes libres hasta la caja: la cejuela queda a 0,358 m del tacón
const NUT_Y = 0.5 + SCALE * (1 - 2 ** (-14 / 12));
const SADDLE_Y = NUT_Y - SCALE;
const BOARD_FROM = 0.42;

const HOLE_Y = 0.39;
const HOLE_R = 0.05;

function outline(withHole: boolean) {
  const right = HALF.map(([x, y]) => new Vector2(x, y));
  const left = [...HALF].reverse().slice(1, -1).map(([x, y]) => new Vector2(-x, y));
  const s = new Shape();
  s.moveTo(right[0].x, right[0].y);
  s.splineThru([...right.slice(1), ...left, right[0]]);
  if (withHole) {
    const hole = new Path();
    hole.absarc(0, HOLE_Y, HOLE_R, 0, Math.PI * 2, true);
    s.holes.push(hole);
  }
  return s;
}

// La boca atraviesa tapa y caja: de lado se ve el hueco, no un círculo pintado
const SHAPE = outline(true);
const BODY = new ExtrudeGeometry(SHAPE, { depth: DEPTH, curveSegments: 48, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 3 });

function topGeometry() {
  const g = new ShapeGeometry(SHAPE, 48);
  // La UV de ShapeGeometry son las coordenadas del contorno; se normalizan al lienzo de la tapa
  const pos = g.attributes.position;
  const uv: number[] = [];
  for (let i = 0; i < pos.count; i += 1) uv.push((pos.getX(i) + 0.2) / 0.4, pos.getY(i) / 0.5);
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return g;
}
const TOP = topGeometry();
// Filete crema: un contorno medio milímetro mayor justo en el canto de la tapa
const BINDING = new ExtrudeGeometry(outline(true), { depth: 0.002, curveSegments: 48, bevelEnabled: true, bevelThickness: 0.001, bevelSize: BEVEL + 0.0007, bevelSegments: 1 });
const STRING = new CylinderGeometry(1, 1, 1, 6, 1);

/** Seis cuerdas de entorchado metálico, de la selleta a la cejuela, más gruesas en los graves. */
function Strings() {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    for (let i = 0; i < 6; i += 1) {
      const k = i / 5 - 0.5;
      const x0 = k * 0.054;
      const x1 = k * 0.036;
      const len = NUT_Y - SADDLE_Y;
      const r = 0.0006 - i * 0.00005;
      o.position.set((x0 + x1) / 2, (SADDLE_Y + NUT_Y) / 2, FRONT + 0.0093);
      o.rotation.set(0, 0, Math.atan2(x0 - x1, len));
      o.scale.set(r, len, r);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={ref} args={[STRING, undefined, 6]}>
      <meshStandardMaterial color="#d8d2c4" roughness={0.3} metalness={1} />
    </instancedMesh>
  );
}

/** Guitarra acústica colgada de un soporte de pared: tapa de abeto, aros de caoba y diapasón de palosanto. */
export function Guitar({ position, rotation }: Placed) {
  const spruce = useCanvasTexture(512, 640, drawSpruceTop);
  const board = useCanvasTexture(64, 512, drawFretboard);
  const dot = useCanvasTexture(128, 128, drawSoftDot);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={BODY} castShadow receiveShadow>
        <meshStandardMaterial color="#5c2e18" roughness={0.3} />
      </mesh>
      <mesh geometry={BINDING} position={[0, 0, DEPTH - 0.0015]}>
        <meshStandardMaterial color="#e8dcc0" roughness={0.35} />
      </mesh>
      {/* Fondo de la caja visto por la boca */}
      <mesh position={[0, HOLE_Y, 0.004]}>
        <circleGeometry args={[HOLE_R * 1.1, 32]} />
        <meshBasicMaterial color="#030201" />
      </mesh>
      {/* Garganta de la boca: dentro de la caja apenas entra luz, se ve casi negra */}
      <mesh position={[0, HOLE_Y, (FRONT + 0.004) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[HOLE_R * 0.995, HOLE_R * 0.995, FRONT - 0.004, 40, 1, true]} />
        <meshBasicMaterial color="#070403" side={BackSide} />
      </mesh>
      <mesh geometry={TOP} position={[0, 0, FRONT + 0.0004]} receiveShadow>
        <meshStandardMaterial map={spruce} roughness={0.26} />
      </mesh>

      {/* Puente con selleta de hueso */}
      <RoundedBox args={[0.15, 0.03, 0.008]} radius={0.003} position={[0, SADDLE_Y - 0.008, FRONT + 0.004]} castShadow>
        <meshStandardMaterial color="#1e120c" roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.075, 0.003, 0.004]} radius={0.001} position={[0, SADDLE_Y, FRONT + 0.009]}>
        <meshStandardMaterial color="#efe8d8" roughness={0.4} />
      </RoundedBox>

      {/* Mástil y diapasón */}
      <RoundedBox args={[0.05, NUT_Y - 0.49, 0.022]} radius={0.008} position={[0, (NUT_Y + 0.49) / 2, FRONT - 0.012]} castShadow>
        <meshStandardMaterial color="#6b3a1f" roughness={0.35} />
      </RoundedBox>
      <RoundedBox args={[0.052, NUT_Y - BOARD_FROM, 0.006]} radius={0.0015} position={[0, (NUT_Y + BOARD_FROM) / 2, FRONT + 0.003]}>
        <meshStandardMaterial color="#24150e" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, (NUT_Y + BOARD_FROM) / 2, FRONT + 0.0062]}>
        <planeGeometry args={[0.05, NUT_Y - BOARD_FROM]} />
        <meshStandardMaterial map={board} roughness={0.45} metalness={0.2} />
      </mesh>
      <RoundedBox args={[0.052, 0.004, 0.006]} radius={0.001} position={[0, NUT_Y, FRONT + 0.006]}>
        <meshStandardMaterial color="#efe8d8" roughness={0.4} />
      </RoundedBox>

      <Strings />

      {/* Pala inclinada hacia atrás con sus seis clavijas */}
      <group position={[0, NUT_Y + 0.002, FRONT - 0.004]} rotation={[-0.24, 0, 0]}>
        <RoundedBox args={[0.074, 0.18, 0.016]} radius={0.006} position={[0, 0.09, 0]} castShadow>
          <meshStandardMaterial color="#1c110b" roughness={0.3} />
        </RoundedBox>
        {[0.04, 0.085, 0.13].flatMap((y) =>
          [-1, 1].map((s) => (
            <group key={`${y}${s}`} position={[s * 0.024, y, 0]}>
              <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.003, 0.004, 0.012, 12]} />
                <meshStandardMaterial color="#c9c6be" roughness={0.25} metalness={0.9} />
              </mesh>
              <mesh position={[s * 0.026, 0, -0.004]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0025, 0.0025, 0.016, 8]} />
                <meshStandardMaterial color="#c9c6be" roughness={0.25} metalness={0.9} />
              </mesh>
              <RoundedBox args={[0.006, 0.012, 0.004]} radius={0.0015} position={[s * 0.036, 0, -0.004]}>
                <meshStandardMaterial color="#d8d3c5" roughness={0.35} metalness={0.6} />
              </RoundedBox>
            </group>
          )),
        )}
      </group>

      {/* Sombra de contacto en la pared: la guitarra cuelga pegada a ella, no flota delante */}
      <mesh position={[0.004, 0.24, -0.029]} scale={[0.5, 0.58, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[0.004, 0.68, -0.029]} scale={[0.1, 0.5, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={dot} color="#000000" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {/* Soporte de pared: placa de madera y horquilla que recoge el mástil bajo la pala */}
      <RoundedBox args={[0.055, 0.09, 0.014]} radius={0.004} position={[0, NUT_Y - 0.01, -0.023]} castShadow>
        <meshStandardMaterial color="#3b2a1f" roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, NUT_Y - 0.012, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0045, 0.0045, 0.11, 12]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.35} metalness={0.7} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.032, NUT_Y + 0.002, FRONT - 0.012]} castShadow>
          <cylinderGeometry args={[0.005, 0.005, 0.03, 12]} />
          <meshStandardMaterial color="#141416" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
