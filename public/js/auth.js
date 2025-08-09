// 认证相关功能

// 检查登录状态
function checkAuth() {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop();
    
    // 如果没有token且不在登录页，则重定向到登录页
    if (!token && currentPage !== 'index.html' && currentPage !== '') {
        window.location.href = 'index.html';
        return;
    }
    
    if (token) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            // 根据角色跳转到对应页面
            if (currentPage === 'index.html' || currentPage === '') {
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'customer-service.html';
                }
            }
        }
    }
}

// 登录功能
async function login(username, password, role) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // 根据角色跳转
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'customer-service.html';
            }
        } else {
            throw new Error(data.error || '登录失败');
        }
    } catch (error) {
        alert('登录失败: ' + error.message);
    }
}

// 注册功能
async function register(username, password, role) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            alert('注册成功！请登录');
            showLogin();
        } else {
            throw new Error(data.error || '注册失败');
        }
    } catch (error) {
        alert('注册失败: ' + error.message);
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// 获取认证头
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// 检查用户权限
function checkPermission(requiredRole) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        logout();
        return false;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        alert('权限不足');
        return false;
    }
    
    return true;
}

// 页面加载时检查认证状态
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // 登录表单处理
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            
            if (!username || !password || !role) {
                alert('请填写完整信息');
                return;
            }
            
            login(username, password, role);
        });
    }
    
    // 注册表单处理
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            const role = document.getElementById('regRole').value;
            
            if (!username || !password || !role) {
                alert('请填写完整信息');
                return;
            }
            
            if (password.length < 6) {
                alert('密码长度至少6位');
                return;
            }
            
            register(username, password, role);
        });
    }
});

// 显示注册表单
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// 显示登录表单
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}
