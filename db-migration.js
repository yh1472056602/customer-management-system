/**
 * 数据库迁移脚本 - 寄件人信息拆分
 * 
 * 该脚本实现以下功能：
 * 1. 创建新的寄件人信息表 sender_info
 * 2. 修改订单表结构，添加寄件人信息关联
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 连接数据库
const db = new sqlite3.Database(path.join(__dirname, 'customer_system.db'));

// 开始事务
db.serialize(() => {
  console.log('开始数据库迁移...');
  
  // 开启事务
  db.run('BEGIN TRANSACTION');
  
  try {
    // 1. 创建寄件人信息表
    console.log('创建寄件人信息表...');
    db.run(`CREATE TABLE IF NOT EXISTS sender_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_name TEXT,
      sender_phone TEXT,
      sender_province TEXT,
      sender_city TEXT,
      sender_district TEXT,
      sender_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // 2. 修改订单表，添加寄件人信息关联
    console.log('修改订单表结构...');
    
    // 2.1 创建临时订单表
    db.run(`CREATE TABLE orders_temp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      user_id INTEGER,
      sender_id INTEGER,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      remarks TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (sender_id) REFERENCES sender_info (id)
    )`);
    
    // 2.2 复制现有数据到临时表
    db.run(`INSERT INTO orders_temp (id, customer_id, product_name, quantity, amount, user_id, order_date)
      SELECT id, customer_id, product_name, quantity, amount, user_id, order_date FROM orders`);
    
    // 2.3 删除旧表
    db.run(`DROP TABLE orders`);
    
    // 2.4 重命名临时表为正式表
    db.run(`ALTER TABLE orders_temp RENAME TO orders`);
    
    // 3. 提交事务
    db.run('COMMIT');
    console.log('数据库迁移成功完成！');
    
  } catch (error) {
    // 发生错误时回滚事务
    db.run('ROLLBACK');
    console.error('迁移失败，已回滚:', error);
  }
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    console.error('关闭数据库连接时出错:', err.message);
  } else {
    console.log('数据库连接已关闭');
  }
});