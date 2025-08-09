/**
 * 现代化UI组件 - 尔升网络客户管理系统
 */

// 移动端菜单切换
function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  navLinks.classList.toggle('show');
}

// 创建移动端菜单按钮
function createMobileMenuButton() {
  const navContainer = document.querySelector('.nav-container');
  if (!navContainer) return;
  
  const mobileMenuBtn = document.createElement('button');
  mobileMenuBtn.className = 'mobile-menu-btn';
  mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
  mobileMenuBtn.addEventListener('click', toggleMobileMenu);
  
  // 只在移动视图添加按钮
  if (window.innerWidth <= 768 && !document.querySelector('.mobile-menu-btn')) {
    navContainer.appendChild(mobileMenuBtn);
  }
}

// 响应式处理
function handleResponsive() {
  createMobileMenuButton();
  
  // 窗口大小变化时重新检查
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      createMobileMenuButton();
    } else {
      const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
      if (mobileMenuBtn) {
        mobileMenuBtn.remove();
      }
      
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        navLinks.classList.remove('show');
      }
    }
  });
}

// 创建加载指示器
function createLoader(container, size = 'normal') {
  const loader = document.createElement('div');
  loader.className = 'loading-container';
  
  const spinnerSize = size === 'small' ? '20px' : size === 'large' ? '40px' : '30px';
  
  loader.innerHTML = `
    <div class="spinner" style="width: ${spinnerSize}; height: ${spinnerSize}"></div>
    <p class="loading-text">加载中...</p>
  `;
  
  container.appendChild(loader);
  return loader;
}

// 移除加载指示器
function removeLoader(loader) {
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
}

// 创建提示框
function createToast(message, type = 'info', duration = 3000) {
  // 移除现有的提示框
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    toast.remove();
  });
  
  // 创建新的提示框
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // 设置图标
  let icon = '';
  switch (type) {
    case 'success':
      icon = '<i class="fas fa-check-circle"></i>';
      break;
    case 'error':
      icon = '<i class="fas fa-exclamation-circle"></i>';
      break;
    case 'warning':
      icon = '<i class="fas fa-exclamation-triangle"></i>';
      break;
    default:
      icon = '<i class="fas fa-info-circle"></i>';
  }
  
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // 显示提示框
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // 设置定时器自动关闭
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
  
  return toast;
}

