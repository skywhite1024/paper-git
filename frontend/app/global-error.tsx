"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, background: "#faf9f5", color: "#302f2b", font: "14px/1.7 system-ui, sans-serif" }}>
        <div style={{ maxWidth: 520, margin: "18vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>应用出现异常</h1>
          <p style={{ color: "#5c5952", margin: "0 0 20px" }}>
            {error?.digest ? `错误编号 ${error.digest}` : "请重试加载页面。"}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: 0,
              background: "#9e4f35",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            重新加载
          </button>
        </div>
      </body>
    </html>
  );
}
