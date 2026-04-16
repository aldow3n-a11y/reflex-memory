# OpenClaw Reflex Memory

> A structured memory system for AI agents. Capture, recall, distill, and maintain knowledge — automatically.

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
│   │   ├── PKM MOC.md
│   │   ├── Robot MOC.md
│   │   └── Trading MOC.md
│   └── Notes/         # Atomic notes — knowledge units
│       ├── Memory-Architecture.md
│       ├── Event-Driven-Over-Cron.md
│       ├── Credentials-Index.md
│       └── ...
├── Calendar/          # Daily notes (auto-populated)
├── 03-CORTEX/         # Auto-extracted knowledge (tiered)
│   ├── 00-MOCs/       # Extracted MOCs
│   ├── 01-Principles/ # T1-T4 principles
│   └── 02-Decisions/  # T1-T4 decisions
├── Efforts/           # Session snapshots, projects
├── _memory_backup/    # Archived/pruned content
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
4. Prune 03-CORTEX noise (tool dumps, reasoning traces)
5. Archive stale unreferenced notes → _memory_backup/
6. Consolidate duplicate entries
```

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
  queue.json          MEMORY.md            MEMORY.md
  (capture)          (curated facts)      (compacted)
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

```json
// ~/.openclaw/openclaw.json
{
  "memorySearch": {
    "extraPaths": ["/path/to/your/vault"]
  }
}
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
mkdir -p vault/{Atlas/{Maps,Notes},Calendar,03-CORTEX/{00-MOCs,01-Principles,02-Decisions},Efforts,Templates,_memory_backup}
```

Copy templates from this repo into `vault/Templates/`.

### 4. Add the protocol to MEMORY.md

Paste the Memory Protocol (first 6 lines of `MEMORY.example.md`) at the top of your MEMORY.md.

### 5. Create your first MOC

Use `template-moc.md` to create a Map of Content in `vault/Atlas/Maps/`.

### 6. Verify

```bash
# Check hook is active
openclaw hooks list | grep cortex

# Test search
# (in a session, use the memory_search tool with any query)
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

---

## License

MIT

---

*Built for OpenClaw. Tested on a ThinkPad X240 with 7.5GB RAM and an i5-4200U. No vectors were embedded in the making of this system.*