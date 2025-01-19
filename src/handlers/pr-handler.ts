import { AIService } from '../services/ai-service';
import { GitHubService } from '../services/github-service';
import { Comment, CodeReviewFeedback } from '../types';

export class PRHandler {
  constructor(
    private githubService: GitHubService,
    private aiService: AIService
  ) {}

  /**
   * Handles a comment on a pull request.
   * 
   * This method processes comments on a pull request to either apply requested changes
   * or perform a code review based on the comment's content.
   * 
   * @param comment - The comment object containing details about the comment.
   * 
   * @returns A promise that resolves when the comment handling is complete.
   * 
   * @remarks
   * - If the comment starts with `/axiotree-langchain-ai-change`, it extracts the requested changes,
   *   generates the changes using AI, commits them to the pull request branch, and adds a comment
   *   summarizing the applied changes.
   * - If the comment starts with `/axiotree-langchain-ai-review`, it performs a code review and
   *   security analysis using AI and adds a comment with the review results.
   */
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

  /**
   * Formats the code review feedback and security analysis into a markdown string.
   *
   * @param review - An object containing the code review feedback, including quality issues, suggested improvements, and testing suggestions.
   * @param securityAnalysis - A string containing the security analysis of the code.
   * @returns A formatted markdown string containing the AI code review, quality issues, security analysis, suggested improvements, and testing suggestions.
   *
   * The formatted string includes:
   * - A header for the AI code review.
   * - A section for quality issues, listing each issue with its file, type, severity, description, and suggestion.
   * - A section for the security analysis.
   * - A section for suggested improvements, listing each improvement with its file, description, and suggestion.
   * - A section for testing suggestions, listing each suggestion with its file, description, and test cases.
   *
   * Example usage:
   * ```typescript
   * const review: CodeReviewFeedback = {
   *   qualityIssues: [
   *     {
   *       file: 'src/index.ts',
   *       type: 'Syntax Error',
   *       severity: 'High',
   *       description: 'Missing semicolon.',
   *       suggestion: 'Add a semicolon at the end of the line.'
   *     }
   *   ],
   *   improvements: [
   *     {
   *       file: 'src/index.ts',
   *       description: 'Refactor the function to improve readability.',
   *       suggestion: 'Use a more descriptive variable name.'
   *     }
   *   ],
   *   testingSuggestions: [
   *     {
   *       file: 'src/index.ts',
   *       description: 'Add unit tests for the new function.',
   *       testCases: ['Test case 1', 'Test case 2']
   *     }
   *   ]
   * };
   * const securityAnalysis = 'No security issues found.';
   * const formattedReview = formatCodeReview(review, securityAnalysis);
   * console.log(formattedReview);
   * ```
   */
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