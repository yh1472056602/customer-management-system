const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080; // 修改为更常用的端口8080

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:8080'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// 添加路由处理，确保HTML页面能正确加载
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/customer-service.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/customer-service.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// 数据库初始化：固定到项目内同一DB文件，避免cwd不同导致多份库
const db = new sqlite3.Database(path.join(__dirname, '../customer_system.db'));

// 创建表
db.serialize(() => {
    // 用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('customer_service', 'admin')) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 客户信息表
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        detailed_address TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        locked_until DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // 订单表
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        user_id INTEGER,
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        product_code TEXT,
        product_attributes TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // 私域客服数据表
    db.run(`CREATE TABLE IF NOT EXISTS private_domain_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        phone_number TEXT NOT NULL,
        phone_type TEXT CHECK(phone_type IN ('enterprise_wechat', 'personal_wechat')) NOT NULL,
        order_amount DECIMAL(10,2) DEFAULT 0,
        total_fans INTEGER DEFAULT 0,
        new_fans INTEGER DEFAULT 0,
        lost_fans INTEGER DEFAULT 0,
        record_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // 通知公告表
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (created_by) REFERENCES users (id)
    )`);

    // 默认管理员账号
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [adminPassword]);
});

// JWT验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    // 兼容下载场景：支持从查询参数接收 token（仅在无请求头时）
    if (!token && req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: '令牌无效' });
        req.user = user;
        next();
    });
};

// 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        if (!user) return res.status(401).json({ error: '用户不存在' });

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) return res.status(500).json({ error: '验证失败' });
            if (!result) return res.status(401).json({ error: '密码错误' });

            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
        });
    });
});

// 注册接口
app.post('/api/register', (req, res) => {
    const { username, password, role } = req.body;

    if (!['customer_service', 'admin'].includes(role)) {
        return res.status(400).json({ error: '无效的角色' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role],
        function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ error: '用户名已存在' });
                }
                return res.status(500).json({ error: '注册失败' });
            }
            res.json({ message: '注册成功', userId: this.lastID });
        }
    );
});

// 获取公告
app.get('/api/announcements', (req, res) => {
    db.all('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: '获取公告失败' });
        res.json(rows);
    });
});

// 添加公告（管理员）
app.post('/api/announcements', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }

    const { title, content } = req.body;
    db.run('INSERT INTO announcements (title, content, created_by) VALUES (?, ?, ?)',
        [title, content, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: '添加公告失败' });
            res.json({ message: '公告添加成功' });
        }
    );
});

// 添加客户信息（支持自由打印模板格式）
app.post('/api/customers', authenticateToken, (req, res) => {
    const { 
        customer_name, phone, address, detailed_address,
        province, city, district,
        product_name, quantity, product_code, product_attributes, remarks
    } = req.body;
    
    if (!customer_name) {
        return res.status(400).json({ error: '收件人姓名不能为空' });
    }
    
    console.log('收到客户添加请求:', req.body);
    
    // 构建完整地址（如果单独的省市区字段存在）
    const fullAddress = province && city ? 
        `${province} ${city} ${district || ''}` : 
        address || '';
    
    db.run('INSERT INTO customers (customer_name, phone, address, detailed_address, user_id) VALUES (?, ?, ?, ?, ?)',
        [customer_name, phone || null, fullAddress, detailed_address || null, req.user.id],
        function(err) {
            if (err) {
                console.error('添加客户失败:', err);
                return res.status(500).json({ error: '添加客户失败' });
            }
            
            // 返回客户ID，以便前端可以继续添加订单
            res.json({ 
                message: '客户添加成功', 
                customerId: this.lastID,
                customerData: {
                    id: this.lastID,
                    customer_name,
                    phone,
                    address: fullAddress,
                    detailed_address,
                    province,
                    city,
                    district
                }
            });
        }
    );
});

