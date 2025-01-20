#!/bin/bash

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo "Error: 'act' is not installed."
    echo "Please install act following the instructions at: https://github.com/nektos/act#installation"
    exit 1
fi

# Create test event file
mkdir -p .github/workflows/events
cat > .github/workflows/events/test-event.json << EOL
{
  "action": "labeled",
  "issue": {
    "number": 1,
    "title": "Test Issue",
    "body": "This is a test issue for local development",
    "labels": [{"name": "ai-issue-resolver"}]
  },
  "repository": {
    "owner": {
      "login": "test-owner"
    },
    "name": "test-repo"
  }
}
EOL

# List available workflows and jobs for debugging
echo "Available workflows and jobs:"
act --list --container-architecture linux/amd64 # For mac users with intel, use linux/arm64, use linux/arm64

# Run the action using act
act issues \
  -e .github/workflows/events/test-event.json \
  -s GITHUB_TOKEN="$GITHUB_TOKEN" \
  -s MODEL_API_KEY="$MODEL_API_KEY" \
  --artifact-server-path /tmp/artifacts \
  --container-architecture linux/amd64 # For mac users with intel, use linux/arm64, use linux/arm64
