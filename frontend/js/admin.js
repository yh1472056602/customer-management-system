// 管理员后台功能

// 格式化日期时间函数
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    
    try {
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return dateTimeStr; // 如果解析失败，返回原始字符串
        
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('日期格式化错误:', error);
        return dateTimeStr; // 出错时返回原始字符串
    }
}

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
    if (!checkPermission('admin')) {
        return;
    }
    
    loadOverview();
    loadUsers();
    loadAdminStatistics();
    loadPrivateStats();
    populateUserFilters();
    
    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    const statStart = document.getElementById('statStartDate');
    const statEnd = document.getElementById('statEndDate');
    if (statStart) statStart.value = today;
    if (statEnd) statEnd.value = today;
    const exportStart = document.getElementById('exportStartDate');
    const exportEnd = document.getElementById('exportEndDate');
    if (exportStart) exportStart.value = today;
    if (exportEnd) exportEnd.value = today;
    
    // 设置公告表单处理
    const announcementForm = document.getElementById('announcementForm');
    if (announcementForm) {
        announcementForm.addEventListener('submit', addAnnouncement);
    }

    // 兜底绑定导出按钮，防止内联 onclick 失效导致无响应
    try {
        const exportButtons = document.querySelectorAll('#export .export-btn');
        exportButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                exportData();
            });
        });
        // 同时给“直接下载”链接设置 href（用于手动右键另存为/新标签打开）
        const setDirectLink = () => {
            const startDate = document.getElementById('exportStartDate')?.value;
            const endDate = document.getElementById('exportEndDate')?.value;
            const exportSelect = document.getElementById('exportCustomerService');
            const selectedUserId = exportSelect && exportSelect.value ? exportSelect.value : '';
            const params = new URLSearchParams();
            if (startDate && endDate) { params.append('start_date', startDate); params.append('end_date', endDate); }
            if (selectedUserId) params.append('user_id', selectedUserId);
            try { const token = localStorage.getItem('token'); if (token) params.append('token', token); } catch(_){}
            const url = '/api/orders/export-excel' + (params.toString() ? ('?' + params.toString()) : '');
            const a = document.getElementById('exportDirectLink');
            if (a) a.href = url;
        };
        setDirectLink();
        const start = document.getElementById('exportStartDate');
        const end = document.getElementById('exportEndDate');
        const exportSelect = document.getElementById('exportCustomerService');
        if (start) start.addEventListener('change', setDirectLink);
        if (end) end.addEventListener('change', setDirectLink);
        if (exportSelect) exportSelect.addEventListener('change', setDirectLink);
    } catch (_) {}
});

// 生成统计（供admin.html按钮调用）
function generateStatistics() {
    // 直接复用加载逻辑
    loadAdminStatistics();
    loadPrivateStats();
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
    
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
}

// 加载总览数据
async function loadOverview() {
    try {
        // 加载用户数
        const usersResponse = await fetch('/api/users', {
            headers: getAuthHeaders()
        });
        
        // 加载客户数
        const customersResponse = await fetch('/api/customers', {
            headers: getAuthHeaders()
        });
        
        // 加载订单数
        const ordersResponse = await fetch('/api/orders', {
            headers: getAuthHeaders()
        });
        
        if (usersResponse.ok && customersResponse.ok && ordersResponse.ok) {
            const users = await usersResponse.json();
            const customers = await customersResponse.json();
            const orders = await ordersResponse.json();
            
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalCustomers').textContent = customers.length;
    document.getElementById('totalOrders').textContent = orders.length;
            
            const totalSales = orders.reduce((sum, order) => sum + order.amount, 0);
            document.getElementById('totalSales').textContent = `¥${totalSales.toFixed(2)}`;
            
            // 显示最近订单
            // 不再覆盖“显示最近订单”为带寄件人列的版本
            displayRecentOrders(orders.slice(0, 10));
        }
    } catch (error) {
        console.error('加载总览数据失败:', error);
    }
}

