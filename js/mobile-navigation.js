/**
 * 移动端导航增强组件
 * 提供更好的移动端导航体验
 */

class MobileNavigation {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.init();
    }

    init() {
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            if (wasMobile !== this.isMobile) {
                this.updateNavigation();
            }
        });

        // 初始化导航
        this.updateNavigation();
        
        // 添加移动端特有功能
        if (this.isMobile) {
            this.addMobileFeatures();
        }
    }

    updateNavigation() {
        if (this.isMobile) {
            this.enableMobileNavigation();
        } else {
            this.enableDesktopNavigation();
        }
    }

    enableMobileNavigation() {
        const navContainer = document.querySelector('.nav-container');
        if (!navContainer) return;

        // 添加移动端导航类
        navContainer.classList.add('mobile-nav');
        
        // 为导航按钮添加触摸反馈
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            this.addTouchFeedback(btn);
            
            // 点击导航按钮后关闭菜单
            btn.addEventListener('click', () => {
                const navLinks = document.querySelector('.nav-links.show');
                if (navLinks) {
                    this.toggleMobileMenu();
                }
            });
        });

        // 添加菜单切换按钮
        this.addMenuToggleButton();
        
        // 添加底部导航栏（如果需要）
        this.createBottomNavigation();
        
        // 确保导航链接有水平菜单类
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            // 移除原来的类名并添加水平菜单类
            navLinks.classList.remove('bottom-sheet');
            
            // 如果已经有的类名，先清除
            const classList = navLinks.classList;
            for (let i = 0; i < classList.length; i++) {
                if (classList[i] !== 'nav-links' && classList[i] !== 'horizontal-menu') {
                    classList.remove(classList[i]);
                    i--; // 因为删除了一个元素，所以需要调整索引
                }
            }
            
            // 添加水平菜单类
            navLinks.classList.add('horizontal-menu');
            
            // 添加水平滚动支持
            this.setupHorizontalScroll(navLinks);
            
            // 为了调试，打印当前类名
            console.log('Current nav-links classes:', navLinks.className);
        }
    }
    
    // 添加菜单切换按钮
    addMenuToggleButton() {
        // 检查是否已存在菜单按钮
        if (document.querySelector('.menu-toggle')) return;
        
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.setAttribute('aria-label', '菜单');
        
        // 直接使用原生方式添加点击事件
        menuToggle.onclick = function() {
            console.log('Menu toggle button clicked');
            window.showMobileMenu();
        };
        
        navbar.appendChild(menuToggle);
    }
    
    // 设置水平滚动支持
    setupHorizontalScroll(navLinksElement) {
        if (!navLinksElement) return;
        
        // 添加触摸滑动支持
        let startX, isScrolling = false;
        
        navLinksElement.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isScrolling = true;
        });
        
        navLinksElement.addEventListener('touchmove', (e) => {
            if (!isScrolling) return;
            
            const currentX = e.touches[0].clientX;
            const diffX = startX - currentX;
            navLinksElement.scrollLeft += diffX / 2; // 平滑滚动效果
            startX = currentX;
        });
        
        navLinksElement.addEventListener('touchend', () => {
            isScrolling = false;
        });
        
        // 添加鼠标滚轮支持
        navLinksElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            navLinksElement.scrollLeft += e.deltaY;
        });
    }
    
    // 切换移动端菜单显示/隐藏
    toggleMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        console.log('Toggle mobile menu called'); // 添加日志输出追踪问题
        
        // 确保有水平菜单类
        if (!navLinks.classList.contains('horizontal-menu')) {
            navLinks.classList.add('horizontal-menu');
        }
        
        // 切换显示状态
        navLinks.classList.toggle('show');
        
        // 更新菜单图标
        const menuToggle = document.querySelector('.menu-toggle i');
        if (menuToggle) {
            if (navLinks.classList.contains('show')) {
                menuToggle.className = 'fas fa-times';
            } else {
                menuToggle.className = 'fas fa-bars';
            }
        }
        
        console.log('Menu classes after toggle:', navLinks.className);
    }

    enableDesktopNavigation() {
        const navContainer = document.querySelector('.nav-container');
        if (!navContainer) return;

        navContainer.classList.remove('mobile-nav');
        this.removeBottomNavigation();
    }

    addTouchFeedback(element) {
        element.addEventListener('touchstart', (e) => {
            element.classList.add('touch-active');
        });

        element.addEventListener('touchend', (e) => {
            setTimeout(() => {
                element.classList.remove('touch-active');
            }, 150);
        });

        element.addEventListener('touchcancel', (e) => {
            element.classList.remove('touch-active');
        });
    }

    createBottomNavigation() {
        // 检查是否已存在底部导航
        if (document.querySelector('.mobile-bottom-nav')) return;

        const bottomNav = document.createElement('div');
        bottomNav.className = 'mobile-bottom-nav';
        bottomNav.innerHTML = `
            <div class="bottom-nav-container">
                <button class="bottom-nav-btn" onclick="scrollToTop()">
                    <i class="fas fa-arrow-up"></i>
                    <span>顶部</span>
                </button>
                <button class="bottom-nav-btn menu-btn">
                    <i class="fas fa-bars"></i>
                    <span>菜单</span>
                </button>
                <button class="bottom-nav-btn" onclick="toggleMobileSearch()">
                    <i class="fas fa-search"></i>
                    <span>搜索</span>
                </button>
            </div>
        `;

        document.body.appendChild(bottomNav);
        this.addBottomNavStyles();
        
        // 直接使用原生方式添加点击事件
        const menuBtn = bottomNav.querySelector('.menu-btn');
        if (menuBtn) {
            const self = this;
            menuBtn.onclick = function() {
                console.log('Menu button clicked');
                window.showMobileMenu();
            };
        }
    }

    removeBottomNavigation() {
        const bottomNav = document.querySelector('.mobile-bottom-nav');
        if (bottomNav) {
            bottomNav.remove();
        }
    }

    addBottomNavStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-bottom-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: var(--card-background);
                border-top: 1px solid var(--gray-200);
                box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                padding: env(safe-area-inset-bottom) 0 0 0;
            }

            .bottom-nav-container {
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding: 0.5rem 0;
            }

            .bottom-nav-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
                background: none;
                border: none;
                color: var(--gray-600);
                font-size: 0.75rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: var(--border-radius);
                transition: all var(--transition-fast);
                min-width: 60px;
            }

            .bottom-nav-btn:hover,
            .bottom-nav-btn:active {
                color: var(--primary-color);
                background-color: var(--primary-light-color);
            }

            .bottom-nav-btn i {
                font-size: 1.25rem;
            }

            .touch-active {
                transform: scale(0.95);
                background-color: var(--gray-100);
            }

            /* 为底部导航预留空间 */
            @media (max-width: 768px) {
                body {
                    padding-bottom: 80px;
                }
            }
            
            /* 水平菜单样式补充 */
            .nav-links.horizontal-menu {
                position: fixed;
                bottom: 80px;
                left: 0;
                right: 0;
                display: none;
                background-color: var(--card-background);
                box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.1);
                padding: 0.75rem 0.5rem;
                z-index: 999;
                overflow-x: auto;
                white-space: nowrap;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
                transition: transform 0.3s ease, opacity 0.3s ease;
                transform: translateY(100%);
                opacity: 0;
            }
            
            .nav-links.horizontal-menu.show {
                display: flex;
                transform: translateY(0);
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    addMobileFeatures() {
        // 添加手势支持
        this.addSwipeGestures();
        
        // 添加移动端搜索
        this.addMobileSearch();
    }

    addSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let isScrolling = false;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isScrolling = false;
        });

        document.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = startX - currentX;
            const diffY = startY - currentY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                // 水平滑动
                if (Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                        // 向左滑动 - 下一个标签页
                        this.switchToNextTab();
                    } else {
                        // 向右滑动 - 上一个标签页
                        this.switchToPrevTab();
                    }
                    startX = 0;
                    startY = 0;
                }
            }
        });
    }

    switchToNextTab() {
        const activeBtn = document.querySelector('.nav-btn.active');
        if (!activeBtn) return;

        const allBtns = Array.from(document.querySelectorAll('.nav-btn:not(.logout-btn)'));
        const currentIndex = allBtns.indexOf(activeBtn);
        const nextIndex = (currentIndex + 1) % allBtns.length;
        
        if (allBtns[nextIndex]) {
            allBtns[nextIndex].click();
        }
    }

    switchToPrevTab() {
        const activeBtn = document.querySelector('.nav-btn.active');
        if (!activeBtn) return;

        const allBtns = Array.from(document.querySelectorAll('.nav-btn:not(.logout-btn)'));
        const currentIndex = allBtns.indexOf(activeBtn);
        const prevIndex = currentIndex === 0 ? allBtns.length - 1 : currentIndex - 1;
        
        if (allBtns[prevIndex]) {
            allBtns[prevIndex].click();
        }
    }

    addMobileSearch() {
        // 创建移动端搜索覆盖层
        const searchOverlay = document.createElement('div');
        searchOverlay.className = 'mobile-search-overlay';
        searchOverlay.style.display = 'none';
        searchOverlay.innerHTML = `
            <div class="mobile-search-container">
                <div class="mobile-search-header">
                    <input type="text" class="mobile-search-input" placeholder="搜索订单、客户、产品...">
                    <button class="mobile-search-close" onclick="toggleMobileSearch()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mobile-search-results">
                    <!-- 搜索结果将在这里显示 -->
                </div>
            </div>
        `;

        document.body.appendChild(searchOverlay);
        this.addMobileSearchStyles();
    }

    addMobileSearchStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-search-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: var(--card-background);
                z-index: 2000;
                overflow-y: auto;
            }

            .mobile-search-container {
                padding: 1rem;
                height: 100%;
            }

            .mobile-search-header {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 1rem;
                align-items: center;
            }

            .mobile-search-input {
                flex: 1;
                padding: 0.75rem 1rem;
                border: 2px solid var(--gray-300);
                border-radius: var(--border-radius);
                font-size: 1rem;
            }

            .mobile-search-input:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 3px var(--primary-light-color);
            }

            .mobile-search-close {
                background-color: var(--gray-200);
                border: none;
                border-radius: var(--border-radius);
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: var(--gray-600);
            }

            .mobile-search-close:hover {
                background-color: var(--gray-300);
            }

            .mobile-search-results {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
        `;
        document.head.appendChild(style);
    }


}

// 全局函数
window.scrollToTop = function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

window.toggleMobileSearch = function() {
    const overlay = document.querySelector('.mobile-search-overlay');
    if (overlay) {
        const isVisible = overlay.style.display !== 'none';
        overlay.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            // 聚焦搜索输入框
            setTimeout(() => {
                const input = overlay.querySelector('.mobile-search-input');
                if (input) input.focus();
            }, 100);
        }
    }
};



window.showMobileMenu = function() {
    console.log('showMobileMenu called'); // 添加日志输出追踪问题
    
    // 切换导航菜单的显示/隐藏
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        // 确保有水平菜单类
        if (!navLinks.classList.contains('horizontal-menu')) {
            navLinks.classList.add('horizontal-menu');
        }
        
        // 切换显示状态
        navLinks.classList.toggle('show');
        
        // 更新菜单图标
        const menuToggle = document.querySelector('.menu-toggle i');
        if (menuToggle) {
            if (navLinks.classList.contains('show')) {
                menuToggle.className = 'fas fa-times';
            } else {
                menuToggle.className = 'fas fa-bars';
            }
        }
        
        console.log('Menu classes after toggle:', navLinks.className);
    }
};



// 初始化移动端导航
let mobileNavigation;

document.addEventListener('DOMContentLoaded', () => {
    mobileNavigation = new MobileNavigation();
    
    // 确保在页面加载后重新绑定菜单按钮事件
    const menuButtons = document.querySelectorAll('.menu-toggle, .bottom-nav-btn.menu-btn');
    menuButtons.forEach(btn => {
        btn.onclick = function() {
            console.log('Menu button clicked (rebind)');
            window.showMobileMenu();
            return false;
        };
    });
});

// 导出供其他脚本使用
window.MobileNavigation = MobileNavigation;