const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// 静态文件服务
app.use(express.static(path.join(__dirname, 'frontend')));

// 简单的路由
app.get('/', (req, res) => {
  res.send('服务器正在运行！');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`测试服务器运行在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看系统`);
});



