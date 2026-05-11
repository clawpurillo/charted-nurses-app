// Convex actions are exposed at /api/run/<functionName>
// The signIn action expects: { provider, params, verifier?, refreshToken?, calledBy? }
// For password signUp: provider='password', params={flow:'signUp', email, password, name}

async function signUp() {
  const url = 'https://content-iguana-935.convex.cloud/api/run/auth:signIn';
  
  const body = {
    args: {
      provider: 'password',
      params: {
        flow: 'signUp',
        email: 'qa-test@charted.test',
        password: 'QaTest2026!secure',
        name: 'QA Test User'
      }
    }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  console.log('Status:', resp.status);
  console.log('Body:', text);
  
  if (resp.ok) {
    const data = JSON.parse(text);
    console.log('Parsed:', JSON.stringify(data, null, 2));
  }
}

signUp().catch(err => console.error('Error:', err));
