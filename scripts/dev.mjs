// One terminal owns the local app. Only processes started here are stopped.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const windows = process.platform === "win32";
const args = process.argv.slice(2);
const url = "http://localhost:3000";
const children = [];
let stopping = false;

if (args.includes("--help")) {
  console.log("PaperGit: npm run dev [-- --no-open]\n启动本地资料库，服务就绪后打开浏览器；Ctrl+C 停止本次启动的服务。\n只依赖 Node.js，不需要 Python、数据库或 API Key。");
  process.exit(0);
}
if (args.some((arg) => arg !== "--no-open")) {
  console.error("未知参数。使用 npm run dev -- --help 查看用法。");
  process.exit(1);
}

async function stop(code) {
  if (stopping) return;
  stopping = true;
  console.log("\n[PaperGit] 正在停止本次启动的服务…");
  await Promise.all(children.map((child) => new Promise((resolve) => {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) return resolve();
    if (windows) {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      killer.once("error", resolve);
      killer.once("exit", resolve);
    } else {
      try { process.kill(-child.pid, "SIGTERM"); } catch { /* Already exited. */ }
      child.once("exit", resolve);
      setTimeout(resolve, 3000).unref();
    }
  })));
  process.exit(code);
}

process.on("SIGINT", () => void stop(0));
process.on("SIGTERM", () => void stop(0));

function requireFreePort(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`端口 ${port} 已占用，请先停止占用该端口的服务后重试。`)));
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}

function start(name, executable, argv, cwd, env = {}) {
  console.log(`[PaperGit] 启动 ${name}`);
  const child = spawn(executable, argv, {
    cwd, env: { ...process.env, ...env }, stdio: "inherit",
    windowsHide: true, detached: !windows,
  });
  children.push(child);
  child.once("error", (error) => {
    console.error(`[PaperGit] ${name}: ${error.message}`);
    void stop(1);
  });
  child.once("exit", (code) => {
    if (stopping) return;
    console.error(`[PaperGit] ${name} 已退出 (${code ?? "signal"})。`);
    void stop(code || 1);
  });
}

async function waitFor(target, label, validate = () => true) {
  const deadline = Date.now() + 120000;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(4000) });
      if (response.ok && await validate(response)) return;
    } catch { /* The first Next.js compilation can take a while. */ }
    await delay(500);
  }
  throw new Error(`${label} 在 120 秒内未就绪，请查看上方日志。`);
}

function openBrowser() {
  const command = windows ? "rundll32" : process.platform === "darwin" ? "open" : "xdg-open";
  const argv = windows ? ["url.dll,FileProtocolHandler", url] : [url];
  const opener = spawn(command, argv, { windowsHide: true, stdio: "ignore" });
  opener.once("error", () => console.log(`[PaperGit] 请在浏览器中打开 ${url}`));
  opener.unref();
}

try {
  const next = join(root, "frontend/node_modules/next/dist/bin/next");
  if (!existsSync(next)) throw new Error('缺少前端依赖。请先执行 npm --prefix "frontend" install。');
  await requireFreePort(3000);
  start("本地资料库 · :3000", process.execPath, [next, "dev", "--hostname", "127.0.0.1", "--port", "3000"], join(root, "frontend"), { NEXT_TELEMETRY_DISABLED: "1" });
  await waitFor(url, "Web");
  console.log(`\n[PaperGit] 预览已就绪：${url}\n[PaperGit] 精选内容来自本地目录；阅读笔记保存在当前浏览器。\n[PaperGit] 按 Ctrl+C 停止。\n`);
  if (!args.includes("--no-open")) openBrowser();
} catch (error) {
  console.error(`[PaperGit] ${error.message}`);
  await stop(1);
}
