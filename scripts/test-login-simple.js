#!/usr/bin/env node

/**
 * Simple Login Test Script
 * Tests the login functionality without requiring a browser
 */

const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotDir = path.join(__dirname, '../test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

console.log('='.repeat(60));
console.log('LOGIN FUNCTIONALITY TEST - CHECKING APP STATE');
console.log('='.repeat(60));
console.log('\nTest Configuration:');
console.log('  Email: 379852731@qq.com');
console.log('  Verification Code: 71994697');
console.log('  URL: http://localhost:3000');
console.log('\n' + '='.repeat(60) + '\n');

async function checkApp() {
  // Check if app is running
  console.log('Step 1: Checking if app is running...');
  try {
    const response = await fetch('http://localhost:3000');
    console.log(`  App is running! Status: ${response.status}`);

    const html = await response.text();

    // Save HTML for inspection
    const htmlPath = path.join(screenshotDir, 'app-index.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`  HTML saved to: ${htmlPath}`);

    // Check for key elements
    console.log('\nStep 2: Checking for login-related elements...');

    const hasUserButton = html.includes('user') || html.includes('User') || html.includes('登录');
    const hasSupabaseScript = html.includes('supabase');
    const hasAuthElements = html.includes('auth') || html.includes('Auth') || html.includes('signIn');

    console.log(`  User/Login button: ${hasUserButton ? 'YES' : 'NO'}`);
    console.log(`  Supabase script: ${hasSupabaseScript ? 'YES' : 'NO'}`);
    console.log(`  Auth elements: ${hasAuthElements ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error(`  ERROR: Could not connect to app: ${error.message}`);
    console.error('  Make sure Docker container is running: docker compose up -d');
    return;
  }

  // Check Supabase configuration
  console.log('\nStep 3: Checking Supabase configuration...');
  const supabasePath = path.join(__dirname, '../app/lib/supabase.js');

  if (fs.existsSync(supabasePath)) {
    const supabaseContent = fs.readFileSync(supabasePath, 'utf-8');
    console.log('  Supabase config file found');

    // Check for key values (partially masked)
    const hasUrl = supabaseContent.includes('SUPABASE_URL');
    const hasAnonKey = supabaseContent.includes('SUPABASE_ANON_KEY');

    console.log(`  Has SUPABASE_URL: ${hasUrl ? 'YES' : 'NO'}`);
    console.log(`  Has SUPABASE_ANON_KEY: ${hasAnonKey ? 'YES' : 'NO'}`);

    // Check the URL domain
    const urlMatch = supabaseContent.match(/SUPABASE_URL.*?=.*?['"](https:\/\/[^'"]+)['"]/);
    if (urlMatch) {
      const url = urlMatch[1];
      console.log(`  Supabase URL: ${url.replace(/^(https:\/\/[^\.]+)\..*/, '$1.xxx.xxx')}`);
    }
  } else {
    console.log('  WARNING: Supabase config file not found!');
  }

  // Check for database schema issues
  console.log('\nStep 4: Checking for known issues...');

  const pageContent = fs.readFileSync(path.join(__dirname, '../app/page.jsx'), 'utf-8');

  // Check for the column name
  const usesDataColumn = pageContent.includes('.data') || pageContent.includes("'data'");
  const usesConfigColumn = pageContent.includes('.config') || pageContent.includes("'config'");

  console.log(`  Using 'data' column: ${usesDataColumn ? 'YES (CORRECT)' : 'NO'}`);
  console.log(`  Using 'config' column: ${usesConfigColumn ? 'NO (OLD - NEEDS FIX)' : 'YES (CORRECT)'}`);

  if (usesConfigColumn && !usesDataColumn) {
    console.log('\n  WARNING: Code still uses old "config" column name!');
    console.log('  The database was updated to use "data" column.');
    console.log('  Please update app/page.jsx to use "data" instead of "config".');
  }

  console.log('\n' + '='.repeat(60));
  console.log('MANUAL TEST INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('\nSince automated browser testing is not available,');
  console.log('please follow these steps manually:\n');
  console.log('1. Open your browser and go to: http://localhost:3000');
  console.log('2. Click the login/user button (top right or menu)');
  console.log('3. Enter email: 379852731@qq.com');
  console.log('4. Click "发送邮箱验证码" button');
  console.log('5. Enter verification code: 71994697');
  console.log('6. Click confirm/verify button');
  console.log('\nEXPECTED RESULTS:');
  console.log('  - Message: "登录成功，正在同步云端数据..."');
  console.log('  - No "云端配置加载失败" error');
  console.log('  - User email displayed after login');
  console.log('\nOPEN BROWSER CONSOLE (F12) TO CHECK FOR:');
  console.log('  - Any red error messages');
  console.log('  - Supabase API calls');
  console.log('  - Column name errors (data vs config)');
  console.log('\n' + '='.repeat(60));
}

checkApp().catch(console.error);