// 显示最近订单
function displayRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    orders.forEach(order => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.customer_name}</td>
            <td>${order.product_name}</td>
            <td>${order.quantity}</td>
            <td>¥${order.amount}</td>
            <td>${order.username}</td>
            <td>${formatDateTime(order.order_date)}</td>
        `;
    });
}

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        }
    } catch (error) {
        console.error('加载用户失败:', error);
    }
}

// 显示用户列表
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    users.forEach(user => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.role === 'admin' ? '管理员' : '客服'}</td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>
                <button onclick="resetPassword(${user.id})" class="reset-btn" title="重置密码"><i class="fas fa-key"></i></button>
                <button onclick="deleteUser(${user.id})" class="delete-btn" title="删除用户"><i class="fas fa-trash"></i></button>
            </td>
        `;
    });
}

// 重置用户密码
async function resetPassword(userId) {
    const newPassword = prompt('请输入新密码（至少6位）：');
    
    if (!newPassword) {
        return;
    }
    
    if (newPassword.length < 6) {
        alert('密码长度至少6位');
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}/reset-password`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ new_password: newPassword })
        });
        
        if (response.ok) {
            alert('密码重置成功');
        } else {
            const error = await response.json();
            alert('重置失败: ' + error.error);
        }
    } catch (error) {
        alert('重置失败: ' + error.message);
    }
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除这个用户吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            alert('用户删除成功');
            loadUsers();
        } else {
            const error = await response.json();
            alert('删除失败: ' + error.error);
        }
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

// 加载管理员统计数据
async function loadAdminStatistics() {
    try {
        const startDateEl = document.getElementById('statStartDate');
        const endDateEl = document.getElementById('statEndDate');
        const userSelect = document.getElementById('statUserSelect');
        const startDate = startDateEl ? startDateEl.value : '';
        const endDate = endDateEl ? endDateEl.value : '';
        
        // 管理员端优先请求“按客服+手机编号”统计接口，若失败再降级
        let url = '/api/statistics/by-user-phone';
        if (startDate && endDate) {
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }
        if (userSelect && userSelect.value) {
            url += (url.includes('?') ? '&' : '?') + `user_id=${encodeURIComponent(userSelect.value)}`;
        }
        console.log('[Admin] 加载统计 URL:', url);
        try {
            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) {
                const stats = await response.json();
                console.log('[Admin] 统计响应(by-user-phone):', stats);
                displayAdminStatistics(stats);
                return;
            }
            throw new Error('fallback to /api/statistics');
        } catch (_) {
            // 兼容旧接口
            let fallback = '/api/statistics';
            if (startDate && endDate) fallback += `?start_date=${startDate}&end_date=${endDate}`;
            if (userSelect && userSelect.value) fallback += (fallback.includes('?') ? '&' : '?') + `user_id=${encodeURIComponent(userSelect.value)}`;
            const res2 = await fetch(fallback, { headers: getAuthHeaders() });
            if (res2.ok) {
                const stats = await res2.json();
                console.log('[Admin] 统计响应(legacy):', stats);
                displayAdminStatistics(stats);
            }
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 显示管理员统计数据
function displayAdminStatistics(stats) {
    // 目标表格是“客服业绩”表
    const tbody = document.getElementById('performanceTableBody');
    if (!tbody) return;

    // 如果后端返回了“按客服+手机编号”结构，直接以该结构渲染；
    // 否则维持原按客服聚合的兼容渲染。
    const looksLikeUserPhone = Array.isArray(stats) && stats.length && 'phone_number' in (stats[0] || {});

    const totalOrders = stats.reduce((sum, s) => sum + (parseInt(s.total_orders) || 0), 0);
    const totalAmount = stats.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);

    // 计算天数
    const startEl = document.getElementById('statStartDate');
    const endEl = document.getElementById('statEndDate');
    let daysInRange = 0;
    if (startEl && endEl && startEl.value && endEl.value) {
        const start = new Date(startEl.value);
        const end = new Date(endEl.value);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
            daysInRange = Math.floor((end - start) / (24 * 3600 * 1000)) + 1;
        }
    }
    if (!daysInRange) {
        const uniqueDates = new Set(stats.map(s => s.order_date).filter(Boolean));
        daysInRange = uniqueDates.size || 1;
    }

    const avgDailyOrders = daysInRange ? (totalOrders / daysInRange) : 0;
    const avgOrderValue = totalOrders ? (totalAmount / totalOrders) : 0;

    // 更新统计卡片
    const periodOrdersEl = document.getElementById('periodOrders');
    if (periodOrdersEl) periodOrdersEl.textContent = totalOrders;
    const periodSalesEl = document.getElementById('periodSales');
    if (periodSalesEl) periodSalesEl.textContent = `¥${totalAmount.toFixed(2)}`;
    const avgDailyOrdersEl = document.getElementById('avgDailyOrders');
    if (avgDailyOrdersEl) avgDailyOrdersEl.textContent = Math.round(avgDailyOrders * 100) / 100;
    const avgOrderValueEl = document.getElementById('avgOrderValue');
    if (avgOrderValueEl) avgOrderValueEl.textContent = `¥${avgOrderValue.toFixed(2)}`;

    tbody.innerHTML = '';

    if (looksLikeUserPhone) {
        // 以“客服 + 手机编号”维度逐行展示（手机编号为独立列）
        stats.forEach(s => {
            const orders = parseInt(s.total_orders) || 0;
            const amount = parseFloat(s.total_amount) || 0;
            const aov = orders ? amount / orders : 0;
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${s.username || '未知'}</td>
                <td>${s.phone_number || '未分配'}</td>
                <td>${orders}</td>
                <td>¥${amount.toFixed(2)}</td>
                <td>${s.unique_customers ?? '-'}</td>
                <td>¥${aov.toFixed(2)}</td>
            `;
        });
    } else {
        // 旧行为：按客服聚合
        const byUser = {};
        stats.forEach(s => {
            const username = s.username || '未知';
            if (!byUser[username]) byUser[username] = { orders: 0, amount: 0 };
            byUser[username].orders += parseInt(s.total_orders) || 0;
            byUser[username].amount += parseFloat(s.total_amount) || 0;
        });
        Object.entries(byUser).forEach(([username, v]) => {
            const aov = v.orders ? v.amount / v.orders : 0;
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${username}</td>
                <td>-</td>
                <td>${v.orders}</td>
                <td>¥${v.amount.toFixed(2)}</td>
                <td>-</td>
                <td>¥${aov.toFixed(2)}</td>
            `;
        });
    }
}

// 加载私域统计数据
async function loadPrivateStats() {
    try {
        const startEl = document.getElementById('privateStatsStartDate');
        const endEl = document.getElementById('privateStatsEndDate');
        const userSelect = document.getElementById('privateUserSelect');
        const startDate = startEl ? startEl.value : '';
        const endDate = endEl ? endEl.value : '';
        
        let url = '/api/private-domain';
        if (startDate && endDate) {
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }
        if (userSelect && userSelect.value) {
            url += (url.includes('?') ? '&' : '?') + `user_id=${encodeURIComponent(userSelect.value)}`;
        }
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            displayPrivateStats(data);
        }
    } catch (error) {
        console.error('加载私域统计失败:', error);
    }
}

// 填充“客服筛选”下拉框（管理员）
async function populateUserFilters() {
    try {
        const res = await fetch('/api/users', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const users = await res.json();
        const userOptions = users.filter(u => u.role === 'customer_service');
        const statSelect = document.getElementById('statUserSelect');
        const privateSelect = document.getElementById('privateUserSelect');
        const exportSelect = document.getElementById('exportCustomerService');
        if (statSelect) {
            statSelect.innerHTML = '<option value="">全部客服</option>' + userOptions.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
            statSelect.onchange = () => loadAdminStatistics();
        }
        if (privateSelect) {
            privateSelect.innerHTML = '<option value="">全部客服</option>' + userOptions.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
            privateSelect.onchange = () => loadPrivateStats();
        }

        if (exportSelect) {
            exportSelect.innerHTML = '<option value="">全部客服</option>' + userOptions.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
            exportSelect.onchange = () => refreshExportPreview();
        }
    } catch (e) {
        console.error('加载用户列表失败:', e);
    }
}

// 导出页：根据选择的客服与日期刷新订单预览与手机编号列表
async function refreshExportPreview() {
    try {
        const startDate = document.getElementById('exportStartDate')?.value;
        const endDate = document.getElementById('exportEndDate')?.value;
        const exportSelect = document.getElementById('exportCustomerService');
        const selectedUserId = exportSelect && exportSelect.value ? exportSelect.value : '';

        // 刷新订单预览
        let ordersUrl = '/api/orders';
        const params = new URLSearchParams();
        if (startDate && endDate) {
            params.append('start_date', startDate);
            params.append('end_date', endDate);
        }
        if (selectedUserId) {
            params.append('user_id', selectedUserId);
        }
        const query = params.toString();
        if (query) ordersUrl += `?${query}`;

        const ordersRes = await fetch(ordersUrl, { headers: getAuthHeaders() });
        const orders = ordersRes.ok ? await ordersRes.json() : [];
        renderExportOrdersPreview(orders);

        // 刷新该客服手机编号列表
        let phonesUrl = '/api/phone-numbers';
        const phoneParams = new URLSearchParams();
        if (selectedUserId) phoneParams.append('user_id', selectedUserId);
        const phoneQuery = phoneParams.toString();
        if (phoneQuery) phonesUrl += `?${phoneQuery}`;
        const phonesRes = await fetch(phonesUrl, { headers: getAuthHeaders() });
        const phones = phonesRes.ok ? await phonesRes.json() : [];
        renderExportPhoneNumbers(phones);
    } catch (e) {
        console.error('刷新导出预览失败:', e);
    }
}

function renderExportOrdersPreview(orders) {
    // 若页面不存在容器则创建
    let container = document.getElementById('exportOrdersPreview');
    if (!container) {
        container = document.createElement('div');
        container.id = 'exportOrdersPreview';
        container.className = 'data-table';
        container.innerHTML = `
            <h4><i class="fas fa-list"></i> 订单预览</h4>
            <table>
                <thead>
                    <tr>
                        <th>订单ID</th>
                        <th>收件人</th>
                        <th>电话</th>
                        <th>地址</th>
                        <th>商品</th>
                        <th>数量</th>
                        <th>创建时间</th>
                    </tr>
                </thead>
                <tbody id="exportOrdersPreviewBody"></tbody>
            </table>
        `;
        const exportSection = document.getElementById('export');
        exportSection && exportSection.appendChild(container);
    }
    const tbody = document.getElementById('exportOrdersPreviewBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (orders || []).slice(0, 100).forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${o.id || ''}</td>
            <td>${o.customer_name || ''}</td>
            <td>${o.phone || ''}</td>
            <td>${(o.address || '') + ' ' + (o.detailed_address || '')}</td>
            <td>${o.product_name || ''}</td>
            <td>${o.quantity || 0}</td>
            <td>${formatDateTime(o.order_date) || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderExportPhoneNumbers(phones) {
    let container = document.getElementById('exportPhoneNumbers');
    if (!container) {
        container = document.createElement('div');
        container.id = 'exportPhoneNumbers';
        container.className = 'data-table';
        container.innerHTML = `
            <h4><i class="fas fa-phone"></i> 该客服手机编号</h4>
            <table>
                <thead>
                    <tr>
                        <th>手机编号</th>
                    </tr>
                </thead>
                <tbody id="exportPhoneNumbersBody"></tbody>
            </table>
        `;
        const exportSection = document.getElementById('export');
        exportSection && exportSection.appendChild(container);
    }
    const tbody = document.getElementById('exportPhoneNumbersBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (phones || []).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.phone_number || ''}</td>`;
        tbody.appendChild(tr);
    });
}

