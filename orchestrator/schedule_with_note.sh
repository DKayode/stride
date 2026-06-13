#!/bin/bash
# Dynamic self-scheduler. Writes a note for the next check-in, then schedules a
# detached process that pokes the target tmux window after N minutes so the
# agent (orchestrator or PM) wakes itself back up to continue oversight.
#
# Usage: ./schedule_with_note.sh <minutes> "<note>" [target_window]
# Example: ./schedule_with_note.sh 30 "Review habits API against spec" stride:0

MINUTES=${1:-3}
NOTE=${2:-"Standard check-in"}
TARGET=${3:-"stride:0"}

# Resolve this script's own directory so paths work regardless of cwd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTE_FILE="$SCRIPT_DIR/next_check_note.txt"

# Record the note for the next check
{
    echo "=== Next Check Note ($(date)) ==="
    echo "Scheduled for: $MINUTES minutes"
    echo ""
    echo "$NOTE"
} > "$NOTE_FILE"

echo "Scheduling check in $MINUTES minutes with note: $NOTE"

CURRENT_TIME=$(date +"%H:%M:%S")
RUN_TIME=$(date -v +"${MINUTES}"M +"%H:%M:%S" 2>/dev/null || date -d "+${MINUTES} minutes" +"%H:%M:%S" 2>/dev/null)

# Seconds to sleep (supports fractional minutes via bc)
SECONDS_TO_WAIT=$(echo "$MINUTES * 60" | bc)

# Detach completely so the schedule survives this shell exiting.
# On wake, tell the target agent to read its note and pull a status snapshot.
WAKE_CMD="Time for a check-in! cat \"$NOTE_FILE\" && python3 \"$SCRIPT_DIR/tmux_utils.py\""
nohup bash -c "sleep $SECONDS_TO_WAIT && tmux send-keys -t \"$TARGET\" '$WAKE_CMD' && sleep 1 && tmux send-keys -t \"$TARGET\" Enter" > /dev/null 2>&1 &

SCHEDULE_PID=$!

echo "Scheduled successfully - process detached (PID: $SCHEDULE_PID)"
echo "SCHEDULED TO RUN AT: $RUN_TIME (in $MINUTES minutes from $CURRENT_TIME)"
