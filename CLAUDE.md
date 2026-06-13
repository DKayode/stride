# CLAUDE.md — Stride Project Knowledge Base

## Project Overview
**Stride** is an application for tracking both **daily habits** and **project advancement / milestones**.

This repo is set up to build features using **agent teams** orchestrated over tmux: an
Orchestrator coordinates one or more Project Managers, each of whom drives an Engineer to
implement a spec. This file is the shared knowledge base every agent reads on startup.

## Agent Team Architecture

```
                 Orchestrator (you, high-level)
                          |
                   Project Manager        ← quality + coordination, schedules check-ins
                          |
                      Engineer            ← writes the code
                          |
            Dev-Server window + Tests window  ← logs the PM watches
```

| Role | Responsibility |
|------|----------------|
| **Orchestrator** | High-level oversight, deploys teams, resolves cross-cutting decisions. Stays out of implementation detail. |
| **Project Manager** | Locks onto a spec, drives the engineer feature-by-feature, verifies each against the spec, watches server/test logs, schedules its own check-ins. |
| **Engineer** | Implements deliverables one at a time, commits often, reports to the PM. |

### tmux session layout (`stride`)
- `stride:0` — **PM** (Claude)
- `stride:1` — **Engineer** (Claude)
- `stride:2` — **Dev-Server**
- `stride:3` — **Tests** / shell

Attach with `tmux attach -t stride`.

## Tooling — use the scripts, not raw send-keys

All agent-to-agent messaging goes through the helper scripts in `./orchestrator/`:

```bash
# Send a message to another agent (handles the type→wait→Enter timing)
./orchestrator/send-claude-message.sh stride:1 "What's your progress on the habits API?"

# Self-schedule a check-in (writes a note, then pokes the target window after N minutes)
./orchestrator/schedule_with_note.sh 30 "Review habits API against spec" stride:0

# Snapshot all tmux windows for monitoring
python3 ./orchestrator/tmux_utils.py
```

**Never** hand-roll `tmux send-keys "msg" Enter` for agent messages — the Enter fires too
fast. Always use `send-claude-message.sh`, which inserts the required 0.5s delay.

### Slash commands
- `/start-team <feature or SPEC: path>` — bootstrap the full team in the `stride` session.
- `/pm-oversight <scope> SPEC: <path>` — become the PM and drive an existing engineer to completion.

## 🔐 Git Discipline — MANDATORY FOR ALL AGENTS
1. **Auto-commit every ~30 minutes.** `git add -A && git commit -m "Progress: <specific description>"`. Never go >1 hour without committing; use `WIP:` if mid-feature.
2. **Feature branches.** `git checkout -b feature/<name>` before starting; tag stable points.
3. **Commit before switching tasks.** Never leave uncommitted work when changing context.
4. **Meaningful messages.** "Add habit streak calculation with timezone handling", not "updates".
5. **Only commit/push when it makes sense for the work** — and never force-push shared branches.

## Communication Protocol (hub-and-spoke)
- Engineers report to their PM only; the PM aggregates and reports up to the Orchestrator.
- Keep messages work-only, specific, and one-topic. Prefer numbered status requests:
  `STATUS UPDATE: 1) Completed? 2) Current work? 3) Blockers?`
- Escalate after ~10 min blocked; if 3 approaches fail, change strategy.
- After ~10 minutes stuck, do web research before burning more time (a recurring lesson).

## PM Verification Checklist (per feature)
- [ ] Implemented matches the spec deliverable exactly
- [ ] Has tests, and they pass (check the Tests window)
- [ ] Error handling is present
- [ ] No errors in the Dev-Server logs
- [ ] Committed with a meaningful message

## Working Conventions
- Match the existing code style and structure once the codebase grows.
- Write a spec under `./specs/` before building anything non-trivial.
- The PM watches the Dev-Server (window 2) and Tests (window 3) logs and feeds concrete
  error messages back to the engineer — don't make the engineer guess.

## Stride domain notes
- Two core domains: **Habits** (recurring daily tracking, streaks) and **Projects/Milestones**
  (advancement toward goals). Keep these concerns separable as the schema grows.
- (Tech stack TBD — record decisions here as the team makes them.)
