#!/usr/bin/env node

/**
 * 基估宝备份文件验证工具
 * 用于验证导出的 JSON 文件格式是否正确
 */

const fs = require('fs');
const path = require('path');

// ANSI 颜色
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

console.log(`${BLUE}🔍 基估宝备份文件验证工具${NC}`);
console.log('====================================\n');

// 获取文件路径参数
const filePath = process.argv[2];

if (!filePath) {
    console.log(`${YELLOW}用法:${NC} node scripts/validate-backup.js <backup-file.json>\n`);
    console.log(`${YELLOW}示例:${NC} node scripts/validate-backup.js ~/Downloads/realtime-fund-config-1234567890.json\n`);
    process.exit(1);
}

// 解析文件路径
const resolvedPath = filePath.replace(/^~/, process.env.HOME);

if (!fs.existsSync(resolvedPath)) {
    console.error(`${RED}❌ 文件不存在: ${resolvedPath}${NC}\n`);
    process.exit(1);
}

console.log(`${BLUE}📁 文件:${NC} ${resolvedPath}\n`);

try {
    // 读取并解析 JSON
    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    const data = JSON.parse(fileContent);

    console.log(`${GREEN}✅ JSON 格式正确${NC}\n`);

    // 验证必需字段
    const requiredFields = ['funds', 'favorites', 'groups', 'refreshMs', 'holdings', 'pendingTrades', 'exportedAt'];
    const optionalFields = ['viewMode', 'collapsedCodes']; // 旧版本可能包含

    console.log(`${BLUE}📋 验证字段:${NC}`);
    let allValid = true;

    // 检查必需字段
    requiredFields.forEach(field => {
        if (field in data) {
            console.log(`  ${GREEN}✓${NC} ${field}: ${typeof data[field]}`);
        } else {
            console.log(`  ${RED}✗${NC} ${field}: ${YELLOW}缺失${NC}`);
            allValid = false;
        }
    });

    // 检查可选字段
    optionalFields.forEach(field => {
        if (field in data) {
            console.log(`  ${BLUE}○${NC} ${field}: ${typeof data[field]} ${YELLOW}(可选)${NC}`);
        }
    });

    console.log('');

    // 验证数据类型
    console.log(`${BLUE}🔍 验证数据类型:${NC}`);

    if (Array.isArray(data.funds)) {
        console.log(`  ${GREEN}✓${NC} funds: 数组 (${data.funds.length} 项)`);
    } else {
        console.log(`  ${RED}✗${NC} funds: ${YELLOW}应该是数组${NC}`);
        allValid = false;
    }

    if (Array.isArray(data.favorites)) {
        console.log(`  ${GREEN}✓${NC} favorites: 数组 (${data.favorites.length} 项)`);
    } else {
        console.log(`  ${RED}✗${NC} favorites: ${YELLOW}应该是数组${NC}`);
        allValid = false;
    }

    if (Array.isArray(data.groups)) {
        console.log(`  ${GREEN}✓${NC} groups: 数组 (${data.groups.length} 项)`);
    } else {
        console.log(`  ${RED}✗${NC} groups: ${YELLOW}应该是数组${NC}`);
        allValid = false;
    }

    if (typeof data.refreshMs === 'number') {
        console.log(`  ${GREEN}✓${NC} refreshMs: 数字 (${data.refreshMs}ms)`);
    } else {
        console.log(`  ${RED}✗${NC} refreshMs: ${YELLOW}应该是数字${NC}`);
        allValid = false;
    }

    if (typeof data.holdings === 'object' && data.holdings !== null && !Array.isArray(data.holdings)) {
        console.log(`  ${GREEN}✓${NC} holdings: 对象 (${Object.keys(data.holdings).length} 项)`);
    } else {
        console.log(`  ${RED}✗${NC} holdings: ${YELLOW}应该是对象${NC}`);
        allValid = false;
    }

    if (Array.isArray(data.pendingTrades)) {
        console.log(`  ${GREEN}✓${NC} pendingTrades: 数组 (${data.pendingTrades.length} 项)`);
    } else {
        console.log(`  ${RED}✗${NC} pendingTrades: ${YELLOW}应该是数组${NC}`);
        allValid = false;
    }

    if (typeof data.exportedAt === 'string') {
        const exportDate = new Date(data.exportedAt);
        if (!isNaN(exportDate.getTime())) {
            console.log(`  ${GREEN}✓${NC} exportedAt: 日期字符串 (${exportDate.toLocaleString('zh-CN')})`);
        } else {
            console.log(`  ${RED}✗${NC} exportedAt: ${YELLOW}无效的日期格式${NC}`);
            allValid = false;
        }
    } else {
        console.log(`  ${RED}✗${NC} exportedAt: ${YELLOW}应该是字符串${NC}`);
        allValid = false;
    }

    console.log('');

    // 验证基金数据结构（如果有）
    if (data.funds && data.funds.length > 0) {
        console.log(`${BLUE}📊 验证基金数据结构:${NC}`);
        const sampleFund = data.funds[0];
        const fundFields = ['code', 'name', 'dwjz', 'gsz', 'gszzl', 'zzl'];

        console.log(`  示例基金 (#${sampleFund.code || '未知'}):`);
        fundFields.forEach(field => {
            if (field in sampleFund) {
                console.log(`    ${GREEN}✓${NC} ${field}: ${typeof sampleFund[field]}`);
            } else {
                console.log(`    ${YELLOW}○${NC} ${field}: ${YELLOW}缺失（可能正常）${NC}`);
            }
        });

        // 检查重仓股数据
        if (sampleFund.holdings && Array.isArray(sampleFund.holdings)) {
            console.log(`    ${GREEN}✓${NC} holdings: 数组 (${sampleFund.holdings.length} 项)`);
        } else {
            console.log(`    ${YELLOW}○${NC} holdings: ${YELLOW}无数据（可能正常）${NC}`);
        }

        console.log('');
    }

    // 统计信息
    console.log(`${BLUE}📈 数据统计:${NC}`);
    console.log(`  基金数量: ${data.funds?.length || 0}`);
    console.log(`  自选数量: ${data.favorites?.length || 0}`);
    console.log(`  分组数量: ${data.groups?.length || 0}`);
    console.log(`  持仓数量: ${Object.keys(data.holdings || {}).length}`);
    console.log(`  待处理交易: ${data.pendingTrades?.length || 0}`);
    console.log(`  刷新频率: ${data.refreshMs ? (data.refreshMs / 1000) + '秒' : '未设置'}`);
    console.log('');

    // 最终结果
    if (allValid) {
        console.log(`${GREEN}✅ 文件验证通过！备份文件格式正确。${NC}\n`);
        process.exit(0);
    } else {
        console.log(`${RED}❌ 文件验证失败！存在格式问题。${NC}\n`);
        process.exit(1);
    }

} catch (error) {
    console.error(`${RED}❌ 解析文件时出错:${NC} ${error.message}\n`);
    console.error(error.stack);
    process.exit(1);
}
