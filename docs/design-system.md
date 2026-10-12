# PaperGit 前端设计系统

面向贡献者的改造约束。目标：全站统一的视觉语言与可达性基线。

## 1. 主题令牌

`app/globals.css` 用 Tailwind v4 的 `@theme inline` 把 CSS 变量注册为工具类，
深浅色由 `<html data-theme="light|dark">` 切换（`components/SiteHeader.tsx` 的 ThemeToggle 负责写入
`localStorage['pg-theme']`，`app/layout.tsx` 的内联脚本在首屏前应用，避免闪烁）。

**禁止再写死颜色**（`bg-white` / `text-gray-700` / `border-[var(--pg-border)]` / `#0d1117`）。一律使用令牌类：

| 令牌类 | 用途 |
| --- | --- |
| `bg-bg` | 页面底色 |
| `bg-surface` | 卡片、面板 |
| `bg-raised` | 悬浮/内嵌分区、hover 底 |
| `border-line` `border-line-soft` | 描边 |
| `text-fg` `text-muted` `text-subtle` | 三级文字 |
| `text-accent` `bg-accent` `bg-accent-soft` `text-accent-fg` | 主强调色（品牌靛蓝） |
| `text-warn` `text-ok` `text-danger` | 语义色 |
| `rounded-card` `shadow-card` `shadow-pop` | 圆角与层级阴影 |

ECharts / Three.js 等 canvas 内无法用 Tailwind 类，需从
`getComputedStyle(document.documentElement).getPropertyValue('--c-fg')` 一类方式取色，
并在 `data-theme` 变化时重绘。

## 2. 原语

`components/ui.tsx`（服务端安全，无 `"use client"`）导出：
`cx` `Card` `SectionTitle` `Eyebrow` `Button` `Badge` `Dot` `Skeleton` `EmptyState`
`Stat` `Tabs` `Breadcrumbs` `inputCls` `selectCls`。

- `Button` 传 `href` 渲染 `next/link`，外链自动加 `rel="noopener noreferrer"`。
- `Tabs` 是链接式（状态进 URL，可分享/后退），不是本地 state。
- 表单控件复用 `inputCls` / `selectCls`，不要各写一套 focus 样式。

## 3. 文案

全站面向用户的中文文案集中在 `lib/lexicon.ts` 的 `L`。新增文案请追加键，不要在组件里造词。
约定：学术中性、中文为主英文辅注、不用表情符号、不写「点击这里」式空话。

## 4. 布局与可达性

- **文字对比度必须满足 WCAG AA**：正文与小号标签 ≥ 4.5:1，≥24px 或 ≥18.66px 粗体 ≥ 3:1。
  `text-subtle` 是三级文字里最容易失守的一档，改色前先算对比度。
  `visual-qa.mjs` 已内置探针，会在任何页面文字不达标时报告元素选择器与实测比值；
  装饰性分隔符（`aria-hidden` 或不含字母数字）不计入。
- 外壳 `app/layout.tsx`：`max-w-[1400px]`，含跳转链接、`<main id="main">`、页脚。页面不要再自设外层容器宽度。
- 断点：`md`(768) 折叠导航为抽屉，`sm`(640) 收窄信息密度。任何页面在 390px 下不得横向溢出。
- 交互元素需 `:focus-visible`（全局已给描边）；图标按钮必须有 `aria-label`；
  图形容器用 `role="img"` + `aria-label` 或提供等价的列表视图。
- 数据图需有文字/表格替代路径，不能只靠颜色区分（路线色同时给出图例文字）。

## 5. 状态

- `app/loading.tsx` 提供骨架；页面级异步用 `Suspense` 分区，避免整页白屏。
- `app/error.tsx` 区分「后端不可达」与一般异常；`app/not-found.tsx` 给出下一步入口。
- 空态统一用 `EmptyState`，必须带一个可执行的下一步。

## 6. 验证

```bash
cd frontend && npx tsc --noEmit          # 类型
bash .qa/shoot.sh <prefix> 1440,900      # 桌面截图 -> .qa/shots/
bash .qa/shoot.sh <prefix> 390,844       # 移动端截图
```

需前后端已在 `localhost:3000` / `localhost:8000` 运行。截图目录已 gitignore。
