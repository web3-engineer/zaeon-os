import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { qualifyAndroid } from './android-capabilities.mjs';

test('missing JAR never qualifies even when java and REA are installed', async () => {
  const r = await qualifyAndroid({ jar: '/missing.jar', probe: async () => '21' });
  assert.equal(r.ok, false);
  assert.equal(r.checks.jar, false);
});
test('tampered JAR fails; full JDK and ps are required', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rea-cap-'));
  try {
    const jar = join(dir, 'engine.jar'); await writeFile(jar, 'hello');
    const probe = async (cmd) => cmd === 'java' ? 'jdk.compiler@21' : cmd === 'rea' ? '6.5.0' : 'ok';
    assert.equal((await qualifyAndroid({ jar, probe })).ok, false);
    const hash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
    assert.equal((await qualifyAndroid({ jar, expectedHash: hash, probe })).ok, true);
    assert.equal((await qualifyAndroid({ jar, expectedHash: hash, probe: async (cmd) => { if (cmd === 'ps') throw Error('missing'); return probe(cmd); } })).ok, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
