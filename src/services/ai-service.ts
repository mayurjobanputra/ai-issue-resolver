import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { CodeChange, AIServiceConfig, CodeReviewFeedback } from '../types';

export class AIService {
  private model: ChatOpenAI;

  constructor(config: AIServiceConfig) {
    this.model = new ChatOpenAI({
      modelName: config.modelName,
      openAIApiKey: config.apiKey,
      temperature: 0.7,
    });
  }

  async analyzeIssue(issueBody: string): Promise<string> {
    const response = await this.model.call([
      new SystemMessage('You are a skilled software engineer analyzing GitHub issues.'),
      new HumanMessage(`Analyze this issue and provide a technical summary:\n\n${issueBody}`),
    ]);

    return response.content as string;
  }

  async generateCodeChanges(analysis: string): Promise<CodeChange[]> {
    const response = await this.model.call([
      new SystemMessage('You are a code generation AI assistant.'),
      new HumanMessage(`Generate code changes based on this analysis:\n\n${analysis}`),
    ]);

    return this.parseCodeChanges(response.content as string);
  }

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

  async suggestImprovements(filePath: string, content: string): Promise<string> {
    const response = await this.model.call([
      new SystemMessage('You are an expert code improvement advisor.'),
      new HumanMessage(`Suggest improvements for this file (${filePath}):\n\n${content}`)
    ]);

    return response.content as string;
  }

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

  private parseCodeChanges(content: string): CodeChange[] {
    try {
      return JSON.parse(content) as CodeChange[];
    } catch {
      return [];
    }
  }

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