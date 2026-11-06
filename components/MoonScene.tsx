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


// ======================================================
// MOON
// ======================================================

function Moon() {
  const { scene } = useGLTF(
    "/models/moon.glb"
  );

  return (
    <primitive
      object={scene}
      scale={2}
      position={[0, 0, 0]}
    />
  );
}


// ======================================================
// CONVERT LAT/LON TO 3D DIRECTION
// ======================================================

function latLonToVector(
  latitude: number,
  longitude: number
) {
  const lat =
    THREE.MathUtils.degToRad(latitude);

  const lon =
    THREE.MathUtils.degToRad(longitude);

  const x =
    Math.cos(lat) * Math.cos(lon);

  const y =
    Math.sin(lat);

  const z =
    Math.cos(lat) * Math.sin(lon);

  return new THREE.Vector3(
    x,
    y,
    z
  ).normalize();
}


// ======================================================
// MAIN SCENE
// ======================================================

export default function MoonScene() {

  // ----------------------------------------------------
  // LANDING SITE
  // ----------------------------------------------------

  const [latitude, setLatitude] =
    useState(-89.5);

  const [longitude, setLongitude] =
    useState(0);


  // ----------------------------------------------------
  // SIMULATION TIME
  // ----------------------------------------------------

  const [simulationTime, setSimulationTime] =
    useState(
      new Date().toISOString()
    );


  // ----------------------------------------------------
  // SUN POSITION
  // ----------------------------------------------------

  const [sunPosition, setSunPosition] =
    useState<
      [number, number, number] | null
    >(null);


  // ----------------------------------------------------
  // SOLAR ELEVATION
  // ----------------------------------------------------

  const [solarElevation, setSolarElevation] =
    useState<number | null>(null);


  // ----------------------------------------------------
  // LOADING
  // ----------------------------------------------------

  const [loadingSun, setLoadingSun] =
    useState(false);


  // ====================================================
  // FETCH SUN FROM JPL
  // ====================================================

  useEffect(() => {

    async function getSunPosition() {

      try {

        setLoadingSun(true);

        console.log(
          "☀️ Fetching Sun:",
          simulationTime
        );

        const response =
          await fetch(
            `/api/ephemeris?time=${encodeURIComponent(
              simulationTime
            )}`
          );

        const data =
          await response.json();


        if (!data.success) {

          console.error(
            "❌ JPL error:",
            data.error
          );

          return;
        }


        const result =
          data.result;


        // ------------------------------------------------
        // Extract X Y Z
        // ------------------------------------------------

        const match =
          result.match(
            /X\s*=\s*([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)\s+Y\s*=\s*([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)\s+Z\s*=\s*([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)/i
          );


        if (!match) {

          console.error(
            "❌ Could not parse JPL coordinates"
          );

          return;
        }


        const x =
          Number(match[1]);

        const y =
          Number(match[2]);

        const z =
          Number(match[3]);


        // ------------------------------------------------
        // Sun direction
        // ------------------------------------------------

        const sunVector =
          new THREE.Vector3(
            x,
            y,
            z
          ).normalize();


        // ------------------------------------------------
        // Visualization position
        // ------------------------------------------------

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


        // ------------------------------------------------
        // Landing-site surface normal
        // ------------------------------------------------

        const siteNormal =
          latLonToVector(
            latitude,
            longitude
          );


        // ------------------------------------------------
        // Solar elevation
        //
        // Dot product:
        //
        //  1  = directly overhead
        //  0  = horizon
        // -1  = below horizon
        // ------------------------------------------------

        const dot =
          siteNormal.dot(
            sunVector
          );


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


        setSolarElevation(
          elevation
        );


        console.log(
          "🌞 Solar elevation:",
          elevation
        );

      } catch (error) {

        console.error(
          "❌ Sun calculation failed:",
          error
        );

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


  // ====================================================
  // SUNLIGHT STATUS
  // ====================================================

  const sunlightStatus =
    useMemo(() => {

      if (
        solarElevation === null
      ) {
        return "Calculating...";
      }

      if (
        solarElevation > 5
      ) {
        return "SUNLIGHT";
      }

      if (
        solarElevation >= 0
      ) {
        return "LOW SUN";
      }

      return "DARKNESS";

    }, [
      solarElevation,
    ]);


  // ====================================================
  // STATUS DISPLAY
  // ====================================================

  const statusClass =
    sunlightStatus === "SUNLIGHT"
      ? "text-green-400"
      : sunlightStatus === "LOW SUN"
      ? "text-yellow-400"
      : sunlightStatus === "DARKNESS"
      ? "text-red-400"
      : "text-white";


  // ====================================================
  // TIME SLIDER
  // ====================================================

  const currentDate =
    new Date(simulationTime);


  const sliderValue =
    currentDate.getTime();


  const minTime =
    sliderValue -
    24 * 60 * 60 * 1000;


  const maxTime =
    sliderValue +
    24 * 60 * 60 * 1000;


  // ====================================================
  // SCENE
  // ====================================================

  return (

    <div className="relative h-screen w-full bg-black">

      {/* =================================================
          LANDING SITE PANEL
      ================================================= */}

      <LandingSitePanel

        onLocationChange={(
          lat,
          lon
        ) => {

          setLatitude(lat);

          setLongitude(lon);

        }}

      />


      {/* =================================================
          3D CANVAS
      ================================================= */}

      <Canvas

        camera={{
          position: [
            0,
            0,
            4
          ],

          fov: 45,

          near: 0.01,

          far: 1000,
        }}

        gl={{
          antialias: true,
        }}

      >

        {/* -----------------------------------------------
            Ambient light
        ------------------------------------------------ */}

        <ambientLight
          intensity={0.15}
        />


        {/* -----------------------------------------------
            REAL JPL SUN LIGHT
        ------------------------------------------------ */}

        {sunPosition && (

          <directionalLight

            position={
              sunPosition
            }

            intensity={3}

          />

        )}


        {/* -----------------------------------------------
            MOON
        ------------------------------------------------ */}

        <Moon />


        {/* -----------------------------------------------
            LOLA TERRAIN
        ------------------------------------------------ */}

        <LolaTerrain />


        {/* -----------------------------------------------
            LANDING MARKER
        ------------------------------------------------ */}

        <LandingMarker

          latitude={latitude}

          longitude={longitude}

        />


        {/* -----------------------------------------------
            SUN
        ------------------------------------------------ */}

        {sunPosition && (

          <SunMarker

            position={
              sunPosition
            }

          />

        )}


        {/* -----------------------------------------------
            FREE 360° CAMERA
        ------------------------------------------------ */}

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
          SIMULATION CONTROL PANEL
      ================================================= */}

      <div className="
        absolute
        bottom-5
        left-1/2
        w-[min(700px,90%)]
        -translate-x-1/2
        rounded-2xl
        border
        border-white/10
        bg-black/75
        p-5
        text-white
        shadow-2xl
        backdrop-blur-xl
      ">

        {/* -----------------------------------------------
            TIME
        ------------------------------------------------ */}

        <div className="
          flex
          items-center
          justify-between
          gap-4
        ">

          <div>

            <div className="
              text-xs
              uppercase
              tracking-wider
              text-gray-400
            ">
              Simulation Time
            </div>

            <div className="
              mt-1
              text-lg
              font-semibold
            ">
              {currentDate.toUTCString()}
            </div>

          </div>


          <button

            onClick={() =>
              setSimulationTime(
                new Date()
                  .toISOString()
              )
            }

            className="
              rounded-lg
              bg-white/10
              px-3
              py-2
              text-sm
              hover:bg-white/20
            "

          >
            NOW

          </button>

        </div>


        {/* -----------------------------------------------
            TIME SLIDER
        ------------------------------------------------ */}

        <input

          type="range"

          min={minTime}

          max={maxTime}

          value={sliderValue}

          onChange={(event) => {

            const value =
              Number(
                event.target.value
              );

            setSimulationTime(
              new Date(value)
                .toISOString()
            );

          }}

          className="
            mt-5
            w-full
          "

        />


        <div className="
          mt-2
          flex
          justify-between
          text-xs
          text-gray-500
        ">

          <span>
            -24 hours
          </span>

          <span>
            +24 hours
          </span>

        </div>


        {/* -----------------------------------------------
            SOLAR INFORMATION
        ------------------------------------------------ */}

        <div className="
          mt-5
          grid
          grid-cols-3
          gap-3
        ">


          {/* Solar elevation */}

          <div className="
            rounded-xl
            bg-white/5
            p-3
          ">

            <div className="
              text-xs
              text-gray-400
            ">
              SOLAR ELEVATION
            </div>

            <div className="
              mt-1
              text-xl
              font-bold
            ">

              {solarElevation !== null
                ? `${solarElevation.toFixed(1)}°`
                : "--"}

            </div>

          </div>


          {/* Status */}

          <div className="
            rounded-xl
            bg-white/5
            p-3
          ">

            <div className="
              text-xs
              text-gray-400
            ">
              SITE CONDITION
            </div>

            <div
              className={`
                mt-1
                text-xl
                font-bold
                ${statusClass}
              `}
            >

              {sunlightStatus}

            </div>

          </div>


          {/* Coordinates */}

          <div className="
            rounded-xl
            bg-white/5
            p-3
          ">

            <div className="
              text-xs
              text-gray-400
            ">
              LANDING SITE
            </div>

            <div className="
              mt-1
              text-sm
              font-semibold
            ">

              {latitude.toFixed(2)}°

              {" "}

              {longitude.toFixed(2)}°

            </div>

          </div>

        </div>


        {/* -----------------------------------------------
            STATUS
        ------------------------------------------------ */}

        <div className="
          mt-4
          text-center
          text-xs
          text-gray-500
        ">

          {loadingSun
            ? "Updating NASA/JPL Horizons data..."
            : "NASA/JPL Horizons • Lunar solar geometry"}

        </div>

      </div>

    </div>

  );
}


// ======================================================
// PRELOAD MOON
// ======================================================

useGLTF.preload(
  "/models/moon.glb"
);