"use client";

import { Html } from "@react-three/drei";

interface SunMarkerProps {
  position: [number, number, number];
}

export default function SunMarker({
  position,
}: SunMarkerProps) {
  return (
    <group position={position}>

      {/* Sun */}
      <mesh>
        <sphereGeometry
          args={[0.3, 32, 32]}
        />

        <meshBasicMaterial
          color="#FFD54A"
        />
      </mesh>

      {/* Glow */}
      <mesh>
        <sphereGeometry
          args={[0.45, 32, 32]}
        />

        <meshBasicMaterial
          color="#FFA000"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Label */}
      <Html
        center
        distanceFactor={8}
        position={[0, -0.6, 0]}
      >
        <div
          className="select-none whitespace-nowrap text-sm font-semibold"
          style={{
            color: "#FFD54A",
            textShadow:
              "0 0 8px #000, 0 0 12px #000",
          }}
        >
          ☀ Sun
        </div>
      </Html>

    </group>
  );
}