#!/usr/bin/env node

/**
 * Login Test Script
 * Tests the login functionality with verification code
 */

const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotDir = path.join(__dirname, '../test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Simple test using curl and JavaScript
async function testLogin() {
  const { chromium } = require('playwright-core');
  const puppeteer = require('puppeteer-core');

  console.log('='.repeat(60));
  console.log('LOGIN FUNCTIONALITY TEST');
  console.log('='.repeat(60));
  console.log('\nTest Configuration:');
  console.log('  Email: 379852731@qq.com');
  console.log('  Verification Code: 71994697');
  console.log('  URL: http://localhost:3000');
  console.log('\n' + '='.repeat(60) + '\n');

  let browser;
  let page;

  try {
    // Try Puppeteer first
    console.log('Step 1: Launching browser...');
    const chromePaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium',
    ];

    let executablePath = null;
    for (const p of chromePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        console.log(`  Found Chrome/Chromium at: ${p}`);
        break;
      }
    }

    browser = await puppeteer.launch({
      executablePath: executablePath || undefined,
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Set up console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('error') || text.includes('Error')) {
        console.log(`  [Browser Console ${type}]: ${text}`);
      }
    });

    // Listen for responses
    page.on('response', response => {
      const url = response.url();
      if (url.includes('supabase') || url.includes('auth')) {
        console.log(`  [API Response] ${url} -> ${response.status()}`);
      }
    });

    console.log('\nStep 2: Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    // Take initial screenshot
    const screenshot1 = path.join(screenshotDir, '01-initial-page.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    console.log(`  Screenshot saved: ${screenshot1}`);

    // Check page title
    const title = await page.title();
    console.log(`  Page title: ${title}`);

    console.log('\nStep 3: Looking for login button...');
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Try to find the login/user button using multiple selectors
    const loginSelectors = [
      'button[aria-label="用户"]',
      'button:has-text("登录")',
      '[data-testid="user-menu-button"]',
      'svg.lucide-user',  // User icon
      'button:has(svg.lucide-user)',
      'button:has(svg)',  // Any button with SVG
    ];

    let loginButton = null;
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        loginButton = selector;
        console.log(`  Found login button with selector: ${selector}`);
        break;
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!loginButton) {
      // Get all buttons and find one with user-related text or icon
      const buttons = await page.$$eval('button', buttons => buttons.map(b => ({
        text: b.textContent?.trim(),
        html: b.innerHTML?.substring(0, 200),
      })));
      console.log('  Available buttons:', JSON.stringify(buttons, null, 2));

      // Click the first button that looks like a user/login button
      const userBtn = await page.$('button');
      if (userBtn) {
        console.log('  Clicking first available button as fallback');
        await userBtn.click();
      }
    } else {
      await page.click(loginButton);
    }

    await page.waitForTimeout(1000);

    // Take screenshot after clicking login button
    const screenshot2 = path.join(screenshotDir, '02-after-login-click.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log(`  Screenshot saved: ${screenshot2}`);

    console.log('\nStep 4: Looking for email input field...');

    // Wait for modal to appear
    await page.waitForTimeout(1500);

    // Try to find email input
    const emailInputSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="邮箱"]',
      'input[placeholder*="email"]',
      '#email',
      '.email-input',
    ];

    let emailInput = null;
    for (const selector of emailInputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        emailInput = selector;
        console.log(`  Found email input with selector: ${selector}`);
        break;
      } catch (e) {
        // Continue
      }
    }

    if (!emailInput) {
      // Try to find any input
      const inputs = await page.$$eval('input', inputs => inputs.map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        id: i.id,
      })));
      console.log('  Available inputs:', JSON.stringify(inputs, null, 2));

      // Use the first text-like input
      const firstInput = await page.$('input');
      if (firstInput) {
        emailInput = 'input:first-of-type';
      } else {
        throw new Error('No input field found!');
      }
    }

    console.log('\nStep 5: Entering email: 379852731@qq.com');
    await page.click(emailInput);
    await page.type(emailInput, '379852731@qq.com', { delay: 50 });

    await page.waitForTimeout(500);

    // Take screenshot after entering email
    const screenshot3 = path.join(screenshotDir, '03-after-email.png');
    await page.screenshot({ path: screenshot3, fullPage: true });
    console.log(`  Screenshot saved: ${screenshot3}`);

    console.log('\nStep 6: Clicking "Send verification code" button...');

    // Find and click the send code button
    const sendCodeSelectors = [
      'button:has-text("发送邮箱验证码")',
      'button:has-text("发送验证码")',
      'button:has-text("发送")',
      'button[type="submit"]',
      'button.send-code',
    ];

    let sendCodeButton = null;
    for (const selector of sendCodeSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        sendCodeButton = selector;
        console.log(`  Found send code button: ${selector}`);
        break;
      } catch (e) {
        // Continue
      }
    }

    if (sendCodeButton) {
      await page.click(sendCodeButton);
    } else {
      // Get all buttons and find one with send-related text
      const buttons = await page.$$eval('button', btns =>
        btns.filter(b => b.textContent?.includes('发送') || b.textContent?.includes('Send'))
          .map(b => b.textContent?.trim())
      );
      console.log('  Buttons with send text:', buttons);

      // Click the last button (usually submit)
      const allButtons = await.page.$$('button');
      if (allButtons.length > 0) {
        await allButtons[allButtons.length - 1].click();
      }
    }

    await page.waitForTimeout(2000);

    // Take screenshot after clicking send code
    const screenshot4 = path.join(screenshotDir, '04-after-send-code.png');
    await page.screenshot({ path: screenshot4, fullPage: true });
    console.log(`  Screenshot saved: ${screenshot4}`);

    console.log('\nStep 7: Entering verification code: 71994697');

    // Find verification code input
    const codeInputSelectors = [
      'input[name="code"]',
      'input[name="token"]',
      'input[placeholder*="验证码"]',
      'input[placeholder*="code"]',
      '#code',
      '#token',
      '#verification-code',
      'input[type="text"]:not([type="email"])',
    ];

    let codeInput = null;
    for (const selector of codeInputSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          codeInput = selector;
          console.log(`  Found code input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (!codeInput) {
      // Find all text inputs that aren't email
      const inputs = await page.$$eval('input[type="text"]', inputs =>
        inputs.map(i => ({ name: i.name, id: i.id, placeholder: i.placeholder }))
      );
      console.log('  Available text inputs:', JSON.stringify(inputs, null, 2));

      // Use the second input if available
      const allInputs = await page.$$('input');
      if (allInputs.length > 1) {
        codeInput = allInputs[1];
      }
    }

    if (codeInput) {
      await page.click(codeInput);
      await page.type(codeInput, '71994697', { delay: 50 });
    } else {
      console.log('  WARNING: Could not find code input field');
    }

    await page.waitForTimeout(500);

    // Take screenshot after entering code
    const screenshot5 = path.join(screenshotDir, '05-after-code.png');
    await page.screenshot({ path: screenshot5, fullPage: true });
    console.log(`  Screenshot saved: ${screenshot5}`);

    console.log('\nStep 8: Clicking confirm/verify button...');

    // Find and click verify button
    const verifySelectors = [
      'button:has-text("确认")',
      'button:has-text("验证")',
      'button:has-text("登录")',
      'button:has-text("Verify")',
      'button[type="submit"]',
    ];

    let verifyButton = null;
    for (const selector of verifySelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        verifyButton = selector;
        console.log(`  Found verify button: ${selector}`);
        break;
      } catch (e) {
        // Continue
      }
    }

    if (verifyButton) {
      await page.click(verifyButton);
    } else {
      // Click the last button
      const allButtons = await page.$$('button');
      if (allButtons.length > 0) {
        await allButtons[allButtons.length - 1].click();
      }
    }

    console.log('\nStep 9: Waiting for login response...');
    await page.waitForTimeout(5000);

    // Take final screenshot
    const screenshot6 = path.join(screenshotDir, '06-after-verify.png');
    await page.screenshot({ path: screenshot6, fullPage: true });
    console.log(`  Screenshot saved: ${screenshot6}`);

    console.log('\nStep 10: Checking for messages...');

    // Check for success message
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasSuccessMessage = pageText.includes('登录成功') ||
                               pageText.includes('正在同步云端数据') ||
                               pageText.includes('同步完成');

    const hasErrorMessage = pageText.includes('错误') ||
                           pageText.includes('失败') ||
                           pageText.includes('error') ||
                           pageText.includes('Error') ||
                           pageText.includes('云端配置加载失败');

    console.log(`  Success message found: ${hasSuccessMessage}`);
    console.log(`  Error message found: ${hasErrorMessage}`);

    if (hasSuccessMessage) {
      console.log('\n  SUCCESS: Login appears to have worked!');
    } else if (hasErrorMessage) {
      console.log('\n  FAILURE: Error detected in page');
    } else {
      console.log('\n  UNKNOWN: Could not determine login status');
    }

    // Get page HTML for debugging
    const html = await page.content();
    const htmlPath = path.join(screenshotDir, 'page-content.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`  Page HTML saved: ${htmlPath}`);

    // Look for specific error messages
    console.log('\nStep 11: Checking for specific messages in page...');

    const messages = await page.evaluate(() => {
      const results = [];

      // Check all text nodes
      const walk = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while (node = walk.nextNode()) {
        const text = node.textContent?.trim();
        if (text && (text.includes('登录') || text.includes('同步') || text.includes('错误') || text.includes('云端'))) {
          results.push(text);
        }
      }

      return results;
    });

    console.log('  Relevant messages found:');
    messages.forEach(msg => console.log(`    - ${msg}`));

    // Take one more screenshot after delay
    await page.waitForTimeout(3000);
    const screenshot7 = path.join(screenshotDir, '07-final.png');
    await page.screenshot({ path: screenshot7, fullPage: true });
    console.log(`\n  Final screenshot saved: ${screenshot7}`);

  } catch (error) {
    console.error('\nERROR during test:', error.message);
    console.error(error.stack);

    // Try to take error screenshot
    if (page) {
      try {
        const errorScreenshot = path.join(screenshotDir, 'error.png');
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        console.log(`Error screenshot saved: ${errorScreenshot}`);
      } catch (e) {
        // Ignore
      }
    }
  } finally {
    if (browser) {
      console.log('\nClosing browser...');
      await browser.close();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nScreenshots saved to: ${screenshotDir}`);
  console.log('\nPlease review the screenshots to verify the login flow.');
  console.log('\nKey files to check:');
  console.log('  - 01-initial-page.png: Initial page load');
  console.log('  - 02-after-login-click.png: Login modal');
  console.log('  - 03-after-email.png: After entering email');
  console.log('  - 04-after-send-code.png: After sending code');
  console.log('  - 05-after-code.png: After entering code');
  console.log('  - 06-after-verify.png: After clicking verify');
  console.log('  - 07-final.png: Final state');
  console.log('  - page-content.html: Full HTML for debugging');
}

// Try to run with different browser libraries
(async () => {
  try {
    // First try with puppeteer
    const puppeteer = require('puppeteer');
    console.log('Using Puppeteer for browser automation...\n');
    await testLogin();
  } catch (error) {
    console.error('Failed to run test:', error.message);

    // Fallback: Try with curl and manual instructions
    console.log('\n' + '='.repeat(60));
    console.log('AUTOMATED TEST FAILED - MANUAL TEST INSTRUCTIONS');
    console.log('='.repeat(60));
    console.log('\nPlease test manually:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Click the login/user button');
    console.log('3. Enter email: 379852731@qq.com');
    console.log('4. Click "发送邮箱验证码"');
    console.log('5. Enter code: 71994697');
    console.log('6. Click verify/confirm');
    console.log('7. Check for "登录成功，正在同步云端数据..." message');
    console.log('8. Open browser DevTools Console to check for errors');
  }
})();
