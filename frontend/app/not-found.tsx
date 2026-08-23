import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-[var(--pg-border)] bg-white p-12 text-center">
      <h1 className="text-xl font-bold">404 · 没有找到对应内容</h1>
      <p className="mt-2 text-sm text-gray-500">节点或论文不存在，可能已被移动或尚未收录。</p>
      <Link href="/" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
        返回首页
      </Link>
    </div>
  );
}
