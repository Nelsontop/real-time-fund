import { test, expect } from '@playwright/test';

test.describe('Email Login Flow', () => {
  const testEmail = '379852731@qq.com';

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    // Wait a bit for client-side hydration
    await page.waitForTimeout(1000);
  });

  test('should open login modal when clicking user/login button', async ({ page }) => {
    // Find the login/user button
    const loginButton = page.locator('button[aria-label="登录"]');
    await expect(loginButton, 'Login button should be visible').toBeVisible({ timeout: 10000 });

    // Click and wait for potential state change
    await loginButton.click();
    await page.waitForTimeout(500);

    // Check for modal overlay
    const modalOverlay = page.locator('.modal-overlay, [role="dialog"]');
    const isModalVisible = await modalOverlay.isVisible().catch(() => false);

    console.log('Modal visible after click:', isModalVisible);

    // Take screenshot
    await page.screenshot({ path: 'artifacts/login-after-click.png', fullPage: true });

    // If modal is not visible, the button might just toggle a menu instead
    // Check for dropdown menu
    const dropdownMenu = page.locator('.user-menu, [role="menu"]');
    const isMenuVisible = await dropdownMenu.isVisible().catch(() => false);
    console.log('Dropdown menu visible:', isMenuVisible);

    if (isMenuVisible) {
      await page.screenshot({ path: 'artifacts/user-menu-dropdown.png' });
    }
  });

  test('should check login modal and send OTP', async ({ page }) => {
    // Setup console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('error') || text.includes('Error') || text.includes('supabase') || text.includes('OTP')) {
        console.log('Browser console:', text);
      }
    });

    // Setup network monitoring
    const requests: { url: string; method: string }[] = [];
    const responses: { url: string; status: number }[] = [];

    page.on('request', req => {
      if (req.url().includes('supabase')) {
        requests.push({ url: req.url(), method: req.method() });
        console.log('Request:', req.method(), req.url().substring(0, 100));
      }
    });

    page.on('response', resp => {
      if (resp.url().includes('supabase')) {
        responses.push({ url: resp.url(), status: resp.status() });
        console.log('Response:', resp.status(), resp.url().substring(0, 100));
      }
    });

    // Find login button
    const loginButton = page.locator('button[aria-label="登录"]');
    await expect(loginButton).toBeVisible({ timeout: 10000 });
    await loginButton.click();
    await page.waitForTimeout(500);

    // Take screenshot after click
    await page.screenshot({ path: 'artifacts/login-after-button-click.png', fullPage: true });

    // Check if there's a user menu that appeared instead of modal
    const userMenu = page.locator('text=/登录账号/i, text=/登录/i');
    const hasLoginMenuItem = await userMenu.count() > 0;

    if (hasLoginMenuItem) {
      console.log('Found login menu item, clicking it');
      await userMenu.first().click();
      await page.waitForTimeout(500);
    }

    // Look for login modal by checking for the email input directly
    const emailInput = page.locator('input[type="email"]', { hasText: '' }).or(
      page.locator('input').filter({ hasAttribute: 'placeholder', value: /邮箱|email/i })
    );

    // Wait a bit for any animations
    await page.waitForTimeout(1000);

    // Take screenshot of current state
    await page.screenshot({ path: 'artifacts/login-current-state.png', fullPage: true });

    // Check all visible inputs
    const allInputs = page.locator('input');
    const inputCount = await allInputs.count();
    console.log('Number of input elements on page:', inputCount);

    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      const input = allInputs.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');
      const visible = await input.isVisible().catch(() => false);
      console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, visible=${visible}`);
    }

    // Try to find and click a "login" link in a menu if modal didn't appear
    const modalOverlay = page.locator('.modal-overlay, [role="dialog"]');
    const modalVisible = await modalOverlay.isVisible().catch(() => false);
    console.log('Modal overlay visible:', modalVisible);

    if (!modalVisible) {
      // Look for any login trigger in a menu or popup
      const loginLink = page.locator('text=登录').first();
      const loginLinkVisible = await loginLink.isVisible().catch(() => false);
      console.log('Login link visible:', loginLinkVisible);

      if (loginLinkVisible) {
        await loginLink.click();
        await page.waitForTimeout(500);
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'artifacts/login-final-state.png', fullPage: true });

    // Log findings
    console.log('=== FINDINGS ===');
    console.log('Supabase requests:', requests.length);
    console.log('Supabase responses:', responses.length);
  });

  test('should examine page structure and login elements', async ({ page }) => {
    // Get page HTML structure
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains "登录":', bodyText?.includes('登录'));
    console.log('Page contains "用户":', bodyText?.includes('用户'));

    // Find all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log('Number of buttons:', buttonCount);

    // Log aria-labels of all buttons
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = await btn.textContent();
      const visible = await btn.isVisible().catch(() => false);
      if (visible && (ariaLabel || text)) {
        console.log(`Button ${i}: aria-label="${ariaLabel}", text="${text?.trim()}"`);
      }
    }

    // Check for user menu container
    const userMenuContainer = page.locator('.user-menu-container');
    const hasUserMenu = await userMenuContainer.count() > 0;
    console.log('Has user menu container:', hasUserMenu);

    // Click on user menu area
    const userMenuTrigger = page.locator('.user-menu-trigger, button[aria-label="登录"]');
    await userMenuTrigger.first().click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'artifacts/user-menu-clicked.png', fullPage: true });

    // Check what appeared
    const loginText = page.locator('text=登录');
    const loginVisible = await loginText.count();
    console.log('Login text elements after click:', loginVisible);
  });

  test('should test actual login flow with email 379852731@qq.com', async ({ page }) => {
    // Network monitoring
    const apiCalls: { url: string; status?: number; request?: string; response?: string }[] = [];

    page.on('request', req => {
      if (req.url().includes('supabase')) {
        console.log('API Request:', req.method(), req.url());
        apiCalls.push({ url: req.url(), request: req.method() });
      }
    });

    page.on('response', async resp => {
      if (resp.url().includes('supabase')) {
        const status = resp.status();
        console.log('API Response:', status, resp.url());
        try {
          const body = await resp.text();
          console.log('Response body:', body.substring(0, 500));
          apiCalls.push({ url: resp.url(), status, response: body.substring(0, 500) });
        } catch {
          apiCalls.push({ url: resp.url(), status });
        }
      }
    });

    // Console monitoring
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log('Console:', text);
    });

    // Find and click user menu
    const userMenuTrigger = page.locator('.user-menu-trigger, button[aria-label="登录"]');
    await userMenuTrigger.first().click();
    await page.waitForTimeout(500);

    // Look for login option in dropdown
    const loginOption = page.locator('text=/登录账号/i').or(page.locator('text=/登录/i').first());
    const loginOptionVisible = await loginOption.isVisible().catch(() => false);

    if (loginOptionVisible) {
      await loginOption.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'artifacts/after-login-option-click.png', fullPage: true });

    // Try to find email input - might be in modal
    const emailInputs = page.locator('input[type="email"]');
    const emailInputCount = await emailInputs.count();
    console.log('Email input count:', emailInputCount);

    if (emailInputCount > 0) {
      const emailInput = emailInputs.first();
      await emailInput.fill(testEmail);
      await page.screenshot({ path: 'artifacts/email-entered.png', fullPage: true });

      // Look for send OTP button
      const sendOtpBtn = page.locator('button').filter({ hasText: /发送.*验证码/i });
      const sendOtpVisible = await sendOtpBtn.isVisible().catch(() => false);
      console.log('Send OTP button visible:', sendOtpVisible);

      if (sendOtpVisible) {
        // Get button text before click
        const btnTextBefore = await sendOtpBtn.textContent().catch(() => 'unknown');
        console.log('Send OTP button text BEFORE click:', btnTextBefore);

        await sendOtpBtn.click();

        // Wait longer for response and any toasts
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'artifacts/after-send-otp.png', fullPage: true });

        // Check for any visible error messages
        const errorElements = page.locator('text=/请求过于频繁|错误|失败|error|rate limit/i');
        const errorCount = await errorElements.count();
        console.log('Error messages found:', errorCount);

        for (let i = 0; i < errorCount; i++) {
          const text = await errorElements.nth(i).textContent();
          console.log(`Error ${i}:`, text);
        }

        // Check for success messages
        const successElements = page.locator('text=/验证码已发送|查收邮箱|成功/sent/i');
        const successCount = await successElements.count();
        console.log('Success messages found:', successCount);

        for (let i = 0; i < successCount; i++) {
          const text = await successElements.nth(i).textContent();
          console.log(`Success ${i}:`, text);
        }

        // Check button state - might be disabled with countdown
        const sendOtpBtnAfter = page.locator('button').filter({ hasText: /发送|重新发送|验证码/ });
        const btnCount = await sendOtpBtnAfter.count();
        console.log('OTP-related buttons after click:', btnCount);

        for (let i = 0; i < btnCount; i++) {
          const text = await sendOtpBtnAfter.nth(i).textContent();
          const disabled = await sendOtpBtnAfter.nth(i).isDisabled();
          console.log(`Button ${i}: text="${text}", disabled=${disabled}`);
        }
      }
    }

    // Log all API calls
    console.log('=== API CALLS SUMMARY ===');
    apiCalls.forEach(call => {
      console.log(`- ${call.url.substring(0, 80)}... | Status: ${call.status || 'pending'}`);
    });

    // Check for toasts or error messages
    const toasts = page.locator('[class*="toast"], [role="alert"], .toast');
    const toastCount = await toasts.count();
    console.log('Toast elements:', toastCount);

    for (let i = 0; i < toastCount; i++) {
      const text = await toasts.nth(i).textContent();
      const isVisible = await toasts.nth(i).isVisible();
      console.log(`Toast ${i} (visible: ${isVisible}):`, text?.trim());
    }

    // Check all visible text on page
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains rate limit message:', bodyText?.includes('请求过于频繁'));
    console.log('Page contains success message:', bodyText?.includes('验证码已发送'));
  });
});
