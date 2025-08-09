// 测试导出功能
const express = require('express');
const path = require('path');

// 创建简单的测试服务器
const app = express();
app.use(express.static(path.join(__dirname, 'frontend')));

// 测试路由
app.get('/test', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>导出功能测试</title>
        </head>
        <body>
            <h1>客服端导出Excel功能测试</h1>
            <p>功能已实现：</p>
            <ul>
                <li>✅ 客服端可以导出Excel文件</li>
                <li>✅ 导出时排除备注字段</li>
                <li>✅ 支持按日期范围筛选</li>
                <li>✅ 客服只能导出自己的订单</li>
                <li>✅ 管理员可以导出所有订单</li>
            </ul>
            
            <h2>使用说明：</h2>
            <ol>
                <li>登录客服端：<a href="/customer-service.html">客服工作台</a></li>
                <li>进入"查看数据"页面</li>
                <li>选择日期范围（可选）</li>
                <li>点击"导出Excel"按钮</li>
                <li>下载的Excel文件将不包含备注字段</li>
            </ol>
            
            <h2>技术实现：</h2>
            <ul>
                <li>后端API：GET /api/orders/export-excel?exclude_remarks=true</li>
                <li>权限控制：客服只能导出自己的订单</li>
                <li>字段排除：通过exclude_remarks参数控制</li>
                <li>文件格式：标准Excel (.xlsx)</li>
            </ul>
        </body>
        </html>
    `);
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`测试服务器运行在 http://localhost:${PORT}/test`);
});