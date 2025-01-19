import { AIService } from '../services/ai-service';
import { GitHubService } from '../services/github-service';
import { Comment, CodeReviewFeedback } from '../types';

export class PRHandler {
  constructor(
    private githubService: GitHubService,
    private aiService: AIService
  ) {}

  async handleComment(comment: Comment): Promise<void> {
    const pr = await this.githubService.getPR(comment.issue_url);
    if (!pr) return;

    const files = await this.githubService.getPRFiles(pr.number);

    if (comment.body.startsWith('/axiotree-langchain-ai-change')) {
      const requestedChanges = comment.body.replace('/axiotree-langchain-ai-change', '').trim();
      const changes = await this.aiService.generateChangesFromFeedback({
        feedback: requestedChanges,
        files,
        prContext: pr,
      });

      const branchName = pr.head.ref;
      for (const change of changes) {
        await this.githubService.commitChange({
          branch: branchName,
          path: change.path,
          content: change.content,
          message: `AI Update: ${change.message}`,
        });
      }

      await this.githubService.addComment({
        prNumber: pr.number,
        body: `Applied requested changes:\n\n${changes.map(c => `* ${c.message}`).join('\n')}`,
      });
    } else if (comment.body.startsWith('/axiotree-langchain-ai-review')) {
      const review = await this.aiService.reviewCode(files);
      const securityAnalysis = await this.aiService.analyzeSecurity(files);

      await this.githubService.addComment({
        prNumber: pr.number,
        body: this.formatCodeReview(review, securityAnalysis),
      });
    }
  }

  private formatCodeReview(review: CodeReviewFeedback, securityAnalysis: string): string {
    return `## 🤖 AI Code Review

### 🎯 Quality Issues
${review.qualityIssues.map(issue => `
- **${issue.file}** (${issue.type}, Severity: ${issue.severity})
  - ${issue.description}
  - 💡 Suggestion: ${issue.suggestion}
`).join('\n')}

### 🔒 Security Analysis
${securityAnalysis}

### ✨ Suggested Improvements
${review.improvements.map(imp => `
- **${imp.file}**
  - ${imp.description}
  - 💡 ${imp.suggestion}
`).join('\n')}

### 🧪 Testing Suggestions
${review.testingSuggestions.map(test => `
- **${test.file}**
  - ${test.description}
  - Test Cases:
    ${test.testCases.map(tc => `    - ${tc}`).join('\n')}
`).join('\n')}

---
To request specific changes, use \`/axiotree-langchain-ai-change\` followed by your request.`;
  }
}