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

// 添加手机编号字段
db.run(`
ALTER TABLE private_customers ADD COLUMN phone_number TEXT;
`, (err) => {
    if (err) {
        // SQLite可能不支持ALTER TABLE ADD COLUMN，如果出错，我们尝试另一种方法
        console.log('使用标准ALTER TABLE失败，尝试创建新表并迁移数据...');
        
        // 创建新表
        db.serialize(() => {
            // 检查表是否存在
            db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='private_customers'`, (err, row) => {
                if (err) {
                    console.error('检查表失败:', err.message);
                    db.close();
                    return;
                }
                
                if (row) {
                    // 表存在，创建新表
                    db.run(`
                    CREATE TABLE private_customers_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        phone TEXT,
                        source TEXT,
                        type TEXT,
                        remark TEXT,
                        customer_id INTEGER,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        phone_number TEXT,
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        FOREIGN KEY (customer_id) REFERENCES customers(id)
                    )`, (err) => {
                        if (err) {
                            console.error('创建新表失败:', err.message);
                            db.close();
                            return;
                        }
                        
                        // 复制数据
                        db.run(`
                        INSERT INTO private_customers_new (id, user_id, name, phone, source, type, remark, customer_id, created_at)
                        SELECT id, user_id, name, phone, source, type, remark, customer_id, created_at FROM private_customers
                        `, (err) => {
                            if (err) {
                                console.error('复制数据失败:', err.message);
                                db.close();
                                return;
                            }
                            
                            // 删除旧表
                            db.run(`DROP TABLE private_customers`, (err) => {
                                if (err) {
                                    console.error('删除旧表失败:', err.message);
                                    db.close();
                                    return;
                                }
                                
                                // 重命名新表
                                db.run(`ALTER TABLE private_customers_new RENAME TO private_customers`, (err) => {
                                    if (err) {
                                        console.error('重命名表失败:', err.message);
                                    } else {
                                        console.log('成功添加手机编号字段');
                                    }
                                    
                                    db.close((err) => {
                                        if (err) {
                                            console.error('关闭数据库连接失败:', err.message);
                                        } else {
                                            console.log('数据库连接已关闭');
                                        }
                                    });
                                });
                            });
                        });
                    });
                } else {
                    console.log('私域客户表不存在，无需更新');
                    db.close();
                }
            });
        });
    } else {
        console.log('成功添加手机编号字段');
        db.close((err) => {
            if (err) {
                console.error('关闭数据库连接失败:', err.message);
            } else {
                console.log('数据库连接已关闭');
            }
        });
    }
});



