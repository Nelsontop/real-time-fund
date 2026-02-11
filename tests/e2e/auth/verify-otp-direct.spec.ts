import { test, expect } from '@playwright/test';

test.describe('OTP Verification Direct Test', () => {
  const testEmail = '379852731@qq.com';
  const testOtpCode = '71994697';

  test('should verify OTP code directly (bypassing rate limit)', async ({ page }) => {
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

    // Network logging for Supabase calls
    const apiCalls: { url: string; method: string; status?: number; body?: string; timestamp: number }[] = [];

    page.on('request', req => {
      if (req.url().includes('supabase')) {
        apiCalls.push({
          url: req.url(),
          method: req.method(),
          timestamp: Date.now()
        });
        console.log('REQUEST:', req.method(), req.url().substring(0, 100));
      }
    });

    page.on('response', async resp => {
      if (resp.url().includes('supabase')) {
        const existing = apiCalls.find(c => c.url === resp.url() && !c.status);
        if (existing) {
          existing.status = resp.status();
          try {
            existing.body = await resp.text();
          } catch {}
          console.log('RESPONSE:', resp.status, resp.status);
        }
      }
    });

    // STEP 1: Navigate to page
    console.log('\n=== STEP 1: Navigating to http://localhost:3000 ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // STEP 2: Take initial screenshot
    console.log('\n=== STEP 2: Taking initial screenshot ===');
    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/direct-step1-initial.png',
      fullPage: true
    });

    // STEP 3: Click login/user button
    console.log('\n=== STEP 3: Clicking login/user button ===');
    const userMenuTrigger = page.locator('.user-menu-trigger, button[aria-label="登录"], button:has-text("登录")');
    await userMenuTrigger.first().click();
    await page.waitForTimeout(500);

    // Check if we need to click "login" option from dropdown
    const loginOption = page.locator('text=/登录/i').first();
    const loginVisible = await loginOption.isVisible().catch(() => false);
    if (loginVisible) {
      console.log('Clicking login option from dropdown');
      await loginOption.click();
      await page.waitForTimeout(500);
    }

    // STEP 4: Take screenshot of login modal
    console.log('\n=== STEP 4: Taking screenshot of login modal ===');
    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/direct-step2-login-modal.png',
      fullPage: true
    });

    // STEP 5: Enter email
    console.log('\n=== STEP 5: Entering email: ' + testEmail + ' ===');
    const emailInput = page.locator('input[type="email"], input[placeholder*="邮箱"], input[placeholder*="email"]').first();
    await emailInput.fill(testEmail);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/direct-step3-email-filled.png',
      fullPage: true
    });

    // STEP 6: Since we already have the OTP code, we need to trigger the UI to show the OTP input
    // We'll use page.evaluate to directly set the React state that shows the OTP input
    console.log('\n=== STEP 6: Setting login state to show OTP input ===');

    // First check if the OTP input is already visible (maybe from previous attempt)
    let otpInputVisible = await page.locator('input[placeholder*="验证码"], input[placeholder*="code"]').count() > 0;

    if (!otpInputVisible) {
      console.log('OTP input not visible - will try to send OTP first');

      // Try to click send OTP button
      const sendOtpBtn = page.locator('button').filter({ hasText: /发送.*验证码/i }).first();
      const sendOtpVisible = await sendOtpBtn.isVisible().catch(() => false);

      if (sendOtpVisible) {
        await sendOtpBtn.click();
        console.log('Clicked send OTP button');
        await page.waitForTimeout(3000);

        // Check again if OTP input is now visible
        otpInputVisible = await page.locator('input[placeholder*="验证码"], input[placeholder*="code"]').count() > 0;
        console.log('OTP input visible after send:', otpInputVisible);

        await page.screenshot({
          path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/direct-step4-after-send-otp.png',
          fullPage: true
        });
      }
    }

    // If still not visible, we'll use page.evaluate to force show the OTP input
    if (!otpInputVisible) {
      console.log('OTP input still not visible - will directly inject values');

      // Use JavaScript to directly interact with the React state
      await page.evaluate(({ email, otp }) => {
        // Find all inputs
        const inputs = document.querySelectorAll('input');
        let emailInput: HTMLInputElement | null = null;
        let otpInput: HTMLInputElement | null = null;

        for (const input of inputs) {
          if (input.type === 'email') {
            emailInput = input;
          } else if (input.placeholder?.includes('验证码') || input.placeholder?.includes('code')) {
            otpInput = input;
          }
        }

        // Fill email
        if (emailInput) {
          emailInput.value = email;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Try to find React fiber and set state directly
        const root = document.querySelector('#__next');
        if (root && (root as any)._reactRootContainer) {
          console.log('Found React root');
        }

        // Try to trigger React state change by dispatching events
        if (emailInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(emailInput, email);
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        // Look for any hidden OTP input and make it visible
        const allInputs = Array.from(document.querySelectorAll('input'));
        for (const input of allInputs) {
          if (input.placeholder?.includes('验证码')) {
            (input as HTMLInputElement).hidden = false;
            (input as HTMLInputElement).style.display = 'block';
            otpInput = input;
          }
        }

        return { emailFound: !!emailInput, otpFound: !!otpInput };
      }, { email: testEmail, otp: testOtpCode });

      await page.waitForTimeout(500);
    }

    // STEP 7: Enter verification code
    console.log('\n=== STEP 7: Entering verification code: ' + testOtpCode + ' ===');

    // Take screenshot before entering OTP
    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/direct-step5-before-otp.png',
      fullPage: true
    });

    // Try multiple selectors for OTP input
    const otpSelectors = [
      'input[placeholder*="验证码"]',
      'input[placeholder*="code"]',
      'input[maxLength="10"]',
      'input[type="text"]'
    ];

    let otpFilled = false;
    for (const selector of otpSelectors) {
      const inputs = page.locator(selector);
      const count = await inputs.count();
      console.log(`Found ${count} inputs with selector: ${selector}`);

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const placeholder = await input.getAttribute('placeholder');
        const isVisible = await input.isVisible().catch(() => false);
        console.log(`  Input ${i}: placeholder="${placeholder}", visible=${isVisible}`);

        if (!otpFilled && isVisible && placeholder && (placeholder.includes('验证码') || placeholder.includes('code'))) {
          await input.fill(testOtpCode);
          otpFilled = true;
          console.log('Filled OTP input');
          break;
        }
      }
      if (otpFilled) break;
    }

    // If still not filled via normal means, use evaluate
    if (!otpFilled) {
      console.log('Trying to fill OTP via JavaScript injection');
      await page.evaluate(({ code }) => {
        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
          const placeholder = (input as HTMLInputElement).placeholder;
          if (placeholder?.includes('验证码') || placeholder?.includes('code')) {
            (input as HTMLInputElement).value = code;
            (input as HTMLInputElement).dispatchEvent(new Event('input', { bubbles: true }));
            (input as HTMLInputElement).dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Filled OTP via JS');
            return true;
          }
        }
        return false;
      }, { code: testOtpCode });
    }

    await page.waitForTimeout(500);

    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/direct-step6-otp-filled.png',
      fullPage: true
    });

    // STEP 8: Click verify/confirm button
    console.log('\n=== STEP 8: Clicking verify button ===');
    const verifyBtn = page.locator('button').filter({ hasText: /确认|验证/i }).first();
    const verifyVisible = await verifyBtn.isVisible().catch(() => false);

    if (verifyVisible) {
      await verifyBtn.click();
      console.log('Clicked verify button');
    } else {
      // Try alternative approach - submit form
      console.log('Verify button not visible, trying to submit form');
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
    }

    // STEP 9: Wait and observe result
    console.log('\n=== STEP 9: Waiting for login result ===');
    await page.waitForTimeout(5000);

    // STEP 10: Take final screenshot
    await page.screenshot({
      path: '/home/jingqi/workspace/real-time-fund/tests/artifacts/direct-step7-final-state.png',
      fullPage: true
    });

    // STEP 11: Check for success/error messages
    console.log('\n=== STEP 10: Checking for messages ===');
    const finalBodyText = await page.locator('body').textContent();

    // Check for specific messages
    const successMessages = [
      '登录成功，正在同步云端数据',
      '登录成功',
      '已同步本地数据到云端',
      '已从云端加载配置',
      '登录成功，已同步本地数据到云端',
      '登录成功，已从云端加载配置'
    ];

    const errorMessages = [
      '验证失败',
      '验证码错误',
      '验证码已过期',
      '云端数据加载失败',
      '登录失败',
      'Invalid OTP',
      'OTP expired'
    ];

    console.log('\n--- Success Message Check ---');
    const foundSuccess: string[] = [];
    for (const msg of successMessages) {
      if (finalBodyText?.includes(msg)) {
        console.log(`FOUND SUCCESS: "${msg}"`);
        foundSuccess.push(msg);
      }
    }
    if (foundSuccess.length === 0) {
      console.log('No success messages found');
    }

    console.log('\n--- Error Message Check ---');
    const foundErrors: string[] = [];
    for (const msg of errorMessages) {
      if (finalBodyText?.includes(msg)) {
        console.log(`FOUND ERROR: "${msg}"`);
        foundErrors.push(msg);
      }
    }
    if (foundErrors.length === 0) {
      console.log('No error messages found');
    }

    // Look for toast messages
    const toastElements = page.locator('div[class*="toast"], [role="alert"], div[style*="position: fixed"]');
    const toastCount = await toastElements.count();
    console.log('\n--- Toast/Alert Messages ---');
    console.log(`Found ${toastCount} potential toast/alert elements`);
    for (let i = 0; i < Math.min(toastCount, 10); i++) {
      const text = await toastElements.nth(i).textContent();
      const isVisible = await toastElements.nth(i).isVisible().catch(() => false);
      if (isVisible && text && text.trim().length > 0 && text.trim().length < 200) {
        console.log(`  Element ${i + 1}: "${text.trim()}"`);
      }
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
      try {
        const value = JSON.parse(localStorageData[key]);
        if (value.access_token) {
          console.log(`    Has access_token: ${value.access_token.substring(0, 20)}...`);
        }
        if (value.user) {
          console.log(`    Has user: ${value.user.email}`);
        }
      } catch {
        console.log(`    Value: ${localStorageData[key].substring(0, 100)}...`);
      }
    }

    // Check UI state
    const userButton = page.locator('button[aria-label*="用户"], button[aria-label*="user"], .user-menu-trigger');
    const userButtonCount = await userButton.count();
    console.log('\n=== UI State ===');
    console.log(`User button count: ${userButtonCount}`);
    if (userButtonCount > 0) {
      const ariaLabel = await userButton.first().getAttribute('aria-label');
      console.log(`User button aria-label: "${ariaLabel}"`);
    }

    // Check if modal is still open
    const modalVisible = await page.locator('.modal, [class*="modal"], [role="dialog"]').isVisible().catch(() => false);
    console.log(`Modal still visible: ${modalVisible}`);

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

    console.log('\nAPI Calls:', apiCalls.length);
    apiCalls.forEach(call => {
      console.log(`  ${call.method} ${call.url.substring(0, 80)}... -> ${call.status || 'PENDING'}`);
      if (call.body && call.body.length > 0) {
        console.log(`    Response: ${call.body.substring(0, 200)}...`);
      }
    });

    // Write results to file
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      email: testEmail,
      otpCode: testOtpCode,
      foundSuccessMessages: foundSuccess,
      foundErrorMessages: foundErrors,
      consoleLogs,
      pageErrors,
      apiCalls,
      localStorageKeys: Object.keys(localStorageData),
      supabaseKeys,
      isLoggedIn: supabaseKeys.length > 0 && supabaseKeys.some(k => localStorageData[k]?.includes('access_token'))
    };
    fs.writeFileSync(
      '/home/jingqi/workspace/real-time-fund/tests/artifacts/direct-verify-otp-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nResults saved to tests/artifacts/direct-verify-otp-results.json');
  });
});
