import { test, expect } from '@playwright/test';

test.describe('OTP Verification Flow Test', () => {
  const testEmail = '379852731@qq.com';
  const testOtpCode = '71994697';

  test('should complete full login flow with OTP verification', async ({ page }) => {
    // Console and error logging
    const consoleLogs: { type: string; text: string; timestamp: number }[] = [];
    const pageErrors: { message: string; timestamp: number }[] = [];

    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
      console.log(`[${msg.type()}]`, msg.text());
    });

    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        timestamp: Date.now()
      });
      console.log('Page Error:', error.message);
    });

    // STEP 1: Navigate to page
    console.log('\n=== STEP 1: Navigating to http://localhost:3000 ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // STEP 2: Take initial screenshot
    console.log('\n=== STEP 2: Taking initial screenshot ===');
    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/step1-initial.png',
      fullPage: true
    });

    // STEP 3: Click login/user button
    console.log('\n=== STEP 3: Clicking login/user button ===');
    const userMenuTrigger = page.locator('.user-menu-trigger, button[aria-label="登录"], button:has-text("登录")');
    await userMenuTrigger.first().click();
    await page.waitForTimeout(500);

    // STEP 4: Take screenshot of login modal
    console.log('\n=== STEP 4: Taking screenshot of login modal ===');
    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/step2-login-modal.png',
      fullPage: true
    });

    // Check if we need to click "login" option from dropdown
    const loginOption = page.locator('text=/登录/i').first();
    const loginVisible = await loginOption.isVisible().catch(() => false);
    if (loginVisible) {
      console.log('Clicking login option from dropdown');
      await loginOption.click();
      await page.waitForTimeout(500);
    }

    // STEP 5: Enter email
    console.log('\n=== STEP 5: Entering email ===');
    const emailInput = page.locator('input[type="email"], input[placeholder*="邮箱"], input[placeholder*="email"]').first();
    await emailInput.fill(testEmail);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/step3-email-filled.png',
      fullPage: true
    });

    // STEP 6: Click send OTP button
    console.log('\n=== STEP 6: Clicking send OTP button ===');
    const sendOtpBtn = page.locator('button').filter({ hasText: /发送.*验证码|Send.*Code/i }).first();
    const sendOtpVisible = await sendOtpBtn.isVisible().catch(() => false);
    if (sendOtpVisible) {
      await sendOtpBtn.click();

      // Wait for OTP to be sent
      console.log('Waiting for OTP send response...');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/step4-after-send-otp.png',
        fullPage: true
      });

      // Check for success message
      const bodyText = await page.locator('body').textContent();
      console.log('Page contains "验证码已发送":', bodyText?.includes('验证码已发送'));
    }

    // STEP 7: Enter verification code
    console.log('\n=== STEP 7: Entering verification code: ' + testOtpCode + ' ===');
    const otpInput = page.locator('input[placeholder*="验证码"], input[placeholder*="code"]').first();
    await otpInput.fill(testOtpCode);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/step5-otp-filled.png',
      fullPage: true
    });

    // STEP 8: Click verify/confirm button
    console.log('\n=== STEP 8: Clicking verify button ===');
    const verifyBtn = page.locator('button').filter({ hasText: /确认|验证|登录|Verify/i }).first();
    await verifyBtn.click();

    // STEP 9: Wait and observe result
    console.log('\n=== STEP 9: Waiting for login result ===');
    await page.waitForTimeout(5000);

    // STEP 10: Take final screenshot
    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/step6-final-state.png',
      fullPage: true
    });

    // STEP 11: Check for success/error messages
    console.log('\n=== STEP 10: Checking for messages ===');
    const finalBodyText = await page.locator('body').textContent();

    // Check for success messages
    const successMessages = [
      '登录成功，正在同步云端数据',
      '登录成功',
      '已同步本地数据到云端',
      '已从云端加载配置'
    ];

    const errorMessages = [
      '验证失败',
      '验证码错误',
      '验证码已过期',
      '云端数据加载失败',
      '登录失败'
    ];

    console.log('\n--- Success Message Check ---');
    for (const msg of successMessages) {
      if (finalBodyText?.includes(msg)) {
        console.log(`FOUND SUCCESS: "${msg}"`);
      }
    }

    console.log('\n--- Error Message Check ---');
    for (const msg of errorMessages) {
      if (finalBodyText?.includes(msg)) {
        console.log(`FOUND ERROR: "${msg}"`);
      }
    }

    // Look for toast messages
    const toastElements = page.locator('.toast, [role="alert"], [class*="toast"], [class*="message"]');
    const toastCount = await toastElements.count();
    console.log('\n--- Toast/Alert Messages ---');
    console.log(`Found ${toastCount} toast/alert elements`);
    for (let i = 0; i < toastCount; i++) {
      const text = await toastElements.nth(i).textContent();
      console.log(`  Toast ${i + 1}: "${text?.trim()}"`);
    }

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

    console.log('\n=== LocalStorage Analysis ===');
    const supabaseKeys = Object.keys(localStorageData).filter(k =>
      k.includes('sb-') || k.includes('supabase')
    );
    console.log('Supabase keys found:', supabaseKeys.length);
    for (const key of supabaseKeys) {
      console.log(`  - ${key}`);
    }

    // Check if user menu shows logged-in state
    const userButton = page.locator('button[aria-label*="用户"], button[aria-label*="user"], .user-menu-trigger');
    const userButtonCount = await userButton.count();
    console.log('\n=== UI State ===');
    console.log(`User button count: ${userButtonCount}`);
    if (userButtonCount > 0) {
      const ariaLabel = await userButton.first().getAttribute('aria-label');
      console.log(`User button aria-label: "${ariaLabel}"`);
    }

    // Final summary
    console.log('\n=== FINAL SUMMARY ===');
    console.log('Console logs:', consoleLogs.length);
    const errorLogs = consoleLogs.filter(l => l.type === 'error');
    console.log('Error logs:', errorLogs.length);
    if (errorLogs.length > 0) {
      errorLogs.forEach(log => console.log(`  [ERROR] ${log.text}`));
    }

    console.log('Page errors:', pageErrors.length);
    pageErrors.forEach(err => console.log(`  ${err.message}`));

    // Write results to file
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      email: testEmail,
      otpCode: testOtpCode,
      successMessages: successMessages.filter(m => finalBodyText?.includes(m)),
      errorMessages: errorMessages.filter(m => finalBodyText?.includes(m)),
      consoleLogs,
      pageErrors,
      localStorageKeys: Object.keys(localStorageData),
      supabaseKeys
    };
    fs.writeFileSync(
      '/home/jingqi/workspace/real-time-fund/tests/artifacts/verify-otp-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nResults saved to tests/artifacts/verify-otp-results.json');
  });
});
