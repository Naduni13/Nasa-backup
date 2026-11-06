import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedTime = searchParams.get("time");

    const date = requestedTime
      ? new Date(requestedTime)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid time supplied",
        },
        { status: 400 }
      );
    }

    const startTime = date.toISOString().slice(0, 16);

    const stop = new Date(
      date.getTime() + 60 * 60 * 1000
    );

    const stopTime = stop.toISOString().slice(0, 16);

    const params = new URLSearchParams({
      format: "json",

      // Sun
      COMMAND: "10",

      OBJ_DATA: "NO",
      MAKE_EPHEM: "YES",

      // Cartesian position
      EPHEM_TYPE: "VECTORS",

      // Moon center
      CENTER: "500@301",

      START_TIME: startTime,
      STOP_TIME: stopTime,
      STEP_SIZE: "1 h",

      // ICRF frame
      REF_PLANE: "FRAME",
      REF_SYSTEM: "ICRF",

      OUT_UNITS: "KM-S",

      // Position only
      VEC_TABLE: "1",
      VEC_LABELS: "YES",
      VEC_CORR: "NONE",
    });

    // IMPORTANT:
    // Horizons API endpoint
    const url =
      `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;

    console.log("☀️ Requesting JPL Horizons:");
    console.log("Time:", startTime);
    console.log("URL:", url);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "LunarLandingSiteNavigator/1.0 NASA Space Apps Challenge",
      },
      cache: "no-store",
    });

    console.log(
      "JPL response:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "❌ JPL raw error:",
        errorText
      );

      throw new Error(
        `JPL request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        {
          success: false,
          error: data.error,
        },
        { status: 500 }
      );
    }

    if (!data.result) {
      return NextResponse.json(
        {
          success: false,
          error:
            "JPL returned no ephemeris data",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      source: "NASA/JPL Horizons",
      target: "Sun",
      center: "Moon",
      simulationTime: date.toISOString(),
      result: data.result,
    });

  } catch (error) {

    console.error(
      "❌ Ephemeris error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown ephemeris error",
      },
      { status: 500 }
    );
  }
}