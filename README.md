# OpenClaw Reflex Memory

> A structured memory system for OpenClaw AI agents. Capture, recall, distill, and maintain knowledge — automatically.

**⚠️ Requires OpenClaw with native memory indexing.** Reflex Memory depends on OpenClaw's built-in FTS5 `memory_search` tool, event-driven hooks, and the `memorySearch.extraPaths` configuration. It does **not** work as a standalone system or with other agent frameworks. If your OpenClaw instance doesn't have `memory_search` and the hooks system, Reflex Memory won't function.

## Prerequisites

- **OpenClaw** with native FTS5 memory indexing (`memory_search` tool)
- **OpenClaw hooks** system (for event-driven capture and distill)
- **`memorySearch.extraPaths`** configured in `openclaw.json` to include your vault path
- Verify with: `openclaw memory status` — should show indexed files and chunk count

## What It Is

Reflex Memory gives an OpenClaw agent a persistent, searchable, self-maintaining memory system. Instead of starting every session from scratch, the agent wakes up with curated long-term memory, a full-text search index over all past context, and an automatic pipeline that captures insights from conversations without manual intervention.

**The problem it solves:** AI agents forget everything between sessions. Raw session logs pile up but never become wisdom. Insights die in compressed context. Credentials get lost. Knowledge rots.

