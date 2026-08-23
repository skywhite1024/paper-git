"use client";

import { useEffect, useRef } from "react";

export default function TrendChart({ data }: { data: { year: number; count: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let chart: import("echarts").EChartsType | null = null;

    (async () => {
      const echarts = await import("echarts");
      if (disposed || !ref.current) return;
      chart = echarts.init(ref.current);
      chart.setOption({
        grid: { left: 40, right: 16, top: 24, bottom: 28 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: data.map((d) => d.year),
          axisLabel: { fontSize: 11 },
        },
        yAxis: { type: "value", name: "论文数" },
        series: [
          {
            type: "bar",
            data: data.map((d) => d.count),
            itemStyle: { color: "#0969da", borderRadius: [3, 3, 0, 0] },
          },
        ],
      });
    })();

    const onResize = () => chart?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      chart?.dispose();
    };
  }, [data]);

  if (data.length === 0) {
    return <p className="p-4 text-sm text-gray-400">暂无趋势数据</p>;
  }
  return <div ref={ref} className="h-64 w-full" />;
}
