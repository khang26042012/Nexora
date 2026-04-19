export function ToolVideoBg() {
  return (
    <>
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          opacity: 0.18,
          pointerEvents: "none",
        }}
        src="/tools-bg.mp4"
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5,5,5,0.72)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
    </>
  );
}