// 添加订单（支持自由打印模板格式）
app.post('/api/orders', authenticateToken, (req, res) => {
    const { 
        customer_id, product_name, quantity, amount, remarks,
        product_code, product_attributes
    } = req.body;

    // 验证必要参数
    if (!customer_id) {
        return res.status(400).json({ error: '客户ID不能为空' });
    }
    
    // 如果物品名称为空，使用默认值
    const finalProductName = product_name || '未命名物品';
    
    console.log('收到订单添加请求:', req.body);

    // 检查是否需要修改数据库表结构添加新字段
    db.get("PRAGMA table_info(orders)", (err, rows) => {
        if (err) {
            console.error('检查订单表结构失败:', err);
            return res.status(500).json({ error: '添加订单失败' });
        }
        
        // 使用现有字段，product_code和product_attributes可以存储在remarks中
        const orderRemarks = remarks ? 
            `${remarks}${product_code ? ' | 商品编码:'+product_code : ''}${product_attributes ? ' | 销售属性:'+product_attributes : ''}` : 
            `${product_code ? '商品编码:'+product_code : ''}${product_attributes ? ' | 销售属性:'+product_attributes : ''}`;
        
        console.log('订单数据处理:', {
            'customer_id': customer_id,
            'product_name': product_name,
            'quantity': quantity || 1,
            'amount': amount || 0,
            'remarks': orderRemarks || null
        });
        
        // 使用moment.js创建当前中国时区的时间
        // 注意：我们直接使用系统当前时间，并将其格式化为SQLite兼容的时间格式
        // 格式：YYYY-MM-DD HH:MM:SS
        const now = new Date();
        // 获取中国时区的年、月、日、时、分、秒
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        // 创建SQLite兼容的时间字符串
        const sqliteDateString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        db.run('INSERT INTO orders (customer_id, product_name, quantity, amount, user_id, remarks, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [customer_id, finalProductName, parseInt(quantity) || 1, parseFloat(amount) || 0, req.user.id, orderRemarks || null, sqliteDateString],
            function(err) {
                if (err) {
                    console.error('添加订单失败:', err);
                    return res.status(500).json({ error: '添加订单失败' });
                }
                res.json({ 
                    message: '订单添加成功', 
                    orderId: this.lastID,
                    orderData: {
                        id: this.lastID,
                        customer_id,
                        product_name: finalProductName,
                        quantity: parseInt(quantity) || 1,
                        amount: parseFloat(amount) || 0,
                        remarks: orderRemarks,
                        product_code,
                        product_attributes
                    }
                });
            }
        );
    });
});

// 获取客户列表（客服只能看到自己的）
app.get('/api/customers', authenticateToken, (req, res) => {
    let query = 'SELECT * FROM customers WHERE 1=1';
    let params = [];

    if (req.user.role === 'customer_service') {
        query += ' AND user_id = ?';
        params.push(req.user.id);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: '获取客户列表失败' });
        res.json(rows);
    });
});

// 获取订单列表
app.get('/api/orders', authenticateToken, (req, res) => {
    const { start_date, end_date, keyword, user_id } = req.query;
    let query = `
        SELECT o.*, c.customer_name, c.phone, c.address, c.detailed_address, u.username 
        FROM orders o 
        JOIN customers c ON o.customer_id = c.id 
        JOIN users u ON o.user_id = u.id 
        WHERE 1=1
    `;
    let params = [];

    if (req.user.role === 'customer_service') {
        query += ' AND o.user_id = ?';
        params.push(req.user.id);
    } else if (user_id) {
        // 管理员可按客服筛选
        query += ' AND o.user_id = ?';
        params.push(user_id);
    }

    if (start_date && end_date) {
        query += ' AND DATE(o.order_date) BETWEEN ? AND ?';
        params.push(start_date, end_date);
    }
    
    if (keyword) {
        query += ' AND (c.customer_name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR c.detailed_address LIKE ? OR o.product_name LIKE ? OR o.remarks LIKE ?)';
        const searchKeyword = `%${keyword}%`;
        params.push(searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword);
    }

    query += ' ORDER BY o.order_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: '获取订单列表失败' });
        
        // 直接返回数据库中的原始日期格式
        // SQLite存储的是本地时间，前端会使用Intl.DateTimeFormat正确处理时区
        // 不需要在后端进行额外的时区转换
        const processedRows = rows;
        
        res.json(processedRows);
    });
});

// 获取统计数据
app.get('/api/statistics', authenticateToken, (req, res) => {
    const { start_date, end_date, user_id } = req.query;
    
    let query = `
        SELECT 
            u.username,
            COUNT(o.id) as total_orders,
            SUM(o.amount) as total_amount,
            DATE(o.order_date) as order_date
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE 1=1
    `;
    
    let params = [];

    // 客服只能看到自己的统计数据，管理员可选按客服过滤
    if (req.user && req.user.role === 'customer_service') {
        query += ' AND o.user_id = ?';
        params.push(req.user.id);
    } else if (user_id) {
        query += ' AND o.user_id = ?';
        params.push(user_id);
    }
    
    if (start_date && end_date) {
        query += ' AND DATE(o.order_date) BETWEEN ? AND ?';
        params.push(start_date, end_date);
    }
    
    query += ' GROUP BY u.username, DATE(o.order_date) ORDER BY order_date DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: '获取统计数据失败' });
        res.json(rows);
    });
});

