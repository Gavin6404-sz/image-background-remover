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
          .prepare('SELECT id, email, name, picture, created_at FROM users WHERE session_token = ?')
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

      // ========== User Quota Endpoints ==========

      // GET /api/user/quotas - Get all quota status for user
      if (path.endsWith('/api/user/quotas') && request.method === 'GET') {
        const userId = await getUserIdFromRequest(request, env);
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get free quota transactions to calculate free usage (only negative = actual usage)
        const freeUsage = await env.DB
          .prepare('SELECT SUM(amount) as total FROM quota_transactions WHERE user_id = ? AND quota_type = ? AND amount < 0')
          .bind(userId, 'free')
          .first();

        // Get subscription info
        const subscription = await env.DB
          .prepare('SELECT us.*, sp.plan_name, sp.display_name as plan_display_name, sp.quota_monthly FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id WHERE us.user_id = ? AND us.status = ?')
          .bind(userId, 'active')
          .first();

        // Get user points
        const points = await env.DB
          .prepare('SELECT * FROM user_points WHERE user_id = ?')
          .bind(userId)
          .first();

        // Calculate current month's subscription usage
        let subscriptionQuotaRemaining = 0;
        if (subscription) {
          const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
          if (subscription.last_reset_date !== currentMonth) {
            // Reset monthly usage
            await env.DB
              .prepare('UPDATE user_subscriptions SET monthly_used = 0, last_reset_date = ? WHERE user_id = ?')
              .bind(currentMonth, userId)
              .run();
            subscriptionQuotaRemaining = subscription.quota_monthly;
          } else {
            subscriptionQuotaRemaining = Math.max(0, subscription.quota_monthly - subscription.monthly_used);
          }
        }

        return new Response(JSON.stringify({
          free: {
            total: 3,  // 注册赠送 3 次
            used: Math.abs(freeUsage?.total || 0),
            remaining: Math.max(0, 3 - Math.abs(freeUsage?.total || 0)),
          },
          subscription: subscription ? {
            plan_name: subscription.plan_name,
            display_name: subscription.plan_display_name,
            quota_monthly: subscription.quota_monthly,
            used: subscription.monthly_used,
            remaining: subscriptionQuotaRemaining,
            status: subscription.status,
            expires_at: subscription.expires_at,
          } : null,
          points: points ? {
            balance: points.points_balance,
            total_purchased: points.total_purchased,
          } : { balance: 0, total_purchased: 0 },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/user/quota/history - Get quota transaction history
      if (path.endsWith('/api/user/quota/history') && request.method === 'GET') {
        const userId = await getUserIdFromRequest(request, env);
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
        const offset = (page - 1) * limit;

        const transactions = await env.DB
          .prepare('SELECT * FROM quota_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
          .bind(userId, limit, offset)
          .all();

        const total = await env.DB
          .prepare('SELECT COUNT(*) as count FROM quota_transactions WHERE user_id = ?')
          .bind(userId)
          .first();

        return new Response(JSON.stringify({
          transactions: transactions.results,
          pagination: {
            page,
            limit,
            total: total.count,
            total_pages: Math.ceil(total.count / limit),
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/user/history - Get processing history with pagination
      if (path.endsWith('/api/user/history') && request.method === 'GET') {
        const userId = await getUserIdFromRequest(request, env);
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
        const offset = (page - 1) * limit;

        const history = await env.DB
          .prepare('SELECT * FROM processing_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
          .bind(userId, limit, offset)
          .all();

        const total = await env.DB
          .prepare('SELECT COUNT(*) as count FROM processing_history WHERE user_id = ?')
          .bind(userId)
          .first();

        return new Response(JSON.stringify({
          history: history.results.map(h => ({
            ...h,
            created_at: new Date(h.created_at * 1000).toISOString(),
          })),
          pagination: {
            page,
            limit,
            total: total.count,
            total_pages: Math.ceil(total.count / limit),
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/user/history/stats - Get processing statistics
      if (path.endsWith('/api/user/history/stats') && request.method === 'GET') {
        const userId = await getUserIdFromRequest(request, env);
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get total processed count
        const totalProcessed = await env.DB
          .prepare('SELECT COUNT(*) as count, SUM(credits_used) as total_credits FROM processing_history WHERE user_id = ? AND status = ?')
          .bind(userId, 'success')
          .first();

        // Get this month's stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthStartTimestamp = Math.floor(startOfMonth.getTime() / 1000);

        const monthlyStats = await env.DB
          .prepare('SELECT COUNT(*) as count, SUM(credits_used) as total_credits FROM processing_history WHERE user_id = ? AND created_at >= ? AND status = ?')
          .bind(userId, monthStartTimestamp, 'success')
          .first();

        // Get error count
        const errorCount = await env.DB
          .prepare('SELECT COUNT(*) as count FROM processing_history WHERE user_id = ? AND status = ?')
          .bind(userId, 'error')
          .first();

        // Get daily stats for last 7 days
        const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
        const dailyStats = await env.DB
          .prepare(`SELECT DATE(created_at, 'unixepoch') as date, COUNT(*) as count 
                    FROM processing_history 
                    WHERE user_id = ? AND created_at >= ? 
                    GROUP BY DATE(created_at, 'unixepoch')
                    ORDER BY date DESC`)
          .bind(userId, sevenDaysAgo)
          .all();

        return new Response(JSON.stringify({
          total: {
            processed: totalProcessed.count || 0,
            credits_used: totalProcessed.total_credits || 0,
          },
          this_month: {
            processed: monthlyStats.count || 0,
            credits_used: monthlyStats.total_credits || 0,
          },
          errors: errorCount.count || 0,
          last_7_days: dailyStats.results,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ========== Plans Endpoints ==========

      // GET /api/plans/subscription - Get subscription plans
      if (path.endsWith('/api/plans/subscription') && request.method === 'GET') {
        const plans = await env.DB
          .prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC')
          .all();

        return new Response(JSON.stringify({
          plans: plans.results.map(p => ({
            id: p.id,
            plan_name: p.plan_name,
            display_name: p.display_name,
            quota_monthly: p.quota_monthly,
            price_usd: p.price_usd,
            paypal_plan_id: p.paypal_plan_id,
          })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ========== Image Processing Endpoint ==========

      // POST /api/process - Process image with Remove.bg and deduct quota
      if (path.endsWith('/api/process') && request.method === 'POST') {
        const userId = await getUserIdFromRequest(request, env);
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized', code: 'not_authenticated' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Parse multipart form data
        let imageData;
        let format = 'png';
        try {
          const formData = await request.formData();
          const imageFile = formData.get('image');
          if (!imageFile || !(imageFile instanceof File)) {
            return new Response(JSON.stringify({ error: 'No image provided', code: 'no_image' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          imageData = await imageFile.arrayBuffer();
          format = formData.get('format') || 'png';
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Failed to parse form data', code: 'parse_error' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Deduct quota based on priority: free > subscription > points
        // But ONLY if processing succeeds - we check quota availability first
        let quotaResult = null;
        
        // Pre-check quota availability (don't deduct yet)
        try {
          const quotaCheck = await checkQuotaAvailable(userId, env);
          if (!quotaCheck.available) {
            return new Response(JSON.stringify({ 
              error: 'Insufficient quota', 
              code: 'insufficient_quota',
              details: quotaCheck,
            }), {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          quotaResult = quotaCheck;
        } catch (err) {
          console.error('Quota check error:', err);
          return new Response(JSON.stringify({ 
            error: 'Quota check failed: ' + err.message, 
            code: 'quota_check_error',
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Call Remove.bg API FIRST
        const removeBgFormData = new FormData();
        removeBgFormData.append('image_file', new File([imageData], 'image.png', { type: 'image/png' }));
        removeBgFormData.append('size', 'auto');
        removeBgFormData.append('format', format);

        let removeBgResult;
        try {
          const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
              'X-Api-Key': env.REMOVE_BG_API_KEY || 'ZVPuP9RmbPnUoGX6duU3wh9m',
            },
            body: removeBgFormData,
          });

          if (!removeBgResponse.ok) {
            const errorText = await removeBgResponse.text();
            console.error('Remove.bg API error:', errorText);
            throw new Error('Remove.bg API failed');
          }

          const resultBuffer = await removeBgResponse.arrayBuffer();
          // Convert ArrayBuffer to base64 without spreading (avoid stack overflow)
          const bytes = new Uint8Array(resultBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          removeBgResult = `data:image/png;base64,${base64}`;
        } catch (err) {
          console.error('Remove.bg processing error:', err);
          // Record failed attempt - but do NOT deduct quota
          await env.DB
            .prepare('INSERT INTO processing_history (user_id, quota_type, credits_used, status, error_message) VALUES (?, ?, ?, ?, ?)')
            .bind(userId, quotaResult.quotaType, 0, 'failed', 'Remove.bg API error')
            .run();
          return new Response(JSON.stringify({ 
            error: 'Failed to process image', 
            code: 'processing_failed',
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Processing succeeded - NOW deduct quota
        const deductResult = await doDeductQuota(userId, env, quotaResult.quotaType);
        
        // Record successful processing
        await env.DB
          .prepare('INSERT INTO processing_history (user_id, quota_type, credits_used, status) VALUES (?, ?, ?, ?)')
          .bind(userId, quotaResult.quotaType, 1, 'success')
          .run();

        return new Response(JSON.stringify({
          success: true,
          result: removeBgResult,
          quota_type: quotaResult.quotaType,
          remaining: deductResult.remaining,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ========== Plans Endpoints ==========

      // GET /api/plans/points - Get point packages
      if (path.endsWith('/api/plans/points') && request.method === 'GET') {
        const packages = await env.DB
          .prepare('SELECT * FROM point_packages WHERE is_active = 1 ORDER BY sort_order ASC')
          .all();

        return new Response(JSON.stringify({
          packages: packages.results.map(p => ({
            id: p.id,
            package_name: p.package_name,
            display_name: p.display_name,
            points: p.points,
            price_usd: p.price_usd,
            paypal_product_id: p.paypal_product_id,
          })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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

// ========== Quota Check (without deduction) ==========
async function checkQuotaAvailable(userId, env) {
  // Step 1: Check free quota
  const freeTx = await env.DB
    .prepare('SELECT SUM(amount) as total FROM quota_transactions WHERE user_id = ? AND quota_type = ? AND amount < 0')
    .bind(userId, 'free')
    .first();
  const freeUsed = Math.abs(freeTx?.total || 0);
  const freeRemaining = Math.max(0, 3 - freeUsed);

  if (freeRemaining > 0) {
    return { available: true, quotaType: 'free', remaining: freeRemaining };
  }

  // Step 2: Check subscription
  const subscription = await env.DB
    .prepare('SELECT us.*, sp.plan_name, sp.quota_monthly FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id WHERE us.user_id = ? AND us.status = ?')
    .bind(userId, 'active')
    .first();

  if (subscription) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let monthlyUsed = subscription.monthly_used || 0;

    if (subscription.last_reset_date !== currentMonth) {
      monthlyUsed = 0;
    }

    if (monthlyUsed < subscription.quota_monthly) {
      return { available: true, quotaType: 'subscription', remaining: subscription.quota_monthly - monthlyUsed };
    }
  }

  // Step 3: Check points
  const points = await env.DB
    .prepare('SELECT * FROM user_points WHERE user_id = ?')
    .bind(userId)
    .first();

  if (points && points.points_balance > 0) {
    return { available: true, quotaType: 'points', remaining: points.points_balance };
  }

  return { available: false };
}

// ========== Actually Deduct Quota ==========
async function doDeductQuota(userId, env, quotaType) {
  if (quotaType === 'free') {
    const freeTx = await env.DB
      .prepare('SELECT SUM(amount) as total FROM quota_transactions WHERE user_id = ? AND quota_type = ? AND amount < 0')
      .bind(userId, 'free')
      .first();
    const freeUsed = Math.abs(freeTx?.total || 0);
    const freeRemaining = Math.max(0, 3 - freeUsed);
    const newBalance = freeRemaining - 1;
    await env.DB
      .prepare('INSERT INTO quota_transactions (user_id, amount, balance, quota_type, reason) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, -1, newBalance, 'free', 'Process image')
      .run();
    return { remaining: newBalance };
  }
  
  if (quotaType === 'subscription') {
    const subscription = await env.DB
      .prepare('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = ?')
      .bind(userId, 'active')
      .first();
    if (subscription) {
      const newUsed = (subscription.monthly_used || 0) + 1;
      await env.DB
        .prepare('UPDATE user_subscriptions SET monthly_used = ? WHERE user_id = ?')
        .bind(newUsed, userId)
        .run();
      await env.DB
        .prepare('INSERT INTO quota_transactions (user_id, amount, balance, quota_type, reason) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, -1, subscription.quota_monthly - newUsed, 'subscription', 'Process image')
        .run();
      return { remaining: subscription.quota_monthly - newUsed };
    }
  }
  
  if (quotaType === 'points') {
    const points = await env.DB
      .prepare('SELECT * FROM user_points WHERE user_id = ?')
      .bind(userId)
      .first();
    if (points) {
      const newBalance = points.points_balance - 1;
      await env.DB
        .prepare('UPDATE user_points SET points_balance = ?, updated_at = ? WHERE user_id = ?')
        .bind(newBalance, Math.floor(Date.now() / 1000), userId)
        .run();
      await env.DB
        .prepare('INSERT INTO quota_transactions (user_id, amount, balance, quota_type, reason) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, -1, newBalance, 'points', 'Process image')
        .run();
      return { remaining: newBalance };
    }
  }
  
  return { remaining: 0 };
}

// ========== Quota Deduction Helper (Legacy - for backwards compat) ==========
async function deductQuota(userId, env) {
  // Step 1: Check free quota
  const freeTx = await env.DB
    .prepare('SELECT SUM(amount) as total FROM quota_transactions WHERE user_id = ? AND quota_type = ?')
    .bind(userId, 'free')
    .first();
  const freeUsed = Math.abs(freeTx?.total || 0);
  const freeRemaining = Math.max(0, 3 - freeUsed);

  if (freeRemaining > 0) {
    // Deduct from free quota
    const newBalance = freeRemaining - 1;
    await env.DB
      .prepare('INSERT INTO quota_transactions (user_id, amount, balance, quota_type, reason) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, -1, newBalance, 'free', 'Process image')
      .run();
    return { success: true, quotaType: 'free', remaining: newBalance };
  }

  // Step 2: Check subscription quota
  const subscription = await env.DB
    .prepare('SELECT us.*, sp.plan_name, sp.quota_monthly FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id WHERE us.user_id = ? AND us.status = ?')
    .bind(userId, 'active')
    .first();

  if (subscription) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let monthlyUsed = subscription.monthly_used || 0;

    // Reset if new month
    if (subscription.last_reset_date !== currentMonth) {
      monthlyUsed = 0;
      await env.DB
        .prepare('UPDATE user_subscriptions SET monthly_used = 0, last_reset_date = ? WHERE user_id = ?')
        .bind(currentMonth, userId)
        .run();
    }

    if (monthlyUsed < subscription.quota_monthly) {
      const newUsed = monthlyUsed + 1;
      const remaining = subscription.quota_monthly - newUsed;
      await env.DB
        .prepare('UPDATE user_subscriptions SET monthly_used = ? WHERE user_id = ?')
        .bind(newUsed, userId)
        .run();
      // Record transaction
      await env.DB
        .prepare('INSERT INTO quota_transactions (user_id, amount, balance, quota_type, reason) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, -1, remaining, 'subscription', 'Process image')
        .run();
      return { success: true, quotaType: 'subscription', remaining };
    }
  }

  // Step 3: Check points
  const points = await env.DB
    .prepare('SELECT * FROM user_points WHERE user_id = ?')
    .bind(userId)
    .first();

  if (points && points.points_balance > 0) {
    const newBalance = points.points_balance - 1;
    await env.DB
      .prepare('UPDATE user_points SET points_balance = ?, updated_at = ? WHERE user_id = ?')
      .bind(newBalance, Math.floor(Date.now() / 1000), userId)
      .run();
    // Record transaction
    await env.DB
      .prepare('INSERT INTO quota_transactions (user_id, amount, balance, quota_type, reason) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, -1, newBalance, 'points', 'Process image')
      .run();
    return { success: true, quotaType: 'points', remaining: newBalance };
  }

  // No quota available
  return { success: false, error: 'insufficient_quota' };
}

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

// Helper: Get user_id from request session token
async function getUserIdFromRequest(request, env) {
  const sessionToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!sessionToken) return null;

  const user = await env.DB
    .prepare('SELECT id FROM users WHERE session_token = ?')
    .bind(sessionToken)
    .first();

  return user?.id || null;
}