// 监听导出页日期变化，联动刷新预览
document.addEventListener('DOMContentLoaded', function() {
    const start = document.getElementById('exportStartDate');
    const end = document.getElementById('exportEndDate');
    if (start) start.onchange = refreshExportPreview;
    if (end) end.onchange = refreshExportPreview;
});

// 覆盖导出按钮逻辑（Excel模板），携带 user_id 与日期
async function exportData() {
    const startDate = document.getElementById('exportStartDate')?.value;
    const endDate = document.getElementById('exportEndDate')?.value;
    const exportSelect = document.getElementById('exportCustomerService');
    const selectedUserId = exportSelect && exportSelect.value ? exportSelect.value : '';
    if (!startDate || !endDate) {
        alert('请选择导出日期范围');
        return;
    }
    // 显示导出中的进度提示
    let exportBtn = null;
    try {
        exportBtn = document.querySelector('#export .export-btn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.dataset.originalText = exportBtn.innerHTML;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在导出...';
        }
    } catch (e) {}
    let url = '/api/orders/export-excel';
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    if (selectedUserId) params.append('user_id', selectedUserId);
    // 兼容某些浏览器阻止带鉴权头的下载：将 token 追加到查询参数
    try {
        const token = localStorage.getItem('token');
        if (token) params.append('token', token);
    } catch (e) {}
    const query = params.toString();
    if (query) url += `?${query}`;

    try {
        // 改为新标签页下载（最不易被拦截的方式），并带上 token 查询参数
        console.log('[Export] open url:', url);
        const win = window.open(url, '_blank');
        if (!win) {
            // 若被拦截，则退化为隐藏超链接点击
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 2000);
        }
    } finally {
        // 恢复按钮
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = exportBtn.dataset.originalText || '<i class="fas fa-file-export"></i> 导出订单数据';
        }
    }
}

