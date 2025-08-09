// 客服工作台功能

// 安全处理函数
function safelyGetElement(id) {
    return document.getElementById(id);
}

function safelySetValue(element, value) {
    if (element) element.value = value;
}

function safelyHandleResponse(data) {
    console.log('处理响应数据:', data);
    
    // 处理兼容层返回的数据格式
    if (data && data.success === true && data.data) {
        // 如果data.data是数组，直接返回
        if (Array.isArray(data.data)) {
            return data.data;
        }
        // 如果data.data是对象，检查是否包含数组字段
        if (typeof data.data === 'object') {
            // 对于订单数据
            if (data.data.orders && Array.isArray(data.data.orders)) {
                return data.data.orders;
            }
            // 对于客户数据
            if (data.data.customers && Array.isArray(data.data.customers)) {
                return data.data.customers;
            }
            // 对于统计数据，返回对象本身
            if (data.data.todayOrders !== undefined || data.data.totalOrders !== undefined) {
                return data.data;
            }
            // 其他情况，返回对象
            return data.data;
        }
        return data.data;
    }
    
    // 如果是直接返回的数组
    if (Array.isArray(data)) {
        return data;
    }
    
    // 如果是对象，检查是否包含数组字段
    if (typeof data === 'object' && data !== null) {
        if (data.orders && Array.isArray(data.orders)) {
            return data.orders;
        }
        if (data.customers && Array.isArray(data.customers)) {
            return data.customers;
        }
        // 对于统计数据对象，直接返回
        return data;
    }
    
    // 默认返回空数组，避免forEach等方法出错
    return [];
}

let customers = [];
let orders = [];

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 临时禁用权限检查，方便测试
        // if (!checkPermission('customer_service')) {
        //     return;
        // }
        
        // 显示版本号，确认代码已更新
        console.log('客服工作台 - 版本 2.4.0 (15天查询限制版)');
        
        // 设置全局变量，确保AI始终启用
        window.aiEnabled = true;
        
        // 设置查询日期限制（15天）
        setupDateRestrictions();
        
        loadCustomers();
        // 初次进入不强制加载订单，避免与用户立即执行的搜索产生覆盖
        loadStatistics();
        loadPrivateData();
        loadPrivateCustomers();
        
        // 表单提交处理
        setupFormHandlers();
    } catch (error) {
        console.error('页面初始化错误:', error);
    }
});

// 设置日期限制（客服只能查询最近15天的数据）
function setupDateRestrictions() {
    // 获取今天的日期
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 计算15天前的日期
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(today.getDate() - 15);
    const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0];
    
    // 设置日期输入框的默认值和限制
    const startDateInput = safelyGetElement('startDate');
    const endDateInput = safelyGetElement('endDate');
    
    // 设置结束日期为今天
    safelySetValue(endDateInput, todayStr);
    
    // 设置开始日期为15天前
    safelySetValue(startDateInput, fifteenDaysAgoStr);
    
    // 设置日期输入框的最小值（不能查询15天前的数据）
    if (startDateInput) {
        startDateInput.min = fifteenDaysAgoStr;
        startDateInput.max = todayStr;
    }
    
    if (endDateInput) {
        endDateInput.min = fifteenDaysAgoStr;
        endDateInput.max = todayStr;
    }
    
    // 为私域数据也设置相同的限制
    const privateStartDate = safelyGetElement('privateStartDate');
    const privateEndDate = safelyGetElement('privateEndDate');
    
    if (privateStartDate) {
        safelySetValue(privateStartDate, fifteenDaysAgoStr);
        privateStartDate.min = fifteenDaysAgoStr;
        privateStartDate.max = todayStr;
    }
    
    if (privateEndDate) {
        safelySetValue(privateEndDate, todayStr);
        privateEndDate.min = fifteenDaysAgoStr;
        privateEndDate.max = todayStr;
    }
    
    // 设置记录日期
    const recordDate = safelyGetElement('recordDate');
    if (recordDate) {
        safelySetValue(recordDate, todayStr);
    }
}

// 设置表单处理
function setupFormHandlers() {
    // 客户表单
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', addCustomer);
    }
    

    
    // 私域数据表单
    const privateForm = document.getElementById('privateForm');
    if (privateForm) {
        privateForm.addEventListener('submit', addPrivateData);
    }
    
    // 私域客户表单
    const privateCustomerForm = document.getElementById('privateCustomerForm');
    if (privateCustomerForm) {
        privateCustomerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('私域客户添加功能已集成到添加客户表单中，请在添加客户时勾选"同时保存为私域客户"选项。');
        });
    }
    
    // 初始化私域数据表单同步
    initPrivateDataSync();
}

// 显示不同区域
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    const buttons = document.querySelectorAll('.nav-btn');
    
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    // 安全激活对应的导航按钮（避免未定义的 event 导致中断）
    const relatedBtn = document.querySelector(`.nav-btn[onclick="showSection('${sectionId}')"]`);
    if (relatedBtn) relatedBtn.classList.add('active');
    
    // 当切换到"查看数据"部分时，刷新数据
    if (sectionId === 'view-data') {
        console.log('切换到查看数据部分，自动刷新数据');
        refreshData();
    }
}

