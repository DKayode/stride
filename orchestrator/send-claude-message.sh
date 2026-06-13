#!/bin/bash

# Send a message to a Claude agent running in a tmux window/pane.
# Handles the critical timing: type the message, wait, then press Enter.
#
# Usage: send-claude-message.sh <session:window[.pane]> <message>
# Example: send-claude-message.sh stride:1 "What's your progress on the habits API?"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <session:window[.pane]> <message>"
    echo "Example: $0 stride:1 'Hello Claude!'"
    exit 1
fi

WINDOW="$1"
shift  # Everything after the target is the message
MESSAGE="$*"

# Type the message (without submitting)
tmux send-keys -t "$WINDOW" "$MESSAGE"

# Wait for the UI to register the input before submitting
sleep 0.5

# Submit
tmux send-keys -t "$WINDOW" Enter

echo "Message sent to $WINDOW: $MESSAGE"
