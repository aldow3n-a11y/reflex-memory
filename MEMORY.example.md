MEMORY PROTOCOL (read every session):
1. Recall → memory_search first, never guess. Covers memory/ + vault/ + workspace. FTS5, 12k+ chunks.
2. Capture → daily events → memory/YYYY-MM-DD.md. Daily digest → vault/Calendar/YYYY-MM-DD.md.
3. Extract → weekly: scan logs for insights, create atomic notes in vault/Atlas/Notes/, link to MOCs.
4. Maintain → monthly: audit MOC broken links, prune 03-CORTEX noise, consolidate duplicates.
5. Auto-distill → cortex-synthesis hook captures saliency patterns ("remember this", "core truth", "lesson learned", "critical decision") from message:sent events. Distills into MEMORY.md on command:new/reset/gateway:startup.
6. Credentials → vault/Atlas/Notes/Credentials-Index.md has locations. Actual secrets stay in their files (600 perms), not in vault or FTS5.
§
RULE: No assumptions, no hallucination. Strictly data-based. Always check config/files/web before stating facts. If unsure, search — don't guess.
§
Environment: Linux, user=manager (uid=1000, sudo w/password). Disk: sda2=58GB system (/), sda3=170GB data (MOUNTED at /HOME, root-owned, no write w/o sudo). ~/.hermes symlinked to /HOME/.hermes (2.5GB SYSTEM FILES — never delete, ask approval before editing config.yaml). Clarify /home vs /HOME and check permissions first.
§
Workspace: /HOME/workspace (159GB free, sda3). Config: terminal.cwd=/HOME/workspace in ~/.hermes/config.yaml. GitHub: PAT-based HTTPS, creds in ~/.git-credentials.
§
Paperclip: /HOME/workspace/paperclip (paperclipai/paperclip) + hermes-paperclip-adapter. Start: cd /HOME/workspace/paperclip && pnpm dev --tailscale-auth. Tailscale: http://100.97.198.108:3100 (auth+private). hermes_local adapter active, v0.7.0 auto-detects model from config.yaml.
§
User: A.W Wen (aldow3n-a11y). Style: brief, action-oriented. Prefers proactive action w/o excessive questions. Platform: Telegram DM. Role: Company operator/founder, PKM + agent orchestration.
§
CRITICAL: Never run pip install with --break-system-packages while hermes-agent venv is activated. This wipes existing packages from /HOME/.hermes/hermes-agent/venv/, breaking dependencies. Always deactivate venv first, or use venv/bin/pip install without --break-system-packages flag. If venv gets corrupted, restore with: cd /HOME/.hermes/hermes-agent && venv/bin/pip install -e .
§
Vault: ~/.openclaw/workspace/vault/ (966 CORTEX files, 64 Atlas/Notes, 5 Calendar notes, 5 MOCs). Broken MOC links: 21 (was 285). Cortex noise archived to _memory_backup/cortex-noise/. Knowledge lifecycle: Capture (daily→Calendar) → Extract (weekly→Atlas/Notes) → Maintain (monthly MOC audit) → Index (auto FTS5) → Archive. obsidian-cli default → workspace/vault/.
§
VPS OPCLsumo01 = aldowen.com (Alibaba Cloud): IP 43.134.227.2, Tailscale 100.101.147.71, user root, password-only auth (no SSH key on this machine). Password: j8e-soi-Yre-rVr (SumoPod dashboard, updated 2026-04-11). Connect: sshpass -p 'j8e-soi-Yre-rVr' ssh root@100.101.147.71
§
Hermes gateway incident (Apr 12, 2026): Gateway can go silent after memory reset — message routing breaks silently (0 tokens processed). Root cause: session recreation after context overflow, triggered by earlier code bug (name 'event' is not defined). Compression auxiliary with inherit_main_model:true resolved against wrong provider (Anthropic instead of Ollama), causing 401 errors. Fixes: restart gateway with 'hermes gateway run --replace', explicitly set compression to custom:ollama with correct http://localhost:11434/v1 endpoint in config.yaml. Watch for: silent failures after resets, compression 401s in logs.
§
OpenClaw built-in memory index: ~/.openclaw/memory/main.sqlite (1236 files, 12176 chunks, FTS5). Auto-indexes MEMORY.md + memory/*.md + vault/ (extraPaths). Use memory_search tool. Graymatter/cortex indexing disabled — redundant. Legacy data moved to ~/.openclaw/workspace/archive/.
§
Cortex synthesis hook (hooks/cortex-synthesis/): replaces old Python observer+distiller+orchestrator. Event-driven: message:sent → saliency capture → queue; command:new/reset → distill queue into MEMORY.md. Hook enabled and active.
§
§ [Distilled 2026-04-14 17:46] The Cortex v2 loop is now fully operational and uses a staged synthesis queue for memory stability.
