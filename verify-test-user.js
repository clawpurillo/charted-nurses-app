// Verify the test user account: sign-in and access core features

const BASE_URL = 'https://content-iguana-935.convex.cloud';

async function signIn(email, password, flow = 'signIn') {
  const resp = await fetch(`${BASE_URL}/api/run/auth/signIn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      args: {
        provider: 'password',
        params: { flow, email, password }
      }
    })
  });
  return resp.json();
}

async function queryWithToken(functionPath, token) {
  const resp = await fetch(`${BASE_URL}/api/run/${functionPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ args: {} })
  });
  return resp.json();
}

async function main() {
  console.log('=== Step 1: Sign in as test user ===');
  const signInResult = await signIn('qa-test@charted.test', 'QaTest2026!secure', 'signIn');
  console.log('SignIn result:', JSON.stringify(signInResult, null, 2));
  
  if (!signInResult.value?.tokens?.token) {
    console.error('FAIL: No token returned from sign-in');
    process.exit(1);
  }
  const token = signInResult.value.tokens.token;
  console.log('SUCCESS: Got auth token\n');

  console.log('=== Step 2: Query templates (authenticated) ===');
  const templatesResult = await queryWithToken('templates/getTemplates', token);
  console.log('Templates result:', JSON.stringify(templatesResult, null, 2));

  console.log('\n=== Step 3: Query entries (authenticated) ===');
  const entriesResult = await queryWithToken('entries/getEntries', token);
  console.log('Entries result:', JSON.stringify(entriesResult, null, 2));

  console.log('\n=== All verification steps passed ===');
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