// 管理员：按“客服 + 手机编号”统计业绩
app.get('/api/statistics/by-user-phone', authenticateToken, (req, res) => {
    // 仅管理员可用
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }

    const { start_date, end_date, user_id } = req.query;

    // 将订单归属到（客服、手机编号）维度。
    // 手机编号来源于私域客户表 private_customers（同一客服+客户可能存在多条，取非空最小编号作为该客户的主编号）。
    let query = `
        WITH phone_map AS (
            SELECT 
                user_id,
                customer_id,
                -- 采用最近一次绑定的手机编号
                (
                    SELECT pc2.phone_number FROM private_customers pc2
                    WHERE pc2.user_id = pc.user_id AND pc2.customer_id = pc.customer_id 
                          AND pc2.phone_number IS NOT NULL AND TRIM(pc2.phone_number) != ''
                    ORDER BY datetime(pc2.created_at) DESC
                    LIMIT 1
                ) AS phone_number
            FROM private_customers pc
            GROUP BY user_id, customer_id
        )
        SELECT 
            u.id AS user_id,
            u.username,
            COALESCE(pm.phone_number, '未分配') AS phone_number,
            COUNT(o.id) AS total_orders,
            SUM(o.amount) AS total_amount,
            COUNT(DISTINCT o.customer_id) AS unique_customers
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN phone_map pm ON pm.customer_id = o.customer_id AND pm.user_id = o.user_id
        WHERE 1=1
    `;

    const params = [];

    if (start_date && end_date) {
        query += ' AND DATE(o.order_date) BETWEEN ? AND ?';
        params.push(start_date, end_date);
    }

    if (user_id) {
        query += ' AND o.user_id = ?';
        params.push(user_id);
    }

    // 数值优先排序：纯数字编号按数值升序；非数字按字典序；“未分配”放最后
    query += ` GROUP BY u.id, u.username, COALESCE(pm.phone_number, "未分配")
              ORDER BY u.username ASC,
              CASE WHEN pm.phone_number IS NULL OR TRIM(pm.phone_number) = '' OR pm.phone_number = '未分配' THEN 1 ELSE 0 END ASC,
              CASE WHEN pm.phone_number GLOB '[0-9]+' THEN CAST(pm.phone_number AS INTEGER) END ASC,
              pm.phone_number ASC`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('获取分手机号统计失败:', err);
            return res.status(500).json({ error: '获取统计数据失败' });
        }
        res.json(rows || []);
    });
});

// 私域客服数据相关接口
app.post('/api/private-domain', authenticateToken, (req, res) => {
    const { phone_number, phone_type, order_amount, total_fans, new_fans, lost_fans, record_date } = req.body;

    db.run(`INSERT INTO private_domain_data 
        (user_id, phone_number, phone_type, order_amount, total_fans, new_fans, lost_fans, record_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, phone_number, phone_type, order_amount, total_fans, new_fans, lost_fans, record_date],
        function(err) {
            if (err) return res.status(500).json({ error: '添加私域数据失败' });
            res.json({ message: '私域数据添加成功' });
        }
    );
});

// 私域客户相关接口
app.post('/api/private-customers', authenticateToken, (req, res) => {
    const { name, phone, phone_number, source, type, remark, customer_id } = req.body;

    db.run(`INSERT INTO private_customers 
        (user_id, name, phone, phone_number, source, type, remark, customer_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [req.user.id, name, phone, phone_number, source, type, remark, customer_id],
        function(err) {
            if (err) {
                console.error('添加私域客户失败:', err);
                return res.status(500).json({ error: '添加私域客户失败' });
            }
            res.json({ 
                message: '私域客户添加成功',
                privateCustomerId: this.lastID 
            });
        }
    );
});

// 获取所有已使用的手机编号
app.get('/api/phone-numbers', authenticateToken, (req, res) => {
    const { user_id } = req.query;
    let query = `
        SELECT DISTINCT phone_number
        FROM private_customers
        WHERE phone_number IS NOT NULL AND phone_number != ''
    `;
    const params = [];

    if (req.user.role === 'customer_service') {
        query += ' AND user_id = ?';
        params.push(req.user.id);
    } else if (user_id) {
        query += ' AND user_id = ?';
        params.push(user_id);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('获取手机编号失败:', err);
            return res.status(500).json({ error: '获取手机编号失败' });
        }
        res.json(rows);
    });
});

