# HEARTBEAT.md

- [ ] **Memory Integrity Check**: Verify `MEMORY.md` and `USER.md` exist in workspace root. Alert if missing.
- [ ] **Log Rotation**: Ensure today's log is active in `memory/daily/`.
- [ ] **SOT Sync**: Check if any new critical knowledge needs to be distilled from daily logs into MEMORY.md.
- [ ] **Orphan Rescue**: Scan `~/.openclaw/workspace/memory/legacy_sessions/` for `.jsonl` logs and move to `memory/daily/`.
