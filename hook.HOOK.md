---
name: cortex-synthesis
description: "Auto-capture high-saliency insights from conversations and distill them into MEMORY.md on session end"
metadata:
  { "openclaw": { "emoji": "🧠", "events": ["message:sent", "command:new", "gateway:startup"], "requires": { "bins": ["node"] } } }
---

# Cortex Synthesis Hook

Event-driven replacement for the old cortex_observer + cortex_distiller Python scripts.

**On `message:sent`**: Scans assistant output for saliency patterns (e.g. "remember this", "core truth", "lesson learned", "critical decision"). Stages matches to `PROJECTS/cortex-v2/synthesis_queue.json`.

**On `command:new` / `command:reset`**: Runs the distiller — processes queued insights, appends deduplicated entries to MEMORY.md, clears the queue.

**On `gateway:startup`**: Flushes any orphaned queue items from crashed/interrupted sessions. Ensures nothing is lost after a restart.

This makes the Observer → Queue → Distiller loop fully automatic, triggered by real events instead of manual scripts or cron.