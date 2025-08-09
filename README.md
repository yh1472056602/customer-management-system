# 🏢 客户管理系统

一个功能完整的现代化客户管理系统，支持客户信息管理、订单处理、智能地址解析和Excel数据导入导出。

## ✨ 功能特性

### 📊 核心功能
- **客户信息管理** - 完整的客户档案管理
- **订单管理** - 订单创建、编辑、状态跟踪
- **数据导入导出** - Excel批量导入/导出，支持自定义模板
- **智能地址解析** - 集成AI服务，自动解析地址信息
- **用户权限管理** - 多角色权限控制

### 🎨 界面特色
- **现代化UI** - 简洁美观的用户界面
- **移动端适配** - 完美支持手机和平板访问
- **响应式设计** - 自适应各种屏幕尺寸
- **暗色主题** - 支持明暗主题切换

### 🤖 AI增强
- **智能地址解析** - 使用阿里云通义千问AI
- **数据智能处理** - 自动格式化和验证
- **多AI服务支持** - 可切换不同AI服务商

## 🛠 技术栈

### 后端技术
- **Node.js** - 服务器运行环境
- **Express.js** - Web应用框架
- **SQLite** - 轻量级数据库
- **JWT** - 用户认证
- **ExcelJS** - Excel文件处理

### 前端技术
- **HTML5/CSS3** - 现代Web标准
- **JavaScript ES6+** - 原生JavaScript
- **响应式设计** - CSS Grid + Flexbox
- **PWA支持** - 渐进式Web应用

### AI服务
- **阿里云通义千问** - 智能地址解析
- **高德地图API** - 地理位置服务

## 🚀 快速开始

### 环境要求
- Node.js 16.0+
- npm 7.0+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/customer-management-system.git
cd customer-management-system
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，添加必要的API密钥
```

4. **启动服务**
```bash
npm start
```

5. **访问系统**
```
http://localhost:8080
```

### 默认账户
- **管理员**: admin / admin123
- **普通用户**: user / user123

## 📱 移动端访问

系统完全支持移动端访问，提供专门的移动端测试页面：
```
http://localhost:8080/mobile-test.html
```

## 📋 主要页面

- **主页** (`/`) - 系统概览和统计
- **订单管理** (`/index.html`) - 订单列表和操作
- **客户服务** (`/customer-service.html`) - 客户信息管理
- **管理后台** (`/admin.html`) - 系统管理和配置
- **移动端测试** (`/mobile-test.html`) - 移动端功能测试

## 🔧 配置说明

### 环境变量
```env
NODE_ENV=development
PORT=8080
JWT_SECRET=your-jwt-secret-key
QWEN_API_KEY=your-qwen-api-key
AMAP_API_KEY=your-amap-api-key
```

### 数据库
系统使用SQLite数据库，数据文件：`customer_system.db`

## 📦 部署

### Docker部署（推荐）
```bash
# 构建镜像
docker build -t customer-management-system .

