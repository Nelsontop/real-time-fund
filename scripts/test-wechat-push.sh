#!/bin/bash

# 企业微信机器人推送测试脚本
#
# 使用方法：
#   bash scripts/test-wechat-push.sh <webhook_url>

WEBHOOK_URL="$1"

if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ 请提供企业微信 Webhook URL"
  echo ""
  echo "使用方法："
  echo "  bash scripts/test-wechat-push.sh <webhook_url>"
  echo ""
  echo "示例："
  echo '  bash scripts/test-wechat-push.sh "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"'
  echo ""
  exit 1
fi

# 示例数据：涨幅为正的基金
cat > /tmp/test-funds.json << 'EOF'
[
  {
    "code": "110022",
    "name": "易方达蓝筹精选混合",
    "dwjz": "1.2345",
    "gsz": "1.2635",
    "gszzl": 2.35,
    "gztime": "15:00:00"
  },
  {
    "code": "161725",
    "name": "招商中证白酒指数",
    "dwjz": "0.9876",
    "gsz": "1.0063",
    "gszzl": 1.89,
    "gztime": "15:00:00"
  },
  {
    "code": "000001",
    "name": "华夏成长混合",
    "dwjz": "1.5678",
    "gsz": "1.5936",
    "gszzl": 1.71,
    "gztime": "15:00:00"
  }
]
EOF

echo "📊 使用示例基金数据测试企业微信推送..."
echo ""

# 使用 Node.js 脚本发送
node scripts/test-wechat-push.js "$WEBHOOK_URL" /tmp/test-funds.json

# 清理临时文件
rm -f /tmp/test-funds.json

echo ""
echo "✅ 测试完成"
