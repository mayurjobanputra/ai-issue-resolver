import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssueHandler } from './handlers/issue-handler';
import { PRHandler } from './handlers/pr-handler';
import { AIService } from './services/ai-service';
import { GitHubService } from './services/github-service';
import { AI_PR_LABEL } from './utils/constants';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const openaiKey = core.getInput('openai-api-key', { required: true });
    const modelProvider = core.getInput('model-provider') || 'openai';
    const modelName = core.getInput('model-name') || 'gpt-4';

    const octokit = github.getOctokit(token);
    const githubService = new GitHubService(octokit);
    const aiService = new AIService({
      provider: modelProvider,
      modelName: modelName,
      apiKey: openaiKey,
    });

    const eventName = github.context.eventName;
    const payload = github.context.payload;

    if (eventName === 'issues') {
      const issueHandler = new IssueHandler(githubService, aiService);
      const issue = payload.issue;
      
      if (issue.labels.some((label: any) => label.name === AI_PR_LABEL)) {
        await issueHandler.handleIssue(issue);
      }
    } else if (eventName === 'issue_comment') {
      const prHandler = new PRHandler(githubService, aiService);
      const comment = payload.comment;
      
      if (comment.body.startsWith('/axiotree-langchain-ai-change')) {
        await prHandler.handleComment(comment);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
