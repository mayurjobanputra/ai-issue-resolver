import { Octokit } from '@octokit/rest';
import { context } from '@actions/github';
import type { RestEndpointMethodTypes } from '@octokit/rest';

/**
 * Type definition for the required subset of Octokit functionality
 * This ensures we only use the methods we need and provides better type safety
 */
type OctokitInstance = Pick<Octokit, 'rest'> & {
  rest: {
    git: {
      getRef: (params: RestEndpointMethodTypes['git']['getRef']['parameters']) => Promise<RestEndpointMethodTypes['git']['getRef']['response']>;
      createRef: (params: RestEndpointMethodTypes['git']['createRef']['parameters']) => Promise<RestEndpointMethodTypes['git']['createRef']['response']>;
    };
    repos: {
      getContent: (params: RestEndpointMethodTypes['repos']['getContent']['parameters']) => Promise<RestEndpointMethodTypes['repos']['getContent']['response']>;
      createOrUpdateFileContents: (params: RestEndpointMethodTypes['repos']['createOrUpdateFileContents']['parameters']) => Promise<RestEndpointMethodTypes['repos']['createOrUpdateFileContents']['response']>;
    };
    pulls: {
      create: (params: RestEndpointMethodTypes['pulls']['create']['parameters']) => Promise<RestEndpointMethodTypes['pulls']['create']['response']>;
      get: (params: RestEndpointMethodTypes['pulls']['get']['parameters']) => Promise<RestEndpointMethodTypes['pulls']['get']['response']>;
      listFiles: (params: RestEndpointMethodTypes['pulls']['listFiles']['parameters']) => Promise<RestEndpointMethodTypes['pulls']['listFiles']['response']>;
    };
    issues: {
      addLabels: (params: RestEndpointMethodTypes['issues']['addLabels']['parameters']) => Promise<RestEndpointMethodTypes['issues']['addLabels']['response']>;
      createComment: (params: RestEndpointMethodTypes['issues']['createComment']['parameters']) => Promise<RestEndpointMethodTypes['issues']['createComment']['response']>;
    };
  };
};

/**
 * GitHubService handles all interactions with the GitHub API.
 * It provides methods for managing branches, files, pull requests, and issue comments.
 * It also provides methods for retrieving repository content.
 */
export class GitHubService {
  constructor(private octokit: OctokitInstance) {}

  /**
   * Creates a new branch in the repository from the main branch.
   * @param branchName - Name of the new branch to create
   * @throws Error if the branch creation fails
   */
  async createBranch(branchName: string): Promise<void> {
    const { owner, repo } = context.repo;

    // Get the SHA of the main branch to branch from
    const { data: ref } = await this.octokit.rest.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });

    // Create new branch at the same commit
    await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });
  }

  /**
   * Commits changes to a file in a specific branch.
   * If the file doesn't exist, it will be created.
   * @param branch - Target branch name
   * @param path - File path relative to repository root
   * @param content - New content for the file
   * @param message - Commit message
   * @throws Error if the commit operation fails
   */
  async commitChange({ branch, path, content, message }: {
    branch: string;
    path: string;
    content: string;
    message: string;
  }): Promise<void> {
    const { owner, repo } = context.repo;

    try {
      // Try to get existing file to get its SHA
      const { data: currentFile } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      const fileSha = Array.isArray(currentFile) ? undefined : currentFile.sha;

      // Update existing file
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha: fileSha,
      });
    } catch (error) {
      // File doesn't exist, create new file
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      });
    }
  }

  /**
   * Creates a new pull request with specified parameters.
   * @param title - Pull request title
   * @param body - Pull request description
   * @param branch - Source branch name
   * @param labels - Array of label names to add to the PR
   * @throws Error if PR creation fails
   */
  async createPR({ title, body, branch, labels }: {
    title: string;
    body: string;
    branch: string;
    labels: string[];
  }): Promise<number> {
    const { owner, repo } = context.repo;

    // Create the pull request
    const { data: pr } = await this.octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branch,
      base: 'main',
    });

    // Add labels if provided
    if (labels.length > 0) {
      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pr.number,
        labels,
      });
    }

    return pr.number;
  }

  /**
   * Retrieves details of a pull request.
   * @param issueUrl - URL of the issue/PR
   * @returns Pull request details from the GitHub API
   */
  async getPR(issueUrl: string): Promise<any> {
    const { owner, repo } = context.repo;
    const prNumber = parseInt(issueUrl.split('/').pop() || '0');

    const { data: pr } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return pr;
  }

  /**
   * Retrieves the list of files modified in a pull request.
   * @param prNumber - Pull request number
   * @returns Array of file information from the GitHub API
   */
  async getPRFiles(prNumber: number): Promise<any[]> {
    const { owner, repo } = context.repo;

    const { data: files } = await this.octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    return files;
  }

  /**
   * Adds a comment to a pull request or issue.
   * @param prNumber - Pull request number
   * @param body - Comment content in markdown format
   * @throws Error if comment creation fails
   */
  async addComment({ prNumber, body }: {
    prNumber: number;
    body: string;
  }): Promise<void> {
    const { owner, repo } = context.repo;

    await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }

  /**
   * Retrieves all files from the repository, excluding GitHub Action files.
   * @returns Array of file objects with path and content
   * @throws Error if file retrieval fails
   */
  async getAllRepositoryFiles(): Promise<Array<{path: string, content: string}>> {
    const { owner, repo } = context.repo;
    const files: Array<{path: string, content: string}> = [];
    
    try {
      // Get the repository content at the root level
      const { data: rootContent } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
      });
      
      // Process each item recursively
      await this.processRepositoryContent(rootContent, '', files);
      
      return files;
    } catch (error) {
      console.error('Error retrieving repository files:', error);
      throw error;
    }
  }
  
  /**
   * Recursively processes repository content to extract all files.
   * @param content - Content items from GitHub API
   * @param basePath - Current base path for recursion
   * @param files - Array to collect file information
   */
  private async processRepositoryContent(
    content: any,
    basePath: string,
    files: Array<{path: string, content: string}>
  ): Promise<void> {
    const { owner, repo } = context.repo;
    
    // Ensure content is an array
    const contentArray = Array.isArray(content) ? content : [content];
    
    for (const item of contentArray) {
      const itemPath = basePath ? `${basePath}/${item.name}` : item.name;
      
      // Skip GitHub Action files, dist folder, and other non-relevant directories
      if (
        itemPath === '.github' ||
        itemPath.startsWith('.github/') ||
        itemPath === 'action.yml' ||
        itemPath === '.git' ||
        itemPath.startsWith('.git/') ||
        itemPath === 'dist' ||
        itemPath.startsWith('dist/') ||
        itemPath === 'node_modules' ||
        itemPath.startsWith('node_modules/')
      ) {
        continue;
      }
      
      if (item.type === 'dir') {
        // Recursively process directories
        const { data: dirContent } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: itemPath,
        });
        
        await this.processRepositoryContent(dirContent, itemPath, files);
      } else if (item.type === 'file') {
        // Get file content
        const { data: fileData } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: itemPath,
        });
        
        // Ensure fileData is not an array and has content property
        if (!Array.isArray(fileData) && 'content' in fileData) {
          // Decode content from base64
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          
          files.push({
            path: itemPath,
            content: content
          });
        }
        
        // No need to push here as we've already done it in the if block
      }
    }
  }
}