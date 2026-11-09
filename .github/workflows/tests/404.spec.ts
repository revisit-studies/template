// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { expect, test, vi } from 'vitest';

const html = readFileSync(fileURLToPath(new URL('../../../public/404.html', import.meta.url)), 'utf8');
const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1];

test.each(['supabase', 'dev', 'dev-supabase', 'PR123', 'my-study'])('redirects %s study routes through the template root', (study) => {
  const replace = vi.fn();
  runInNewContext(script, {
    window: {
      location: {
        protocol: 'https:',
        hostname: 'example.com',
        port: '',
        pathname: `/template/${study}/trial`,
        search: '?a=1&b=2',
        hash: '#response',
        replace,
      },
    },
  });
  expect(replace).toHaveBeenCalledWith(`https://example.com/template/?/${study}/trial&a=1~and~b=2#response`);
});

test('does not recursively encode an existing redirect', () => {
  const replace = vi.fn();
  runInNewContext(script, {
    window: {
      location: {
        protocol: 'https:',
        hostname: 'example.com',
        port: '',
        pathname: '/template/',
        search: '?/supabase/trial',
        hash: '',
        replace,
      },
    },
  });
  expect(replace).not.toHaveBeenCalled();
});
