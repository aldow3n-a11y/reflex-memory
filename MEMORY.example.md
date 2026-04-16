MEMORY PROTOCOL (read every session):
1. Recall → memory_search first, never guess. Covers memory/ + vault/ + workspace. FTS5, 12k+ chunks.
2. Capture → daily events → memory/YYYY-MM-DD.md. Daily digest → vault/Calendar/YYYY-MM-DD.md.
3. Extract → weekly: scan logs for insights, create atomic notes in vault/Atlas/Notes/, link to MOCs.
4. Maintain → monthly: audit MOC broken links, prune 03-CORTEX noise, consolidate duplicates.
5. Auto-distill → cortex-synthesis hook captures saliency patterns ("remember this", "core truth", "lesson learned", "critical decision") from message:sent events. Distills to daily log + Calendar note on command:new/reset/gateway:startup. MEMORY.md is the map, not the territory — detailed facts go to vault/Atlas/Notes/.
6. Credentials → vault/Atlas/Notes/Credentials-Index.md has locations. Actual secrets stay in their files (600 perms), not in vault or FTS5.
§
RULE: No assumptions, no hallucination. Strictly data-based. Always check config/files/web before stating facts. If unsure, search — don't guess.
§
Environment: <your OS, user, disk layout>. <Paths and permissions specific to your setup>.
§
Workspace: <your workspace path>. Config: <your config location>. GitHub: <your auth method>.
§
User: <your name>. Style: <communication preferences>. Platform: <your platform>.
§
Vault: <vault path> (<file count> CORTEX files, <count> Atlas/Notes, <count> Calendar notes, <count> MOCs). Knowledge lifecycle: Capture (daily→Calendar) → Extract (weekly→Atlas/Notes) → Maintain (monthly MOC audit) → Index (auto FTS5) → Archive.
§
VPS: <your VPS details>. Connect: <your SSH command>.
§
HOOKS: cortex-synthesis (message:sent → saliency capture → queue; command:new/reset/gateway:startup → distill into daily logs). Enabled and active.
ACTIVE-MEMORY: disabled (<your reason>). Config preserved for future fast model.