// 获取私域客户列表
app.get('/api/private-customers', authenticateToken, (req, res) => {
    const { keyword, source, phone_number } = req.query;
    let query = `
        SELECT pc.*, 
               COUNT(DISTINCT o.id) as order_count, 
               SUM(o.amount) as total_spent
        FROM private_customers pc
        LEFT JOIN customers c ON pc.customer_id = c.id
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE 1=1
    `;
    let params = [];

    if (req.user.role === 'customer_service') {
        query += ' AND pc.user_id = ?';
        params.push(req.user.id);
    }

    if (keyword) {
        query += ' AND (pc.name LIKE ? OR pc.phone LIKE ? OR pc.remark LIKE ?)';
        const searchKeyword = `%${keyword}%`;
        params.push(searchKeyword, searchKeyword, searchKeyword);
    }

    if (source) {
        query += ' AND pc.source = ?';
        params.push(source);
    }
    
    if (phone_number) {
        query += ' AND pc.phone_number = ?';
        params.push(phone_number);
    }

    query += ' GROUP BY pc.id ORDER BY pc.created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('获取私域客户失败:', err);
            return res.status(500).json({ error: '获取私域客户失败' });
        }
        res.json(rows);
    });
});

// 检查表结构
app.get('/api/check-table-structure', authenticateToken, (req, res) => {
    const { table } = req.query;
    
    if (!table) {
        return res.status(400).json({ error: '请指定要检查的表名' });
    }
    
    // 安全检查：只允许检查特定的表
    const allowedTables = ['private_customers', 'customers', 'orders', 'private_domain_data'];
    if (!allowedTables.includes(table)) {
        return res.status(403).json({ error: '不允许检查该表' });
    }
    
    // 检查表是否存在
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
        if (err) {
            console.error('检查表是否存在失败:', err);
            return res.status(500).json({ error: '检查表结构失败' });
        }
        
        if (!row) {
            return res.json({ exists: false, message: `表 ${table} 不存在` });
        }
        
        // 获取表结构
        db.all(`PRAGMA table_info(${table})`, [], (err, columns) => {
            if (err) {
                console.error('获取表结构失败:', err);
                return res.status(500).json({ error: '获取表结构失败' });
            }
            
            // 获取表中的记录数
            db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, count) => {
                if (err) {
                    console.error('获取记录数失败:', err);
                    return res.status(500).json({ error: '获取记录数失败' });
                }
                
                res.json({
                    exists: true,
                    table: table,
                    columns: columns,
                    recordCount: count.count
                });
            });
        });
    });
});

// 获取私域客服数据
app.get('/api/private-domain', authenticateToken, (req, res) => {
    const { start_date, end_date, user_id } = req.query;
    let query = `
        SELECT pdd.*, u.username 
        FROM private_domain_data pdd
        LEFT JOIN users u ON pdd.user_id = u.id
        WHERE 1=1
    `;
    let params = [];

    if (req.user.role === 'customer_service') {
        query += ' AND pdd.user_id = ?';
        params.push(req.user.id);
    } else if (user_id) {
        query += ' AND pdd.user_id = ?';
        params.push(user_id);
    }

    if (start_date && end_date) {
        query += ' AND pdd.record_date BETWEEN ? AND ?';
        params.push(start_date, end_date);
    }

    query += ' ORDER BY pdd.record_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: '获取私域数据失败' });
        res.json(rows);
    });
});

// 补全寄件人信息（管理员）
// 已移除：寄件人信息补全接口（不再需要寄件人信息）

