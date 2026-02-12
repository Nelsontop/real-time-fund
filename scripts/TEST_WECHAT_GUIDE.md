# 企业微信机器人推送测试指南

## 方法一：使用测试脚本（推荐）

### 步骤 1：获取当前基金数据

1. 在浏览器中打开应用：http://localhost:3000
2. 打开浏览器开发者工具（F12）
3. 切换到 Console 标签
4. 执行以下代码复制基金数据：

```javascript
copy(JSON.parse(localStorage.getItem('funds')))
```

5. 将复制的数据保存到 `scripts/funds.json` 文件

### 步骤 2：获取企业微信 Webhook URL

1. 在企业微信群中添加机器人
2. 获取 Webhook 地址（格式类似：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）

### 步骤 3：运行测试脚本

```bash
# 方法A：使用保存的基金数据文件
node scripts/test-wechat-push.js <webhook_url> scripts/funds.json

# 方法B：直接运行（会提示如何获取数据）
node scripts/test-wechat-push.js
```

## 方法二：在浏览器控制台直接测试

打开应用后，在浏览器控制台执行：

```javascript
// 获取当前基金数据
const funds = JSON.parse(localStorage.getItem('funds'));

// 筛选涨幅为正的基金
const positiveFunds = funds.filter(f => typeof f.gszzl === 'number' && f.gszzl > 0);

console.log('涨幅为正的基金：', positiveFunds);

// 手动触发推送（需要先在设置中配置 webhook）
if (positiveFunds.length > 0 && window.weChatWebhookUrl) {
  const changedFunds = positiveFunds.map(f => ({
    code: f.code,
    name: f.name,
    oldNetValue: f.dwjz,
    newNetValue: f.gsz || f.dwjz,
    change: f.gszzl.toFixed(4)
  }));

  // 调用发送函数
  await sendWeChatPush(changedFunds);
} else {
  console.error('请先在设置中配置企业微信 Webhook URL');
}
```

## 消息格式示例

发送的消息格式如下：

```
📈 基估宝涨幅提醒

时间：2026-02-11 15:30:00

易方达蓝筹精选混合（110022）
  净值：1.2345
  涨幅：+2.35%

招商中证白酒指数（161725）
  净值：0.9876
  涨幅：+1.89%

共 2 只基金上涨 🎉
```

## 注意事项

1. 企业微信 Webhook URL 不要泄露
2. 每个机器人每分钟最多发送 20 条消息
3. 消息内容不能超过 4096 字节
4. 如果测试失败，检查：
   - Webhook URL 是否正确
   - 网络连接是否正常
   - 是否有涨幅为正的基金
