// 公告相关功能

// 安全地获取DOM元素
function safelyGetAnnouncementElement(id) {
    return document.getElementById(id);
}

// 安全处理响应数据
function safelyHandleAnnouncementResponse(data) {
    // 处理兼容层返回的数据格式
    if (data && data.success === true && data.data) {
        return data.data;
    }
    // 如果是旧格式或直接返回的数组
    if (Array.isArray(data)) {
        return data;
    }
    // 默认返回空数组
    return [];
}

// 加载公告
async function loadAnnouncements() {
    try {
        const response = await fetch('/api/announcements');
        
        if (response.ok) {
            const data = await response.json();
            const announcements = safelyHandleAnnouncementResponse(data);
            displayAnnouncements(announcements);
        }
    } catch (error) {
        console.error('加载公告失败:', error);
        // 显示默认公告
        const announcementText = safelyGetAnnouncementElement('announcementText');
        if (announcementText) {
            announcementText.textContent = '欢迎使用尔升网络客户管理系统';
        }
    }
}

// 显示公告
function displayAnnouncements(announcements) {
    const announcementText = safelyGetAnnouncementElement('announcementText');
    if (!announcementText) return;
    
    // 确保announcements是数组
    if (!Array.isArray(announcements) || announcements.length === 0) {
        announcementText.textContent = '欢迎使用尔升网络客户管理系统';
        return;
    }
    
    try {
        // 显示最新的一条公告，确保其有title和content属性
        const latestAnnouncement = announcements[0];
        if (latestAnnouncement && typeof latestAnnouncement === 'object') {
            const title = latestAnnouncement.title || '';
            const content = latestAnnouncement.content || '';
            
            if (title || content) {
                announcementText.textContent = title ? `${title}: ${content}` : content;
            } else {
                announcementText.textContent = '欢迎使用尔升网络客户管理系统';
            }
        } else {
            announcementText.textContent = '欢迎使用尔升网络客户管理系统';
        }
        
        // 如果有滚动效果，可以在这里添加
        if (announcements.length > 1) {
            let currentIndex = 0;
            setInterval(() => {
                try {
                    currentIndex = (currentIndex + 1) % announcements.length;
                    const announcement = announcements[currentIndex];
                    if (announcement && typeof announcement === 'object') {
                        const title = announcement.title || '';
                        const content = announcement.content || '';
                        
                        if (title || content) {
                            announcementText.textContent = title ? `${title}: ${content}` : content;
                        }
                    }
                } catch (error) {
                    console.error('公告轮播错误:', error);
                }
            }, 5000); // 每5秒切换一次
        }
    } catch (error) {
        console.error('显示公告错误:', error);
        announcementText.textContent = '欢迎使用尔升网络客户管理系统';
    }
}

// 页面加载时加载公告
document.addEventListener('DOMContentLoaded', function() {
    loadAnnouncements();
});

// 格式化公告显示
function formatAnnouncement(announcement) {
    try {
        if (!announcement) return {};
        
        const date = new Date(announcement.created_at || Date.now());
        const content = announcement.content || '';
        
        return {
            ...announcement,
            formattedDate: date.toLocaleString('zh-CN'),
            shortContent: content.length > 50 
                ? content.substring(0, 50) + '...' 
                : content
        };
    } catch (error) {
        console.error('格式化公告错误:', error);
        return {};
    }
}
