import Library from "@/components/Library";
import { papers } from "@/lib/catalog";
export const metadata = { title: "资料库" };
export default function LibraryPage() { return <><div className="page-intro"><p className="eyebrow">THE READING COLLECTION</p><h1>值得认真读的资料。</h1><p>{papers.length} 篇精选论文与技术报告，从经典方法到今年的前沿观察。按路线阅读，也按自己的问题查找。</p></div><Library /></>; }
