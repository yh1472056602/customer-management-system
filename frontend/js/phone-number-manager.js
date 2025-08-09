/**
 * 手机编号管理器
 * 用于管理和显示已使用过的手机编号
 */

// 存储已使用过的手机编号
let usedPhoneNumbers = [];

// 从localStorage加载已使用过的手机编号
function loadUsedPhoneNumbers() {
    try {
        const stored = localStorage.getItem('usedPhoneNumbers');
        if (stored) {
            usedPhoneNumbers = JSON.parse(stored);
        }
    } catch (error) {
        console.error('加载已使用手机编号失败:', error);
        usedPhoneNumbers = [];
    }
}

// 保存已使用过的手机编号到localStorage
function saveUsedPhoneNumbers() {
    try {
        localStorage.setItem('usedPhoneNumbers', JSON.stringify(usedPhoneNumbers));
    } catch (error) {
        console.error('保存已使用手机编号失败:', error);
    }
}

// 添加新的手机编号
function addPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.trim() === '') return;
    
    // 如果不在列表中，则添加
    if (!usedPhoneNumbers.includes(phoneNumber)) {
        usedPhoneNumbers.push(phoneNumber);
        saveUsedPhoneNumbers();
    }
}

// 创建手机编号建议列表
function createPhoneNumberSuggestions() {
    loadUsedPhoneNumbers();
    
    // 获取所有手机编号输入框
    const phoneNumberInputs = document.querySelectorAll('#privatePhoneNumber');
    const phoneNumberFilters = document.querySelectorAll('#privatePhoneNumberFilter');
    
    // 为每个输入框添加数据列表
    phoneNumberInputs.forEach(input => {
        // 创建一个唯一的数据列表ID
        const datalistId = 'phoneNumberList' + Math.random().toString(36).substr(2, 9);
        
        // 创建数据列表元素
        const datalist = document.createElement('datalist');
        datalist.id = datalistId;
        
        // 添加选项
        usedPhoneNumbers.forEach(number => {
            const option = document.createElement('option');
            option.value = number;
            datalist.appendChild(option);
        });
        
        // 将数据列表添加到文档中
        document.body.appendChild(datalist);
        
        // 将输入框与数据列表关联
        input.setAttribute('list', datalistId);
        
        // 当输入框失去焦点时，检查是否需要添加新的手机编号
        input.addEventListener('blur', function() {
            if (this.value) {
                addPhoneNumber(this.value);
                updateAllDataLists();
            }
        });
    });
    
    // 为筛选框添加数据列表
    phoneNumberFilters.forEach(input => {
        // 创建一个唯一的数据列表ID
        const datalistId = 'phoneNumberFilterList' + Math.random().toString(36).substr(2, 9);
        
        // 创建数据列表元素
        const datalist = document.createElement('datalist');
        datalist.id = datalistId;
        
        // 添加选项
        usedPhoneNumbers.forEach(number => {
            const option = document.createElement('option');
            option.value = number;
            datalist.appendChild(option);
        });
        
        // 将数据列表添加到文档中
        document.body.appendChild(datalist);
        
        // 将输入框与数据列表关联
        input.setAttribute('list', datalistId);
    });
}

// 更新所有数据列表
function updateAllDataLists() {
    // 获取所有数据列表
    const datalists = document.querySelectorAll('datalist');
    
    // 清空所有数据列表
    datalists.forEach(datalist => {
        datalist.innerHTML = '';
        
        // 添加选项
        usedPhoneNumbers.forEach(number => {
            const option = document.createElement('option');
            option.value = number;
            datalist.appendChild(option);
        });
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    createPhoneNumberSuggestions();
    
    // 从后端加载所有已使用的手机编号
    loadPhoneNumbersFromBackend();
});

// 从后端加载所有已使用的手机编号
async function loadPhoneNumbersFromBackend() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        
        const response = await fetch('/api/phone-numbers', {
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data)) {
                // 合并已有的手机编号
                data.forEach(item => {
                    if (item.phone_number && !usedPhoneNumbers.includes(item.phone_number)) {
                        usedPhoneNumbers.push(item.phone_number);
                    }
                });
                
                // 保存并更新
                saveUsedPhoneNumbers();
                updateAllDataLists();
            }
        }
    } catch (error) {
        console.error('从后端加载手机编号失败:', error);
    }
}

// 导出函数
window.phoneNumberManager = {
    addPhoneNumber,
    loadUsedPhoneNumbers,
    createPhoneNumberSuggestions,
    updateAllDataLists
};



