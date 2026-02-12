# 企业微信机器人推送 - 快速测试

## 快速测试（使用示例数据）

最简单的测试方式，使用预设的示例基金数据：

```bash
# 替换为你的企业微信 Webhook URL
bash scripts/test-wechat-push.sh "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"
```

这将发送包含3只正涨幅基金的消息到企业微信。

## 详细测试（使用真实基金数据）

### 步骤 1：获取当前基金数据

1. 打开应用：http://localhost:3000
2. 添加一些基金（至少要有涨跌幅数据）
3. 打开浏览器开发者工具（F12）→ Console 标签
4. 执行以下代码复制基金数据：

```javascript
copy(JSON.parse(localStorage.getItem('funds')))
```

5. 将复制的数据保存到文件：`scripts/funds.json`

### 步骤 2：运行测试脚本

```bash
# 替换为你的企业微信 Webhook URL
node scripts/test-wechat-push.js "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY" scripts/funds.json
```

## 预期消息格式

```
📈 基估宝涨幅提醒

时间：2026-02-11 15:30:00

易方达蓝筹精选混合（110022）
  净值：1.2635
  涨幅：+2.35%

招商中证白酒指数（161725）
  净值：1.0063
  涨幅：+1.89%

华夏成长混合（000001）
  净值：1.5936
  涨幅：+1.71%

共 3 只基金上涨 🎉
```

## 获取企业微信 Webhook URL

1. 在企业微信群中，点击右上角 "..."
2. 选择 "添加群机器人"
3. 创建机器人并获取 Webhook 地址
4. 复制完整的 URL（格式：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）

## 故障排查

### 问题：没有涨幅为正的基金

修改 `funds.json` 文件，确保至少有一个基金的 `gszzl` 字段为正数：

```json
[
  {
    "code": "110022",
    "name": "易方达蓝筹精选混合",
    "gszzl": 2.35
  }
]
```

### 问题：推送失败

检查：
1. Webhook URL 是否完整（包含 key 参数）
2. 网络连接是否正常
3. 企业微信群机器人是否已删除
4. 频率限制（每分钟最多 20 条）

### 问题：Node.js 版本过低

如果看到 `fetch is not defined` 错误：

```bash
# 方案 A：升级 Node.js（推荐）
nvm install 18
nvm use 18

# 方案 B：安装 node-fetch
npm install node-fetch
```
