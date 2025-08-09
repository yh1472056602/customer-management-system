# 客户管理系统部署指南

## 🚀 快速部署

### 方案一：Docker部署（推荐）

1. **安装Docker**
```bash
# CentOS/RHEL
sudo yum install docker docker-compose

# Ubuntu/Debian  
sudo apt install docker.io docker-compose

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker
```

2. **部署应用**
```bash
# 上传项目文件到服务器
scp -r customer-management-system/ user@your-server:/opt/

# 进入项目目录
cd /opt/customer-management-system

# 构建并启动
sudo docker-compose up -d
```

3. **访问应用**
```
http://your-server-ip:8080
```

### 方案二：直接部署

1. **安装Node.js**
```bash
# 安装Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **部署应用**
```bash
# 上传项目文件
scp -r customer-management-system/ user@your-server:/opt/

# 安装依赖
cd /opt/customer-management-system
npm install --production

# 使用PM2管理进程
npm install -g pm2
pm2 start backend/server.js --name "customer-system"
pm2 startup
pm2 save
```

## 🔧 环境配置

### 1. 环境变量
创建 `.env` 文件：
```env
NODE_ENV=production
PORT=8080
JWT_SECRET=your-jwt-secret-key
QWEN_API_KEY=your-qwen-api-key
```

### 2. 反向代理（Nginx）
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. HTTPS配置
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com
```

## 📊 监控和维护

### 1. 日志查看
```bash
# Docker方式
sudo docker-compose logs -f

# PM2方式
pm2 logs customer-system
```

### 2. 性能监控
```bash
# 查看资源使用
sudo docker stats

# PM2监控
pm2 monit
```

### 3. 数据备份
```bash
# 备份数据库
cp customer_system.db backup/customer_system_$(date +%Y%m%d).db

# 定时备份（添加到crontab）
0 2 * * * cp /opt/customer-management-system/customer_system.db /backup/customer_system_$(date +\%Y\%m\%d).db
```

## 🔒 安全配置

### 1. 防火墙设置
```bash
# 开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. 系统更新
```bash
# 定期更新系统
sudo apt update && sudo apt upgrade -y
```

## 📱 移动端访问

部署完成后，手机可以通过以下方式访问：
- `http://your-domain.com`
- `http://your-server-ip:8080`

## 🆘 故障排除

### 1. 端口被占用
```bash
# 查看端口占用
sudo netstat -tlnp | grep :8080

# 杀死进程
sudo kill -9 <PID>
```

### 2. 权限问题
```bash
# 修改文件权限
sudo chown -R $USER:$USER /opt/customer-management-system
chmod +x backend/server.js
```

### 3. 内存不足
```bash
# 查看内存使用
free -h

# 添加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```