// 智能地址解析 - 支持多AI服务，自动选择最快服务
async function parseAddress() {
    const address = document.getElementById('customerAddress').value;
    if (!address) {
        alert('请输入地址');
        return;
    }
    
    // 显示加载状态和计时
    const parseBtn = document.querySelector('.parse-btn');
    const originalText = parseBtn.innerHTML;
    const startTime = Date.now();
    
    // 显示AI性能监控区域
    const aiPerformance = document.getElementById('aiPerformance');
    if (aiPerformance) {
        aiPerformance.style.display = 'block';
    }
    
    parseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 阿里云AI解析中...';
    parseBtn.disabled = true;
    
    // 添加性能监控
    let performanceTimer = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        parseBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 阿里云解析中... ${elapsed}s`;
        
        // 更新性能文本
        const performanceText = document.getElementById('performanceText');
        if (performanceText) {
            performanceText.textContent = `解析中 ${elapsed}s`;
        }
    }, 100);
    
    try {
        // 使用后端API调用Kimi AI进行地址解析
        const response = await fetch('/api/parse-address', {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address })
        });
        
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Kimi AI地址解析返回数据:', data); // 调试输出
        
        // 处理阿里云API响应数据
        let parsedData = data;
        if (data && data.success && data.data) {
            parsedData = data.data;
        }
        
        if (parsedData && parsedData.province) {
            // 从解析结果中提取省市区信息，确保格式符合自由打印批量上传模板
            const province = parsedData.province || '';
            const city = parsedData.city || '';
            const district = parsedData.district || '';
            const detailAddress = parsedData.detail_address || '';
            
            // 更新所有相关地址字段
            document.getElementById('recipientProvince').value = province;
            document.getElementById('recipientCity').value = city;
            document.getElementById('recipientDistrict').value = district;
            document.getElementById('detailedAddress').value = detailAddress;
            
            // 如果有收件人信息，也更新相关字段
            if (parsedData.recipient_name) {
                document.getElementById('customerName').value = parsedData.recipient_name;
                // 同步到私域客户姓名
                const privateName = document.getElementById('privateName');
                if (privateName) {
                    privateName.value = parsedData.recipient_name;
                }
            }
            
            if (parsedData.recipient_phone) {
                document.getElementById('customerPhone').value = parsedData.recipient_phone;
                // 同步到私域客户电话
                const privatePhone = document.getElementById('privatePhone');
                if (privatePhone) {
                    privatePhone.value = parsedData.recipient_phone;
                }
            }
            
            // 如果有物品信息，也更新相关字段
            if (parsedData.product_name) {
                document.getElementById('productName').value = parsedData.product_name;
            }
            
            if (parsedData.quantity) {
                // 保留原始中文数量
                const originalQuantity = parsedData.quantity;
                
                // 将中文数字转换为阿拉伯数字用于表单提交
                let numericQuantity = '1'; // 默认为1
                
                try {
                    // 解决编码问题，处理各种可能的情况
                    console.log('原始数量字符串:', originalQuantity);
                    
                    // 直接检查字符串中是否包含数字
                    const numericMatch = originalQuantity.match(/\d+/);
                    if (numericMatch) {
                        numericQuantity = numericMatch[0];
                        console.log('从数字匹配提取到数量:', numericQuantity);
                    } else {
                        // 如果没有数字，尝试通过中文字符判断
                        if (originalQuantity.indexOf('一') >= 0 || originalQuantity.indexOf('1') >= 0) {
                            numericQuantity = '1';
                        } else if (originalQuantity.indexOf('二') >= 0 || originalQuantity.indexOf('两') >= 0 || originalQuantity.indexOf('2') >= 0) {
                            numericQuantity = '2';
                        } else if (originalQuantity.indexOf('三') >= 0 || originalQuantity.indexOf('3') >= 0) {
                            numericQuantity = '3';
                        } else if (originalQuantity.indexOf('四') >= 0 || originalQuantity.indexOf('4') >= 0) {
                            numericQuantity = '4';
                        } else if (originalQuantity.indexOf('五') >= 0 || originalQuantity.indexOf('5') >= 0) {
                            numericQuantity = '5';
                        } else if (originalQuantity.indexOf('六') >= 0 || originalQuantity.indexOf('6') >= 0) {
                            numericQuantity = '6';
                        } else if (originalQuantity.indexOf('七') >= 0 || originalQuantity.indexOf('7') >= 0) {
                            numericQuantity = '7';
                        } else if (originalQuantity.indexOf('八') >= 0 || originalQuantity.indexOf('8') >= 0) {
                            numericQuantity = '8';
                        } else if (originalQuantity.indexOf('九') >= 0 || originalQuantity.indexOf('9') >= 0) {
                            numericQuantity = '9';
                        } else if (originalQuantity.indexOf('十') >= 0 || originalQuantity.indexOf('10') >= 0) {
                            numericQuantity = '10';
                        }
                        console.log('从中文匹配提取到数量:', numericQuantity);
                    }
                } catch (e) {
                    console.error('解析数量出错:', e);
                    // 保持默认值1
                }
                
                // 设置数值用于表单提交
                document.getElementById('quantity').value = numericQuantity;
                
                // 保存原始中文数量描述到备注字段
                const currentRemarks = document.getElementById('remarks').value;
                const newRemarks = currentRemarks ? 
                    `${currentRemarks} | 原始数量: ${originalQuantity}` : 
                    `原始数量: ${originalQuantity}`;
                document.getElementById('remarks').value = newRemarks;
                
                // 同步备注到私域客户备注
                const privateRemark = document.getElementById('privateRemark');
                if (privateRemark) {
                    privateRemark.value = newRemarks;
                }
            }
            
            // 在原始地址框中显示完整格式化地址
            document.getElementById('customerAddress').value = `${province}${city}${district}${detailAddress}`;
            
            // 在控制台显示格式化后的数据，便于调试
            console.log('格式化后的地址数据:', {
                '收件人省': province,
                '收件人市': city,
                '收件人区': district,
                '收件人详细地址': detailAddress,
                '收件人姓名': data.recipient_name || '',
                '收件人电话': data.recipient_phone || '',
                '物品名称': data.product_name || '',
                '数量': data.quantity || '',
                '金额': data.amount || ''
            });
            
            // 显示成功消息，使用表格格式字段名称
            let message = `阿里云AI解析完成！\n收件人省: ${province}\n收件人市: ${city}\n收件人区: ${district}\n收件人详细地址: ${detailAddress}`;
            
            if (parsedData.recipient_name) {
                message += `\n收件人姓名: ${parsedData.recipient_name}`;
            }
            
            if (parsedData.recipient_phone) {
                message += `\n收件人电话: ${parsedData.recipient_phone}`;
            }
            
            if (parsedData.product_name) {
                message += `\n物品名称: ${parsedData.product_name}`;
            }
            
            if (parsedData.quantity) {
                message += `\n数量: ${parsedData.quantity}`;
            }
            
            if (parsedData.amount) {
                try {
                    // 提取数字部分
                    let amount = parsedData.amount;
                    const numericMatch = amount.match(/\d+/);
                    if (numericMatch) {
                        amount = numericMatch[0];
                    }
                    
                    // 在表单中显示金额
                    document.getElementById('productAmount').value = amount;
                    
                    // 添加金额到备注中
                    const currentRemarks = document.getElementById('remarks').value;
                    const amountRemark = `金额: ${parsedData.amount}元`;
                    const newRemarks = currentRemarks ? 
                        `${currentRemarks} | ${amountRemark}` : 
                        amountRemark;
                    document.getElementById('remarks').value = newRemarks;
                    
                    // 同步备注到私域客户备注
                    const privateRemark = document.getElementById('privateRemark');
                    if (privateRemark) {
                        privateRemark.value = newRemarks;
                    }
                    
                    message += `\n金额: ${parsedData.amount}元`;
                    
                    console.log('设置金额成功:', amount);
                } catch (e) {
                    console.error('设置金额出错:', e);
                }
            }
            
            // 自动启用"同时保存为私域客户"选项
            const enablePrivateDataCheckbox = document.getElementById('enablePrivateData');
            if (enablePrivateDataCheckbox) {
                enablePrivateDataCheckbox.checked = true;
            }
            
            alert(message);
        } else {
            alert('地址解析失败: 无法识别地址格式');
        }
    } catch (error) {
        console.error('地址解析错误:', error);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        alert(`地址解析失败 (耗时${elapsed}s)，请手动填写或稍后重试`);
    } finally {
        // 清除计时器并恢复按钮状态
        clearInterval(performanceTimer);
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // 显示解析完成时间
        parseBtn.innerHTML = `<i class="fas fa-check"></i> 解析完成 (${totalTime}s)`;
        setTimeout(() => {
            parseBtn.innerHTML = originalText;
            parseBtn.disabled = false;
        }, 2000);
    }
}

// 加载客户列表
async function loadCustomers() {
    try {
        const response = await fetch('/api/customers', {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            customers = await response.json();
            populateCustomerSelect();
        }
    } catch (error) {
        console.error('加载客户失败:', error);
    }
}

// 填充客户选择下拉框
function populateCustomerSelect() {
    const select = document.getElementById('orderCustomer');
    if (!select) return;
    
    select.innerHTML = '<option value="">请选择客户</option>';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.customer_name;
        select.appendChild(option);
    });
}

// 刷新所有数据
async function refreshData() {
    console.log('刷新所有数据...');
    try {
        // 避免与搜索中的请求互相覆盖：有搜索关键词时仅刷新表格，不触发额外加载
        const keyword = safelyGetElement('searchKeyword')?.value;
        if (keyword) {
            await Promise.all([
                loadOrders(),
                loadStatistics()
            ]);
        } else {
            await Promise.all([
                loadCustomers(),
                loadOrders(),
                loadStatistics(),
                loadPrivateData(),
                loadPrivateCustomers()
            ]);
        }
        console.log('所有数据刷新完成');
    } catch (error) {
        console.error('刷新数据时出错:', error);
    }
}

// 添加客户和订单（符合自由打印模板格式）
async function addCustomer(e) {
    e.preventDefault();
    
    // 收集表单数据，确保字段名称与Excel模板一致
    const customerData = {
        customer_name: document.getElementById('customerName').value, // 收件人姓名
        phone: document.getElementById('customerPhone').value, // 收件人手机/电话
        province: document.getElementById('recipientProvince').value, // 收件人省
        city: document.getElementById('recipientCity').value, // 收件人市
        district: document.getElementById('recipientDistrict').value, // 收件人区
        detailed_address: document.getElementById('detailedAddress').value, // 收件人详细地址
        product_name: document.getElementById('productName').value, // 物品名称
        quantity: document.getElementById('quantity').value, // 数量
        amount: document.getElementById('productAmount').value, // 金额
        product_code: document.getElementById('productCode').value, // 商品编码
        product_attributes: document.getElementById('productAttributes').value, // 销售属性
        remarks: document.getElementById('remarks').value // 备注
    };
    
    // 调试输出
    console.log('提交前的表单数据:', {
        '收件人姓名': customerData.customer_name,
        '收件人电话': customerData.phone,
        '收件人省': customerData.province,
        '收件人市': customerData.city,
        '收件人区': customerData.district,
        '收件人详细地址': customerData.detailed_address,
        '物品名称': customerData.product_name,
        '数量': customerData.quantity,
        '金额': customerData.amount,
        '备注': customerData.remarks
    });
    
    // 构建完整地址（用于数据库存储）
    customerData.address = `${customerData.province} ${customerData.city} ${customerData.district}`;
    
    console.log('提交的订单数据:', customerData);
    
    try {
        // 保存客户信息
        const response = await fetch('/api/customers', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(customerData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // 如果客户保存成功，自动创建订单
            if (result.customerId) {
                const orderData = {
                    customer_id: result.customerId,
                    product_name: customerData.product_name,
                    quantity: parseInt(customerData.quantity) || 1,
                    amount: parseFloat(customerData.amount) || 0, // 使用表单中的金额
                    remarks: customerData.remarks,
                    product_code: customerData.product_code,
                    product_attributes: customerData.product_attributes
                };
                
                console.log('准备提交订单数据:', {
                    '客户ID': orderData.customer_id,
                    '物品名称': orderData.product_name,
                    '数量': orderData.quantity,
                    '金额': orderData.amount,
                    '备注': orderData.remarks
                });
                
                // 保存订单
                const orderResponse = await fetch('/api/orders', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(orderData)
                });
                
                // 检查是否需要保存为私域客户
                const enablePrivateData = document.getElementById('enablePrivateData').checked;
                if (enablePrivateData) {
                    // 准备私域客户数据
                    const privateData = {
                        name: document.getElementById('privateName').value || customerData.customer_name,
                        phone: document.getElementById('privatePhone').value || customerData.phone,
                        phone_number: document.getElementById('privatePhoneNumber').value,
                        source: document.getElementById('privateSource').value,
                        type: document.getElementById('privateType').value,
                        remark: document.getElementById('privateRemark').value || customerData.remarks,
                        customer_id: result.customerId // 关联到刚创建的客户
                    };
                    
                    console.log('准备提交私域客户数据:', privateData);
                    
                    // 保存私域客户数据
                    try {
                        const privateResponse = await fetch('/api/private-customers', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(privateData)
                        });
                        
                        if (privateResponse.ok) {
                            console.log('私域客户数据保存成功');
                        } else {
                            const error = await privateResponse.json();
                            console.error('私域客户数据保存失败:', error);
                        }
                    } catch (privateError) {
                        console.error('保存私域客户数据时出错:', privateError);
                    }
                }
                
                if (orderResponse.ok) {
                    alert('订单信息保存成功！' + (enablePrivateData ? '同时已添加为私域客户。' : ''));
                    document.getElementById('customerForm').reset();
                    // 刷新所有相关数据
                    refreshData();
                } else {
                    const error = await orderResponse.json();
                    alert('订单保存失败: ' + error.error);
                }
            } else {
                alert('客户信息保存成功！');
                document.getElementById('customerForm').reset();
                // 刷新所有相关数据
                refreshData();
            }
        } else {
            const error = await response.json();
            alert('添加失败: ' + error.error);
        }
    } catch (error) {
        alert('添加失败: ' + error.message);
    }
}



// 加载订单
async function loadOrders() {
    try {
        const startDate = safelyGetElement('startDate');
        const endDate = safelyGetElement('endDate');
        
        let url = '/api/orders';
        if (startDate && endDate && startDate.value && endDate.value) {
            url += `?start_date=${startDate.value}&end_date=${endDate.value}`;
        }
        
        console.log('加载订单，请求URL:', url);
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('订单数据响应:', data);
            orders = safelyHandleResponse(data);
            console.log('处理后的订单数据:', orders);
            displayOrders();
        } else {
            console.error('加载订单失败，状态码:', response.status);
            orders = [];
            displayOrders();
        }
    } catch (error) {
        console.error('加载订单失败:', error);
        orders = [];
        displayOrders();
    }
}

// 显示订单
function displayOrders() {
    let tbody = safelyGetElement('ordersTableBody');
    if (!tbody) {
        // 尝试创建缺失的 tbody 以保证渲染
        const table = document.getElementById('ordersTable');
        if (table) {
            tbody = document.createElement('tbody');
            tbody.id = 'ordersTableBody';
            table.appendChild(tbody);
        } else {
            console.error('找不到订单表格主体元素');
            return;
        }
    }
    
    tbody.innerHTML = '';
    console.log('准备显示订单数据:', orders);
    
    // 确保orders是数组
    if (Array.isArray(orders)) {
        if (orders.length === 0) {
            // 显示无数据提示
            const row = tbody.insertRow();
            row.innerHTML = `<td colspan="9" style="text-align:center;">没有找到匹配的订单数据</td>`;
        } else {
            orders.forEach(order => {
                try {
                    const row = tbody.insertRow();
                    // 确保与HTML表格结构匹配
                    row.innerHTML = `
                        <td>${order.id || ''}</td>
                        <td>${order.customer_name || ''}</td>
                        <td>${order.phone || ''}</td>
                        <td>${(order.address || '') + ' ' + (order.detailed_address || '')}</td>
                        <td>${order.product_name || ''}</td>
                        <td>${order.quantity || 0}</td>
                        <td>¥${order.amount || 0}</td>
                        <td>${formatDateTime(order.order_date)}</td>
                        <td>
                            <button class="view-btn" onclick="viewOrder(${order.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    `;
                } catch (error) {
                    console.error('显示订单行出错:', error, order);
                }
            });
        }
    } else {
        console.warn('订单数据不是数组格式:', orders);
        // 显示错误提示
        const row = tbody.insertRow();
        row.innerHTML = `<td colspan="9" style="text-align:center; color:red;">数据格式错误</td>`;
    }

    // 渲染完成后，更新订单概览统计
    if (typeof updateOrderSummary === 'function') {
        try { updateOrderSummary(); } catch (e) { /* no-op */ }
    }
}

