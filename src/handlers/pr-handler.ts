import { AIService } from '../services/ai-service.js';
import { GitHubService } from '../services/github-service.js';
import { Comment, CodeReviewFeedback, CodeChange } from '../types/index.js';

/**
 * PRHandler manages pull request-related operations including handling comments,
 * generating code reviews, and applying requested changes.
 */
export class PRHandler {
  constructor(
    private githubService: GitHubService,
    private aiService: AIService
  ) {}

  /**
   * Handles comments on pull requests, supporting various AI commands:
   * - /ai-issue-resolver-change: Generates and applies requested changes
   * - /ai-issue-resolver-review: Performs comprehensive code review
   * 
   * @param comment - The comment object containing the command and context
   * @throws Error if handling the comment fails
   */
  async handleComment(comment: Comment): Promise<void> {
    // Get PR details from comment context
    const pr = await this.githubService.getPR(comment.issue_url);
    if (!pr) return;

    // Get files modified in the PR for context
    const files = await this.githubService.getPRFiles(pr.number);

    // Handle change request command
    if (comment.body.startsWith('/ai-issue-resolver-change')) {
      const requestedChanges = comment.body.replace('/ai-issue-resolver-change', '').trim();
      const changes = await this.aiService.generateChangesFromFeedback({
        feedback: requestedChanges,
        files,
        prContext: pr,
      });

      // Apply generated changes
      const branchName = pr.head.ref;
      for (const change of changes) {
        await this.githubService.commitChange({
          branch: branchName,
          path: change.path,
          content: change.content,
          message: `AI Update: ${change.message}`,
        });
      }

      // Add confirmation comment
      await this.githubService.addComment({
        prNumber: pr.number,
        body: `Applied requested changes:\n\n${changes.map((change: CodeChange) => `* ${change.message}`).join('\n')}`,
      });
    } 
    // Handle review command
    else if (comment.body.startsWith('/ai-issue-resolver-review')) {
      const review = await this.aiService.reviewCode(files);
      const securityAnalysis = await this.aiService.analyzeSecurity(files);

      await this.githubService.addComment({
        prNumber: pr.number,
        body: this.formatCodeReview(review, securityAnalysis),
      });
    }
  }

  /**
   * Formats code review feedback into a readable markdown comment.
   * @param review - The CodeReviewFeedback object containing various review aspects
   * @param securityAnalysis - Security-specific analysis string
   * @returns Formatted markdown string
   */
  private formatCodeReview(review: CodeReviewFeedback, securityAnalysis: string): string {
    return `## 🤖 AI Code Review

### 🎯 Quality Issues
${review.qualityIssues.map((issue) => `
- **${issue.file}** (${issue.type}, Severity: ${issue.severity})
  - ${issue.description}
  - 💡 Suggestion: ${issue.suggestion}
`).join('\n')}

### 🔒 Security Analysis
${securityAnalysis}

### ✨ Suggested Improvements
${review.improvements.map((imp) => `
- **${imp.file}**
  - ${imp.description}
  - 💡 ${imp.suggestion}
`).join('\n')}

### 🧪 Testing Suggestions
${review.testingSuggestions.map((test) => `
- **${test.file}**
  - ${test.description}
  - Test Cases:
    ${test.testCases.map((tc) => `    - ${tc}`).join('\n')}
`).join('\n')}

---
To request specific changes, use \`/ai-issue-resolver-change\` followed by your request.`;
  }
}