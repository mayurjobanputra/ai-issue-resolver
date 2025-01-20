import { run } from '../src/index';

// Set up environment for testing
process.env.GITHUB_EVENT_NAME = 'issues';
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
process.env.GITHUB_EVENT_PATH = './test/__mocks__/test-event.json';
process.env.GITHUB_WORKSPACE = process.cwd();

// Write test event file
import { writeFileSync } from 'fs';
const testEvent = {
  action: 'labeled',
  issue: {
    number: 1,
    title: 'Test Issue',
    body: 'This is a test issue for local development',
    labels: [{ name: 'ai-issue-resolver' }]
  },
  repository: {
    owner: {
      login: 'test-owner'
    },
    name: 'test-repo'
  }
};
writeFileSync('./__mocks__/test-event.json', JSON.stringify(testEvent, null, 2));

// Verify required secrets exist
if (!process.env.GITHUB_TOKEN || !process.env.MODEL_API_KEY) {
  console.error('Error: Required secrets are missing!');
  console.error('Please ensure both GITHUB_TOKEN and MODEL_API_KEY are set in your environment.');
  process.exit(1);
}

// Set up required environment variables for the action
process.env.INPUT_GITHUB_TOKEN = process.env.GITHUB_TOKEN;
process.env.INPUT_MODEL_API_KEY = process.env.MODEL_API_KEY;
process.env.INPUT_MODEL_PROVIDER = 'openai';
process.env.INPUT_MODEL_NAME = 'gpt-4';

// Run the action
console.log('Starting local test...');
console.log('Using test event:', testEvent);
run().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
