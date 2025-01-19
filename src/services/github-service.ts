import { Octokit } from '@octokit/rest';
import { context } from '@actions/github';

export class GitHubService {
  constructor(private octokit: Octokit) {}

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
      sha: currentFile?.sha,
    });
  }

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

  async getPRFiles(prNumber: number): Promise<any[]> {
    const { owner, repo } = context.repo;

    const { data: files } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    return files;
  }

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
