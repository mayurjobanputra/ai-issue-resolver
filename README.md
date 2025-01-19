# AI Issue Resolver - using Langchain

![Axiotree Banner](./attached_assets/axiotree-banner.jpg)

🤖 A GitHub Action plugin that integrates AI-powered code generation and review processes into your GitHub workflow using Langchain.

## Features

- 🎯 **Automated PR Generation**
  - Generate PRs automatically from issues tagged with `axiotree-langchain-ai-pr`
  - AI analysis of issue descriptions for accurate code changes
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
    - `/axiotree-langchain-ai-change` - Request specific code changes
    - `/axiotree-langchain-ai-review` - Trigger comprehensive code review

## Installation

### From GitHub Marketplace

1. Visit the [Axiotree Langchain AI PR Action](https://github.com/marketplace) in the GitHub Marketplace
2. Click "Install it for free"
3. Select the repositories where you want to use the action
4. Follow the setup instructions below to configure the action

### Manual Setup

1. Add the action to your repository's `.github/workflows/ai-pr.yml`:

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
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'axiotree-langchain-ai-pr')) ||
      (github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/axiotree-langchain-ai-change'))
    steps:
      - uses: actions/checkout@v3
      - uses: axiotree/ai-issue-resolver@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          model-provider: 'openai'  # optional, defaults to 'openai'
          model-name: 'gpt-4'      # optional, defaults to 'gpt-4'
```

2. Configure the required secrets in your repository settings:
   - `GITHUB_TOKEN`: Automatically provided by GitHub
   - `OPENAI_API_KEY`: Your OpenAI API key

## Usage

### Generating AI PRs from Issues

1. Create a new issue describing the desired changes
2. Add the `axiotree-langchain-ai-pr` label to the issue
3. The action will:
   - Analyze the issue using the configured LLM
   - Generate appropriate code changes
   - Create a new PR with the changes
   - Tag the PR with `axiotree-langchain-ai-pr`

Example issue:
```markdown
Title: Add input validation to user registration form

We need to add proper input validation to the registration form:
- Email format validation
- Password strength requirements
- Username character restrictions

Please implement these validations using the existing form library.
```

### Using Code Review Features

1. On any pull request, comment with `/axiotree-langchain-ai-review`
2. The AI will provide comprehensive feedback including:
   - Code quality assessment
   - Security vulnerability scan
   - Performance optimization suggestions
   - Testing recommendations

Example review command:
```markdown
/axiotree-langchain-ai-review
```

### Requesting Changes in PRs

Use the `/axiotree-langchain-ai-change` slash command followed by your request:

```markdown
/axiotree-langchain-ai-change Please add error messages that appear below each input field when validation fails
```

## Configuration Options

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | N/A |
| `openai-api-key` | OpenAI API key | Yes | N/A |
| `model-provider` | LLM provider (openai, anthropic, ollama) | No | 'openai' |
| `model-name` | Name of the model to use | No | 'gpt-4' |

## Best Practices

1. Write clear, detailed issue descriptions for better AI understanding
2. Use specific slash commands for targeted changes
3. Review AI-generated changes before merging
4. Provide feedback in PR comments to improve future generations

## Support

Need help? Have questions? Here's how to get support:

1. Check the [Documentation](./docs)
2. Open an [Issue](../../issues)
3. Ask questions in [Discussions](../../discussions)
4. Email support at support@axiotree.com

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