// 加载统计数据
async function loadStatistics() {
    try {
        const startDate = safelyGetElement('startDate');
        const endDate = safelyGetElement('endDate');
        
        let url = '/api/statistics';
        if (startDate && endDate && startDate.value && endDate.value) {
            url += `?start_date=${startDate.value}&end_date=${endDate.value}`;
        }
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const stats = safelyHandleResponse(data);
            displayStatistics(stats);
        }
    } catch (error) {
        console.error('加载统计失败:', error);
        displayStatistics([]);
    }
}

// 显示统计数据
function displayStatistics(stats) {
    try {
        console.log('显示统计数据:', stats);
        
        // 处理不同格式的统计数据
        let processedStats = {};
        
        if (Array.isArray(stats)) {
            // 如果是数组格式，计算汇总
            const today = new Date().toISOString().split('T')[0];
            const todayStats = stats.find(s => s && s.order_date === today) || { total_orders: 0, total_amount: 0 };
            
            processedStats = {
                todayOrders: todayStats.total_orders || 0,
                weekOrders: stats.reduce((sum, s) => sum + (parseInt(s.total_orders) || 0), 0),
                monthOrders: stats.reduce((sum, s) => sum + (parseInt(s.total_orders) || 0), 0),
                totalSales: stats.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0)
            };
        } else if (typeof stats === 'object' && stats !== null) {
            // 如果是对象格式，直接使用
            processedStats = {
                todayOrders: stats.todayOrders || stats.total_orders || 0,
                weekOrders: stats.weekOrders || stats.total_orders || 0,
                monthOrders: stats.monthOrders || stats.total_orders || 0,
                totalSales: stats.totalSales || stats.total_amount || 0
            };
        } else {
            // 默认值
            processedStats = {
                todayOrders: 0,
                weekOrders: 0,
                monthOrders: 0,
                totalSales: 0
            };
        }
        
        // 更新页面元素
        const todayOrdersElement = safelyGetElement('todayOrders');
        if (todayOrdersElement) {
            todayOrdersElement.textContent = processedStats.todayOrders;
        }
        
        const weekOrdersElement = safelyGetElement('weekOrders');
        if (weekOrdersElement) {
            weekOrdersElement.textContent = processedStats.weekOrders;
        }
        
        const monthOrdersElement = safelyGetElement('monthOrders');
        if (monthOrdersElement) {
            monthOrdersElement.textContent = processedStats.monthOrders;
        }
        
        const totalSalesElement = safelyGetElement('totalSales');
        if (totalSalesElement) {
            totalSalesElement.textContent = `¥${processedStats.totalSales}`;
        }
        
        console.log('统计数据显示完成:', processedStats);
    } catch (error) {
        console.error('显示统计数据出错:', error);
    }
}

