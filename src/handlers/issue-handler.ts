import { AIService } from '../services/ai-service.js';
import { GitHubService } from '../services/github-service.js';
import { generatePRDescription } from '../utils/templates.js';
import { Issue } from '../types/index.js';
import { context } from '@actions/github';
import { telemetry } from '../services/telemetry-service.js';
import { AI_PR_LABEL } from '../utils/constants.js';

/**
 * IssueHandler manages the process of converting GitHub issues into pull requests
 * using AI-powered code generation and analysis.
 */
export class IssueHandler {
  constructor(
    private githubService: GitHubService,
    private aiService: AIService
  ) {}

  async handleIssue(issue: Issue): Promise<void> {
    const endTimer = telemetry.startTimer('handle_issue');
    try {
      telemetry.logAPICall('issue_handler', 'start_analysis', {
        issueNumber: issue.number,
        title: issue.title.substring(0, 100)
      });

      // Analyze issue content using AI
      const analysis = await this.aiService.analyzeIssue(issue.body);
      
      // Get all repository files to provide context for code generation
      telemetry.logAPICall('issue_handler', 'get_repository_files', {
        issueNumber: issue.number
      });
      
      const repositoryFiles = await this.githubService.getAllRepositoryFiles();
      
      // Generate code changes based on analysis and repository files
      const changes = await this.aiService.generateCodeChanges(analysis, repositoryFiles);

      telemetry.logAPICall('issue_handler', 'generate_branch', {
        issueNumber: issue.number,
        changeCount: changes.length
      });

      // Create a new branch for the changes
      const branchName = `ai-pr/${issue.number}`;
      await this.githubService.createBranch(branchName);

      // Commit each change to the branch
      for (const change of changes) {
        telemetry.logAPICall('issue_handler', 'commit_change', {
          branch: branchName,
          path: change.path,
          messagePreview: change.message.substring(0, 100)
        });

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
        labels: [AI_PR_LABEL],
      });

      telemetry.logAPICall('issue_handler', 'create_pr', {
        issueNumber: issue.number,
        prNumber,
        branchName
      });

      // Add comment to the original issue with PR link
      const { owner, repo } = context.repo;
      const prLink = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
      await this.githubService.addComment({
        prNumber: issue.number,
        body: `✨ I've created a pull request with the requested changes: [#${prNumber}](${prLink})\n\nPlease review the changes and provide feedback if needed.`
      });

      endTimer();
    } catch (error) {
      telemetry.logError(error instanceof Error ? error : new Error(String(error)), {
        handler: 'issue_handler',
        issueNumber: issue.number,
        phase: 'issue_processing'
      });
      endTimer();
      throw error;
    }
  }
}