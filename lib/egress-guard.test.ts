/**
 * The egress guard is a security control. An untested security control is a
 * comment claiming a security control.
 *
 * Run with:  node --test --experimental-strip-types lib/egress-guard.test.ts
 *
 * Deliberately node:test and not Playwright. This repo ships a
 * playwright.config.ts but has never depended on @playwright/test, so that
 * config cannot load and nothing in e2e/ has ever run. node:test is in the
 * runtime, needs no dependency, and therefore cannot rot the same way.
 *
 * Every case is a shape the 39 CodeQL js/request-forgery findings could
 * actually be pointed at.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201 · 2026-08-29
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardUrl, guardedFetch, isBlockedIp, urlSegment, EgressBlockedError } from './egress-guard.ts';

const MUST_BLOCK: ReadonlyArray<readonly [string, string]> = [
  ['http://169.254.169.254/latest/meta-data/',         'AWS/Azure instance metadata'],
  ['http://metadata.google.internal/computeMetadata/', 'GCP metadata by name'],
  ['http://127.0.0.1:6379/',                           'loopback Redis'],
  ['http://localhost:3000/admin',                      'loopback by name'],
  ['http://10.0.0.5/',                                 'RFC1918 10/8'],
  ['http://192.168.1.1/',                              'RFC1918 192.168/16'],
  ['http://172.16.0.1/',                               'RFC1918 172.16/12'],
  ['http://100.64.0.1/',                               'CGNAT 100.64/10'],
  ['http://[::1]:8080/',                               'IPv6 loopback'],
  ['http://[fd00::1]/',                                'IPv6 ULA'],
  ['http://[::ffff:127.0.0.1]/',                       'IPv4-mapped loopback'],
  ['file:///etc/passwd',                               'file scheme'],
  ['gopher://evil.example.com/',                       'gopher scheme'],
  ['data:text/html,<script>',                          'data scheme'],
  ['http://user:secret@example.com/',                  'credentials embedded in URL'],
  ['not a url',                                        'unparseable'],
  ['http://something.internal/',                       '.internal suffix'],
  ['http://svc.cluster.local/',                        '.cluster.local suffix'],
];

for (const [url, why] of MUST_BLOCK) {
  test(`blocks ${why}`, async () => {
    const verdict = await guardUrl(url);
    assert.equal(verdict.allowed, false, `${url} was allowed: ${verdict.reason}`);
    assert.notEqual(verdict.reason, '');
  });
}

test('allows ordinary public https', async () => {
  assert.equal((await guardUrl('https://example.com/x')).allowed, true);
});

// javari-scrapbook sent its Unsplash key in an Authorization header to whatever
// host the query string named. Private-range checks do not stop that; only
// pinning does. These four cases are the ones a lazy implementation gets wrong.
const PIN = { allowHosts: ['.unsplash.com'] } as const;

test('pinning allows the domain and its subdomains', async () => {
  assert.equal((await guardUrl('https://unsplash.com/p', PIN)).allowed, true);
  assert.equal((await guardUrl('https://api.unsplash.com/p', PIN)).allowed, true);
  assert.equal((await guardUrl('https://images.unsplash.com/p', PIN)).allowed, true);
});

test('pinning refuses a lookalike that merely ends with the name', async () => {
  assert.equal((await guardUrl('https://notunsplash.com/p', PIN)).allowed, false);
});

test('pinning refuses the name used as a subdomain of somewhere else', async () => {
  assert.equal((await guardUrl('https://unsplash.com.evil.example/p', PIN)).allowed, false);
});

test('pinning refuses an unrelated public host', async () => {
  assert.equal((await guardUrl('https://evil.example/p', PIN)).allowed, false);
});

test('isBlockedIp: public passes, metadata and garbage refuse', () => {
  assert.equal(isBlockedIp('8.8.8.8'), false);
  assert.equal(isBlockedIp('169.254.169.254'), true);
  assert.equal(isBlockedIp('nonsense'), true);
});

test('urlSegment escapes traversal out of the intended endpoint', () => {
  assert.equal(urlSegment('../../v7/finance/quote'), '..%2F..%2Fv7%2Ffinance%2Fquote');
});

test('urlSegment escapes a break that would truncate the real query string', () => {
  assert.equal(urlSegment('AAPL?interval=evil'), 'AAPL%3Finterval%3Devil');
});

test('urlSegment rejects a value that does not match the declared shape', () => {
  assert.throws(() => urlSegment('!!!!', /^[A-Z.\-]{1,10}$/), EgressBlockedError);
});

test('urlSegment passes a value that does', () => {
  assert.equal(urlSegment('AAPL', /^[A-Z.\-]{1,10}$/), 'AAPL');
});

test('guardedFetch refuses before it opens a socket', async () => {
  await assert.rejects(() => guardedFetch('http://169.254.169.254/'), EgressBlockedError);
});
