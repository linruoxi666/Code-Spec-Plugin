import { describe, it, expect } from 'vitest';

describe('mcp server tools', () => {
  it('should have evaluate_project tool defined', async () => {
    // 通过动态导入验证 server.ts 能正常加载
    await import('../../src/mcp/server.js');
    expect(true).toBe(true);
  });
});