// 显示私域统计数据
function displayPrivateStats(data) {
    const tbody = document.getElementById('privateStatsBody');
    if (!tbody) return;
    
    const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.order_amount) || 0), 0);
    const totalFans = data.reduce((sum, item) => sum + (parseInt(item.total_fans) || 0), 0);
    
    document.getElementById('totalPrivateAmount').textContent = `¥${totalAmount.toFixed(2)}`;
    document.getElementById('totalPrivateFans').textContent = totalFans;
    
    tbody.innerHTML = '';
    data.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${item.username}</td>
            <td>${item.phone_number}</td>
            <td>${item.phone_type === 'enterprise_wechat' ? '企微' : '个微'}</td>
            <td>¥${item.order_amount}</td>
            <td>${item.total_fans}</td>
            <td>${item.new_fans}</td>
            <td>${item.lost_fans}</td>
            <td>${item.record_date}</td>
        `;
    });
}

// 显示添加公告弹窗
function showAddAnnouncement() {
    document.getElementById('announcementModal').style.display = 'block';
}

// 关闭弹窗
function closeModal() {
    document.getElementById('announcementModal').style.display = 'none';
}

// 添加公告
async function addAnnouncement(e) {
    e.preventDefault();
    
    const announcementData = {
        title: document.getElementById('announcementTitle').value,
        content: document.getElementById('announcementContent').value
    };
    
    try {
        const response = await fetch('/api/announcements', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(announcementData)
        });
        
        if (response.ok) {
            alert('公告发布成功！');
            document.getElementById('announcementForm').reset();
            closeModal();
            loadAnnouncements();
        } else {
            const error = await response.json();
            alert('发布失败: ' + error.error);
        }
    } catch (error) {
        alert('发布失败: ' + error.message);
    }
}

// 已移除：旧CSV导出函数，统一走Excel模板导出

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('announcementModal');
    if (event.target === modal) {
        closeModal();
    }
}
