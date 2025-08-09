const { exec } = require('child_process');
const os = require('os');

// 根据操作系统打开浏览器
function openBrowser(url) {
    let command;
    
    switch (os.platform()) {
        case 'darwin': // macOS
            command = `open ${url}`;
            break;
        case 'win32': // Windows
            command = `start ${url}`;
            break;
        case 'linux': // Linux
            command = `xdg-open ${url}`;
            break;
        default:
            console.log(`请手动在浏览器中打开: ${url}`);
            return;
    }
    
    exec(command, (error) => {
        if (error) {
            console.error(`打开浏览器失败: ${error}`);
            console.log(`请手动在浏览器中打开: ${url}`);
            return;
        }
        console.log(`已在浏览器中打开: ${url}`);
    });
}

// 打开项目页面
console.log('正在打开客户管理系统...');
openBrowser('http://localhost:3001/frontend/customer-service.html');