// 私域数据相关功能
async function addPrivateData(e) {
    e.preventDefault();
    
    const privateData = {
        phone_number: document.getElementById('phoneNumber').value,
        phone_type: document.getElementById('phoneType').value,
        order_amount: parseFloat(document.getElementById('privateOrderAmount').value) || 0,
        total_fans: parseInt(document.getElementById('totalFans').value) || 0,
        new_fans: parseInt(document.getElementById('newFans').value) || 0,
        lost_fans: parseInt(document.getElementById('lostFans').value) || 0,
        record_date: document.getElementById('recordDate').value
    };
    
    try {
        const response = await fetch('/api/private-domain', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(privateData)
        });
        
        if (response.ok) {
            alert('私域数据添加成功！');
            document.getElementById('privateForm').reset();
            // 使用refreshData函数刷新所有数据
            refreshData();
        } else {
            const error = await response.json();
            alert('添加失败: ' + error.error);
        }
    } catch (error) {
        alert('添加失败: ' + error.message);
    }
}

// 加载私域数据
async function loadPrivateData() {
    try {
        const startDate = safelyGetElement('privateStartDate');
        const endDate = safelyGetElement('privateEndDate');
        
        let url = '/api/private-domain';
        if (startDate && endDate && startDate.value && endDate.value) {
            url += `?start_date=${startDate.value}&end_date=${endDate.value}`;
        }
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const privateData = safelyHandleResponse(data);
            displayPrivateData(privateData);
        }
    } catch (error) {
        console.error('加载私域数据失败:', error);
        displayPrivateData([]);
    }
}

