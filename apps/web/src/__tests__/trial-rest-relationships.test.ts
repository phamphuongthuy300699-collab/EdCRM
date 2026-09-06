import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// PostgREST resolves embeddings even when trial_events is empty. Both teacher_id
// and created_by reference profiles, so an unqualified embed returns PGRST201.
describe('trial teacher relationship regression', () => {
  it.each(['src/app/api/crm/schedule/route.ts', 'src/app/api/crm/trials/route.ts'])('%s selects the teacher rather than the creator', (file) => {
    const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
    const trialSelects = [...source.matchAll(/\.from\("trial_events"\)\s*\.select\(\s*"([^"]+)"/g)].map(match => match[1]);
    expect(trialSelects.length).toBeGreaterThan(0);
    for (const select of trialSelects.filter(value => value.includes('profiles'))) {
      expect(select).toContain('profiles!trial_events_teacher_id_fkey(full_name)');
    }
  });
});
