/**
 * Represents a single code change to be made by the AI
 * This is used when generating or modifying code in response
 * to issues or PR comments.
 */
export interface CodeChange {
  /** The relative path to the file being changed */
  path: string;
  /** The new content for the file */
  content: string;
  /** Descriptive commit message explaining the change */
  message: string;
}

/**
 * Represents a GitHub issue that triggered the action
 * Contains the essential information needed to process
 * the issue and generate appropriate code changes.
 */
export interface Issue {
  /** The issue number in the repository */
  number: number;
  /** The title of the issue */
  title: string;
  /** The full description/body of the issue */
  body: string;
  /** Labels attached to the issue */
  labels: Array<{ name: string }>;
}

/**
 * Represents a GitHub comment that contains AI commands
 * Used to trigger various AI-powered operations on PRs.
 */
export interface Comment {
  /** The content of the comment */
  body: string;
  /** URL of the associated issue/PR */
  issue_url: string;
}

/**
 * Configuration options for the AI service
 * Defines which AI provider and model to use for
 * code generation and analysis.
 */
export interface AIServiceConfig {
  /** The AI provider (e.g., 'openai', 'anthropic') */
  provider: string;
  /** The specific model to use (e.g., 'gpt-4') */
  modelName: string;
  /** Authentication key for the AI service */
  apiKey: string;
}

/**
 * Structured feedback from AI code review
 * Contains various aspects of code analysis categorized
 * by type and severity.
 */
export interface CodeReviewFeedback {
  /** Code quality issues found during review */
  qualityIssues: Array<{
    /** Type of quality issue identified */
    type: 'performance' | 'maintainability' | 'complexity';
    /** File where the issue was found */
    file: string;
    /** Detailed description of the issue */
    description: string;
    /** Proposed solution or improvement */
    suggestion: string;
    /** Impact level of the issue */
    severity: 'low' | 'medium' | 'high';
  }>;
  /** Security vulnerabilities and concerns */
  securityIssues: Array<{
    /** Type of security vulnerability */
    type: string;
    /** Affected file */
    file: string;
    /** Description of the security issue */
    description: string;
    /** Criticality level */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Steps to fix the security issue */
    remediation: string;
  }>;
  /** General code improvements suggested */
  improvements: Array<{
    /** Target file for improvement */
    file: string;
    /** What can be improved */
    description: string;
    /** How to implement the improvement */
    suggestion: string;
  }>;
  /** Suggestions for additional tests */
  testingSuggestions: Array<{
    /** File needing tests */
    file: string;
    /** What aspects need testing */
    description: string;
    /** Specific test cases to implement */
    testCases: string[];
  }>;
}