// 加载私域客户
async function loadPrivateCustomers() {
    try {
        const keyword = safelyGetElement('privateSearchKeyword');
        const sourceFilter = safelyGetElement('privateSourceFilter');
        const phoneNumberFilter = safelyGetElement('privatePhoneNumberFilter');
        
        let url = '/api/private-customers';
        const queryParams = [];
        
        if (keyword && keyword.value) {
            queryParams.push(`keyword=${encodeURIComponent(keyword.value)}`);
        }
        
        if (sourceFilter && sourceFilter.value) {
            queryParams.push(`source=${encodeURIComponent(sourceFilter.value)}`);
        }
        
        if (phoneNumberFilter && phoneNumberFilter.value) {
            queryParams.push(`phone_number=${encodeURIComponent(phoneNumberFilter.value)}`);
        }
        
        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const privateCustomers = safelyHandleResponse(data);
            displayPrivateCustomers(privateCustomers);
        }
    } catch (error) {
        console.error('加载私域客户失败:', error);
        displayPrivateCustomers([]);
    }
}

// 显示私域数据
function displayPrivateData(data) {
    const tbody = safelyGetElement('privateTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // 确保data是数组
    if (Array.isArray(data)) {
        data.forEach(item => {
            try {
                if (item) {
                    const row = tbody.insertRow();
                    row.innerHTML = `
                        <td>${item.phone_number || ''}</td>
                        <td>${item.phone_type === 'enterprise_wechat' ? '企微' : '个微'}</td>
                        <td>¥${item.order_amount || 0}</td>
                        <td>${item.total_fans || 0}</td>
                        <td>${item.new_fans || 0}</td>
                        <td>${item.lost_fans || 0}</td>
                        <td>${item.record_date || ''}</td>
                    `;
                }
            } catch (error) {
                console.error('显示私域数据行出错:', error, item);
            }
        });
    } else {
        console.warn('私域数据不是数组格式:', data);
    }
}

// 显示私域客户
function displayPrivateCustomers(data) {
    const tbody = safelyGetElement('privateCustomersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // 确保data是数组
    if (Array.isArray(data)) {
        data.forEach(item => {
            try {
                if (item) {
                    const row = tbody.insertRow();
                    row.innerHTML = `
                        <td>${item.id || ''}</td>
                        <td>${item.name || ''}</td>
                        <td>${item.phone || ''}</td>
                        <td>${item.phone_number || ''}</td>
                        <td>${item.source || ''}</td>
                        <td>${item.type || ''}</td>
                        <td>${item.order_count || 0}</td>
                        <td>¥${item.total_spent || 0}</td>
                        <td>${formatDateTime(item.created_at) || ''}</td>
                        <td>
                            <button class="edit-btn" onclick="editPrivateCustomer(${item.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    `;
                }
            } catch (error) {
                console.error('显示私域客户行出错:', error, item);
            }
        });
    } else {
        console.warn('私域客户数据不是数组格式:', data);
    }
}

// 格式化日期时间函数
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    
    try {
        // 直接使用原始日期字符串创建Date对象
        // 注意：ISO格式的日期字符串会被解析为UTC时间
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return dateTimeStr; // 如果解析失败，返回原始字符串
        
        // 使用固定的中国时区格式化
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false, // 使用24小时制
            timeZone: 'Asia/Shanghai' // 明确指定使用中国时区
        };
        
        // 使用Intl.DateTimeFormat进行更精确的时区格式化
        const formatter = new Intl.DateTimeFormat('zh-CN', options);
        return formatter.format(date);
    } catch (error) {
        console.error('日期格式化错误:', error);
        return dateTimeStr; // 出错时返回原始字符串
    }
}

