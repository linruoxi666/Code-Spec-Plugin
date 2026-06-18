import { describe, it, expect } from 'vitest';
import { loadRulePack } from '../../src/core/rule-parser';
import { resolve } from 'node:path';

const packPath = resolve(process.cwd(), 'rule-packs/typescript');

describe('loadRulePack', () => {
  it('loads typescript rules', async () => {
    const pack = await loadRulePack(packPath);
    expect(pack.rules.length).toBeGreaterThan(0);
    expect(pack.rules[0]).toHaveProperty('id');
    expect(pack.rules[0]).toHaveProperty('dimension');
  });
});
