import numpy as np
import json
import os

# ============================================================
# FILES
# ============================================================

INPUT_FILE = "data/ldem_16_float.img"
OUTPUT_FILE = "public/lola-south-pole.json"


# ============================================================
# LOLA DATASET INFORMATION
# ============================================================

LINES = 2880
SAMPLES = 5760
PIXELS_PER_DEGREE = 16

REFERENCE_RADIUS_KM = 1737.4


# ============================================================
# LOAD NASA LOLA DATA
# ============================================================

print("🌕 Loading NASA LOLA data...")

data = np.fromfile(
    INPUT_FILE,
    dtype="<f4"
)

expected_size = LINES * SAMPLES

if data.size != expected_size:
    raise ValueError(
        f"Unexpected data size: {data.size}. "
        f"Expected: {expected_size}"
    )

data = data.reshape((LINES, SAMPLES))

print(f"✅ Loaded: {data.shape}")


# ============================================================
# EXTRACT LUNAR SOUTH POLE
# ============================================================

# LOLA latitude arrangement:
#
# +90° = row 0
#   0° = row 1440
# -90° = row 2880
#
# We want the region:
#
# -80° → -90°
#
# Therefore:
#
# -80° = row 2720
# -90° = row 2880

LAT_TOP = -80
LAT_BOTTOM = -90

row_start = int(
    (90 - LAT_TOP) * PIXELS_PER_DEGREE
)

row_end = int(
    (90 - LAT_BOTTOM) * PIXELS_PER_DEGREE
)

print(
    f"📍 Extracting latitude "
    f"{LAT_TOP}° to {LAT_BOTTOM}°"
)

print(
    f"📐 Rows: "
    f"{row_start} → {row_end}"
)


south_pole = data[row_start:row_end, :]

print(
    f"📍 South pole extracted: "
    f"{south_pole.shape}"
)


# ============================================================
# CHECK EXTRACTION
# ============================================================

if south_pole.size == 0:
    raise ValueError(
        "South Pole extraction returned no data. "
        "Check the latitude indexing."
    )


# ============================================================
# CLEAN INVALID VALUES
# ============================================================

south_pole = np.nan_to_num(
    south_pole,
    nan=0.0,
    posinf=0.0,
    neginf=0.0
)


# ============================================================
# ELEVATION INFORMATION
# ============================================================

min_elevation = float(
    south_pole.min()
)

max_elevation = float(
    south_pole.max()
)

print(
    f"⛰️ Elevation range: "
    f"{min_elevation:.3f} → "
    f"{max_elevation:.3f} km"
)


# ============================================================
# DOWNSAMPLE TERRAIN
# ============================================================

# The original South Pole section is:
#
# 160 rows × 5760 columns
#
# That's too much data to send directly
# to the browser.
#
# We reduce it to:
#
# 256 × 256

TARGET_WIDTH = 256
TARGET_HEIGHT = 256


row_indices = np.linspace(
    0,
    south_pole.shape[0] - 1,
    TARGET_HEIGHT
).astype(int)


col_indices = np.linspace(
    0,
    south_pole.shape[1] - 1,
    TARGET_WIDTH
).astype(int)


terrain = south_pole[
    np.ix_(
        row_indices,
        col_indices
    )
]


print(
    f"📐 Downsampled terrain: "
    f"{terrain.shape}"
)


# ============================================================
# FINAL TERRAIN RANGE
# ============================================================

terrain_min = float(
    terrain.min()
)

terrain_max = float(
    terrain.max()
)

print(
    f"⛰️ Final terrain range: "
    f"{terrain_min:.3f} → "
    f"{terrain_max:.3f} km"
)


# ============================================================
# CREATE JSON DATA
# ============================================================

output = {

    # Grid size
    "width": TARGET_WIDTH,
    "height": TARGET_HEIGHT,

    # Elevation information
    "minElevation": terrain_min,
    "maxElevation": terrain_max,

    # Moon reference radius
    "referenceRadiusKm": REFERENCE_RADIUS_KM,

    # Geographic coverage
    "latitudeMin": -90,
    "latitudeMax": -80,

    # LOLA uses 0° → 360° East longitude
    "longitudeMin": 0,
    "longitudeMax": 360,

    # Elevation values
    "elevations": terrain.flatten().tolist()
}


# ============================================================
# CREATE OUTPUT DIRECTORY
# ============================================================

os.makedirs(
    "public",
    exist_ok=True
)


# ============================================================
# SAVE JSON
# ============================================================

with open(
    OUTPUT_FILE,
    "w"
) as f:

    json.dump(
        output,
        f
    )


# ============================================================
# COMPLETE
# ============================================================

print()
print("======================================")
print("✅ LOLA PROCESSING COMPLETE")
print("======================================")

print(
    f"📁 Output: {OUTPUT_FILE}"
)

print(
    f"📐 Terrain grid: "
    f"{TARGET_WIDTH} × {TARGET_HEIGHT}"
)

print(
    f"🌍 Latitude: "
    f"{LAT_TOP}° → {LAT_BOTTOM}°"
)

print(
    f"🌐 Longitude: "
    f"0° → 360°"
)

print(
    f"⛰️ Elevation: "
    f"{terrain_min:.3f} → "
    f"{terrain_max:.3f} km"
)

print()
print("🚀 Ready for Three.js terrain generation!")