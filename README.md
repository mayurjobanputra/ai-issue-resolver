# AI Issue Resolver - using Langchain - By AxioTree

![Axiotree Banner](./attached_assets/axiotree-banner.png)

🤖 A GitHub Action plugin that leverages AI-powered code generation and pull request management using [Langchain SDK](https://www.langchain.com).

## Features

- 🎯 **Automated PR Generation**
  - Generate PRs automatically from issues tagged with `ai-issue-resolver-pr`
  - AI analysis of issue descriptions for accurate code changes
  - Full repository context for intelligent code generation
  - Intelligent branch management and commit organization

- 🔍 **Advanced Code Review**
  - Comprehensive code quality analysis
  - Performance optimization suggestions
  - Design pattern recommendations
  - Testing coverage assessment
  - Security vulnerability scanning

- 🛡️ **Security Analysis**
  - Input validation vulnerability detection
  - Authentication/authorization issue identification
  - Data exposure risk assessment
  - Injection vulnerability scanning
  - Dependency security audit

- 💬 **Interactive PR Updates**
  - Update PRs using slash commands
  - Request specific changes with natural language
  - Get instant AI-powered feedback
  - Multiple command support:
    - `/ai-issue-resolver-change` - Request specific code changes
    - `/ai-issue-resolver-review` - Trigger comprehensive code review

## Installation

### From GitHub Marketplace (Recommended)
1. Visit the [Axiotree AI Issue Resolver](https://github.com/marketplace/actions/ai-issue-resolver-ai-generated-pr-updates) in the GitHub Marketplace
2. Click "Install it for free"
3. Configure the action with required secrets
4. Add the workflow file to your repository

### Quick Setup

1. Create `.github/workflows/ai-pr.yml` in your repository:

```yaml
name: AI PR Generation
on:
  issues:
    types: [labeled]
  issue_comment:
    types: [created]

jobs:
  ai-pr:
    runs-on: ubuntu-latest
    if: |
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'ai-issue-resolver-pr')) ||
      (github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/ai-issue-resolver'))
    steps:
      - uses: actions/checkout@v3
      - uses: Axiotree/ai-issue-resolver
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          model-api-key: ${{ secrets.MODEL_API_KEY }}
          model-provider: 'openai'  # optional
          model-name: 'gpt-4'      # optional
          base-branch: 'main'      # optional
          review-threshold: '0.8'   # optional
```

2. Add required secrets in your repository settings:
   - `GITHUB_TOKEN`: Automatically provided by GitHub
   - `MODEL_API_KEY`: Your Language Model API key (supports OpenAI, Anthropic, etc.)

## Usage

### 1. Generating AI PRs from Issues

1. Create a new issue describing the desired changes
2. Add the `ai-issue-resolver-pr` label
3. The action will automatically:
   - Analyze the issue using AI
   - Provide the AI with full repository context (excluding GitHub Action files)
   - Generate code changes that align with your existing codebase
   - Create a PR with the changes
   - Add relevant labels

Example issue:
```markdown
Title: Add input validation to user registration

Description:
Please add input validation for:
- Email format checking
- Password strength requirements (min 8 chars, special chars)
- Username validation (alphanumeric only)
```

### 2. Using Code Review

Comment on any PR with:
```
/ai-issue-resolver-review
```

The AI will provide:
- Code quality assessment
- Security scan results
- Performance suggestions
- Testing recommendations

### 3. Requesting Changes

Comment on a PR with specific change requests:
```
/ai-issue-resolver-change Please add error messages below each input field
```

## Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub API token | Yes | N/A |
| `model-api-key` | API key for the Language Model (supports OpenAI, Anthropic, etc.) | Yes | N/A |
| `model-provider` | LLM provider choice | No | openai |
| `model-name` | Model to use | No | gpt-4 |
| `base-branch` | Base branch for PRs | No | main |
| `review-threshold` | Review confidence threshold | No | 0.8 |

## LLM Provider Support Status

| Provider | Status | Supported Models | Features |
|----------|---------|-----------------|-----------|
| OpenAI | 🧪 Testing | gpt-4, gpt-3.5-turbo | All features fully supported |
| Anthropic (Claude) | 🧪 Testing | claude-3.5 sonnet, claude-instant | Basic code generation, review features |
| Azure OpenAI | 🧪 Testing | gpt-4, gpt-3.5-turbo | Basic code generation, review features |
| Ollama | 🚧 Planned | Llama 3.3, codellama, qwen, codegemma | Not yet implemented |

## Best Practices

1. Use clear, detailed issue descriptions
2. Review AI-generated changes before merging
3. Utilize slash commands for specific updates
4. Provide feedback to improve future generations
5. For complex changes, include specific file paths in your issue description to help the AI focus

## Support

Need help? We're here:

1. Check the [Documentation](./docs)
2. Open an [Issue](../../issues)
3. Visit our [Discussions](../../discussions)
4. Contact: support@axiotree.com

## Local Testing

To test the action locally:

1. Install Act based on your operating system:

   **macOS (using Homebrew):**
   ```bash
   brew install act
   ```

   **Linux (using curl):**
   ```bash
   curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
   ```

   **Windows (using Chocolatey):**
   ```bash
   choco install act-cli
   ```

   Alternatively, you can download the latest release from: https://github.com/nektos/act/releases

2. Set up required environment variables:
   ```bash
   export GITHUB_TOKEN=your_github_token
   export MODEL_API_KEY=your_api_key
   ```

   For Windows CMD:
   ```cmd
   set GITHUB_TOKEN=your_github_token
   set MODEL_API_KEY=your_api_key
   ```

   For Windows PowerShell:
   ```powershell
   $env:GITHUB_TOKEN = "your_github_token"
   $env:MODEL_API_KEY = "your_api_key"
   ```

3. Run the test script:
   ```bash
   chmod +x test/run-local.sh
   ./test/run-local.sh
   ```

   For Windows:
   ```powershell
   # Using Git Bash or WSL is recommended
   bash test/run-local.sh
   ```

This will simulate the GitHub Actions environment locally and test the action with a sample issue event.

#### Prerequisites

1. **Docker Installation**
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended for Windows/Mac)
   - For Linux: `sudo apt-get install docker.io`
   - Ensure Docker daemon is running before testing

2. **Required Tokens**
   - GitHub Personal Access Token with repo scope
   - OpenAI / Anthropic / Ollama, etc API Key for AI operations

#### Troubleshooting

- If you get permission errors, make sure the script is executable: `chmod +x test/run-local.sh`
- For Windows users, using Git Bash or WSL (Windows Subsystem for Linux) is recommended
- Make sure Docker is installed and running, as Act requires it to simulate the GitHub Actions environment
- If you get "act not found", make sure it's in your system's PATH
- For Docker-related issues:
  - Check if Docker daemon is running: `docker ps`
  - Start Docker service if needed:
    - Linux: `sudo systemctl start docker`
    - Windows/Mac: Start Docker Desktop
  - Verify Docker installation: `docker --version`

## License

MIT License - see LICENSE file for details