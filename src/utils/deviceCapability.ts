/**
 * Device capability detection for adaptive rendering.
 * Adjusts particle counts, shader complexity, and animation quality.
 */

export interface DeviceCapability {
  tier: "low" | "medium" | "high";
  particleCount: number;
  enablePostProcessing: boolean;
  pixelRatio: number;
}

export function detectCapability(): DeviceCapability {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

  let tier: "low" | "medium" | "high" = "medium";

  if (gl) {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const isLowEnd = /Intel|Mali-4|Adreno 3/i.test(renderer);

    if (isMobile || isLowEnd) {
      tier = "low";
    } else if (/NVIDIA|Radeon|Apple/i.test(renderer)) {
      tier = "high";
    }
  } else {
    tier = "low";
  }

  const configs = {
    low: { particleCount: 500, enablePostProcessing: false, pixelRatio: 1 },
    medium: { particleCount: 1200, enablePostProcessing: true, pixelRatio: Math.min(window.devicePixelRatio, 1.5) },
    high: { particleCount: 2000, enablePostProcessing: true, pixelRatio: Math.min(window.devicePixelRatio, 2) },
  };

  return { tier, ...configs[tier] };
}