// 创建确认对话框
function createConfirmDialog(title, message, confirmCallback, cancelCallback) {
  // 创建对话框元素
  const dialog = document.createElement('div');
  dialog.className = 'modal confirm-dialog';
  dialog.style.display = 'block';
  
  dialog.innerHTML = `
    <div class="modal-content">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="dialog-buttons">
        <button class="btn-cancel">取消</button>
        <button class="btn-confirm">确认</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // 添加事件监听
  const confirmBtn = dialog.querySelector('.btn-confirm');
  const cancelBtn = dialog.querySelector('.btn-cancel');
  
  confirmBtn.addEventListener('click', () => {
    if (typeof confirmCallback === 'function') {
      confirmCallback();
    }
    closeDialog();
  });
  
  cancelBtn.addEventListener('click', () => {
    if (typeof cancelCallback === 'function') {
      cancelCallback();
    }
    closeDialog();
  });
  
  // 关闭对话框
  function closeDialog() {
    dialog.classList.add('fade-out');
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, 300);
  }
  
  return dialog;
}

// 创建标签页
function createTabs(container, tabsConfig) {
  // 创建标签页头部
  const tabsHeader = document.createElement('div');
  tabsHeader.className = 'tabs-header';
  
  // 创建标签页内容容器
  const tabsContent = document.createElement('div');
  tabsContent.className = 'tabs-content';
  
  // 添加标签和内容
  tabsConfig.forEach((tab, index) => {
    // 创建标签按钮
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.innerHTML = `<i class="${tab.icon}"></i> ${tab.title}`;
    if (index === 0) {
      tabButton.classList.add('active');
    }
    
    // 创建内容面板
    const tabPanel = document.createElement('div');
    tabPanel.className = 'tab-panel';
    tabPanel.innerHTML = tab.content;
    if (index === 0) {
      tabPanel.classList.add('active');
    }
    
    // 点击事件
    tabButton.addEventListener('click', () => {
      // 移除所有活动状态
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      
      // 设置当前活动状态
      tabButton.classList.add('active');
      tabPanel.classList.add('active');
    });
    
    // 添加到容器
    tabsHeader.appendChild(tabButton);
    tabsContent.appendChild(tabPanel);
  });
  
  // 添加到主容器
  container.appendChild(tabsHeader);
  container.appendChild(tabsContent);
}

// 创建数据卡片
function createDataCard(container, config) {
  const card = document.createElement('div');
  card.className = 'data-card';
  
  card.innerHTML = `
    <div class="card-icon">
      <i class="${config.icon}"></i>
    </div>
    <div class="card-content">
      <h4>${config.title}</h4>
      <p class="card-value">${config.value}</p>
      ${config.change ? `<p class="card-change ${config.change > 0 ? 'positive' : 'negative'}">
        <i class="fas fa-${config.change > 0 ? 'arrow-up' : 'arrow-down'}"></i>
        ${Math.abs(config.change)}%
      </p>` : ''}
    </div>
  `;
  
  container.appendChild(card);
  return card;
}

// 创建进度条
function createProgressBar(container, percentage, label = '', color = '') {
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  
  // 设置颜色
  let colorClass = '';
  if (color) {
    colorClass = `progress-${color}`;
  } else {
    if (percentage < 30) {
      colorClass = 'progress-danger';
    } else if (percentage < 70) {
      colorClass = 'progress-warning';
    } else {
      colorClass = 'progress-success';
    }
  }
  
  progressBar.innerHTML = `
    <div class="progress-label">${label}</div>
    <div class="progress-container">
      <div class="progress-fill ${colorClass}" style="width: ${percentage}%"></div>
    </div>
    <div class="progress-percentage">${percentage}%</div>
  `;
  
  container.appendChild(progressBar);
  return progressBar;
}

// 创建徽章
function createBadge(text, type = 'primary') {
  const badge = document.createElement('span');
  badge.className = `badge badge-${type}`;
  badge.textContent = text;
  return badge;
}

// 创建头像
function createAvatar(name, size = 'medium', imageUrl = null) {
  const avatar = document.createElement('div');
  avatar.className = `avatar avatar-${size}`;
  
  if (imageUrl) {
    avatar.innerHTML = `<img src="${imageUrl}" alt="${name}">`;
  } else {
    // 使用名称首字母
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
    avatar.innerHTML = initials;
    
    // 根据名称生成一致的颜色
    const hue = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
    avatar.style.backgroundColor = `hsl(${hue}, 70%, 60%)`;
  }
  
  return avatar;
}

// 创建空状态
function createEmptyState(container, message, icon = 'fa-folder-open') {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  
  emptyState.innerHTML = `
    <div class="empty-icon">
      <i class="fas ${icon}"></i>
    </div>
    <p>${message}</p>
  `;
  
  container.appendChild(emptyState);
  return emptyState;
}

// 初始化组件
function initComponents() {
  handleResponsive();
  
  // 添加CSS
  if (!document.getElementById('modern-components-css')) {
    const style = document.createElement('style');
    style.id = 'modern-components-css';
    style.textContent = `
      /* 提示框样式 */
      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 250px;
        max-width: 350px;
        background-color: white;
        box-shadow: var(--shadow-lg);
        border-radius: var(--border-radius);
        padding: 16px;
        z-index: 1000;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
      }
      
      .toast.show {
        transform: translateX(0);
        opacity: 1;
      }
      
      .toast-content {
        display: flex;
        align-items: center;
      }
      
      .toast-icon {
        margin-right: 12px;
        font-size: 20px;
      }
      
      .toast-success .toast-icon {
        color: var(--success-color);
      }
      
      .toast-error .toast-icon {
        color: var(--danger-color);
      }
      
      .toast-warning .toast-icon {
        color: var(--warning-color);
      }
      
      .toast-info .toast-icon {
        color: var(--info-color);
      }
      
      /* 加载动画 */
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .spinner {
        border: 3px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top: 3px solid var(--primary-color);
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .loading-text {
        margin-top: 10px;
        color: var(--gray-600);
        font-size: 14px;
      }
      
      /* 确认对话框 */
      .confirm-dialog .modal-content {
        max-width: 400px;
      }
      
      .confirm-dialog h3 {
        margin-bottom: 16px;
        color: var(--gray-900);
      }
      
      .confirm-dialog p {
        margin-bottom: 24px;
        color: var(--gray-700);
      }
      
      .dialog-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      
      .btn-cancel {
        background-color: var(--gray-200);
        color: var(--gray-700);
        border: none;
        padding: 8px 16px;
        border-radius: var(--border-radius);
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .btn-cancel:hover {
        background-color: var(--gray-300);
      }
      
      .btn-confirm {
        background-color: var(--primary-color);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: var(--border-radius);
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .btn-confirm:hover {
        background-color: var(--primary-hover-color);
      }
      
      /* 标签页 */
      .tabs-header {
        display: flex;
        border-bottom: 1px solid var(--gray-200);
        margin-bottom: 20px;
        overflow-x: auto;
      }
      
      .tab-button {
        background: none;
        border: none;
        padding: 12px 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: var(--gray-600);
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        white-space: nowrap;
      }
      
      .tab-button:hover {
        color: var(--primary-color);
      }
      
      .tab-button.active {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }
      
      .tab-panel {
        display: none;
      }
      
      .tab-panel.active {
        display: block;
        animation: fadeIn 0.3s;
      }
      
      /* 数据卡片 */
      .data-card {
        background-color: white;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
        padding: 20px;
        display: flex;
        align-items: center;
        transition: all 0.2s;
      }
      
      .data-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      
      .card-icon {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: var(--primary-light-color);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
      }
      
      .card-icon i {
        color: var(--primary-color);
        font-size: 20px;
      }
      
      .card-content h4 {
        font-size: 14px;
        color: var(--gray-600);
        margin-bottom: 4px;
      }
      
      .card-value {
        font-size: 24px;
        font-weight: 600;
        color: var(--gray-900);
        margin-bottom: 4px;
      }
      
      .card-change {
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .card-change.positive {
        color: var(--success-color);
      }
      
      .card-change.negative {
        color: var(--danger-color);
      }
      
      /* 进度条 */
      .progress-bar {
        margin-bottom: 16px;
      }
      
      .progress-label {
        font-size: 14px;
        color: var(--gray-700);
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
      }
      
      .progress-container {
        height: 8px;
        background-color: var(--gray-200);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background-color: var(--primary-color);
        border-radius: 4px;
        transition: width 0.5s ease;
      }
      
      .progress-success {
        background-color: var(--success-color);
      }
      
      .progress-warning {
        background-color: var(--warning-color);
      }
      
      .progress-danger {
        background-color: var(--danger-color);
      }
      
      .progress-percentage {
        font-size: 12px;
        color: var(--gray-600);
        margin-top: 4px;
        text-align: right;
      }
      
      /* 徽章 */
      .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        line-height: 1;
      }
      
      .badge-primary {
        background-color: var(--primary-light-color);
        color: var(--primary-color);
      }
      
      .badge-success {
        background-color: var(--success-light-color);
        color: var(--success-color);
      }
      
      .badge-danger {
        background-color: var(--danger-light-color);
        color: var(--danger-color);
      }
      
      .badge-warning {
        background-color: var(--warning-light-color);
        color: var(--warning-color);
      }
      
      /* 头像 */
      .avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--primary-color);
        color: white;
        font-weight: 500;
        overflow: hidden;
      }
      
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .avatar-small {
        width: 24px;
        height: 24px;
        font-size: 10px;
      }
      
      .avatar-medium {
        width: 36px;
        height: 36px;
        font-size: 14px;
      }
      
      .avatar-large {
        width: 48px;
        height: 48px;
        font-size: 18px;
      }
      
      /* 空状态 */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: var(--gray-500);
      }
      
      .empty-icon {
        font-size: 48px;
        color: var(--gray-300);
        margin-bottom: 16px;
      }
      
      .empty-state p {
        font-size: 16px;
        max-width: 300px;
      }
      
      /* 淡出动画 */
      .fade-out {
        animation: fadeOut 0.3s;
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    
    document.head.appendChild(style);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initComponents);

// 导出组件函数
window.ModernUI = {
  createToast,
  createConfirmDialog,
  createTabs,
  createDataCard,
  createProgressBar,
  createBadge,
  createAvatar,
  createEmptyState,
  createLoader,
  removeLoader
};