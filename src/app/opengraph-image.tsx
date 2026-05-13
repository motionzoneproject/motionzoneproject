import { ImageResponse } from "next/og";

// Brand palette pulled from src/app/globals.css so the OG image stays in sync
// with the site identity. Update both places when the palette changes.
const BRAND = "#9a59d7";
const BRAND_LIGHT = "#b981ee";
const BRAND_SECONDARY = "#4cadb2";

export const runtime = "edge";
export const alt = "Motion Zone Växjö — Dans i Växjö";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "96px",
        background: `linear-gradient(135deg, #0c0613 0%, #1a0d2e 55%, ${BRAND} 100%)`,
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 32,
          letterSpacing: 6,
          fontSize: 22,
          textTransform: "uppercase",
          color: BRAND_SECONDARY,
        }}
      >
        <span
          style={{
            width: 56,
            height: 2,
            background: BRAND_SECONDARY,
            display: "inline-block",
          }}
        />
        Motion Zone Växjö
      </div>
      <div
        style={{
          fontSize: 96,
          fontWeight: 300,
          lineHeight: 1.05,
          letterSpacing: -2,
          maxWidth: 980,
        }}
      >
        Motion Zone Växjö —{" "}
        <span style={{ fontStyle: "italic", color: BRAND_LIGHT }}>
          Dans i Växjö
        </span>
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 28,
          fontWeight: 400,
          color: "#d7c7ee",
        }}
      >
        Kurser, klippkort och medlemskap för alla nivåer.
      </div>
    </div>,
    size,
  );
}
