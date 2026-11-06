"use client";

import { useMemo } from "react";

interface LandingMarkerProps {
  latitude: number;
  longitude: number;
  radius?: number;
}

export default function LandingMarker({
  latitude,
  longitude,
  radius = 2.02,
}: LandingMarkerProps) {

  const position = useMemo(() => {
    const lat = (latitude * Math.PI) / 180;
    const lon = (longitude * Math.PI) / 180;

    const x = radius * Math.cos(lat) * Math.cos(lon);
    const y = radius * Math.sin(lat);
    const z = radius * Math.cos(lat) * Math.sin(lon);

    return [x, y, z] as [number, number, number];
  }, [latitude, longitude, radius]);

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.04, 16, 16]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}