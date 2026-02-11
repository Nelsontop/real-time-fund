import { test, expect } from '@playwright/test';

test.describe('Full Login Flow with Cloud Data Check', () => {
  const testEmail = '379852731@qq.com';
  const testOtpCode = '71994697';

  test('should complete full login flow and check cloud data sync', async ({ page }) => {
    // Enable detailed console logging
    const consoleLogs: { type: string; text: string; timestamp: number }[] = [];
    const pageErrors: { message: string; timestamp: number }[] = [];
    const apiCalls: { url: string; method: string; status?: number; body?: string; timestamp: number }[] = [];
    const toastMessages: { message: string; type: string; timestamp: number }[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text, timestamp: Date.now() });
      console.log(`[${msg.type()}]`, text);
    });

    page.on('pageerror', error => {
      pageErrors.push({ message: error.message, timestamp: Date.now() });
      console.log('Page Error:', error.message);
    });

    page.on('request', req => {
      const url = req.url();
      if (url.includes('supabase') || url.includes('kghzmmyrqqurxtkrvbpf')) {
        apiCalls.push({ url, method: req.method(), timestamp: Date.now() });
        console.log('API REQUEST:', req.method(), url.substring(0, 100));
      }
    });

    page.on('response', async resp => {
      const url = resp.url();
      if (url.includes('supabase') || url.includes('kghzmmyrqqurxtkrvbpf')) {
        const existing = apiCalls.find(c => c.url === url && !c.status);
        if (existing) {
          existing.status = resp.status();
          try {
            existing.body = await resp.text();
          } catch {}
          console.log('API RESPONSE:', resp.status, existing.body?.substring(0, 300) || '');
        }
      }
    });

    // Monitor DOM changes for toast messages
    page.on('domcontentloaded', () => {
      console.log('DOM Content Loaded');
    });

    page.on('load', () => {
      console.log('Page Loaded');
    });

    console.log('\n========================================');
    console.log('STEP 1: Navigate to http://localhost:3000');
    console.log('========================================');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/full-step1-initial.png',
      fullPage: true
    });

    console.log('\n========================================');
    console.log('STEP 2: Direct Supabase Verification');
    console.log('========================================');
    console.log('Email:', testEmail);
    console.log('OTP Code:', testOtpCode);

    // Step 2: Verify OTP directly with Supabase API
    const verificationResult = await page.evaluate(async ({ email, code }) => {
      const supabaseUrl = 'https://kghzmmyrqqurxtkrvbpf.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnaHptbXlycXVyeHh0a3J2YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5MDAxNzksImV4cCI6MjA1NDQ3NjE3OX0.VZGjHfWlEsx46-g_KTJAcXbhvx-jtTDJOQY8YHwkgB4';

      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({
            email: email,
            token: code,
            type: 'email'
          })
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
          // Save session to localStorage
          const supabaseKey = `sb-${data.user?.id || 'default'}-auth-token`;
          const sessionData = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user,
            expires_at: data.expires_at || Date.now() + 3600000
          };
          localStorage.setItem(supabaseKey, JSON.stringify(sessionData));

          // Also save in the standard Supabase format
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            current: sessionData,
            expiresAt: data.expires_at || Date.now() + 3600000
          }));

          return {
            success: true,
            status: response.status,
            user: data.user,
            access_token: data.access_token
          };
        }

        return {
          success: false,
          status: response.status,
          error: data.error_description || data.error || 'Unknown error'
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message
        };
      }
    }, { email: testEmail, code: testOtpCode });

    console.log('Verification Result:', JSON.stringify(verificationResult, null, 2));

    if (!verificationResult.success) {
      console.log('\n!!! VERIFICATION FAILED !!!');
      console.log('Error:', verificationResult.error);
      throw new Error('OTP verification failed: ' + verificationResult.error);
    }

    console.log('\n========================================');
    console.log('STEP 3: Reload page to pick up session');
    console.log('========================================');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/full-step2-after-reload.png',
      fullPage: true
    });

    console.log('\n========================================');
    console.log('STEP 4: Check for toast messages');
    console.log('========================================');

    // Wait for and capture any toast messages
    await page.waitForTimeout(3000);

    // Look for toast elements in various ways
    const toastsFound = await page.evaluate(() => {
      const results: { text: string; visible: boolean; type: string }[] = [];

      // Method 1: Look for fixed positioned divs (toasts)
      const fixedDivs = Array.from(document.querySelectorAll('div[style*="position: fixed"]'));
      for (const div of fixedDivs) {
        const text = div.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) {
          const style = (div as HTMLElement).style;
          const isVisible = style.display !== 'none' &&
                          style.visibility !== 'hidden' &&
                          style.opacity !== '0';
          results.push({ text, visible: isVisible, type: 'fixed-div' });
        }
      }

      // Method 2: Look for role="alert"
      const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
      for (const alert of alerts) {
        const text = alert.textContent?.trim();
        if (text) {
          results.push({ text, visible: true, type: 'alert' });
        }
      }

      // Method 3: Look for toast classes
      const toastElements = Array.from(document.querySelectorAll('[class*="toast"], [class*="Toast"], [class*="TOAST"]'));
      for (const el of toastElements) {
        const text = el.textContent?.trim();
        if (text) {
          results.push({ text, visible: true, type: 'toast-class' });
        }
      }

      return results;
    });

    console.log('Toasts found:', toastsFound.length);
    for (const toast of toastsFound) {
      console.log(`  [${toast.type}] ${toast.visible ? 'VISIBLE' : 'HIDDEN'}: "${toast.text}"`);
      toastMessages.push({ message: toast.text, type: toast.type, timestamp: Date.now() });
    }

    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/full-step3-toasts.png',
      fullPage: true
    });

    console.log('\n========================================');
    console.log('STEP 5: Check localStorage and auth state');
    console.log('========================================');

    const authCheck = await page.evaluate(() => {
      const results: Record<string, any> = {
        localStorageKeys: [],
        supabaseKeys: [],
        hasAccessToken: false,
        userEmail: null,
        userFound: false
      };

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          results.localStorageKeys.push(key);
          const value = localStorage.getItem(key);

          if (key.includes('sb-') || key.includes('supabase')) {
            results.supabaseKeys.push(key);
            try {
              const parsed = JSON.parse(value || '');
              if (parsed.access_token) {
                results.hasAccessToken = true;
                results.userEmail = parsed.user?.email;
              }
              if (parsed.user) {
                results.userFound = true;
              }
            } catch {}
          }
        }
      }

      return results;
    });

    console.log('Auth Check Results:', JSON.stringify(authCheck, null, 2));

    console.log('\n========================================');
    console.log('STEP 6: Check UI for logged-in state');
    console.log('========================================');

    const uiCheck = await page.evaluate(() => {
      const results: Record<string, any> = {
        userMenuExists: false,
        userMenuLabel: null,
        loginModalVisible: false,
        logoutButtonExists: false,
        bodyTextContainsLoginSuccess: false,
        bodyTextContainsSyncError: false,
        bodyTextContainsCloudData: false
      };

      // Check for user menu
      const userMenus = Array.from(document.querySelectorAll('button[aria-label*="用户"], button[aria-label*="user"], button[aria-label*="登录"]'));
      if (userMenus.length > 0) {
        results.userMenuExists = true;
        results.userMenuLabel = userMenus[0]?.getAttribute('aria-label');
      }

      // Check for modal
      const modals = Array.from(document.querySelectorAll('[class*="modal"], [role="dialog"]'));
      for (const modal of modals) {
        const style = (modal as HTMLElement).style;
        if (style.display !== 'none') {
          results.loginModalVisible = true;
          break;
        }
      }

      // Check for logout button
      const logoutBtn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.includes('退出') || b.textContent?.includes('登出')
      );
      results.logoutButtonExists = !!logoutBtn;

      // Check body text
      const bodyText = document.body.textContent || '';
      results.bodyTextContainsLoginSuccess = bodyText.includes('登录成功');
      results.bodyTextContainsSyncError = bodyText.includes('云端配置加载失败');
      results.bodyTextContainsCloudData = bodyText.includes('同步云端数据');

      return results;
    });

    console.log('UI Check Results:', JSON.stringify(uiCheck, null, 2));

    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/full-step4-final-ui.png',
      fullPage: true
    });

    // Additional wait to catch any delayed toasts
    console.log('\nWaiting 5 more seconds for delayed messages...');
    await page.waitForTimeout(5000);

    // Final screenshot
    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/full-step5-final.png',
      fullPage: true
    });

    // Final check for any new messages
    const finalToasts = await page.evaluate(() => {
      const results: string[] = [];
      const allDivs = Array.from(document.querySelectorAll('div'));
      for (const div of allDivs) {
        const text = div.textContent?.trim();
        if (text && (text.includes('登录成功') || text.includes('同步') || text.includes('云端'))) {
          const style = (div as HTMLElement).style;
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            results.push(text);
          }
        }
      }
      return results;
    });

    console.log('\nFinal toast messages containing login/sync keywords:', finalToasts);

    console.log('\n========================================');
    console.log('FINAL SUMMARY');
    console.log('========================================');
    console.log('OTP Verification:', verificationResult.success ? 'SUCCESS' : 'FAILED');
    console.log('User Logged In:', authCheck.hasAccessToken ? 'YES' : 'NO');
    console.log('User Email:', authCheck.userEmail || 'N/A');
    console.log('Toast Messages Found:', toastMessages.length);
    console.log('Final Messages with keywords:', finalToasts.length);
    for (const msg of finalToasts) {
      console.log('  -', msg);
    }

    // Write comprehensive results
    const fs = require('fs');
    fs.writeFileSync(
      '/home/jingqi/workspace/real-time-fund/tests/artifacts/full-flow-results.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        email: testEmail,
        otpCode: testOtpCode,
        verification: verificationResult,
        authCheck,
        uiCheck,
        toastMessages,
        finalMessages: finalToasts,
        consoleLogs,
        pageErrors,
        apiCalls
      }, null, 2)
    );
    console.log('\nResults saved to tests/artifacts/full-flow-results.json');
  });
});
