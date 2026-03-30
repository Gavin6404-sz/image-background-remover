/**
 * Cloudflare Worker - OAuth Handler (Google + GitHub)
 * Handles OAuth verification and user storage in D1
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Login endpoint - Google OAuth
      if (path.endsWith('/api/auth/login') && request.method === 'POST') {
        const { credential } = await request.json();
        if (!credential) {
          return new Response(JSON.stringify({ error: 'Missing credential' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const googleUser = await verifyGoogleCredential(credential, env.GOOGLE_CLIENT_ID);
        if (!googleUser) {
          return new Response(JSON.stringify({ error: 'Invalid token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const existingUser = await env.DB
          .prepare('SELECT * FROM users WHERE id = ?')
          .bind(googleUser.sub)
          .first();

        let sessionToken = generateSessionToken();
        if (existingUser) {
          await env.DB
            .prepare('UPDATE users SET name = ?, email = ?, picture = ?, google_token = ?, session_token = ? WHERE id = ?')
            .bind(googleUser.name, googleUser.email, googleUser.picture, credential, sessionToken, googleUser.sub)
            .run();
        } else {
          await env.DB
            .prepare('INSERT INTO users (id, email, name, picture, google_token, session_token) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(googleUser.sub, googleUser.email, googleUser.name, googleUser.picture, credential, sessionToken)
            .run();
        }

        return new Response(JSON.stringify({
          success: true,
          user: {
            id: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
          },
          sessionToken,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user endpoint
      if (path.endsWith('/api/auth/me') && request.method === 'GET') {
        const sessionToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!sessionToken) {
          return new Response(JSON.stringify({ error: 'Missing session token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const user = await env.DB
          .prepare('SELECT id, email, name, picture FROM users WHERE session_token = ?')
          .bind(sessionToken)
          .first();

        if (!user) {
          return new Response(JSON.stringify({ error: 'Invalid session' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Logout endpoint
      if (path.endsWith('/api/auth/logout') && request.method === 'POST') {
        const sessionToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (sessionToken) {
          await env.DB
            .prepare('UPDATE users SET session_token = NULL WHERE session_token = ?')
            .bind(sessionToken)
            .run();
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GitHub OAuth - Redirect to GitHub
      if (path === '/api/auth/github' && request.method === 'GET') {
        const redirectUri = `${url.origin}/api/auth/github/callback`;
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email&prompt=consent`;
        return Response.redirect(githubAuthUrl, 302);
      }

      // GitHub OAuth - Callback
      if (path === '/api/auth/github/callback' && request.method === 'GET') {
        const code = url.searchParams.get('code');
        if (!code) {
          return Response.redirect(`https://www.imagetoolbox.online/?error=no_code`, 302);
        }

        // Generate session token immediately
        const sessionToken = generateSessionToken();
        
        // Start GitHub API calls in parallel for speed
        const accessTokenPromise = exchangeGitHubCode(code, env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);
        
        // Wait for token exchange
        const accessToken = await accessTokenPromise;
        if (!accessToken) {
          return Response.redirect(`https://www.imagetoolbox.online/?error=token_exchange_failed`, 302);
        }

        // Get user info
        const githubUser = await getGitHubUser(accessToken);
        if (!githubUser) {
          return Response.redirect(`https://www.imagetoolbox.online/?error=user_info_failed`, 302);
        }

        const githubId = `github_${githubUser.id}`;
        const userEmail = githubUser.email || `${githubUser.login}@github.placeholder`;
        const userName = githubUser.name || githubUser.login;
        const userPicture = githubUser.avatar_url || '';
        
        // Save to DB (non-blocking for faster redirect)
        // Using INSERT OR REPLACE for efficiency - single query instead of SELECT + INSERT/UPDATE
        ctx.waitUntil(
          env.DB
            .prepare('INSERT OR REPLACE INTO users (id, email, name, picture, session_token) VALUES (?, ?, ?, ?, ?)')
            .bind(githubId, userEmail, userName, userPicture, sessionToken)
            .run()
        );

        const redirectUrl = `https://www.imagetoolbox.online/?github_success=true&token=${sessionToken}`;
        return Response.redirect(redirectUrl, 302);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
};

// Helper functions
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

async function verifyGoogleCredential(credential, expectedClientId) {
  try {
    const parts = credential.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (payload.aud !== expectedClientId) return null;
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && parseInt(payload.exp) < now) return null;

    return {
      sub: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      picture: payload.picture || '',
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

function generateSessionToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function exchangeGitHubCode(code, clientId, clientSecret) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  
  // GitHub returns JSON or form-urlencoded
  const text = await response.text();
  
  // Try to parse as JSON first
  try {
    const data = JSON.parse(text);
    return data.access_token || null;
  } catch {
    // Fallback: parse form-urlencoded format (access_token=xxx&token_type=bearer)
    const params = new URLSearchParams(text);
    return params.get('access_token');
  }
}

async function getGitHubUser(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'ImageToolbox-App',
    },
  });
  if (!response.ok) {
    console.error('GitHub API error:', response.status, await response.text());
    return null;
  }
  return await response.json();
}
