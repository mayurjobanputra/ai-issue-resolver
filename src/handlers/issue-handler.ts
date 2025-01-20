import { AIService } from '../services/ai-service.js';
import { GitHubService } from '../services/github-service.js';
import { generatePRDescription } from '../utils/templates.js';
import { Issue } from '../types/index.js';
import { context } from '@actions/github';

/**
 * IssueHandler manages the process of converting GitHub issues into pull requests
 * using AI-powered code generation and analysis.
 */
export class IssueHandler {
  constructor(
    private githubService: GitHubService,
    private aiService: AIService
  ) {}

  /**
   * Processes a GitHub issue and generates a corresponding pull request.
   * The process includes:
   * 1. Analyzing the issue content
   * 2. Generating code changes
   * 3. Creating a new branch
   * 4. Committing changes
   * 5. Creating a pull request
   * 
   * @param issue - The GitHub issue to process
   * @throws Error if any step in the process fails
   */
  async handleIssue(issue: Issue): Promise<void> {
    // Analyze issue content using AI
    const analysis = await this.aiService.analyzeIssue(issue.body);

    // Generate code changes based on analysis
    const changes = await this.aiService.generateCodeChanges(analysis);

    // Create a new branch for the changes
    const branchName = `ai-pr/${issue.number}`;
    await this.githubService.createBranch(branchName);

    // Commit each change to the branch
    for (const change of changes) {
      await this.githubService.commitChange({
        branch: branchName,
        path: change.path,
        content: change.content,
        message: change.message,
      });
    }

    // Generate PR description and create PR
    const prDescription = generatePRDescription({
      issueNumber: issue.number,
      changes,
      analysis,
    });

    const prNumber = await this.githubService.createPR({
      title: `AI: ${issue.title}`,
      body: prDescription,
      branch: branchName,
      labels: ['ai-issue-resolver-pr'],
    });

    // Add comment to the original issue with PR link
    const { owner, repo } = context.repo;
    const prLink = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
    await this.githubService.addComment({
      prNumber: issue.number,  // Comment on the original issue
      body: `✨ I've created a pull request with the requested changes: [#${prNumber}](${prLink})\n\nPlease review the changes and provide feedback if needed.`
    });
  }
}