// 初始化私域数据表单同步
function initPrivateDataSync() {
    // 当客户姓名变化时，同步到私域客户姓名
    const customerName = document.getElementById('customerName');
    const privateName = document.getElementById('privateName');
    if (customerName && privateName) {
        customerName.addEventListener('input', function() {
            privateName.value = this.value;
        });
    }
    
    // 当客户电话变化时，同步到私域客户电话
    const customerPhone = document.getElementById('customerPhone');
    const privatePhone = document.getElementById('privatePhone');
    if (customerPhone && privatePhone) {
        customerPhone.addEventListener('input', function() {
            privatePhone.value = this.value;
        });
    }
    
    // 当客户备注变化时，同步到私域客户备注
    const remarks = document.getElementById('remarks');
    const privateRemark = document.getElementById('privateRemark');
    if (remarks && privateRemark) {
        remarks.addEventListener('input', function() {
            privateRemark.value = this.value;
        });
    }
}

// 搜索订单
async function searchOrders() {
    // 仅切换分区，不触发任何自动刷新（避免覆盖搜索结果）
    const section = document.getElementById('view-data');
    if (section && !section.classList.contains('active')) {
        try { showSection('view-data'); } catch (e) {}
    }

    const startDateInput = safelyGetElement('startDate');
    const endDateInput = safelyGetElement('endDate');
    const keyword = safelyGetElement('searchKeyword')?.value;
    
    // 获取输入的日期值
    let startDate = startDateInput?.value;
    let endDate = endDateInput?.value;
    
    try {
        console.log('开始搜索订单，关键词:', keyword);
        
        // 验证日期范围是否在15天内
        if (startDate && endDate) {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            const today = new Date();
            
            // 计算15天前的日期
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(today.getDate() - 15);
            
            // 如果开始日期早于15天前，显示错误并重置为15天前
            if (startDateObj < fifteenDaysAgo) {
                alert('客服只能查询最近15天的数据。如需查询更早的数据，请联系管理员申请。');
                
                // 重置为15天前
                const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0];
                startDateInput.value = fifteenDaysAgoStr;
                
                // 使用调整后的日期
                startDate = fifteenDaysAgoStr;
            }
        }
        
        let url = '/api/orders';
        const params = new URLSearchParams();
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (keyword) params.append('keyword', keyword);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log('搜索请求URL:', url);

        // 在请求期间给出加载中的占位
        try {
            let tbody = safelyGetElement('ordersTableBody');
            if (!tbody) {
                const table = document.getElementById('ordersTable');
                if (table) {
                    tbody = document.createElement('tbody');
                    tbody.id = 'ordersTableBody';
                    table.appendChild(tbody);
                }
            }
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">正在加载...</td></tr>`;
            }
        } catch (e) {}
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('搜索结果:', data);
            orders = safelyHandleResponse(data);
            console.log('处理后的订单数据:', orders);
            displayOrders();
            updateOrderSummary(); // 搜索后刷新统计
        } else {
            console.error('搜索请求失败:', response.status, response.statusText);
            const tbody = safelyGetElement('ordersTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red;">搜索请求失败</td></tr>`;
            }
            alert('搜索请求失败，请重试');
        }
    } catch (error) {
        console.error('搜索订单失败:', error);
        const tbody = safelyGetElement('ordersTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan= "9" style="text-align:center; color:red;">搜索出错: ${error.message}</td></tr>`;
        }
        alert('搜索出错: ' + error.message);
    }
}

