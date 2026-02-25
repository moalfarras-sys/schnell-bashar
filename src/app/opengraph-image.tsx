import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Schnell Sicher Umzug — Premium Umzug & Entsorgung";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          position: "relative",
        }}
      >
        {/* Orb 1 */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "10%",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)",
            borderRadius: "50%",
          }}
        />
        {/* Orb 2 */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            right: "10%",
            width: "350px",
            height: "350px",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.12), transparent 70%)",
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "60px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "white",
              letterSpacing: "-0.03em",
              marginBottom: "20px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            SCHNELL. SICHER.
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-0.03em",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            UMZUG.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#cbd5e1",
              marginTop: "30px",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
            }}
          >
            Premium Umzug & Entsorgung deutschlandweit
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

