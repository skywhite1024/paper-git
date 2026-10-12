import { Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-10">
      <EmptyState
        icon="404"
        title="未找到对应内容"
        description="该方向、路线或论文可能已被重命名、尚未收录，或链接已失效。"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button href="/" variant="primary">
              返回知识拓扑
            </Button>
            <Button href="/routes">浏览技术路线</Button>
          </div>
        }
      />
    </div>
  );
}
