import dotenv from 'dotenv';
import { beforeAll, afterAll } from '@jest/globals';

dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  console.log('🧪 Test setup starting...');
});

afterAll(async () => {
  console.log('🧪 Test cleanup completed');
});

global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};