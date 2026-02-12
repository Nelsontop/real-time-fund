#!/usr/bin/env node

/**
 * 企业微信机器人推送测试脚本
 *
 * 使用方法：
 * 1. 确保应用正在运行（docker compose up）
 * 2. 在浏览器中打开应用并添加一些基金
 * 3. 打开浏览器开发者工具（F12）
 * 4. 在 Console 中执行以下代码获取当前基金数据：
 *
 *    copy(JSON.parse(localStorage.getItem('funds')))
 *
 * 5. 运行此脚本：
 *    node scripts/test-wechat-push.js <webhook_url>
 *
 * 示例：
 *    node scripts/test-wechat-push.js https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
 */

// Node.js 18+ 内置 fetch，不需要导入
// Node.js 16 或更低版本需要：npm install node-fetch
if (typeof fetch === 'undefined') {
  console.error('❌ 需要 Node.js 18+ 或安装 node-fetch：npm install node-fetch');
  process.exit(1);
}

async function sendWeChatPush(webhookUrl, funds) {
  // 筛选涨幅为正的基金
  const positiveFunds = funds.filter(f => {
    const change = f.gszzl; // 今日估值涨跌幅
    return typeof change === 'number' && change > 0;
  });

  if (positiveFunds.length === 0) {
    console.log('❌ 没有涨幅为正的基金');
    return;
  }

  console.log(`\n找到 ${positiveFunds.length} 只涨幅为正的基金：`);
  positiveFunds.forEach(f => {
    console.log(`  - ${f.name}(${f.code}): +${f.gszzl}%`);
  });

  // 构建推送消息（企业微信文本消息格式）
  const textContent = `📈 基估宝涨幅提醒

时间：${new Date().toLocaleString('zh-CN', { hour12: false })}

${positiveFunds.map(f => {
  const netValue = f.gsz || f.dwjz || '—';
  return `${f.name}（${f.code})
  净值：${netValue}
  涨幅：+${f.gszzl}%
`;
}).join('')}

共 ${positiveFunds.length} 只基金上涨 🎉`;

  const message = {
    msgtype: 'text',
    text: {
      content: textContent
    }
  };

  try {
    console.log(`\n发送消息到企业微信...`);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errcode === 0) {
      console.log('✅ 推送成功！', result);
    } else {
      console.error('❌ 推送失败：', result);
    }
  } catch (error) {
    console.error('❌ 推送失败：', error.message);
  }
}

// 主函数
async function main() {
  const webhookUrl = process.argv[2];

  if (!webhookUrl) {
    console.error('❌ 请提供企业微信 Webhook URL');
    console.log('\n使用方法：');
    console.log('  node scripts/test-wechat-push.js <webhook_url>');
    console.log('\n获取当前基金数据：');
    console.log('  1. 在浏览器中打开应用');
    console.log('  2. 打开开发者工具（F12）');
    console.log('  3. 在 Console 中执行：copy(JSON.parse(localStorage.getItem(\'funds\')))');
    console.log('  4. 将复制的数据保存到 funds.json 文件');
    console.log('  5. 运行：node scripts/test-wechat-push.js <webhook_url> funds.json\n');
    process.exit(1);
  }

  // 检查是否提供了基金数据文件
  const fundsFile = process.argv[3];

  if (fundsFile) {
    const fs = require('fs');
    try {
      const fundsData = fs.readFileSync(fundsFile, 'utf8');
      const funds = JSON.parse(fundsData);
      await sendWeChatPush(webhookUrl, funds);
    } catch (error) {
      console.error(`❌ 读取基金数据失败：${error.message}`);
      process.exit(1);
    }
  } else {
    console.log('\n提示：可以使用以下命令从文件读取基金数据：');
    console.log('  node scripts/test-wechat-push.js <webhook_url> funds.json\n');
  }
}

main();
