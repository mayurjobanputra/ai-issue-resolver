import { Octokit } from '@octokit/rest';
import { context } from '@actions/github';

export class GitHubService {
  constructor(private octokit: Octokit) {}

  /**
   * Creates a new branch from the main branch.
   * @param branchName - The name of the new branch.
   */
  async createBranch(branchName: string): Promise<void> {
    const { owner, repo } = context.repo;
    const { data: ref } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });

    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });
  }

  /**
   * Commits a change to a specified branch.
   * @param params - The parameters for the commit.
   * @param params.branch - The branch to commit to.
   * @param params.path - The file path to change.
   * @param params.content - The new content for the file.
   * @param params.message - The commit message.
   */
  async commitChange({ branch, path, content, message }: {
    branch: string;
    path: string;
    content: string;
    message: string;
  }): Promise<void> {
    const { owner, repo } = context.repo;
    
    const { data: currentFile } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    }).catch(() => ({ data: null }));

    await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha: Array.isArray(currentFile) ? undefined : currentFile?.sha,
    });
  }

  /**
   * Creates a pull request.
   * @param params - The parameters for the pull request.
   * @param params.title - The title of the pull request.
   * @param params.body - The body description of the pull request.
   * @param params.branch - The branch to merge from.
   * @param params.labels - The labels to add to the pull request.
   */
  async createPR({ title, body, branch, labels }: {
    title: string;
    body: string;
    branch: string;
    labels: string[];
  }): Promise<void> {
    const { owner, repo } = context.repo;

    const { data: pr } = await this.octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branch,
      base: 'main',
    });

    if (labels.length > 0) {
      await this.octokit.issues.addLabels({
        owner,
        repo,
        issue_number: pr.number,
        labels,
      });
    }
  }

  /**
   * Retrieves a pull request by its URL.
   * @param issueUrl - The URL of the pull request.
   * @returns The pull request data.
   */
  async getPR(issueUrl: string): Promise<any> {
    const { owner, repo } = context.repo;
    const prNumber = parseInt(issueUrl.split('/').pop() || '0');

    const { data: pr } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return pr;
  }

  /**
   * Retrieves the files changed in a pull request.
   * @param prNumber - The number of the pull request.
   * @returns An array of files changed in the pull request.
   */
  async getPRFiles(prNumber: number): Promise<any[]> {
    const { owner, repo } = context.repo;

    const { data: files } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    return files;
  }

  /**
   * Adds a comment to a pull request.
   * @param params - The parameters for the comment.
   * @param params.prNumber - The number of the pull request.
   * @param params.body - The content of the comment.
   */
  async addComment({ prNumber, body }: {
    prNumber: number;
    body: string;
  }): Promise<void> {
    const { owner, repo } = context.repo;

    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }
}
