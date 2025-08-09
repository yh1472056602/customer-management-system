/**
 * 移动端表格适配器
 * 将传统表格转换为移动端友好的卡片布局
 */

class MobileTableAdapter {
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
                this.adaptAllTables();
            }
        });

        // 初始化时适配所有表格
        this.adaptAllTables();
    }

    adaptAllTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            this.adaptTable(table);
        });
    }

    adaptTable(table) {
        if (!table) return;

        const tableContainer = table.closest('.data-table');
        if (!tableContainer) return;

        if (this.isMobile) {
            this.createMobileCards(table, tableContainer);
        } else {
            this.restoreTable(table, tableContainer);
        }
    }

    createMobileCards(table, container) {
        // 检查是否已经创建了移动端卡片
        let mobileContainer = container.querySelector('.mobile-table-cards');
        if (!mobileContainer) {
            mobileContainer = document.createElement('div');
            mobileContainer.className = 'mobile-table-cards';
            container.appendChild(mobileContainer);
        }

        // 清空现有卡片
        mobileContainer.innerHTML = '';

        // 获取表头
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 0) return;

            const card = this.createMobileCard(headers, cells, index);
            mobileContainer.appendChild(card);
        });

        // 隐藏原始表格
        table.style.display = 'none';
    }

    createMobileCard(headers, cells, index) {
        const card = document.createElement('div');
        card.className = 'mobile-table-card';
        card.setAttribute('data-row-index', index);

        // 创建卡片头部
        const header = document.createElement('div');
        header.className = 'mobile-card-header';

        // 主标题（通常是第一个或第二个字段）
        const titleCell = cells[1] || cells[0]; // 优先使用第二列作为标题
        const title = document.createElement('div');
        title.className = 'mobile-card-title';
        title.textContent = titleCell ? titleCell.textContent.trim() : `记录 ${index + 1}`;

        // ID或序号
        const idCell = cells[0];
        const id = document.createElement('div');
        id.className = 'mobile-card-id';
        id.textContent = idCell ? `#${idCell.textContent.trim()}` : `#${index + 1}`;

        header.appendChild(title);
        header.appendChild(id);
        card.appendChild(header);

        // 创建卡片内容
        const content = document.createElement('div');
        content.className = 'mobile-card-content';

        // 跳过第一列（通常是ID）和最后一列（通常是操作按钮）
        const startIndex = 1;
        const endIndex = cells.length - (this.hasActionColumn(cells) ? 1 : 0);

        for (let i = startIndex; i < endIndex && i < cells.length; i++) {
            const cell = cells[i];
            const header = headers[i];
            
            if (!header || !cell) continue;

            const field = document.createElement('div');
            field.className = 'mobile-card-field';

            const label = document.createElement('div');
            label.className = 'mobile-card-label';
            label.textContent = header;

            const value = document.createElement('div');
            value.className = 'mobile-card-value';
            
            // 处理特殊内容
            if (cell.querySelector('.status-complete, .status-incomplete')) {
                value.innerHTML = cell.innerHTML;
            } else {
                value.textContent = cell.textContent.trim() || '-';
            }

            field.appendChild(label);
            field.appendChild(value);
            content.appendChild(field);
        }

        card.appendChild(content);

        // 创建操作按钮区域
        const lastCell = cells[cells.length - 1];
        if (this.hasActionColumn(cells) && lastCell) {
            const actions = document.createElement('div');
            actions.className = 'mobile-card-actions';
            
            // 复制操作按钮
            const buttons = lastCell.querySelectorAll('button, .edit-btn, .reset-btn, .delete-btn');
            buttons.forEach(button => {
                const clonedButton = button.cloneNode(true);
                // 复制事件监听器
                this.cloneEventListeners(button, clonedButton);
                actions.appendChild(clonedButton);
            });

            if (actions.children.length > 0) {
                card.appendChild(actions);
            }
        }

        return card;
    }

    hasActionColumn(cells) {
        if (cells.length === 0) return false;
        const lastCell = cells[cells.length - 1];
        return lastCell.querySelector('button, .edit-btn, .reset-btn, .delete-btn') !== null;
    }

    cloneEventListeners(original, clone) {
        // 获取原始元素的onclick属性
        if (original.onclick) {
            clone.onclick = original.onclick;
        }

        // 获取原始元素的其他事件属性
        const events = ['onmouseenter', 'onmouseleave', 'onmousedown', 'onmouseup'];
        events.forEach(event => {
            if (original[event]) {
                clone[event] = original[event];
            }
        });

        // 复制data属性
        Array.from(original.attributes).forEach(attr => {
            if (attr.name.startsWith('data-') || attr.name.startsWith('onclick')) {
                clone.setAttribute(attr.name, attr.value);
            }
        });
    }

    restoreTable(table, container) {
        // 显示原始表格
        table.style.display = '';

        // 移除移动端卡片
        const mobileContainer = container.querySelector('.mobile-table-cards');
        if (mobileContainer) {
            mobileContainer.remove();
        }
    }

    // 更新特定表格的数据
    updateTable(tableId) {
        const table = document.getElementById(tableId);
        if (table) {
            this.adaptTable(table);
        }
    }

    // 刷新所有表格
    refresh() {
        this.adaptAllTables();
    }
}

