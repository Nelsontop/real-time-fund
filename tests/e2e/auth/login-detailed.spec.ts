import { test, expect } from '@playwright/test';

test.describe('Login Flow - Detailed Analysis', () => {
  const testEmail = '379852731@qq.com';

  test('should capture detailed network and console logs during OTP send', async ({ page }) => {
    // Detailed network monitoring
    const networkLog: {
      url: string;
      method: string;
      status?: number;
      statusText?: string;
      requestHeaders?: Record<string, string>;
      responseHeaders?: Record<string, string>;
      responseBody?: string;
      timestamp: number;
    }[] = [];

    // Console messages
    const consoleLogs: { type: string; text: string; timestamp: number }[] = [];

    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
      console.log(`[${msg.type()}]`, msg.text());
    });

    // Page errors
    const pageErrors: { message: string; timestamp: number }[] = [];
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        timestamp: Date.now()
      });
      console.log('Page Error:', error.message);
    });

    // Request logging
    page.on('request', req => {
      if (req.url().includes('supabase')) {
        const headers = req.headers();
        const headersObj: Record<string, string> = {};
        Object.entries(headers).forEach(([key, value]) => {
          headersObj[key] = value as string;
        });

        networkLog.push({
          url: req.url(),
          method: req.method(),
          requestHeaders: headersObj,
          timestamp: Date.now()
        });

        console.log('REQUEST:', req.method(), req.url());
        console.log('Headers:', JSON.stringify(headersObj, null, 2));
      }
    });

    // Response logging
    page.on('response', async resp => {
      if (resp.url().includes('supabase')) {
        const status = resp.status();
        const statusText = resp.statusText();
        const headers = resp.headers();
        const headersObj: Record<string, string> = {};
        Object.entries(headers).forEach(([key, value]) => {
          headersObj[key] = value as string;
        });

        let responseBody = '';
        try {
          const body = await resp.text();
          responseBody = body;
          console.log('RESPONSE:', status, statusText);
          console.log('Headers:', JSON.stringify(headersObj, null, 2));
          console.log('Body:', body.substring(0, 1000));
        } catch (e) {
          console.log('RESPONSE:', status, statusText, '(could not read body)');
        }

        // Update or add to network log
        const existingIndex = networkLog.findIndex(l => l.url === resp.url() && !l.status);
        if (existingIndex >= 0) {
          networkLog[existingIndex] = {
            ...networkLog[existingIndex],
            status,
            statusText,
            responseHeaders: headersObj,
            responseBody: responseBody?.substring(0, 2000)
          };
        } else {
          networkLog.push({
            url: resp.url(),
            method: 'UNKNOWN',
            status,
            statusText,
            responseHeaders: headersObj,
            responseBody: responseBody?.substring(0, 2000),
            timestamp: Date.now()
          });
        }
      }
    });

    // Navigate to page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click user menu
    const userMenuTrigger = page.locator('.user-menu-trigger, button[aria-label="登录"]');
    await userMenuTrigger.first().click();
    await page.waitForTimeout(500);

    // Click login option
    const loginOption = page.locator('text=/登录/i').first();
    const loginVisible = await loginOption.isVisible().catch(() => false);
    if (loginVisible) {
      await loginOption.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'artifacts/detailed-login-modal.png', fullPage: true });

    // Fill email
    const emailInputs = page.locator('input[type="email"]');
    if (await emailInputs.count() > 0) {
      await emailInputs.first().fill(testEmail);
      await page.screenshot({ path: 'artifacts/detailed-email-filled.png', fullPage: true });

      // Click send OTP
      const sendOtpBtn = page.locator('button').filter({ hasText: /发送.*验证码/i });
      if (await sendOtpBtn.isVisible()) {
        await sendOtpBtn.click();

        // Wait for response
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'artifacts/detailed-after-otp.png', fullPage: true });

        // Check all text content on page
        const bodyText = await page.locator('body').textContent();
        console.log('\n=== PAGE TEXT ANALYSIS ===');
        console.log('Contains "请求过于频繁":', bodyText?.includes('请求过于频繁'));
        console.log('Contains "rate limit":', bodyText?.toLowerCase().includes('rate limit'));
        console.log('Contains "验证码已发送":', bodyText?.includes('验证码已发送'));
        console.log('Contains "验证码":', bodyText?.includes('验证码'));

        // Look for any text that might indicate status
        const allButtons = page.locator('button');
        const btnCount = await allButtons.count();
        console.log('\n=== BUTTON STATES ===');
        for (let i = 0; i < Math.min(btnCount, 15); i++) {
          const btn = allButtons.nth(i);
          const text = await btn.textContent();
          const disabled = await btn.isDisabled().catch(() => false);
          const visible = await btn.isVisible().catch(() => false);
          if (visible && text && text.trim()) {
            console.log(`Button ${i}: "${text.trim()}" (disabled: ${disabled})`);
          }
        }
      }
    }

    // Save all logs to page for extraction
    await page.evaluate((logs) => {
      (window as any).testResults = logs;
    }, {
      networkLog,
      consoleLogs,
      pageErrors
    });

    // Final summary
    console.log('\n=== FINAL SUMMARY ===');
    console.log('Network calls:', networkLog.length);
    networkLog.forEach(log => {
      console.log(`  ${log.method} ${log.url.substring(0, 60)}... -> ${log.status || 'PENDING'} ${log.statusText || ''}`);
      if (log.status && log.status >= 400) {
        console.log(`    ERROR: ${log.status} ${log.statusText}`);
        console.log(`    Response: ${log.responseBody || 'no body'}`);
      }
    });

    console.log('\nConsole logs:', consoleLogs.length);
    consoleLogs.filter(l => l.type === 'error').forEach(log => {
      console.log(`  [ERROR] ${log.text}`);
    });

    console.log('\nPage errors:', pageErrors.length);
    pageErrors.forEach(err => {
      console.log(`  ${err.message}`);
    });

    // Write results to file
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      email: testEmail,
      networkLog,
      consoleLogs,
      pageErrors
    };
    fs.writeFileSync(
      '/home/jingqi/workspace/real-time-fund/artifacts/test-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nResults saved to artifacts/test-results.json');
  });

  test('should check if user has existing cloud data', async ({ page }) => {
    // This test assumes we're logged in and checks cloud data
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Check localStorage for Supabase session
    const localStorageData = await page.evaluate(() => {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });

    console.log('\n=== LOCALSTORAGE ANALYSIS ===');
    const supabaseKeys = Object.keys(localStorageData).filter(k =>
      k.includes('sb-') || k.includes('supabase')
    );

    console.log('Supabase-related keys:', supabaseKeys);

    if (supabaseKeys.length > 0) {
      console.log('\nFound Supabase session data!');
      supabaseKeys.forEach(key => {
        try {
          const value = JSON.parse(localStorageData[key]);
          console.log(`${key}:`, JSON.stringify(value, null, 2).substring(0, 300));
        } catch {
          console.log(`${key}:`, localStorageData[key].substring(0, 100));
        }
      });

      // Check if user is logged in
      const hasUser = supabaseKeys.some(k => localStorageData[k]?.includes('user'));
      console.log('\nUser appears to be logged in:', hasUser);
    } else {
      console.log('No Supabase session found - user is not logged in');
    }

    // Check for user menu in UI
    const userButton = page.locator('button[aria-label="用户菜单"], button[aria-label="登录"]');
    const userButtonAria = await userButton.first().getAttribute('aria-label');
    console.log('\nUser button aria-label:', userButtonAria);
  });
});