// 搜索私域客户
async function searchPrivateCustomers() {
    try {
        console.log('开始搜索私域客户');
        
        // 获取搜索参数
        const keyword = safelyGetElement('privateSearchKeyword')?.value;
        const sourceFilter = safelyGetElement('privateSourceFilter')?.value;
        const phoneNumberFilter = safelyGetElement('privatePhoneNumberFilter')?.value;
        
        console.log('搜索参数:', { keyword, sourceFilter, phoneNumberFilter });
        
        // 构建查询URL
        let url = '/api/private-customers';
        const queryParams = [];
        
        if (keyword) {
            queryParams.push(`keyword=${encodeURIComponent(keyword)}`);
        }
        
        if (sourceFilter) {
            queryParams.push(`source=${encodeURIComponent(sourceFilter)}`);
        }
        
        if (phoneNumberFilter) {
            queryParams.push(`phone_number=${encodeURIComponent(phoneNumberFilter)}`);
        }
        
        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }
        
        console.log('搜索请求URL:', url);
        
        // 发送请求
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('私域客户搜索结果:', data);
            const privateCustomers = safelyHandleResponse(data);
            displayPrivateCustomers(privateCustomers);
            // 可选：如有私域统计，也可在此刷新
        } else {
            console.error('搜索私域客户失败:', response.status, response.statusText);
            alert('搜索私域客户失败，请重试');
        }
    } catch (error) {
        console.error('搜索私域客户出错:', error);
        alert('搜索出错: ' + error.message);
    }
}

// 导出订单Excel（仅限管理员使用）
async function exportOrders() {
    alert('导出Excel功能仅限管理员使用，请联系管理员导出数据。');
}

