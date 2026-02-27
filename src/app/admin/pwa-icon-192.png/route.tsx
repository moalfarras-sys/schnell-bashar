import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  const size = 192;

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
          borderRadius: "24px",
          border: "2px solid rgba(255,255,255,0.25)",
          boxShadow: "inset 0 0 32px rgba(148,197,255,0.35)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <div style={{ fontSize: 54, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1 }}>SSU</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.02em", opacity: 0.95 }}>ADMIN</div>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}

