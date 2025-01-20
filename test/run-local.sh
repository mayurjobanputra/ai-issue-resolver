#!/bin/bash

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo "Error: 'act' is not installed."
    echo "Please install act following the instructions at: https://github.com/nektos/act#installation"
    exit 1
fi

# create a test event file
cat > .github/workflows/test.yml << 'EOL'
name: Test Action Locally
on:
    issues:
      types: [labeled]
    issue_comment:
      types: [created]

jobs:
  test-action:
    runs-on: ubuntu-latest
    if: |
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'ai-issue-resolver-pr')) ||
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'ai-issue-resolver')) ||
      (github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/ai-issue-resolver-change'))
    steps:
      - uses: actions/checkout@v3
      - name: Build Action
        run: |
          npm ci
          node build.js
      - name: Run Action
        uses: ./
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model-api-key: ${{ secrets.MODEL_API_KEY }}
          model-provider: 'openai'
          model-name: 'gpt-4'
EOL

# Create test event file
mkdir -p .github/workflows/events
cat > test/__mocks__/test-event.json << EOL
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
  -W .github/workflows/test.yml \
  -e test/__mocks__/test-event.json \
  -s GITHUB_TOKEN="$GITHUB_TOKEN" \
  -s MODEL_API_KEY="$MODEL_API_KEY" \
  --artifact-server-path /tmp/artifacts \
  --container-architecture linux/amd64 # For mac users with intel, use linux/arm64, use linux/arm64

# Cleanup
rm -rf test/__mocks__/test-event.json
rm -rf .github/workflows/test.yml