// 移动端表格工具函数
const MobileTableUtils = {
    // 为表格添加移动端搜索功能
    addMobileSearch(containerId, searchInputId) {
        const container = document.getElementById(containerId);
        const searchInput = document.getElementById(searchInputId);
        
        if (!container || !searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cards = container.querySelectorAll('.mobile-table-card');
            
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    card.style.display = '';
                    card.classList.remove('hidden');
                } else {
                    card.style.display = 'none';
                    card.classList.add('hidden');
                }
            });
        });
    },

    // 为移动端卡片添加排序功能
    addMobileSorting(containerId, sortOptions) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // 创建排序控件
        const sortContainer = document.createElement('div');
        sortContainer.className = 'mobile-sort-container';
        sortContainer.style.cssText = `
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding: 0.75rem;
            background-color: var(--gray-50);
            border-radius: var(--border-radius);
        `;

        const sortSelect = document.createElement('select');
        sortSelect.className = 'mobile-sort-select';
        sortSelect.style.cssText = `
            flex: 1;
            padding: 0.5rem;
            border: 1px solid var(--gray-300);
            border-radius: var(--border-radius);
            font-size: var(--mobile-font-sm);
        `;

        // 添加排序选项
        sortOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            sortSelect.appendChild(optionElement);
        });

        const sortButton = document.createElement('button');
        sortButton.className = 'mobile-sort-button';
        sortButton.innerHTML = '<i class="fas fa-sort"></i>';
        sortButton.style.cssText = `
            padding: 0.5rem 0.75rem;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            cursor: pointer;
        `;

        sortContainer.appendChild(sortSelect);
        sortContainer.appendChild(sortButton);

        // 插入到容器开头
        const mobileCards = container.querySelector('.mobile-table-cards');
        if (mobileCards) {
            container.insertBefore(sortContainer, mobileCards);
        }

        // 添加排序功能
        sortButton.addEventListener('click', () => {
            this.sortMobileCards(container, sortSelect.value);
        });
    },

    // 排序移动端卡片
    sortMobileCards(container, sortBy) {
        const cardsContainer = container.querySelector('.mobile-table-cards');
        if (!cardsContainer) return;

        const cards = Array.from(cardsContainer.querySelectorAll('.mobile-table-card'));
        
        cards.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.querySelector('.mobile-card-title').textContent;
                    bValue = b.querySelector('.mobile-card-title').textContent;
                    break;
                case 'date':
                    // 查找包含日期的字段
                    const aDateField = Array.from(a.querySelectorAll('.mobile-card-value'))
                        .find(el => /\d{4}-\d{2}-\d{2}/.test(el.textContent));
                    const bDateField = Array.from(b.querySelectorAll('.mobile-card-value'))
                        .find(el => /\d{4}-\d{2}-\d{2}/.test(el.textContent));
                    aValue = aDateField ? new Date(aDateField.textContent) : new Date(0);
                    bValue = bDateField ? new Date(bDateField.textContent) : new Date(0);
                    break;
                case 'amount':
                    // 查找包含金额的字段
                    const aAmountField = Array.from(a.querySelectorAll('.mobile-card-value'))
                        .find(el => /[¥￥]/.test(el.textContent) || /\d+\.\d+/.test(el.textContent));
                    const bAmountField = Array.from(b.querySelectorAll('.mobile-card-value'))
                        .find(el => /[¥￥]/.test(el.textContent) || /\d+\.\d+/.test(el.textContent));
                    aValue = aAmountField ? parseFloat(aAmountField.textContent.replace(/[¥￥,]/g, '')) : 0;
                    bValue = bAmountField ? parseFloat(bAmountField.textContent.replace(/[¥￥,]/g, '')) : 0;
                    break;
                default:
                    return 0;
            }
            
            if (typeof aValue === 'string') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue - aValue; // 降序排列
            }
        });

        // 重新排列卡片
        cards.forEach(card => cardsContainer.appendChild(card));
    },

    // 添加移动端分页
    addMobilePagination(containerId, itemsPerPage = 10) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let currentPage = 1;
        
        const updatePagination = () => {
            const cards = container.querySelectorAll('.mobile-table-card:not(.hidden)');
            const totalPages = Math.ceil(cards.length / itemsPerPage);
            
            // 隐藏所有卡片
            cards.forEach((card, index) => {
                const shouldShow = index >= (currentPage - 1) * itemsPerPage && 
                                 index < currentPage * itemsPerPage;
                card.style.display = shouldShow ? '' : 'none';
            });

            // 更新分页控件
            this.updatePaginationControls(container, currentPage, totalPages, (page) => {
                currentPage = page;
                updatePagination();
            });
        };

        // 初始化分页
        updatePagination();
        
        // 监听搜索变化
        const searchInput = container.closest('.section').querySelector('input[type="text"]');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentPage = 1;
                setTimeout(updatePagination, 100);
            });
        }
    },

    updatePaginationControls(container, currentPage, totalPages, onPageChange) {
        let paginationContainer = container.querySelector('.mobile-pagination');
        
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.className = 'mobile-pagination pagination';
            container.appendChild(paginationContainer);
        }

        paginationContainer.innerHTML = '';

        if (totalPages <= 1) return;

        // 上一页按钮
        if (currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.onclick = () => onPageChange(currentPage - 1);
            paginationContainer.appendChild(prevBtn);
        }

        // 页码按钮
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => onPageChange(i);
            paginationContainer.appendChild(pageBtn);
        }

        // 下一页按钮
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.onclick = () => onPageChange(currentPage + 1);
            paginationContainer.appendChild(nextBtn);
        }
    }
};

// 初始化移动端表格适配器
let mobileTableAdapter;

document.addEventListener('DOMContentLoaded', () => {
    mobileTableAdapter = new MobileTableAdapter();
    
    // 为主要的搜索输入框添加移动端搜索功能
    const searchInputs = [
        'searchKeyword',
        'privateSearchKeyword'
    ];
    
    searchInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            const section = input.closest('.section');
            if (section) {
                MobileTableUtils.addMobileSearch(section.id, inputId);
            }
        }
    });
});

// 导出全局函数供其他脚本使用
window.MobileTableAdapter = MobileTableAdapter;
window.MobileTableUtils = MobileTableUtils;
window.refreshMobileTables = () => {
    if (mobileTableAdapter) {
        mobileTableAdapter.refresh();
    }
};