// 申请查询历史数据
function requestOlderData() {
    // 显示申请模态框
    const modal = document.getElementById('requestDataModal');
    if (modal) {
        modal.style.display = 'block';
        
        // 获取当前日期
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // 计算16天前的日期（超出15天限制的第一天）
        const sixteenDaysAgo = new Date();
        sixteenDaysAgo.setDate(today.getDate() - 16);
        const sixteenDaysAgoStr = sixteenDaysAgo.toISOString().split('T')[0];
        
        // 设置默认日期范围
        const requestStartDate = document.getElementById('requestStartDate');
        const requestEndDate = document.getElementById('requestEndDate');
        
        if (requestStartDate) requestStartDate.value = sixteenDaysAgoStr;
        if (requestEndDate) requestEndDate.value = sixteenDaysAgoStr;
        
        // 设置表单提交处理
        const requestForm = document.getElementById('requestDataForm');
        if (requestForm) {
            requestForm.onsubmit = function(e) {
                e.preventDefault();
                submitDataRequest();
            };
        }
    }
}

// 查看订单详情
function viewOrder(id) {
    if (!id) return;
    
    try {
        // 查找对应ID的订单
        const order = orders.find(o => o.id === id);
        if (order) {
            let detailsHtml = `
                <div class="order-details">
                    <h4>订单详情 (ID: ${order.id})</h4>
                    <div class="details-section">
                        <h5>收件人信息</h5>
                        <p><strong>姓名:</strong> ${order.customer_name || '无'}</p>
                        <p><strong>电话:</strong> ${order.phone || '无'}</p>
                        <p><strong>地址:</strong> ${(order.address || '') + ' ' + (order.detailed_address || '')}</p>
                    </div>
                    <div class="details-section">
                        <h5>商品信息</h5>
                        <p><strong>商品名称:</strong> ${order.product_name || '无'}</p>
                        <p><strong>数量:</strong> ${order.quantity || '0'}</p>
                        <p><strong>金额:</strong> ¥${order.amount || '0'}</p>
                        <p><strong>备注:</strong> ${order.remarks || '无'}</p>
                    </div>
                    <div class="details-section">
                        <h5>订单信息</h5>
                        <p><strong>创建时间:</strong> ${formatDateTime(order.order_date)}</p>
                        <p><strong>创建人:</strong> ${order.username || '未知'}</p>
                    </div>
                </div>
            `;
            
            // 显示弹窗
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" onclick="this.parentNode.parentNode.remove()">&times;</span>
                    ${detailsHtml}
                </div>
            `;
            document.body.appendChild(modal);
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal-content {
                    background-color: white;
                    padding: 20px;
                    border-radius: 8px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    position: relative;
                }
                .close-btn {
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    font-size: 24px;
                    cursor: pointer;
                }
                .order-details h4 {
                    margin-top: 0;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #eee;
                }
                .details-section {
                    margin-bottom: 15px;
                }
                .details-section h5 {
                    margin-bottom: 5px;
                    color: #4e73df;
                }
            `;
            document.head.appendChild(style);
        } else {
            alert('未找到该订单信息');
        }
    } catch (error) {
        console.error('查看订单详情出错:', error);
        alert('查看订单详情失败');
    }
}

// 提交历史数据查询申请
async function submitDataRequest() {
    const startDate = document.getElementById('requestStartDate').value;
    const endDate = document.getElementById('requestEndDate').value;
    const reason = document.getElementById('requestReason').value;
    const customerInfo = document.getElementById('requestCustomerInfo').value;
    
    if (!startDate || !endDate || !reason) {
        alert('请填写必填项！');
        return;
    }
    
    // 验证日期
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const today = new Date();
    
    // 计算15天前的日期
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(today.getDate() - 15);
    
    // 如果结束日期晚于今天，显示错误
    if (endDateObj > today) {
        alert('结束日期不能晚于今天！');
        return;
    }
    
    // 如果开始日期晚于结束日期，显示错误
    if (startDateObj > endDateObj) {
        alert('开始日期不能晚于结束日期！');
        return;
    }
    
    // 如果开始日期不早于15天前，显示错误
    if (startDateObj >= fifteenDaysAgo) {
        alert('开始日期必须早于15天前！您可以直接查询最近15天的数据，无需申请。');
        return;
    }
    
    try {
        // 获取当前用户信息
        const userInfo = await getCurrentUser();
        
        // 构建申请数据
        const requestData = {
            user_id: userInfo.id || '',
            username: userInfo.username || '',
            start_date: startDate,
            end_date: endDate,
            reason: reason,
            customer_info: customerInfo,
            request_date: new Date().toISOString(),
            status: 'pending' // 待审核
        };
        
        // 发送申请到服务器
        const response = await fetch('/api/data-access-requests', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            alert('申请已提交成功！管理员审核后将通知您。');
            closeModal('requestDataModal');
        } else {
            const error = await response.json();
            alert('申请提交失败: ' + (error.error || '未知错误'));
        }
    } catch (error) {
        console.error('提交申请时出错:', error);
        alert('申请提交失败: ' + error.message);
    }
}

// 获取当前用户信息
async function getCurrentUser() {
    try {
        const response = await fetch('/api/current-user', {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            return await response.json();
        }
        return {};
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return {};
    }
}
