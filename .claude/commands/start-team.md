---
description: Spin up a tmux agent team (PM + engineer + dev/test windows) for the Stride repo from a feature spec
allowedTools: ["Bash", "Read", "Write", "TodoWrite", "Task"]
---

Set up a fresh agent team to build a Stride feature. You are the Orchestrator performing the bootstrap.

$ARGUMENTS

Interpret the arguments as the feature/spec to build. If a `SPEC:` path is given, read it first. If only a description is given, write a short spec to `./specs/<slug>-spec.md` (PROJECT / GOAL / CONSTRAINTS / DELIVERABLES / SUCCESS CRITERIA) before deploying the team.

Then deploy the team in a tmux session named `stride`:

```bash
PROJECT_PATH="/Users/kayodedacruz/Projects/stride"

# Reuse the session if it exists, otherwise create it
tmux has-session -t stride 2>/dev/null || tmux new-session -d -s stride -c "$PROJECT_PATH"

# Window 0: Project Manager (Claude)
tmux rename-window -t stride:0 "PM"
# Window 1: Engineer (Claude)
tmux new-window -t stride -n "Engineer" -c "$PROJECT_PATH"
# Window 2: Dev server
tmux new-window -t stride -n "Dev-Server" -c "$PROJECT_PATH"
# Window 3: Test runner / shell
tmux new-window -t stride -n "Tests" -c "$PROJECT_PATH"

# Start Claude in the PM and Engineer windows
tmux send-keys -t stride:0 "claude" Enter
tmux send-keys -t stride:1 "claude" Enter
sleep 5
```

Brief the engineer (window 1) with the spec and Stride conventions, then brief the PM (window 0) to oversee using the `/pm-oversight` workflow. Use the helper scripts for all agent messaging:

```bash
./orchestrator/send-claude-message.sh stride:1 "You are the Engineer for Stride. Read <spec path> and the repo CLAUDE.md, then implement deliverables one at a time, committing every ~30 min. Report to the PM in window 0."
./orchestrator/send-claude-message.sh stride:0 "You are the PM. Lock on this spec: <spec path>. Oversee the engineer in window 1, check the Dev-Server (window 2) and Tests (window 3) logs, and schedule regular check-ins with ./orchestrator/schedule_with_note.sh."
```

Finally, schedule the orchestrator's own first check-in:

```bash
./orchestrator/schedule_with_note.sh 30 "Check team progress on <feature>" stride:0
```

Report back the session layout (windows + roles) and how to attach: `tmux attach -t stride`.