**The approach:** Not another vector database or embedding pipeline. Reflex Memory uses the tools OpenClaw already provides — FTS5 full-text search, event-driven hooks, and a structured Obsidian vault — wired together into a lifecycle that moves information from *raw capture* to *distilled wisdom* automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFLEX MEMORY                         │
│                                                          │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────┐  │
│  │ CAPTURE  │───→│  DISTILL  │───→│    RECALL        │  │
│  │          │    │           │    │                  │  │
│  │ Daily    │    │ Saliency  │    │ memory_search    │  │
│  │ logs     │    │ filter    │    │ (FTS5, 12k+      │  │
│  │ Calendar │    │ Queue     │    │  chunks)         │  │
│  │ notes    │    │ MEMORY.md │    │                  │  │
│  └──────────┘    └───────────┘    └──────────────────┘  │
│        │                                      │         │
│        │         ┌───────────┐                 │         │
│        └────────→│ MAINTAIN  │←────────────────┘         │
│                  │           │                           │
│                  │ MOC audit │                           │
│                  │ Prune     │                           │
│                  │ Archive   │                           │
│                  └───────────┘                           │
└─────────────────────────────────────────────────────────┘
```

### Architecture Principle: Map vs. Territory

MEMORY.md is the **map** — protocol, rules, and pointers to where knowledge lives. It does **not** store detailed facts.

The **territory** is the vault and daily logs:
- Detailed facts → `vault/Atlas/Notes/` (atomic notes with YAML frontmatter)
- Daily events → `memory/YYYY-MM-DD.md` and `vault/Calendar/YYYY-MM-DD.md`
- Credentials → `vault/Atlas/Notes/Credentials-Index.md` (references only, not secrets)
- Infrastructure → `vault/Atlas/Notes/Environment.md`

When you need a fact, `memory_search` finds it in the territory. MEMORY.md just tells you where to look.

| Stage | Frequency | What Happens | Where |
|-------|-----------|-------------|-------|
| **Capture** | Daily | Events → daily log → Calendar note | `memory/YYYY-MM-DD.md` → `vault/Calendar/` |
| **Distill** | Auto (event) | Saliency patterns → queue → daily log + Calendar note | `hooks/cortex-synthesis/` |
| **Recall** | Every turn | FTS5 search across all sources | `memory_search` tool |
| **Extract** | Weekly | Insights → atomic notes → MOC links | `vault/Atlas/Notes/` |
| **Maintain** | Monthly | Audit links, prune noise, archive stale | `vault/_memory_backup/` |

---

## Components

### 1. Memory Protocol (MEMORY.md)

The first thing every session reads. A `§`-delimited file containing:

- **Memory Protocol** — 6-step instructions for how to use the system
- **Rule** — no assumptions, no hallucination
- **Memory Map** — pointers to where detailed knowledge lives (vault notes, daily logs, credentials)
- **User profile** — name, style, platform
- **Hook status** — which hooks are active

MEMORY.md is the **map, not the territory**. Detailed facts live in `vault/Atlas/Notes/` as atomic notes. `memory_search` finds them on demand.

See `MEMORY.example.md` for a real example.

### 2. Cortex Synthesis Hook

Event-driven hook that replaces manual cron jobs and standalone Python scripts.

**Events:**
- `message:sent` → scans assistant output for saliency patterns, stages to queue
- `command:new` / `command:reset` → distills queued insights to daily log and Calendar note
- `gateway:startup` → flushes orphaned queue items from crashed sessions

**Saliency patterns captured:**
- "remember this:"
- "core truth:"
- "lesson learned:"
- "critical decision:"
- "correction:"
- "update memory:"

**Where distill writes:**
- `memory/YYYY-MM-DD.md` — daily log (always)
- `vault/Calendar/YYYY-MM-DD.md` — Calendar note (if exists)
- **NOT** MEMORY.md — that file is the map (protocol + pointers), not the territory

**Files:** `hook.HOOK.md` (metadata), `hook.handler.ts` (implementation)

**Install:**
```bash
mkdir -p ~/.openclaw/workspace/hooks/cortex-synthesis
cp hook.HOOK.md ~/.openclaw/workspace/hooks/cortex-synthesis/HOOK.md
cp hook.handler.ts ~/.openclaw/workspace/hooks/cortex-synthesis/handler.ts
openclaw hooks enable cortex-synthesis
```

### 3. Daily Logs

Raw session records in `memory/YYYY-MM-DD.md`. The hippocampus — encodes experiences, not wisdom.

Multiple files per day are fine (e.g., `2026-04-14-agent-continuity.md`, `2026-04-14-memory-stack.md`). The FTS5 index catches them all.

### 4. Calendar Sync

Daily digest written to `vault/Calendar/YYYY-MM-DD.md` using the Daily Note Template. Gives Obsidian users a chronological entry point.

See `template-daily-note.md`.

### 5. Obsidian Vault (LYT/ACE Structure)

The knowledge base, organized for both human browsing and agent search:

```
vault/
├── Atlas/
│   ├── Maps/          # MOCs (Maps of Content) — navigation layer
│   │   ├── AI MOC.md
│   │   ├── Business MOC.md
│   │   ├── Creative MOC.md
│   │   ├── DevOps MOC.md
│   │   ├── PKM MOC.md
│   │   ├── Research MOC.md
│   │   ├── Robot MOC.md
│   │   └── Trading MOC.md
│   └── Notes/         # Atomic notes — knowledge units
│       ├── Memory-Architecture.md
│       ├── Event-Driven-Over-Cron.md
│       ├── Credentials-Index.md
│       └── ...
├── Calendar/          # Daily notes (auto-populated)
├── Efforts/           # Session snapshots, projects
├── _memory_backup/    # Archived/pruned content (includes CORTEX archive)
│   └── cortex-archive/  # Original 03-CORTEX (pre-merge)
└── Templates/         # Note templates
```

**Note templates:** `template-atomic-note.md`, `template-moc.md`, `template-daily-note.md`

### 6. FTS5 Search Index

OpenClaw's built-in `memory_search` tool queries `~/.openclaw/memory/main.sqlite`:

- Auto-indexes `MEMORY.md`, `memory/*.md`, and any `extraPaths`
- FTS5 full-text search (no embedding provider needed)
- Returns results with source path, line numbers, and citations
- File watcher auto-updates on changes

**Configuration** (`~/.openclaw/openclaw.json`):
```json
{
  "memorySearch": {
    "extraPaths": ["/path/to/your/vault"]
  }
}
```

### 7. Heartbeat Checklist

Periodic health checks during heartbeat polls:

```markdown
- [ ] Memory Integrity Check: Verify MEMORY.md and USER.md exist
- [ ] Log Rotation: Ensure today's log is active
- [ ] SOT Sync: Check if critical knowledge needs distilling
- [ ] Orphan Rescue: Scan for orphaned session logs
```

See `HEARTBEAT.md`.

---

## Data Flow

### Normal Session

```
1. Session starts → MEMORY.md loaded (protocol + map, not detailed facts)
2. User asks question → agent runs memory_search (FTS5 recall)
   memory_search finds relevant vault notes, daily logs, CORTEX entries
3. Agent responds with context → hook scans output for saliency
4. Match found → staged to synthesis_queue.json
5. Session ends (/new) → distiller writes queued items to daily log + Calendar
6. Agent writes daily log → memory/YYYY-MM-DD.md
7. Agent writes Calendar note → vault/Calendar/YYYY-MM-DD.md
   (Weekly: agent extracts insights → vault/Atlas/Notes/)
   (Monthly: agent audits MOCs, prunes CORTEX, archives stale)
```

### Crashed Session

```
1. Session crashes mid-conversation
2. Queue has orphaned items (captured but not distilled)
3. Gateway restarts → gateway:startup event fires
4. Hook detects items in queue → distills to daily log + Calendar
5. No lost insights
```

### Weekly Extraction

```
1. Agent scans week's daily logs
2. Identifies insights, decisions, corrections
3. Creates atomic notes in vault/Atlas/Notes/ with YAML frontmatter
4. Links new notes to relevant MOCs
5. FTS5 auto-indexes new vault files via file watcher
```

### Monthly Maintenance

```
1. Audit MOC wikilinks → find broken references
2. Create stubs for missing conceptual notes
3. Remove date-stamped session references from MOCs
4. Archive stale unreferenced notes → _memory_backup/
5. Consolidate duplicate entries
```

### MOC Expansion Rules

MOCs are the navigation layer. They should cover meaningful notes, not generic stubs.

**When to add a new MOC:**
- A topic cluster has 10+ notes that don't fit any existing MOC
- The cluster is distinct enough to warrant its own map

**When to expand an existing MOC:**
- New notes are extracted that belong to an existing topic
- After a weekly extraction cycle, link new atomic notes to relevant MOCs

**What NOT to link:**
- Generic stubs ("Overview", "Summary", "Key-Takeaways", "Conclusion") — these surface via `memory_search` when needed
- Notes with <150 bytes of body text — too thin to be navigation-worthy
- Auto-extracted content with no YAML frontmatter — likely noise

**Naming convention:**
- MOC files: `Topic MOC.md` (e.g., `AI MOC.md`, `DevOps MOC.md`)
- Use `[[Note-Name]]` wikilinks (dashes, not spaces, matching filenames)
- Cross-reference related MOCs in a `## Related MOCs` section
- Target ~30-50% coverage of meaningful notes (FTS5 handles the rest)

**MOC audit checklist:**
1. Broken wikilinks → find correct note name or remove
2. Missing notes that should be linked → add
3. Cross-MOC references → ensure Related MOCs section lists them
4. Coverage ratio → if <25%, consider expanding; if >60%, consider splitting

---

## Credentials Management

Reflex Memory keeps credentials **searchable but not exposed**:

- `vault/Atlas/Notes/Credentials-Index.md` — references to *where* secrets live (file paths, env vars)
- Actual secrets stay in their original files with 600 permissions
- FTS5 can find the index note but not the secret values themselves
- MEMORY.md may contain operational credentials at operator's discretion

---

## LLM-Enhanced Pipeline

Every stage that needs knowledge distillation can use an LLM call. The current hook uses regex for saliency detection as a lightweight first pass, but the full pipeline is designed for LLM augmentation:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   OBSERVE    │────→│   DISTILL   │────→│   REFLECT   │
│              │     │              │     │              │
│ regex trigger│     │ LLM call    │     │ LLM call    │
│ + LLM score  │     │ summarize   │     │ condense     │
│              │     │ structure   │     │ merge dupes  │
│              │     │ deduplicate  │     │ prune stale  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
  queue.json          daily log +        vault/Atlas/Notes/
  (capture)          Calendar note        + MEMORY.md
```

### Stage 1: Observe (regex + optional LLM)

Current: regex patterns detect "remember this", "core truth", "lesson learned", etc.

Enhanced: regex triggers first pass, then LLM scores saliency (0-1). Items above threshold enter the queue. This catches implicit insights that don't match any pattern.

```
Input: assistant message
→  regex scan for known patterns
→  [optional] LLM: "Rate 0-1 how memorable this insight is"
→  items above threshold → queue.json
```

### Stage 2: Distill (LLM call)

Current: strip pattern prefix, dedup, append to daily log + Calendar note.

Enhanced: LLM receives queued items + recent daily logs, produces a structured entry. Deduplication happens at the LLM level — it can merge related items and write directly to atomic notes in `vault/Atlas/Notes/`.

```
Input: queue.json items + recent daily logs
→  LLM: "Distill these insights. For each:
         - If it's a principle/decision → write atomic note to vault/Atlas/Notes/
         - If it's a daily event → append to daily log
         - Merge related items. Use YAML frontmatter.
         Output the writes you want to make."
→  write to vault/Atlas/Notes/ and/or daily log
→  clear queue
```

### Stage 3: Extract (LLM call, weekly)

Current: manual during heartbeat.

Enhanced: LLM scans week's daily logs, identifies insights/decisions/corrections, creates atomic notes with YAML frontmatter in `vault/Atlas/Notes/`, and suggests MOC links.

```
Input: week's daily logs + existing MOCs
→  LLM: "Extract novel insights not yet in Atlas/Notes.
         For each: create atomic note with tier/type/tags.
         Suggest which MOCs should link to each note."
→  write notes to vault/Atlas/Notes/
→  update relevant MOCs
```

### Stage 4: Reflect (LLM call, monthly or when MEMORY.md exceeds threshold)

Current: not implemented.

Enhanced: LLM reviews MEMORY.md, identifies stale/overlapping entries, produces a compacted version. Like Mastra's Reflector — condenses observations into denser form.

```
Input: full MEMORY.md
→  LLM: "Review these entries. Identify:
         - Duplicates that should be merged
         - Stale entries no longer relevant
         - Entries that should be promoted to vault notes
         Produce a compacted MEMORY.md."
→  replace MEMORY.md with compacted version
→  archived entries → vault/_memory_backup/
```

### Stage 5: Maintain (LLM call, monthly)

Current: manual MOC audit.

Enhanced: LLM audits MOC wikilinks, creates stubs for missing notes, suggests new connections between existing notes.

```
Input: all MOCs + vault/Atlas/Notes/ file list
→  LLM: "For each MOC:
         - Identify broken wikilinks
         - Suggest new links to existing notes
         - Identify concepts that need stub notes"
→  create stubs for missing concepts
→  update MOCs with new links
```

### Cost Model

| Stage | Frequency | LLM Cost | Fallback |
|-------|-----------|-----------|----------|
| Observe | Every message | ~50 tokens (scoring) | Regex only |
| Distill | Per session end | ~200-500 tokens | Raw append |
| Extract | Weekly | ~2000-5000 tokens | Manual |
| Reflect | Monthly | ~1000-3000 tokens | Manual |
| Maintain | Monthly | ~1000-2000 tokens | Manual |

Total monthly cost: ~10-20k tokens for a typical usage pattern. Negligible compared to conversation tokens.

---

## Comparison to Alternatives

| Feature | Reflex Memory | Mastra OM | Vector DB |
|---------|--------------|-----------|-----------|
| Search engine | FTS5 (built-in) | FTS5 + optional vectors | Embeddings |
| Auto-capture | Event hook + regex | Background LLM observer | Manual |
| Auto-distill | Queue → MEMORY.md | LLM observer/reflector | Manual |
| Crash recovery | gateway:startup flush | Lazy re-observation | Varies |
| Vault integration | Native (extraPaths) | None | Separate |
| Knowledge lifecycle | 5 stages + LLM roadmap | Compress/reflect only | Store + retrieve |
| LLM enhancement | Optional per-stage | Required (every step) | Required (embeddings) |
| External deps | None | LLM API + DB | Embedding API + DB |
| Token cost | 0 (regex) / ~20k/mo (LLM) | ~100k+/mo (continuous) | ~50k+/mo (embeddings) |
| Setup | 1 hook + config | npm package + DB + model | API key + DB |
| Human-readable | All Markdown | LLM summaries | Vectors |

---

## Quick Start

### 1. Configure memory search

**Verify native indexing is available:**
```bash
openclaw memory status
# Should show: indexed files, chunk count, FTS5 backend
# If this command fails or shows no index, Reflex Memory won't work
```

**Add your vault to the index:**
```json
// ~/.openclaw/openclaw.json
{
  "memorySearch": {
    "extraPaths": ["/path/to/your/vault"]
  }
}
```

**Restart and verify:**
```bash
openclaw gateway
# In a session, test: memory_search for any query
```

### 2. Install the hook

```bash
mkdir -p ~/.openclaw/workspace/hooks/cortex-synthesis
cp hook.HOOK.md ~/.openclaw/workspace/hooks/cortex-synthesis/HOOK.md
cp hook.handler.ts ~/.openclaw/workspace/hooks/cortex-synthesis/handler.ts
openclaw hooks enable cortex-synthesis
```

### 3. Set up vault structure

```bash
mkdir -p vault/{Atlas/{Maps,Notes},Calendar,Efforts,Templates,_memory_backup}
```

Copy templates from this repo into `vault/Templates/`.

### 4. Add the protocol to MEMORY.md

Paste the Memory Protocol (first 6 lines of `MEMORY.example.md`) at the top of your MEMORY.md.

### 5. Create your first MOC

Use `template-moc.md` to create a Map of Content in `vault/Atlas/Maps/`. See MOC Expansion Rules below for guidance on when to add new MOCs and how to link notes.

### 6. Verify

```bash
# Check hook is active
openclaw hooks list | grep cortex

# Verify memory indexing works
openclaw memory status

# Test search (in a session, use the memory_search tool with any query)
# If memory_search returns results, Reflex Memory is fully operational
```

---

## File Inventory

| File | Purpose |
|------|---------|
| `hook.HOOK.md` | Hook metadata (events, description) |
| `hook.handler.ts` | Hook implementation (observe + distill) |
| `HEARTBEAT.md` | Periodic health check checklist |
| `MEMORY.example.md` | Example MEMORY.md with protocol |
| `template-atomic-note.md` | Obsidian atomic note template |
| `template-daily-note.md` | Obsidian daily note template |
| `template-moc.md` | Obsidian MOC template |
| `README.md` | This file |

---

## Design Principles

1. **Files over databases** — If it's not on disk, it never happened. MEMORY.md, daily logs, and vault notes survive restarts, crashes, and model switches.

2. **Events over cron** — Hooks fire on real events (message sent, session end, gateway start). No scheduling gaps, no stale cron jobs.

3. **Search before guess** — Always `memory_search` first. The FTS5 index has 12k+ chunks across memory + vault. Guessing is the last resort.

4. **Distill, don't dump** — Raw logs go to daily files. Only curated, deduplicated insights enter MEMORY.md. The synthesis queue is a staging area, not a fire hose.

5. **LLM-enhanced, not LLM-dependent** — Every distillation stage can use an LLM call for better quality, but regex fallback means the system never breaks without API access.

6. **Map, not territory** — MEMORY.md contains protocol and pointers. Detailed facts live in vault notes and daily logs. memory_search finds them on demand.

6. **Archive, don't delete** — Pruned CORTEX noise and stale notes go to `_memory_backup/`, not `/dev/null`. Recoverable beats gone forever.

7. **Protocol in the file** — The memory instructions live in MEMORY.md itself, not in a separate doc. Every session, every model reads it first.

8. **Fast + Deep layers** — The cortex hook captures in real-time (fast, regex, event-driven). Native Dreaming scores and promotes overnight (deep, weighted signals, cron). Both layers work together — the hook feeds daily logs, Dreaming ingests them.

9. **Session activation, not just awareness** — Reflex Memory isn't passive infrastructure. Every session actively follows the startup protocol: recall, check queue, verify hooks, use saliency, write logs, check dreams.

---

## Native Dreaming Integration

Reflex Memory integrates with OpenClaw's built-in Dreaming system as the deep consolidation layer.

### Two-layer architecture

```
┌──────────────────────┐
│  FAST LAYER (hook)    │  Event-driven, session scope
│  Regex capture        │  message:sent → queue
│  Session-end distill  │──→ daily log + Calendar note
└──────────────────────┘
         │
         │ daily logs feed into
         ▼
┌──────────────────────┐
│  DEEP LAYER (Dreaming)│  Cron-driven, overnight
│  Light: score         │  ingests daily logs + sessions
│  REM: reflect         │  themes, patterns, recurring ideas
│  Deep: promote        │──→ MEMORY.md + DREAMS.md
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│  RECALL (FTS5)        │
│  memory_search       │  12k+ chunks
└──────────────────────┘
```

### What Dreaming adds

| Capability | Hook only | Hook + Dreaming |
|-----------|-----------|----------------|
| Real-time capture | ✅ Regex | ✅ Regex |
| Scoring | ❌ Pattern match = yes/no | ✅ 6 weighted signals |
| Pattern detection | ❌ | ✅ REM phase (cross-day themes) |
| Overnight promotion | ❌ | ✅ Deep phase (threshold gates) |
| Narrative diary | ❌ | ✅ DREAMS.md |
| Crash recovery | ✅ gateway:startup | ✅ gateway:startup |

### Configuration

Enable Dreaming in `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "enabled": true,
        "config": {
          "dreaming": {
            "enabled": true,
            "frequency": "0 3 * * *"
          }
        }
      }
    }
  }
}
```

**Note:** Deep phase always writes to MEMORY.md (not configurable). MEMORY.md becomes a mixed layer — protocol at the top, auto-promoted entries at the bottom. The protocol section (map/pointers) remains the authoritative navigation layer.

### Deep ranking signals

| Signal | Weight | What it measures |
|--------|--------|-----------------|
| Relevance | 0.30 | Average retrieval quality |
| Frequency | 0.24 | How many short-term signals accumulated |
| Query diversity | 0.15 | Distinct query/day contexts |
| Recency | 0.15 | Time-decayed freshness |
| Consolidation | 0.10 | Multi-day recurrence strength |
| Conceptual richness | 0.06 | Concept-tag density |

Items must pass `minScore`, `minRecallCount`, and `minUniqueQueries` thresholds to be promoted.

### Dream Diary

Dreaming writes a narrative diary to `DREAMS.md` — a human-readable summary of what surfaced overnight. This is not a data source for recall, just a readable log of consolidation activity.

---

## Session Startup Protocol

Every new session should follow this startup sequence to activate Reflex Memory:

1. **Recall first** — always `memory_search` before guessing facts. FTS5 covers memory/ + vault/ + workspace.
2. **Check synthesis queue** — read `PROJECTS/cortex-v2/synthesis_queue.json`. If orphaned items exist from a crashed session, distill them to the daily log.
3. **Verify hooks** — confirm cortex-synthesis is active (`openclaw hooks list`). If disabled, re-enable.
4. **Use saliency patterns** — when you say something worth remembering, mark it: "remember this:", "core truth:", "lesson learned:", "critical decision:". The hook captures these.
5. **Write daily log** — capture what happened in `memory/YYYY-MM-DD.md`.
6. **Dreaming awareness** — check `DREAMS.md` for overnight consolidation results. Native Dreaming promotes scored entries to MEMORY.md at 3am.

### Memory Maintenance Cadence

| Frequency | Action |
|-----------|--------|
| Every session | Write daily log, use saliency patterns |
| Session end | Distill queue to daily log + Calendar note |
| Overnight (auto) | Dreaming: Light → REM → Deep |
| Weekly | Extract insights → vault/Atlas/Notes/ with YAML frontmatter |
| Monthly | Audit MOC links, prune noise, consolidate duplicates |

---

## AGENTS.md Integration

Add the Reflex Memory Startup directive to your `AGENTS.md` so every session automatically follows the protocol:

```markdown
### 🧠 Reflex Memory Startup

Every session starts with the Reflex Memory protocol (defined in MEMORY.md). On startup:

1. **Recall first** — always `memory_search` before guessing facts.
2. **Check synthesis queue** — handle orphaned items from crashed sessions.
3. **Verify hooks** — confirm cortex-synthesis is active.
4. **Use saliency patterns** — mark insights for capture.
5. **Write daily log** — `memory/YYYY-MM-DD.md`.
6. **Dreaming awareness** — check `DREAMS.md` for overnight results.
```

This closes the loop — not just knowing about Reflex Memory but actively using it from session one.

---

## License

MIT

---

*Built for OpenClaw. No vectors were embedded in the making of this system.*