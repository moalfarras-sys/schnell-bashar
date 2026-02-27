import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  const size = 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 25% 20%, rgba(59,130,246,0.9), rgba(10,20,45,1) 58%), linear-gradient(140deg, #1d4ed8 0%, #0b1f44 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          borderRadius: "64px",
          border: "6px solid rgba(255,255,255,0.25)",
          boxShadow: "inset 0 0 84px rgba(148,197,255,0.35)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: 140, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1 }}>SSU</div>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "0.04em", opacity: 0.95 }}>ADMIN</div>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}

