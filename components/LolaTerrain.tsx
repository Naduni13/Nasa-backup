"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

interface LolaData {
  width: number;
  height: number;
  minElevation: number;
  maxElevation: number;
  referenceRadiusKm: number;
  latitudeMin: number;
  latitudeMax: number;
  longitudeMin: number;
  longitudeMax: number;
  elevations: number[];
}

interface LolaTerrainProps {
  latitude: number;
  longitude: number;
}

export default function LolaTerrain({
  latitude,
  longitude,
}: LolaTerrainProps) {
  const [data, setData] = useState<LolaData | null>(null);

  useEffect(() => {
    fetch("/lola-south-pole.json")
      .then((response) => response.json())
      .then((json) => {
        setData(json);
      })
      .catch((error) => {
        console.error("Failed to load LOLA data:", error);
      });
  }, []);

  const geometry = useMemo(() => {
    if (!data) return null;

    /*
     * We only display a LOCAL area around the selected
     * landing site instead of the entire South Pole.
     */

    const PATCH_SIZE_DEGREES = 4;

    const latMin = Math.max(
      -90,
      latitude - PATCH_SIZE_DEGREES / 2
    );

    const latMax = Math.min(
      -80,
      latitude + PATCH_SIZE_DEGREES / 2
    );

    let lonMin = longitude - PATCH_SIZE_DEGREES / 2;
    let lonMax = longitude + PATCH_SIZE_DEGREES / 2;

    // Keep longitude within 0–360
    if (lonMin < 0) lonMin += 360;
    if (lonMax >= 360) lonMax -= 360;

    const vertices: number[] = [];
    const indices: number[] = [];

    const GRID_SIZE = 64;

    /*
     * Convert latitude/longitude to a point
     * on a sphere.
     */

    const latLonToVector = (
      lat: number,
      lon: number,
      radius: number
    ) => {
      const phi = THREE.MathUtils.degToRad(lat);
      const theta = THREE.MathUtils.degToRad(lon);

      const x =
        radius *
        Math.cos(phi) *
        Math.cos(theta);

      const y =
        radius *
        Math.sin(phi);

      const z =
        radius *
        Math.cos(phi) *
        Math.sin(theta);

      return new THREE.Vector3(x, y, z);
    };

    /*
     * Find elevation from the LOLA grid.
     */

    const getElevation = (
      lat: number,
      lon: number
    ) => {
      const latRatio =
        (lat - data.latitudeMin) /
        (data.latitudeMax - data.latitudeMin);

      let normalizedLon =
        ((lon - data.longitudeMin) /
          (data.longitudeMax -
            data.longitudeMin));

      normalizedLon =
        ((normalizedLon % 1) + 1) % 1;

      const row = Math.round(
        (1 - latRatio) *
          (data.height - 1)
      );

      const col = Math.round(
        normalizedLon *
          (data.width - 1)
      );

      const safeRow = THREE.MathUtils.clamp(
        row,
        0,
        data.height - 1
      );

      const safeCol = THREE.MathUtils.clamp(
        col,
        0,
        data.width - 1
      );

      return data.elevations[
        safeRow * data.width + safeCol
      ];
    };

    /*
     * Generate local terrain.
     */

    const moonRadius = 2;

    /*
     * Elevation exaggeration is intentionally
     * small because lunar elevations are in km.
     */

    const elevationScale = 0.015;

    for (let row = 0; row < GRID_SIZE; row++) {
      const rowRatio =
        row / (GRID_SIZE - 1);

      const lat =
        latMin +
        (latMax - latMin) *
          rowRatio;

      for (
        let col = 0;
        col < GRID_SIZE;
        col++
      ) {
        const colRatio =
          col / (GRID_SIZE - 1);

        let lon =
          lonMin +
          (lonMax - lonMin) *
            colRatio;

        /*
         * Handle longitude wrapping.
         */

        if (lon < 0) lon += 360;
        if (lon >= 360) lon -= 360;

        const elevation =
          getElevation(lat, lon);

        const radius =
          moonRadius +
          0.025 +
          elevation * elevationScale;

        const position =
          latLonToVector(
            lat,
            lon,
            radius
          );

        vertices.push(
          position.x,
          position.y,
          position.z
        );
      }
    }

    /*
     * Create triangles.
     */

    for (
      let row = 0;
      row < GRID_SIZE - 1;
      row++
    ) {
      for (
        let col = 0;
        col < GRID_SIZE - 1;
        col++
      ) {
        const a =
          row * GRID_SIZE + col;

        const b =
          row * GRID_SIZE +
          col +
          1;

        const c =
          (row + 1) *
            GRID_SIZE +
          col;

        const d =
          (row + 1) *
            GRID_SIZE +
          col +
          1;

        indices.push(
          a,
          c,
          b,

          b,
          c,
          d
        );
      }
    }

    const geometry =
      new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        vertices,
        3
      )
    );

    geometry.setIndex(indices);

    geometry.computeVertexNormals();

    return geometry;
  }, [data, latitude, longitude]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#888888"
        roughness={1}
        metalness={0}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}