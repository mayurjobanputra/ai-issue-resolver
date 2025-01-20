import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { CodeChange, AIServiceConfig, CodeReviewFeedback } from '../types/index.js';
import { SYSTEM_PROMPTS } from '../utils/constants.js';
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { telemetry } from './telemetry-service.js';

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
    telemetry.logAPICall('AIService', 'constructor', { provider: config.provider, modelName: config.modelName });
    try {
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
    } catch (error) {
      telemetry.logError(error as Error, { service: 'AIService', method: 'constructor' });
      throw error;
    }
  }

  /**
   * Analyzes an issue description to extract technical requirements and implementation details.
   * @param issueBody - The full text content of the GitHub issue
   * @returns Technical analysis and recommendations
   */
  async analyzeIssue(issueBody: string): Promise<string> {
    const endTimer = telemetry.startTimer('analyzeIssue');
    try {
      const response = await this.model.invoke([
        new SystemMessage(SYSTEM_PROMPTS.ISSUE_ANALYSIS),
        new HumanMessage(`Analyze this issue and provide a technical summary:\n\n${issueBody}`)
      ]);
      telemetry.logAIOperation('analyzeIssue', this.model.modelName, { issueBody }, 0, true);
      endTimer();
      return response.content.toString();
    } catch (error) {
      telemetry.logError(error as Error, { method: 'analyzeIssue', issueBody });
      endTimer();
      throw error;
    }
  }

  /**
   * Generates code changes based on the provided technical analysis.
   * Uses structured output parsing to ensure consistent change format.
   * @param analysis - Technical analysis of the requirements
   * @returns Array of code changes to implement
   */
  async generateCodeChanges(analysis: string): Promise<CodeChange[]> {
    const endTimer = telemetry.startTimer('generateCodeChanges');
    try {
      const parser = StructuredOutputParser.fromZodSchema(this.codeChangeSchema);
      const formatInstructions = parser.getFormatInstructions();

      const response = await this.model.invoke([
        new SystemMessage(SYSTEM_PROMPTS.CODE_GENERATION),
        new HumanMessage(`${formatInstructions}\nStrictly return valid JSON as per this schema. Do not include anything else. Generate code changes based on this analysis:\n\n${analysis}`)
      ]);

      try {
        const content = response.content.toString();
        telemetry.logAIOperation('generateCodeChanges_response', this.model.modelName, { content }, 0, true);
        
        const parsed = await this.extractJSONFromResponse(content);
        const result = this.codeChangeSchema.parse(parsed);

        telemetry.logAIOperation('generateCodeChanges', this.model.modelName, { analysis, result }, 0, true);
        endTimer();

        return result;
      } catch (error) {
        console.error('Failed to parse code changes:', error);
        return [];
      }
    } catch (error) {
      telemetry.logError(error as Error, { method: 'generateCodeChanges', analysis });
      endTimer();
      throw error;
    }
  }

  /**
   * Attempts to extract and parse JSON content from a string response.
   * First tries direct JSON parsing, then falls back to pattern matching if initial parse fails.
   * 
   * @param content - The string content from which to extract JSON
   * @returns Promise resolving to the parsed JSON object/array
   * @throws {Error} If no valid JSON could be found or parsed from the content
   * 
   * @remarks
   * The method uses two strategies:
   * 1. Direct JSON.parse() of the entire content
   * 2. Regular expression matching to find JSON-like patterns ({} or []) if direct parsing fails
   * 
   * Both parsing attempts are logged via telemetry if they fail.
   */
  private async extractJSONFromResponse(content: string): Promise<any> {
    try {
      // Try direct parsing first
      return JSON.parse(content);
    } catch (parseError) {
      telemetry.logError(parseError as Error, { method: 'extractJSONFromResponse', content });

      // Try to find JSON in the response by looking for array or object patterns
      const matches = content.match(/(\[[\s\S]*\])|(\{[\s\S]*\})/);
      if (matches) {
        const potentialJSON = matches[0];
        try {
          return JSON.parse(potentialJSON);
        } catch (innerError) {
          telemetry.logError(innerError as Error, { method: 'extractJSONFromResponse.inner', potentialJSON });
          throw new Error(`Found JSON-like content but failed to parse: ${(innerError as Error).message}`);
        }
      }
      throw new Error("No valid JSON found in response");
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
    const endTimer = telemetry.startTimer('generateChangesFromFeedback');
    const parser = StructuredOutputParser.fromZodSchema(this.codeChangeSchema);
    const formatInstructions = parser.getFormatInstructions();

    const response = await this.model.invoke([
      new SystemMessage(SYSTEM_PROMPTS.CODE_GENERATION),
      new HumanMessage(`${formatInstructions}\nStrictly return valid JSON as per this schema. Do not include anything else. Generate code changes based on this feedback:\n\n${feedback}\n\nContext:\n${JSON.stringify(files)}`)
    ]);

    try {
      const content = response.content.toString();
      telemetry.logAIOperation('generateChangesFromFeedback_response', this.model.modelName, { content }, 0, true);

      const parsed = await this.extractJSONFromResponse(content);
      const result = this.codeChangeSchema.parse(parsed);

      telemetry.logAIOperation('generateChangesFromFeedback', this.model.modelName, { feedback, files }, 0, true);
      endTimer();
      return result;
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
    const endTimer = telemetry.startTimer('reviewCode');
    const parser = StructuredOutputParser.fromZodSchema(this.reviewSchema);
    const formatInstructions = parser.getFormatInstructions();

    const response = await this.model.invoke([
      new SystemMessage(SYSTEM_PROMPTS.CODE_REVIEW),
      new HumanMessage(`${formatInstructions}\nStrictly return valid JSON as per this schema. Do not include anything else.Review these files and provide comprehensive feedback:\n${JSON.stringify(files, null, 2)}`)
    ]);

    try {
      const content = response.content.toString();
      telemetry.logAIOperation('reviewCode_response', this.model.modelName, { content }, 0, true);

      const parsed = await this.extractJSONFromResponse(content);
      const result = this.reviewSchema.parse(parsed);

      telemetry.logAIOperation('reviewCode', this.model.modelName, { files }, 0, true);
      endTimer();
      return result;
    } catch (error) {
      telemetry.logError(error as Error, { method: 'reviewCode', files });
      endTimer();
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
    const endTimer = telemetry.startTimer('analyzeSecurity');
    try {
      const response = await this.model.invoke([
        new SystemMessage(SYSTEM_PROMPTS.SECURITY_REVIEW),
        new HumanMessage(`Analyze these files for security concerns:\n${JSON.stringify(files)}`)
      ]);

      telemetry.logAIOperation('analyzeSecurity', this.model.modelName, { files }, 0, true);
      endTimer();
      return response.content.toString();
    } catch (error) {
      telemetry.logError(error as Error, { method: 'analyzeSecurity', files });
      endTimer();
      throw error;
    }
  }
}