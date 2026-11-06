"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import {
  TrackballControls,
  useGLTF,
} from "@react-three/drei";

import LandingMarker from "./LandingMarker";
import LandingSitePanel from "./LandingSitePanel";
import LolaTerrain from "./LolaTerrain";
import SunMarker from "./SunMarker";

/* =========================================================
   MOON MODEL
========================================================= */

function Moon() {
  const { scene } = useGLTF("/models/moon.glb");

  return (
    <primitive
      object={scene}
      scale={2}
      position={[0, 0, 0]}
    />
  );
}

/* =========================================================
   LAT/LON → 3D VECTOR
========================================================= */

function latLonToVector(
  latitude: number,
  longitude: number
) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);

  const x =
    Math.cos(lat) *
    Math.cos(lon);

  const y = Math.sin(lat);

  const z =
    Math.cos(lat) *
    Math.sin(lon);

  return new THREE.Vector3(
    x,
    y,
    z
  ).normalize();
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function MoonScene() {
  /* -------------------------------------------------------
     LANDING SITE
  ------------------------------------------------------- */

  const [latitude, setLatitude] =
    useState(-89.5);

  const [longitude, setLongitude] =
    useState(0);

  /* -------------------------------------------------------
     SIMULATION TIME

     Start with null so Next.js does not render
     new Date() during server/client hydration.
  ------------------------------------------------------- */

  const [simulationTime, setSimulationTime] =
    useState<string | null>(null);

  /* -------------------------------------------------------
     SUN DATA
  ------------------------------------------------------- */

  const [sunPosition, setSunPosition] =
    useState<[number, number, number] | null>(
      null
    );

  const [solarElevation, setSolarElevation] =
    useState<number | null>(null);

  const [loadingSun, setLoadingSun] =
    useState(false);

  /* =======================================================
     SET INITIAL TIME AFTER COMPONENT MOUNTS
  ======================================================= */

  useEffect(() => {
    setSimulationTime(
      new Date().toISOString()
    );
  }, []);

  /* =======================================================
     GET SUN POSITION FROM JPL HORIZONS
  ======================================================= */

  useEffect(() => {
    if (!simulationTime) {
      return;
    }

    async function getSunPosition() {
      try {
        setLoadingSun(true);

        console.log(
          "☀️ Fetching Sun:",
          simulationTime
        );

        const response = await fetch(
          `/api/ephemeris?time=${encodeURIComponent(
            simulationTime
          )}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (!data.success) {
          console.error(
            "❌ JPL error:",
            data.error
          );

          return;
        }

        const result = data.result;

        /* -------------------------------------------------
           Extract X Y Z from JPL Horizons response
        ------------------------------------------------- */

        const match = result.match(
          /X\s*=\s*([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)\s+Y\s*=\s*([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)\s+Z\s*=\s*([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)/i
        );

        if (!match) {
          console.error(
            "❌ Could not parse JPL coordinates"
          );

          return;
        }

        const x = Number(match[1]);
        const y = Number(match[2]);
        const z = Number(match[3]);

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(z)
        ) {
          console.error(
            "❌ Invalid Sun coordinates:",
            x,
            y,
            z
          );

          return;
        }

        /* -------------------------------------------------
           Convert Sun coordinates to direction
        ------------------------------------------------- */

        const sunVector =
          new THREE.Vector3(
            x,
            y,
            z
          ).normalize();

        /* -------------------------------------------------
           Put Sun visually outside Moon
        ------------------------------------------------- */

        const distance = 6;

        const position: [
          number,
          number,
          number
        ] = [
          sunVector.x * distance,
          sunVector.y * distance,
          sunVector.z * distance,
        ];

        setSunPosition(position);

        /* -------------------------------------------------
           Calculate solar elevation at landing site
        ------------------------------------------------- */

        const siteNormal =
          latLonToVector(
            latitude,
            longitude
          );

        const dot =
          siteNormal.dot(sunVector);

        const clampedDot =
          THREE.MathUtils.clamp(
            dot,
            -1,
            1
          );

        const elevation =
          THREE.MathUtils.radToDeg(
            Math.asin(clampedDot)
          );

        setSolarElevation(elevation);

        console.log(
          "🌞 Solar elevation:",
          elevation
        );
      } catch (error) {
        console.error(
          "❌ Sun calculation failed:",
          error
        );

        setSunPosition(null);
        setSolarElevation(null);
      } finally {
        setLoadingSun(false);
      }
    }

    getSunPosition();
  }, [
    simulationTime,
    latitude,
    longitude,
  ]);

  /* =======================================================
     SUNLIGHT STATUS
  ======================================================= */

  const sunlightStatus = useMemo(() => {
    if (solarElevation === null) {
      return "Calculating...";
    }

    if (solarElevation > 5) {
      return "SUNLIGHT";
    }

    if (solarElevation >= 0) {
      return "LOW SUN";
    }

    return "DARKNESS";
  }, [solarElevation]);

  /* =======================================================
     CURRENT DATE

     Use Unix epoch while waiting for the initial
     client-side time to avoid hydration mismatch.
  ======================================================= */

  const currentDate = simulationTime
    ? new Date(simulationTime)
    : new Date(0);

  const sliderValue =
    currentDate.getTime();

  const minTime =
    sliderValue -
    24 * 60 * 60 * 1000;

  const maxTime =
    sliderValue +
    24 * 60 * 60 * 1000;

  /* =======================================================
     DATE SLIDER
  ======================================================= */

  function handleTimeChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const value = Number(
      event.target.value
    );

    if (!Number.isFinite(value)) {
      return;
    }

    setSimulationTime(
      new Date(value).toISOString()
    );
  }

  /* =======================================================
     RESET TO NOW
  ======================================================= */

  function handleNow() {
    setSimulationTime(
      new Date().toISOString()
    );
  }

  /* =======================================================
     LOCATION CHANGE
  ======================================================= */

  function handleLocationChange(
    lat: number,
    lon: number
  ) {
    setLatitude(lat);
    setLongitude(lon);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* =================================================
          LOCATION PANEL
      ================================================= */}

      <LandingSitePanel
        onLocationChange={
          handleLocationChange
        }
      />

      {/* =================================================
          3D MOON SCENE
      ================================================= */}

      <Canvas
        camera={{
          position: [0, 0, 4],
          fov: 45,
          near: 0.01,
          far: 1000,
        }}
        gl={{
          antialias: true,
        }}
      >

        {/* -----------------------------------------------
            BASIC LIGHTING
        ----------------------------------------------- */}

        <ambientLight intensity={0.15} />

        {/* -----------------------------------------------
            SUN LIGHT
        ----------------------------------------------- */}

        {sunPosition && (
          <directionalLight
            position={sunPosition}
            intensity={3}
          />
        )}

        {/* -----------------------------------------------
            MOON
        ----------------------------------------------- */}

        <Moon />

        {/* -----------------------------------------------
            LOLA SOUTH POLE TERRAIN

            IMPORTANT:
            Pass the currently selected latitude
            and longitude.
        ----------------------------------------------- */}

        <LolaTerrain
          latitude={latitude}
          longitude={longitude}
        />

        {/* -----------------------------------------------
            LANDING SITE MARKER
        ----------------------------------------------- */}

        <LandingMarker
          latitude={latitude}
          longitude={longitude}
        />

        {/* -----------------------------------------------
            SUN MARKER
        ----------------------------------------------- */}

        {sunPosition && (
          <SunMarker
            position={sunPosition}
          />
        )}

        {/* -----------------------------------------------
            360° CAMERA CONTROLS

            Allows:
            - Full rotation
            - Zoom
            - Pan
        ----------------------------------------------- */}

        <TrackballControls
          rotateSpeed={3}
          zoomSpeed={1.2}
          panSpeed={0.8}
          noZoom={false}
          noPan={false}
          staticMoving={false}
          dynamicDampingFactor={0.15}
          minDistance={0.1}
          maxDistance={100}
        />

      </Canvas>

      {/* =================================================
          TOP INFORMATION PANEL
      ================================================= */}

      <div className="absolute top-5 left-5 z-20 rounded-xl bg-black/70 backdrop-blur-md px-5 py-4 text-white shadow-xl">

        <div className="text-lg font-bold">
          Lunar Landing Site Navigator
        </div>

        <div className="mt-1 text-sm text-gray-300">
          NASA South Pole Mission Visualizer
        </div>

        <div className="mt-3 text-sm">
          <span className="text-gray-400">
            Latitude:
          </span>{" "}
          {latitude.toFixed(4)}°
        </div>

        <div className="text-sm">
          <span className="text-gray-400">
            Longitude:
          </span>{" "}
          {longitude.toFixed(4)}°
        </div>

      </div>

      {/* =================================================
          SUN INFORMATION PANEL
      ================================================= */}

      <div className="absolute top-5 right-5 z-20 min-w-[230px] rounded-xl bg-black/70 backdrop-blur-md px-5 py-4 text-white shadow-xl">

        <div className="mb-2 text-lg font-bold">
          ☀ Sun Conditions
        </div>

        <div className="text-sm">
          <span className="text-gray-400">
            Status:
          </span>{" "}
          <span
            className={
              solarElevation !== null &&
              solarElevation > 5
                ? "text-yellow-300"
                : "text-white"
            }
          >
            {sunlightStatus}
          </span>
        </div>

        <div className="mt-1 text-sm">
          <span className="text-gray-400">
            Solar Elevation:
          </span>{" "}
          {solarElevation !== null
            ? `${solarElevation.toFixed(2)}°`
            : loadingSun
            ? "Calculating..."
            : "--"}
        </div>

        <div className="mt-1 text-xs text-gray-500">
          Source: NASA/JPL Horizons
        </div>

      </div>

      {/* =================================================
          TIME CONTROL
      ================================================= */}

      <div className="absolute bottom-5 left-1/2 z-20 w-[90%] max-w-3xl -translate-x-1/2 rounded-xl bg-black/75 backdrop-blur-md px-6 py-4 text-white shadow-xl">

        {/* -----------------------------------------------
            DATE
        ----------------------------------------------- */}

        <div className="mb-3 flex items-center justify-between">

          <div>
            <div className="text-sm text-gray-400">
              Simulation Time
            </div>

            <div className="text-base font-semibold">
              {simulationTime
                ? currentDate.toUTCString()
                : "Loading time..."}
            </div>
          </div>

          {/* -------------------------------------------
              NOW BUTTON
          ------------------------------------------- */}

          <button
            type="button"
            onClick={handleNow}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            NOW
          </button>

        </div>

        {/* -----------------------------------------------
            TIME SLIDER
        ----------------------------------------------- */}

        <input
          type="range"
          min={minTime}
          max={maxTime}
          value={sliderValue}
          onChange={handleTimeChange}
          disabled={!simulationTime}
          className="w-full cursor-pointer"
        />

        {/* -----------------------------------------------
            TIME LABELS
        ----------------------------------------------- */}

        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>
            -24 hours
          </span>

          <span>
            Current
          </span>

          <span>
            +24 hours
          </span>
        </div>

      </div>

      {/* =================================================
          BOTTOM LEFT STATUS
      ================================================= */}

      <div className="absolute bottom-5 left-5 z-20 rounded-lg bg-black/60 px-4 py-3 text-xs text-gray-300 backdrop-blur-md">

        <div>
          🌑 Moon 3D Model: NASA
        </div>

        <div>
          🏔 Terrain: NASA LOLA
        </div>

        <div>
          ☀ Ephemeris: NASA/JPL Horizons
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   PRELOAD MOON MODEL
========================================================= */

useGLTF.preload("/models/moon.glb");