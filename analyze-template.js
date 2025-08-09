const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeTemplate() {
    try {
        const templatePath = path.resolve(__dirname, '自由打印批量上传模板-20250416160130.xlsx');
        console.log('分析模板文件:', templatePath);
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('工作表名称:', worksheet.name);
        console.log('总行数:', worksheet.lastRow ? worksheet.lastRow.number : 0);
        console.log('总列数:', worksheet.lastColumn ? worksheet.lastColumn.number : 0);
        
        // 分析表头行（第1行）
        console.log('\n=== 表头行分析 ===');
        const headerRow = worksheet.getRow(1);
        for (let col = 1; col <= 17; col++) {
            const cell = headerRow.getCell(col);
            console.log(`列${col}: "${cell.value}" | 样式:`, JSON.stringify(cell.style, null, 2));
        }
        
        // 分析第2行（如果存在）
        if (worksheet.lastRow && worksheet.lastRow.number >= 2) {
            console.log('\n=== 第2行分析 ===');
            const row2 = worksheet.getRow(2);
            for (let col = 1; col <= 17; col++) {
                const cell = row2.getCell(col);
                console.log(`列${col}: "${cell.value}" | 样式:`, JSON.stringify(cell.style, null, 2));
            }
        }
        
        // 分析列宽
        console.log('\n=== 列宽分析 ===');
        for (let col = 1; col <= 17; col++) {
            const column = worksheet.getColumn(col);
            console.log(`列${col}宽度:`, column.width);
        }
        
        // 分析行高
        console.log('\n=== 行高分析 ===');
        for (let row = 1; row <= Math.min(5, worksheet.lastRow ? worksheet.lastRow.number : 1); row++) {
            const rowObj = worksheet.getRow(row);
            console.log(`行${row}高度:`, rowObj.height);
        }
        
        // 分析冻结窗格
        console.log('\n=== 冻结窗格分析 ===');
        if (worksheet.views && worksheet.views.length > 0) {
            console.log('视图设置:', JSON.stringify(worksheet.views, null, 2));
        }
        
        // 分析工作表保护
        console.log('\n=== 工作表保护分析 ===');
        if (worksheet.protection) {
            console.log('保护设置:', JSON.stringify(worksheet.protection, null, 2));
        }
        
    } catch (error) {
        console.error('分析失败:', error);
    }
}

analyzeTemplate();