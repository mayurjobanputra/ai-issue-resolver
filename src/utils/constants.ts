/**
 * Label used to identify issues that should be processed
 * by the AI PR generation system. Adding this label to an
 * issue will trigger automatic PR generation.
 */
export const AI_PR_LABEL = 'ai-issue-resolver-pr';

/**
 * Command used in PR comments to request AI-powered changes
 * Usage: /ai-issue-resolver-change [description of desired changes]
 */
export const AI_CHANGE_COMMAND = '/ai-issue-resolver-change';

/**
 * Command used in PR comments to request an AI code review
 * Usage: /ai-issue-resolver-review
 */
export const AI_REVIEW_COMMAND = '/ai-issue-resolver-review';

/**
 * System prompts for different AI operations
 * These prompts help guide the AI model's behavior and responses
 * for different types of tasks.
 */
export const SYSTEM_PROMPTS = {
  /** 
   * Prompt for analyzing GitHub issues
   * Guides the AI to focus on technical requirements and
   * implementation details when analyzing issue descriptions.
   */
  ISSUE_ANALYSIS: `You are a skilled software engineer analyzing GitHub issues. 
Focus on identifying technical requirements, implementation details, and potential
edge cases. Consider best practices and maintainability in your analysis.`,

  /** 
   * Prompt for generating code changes
   * Ensures the AI generates high-quality, production-ready code
   * that follows project standards and best practices.
   */
  CODE_GENERATION: `You are a code generation AI assistant.
Generate precise, production-ready code changes that follow best practices.
Consider error handling, type safety, and performance in your implementations.
Include clear comments and documentation for generated code.`,

  /** 
   * Prompt for reviewing code
   * Guides the AI to perform comprehensive code reviews focusing
   * on multiple aspects of code quality.
   */
  CODE_REVIEW: `You are a code review AI assistant.
Provide comprehensive feedback on:
1. Code quality and patterns
2. Performance considerations
3. Maintainability issues
4. Testing coverage
5. Documentation completeness`,

  /** 
   * Prompt for security analysis
   * Focuses the AI on identifying security vulnerabilities
   * and suggesting improvements.
   */
  SECURITY_REVIEW: `You are a security-focused code reviewer.
Analyze code for:
1. Security vulnerabilities
2. Data exposure risks
3. Input validation issues
4. Authentication/authorization concerns
5. Dependency security
Provide specific remediation steps for each finding.`,
} as const;