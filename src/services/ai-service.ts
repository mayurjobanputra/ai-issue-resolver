import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CodeChange, AIServiceConfig, CodeReviewFeedback } from '../types';

export class AIService {
  private model: ChatOpenAI;
  /**
   * Initializes the AIService with the given configuration.
   * @param config - The configuration for the AI service.
   */
  constructor(config: AIServiceConfig) {
    this.model = new ChatOpenAI({
      modelName: config.modelName,
      openAIApiKey: config.apiKey,
      temperature: 0.7,
    });
  }

  /**
   * Analyzes a GitHub issue and provides a technical summary.
   * @param issueBody - The body of the GitHub issue.
   * @returns A technical summary of the issue.
   */
  async analyzeIssue(issueBody: string): Promise<string> {
    const response = await this.model.call([
      new SystemMessage('You are a skilled software engineer analyzing GitHub issues.'),
      new HumanMessage(`Analyze this issue and provide a technical summary:\n\n${issueBody}`),
    ]);

    return response.content as string;
  }

  /**
   * Generates code changes based on the provided analysis.
   * @param analysis - The analysis of the issue.
   * @returns An array of code changes.
   */
  async generateCodeChanges(analysis: string): Promise<CodeChange[]> {
    const response = await this.model.call([
      new SystemMessage('You are a code generation AI assistant.'),
      new HumanMessage(`Generate code changes based on this analysis:\n\n${analysis}`),
    ]);

    return this.parseCodeChanges(response.content as string);
  }

  /**
   * Generates code changes based on feedback and the context of the pull request.
   * @param params - The parameters for generating changes from feedback.
   * @param params.feedback - The feedback provided.
   * @param params.files - The files to consider for changes.
   * @param params.prContext - The context of the pull request.
   * @returns An array of code changes.
   */
  async generateChangesFromFeedback({ feedback, files, prContext }: {
    feedback: string;
    files: any[];
    prContext: any;
  }): Promise<CodeChange[]> {
    const response = await this.model.call([
      new SystemMessage('You are a code review AI assistant.'),
      new HumanMessage(
        `Generate code changes based on this feedback:\n\n${feedback}\n\nContext:\n${JSON.stringify(files)}`
      ),
    ]);

    return this.parseCodeChanges(response.content as string);
  }


  /**
   * Reviews the provided code files and returns comprehensive feedback.
   * 
   * The feedback focuses on the following areas:
   * - Code quality and best practices
   * - Performance optimizations
   * - Security vulnerabilities
   * - Design patterns
   * - Testing coverage
   * 
   * @param files - An array of code files to be reviewed.
   * @returns A promise that resolves to a `CodeReviewFeedback` object containing detailed feedback.
   */
  async reviewCode(files: any[]): Promise<CodeReviewFeedback> {
    const response = await this.model.call([
      new SystemMessage(`You are an expert code reviewer focusing on:
        - Code quality and best practices
        - Performance optimizations
        - Security vulnerabilities
        - Design patterns
        - Testing coverage
        Please provide detailed feedback in these areas.`),
      new HumanMessage(`Review these files and provide comprehensive feedback:
        ${JSON.stringify(files, null, 2)}`)
    ]);

    return this.parseCodeReview(response.content as string);
  }

  /**
   * Suggests improvements for the given file content.
   *
   * @param filePath - The path of the file to be improved.
   * @param content - The content of the file to be improved.
   * @returns A promise that resolves to a string containing the suggested improvements.
   */
  async suggestImprovements(filePath: string, content: string): Promise<string> {
    const response = await this.model.call([
      new SystemMessage('You are an expert code improvement advisor.'),
      new HumanMessage(`Suggest improvements for this file (${filePath}):\n\n${content}`)
    ]);

    return response.content as string;
  }

  /**
   * Analyzes the provided files for common security issues.
   * 
   * This method uses a security-focused code review model to identify potential 
   * security vulnerabilities in the given files. The model looks for issues such as:
   * - Input validation vulnerabilities
   * - Authentication/authorization issues
   * - Data exposure risks
   * - Injection vulnerabilities
   * - Insecure dependencies
   * 
   * @param files - An array of files to be analyzed for security concerns.
   * @returns A promise that resolves to a string containing the analysis results.
   */
  async analyzeSecurity(files: any[]): Promise<string> {
    const response = await this.model.call([
      new SystemMessage(`You are a security-focused code reviewer. 
        Look for common security issues such as:
        - Input validation vulnerabilities
        - Authentication/authorization issues
        - Data exposure risks
        - Injection vulnerabilities
        - Insecure dependencies`),
      new HumanMessage(`Analyze these files for security concerns:\n${JSON.stringify(files)}`)
    ]);

    return response.content as string;
  }

  /**
   * Parses the response content into an array of code changes.
   * @param content - The response content from the AI model.
   * @returns An array of code changes.
   */
  private parseCodeChanges(content: string): CodeChange[] {
    try {
      return JSON.parse(content) as CodeChange[];
    } catch {
      return [];
    }
  }

  /**
   * Parses the given JSON string content into a `CodeReviewFeedback` object.
   * If the parsing fails, it returns a default `CodeReviewFeedback` object with empty arrays.
   *
   * @param content - The JSON string content to be parsed.
   * @returns The parsed `CodeReviewFeedback` object or a default object if parsing fails.
   */
  private parseCodeReview(content: string): CodeReviewFeedback {
    try {
      return JSON.parse(content) as CodeReviewFeedback;
    } catch {
      return {
        qualityIssues: [],
        securityIssues: [],
        improvements: [],
        testingSuggestions: []
      };
    }
  }
}