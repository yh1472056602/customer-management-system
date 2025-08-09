#!/usr/bin/env node

/**
 * 阿里云通义千问API测试脚本
 * 用于验证API密钥是否正常工作
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.QWEN_API_KEY || 'sk-a6cd9c3b0b4c442b8f268078284efaea';
const ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

async function testQwenAPI() {
    console.log('🧪 测试阿里云通义千问API...');
    console.log(`📡 API密钥: ${API_KEY.substring(0, 10)}...`);
    
    const testAddress = '广东省深圳市南山区科技园南区深南大道10000号腾讯大厦 张三 13800138000 苹果手机 2台';
    
    const startTime = Date.now();
    
    try {
        const response = await axios.post(
            ENDPOINT,
            {
                model: 'qwen-turbo',
                input: {
                    messages: [
                        {
                            role: "system",
                            content: "你是一个专业的中国地址解析助手。请将输入的文本解析为JSON格式，包含province、city、district、detail_address、recipient_name、recipient_phone、product_name、quantity字段。直接返回JSON，不要其他文字。"
                        },
                        {
                            role: "user",
                            content: testAddress
                        }
                    ]
                },
                parameters: {
                    temperature: 0.1,
                    max_tokens: 500,
                    result_format: "message"
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                    'X-DashScope-SSE': 'disable'
                },
                timeout: 10000
            }
        );
        
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ API调用成功！响应时间: ${elapsed}ms`);
        console.log('📄 响应数据结构:', JSON.stringify(response.data, null, 2));
        
        // 尝试解析内容
        const content = response.data.output?.choices?.[0]?.message?.content || 
                       response.data.output?.text || 
                       '无法获取内容';
        
        console.log('🎯 解析内容:', content);
        
        // 尝试解析JSON
        try {
            let jsonStr = content.trim();
            if (content.includes('```json')) {
                jsonStr = content.split('```json')[1].split('```')[0].trim();
            } else if (content.includes('```')) {
                jsonStr = content.split('```')[1].split('```')[0].trim();
            }
            
            const parsed = JSON.parse(jsonStr);
            console.log('✅ JSON解析成功:', JSON.stringify(parsed, null, 2));
            
            console.log('\n🎉 测试结果总结:');
            console.log(`⚡ 响应速度: ${elapsed}ms (${elapsed < 2000 ? '快速' : elapsed < 5000 ? '正常' : '较慢'})`);
            console.log(`📍 省份: ${parsed.province || '未识别'}`);
            console.log(`🏙️ 城市: ${parsed.city || '未识别'}`);
            console.log(`🏘️ 区县: ${parsed.district || '未识别'}`);
            console.log(`👤 收件人: ${parsed.recipient_name || '未识别'}`);
            console.log(`📱 电话: ${parsed.recipient_phone || '未识别'}`);
            console.log(`📦 商品: ${parsed.product_name || '未识别'}`);
            
        } catch (parseError) {
            console.log('❌ JSON解析失败:', parseError.message);
            console.log('原始内容:', content);
        }
        
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.log(`❌ API调用失败！耗时: ${elapsed}ms`);
        
        if (error.response) {
            console.log('📄 错误响应:', error.response.status, error.response.statusText);
            console.log('📄 错误详情:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.log('📡 网络错误:', error.message);
        } else {
            console.log('⚙️ 配置错误:', error.message);
        }
        
        console.log('\n🔧 故障排除建议:');
        console.log('1. 检查API密钥是否正确');
        console.log('2. 确认网络连接正常');
        console.log('3. 验证阿里云账户余额');
        console.log('4. 检查API调用配额');
    }
}

// 运行测试
testQwenAPI().then(() => {
    console.log('\n✨ 测试完成');
}).catch(error => {
    console.error('💥 测试脚本错误:', error);
});