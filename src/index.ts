import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssueHandler } from './handlers/issue-handler.js';
import { PRHandler } from './handlers/pr-handler.js';
import { AIService } from './services/ai-service.js';
import { GitHubService } from './services/github-service.js';
import { AI_PR_LABEL } from './utils/constants.js';
import type { Issue, Comment } from './types/index.js';
import { Octokit } from '@octokit/rest';
import { telemetry } from './services/telemetry-service.js';

/**
 * Main entry point for the GitHub Action.
 * This function orchestrates the handling of GitHub webhook events
 * for issues and pull requests, managing AI-powered code generation
 * and review processes.
 * 
 * The action supports:
 * 1. Converting tagged issues into AI-generated PRs
 * 2. Handling AI-powered code review requests
 * 3. Processing AI-assisted code change requests
 * 
 * @throws {Error} If required inputs are missing or API calls fail
 */
export async function run(): Promise<void> {
  try {
    // Initialize required API tokens and configuration from action inputs
    const token = core.getInput('github-token', { required: true });
    const modelApiKey = core.getInput('model-api-key', { required: true });
    const modelProvider = core.getInput('model-provider') || 'openai';
    const modelName = core.getInput('model-name') || 'gpt-4';

    telemetry.logAPICall('action_initialization', 'setup', {
      modelProvider,
      modelName,
      eventName: github.context.eventName
    });

    // Initialize core services with configuration
    const octokit = github.getOctokit(token) as unknown as Pick<Octokit, 'rest'>;
    const githubService = new GitHubService(octokit);
    const aiService = new AIService({
      provider: modelProvider,
      modelName: modelName,
      apiKey: modelApiKey,
    });

    const eventName = github.context.eventName;
    const payload = github.context.payload;

    // Handle different GitHub webhook events
    if (eventName === 'issues' && payload.issue) {
      const issueHandler = new IssueHandler(githubService, aiService);
      const issue = payload.issue as Issue;

      // Only process issues tagged with our AI PR label
      if (issue.labels?.some((label: { name: string }) => label.name === AI_PR_LABEL)) {
        await issueHandler.handleIssue({
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          labels: issue.labels || []
        });
      }
    } 
    // Process AI-related comments on PRs
    else if (eventName === 'issue_comment' && payload.comment) {
      const prHandler = new PRHandler(githubService, aiService);
      const comment = {
        body: payload.comment.body,
        issue_url: payload.comment.issue_url
      } as Comment;

      // Handle AI commands in comments
      if (comment.body.startsWith('/axiotree-langchain-ai')) {
        await prHandler.handleComment(comment);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

// Execute the action
run();