# 运行容器
docker-compose up -d
```

### 传统部署
详见 [DEPLOYMENT.md](DEPLOYMENT.md)

## 🔒 安全特性

- JWT身份认证
- 密码加密存储
- SQL注入防护
- XSS攻击防护
- CSRF保护

## 📊 系统架构

```
├── backend/           # 后端服务
│   ├── server.js     # 主服务器文件
│   └── ai-service.js # AI服务模块
├── frontend/         # 前端文件
│   ├── css/         # 样式文件
│   ├── js/          # JavaScript文件
│   └── *.html       # 页面文件
├── docs/            # 文档
└── customer_system.db # 数据库文件
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 项目链接: [https://github.com/your-username/customer-management-system](https://github.com/your-username/customer-management-system)
- 问题反馈: [Issues](https://github.com/your-username/customer-management-system/issues)

## 🙏 致谢

- [Express.js](https://expressjs.com/) - Web框架
- [ExcelJS](https://github.com/exceljs/exceljs) - Excel处理
- [阿里云通义千问](https://tongyi.aliyun.com/) - AI服务
- [高德地图](https://lbs.amap.com/) - 地图服务

---

⭐ 如果这个项目对您有帮助，请给它一个星标！

## 变更概述

本次变更主要涉及以下内容：

1. **客服端简化**：移除寄件人相关输入框，客服只需填写收件人信息和商品信息
2. **管理端增强**：导出符合自由打印批量上传模板的Excel功能（已取消寄件人信息相关功能）
3. **数据库结构调整**：将寄件人信息拆分为独立表，与订单表关联
4. **AI增强**：集成AI功能，优化地址解析和数据处理

## 数据库迁移

执行以下命令运行数据库迁移脚本：

```bash
node db-migration.js
```

迁移脚本将：
1. 创建新的寄件人信息表 `sender_info`
2. 修改订单表结构，添加寄件人信息关联字段 `sender_id`

## 功能变更详情

### 1. 客服端

- 移除了寄件人姓名、电话、省市区、详细地址等输入框
- 将"客户"相关标签改为"收件人"，更符合实际业务场景
- 保留了地址智能解析功能，仅作用于收件人地址

### 2. 管理端

#### 2.1（已取消）补全寄件人信息

根据最新需求，系统不再需要寄件人信息，相关功能已移除。

#### 2.2 导出Excel

- 添加"导出自由打印Excel"功能
- 支持按选中订单导出和按日期范围导出
- 导出无需寄件人信息检查
- 导出格式严格符合自由打印批量上传模板要求

### 3. Kimi AI增强功能

#### 3.1 智能地址解析

- 集成Kimi AI模型，提高地址解析准确率
- 能够更精确地拆分省市区和详细地址
- 支持各种非标准地址格式的识别
- 使用moonshot-v1-8k模型进行高质量解析

#### 3.2 Excel数据优化

- 使用Kimi AI优化导出数据，确保符合模板要求
- 标准化省市区格式
- 优化物品名称和备注信息
- 处理特殊字符和格式问题
- 批量处理订单数据，提高效率

## API接口变更

### 新增接口

1. `POST /api/orders/export-excel` - 导出符合自由打印批量上传模板的Excel

## 使用说明

### 客服端

1. 客服只需填写收件人信息和商品信息
2. 可以使用地址智能解析功能快速填写收件人地址

### 管理端

1. **补全寄件人信息**
   - 单个订单：点击订单列表中的"补全寄件人"按钮
   - 批量补全：勾选多个订单，点击"批量补全寄件人"按钮

2. **导出Excel**
   - 方式一：勾选需要导出的订单，点击"导出选中订单"按钮
   - 方式二：在"数据导出"页面，选择日期范围，点击"导出自由打印Excel"按钮
   - 可以选择是否启用AI优化功能

## Kimi AI配置说明

系统使用Kimi AI (Moonshot)的API进行AI增强，已配置以下环境变量：

```bash
# Kimi AI服务配置
AI_API_KEY=sk-EDwPTnWj2hP8z5FpCVc2do8b0KVBLaWj0UxuJJdP8AUUMK8z
AI_ENDPOINT=https://api.moonshot.cn/v1/chat/completions
AI_MODEL=moonshot-v1-8k
```

可以通过以下方式设置环境变量：

1. 创建`.env`文件在项目根目录
2. 使用系统环境变量
3. 在启动命令中指定，如：`AI_API_KEY=your_key npm start`

注意：系统已预先配置了Kimi AI的API密钥，可以直接使用。如需更换，请在环境变量中修改。

## 注意事项

1. 导出Excel不再需要寄件人信息
2. 导出的Excel格式严格符合自由打印批量上传模板要求，包括字段顺序、表头和空列
3. 为保证兼容性，保留了原有的CSV导出功能
4. AI功能需要配置有效的API密钥才能正常使用