"use client";

import { useEffect } from "react";
import { Button, EmptyState } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PaperGit] page error:", error);
  }, [error]);

  const offline = /failed to fetch|networkerror|load failed|econnrefused|status/i.test(error.message ?? "");

  return (
    <EmptyState
      icon="!"
      titleLevel={1}
      title={offline ? "无法连接数据服务" : "页面加载失败"}
      description={
        offline
          ? "后端 API 未响应。请确认 FastAPI 服务已在 8000 端口启动，然后重试。"
          : "内容暂时无法呈现，可重试加载或返回首页。"
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            重试
          </Button>
          <Button href="/">返回首页</Button>
        </div>
      }
    />
  );
}