// 导出Excel数据 - 严格符合自由打印批量上传模板（保留样式）
app.get('/api/orders/export-excel', authenticateToken, async (req, res) => {
    console.log('开始导出Excel，用户:', req.user.username, '角色:', req.user.role);
    console.log('请求参数:', req.query);
    
    // 客服只能导出自己的订单，管理员可以导出所有订单
    const isAdmin = req.user.role === 'admin';
    const isCustomerService = req.user.role === 'customer_service';

    const { start_date, end_date, order_ids, user_id } = req.query;
    const useAI = req.query.use_ai === 'true'; // 默认禁用AI优化，传 use_ai=true 时启用
    
    try {
        // 检查可选列是否存在（兼容老库）
        const orderTableColumns = await new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(orders)`, [], (err, cols) => {
                if (err) reject(err); else resolve(cols || []);
            });
        });
        const hasProductCodeCol = orderTableColumns.some(c => c && c.name === 'product_code');
        const hasProductAttrCol = orderTableColumns.some(c => c && c.name === 'product_attributes');

        // 构建查询条件
        let query = `
            SELECT 
                c.customer_name,
                c.phone,
                c.address,
                c.detailed_address,
                o.product_name,
                o.quantity,
                o.remarks,
                ${hasProductCodeCol ? 'o.product_code' : `''`} as product_code,
                ${hasProductAttrCol ? 'o.product_attributes' : `''`} as product_attributes,
                o.id as order_id,
                o.user_id
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE 1=1
        `;
        
        // 客服只能导出自己的订单
        if (isCustomerService) {
            query += ' AND o.user_id = ?';
        }
        
        let params = [];
        
        // 客服只能导出自己的订单
        if (isCustomerService) {
            params.push(req.user.id);
        }
        
        // 按日期筛选
        if (start_date && end_date) {
            query += ' AND DATE(o.order_date) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        // 按关键词搜索
        const { keyword } = req.query;
        if (keyword) {
            query += ' AND (c.customer_name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR c.detailed_address LIKE ? OR o.product_name LIKE ? OR o.remarks LIKE ?)';
            const searchKeyword = `%${keyword}%`;
            params.push(searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword);
        }
        
        // 按订单ID筛选（仅管理员支持）
        if (isAdmin && Array.isArray(order_ids) && order_ids.length > 0) {
            const placeholders = order_ids.map(() => '?').join(',');
            query += ` AND o.id IN (${placeholders})`;
            params = params.concat(order_ids);
        }

        // 管理员可按客服筛选
        if (isAdmin && user_id) {
            query += ' AND o.user_id = ?';
            params.push(user_id);
        }
        
        query += ' ORDER BY o.order_date DESC';
        
        // 执行查询
        console.log('执行查询:', query);
        console.log('查询参数:', params);
        const rows = await new Promise((resolve, reject) => {
            db.all(query, params, (err, result) => {
                if (err) {
                    console.error('数据库查询失败:', err);
                    reject(err);
                } else {
                    console.log('查询结果数量:', result.length);
                    resolve(result);
                }
            });
        });
        
    // 不再要求寄件人信息，直接继续格式化数据
        
        // 标准化省市区名称的辅助函数
        const standardizeProvince = (province) => {
            if (!province) return '';
            return province.replace(/省$|市$|自治区$|特别行政区$|维吾尔$|壮族$|回族$|维吾尔族$|壮族自治区$|回族自治区$|自治州$|地区$/, '').trim();
        };
        
        const standardizeCity = (city) => {
            if (!city) return '';
            return city.replace(/市$|地区$|自治州$|盟$|自治县$/, '').trim();
        };
        
        const standardizeDistrict = (district) => {
            if (!district) return '';
            return district.replace(/区$|县$|市$|旗$|自治县$|自治旗$/, '').trim();
        };
        
        // 格式化数据以严格符合模板要求（遵循模板18列，寄件人列保留但置空）
        let formattedData = rows.map(row => {
            // 从地址中提取省市区信息
            let recipientProvince = '';
            let recipientCity = '';
            let recipientDistrict = '';
            
            // 尝试从地址中解析省市区
            if (row.address) {
                const addressParts = row.address.split(' ');
                recipientProvince = standardizeProvince(addressParts[0] || '');
                recipientCity = standardizeCity(addressParts[1] || '');
                recipientDistrict = standardizeDistrict(addressParts[2] || '');
            }
            
            // 构建基础数据对象（严格对齐模板列）
            const baseData = {
                '收件人姓名': row.customer_name || '',
                '收件人手机/电话': row.phone || '',
                '收件人省': recipientProvince,
                '收件人市': recipientCity,
                '收件人区': recipientDistrict,
                '收件人详细地址': row.detailed_address || '',
                '物品名称': row.product_name || '',
                '数量': row.quantity || 1,
                '商品编码': row.product_code || '',
                '销售属性': row.product_attributes || '',
                // 按需：管理员导出时“备注”留空
                '备注': '',
                '寄件人姓名': '',
                '寄件人手机/电话': '',
                '寄件人省': '',
                '寄件人市': '',
                '寄件人县/区': '',
                '寄件人详细地址': '',
                // 订单编号留空
                '订单编号': ''
            };

            return baseData;
        });
        
        // 使用AI优化数据（如果启用）
        if (useAI) {
            try {
                console.log('使用Kimi AI优化Excel导出数据...');
                const optimizedData = await aiService.optimizeExcelDataWithAI(formattedData);
                if (optimizedData && optimizedData.length === formattedData.length) {
                    formattedData = optimizedData;
                    console.log('Kimi AI优化数据成功');
                }
            } catch (aiError) {
                console.error('Kimi AI优化数据失败，使用原始数据:', aiError);
            }
        }

        // 强制清空“备注”和“订单编号”列，防止AI或模板填充
        formattedData = formattedData.map(row => ({
            ...row,
            '备注': '',
            '订单编号': ''
        }));
        
        // 定义模板文件路径
        const candidateTemplatePaths = [
            path.resolve(__dirname, '../自由打印批量上传模板-20250416160130.xlsx'),
            path.resolve(__dirname, '../../自由打印批量上传模板-20250416160130.xlsx'),
            path.resolve(process.cwd(), '自由打印批量上传模板-20250416160130.xlsx'),
            path.resolve(process.cwd(), '../自由打印批量上传模板-20250416160130.xlsx')
        ];

        let templatePath = null;
        for (const candidatePath of candidateTemplatePaths) {
            if (fs.existsSync(candidatePath)) {
                templatePath = candidatePath;
                console.log('找到模板文件:', templatePath);
                break;
            }
        }

        if (!templatePath) {
            console.error('未找到模板文件，候选路径:', candidateTemplatePaths);
            return res.status(500).json({ error: '模板文件不存在' });
        }

        // 使用原始模板文件，保持其样式格式
        console.log('开始生成Excel文件...');
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        // 读取原始模板文件
        console.log('读取模板文件:', templatePath);
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.getWorksheet(1); // 获取第一个工作表
        
        console.log('模板文件读取成功，开始处理数据...');
        console.log('原始工作表名称:', ws.name);
        console.log('原始行数:', ws.lastRow ? ws.lastRow.number : 0);

        // 保存完整的模板格式信息
        const templateInfo = {
            name: ws.name,
            views: ws.views ? JSON.parse(JSON.stringify(ws.views)) : null,
            protection: ws.protection ? JSON.parse(JSON.stringify(ws.protection)) : null,
            columns: [],
            rows: []
        };

        // 保存列宽信息
        for (let col = 1; col <= 17; col++) {
            const column = ws.getColumn(col);
            templateInfo.columns[col] = {
                width: column.width
            };
        }

        // 保存表头行的完整信息（第1行）
        const headerRow = ws.getRow(1);
        templateInfo.rows[1] = {
            height: headerRow.height,
            cells: []
        };
        
        const headerStyles = [];
        for (let col = 1; col <= 17; col++) {
            const cell = headerRow.getCell(col);
            const cellInfo = {
                value: cell.value,
                style: cell.style ? JSON.parse(JSON.stringify(cell.style)) : null
            };
            templateInfo.rows[1].cells[col] = cellInfo;
            headerStyles[col] = cellInfo.style;
        }

        // 保存数据行样式模板（如果第2行存在的话）
        let dataRowStyles = [];
        const templateDataRow = ws.getRow(2);
        if (templateDataRow && templateDataRow.cellCount > 0) {
            templateInfo.rows[2] = {
                height: templateDataRow.height,
                cells: []
            };
            
            for (let col = 1; col <= 17; col++) {
                const cell = templateDataRow.getCell(col);
                const cellInfo = {
                    value: cell.value,
                    style: cell.style ? JSON.parse(JSON.stringify(cell.style)) : null
                };
                templateInfo.rows[2].cells[col] = cellInfo;
                dataRowStyles[col] = cellInfo.style;
            }
        }

        // 完全重建工作表以确保格式一致
        workbook.removeWorksheet(ws.id);
        const newWs = workbook.addWorksheet(templateInfo.name);
        
        // 恢复视图设置
        if (templateInfo.views) {
            newWs.views = templateInfo.views;
        }
        
        // 恢复保护设置
        if (templateInfo.protection) {
            newWs.protection = templateInfo.protection;
        }

        // 设置列宽
        for (let col = 1; col <= 17; col++) {
            if (templateInfo.columns[col]) {
                newWs.getColumn(col).width = templateInfo.columns[col].width;
            }
        }

        // 重建表头行
        const newHeaderRow = newWs.getRow(1);
        newHeaderRow.height = templateInfo.rows[1].height;
        for (let col = 1; col <= 17; col++) {
            const cellInfo = templateInfo.rows[1].cells[col];
            if (cellInfo) {
                const cell = newHeaderRow.getCell(col);
                cell.value = cellInfo.value;
                if (cellInfo.style) {
                    cell.style = JSON.parse(JSON.stringify(cellInfo.style));
                }
            }
        }

        // 添加数据行，严格按照模板格式
        const templateColumns = [
            '收件人姓名','收件人手机/电话','收件人省','收件人市','收件人区','收件人详细地址',
            '物品名称','数量','商品编码','销售属性','备注',
            '寄件人姓名','寄件人手机/电话','寄件人省','寄件人市','寄件人县/区','寄件人详细地址','订单编号'
        ];

        console.log('开始添加', formattedData.length, '行数据...');
        formattedData.forEach((dataRow, index) => {
            const values = templateColumns.map(col => dataRow[col] ?? '');
            const newRow = newWs.addRow(values);
            
            // 设置行高（如果模板第2行有设置的话）
            if (templateInfo.rows[2] && templateInfo.rows[2].height) {
                newRow.height = templateInfo.rows[2].height;
            }
            
            // 应用数据行样式
            newRow.eachCell((cell, colNumber) => {
                // 优先使用数据行样式，如果没有则使用表头样式（但去掉加粗）
                let style = dataRowStyles[colNumber] || headerStyles[colNumber];
                if (style) {
                    style = JSON.parse(JSON.stringify(style));
                    // 数据行不应该加粗（除非模板第2行本身就是加粗的）
                    if (!dataRowStyles[colNumber] && style.font && style.font.bold) {
                        style.font.bold = false;
                    }
                    cell.style = style;
                }
                
                // 数量列（第8列）保持数值格式
                if (colNumber === 8) {
                    const num = parseInt(String(cell.value || '0'), 10);
                    if (!isNaN(num)) {
                        cell.value = num;
                    }
                }
            });
            
            if ((index + 1) % 100 === 0) {
                console.log('已添加', index + 1, '行数据');
            }
        });
        
        console.log('数据添加完成，共', formattedData.length, '行');

        console.log('生成Excel缓冲区...');
        const buffer = await workbook.xlsx.writeBuffer();
        console.log('Excel缓冲区大小:', buffer.length, 'bytes');
        
        const utf8Name = `自由打印批量订单_${new Date().toISOString().split('T')[0]}.xlsx`;
        const asciiFallback = 'orders.xlsx';
        console.log('设置响应头，文件名:', utf8Name);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`);
        
        console.log('发送Excel文件...');
        res.send(Buffer.from(buffer));
        console.log('Excel文件发送完成');
    } catch (error) {
        console.error('导出Excel失败:', error);
        res.status(500).json({ error: '导出Excel失败: ' + error.message });
    }
});

