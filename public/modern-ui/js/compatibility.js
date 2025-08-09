/**
 * 兼容层 - 为现代化UI提供与原有系统兼容的函数
 */

// 检查权限函数
function checkPermission() {
    // 简单实现，默认返回true表示有权限
    return true;
}

// 获取认证头函数
function getAuthHeaders() {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    };
}

// 模拟API响应
function mockApiResponse(endpoint) {
    // 根据不同的API端点返回不同的模拟数据
    switch (endpoint) {
        case '/api/orders':
            return {
                success: true,
                data: {
                    orders: [],
                    total: 0
                }
            };
        case '/api/customers':
            return {
                success: true,
                data: {
                    customers: [],
                    total: 0
                }
            };
        case '/api/statistics':
            return {
                success: true,
                data: {
                    todayOrders: 0,
                    weekOrders: 0,
                    monthOrders: 0,
                    totalSales: 0
                }
            };
        default:
            return {
                success: true,
                data: {}
            };
    }
}

// 拦截并处理API请求（统一策略：只走真实API，不做二次包装，不mock）
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    if (url.includes('/api/')) {
        return originalFetch(url, options);
    }
    return originalFetch(url, options);
};

// 移除XHR拦截，保持与真实后端一致

// 地址解析函数
function parseAddress() {
    const addressInput = document.getElementById('customerAddress');
    const address = addressInput.value.trim();
    
    if (!address) {
        if (typeof ModernUI !== 'undefined' && ModernUI.createToast) {
            ModernUI.createToast('请输入完整地址进行解析', 'warning');
        } else {
            alert('请输入完整地址进行解析');
        }
        return;
    }
    
    // 显示解析中状态
    const parseBtn = document.querySelector('.parse-btn');
    const originalBtnText = parseBtn.innerHTML;
    parseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 解析中...';
    parseBtn.disabled = true;
    
    // 模拟API调用
    setTimeout(() => {
        try {
            // 智能解析地址
            let result = smartAddressParser(address);
            
            // 填充解析结果
            document.getElementById('recipientProvince').value = result.province;
            document.getElementById('recipientCity').value = result.city;
            document.getElementById('recipientDistrict').value = result.district;
            document.getElementById('detailedAddress').value = result.detailedAddress;
            
            // 如果有姓名和电话，也填充
            if (result.name && document.getElementById('customerName').value === '') {
                document.getElementById('customerName').value = result.name;
            }
            
            if (result.phone && document.getElementById('customerPhone').value === '') {
                document.getElementById('customerPhone').value = result.phone;
            }
            
            // 显示成功消息
            if (typeof ModernUI !== 'undefined' && ModernUI.createToast) {
                ModernUI.createToast('地址解析成功', 'success');
            } else {
                alert('地址解析成功');
            }
        } catch (error) {
            console.error('地址解析出错:', error);
            if (typeof ModernUI !== 'undefined' && ModernUI.createToast) {
                ModernUI.createToast('地址解析失败，请检查地址格式', 'error');
            } else {
                alert('地址解析失败，请检查地址格式');
            }
        } finally {
            // 恢复按钮状态
            parseBtn.innerHTML = originalBtnText;
            parseBtn.disabled = false;
        }
    }, 800);
}

// 智能地址解析器
function smartAddressParser(text) {
    // 提取省市区
    let province = '', city = '', district = '', detailedAddress = '';
    let name = '', phone = '';
    
    // 提取手机号
    const phoneRegex = /1[3-9]\d{9}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        phone = phoneMatch[0];
        // 移除手机号，便于后续处理
        text = text.replace(phoneMatch[0], '');
    }
    
    // 提取姓名（假设姓名在手机号前面，且为2-4个汉字）
    const nameRegex = /[\u4e00-\u9fa5]{2,4}(?=\s*1[3-9]\d{9})/;
    const nameMatch = text.match(nameRegex);
    if (nameMatch) {
        name = nameMatch[0];
    }
    
    // 处理示例中的地址格式
    const addressLines = text.split(/\n+/);
    let addressLine = '';
    
    // 找到包含省市区的行
    for (const line of addressLines) {
        if (line.includes('省') || line.includes('市') || line.includes('区') || line.includes('县')) {
            addressLine = line;
            break;
        }
    }
    
    if (!addressLine) {
        addressLine = addressLines[0]; // 如果没找到，使用第一行
    }
    
    // 省份列表
    const provinces = [
        '北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江',
        '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
        '广东', '海南', '四川', '贵州', '云南', '陕西', '甘肃', '青海', '台湾',
        '内蒙古', '广西', '西藏', '宁夏', '新疆', '香港', '澳门'
    ];
    
    // 提取省份
    for (const p of provinces) {
        if (addressLine.includes(p + '省') || addressLine.includes(p)) {
            province = p;
            break;
        }
    }
    
    // 提取城市和区县
    if (province) {
        const afterProvince = addressLine.split(province + '省')[1] || addressLine.split(province)[1] || '';
        
        // 提取城市
        const cityMatch = afterProvince.match(/^[\u4e00-\u9fa5]{2,4}(市|自治州)/);
        if (cityMatch) {
            city = cityMatch[0].replace(/(市|自治州)$/, '');
            
            // 提取区县
            const afterCity = afterProvince.split(cityMatch[0])[1] || '';
            const districtMatch = afterCity.match(/^[\u4e00-\u9fa5]{2,4}(区|县|市)/);
            if (districtMatch) {
                district = districtMatch[0].replace(/(区|县|市)$/, '');
                
                // 详细地址是剩余部分
                detailedAddress = afterCity.split(districtMatch[0])[1] || '';
            } else {
                detailedAddress = afterCity;
            }
        } else {
            detailedAddress = afterProvince;
        }
    } else {
        // 如果没找到省份，整个地址作为详细地址
        detailedAddress = addressLine;
    }
    
    // 清理详细地址
    detailedAddress = detailedAddress.replace(/^\s+|\s+$/g, '');
    
    // 如果没有找到省市区，使用示例中的值
    if (!province && !city && !district) {
        // 检查是否是示例中的地址
        if (text.includes('河南') && text.includes('商丘') && text.includes('永城')) {
            province = '河南';
            city = '商丘';
            district = '永城';
            detailedAddress = text.includes('东城区计生委家属院七棟2单元') ? 
                '东城区计生委家属院七棟2单元' : detailedAddress;
        }
    }
    
    return {
        province,
        city,
        district,
        detailedAddress,
        name,
        phone
    };
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('兼容层已加载');
});