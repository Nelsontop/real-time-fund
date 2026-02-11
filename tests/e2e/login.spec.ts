import { test, expect } from '@playwright/test'

test.describe('Login Functionality', () => {
  test('should display login UI correctly', async ({ page }) => {
    // Step 1: Navigate to the application
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Step 2: Take screenshot of initial page
    await page.screenshot({
      path: 'tests/artifacts/01-initial-page.png',
      fullPage: true
    })

    // Verify page loaded successfully - look for the app title
    await expect(page.locator('.brand span:has-text("基估宝")')).toBeVisible()
    console.log('Page loaded successfully - found "基估宝" title')

    // Step 3: Find and click the login/user button
    // The button has aria-label="登录"
    const loginButton = page.locator('button[aria-label="登录"]')
    await expect(loginButton, 'Login button should be visible').toBeVisible()
    console.log('Found login button with aria-label="登录"')

    // Click the login button to open user menu
    await loginButton.click()
    await page.waitForTimeout(500) // Wait for dropdown animation

    // Step 4: Take screenshot of user menu dropdown
    await page.screenshot({
      path: 'tests/artifacts/02-user-menu-dropdown.png',
      fullPage: true
    })

    // Step 5: Click the "登录" (Login) option from the dropdown
    const loginOption = page.locator('.user-menu-item:has-text("登录"), button:has-text("登录")')
    await expect(loginOption, 'Login option should be visible in dropdown').toBeVisible()
    console.log('Found "登录" option in dropdown')

    await loginOption.click()
    await page.waitForTimeout(500) // Wait for modal animation

    // Step 6: Take screenshot of login modal
    await page.screenshot({
      path: 'tests/artifacts/03-login-modal.png',
      fullPage: true
    })

    // Step 7: Check for email input in the login modal
    const emailInputSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="邮箱" i]',
      'input[placeholder*="Email" i]',
      'input[placeholder*="邮件" i]',
      'input[placeholder*="登录" i]',
    ]

    let emailInput = null
    for (const selector of emailInputSelectors) {
      try {
        emailInput = page.locator(selector).first()
        if (await emailInput.isVisible({ timeout: 1000 })) {
          console.log(`Found email input with selector: ${selector}`)
          break
        }
      } catch (e) {
        // Continue
      }
    }

    // Log all visible inputs for debugging
    const allInputs = await page.locator('input').all()
    console.log(`Found ${allInputs.length} input elements on page`)
    for (const input of allInputs) {
      const type = await input.getAttribute('type') || 'text'
      const placeholder = await input.getAttribute('placeholder') || ''
      const name = await input.getAttribute('name') || ''
      const isVisible = await input.isVisible()
      if (isVisible) {
        console.log(`Visible Input: type="${type}", placeholder="${placeholder}", name="${name}"`)
      }
    }

    if (emailInput && await emailInput.isVisible()) {
      console.log('Email input is visible in modal')

      // Step 8: Enter a test email
      await emailInput.fill('test@example.com')
      await page.screenshot({
        path: 'tests/artifacts/04-email-entered.png',
        fullPage: true
      })
      console.log('Entered test email: test@example.com')
    } else {
      console.log('Email input not found in login modal')
    }

    // Step 9: Check for OTP input or code input
    const otpInputSelectors = [
      'input[name="otp"]',
      'input[name="code"]',
      'input[placeholder*="验证码" i]',
      'input[placeholder*="code" i]',
      'input[placeholder*="OTP" i]',
      'input[maxlength="6"]',
    ]

    let otpInput = null
    for (const selector of otpInputSelectors) {
      try {
        const inputs = page.locator(selector)
        const count = await inputs.count()
        for (let i = 0; i < count; i++) {
          const input = inputs.nth(i)
          if (await input.isVisible({ timeout: 500 })) {
            otpInput = input
            console.log(`Found OTP-like input: ${selector}`)
            break
          }
        }
        if (otpInput) break
      } catch (e) {
        // Continue
      }
    }

    if (otpInput) {
      console.log('OTP input found')
    } else {
      console.log('OTP input not found (might appear after sending code)')
    }

    // Step 10: Look for send code/submit buttons in the modal
    const modalButtonSelectors = [
      'button:has-text("发送验证码")',
      'button:has-text("发送")',
      'button:has-text("获取验证码")',
      'button:has-text("登录")',
      'button:has-text("注册")',
      'button:has-text("提交")',
      'button:has-text("确认")',
    ]

    let foundButtons = []
    for (const selector of modalButtonSelectors) {
      const buttons = page.locator(selector)
      const count = await buttons.count()
      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i)
        if (await btn.isVisible({ timeout: 500 })) {
          const text = await btn.textContent()
          const disabled = await btn.isDisabled()
          foundButtons.push({ selector, text: text?.trim(), disabled })
          console.log(`Found button: "${text?.trim()}", disabled=${disabled}`)
        }
      }
    }

    // Log all visible buttons for comprehensive debugging
    const allButtons = await page.locator('button').all()
    console.log(`\nAll visible buttons on page (${allButtons.length} total):`)
    for (const btn of allButtons) {
      const isVisible = await btn.isVisible()
      if (isVisible) {
        const text = await btn.textContent()
        const ariaLabel = await btn.getAttribute('aria-label')
        const className = await btn.getAttribute('class') || ''
        const type = await btn.getAttribute('type')
        const disabled = await btn.isDisabled()
        console.log(`  Button: text="${text?.trim()}", aria-label="${ariaLabel}", type="${type}", disabled=${disabled}, class="${className}"`)
      }
    }

    await page.screenshot({
      path: 'tests/artifacts/05-button-state.png',
      fullPage: true
    })

    // Step 11: Try to click the send code button if found
    const sendCodeButton = page.locator('button:has-text("发送验证码"), button:has-text("发送"), button:has-text("获取验证码")').first()
    if (await sendCodeButton.isVisible({ timeout: 1000 })) {
      const isEnabled = await sendCodeButton.isEnabled()
      console.log(`Send code button enabled: ${isEnabled}`)

      if (isEnabled) {
        try {
          await sendCodeButton.click()
          await page.waitForTimeout(3000)

          await page.screenshot({
            path: 'tests/artifacts/06-after-send-code.png',
            fullPage: true
          })

          // Check for toast/error messages
          const toastSelectors = [
            '.toast',
            '.notification',
            '.error',
            '.success',
            '[role="alert"]',
            '.message',
            '.tip'
          ]

          for (const selector of toastSelectors) {
            const toast = page.locator(selector)
            if (await toast.isVisible({ timeout: 1000 })) {
              const toastText = await toast.textContent()
              console.log(`Toast/Notification message: "${toastText}"`)
            }
          }
        } catch (e) {
          console.log('Click interaction error:', e.message || e)
        }
      }
    } else {
      console.log('Send code button not visible - may need different interaction')
    }

    // Final screenshot
    await page.screenshot({
      path: 'tests/artifacts/07-final-state.png',
      fullPage: true
    })

    // Check modal structure
    const modalSelectors = [
      '.modal',
      '[role="dialog"]',
      '.auth-modal',
      '.login-modal',
      '.overlay'
    ]

    console.log('\nModal elements found:')
    for (const selector of modalSelectors) {
      const elements = page.locator(selector)
      const count = await elements.count()
      for (let i = 0; i < count; i++) {
        if (await elements.nth(i).isVisible({ timeout: 500 })) {
          console.log(`  - ${selector}`)
        }
      }
    }
  })

  test('should find Supabase-related elements', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check if Supabase is loaded
    const supabaseScript = await page.locator('script[src*="supabase"]').count()
    console.log(`Supabase scripts found: ${supabaseScript}`)

    // Check for any auth-related elements
    const authElements = await page.locator('[class*="auth"], [id*="auth"]').all()
    console.log(`Auth-related elements found: ${authElements.length}`)

    // Screenshot for reference
    await page.screenshot({
      path: 'tests/artifacts/supabase-check.png',
      fullPage: true
    })
  })

  test('should explore login flow without clicking', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click login button
    await page.locator('button[aria-label="登录"]').click()
    await page.waitForTimeout(500)

    // Check what's in the user menu
    const userMenuItems = page.locator('.user-menu-item, .user-menu button, [role="menuitem"]')
    const itemCount = await userMenuItems.count()
    console.log(`User menu items found: ${itemCount}`)

    for (let i = 0; i < itemCount; i++) {
      const item = userMenuItems.nth(i)
      const text = await item.textContent()
      const isVisible = await item.isVisible()
      console.log(`  Menu item ${i + 1}: "${text?.trim()}" (visible: ${isVisible})`)
    }

    await page.screenshot({
      path: 'tests/artifacts/user-menu-items.png',
      fullPage: true
    })
  })
})
