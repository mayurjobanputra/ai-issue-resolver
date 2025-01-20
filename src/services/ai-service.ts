import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CodeChange, AIServiceConfig, CodeReviewFeedback } from '../types/index.js';
import { SYSTEM_PROMPTS } from '../utils/constants.js';
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

/**
 * AIService manages AI-powered operations using Langchain and LLM models.
 * It provides capabilities for code analysis, generation, and review using
 * various AI models and structured output parsing.
 */
export class AIService {
  private model: ChatOpenAI;
  private codeChangeSchema: z.ZodSchema<CodeChange[]>;
  private reviewSchema: z.ZodSchema<CodeReviewFeedback>;

  /**
   * Creates a new instance of AIService with the specified configuration.
   * Initializes the AI model and defines the output schemas for structured responses.
   * @param config - Configuration object containing provider, model, and API key
   */
  constructor(config: AIServiceConfig) {
    // Initialize the AI model with configuration
    this.model = new ChatOpenAI({
      modelName: config.modelName,
      openAIApiKey: config.apiKey,
      temperature: 0.7, // Balance between creativity and consistency
    });

    // Define schema for code changes output
    this.codeChangeSchema = z.array(z.object({
      path: z.string(),
      content: z.string(),
      message: z.string(),
    }));

    // Define comprehensive schema for code review feedback
    this.reviewSchema = z.object({
      qualityIssues: z.array(z.object({
        type: z.enum(['performance', 'maintainability', 'complexity']),
        file: z.string(),
        description: z.string(),
        suggestion: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      })),
      securityIssues: z.array(z.object({
        type: z.string(),
        file: z.string(),
        description: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        remediation: z.string(),
      })),
      improvements: z.array(z.object({
        file: z.string(),
        description: z.string(),
        suggestion: z.string(),
      })),
      testingSuggestions: z.array(z.object({
        file: z.string(),
        description: z.string(),
        testCases: z.array(z.string()),
      })),
    });
  }

  /**
   * Analyzes an issue description to extract technical requirements and implementation details.
   * @param issueBody - The full text content of the GitHub issue
   * @returns Technical analysis and recommendations
   */
  async analyzeIssue(issueBody: string): Promise<string> {
    const response = await this.model.invoke([
      new SystemMessage(SYSTEM_PROMPTS.ISSUE_ANALYSIS),
      new HumanMessage(`Analyze this issue and provide a technical summary:\n\n${issueBody}`)
    ]);
    return response.content.toString();
  }

  /**
   * Generates code changes based on the provided technical analysis.
   * Uses structured output parsing to ensure consistent change format.
   * @param analysis - Technical analysis of the requirements
   * @returns Array of code changes to implement
   */
  async generateCodeChanges(analysis: string): Promise<CodeChange[]> {
    const parser = StructuredOutputParser.fromZodSchema(this.codeChangeSchema);
    const formatInstructions = parser.getFormatInstructions();

    const response = await this.model.invoke([
      new SystemMessage(SYSTEM_PROMPTS.CODE_GENERATION),
      new HumanMessage(`${formatInstructions}\nStrictly return valid JSON as per this schema. Do not include anything else. Generate code changes based on this analysis:\n\n${analysis}`)
    ]);

    try {
      const parsed = JSON.parse(response.content.toString());
      return this.codeChangeSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse code changes:', error);
      return [];
    }
  }

  /**
   * Generates code changes based on PR feedback and context.
   * Considers both the feedback and the current state of files in the PR.
   * @param feedback - User-provided feedback requesting changes
   * @param files - Array of files currently in the PR
   * @param prContext - Additional context about the PR
   * @returns Array of code changes to implement
   */
  async generateChangesFromFeedback({ feedback, files, prContext }: {
    feedback: string;
    files: any[];
    prContext: any;
  }): Promise<CodeChange[]> {
    const parser = StructuredOutputParser.fromZodSchema(this.codeChangeSchema);
    const formatInstructions = parser.getFormatInstructions();

    const response = await this.model.invoke([
      new SystemMessage(SYSTEM_PROMPTS.CODE_GENERATION),
      new HumanMessage(`${formatInstructions}\nStrictly return valid JSON as per this schema. Do not include anything else. Generate code changes based on this feedback:\n\n${feedback}\n\nContext:\n${JSON.stringify(files)}`)
    ]);

    try {
      const parsed = JSON.parse(response.content.toString());
      return this.codeChangeSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse feedback changes:', error);
      return [];
    }
  }

  /**
   * Performs a comprehensive code review on provided files.
   * Reviews code quality, security, improvements, and testing needs.
   * @param files - Array of files to review
   * @returns Structured feedback on various aspects of the code
   */
  async reviewCode(files: any[]): Promise<CodeReviewFeedback> {
    const parser = StructuredOutputParser.fromZodSchema(this.reviewSchema);
    const formatInstructions = parser.getFormatInstructions();

    const response = await this.model.invoke([
      new SystemMessage(SYSTEM_PROMPTS.CODE_REVIEW),
      new HumanMessage(`${formatInstructions}\nStrictly return valid JSON as per this schema. Do not include anything else.Review these files and provide comprehensive feedback:\n${JSON.stringify(files, null, 2)}`)
    ]);

    try {
      const parsed = JSON.parse(response.content.toString());
      return this.reviewSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse code review:', error);
      return {
        qualityIssues: [],
        securityIssues: [],
        improvements: [],
        testingSuggestions: []
      };
    }
  }

  /**
   * Performs a security-focused analysis of the provided code files.
   * Identifies potential vulnerabilities and security concerns.
   * @param files - Array of files to analyze for security issues
   * @returns Detailed security analysis report
   */
  async analyzeSecurity(files: any[]): Promise<string> {
    const response = await this.model.invoke([
      new SystemMessage(SYSTEM_PROMPTS.SECURITY_REVIEW),
      new HumanMessage(`Strictly return valid JSON as per this schema. Do not include anything else. Analyze these files for security concerns:\n${JSON.stringify(files)}`)
    ]);
    return response.content.toString();
  }
}