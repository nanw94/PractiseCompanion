"use client";

import dynamic from "next/dynamic";

const RoutineEditClient = dynamic(
  () => import("./RoutineEditClient").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          minHeight: 280,
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.65 }}>Loading routine editor…</p>
      </div>
    ),
  },
);

export default function RoutineEditDynamicEntry() {
  return <RoutineEditClient />;
}
