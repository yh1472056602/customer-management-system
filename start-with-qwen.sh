#!/bin/bash

echo "🚀 启动客户管理系统 - 阿里云AI增强版"
echo "================================================"

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 环境检查通过"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
fi

# 检查环境配置
if [ ! -f ".env" ]; then
    echo "⚙️  创建环境配置文件..."
    cp .env.example .env
fi

echo "✅ 环境配置检查完成"

# 显示当前配置
echo ""
echo "📋 当前AI服务配置:"
echo "🎯 主力服务: 阿里云通义千问 (1-2秒响应)"
echo "🔧 API密钥: sk-a6cd9c3b0b4c442b8f268078284efaea"
echo "🔄 备选服务: Kimi AI (3-5秒响应)"
echo ""

# 启动服务器
echo "🌟 启动服务器..."
echo "📡 服务地址: http://localhost:3001"
echo "👥 客服端: http://localhost:3001/customer-service.html"
echo "🔧 管理端: http://localhost:3001/admin.html"
echo ""
echo "默认账号: admin / admin123"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "================================================"

# 设置环境变量并启动
export QWEN_API_KEY=sk-a6cd9c3b0b4c442b8f268078284efaea
export KIMI_API_KEY=sk-EDwPTnWj2hP8z5FpCVc2do8b0KVBLaWj0UxuJJdP8AUUMK8z
export PORT=3001

node backend/server.js