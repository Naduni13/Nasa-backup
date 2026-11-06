"use client";

import { useState } from "react";

interface LandingSitePanelProps {
  onLocationChange: (latitude: number, longitude: number) => void;
}

export default function LandingSitePanel({
  onLocationChange,
}: LandingSitePanelProps) {
  const [latitude, setLatitude] = useState("-89.5");
  const [longitude, setLongitude] = useState("0");

  const handleLocate = () => {
    const lat = Number(latitude);
    const lon = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      alert("Please enter valid coordinates.");
      return;
    }

    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and 90.");
      return;
    }

    if (lon < -180 || lon > 180) {
      alert("Longitude must be between -180 and 180.");
      return;
    }

    onLocationChange(lat, lon);
  };

  return (
    <div className="absolute top-6 left-6 z-10 w-72 rounded-2xl bg-black/80 p-5 text-white shadow-xl backdrop-blur-md">
      <h2 className="mb-1 text-lg font-semibold">
        Landing Site
      </h2>

      <p className="mb-4 text-xs text-gray-400">
        Enter lunar coordinates
      </p>

      <label className="mb-1 block text-sm">
        Latitude
      </label>

      <input
        type="number"
        value={latitude}
        onChange={(e) => setLatitude(e.target.value)}
        min="-90"
        max="90"
        step="0.1"
        className="mb-3 w-full rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
      />

      <label className="mb-1 block text-sm">
        Longitude
      </label>

      <input
        type="number"
        value={longitude}
        onChange={(e) => setLongitude(e.target.value)}
        min="-180"
        max="180"
        step="0.1"
        className="mb-4 w-full rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
      />

      <button
        onClick={handleLocate}
        className="w-full rounded-lg bg-red-600 px-4 py-2 font-medium transition hover:bg-red-500"
      >
        Locate Site
      </button>
    </div>
  );
}