// 旧版导出CSV数据（保留向后兼容）
app.get('/api/export', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }

    const { start_date, end_date, keyword } = req.query;
    
    let query = `
        SELECT 
            c.customer_name,
            c.phone,
            c.address,
            c.detailed_address,
            o.product_name,
            o.quantity,
            o.amount,
            u.username as service_name,
            o.order_date
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN users u ON o.user_id = u.id
        WHERE 1=1
    `;
    
    let params = [];
    
    if (start_date && end_date) {
        query += ' AND DATE(o.order_date) BETWEEN ? AND ?';
        params.push(start_date, end_date);
    }
    
    if (keyword) {
        query += ' AND (c.customer_name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR c.detailed_address LIKE ? OR o.product_name LIKE ? OR o.remarks LIKE ?)';
        const searchKeyword = `%${keyword}%`;
        params.push(searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword);
    }
    
    query += ' ORDER BY o.order_date DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: '导出数据失败' });
        
        // 转换为CSV格式
        const headers = ['客户姓名', '电话', '地址', '详细地址', '产品名称', '数量', '金额', '客服', '订单日期'];
        const csvContent = [
            headers.join(','),
            ...rows.map(row => [
                row.customer_name,
                row.phone,
                row.address,
                row.detailed_address,
                row.product_name,
                row.quantity,
                row.amount,
                row.service_name,
                row.order_date
            ].map(field => `"${field || ''}"`).join(','))
        ].join('\n');
        
        const utf8Name = '客户订单数据.csv';
        const asciiFallback = 'orders.csv';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`);
        res.send(csvContent);
    });
});

// 锁定客户信息
app.post('/api/customers/:id/lock', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }

    const { id } = req.params;
    const { lock_until } = req.body;

    db.run('UPDATE customers SET locked_until = ? WHERE id = ?',
        [lock_until, id],
        function(err) {
            if (err) return res.status(500).json({ error: '锁定失败' });
            res.json({ message: '锁定成功' });
        }
    );
});

// 删除用户（管理员）
app.delete('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }

    const { id } = req.params;
    
    // 不允许删除自己的账号
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: '不能删除当前登录的账号' });
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: '删除用户失败' });
        
        if (this.changes === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({ message: '用户删除成功' });
    });
});

// 获取用户列表（管理员）
app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    
    db.all('SELECT id, username, role, created_at FROM users', (err, rows) => {
        if (err) return res.status(500).json({ error: '获取用户列表失败' });
        res.json(rows);
    });
});

// 重置用户密码（管理员）
app.post('/api/users/:id/reset-password', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    
    const { id } = req.params;
    const { new_password } = req.body;
    
    if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: '密码长度至少6位' });
    }
    
    const hashedPassword = bcrypt.hashSync(new_password, 10);
    
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id], function(err) {
        if (err) return res.status(500).json({ error: '重置密码失败' });
        
        if (this.changes === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({ message: '密码重置成功' });
    });
});

// 导入AI服务
const aiService = require('./ai-service');

// 加载环境变量
require('dotenv').config();

// AI服务管理接口
app.get('/api/ai-services/status', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    
    res.json(aiService.getServiceStatus());
});

app.post('/api/ai-services/switch', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    
    const { type, service } = req.body;
    
    if (type === 'ai') {
        const success = aiService.switchAIService(service);
        res.json({ success, message: success ? `已切换到AI服务: ${service}` : '切换失败' });
    } else if (type === 'map') {
        const success = aiService.switchMapService(service);
        res.json({ success, message: success ? `已切换到地图服务: ${service}` : '切换失败' });
    } else {
        res.status(400).json({ error: '无效的服务类型' });
    }
});

// 地址解析API代理（需要认证）- 支持多AI服务增强 - 自由打印模板格式
app.post('/api/parse-address', async (req, res) => {
    const { address } = req.body;
    
    if (!address) {
        return res.status(400).json({ error: '地址不能为空' });
    }
    
    console.log('收到地址解析请求:', address);
    
    try {
        // 首先尝试使用阿里云通义千问AI解析
        try {
            console.log('使用阿里云通义千问AI解析地址...');
            const aiResult = await aiService.parseAddressWithAI(address);
            console.log('阿里云AI解析结果:', aiResult);
            
            // 确保结果符合自由打印模板格式，并添加物品信息
            return res.json({
                success: true,
                data: {
                    formatted_address: address,
                    province: aiResult.province,
                    city: aiResult.city,
                    district: aiResult.district,
                    detail_address: aiResult.detail_address,
                    recipient_name: aiResult.recipient_name || '',
                    recipient_phone: aiResult.recipient_phone || '',
                    product_name: aiResult.product_name || '',
                    quantity: aiResult.quantity || '',
                    amount: aiResult.amount || '',
                    source: 'qwen_ai',
                    version: '2.1.0'
                }
            });
        } catch (aiError) {
            console.log('阿里云AI地址解析失败，回退到高德地图API:', aiError.message);
            
            // AI解析失败，回退到高德地图API
            const apiKey = 'e789aeb4f9c56acb9a2edac89659bc23';
            const response = await axios.get(
                `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${apiKey}`
            );
            
            if (response.data.status === '1' && response.data.geocodes.length > 0) {
                const result = response.data.geocodes[0];
                
                // 从高德API结果中提取省市区
                const addressComponent = result.addressComponent;
                
                // 标准化省市区格式
                const standardizeProvince = (province) => {
                    if (!province) return '';
                    return province.replace(/省$|市$|自治区$|特别行政区$|维吾尔$|壮族$|回族$|维吾尔族$|壮族自治区$|回族自治区$|自治州$|地区$/, '').trim();
                };
                
                const standardizeCity = (city) => {
                    if (!city) return '';
                    return city.replace(/市$|地区$|自治州$|盟$|自治县$/, '').trim();
                };
                
                const standardizeDistrict = (district) => {
                    if (!district) return '';
                    return district.replace(/区$|县$|市$|旗$|自治县$|自治旗$/, '').trim();
                };
                
                // 返回标准化的结果
                res.json({
                    success: true,
                    data: {
                        formatted_address: address,
                        province: standardizeProvince(addressComponent.province),
                        city: standardizeCity(addressComponent.city),
                        district: standardizeDistrict(addressComponent.district),
                        detail_address: result.formatted_address.replace(addressComponent.province, '').replace(addressComponent.city, '').replace(addressComponent.district, '').trim(),
                        recipient_name: '',
                        recipient_phone: '',
                        product_name: '',
                        quantity: '',
                        amount: '',
                        source: 'amap',
                        version: '2.1.0'
                    }
                });
            } else {
                res.status(400).json({ 
                    success: false, 
                    error: '地址解析失败' 
                });
            }
        }
    } catch (error) {
        console.error('地址解析错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '解析服务错误: ' + error.message 
        });
    }
});

// 测试用地址解析API（不需要认证）
app.post('/api/parse-address-test', async (req, res) => {
    const { address } = req.body;
    
    if (!address) {
        return res.status(400).json({ error: '地址不能为空' });
    }
    
    try {
        const apiKey = 'e789aeb4f9c56acb9a2edac89659bc23';
        // 使用axios发送请求到高德地图API
        const response = await axios.get(
            `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${apiKey}`
        );
        
        if (response.data.status === '1' && response.data.geocodes.length > 0) {
            res.json(response.data.geocodes[0]);
        } else {
            res.status(400).json({ error: '地址解析失败' });
        }
    } catch (error) {
        console.error('地址解析错误:', error);
        res.status(500).json({ error: '解析服务错误' });
    }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`访问 http://localhost:${PORT} 查看系统`);
    console.log(`手机访问: http://192.168.1.3:${PORT}`);
});

module.exports = app;
