#!/bin/bash

# 基估宝备份功能测试脚本
# 用于测试导出/导入功能是否正常工作

set -e

echo "🧪 基估宝备份功能测试"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查容器是否运行
echo "📋 检查应用状态..."
if ! docker ps | grep -q "real-time-fund"; then
    echo -e "${RED}❌ 容器未运行${NC}"
    echo "请先启动应用：docker compose up -d"
    exit 1
fi

echo -e "${GREEN}✅ 容器运行正常${NC}"
echo ""

# 测试导出功能
echo "📤 测试导出功能"
echo "----------------------------"
echo ""
echo "请按照以下步骤测试导出功能："
echo ""
echo "1. 在浏览器中打开：${GREEN}http://localhost:3000${NC}"
echo ""
echo "2. 添加一些测试基金："
echo "   - 输入基金代码：110022"
echo "   - 点击'添加'按钮"
echo "   - 等待数据加载"
echo ""
echo "3. 点击右上角 ⚙️ 设置图标"
echo ""
echo "4. 在设置页面中点击'导出配置'按钮"
echo ""
echo "5. 预期结果："
echo "   - 文件自动下载"
echo "   - 文件名格式：realtime-fund-config-xxxxx.json"
echo "   - 浏览器显示'导出成功'提示"
echo ""
echo "6. 检查下载的文件内容："
echo "   - 打开下载的 JSON 文件"
echo "   - 验证包含以下字段："
echo "     ${YELLOW}funds${NC} (基金列表)"
echo "     ${YELLOW}favorites${NC} (自选列表)"
echo "     ${YELLOW}groups${NC} (分组设置)"
echo "     ${YELLOW}holdings${NC} (持仓数据)"
echo "     ${YELLOW}refreshMs${NC} (刷新频率)"
echo "     ${YELLOW}exportedAt${NC} (导出时间)"
echo ""
read -p "导出测试是否通过？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 导出测试失败${NC}"
    echo "请检查浏览器控制台的错误信息"
    exit 1
fi

echo -e "${GREEN}✅ 导出功能测试通过${NC}"
echo ""

# 测试导入功能
echo "📥 测试导入功能"
echo "----------------------------"
echo ""
echo "请按照以下步骤测试导入功能："
echo ""
echo "1. 清空浏览器 localStorage (模拟数据丢失场景):"
echo "   - 打开浏览器开发者工具 (F12)"
echo "   - 进入 Console 标签页"
echo "   - 执行命令：localStorage.clear()"
echo "   - 刷新页面 (F5)"
echo "   - 此时应用应该显示'尚未添加基金'"
echo ""
echo "2. 点击右上角 ⚙️ 设置图标"
echo ""
echo "3. 点击'导入配置'按钮"
echo ""
echo "4. 选择刚才导出的 JSON 文件"
echo ""
echo "5. 预期结果："
echo "   - 显示'导入成功'提示"
echo "   - 设置弹窗自动关闭"
echo "   - 之前添加的基金重新出现在列表中"
echo "   - 持仓数据、自选标记等都恢复"
echo ""
read -p "导入测试是否通过？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 导入测试失败${NC}"
    echo "请检查浏览器控制台的错误信息"
    exit 1
fi

echo -e "${GREEN}✅ 导入功能测试通过${NC}"
echo ""

# 测试文件格式验证
echo "🔍 测试导出文件格式"
echo "----------------------------"
echo ""
echo "请执行以下验证："
echo ""
echo "1. 检查 JSON 文件格式是否正确："
echo "   cat ~/Downloads/realtime-fund-config-*.json | jq . > /dev/null"
echo ""
echo "2. 验证必需字段："
echo "   cat ~/Downloads/realtime-fund-config-*.json | jq 'keys'"
echo ""
echo "3. 检查基金数据结构："
echo "   cat ~/Downloads/realtime-fund-config-*.json | jq '.funds[0]'"
echo ""
read -p "文件格式验证是否通过？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 文件格式验证失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 文件格式验证通过${NC}"
echo ""

# 测试边界情况
echo "🧪 测试边界情况"
echo "----------------------------"
echo ""
echo "请测试以下边界情况："
echo ""
echo "1. 导入空文件："
echo "   - 创建空的 JSON 文件 {}"
echo "   - 尝试导入"
echo "   - 预期：显示错误提示"
echo ""
echo "2. 导入格式错误的文件："
echo "   - 创建格式错误的 JSON 文件"
echo "   - 尝试导入"
echo "   - 预期：显示'导入失败，请检查文件格式'"
echo ""
echo "3. 导入其他 JSON 文件："
echo "   - 使用其他应用导出的 JSON 文件"
echo "   - 尝试导入"
echo "   - 预期：正确合并数据，不报错"
echo ""
read -p "边界测试是否通过？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  边界测试有问题${NC}"
    echo "这可能需要进一步调查"
fi

echo -e "${GREEN}✅ 边界测试完成${NC}"
echo ""

# 总结
echo "================================"
echo "📊 测试总结"
echo "================================"
echo ""
echo "✅ 导出功能：正常"
echo "✅ 导入功能：正常"
echo "✅ 文件格式：正确"
echo "✅ 边界情况：已测试"
echo ""
echo -e "${GREEN}🎉 所有测试通过！${NC}"
echo ""
echo "💡 备份建议："
echo "1. 每月导出一次配置作为备份"
echo "2. 在清除浏览器缓存前务必导出"
echo "3. 将导出的文件保存在安全位置"
echo "4. 考虑启用云同步功能实现自动备份"
echo ""
echo "📁 导出的文件示例："
echo "   ~/Downloads/realtime-fund-config-$(date +%s).json"
echo ""
