export interface FreshnessRule {
  name: string;
  current: string;
  recommended: string;
  message: string;
}

const RECOMMENDED_VERSIONS: Record<string, string> = {
  TypeScript: '5.7',
  React: '19',
  'Next.js': '14',
  Vue: '3',
};

export function checkFreshness(frameworks: string[], detectedVersions: Record<string, string> = {}): FreshnessRule[] {
  const warnings: FreshnessRule[] = [];
  for (const fw of frameworks) {
    const recommended = RECOMMENDED_VERSIONS[fw];
    if (!recommended) continue;
    const current = detectedVersions[fw];
    if (current && !current.startsWith(recommended.split('.')[0])) {
      warnings.push({
        name: fw,
        current,
        recommended,
        message: `${fw} 当前 ${current}，建议升级到 ${recommended}+`,
      });
    }
  }
  return warnings;
}
