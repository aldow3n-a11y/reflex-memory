import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || join(process.env.HOME || "/home/manager", ".openclaw/workspace");
const QUEUE_FILE = join(WORKSPACE, "PROJECTS/cortex-v2/synthesis_queue.json");
const MEMORY_FILE = join(WORKSPACE, "MEMORY.md");

const SALIENCY_PATTERNS = [
  /remember this[:]/i,
  /core truth[:]/i,
  /lesson learned[:]/i,
  /critical decision[:]/i,
  /correction[:]/i,
  /update memory[:]/i,
  /important to note that/i,
];

function loadQueue() {
  try {
    if (!existsSync(QUEUE_FILE)) return [];
    return JSON.parse(readFileSync(QUEUE_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function observe(content, source = "session") {
  const queue = loadQueue();
  let captured = 0;

  for (const pattern of SALIENCY_PATTERNS) {
    const matches = content.matchAll(new RegExp(pattern.source, pattern.flags));
    for (const match of matches) {
      const start = match.index;
      const end = content.indexOf("\n", start);
      const insight = (end === -1 ? content.slice(start) : content.slice(start, end)).trim();

      queue.push({
        timestamp: new Date().toISOString(),
        source,
        pattern: pattern.source,
        content: insight,
      });
      captured++;
    }
  }

  if (captured > 0) {
    saveQueue(queue);
    console.log(`[cortex-synthesis] Captured ${captured} insights to queue`);
  }

  return captured;
}

function distill() {
  const queue = loadQueue();
  if (queue.length === 0) {
    console.log("[cortex-synthesis] Queue empty, nothing to distill");
    return 0;
  }

  let memory = "";
  try {
    if (existsSync(MEMORY_FILE)) {
      memory = readFileSync(MEMORY_FILE, "utf-8");
    }
  } catch {
    // empty
  }

  let processed = 0;
  const entries = [];

  for (const item of queue) {
    const content = item.content
      .replace(/remember this:/i, "")
      .replace(/core truth:/i, "")
      .replace(/lesson learned:/i, "")
      .replace(/critical decision:/i, "")
      .replace(/correction:/i, "")
      .replace(/update memory:/i, "")
      .trim();

    if (!content) continue;
    // Dedup: skip if already in MEMORY.md
    if (memory.includes(content)) continue;

    const timestamp = new Date().toISOString().slice(0, 16);
    entries.push(`\n§ [Distilled ${timestamp}] ${content}`);
    processed++;
  }

  if (entries.length > 0) {
    writeFileSync(MEMORY_FILE, memory + entries.join(""));
  }

  // Clear queue
  saveQueue([]);
  console.log(`[cortex-synthesis] Distilled ${processed} items to MEMORY.md`);
  return processed;
}

const handler = async (event) => {
  // Observe on message:sent
  if (event.type === "message:sent" && event.context?.content) {
    observe(event.context.content, "message:sent");
  }

  // Distill on command:new (session end)
  if (event.type === "command:new" || event.type === "command:reset") {
    distill();
  }

  // Flush orphaned queue on gateway startup (after crash/interrupt)
  if (event.type === "gateway:startup") {
    const queue = loadQueue();
    if (queue.length > 0) {
      console.log(`[cortex-synthesis] Gateway startup: flushing ${queue.length} orphaned items`);
      distill();
    }
  }
};

export default handler;