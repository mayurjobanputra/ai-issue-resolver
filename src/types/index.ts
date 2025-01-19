export interface CodeChange {
  path: string;
  content: string;
  message: string;
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
}

export interface Comment {
  body: string;
  issue_url: string;
}

export interface AIServiceConfig {
  provider: string;
  modelName: string;
  apiKey: string;
}

export interface CodeReviewFeedback {
  qualityIssues: Array<{
    type: 'performance' | 'maintainability' | 'complexity';
    file: string;
    description: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  securityIssues: Array<{
    type: string;
    file: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    remediation: string;
  }>;
  improvements: Array<{
    file: string;
    description: string;
    suggestion: string;
  }>;
  testingSuggestions: Array<{
    file: string;
    description: string;
    testCases: string[];
  }>;
}