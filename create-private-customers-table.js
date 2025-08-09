const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 打开数据库连接
const db = new sqlite3.Database(path.join(__dirname, 'customer_system.db'), (err) => {
    if (err) {
        console.error('无法连接到数据库:', err.message);
        return;
    }
    console.log('已连接到数据库');
});

// 创建私域客户表
db.run(`
CREATE TABLE IF NOT EXISTS private_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    type TEXT,
    remark TEXT,
    customer_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
)`, (err) => {
    if (err) {
        console.error('创建私域客户表失败:', err.message);
    } else {
        console.log('私域客户表创建成功或已存在');
    }
    
    // 关闭数据库连接
    db.close((err) => {
        if (err) {
            console.error('关闭数据库连接失败:', err.message);
        } else {
            console.log('数据库连接已关闭');
        }
    });
});



