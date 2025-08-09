/**
 * AI服务集成模块
 * 提供智能地址解析和文本处理功能
 * 支持多种AI服务，自动选择最快的服务
 */

const axios = require('axios');

// AI服务配置
const AI_SERVICES = {
    // 阿里云通义千问 (优先使用 - 国内快速)
    qwen: {
        apiKey: process.env.QWEN_API_KEY || 'sk-a6cd9c3b0b4c442b8f268078284efaea',
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        model: 'qwen-turbo',
        timeout: 5000
    },
    // OpenAI GPT-3.5 (备选快速服务)
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        timeout: 5000
    },
    // Kimi AI (原有服务)
    kimi: {
        apiKey: process.env.KIMI_API_KEY || 'sk-EDwPTnWj2hP8z5FpCVc2do8b0KVBLaWj0UxuJJdP8AUUMK8z',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        model: 'moonshot-v1-8k',
        timeout: 8000
    },
    // 百度文心一言 (国内备选)
    ernie: {
        apiKey: process.env.ERNIE_API_KEY,
        endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
        model: 'ernie-speed-128k',
        timeout: 5000
    }
};

// 地图服务配置 (最快的地址解析)
const MAP_SERVICES = {
    amap: {
        apiKey: process.env.AMAP_API_KEY,
        endpoint: 'https://restapi.amap.com/v3/geocode/geo',
        timeout: 3000
    },
    baidu: {
        apiKey: process.env.BAIDU_MAP_API_KEY,
        endpoint: 'https://api.map.baidu.com/geocoding/v3/',
        timeout: 3000
    }
};

// 当前使用的AI服务 (可动态切换) - 优先使用阿里云通义千问
let currentAIService = 'qwen';
let currentMapService = 'amap';

/**
 * 快速地址解析 - 优先使用地图服务，AI服务作为备选
 * @param {string} address 完整地址文本
 * @returns {Promise<Object>} 解析后的地址对象，符合Excel模板格式
 */
async function parseAddressWithAI(address) {
    if (!address) {
        throw new Error('地址不能为空');
    }

    console.log(`开始解析地址: ${address}`);
    const startTime = Date.now();

    try {
        // 方案1: 优先尝试地图服务 (最快 0.5-1秒)
        if (MAP_SERVICES[currentMapService] && MAP_SERVICES[currentMapService].apiKey) {
            try {
                console.log(`尝试使用地图服务: ${currentMapService}`);
                const mapResult = await parseWithMapService(address);
                if (mapResult) {
                    console.log(`地图服务解析成功，耗时: ${Date.now() - startTime}ms`);
                    return mapResult;
                }
            } catch (mapError) {
                console.log(`地图服务失败，切换到AI服务: ${mapError.message}`);
            }
        }

        // 方案2: 使用快速AI服务 - 优先阿里云通义千问
        const aiServices = ['qwen', 'openai', 'ernie', 'kimi'];
        
        for (const serviceName of aiServices) {
            const service = AI_SERVICES[serviceName];
            if (!service || !service.apiKey) continue;

            try {
                console.log(`尝试使用AI服务: ${serviceName}`);
                const result = await parseWithAIService(address, serviceName);
                console.log(`AI服务 ${serviceName} 解析成功，耗时: ${Date.now() - startTime}ms`);
                return result;
            } catch (error) {
                console.log(`AI服务 ${serviceName} 失败: ${error.message}`);
                continue;
            }
        }

        throw new Error('所有解析服务都不可用');
    } catch (error) {
        console.error('地址解析失败:', error);
        throw new Error('地址解析服务异常');
    }
}

/**
 * 使用地图服务解析地址 (最快方案)
 */
async function parseWithMapService(address) {
    const service = MAP_SERVICES[currentMapService];
    if (!service) return null;

    try {
        let response;
        
        if (currentMapService === 'amap') {
            // 高德地图API
            response = await axios.get(service.endpoint, {
                params: {
                    key: service.apiKey,
                    address: address,
                    output: 'json'
                },
                timeout: service.timeout
            });

            if (response.data.status === '1' && response.data.geocodes.length > 0) {
                const geocode = response.data.geocodes[0];
                const addressComponents = geocode.formatted_address.split('');
                
                return {
                    province: standardizeProvince(geocode.province),
                    city: standardizeCity(geocode.city),
                    district: standardizeDistrict(geocode.district),
                    detail_address: extractDetailAddress(address, geocode.province, geocode.city, geocode.district),
                    recipient_name: extractNameFromAddress(address),
                    recipient_phone: extractPhoneFromAddress(address),
                    product_name: '',
                    quantity: '',
                    amount: ''
                };
            }
        } else if (currentMapService === 'baidu') {
            // 百度地图API
            response = await axios.get(service.endpoint, {
                params: {
                    ak: service.apiKey,
                    address: address,
                    output: 'json'
                },
                timeout: service.timeout
            });

            if (response.data.status === 0 && response.data.result) {
                const result = response.data.result;
                return {
                    province: standardizeProvince(result.level),
                    city: standardizeCity(result.level),
                    district: standardizeDistrict(result.level),
                    detail_address: extractDetailAddress(address),
                    recipient_name: extractNameFromAddress(address),
                    recipient_phone: extractPhoneFromAddress(address),
                    product_name: '',
                    quantity: '',
                    amount: ''
                };
            }
        }
    } catch (error) {
        console.error(`地图服务 ${currentMapService} 错误:`, error);
        throw error;
    }

    return null;
}

/**
 * 使用AI服务解析地址
 */
async function parseWithAIService(address, serviceName) {
    const service = AI_SERVICES[serviceName];
    if (!service) throw new Error(`AI服务 ${serviceName} 未配置`);

    const systemPrompt = `你是一个专业的中国地址和订单信息解析助手。请将输入的文本解析为JSON格式，包含以下字段：
    - province: 省份名称，不含"省"后缀
    - city: 城市名称，不含"市"后缀  
    - district: 区县名称，不含"区"、"县"后缀
    - detail_address: 详细地址，不含省市区
    - recipient_name: 收件人姓名
    - recipient_phone: 收件人电话
    - product_name: 物品名称
    - quantity: 数量
    - amount: 金额
    
    请直接返回JSON，不要包含其他文字。`;

    try {
        let response;

        if (serviceName === 'openai') {
            response = await axios.post(
                service.endpoint,
                {
                    model: service.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: address }
                    ],
                    temperature: 0.1,
                    max_tokens: 500
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${service.apiKey}`
                    },
                    timeout: service.timeout
                }
            );
            
            const content = response.data.choices[0].message.content;
            return parseAIResponse(content);

        } else if (serviceName === 'qwen') {
            response = await axios.post(
                service.endpoint,
                {
                    model: service.model,
                    input: {
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: address }
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
                        'Authorization': `Bearer ${service.apiKey}`,
                        'X-DashScope-SSE': 'disable'
                    },
                    timeout: service.timeout
                }
            );

            // 阿里云通义千问的响应格式
            const content = response.data.output?.choices?.[0]?.message?.content || 
                           response.data.output?.text || 
                           JSON.stringify(response.data.output);
            return parseAIResponse(content);

        } else if (serviceName === 'kimi') {
            response = await axios.post(
                service.endpoint,
                {
                    model: service.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: address }
                    ],
                    temperature: 0.1
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${service.apiKey}`
                    },
                    timeout: service.timeout
                }
            );

            const content = response.data.choices[0].message.content;
            return parseAIResponse(content);
        }

        throw new Error(`不支持的AI服务: ${serviceName}`);
    } catch (error) {
        console.error(`AI服务 ${serviceName} 错误:`, error);
        throw error;
    }
}

/**
 * 解析AI响应内容
 */
function parseAIResponse(content) {
    let jsonStr = content.trim();
    
    // 提取JSON内容
    if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0].trim();
    }
    
    const parsedResult = JSON.parse(jsonStr);
    
    // 标准化格式
    return {
        province: standardizeProvince(parsedResult.province),
        city: standardizeCity(parsedResult.city),
        district: standardizeDistrict(parsedResult.district),
        detail_address: parsedResult.detail_address || '',
        recipient_name: parsedResult.recipient_name || '',
        recipient_phone: parsedResult.recipient_phone || '',
        product_name: parsedResult.product_name || '',
        quantity: parsedResult.quantity || '',
        amount: parsedResult.amount || ''
    };
}

/**
 * 从地址中提取详细地址
 */
function extractDetailAddress(fullAddress, province = '', city = '', district = '') {
    let detail = fullAddress;
    
    // 移除省市区信息
    if (province) detail = detail.replace(new RegExp(province + '省?'), '');
    if (city) detail = detail.replace(new RegExp(city + '市?'), '');
    if (district) detail = detail.replace(new RegExp(district + '[区县]?'), '');
    
    return detail.trim();
}

/**
 * 从地址中提取姓名
 */
function extractNameFromAddress(address) {
    // 简单的姓名提取逻辑
    const namePattern = /([\u4e00-\u9fa5]{2,4})\s*收/;
    const match = address.match(namePattern);
    return match ? match[1] : '';
}

/**
 * 从地址中提取电话
 */
function extractPhoneFromAddress(address) {
    const phonePattern = /1[3-9]\d{9}/;
    const match = address.match(phonePattern);
    return match ? match[0] : '';
}

// 标准化省份名称（去除"省"、"自治区"、"市"等后缀）
function standardizeProvince(province) {
    if (!province) return '';
    
    return province
        .replace(/省$|市$|自治区$|特别行政区$|维吾尔$|壮族$|回族$|维吾尔族$|壮族自治区$|回族自治区$|自治州$|地区$/, '')
        .trim();
}

// 标准化城市名称（去除"市"、"地区"等后缀）
function standardizeCity(city) {
    if (!city) return '';
    
    return city
        .replace(/市$|地区$|自治州$|盟$|自治县$/, '')
        .trim();
}

// 标准化区县名称（去除"区"、"县"、"市"等后缀）
function standardizeDistrict(district) {
    if (!district) return '';
    
    return district
        .replace(/区$|县$|市$|旗$|自治县$|自治旗$/, '')
        .trim();
}

/**
 * 使用Kimi AI优化Excel导出数据，确保完全符合自由打印批量上传模板要求
 * @param {Array} orders 订单数据数组
 * @returns {Promise<Array>} 优化后的订单数据，符合Excel模板格式
 */
async function optimizeExcelDataWithAI(orders) {
    if (!orders || orders.length === 0) {
        return [];
    }

    try {
        // 构建批量处理请求
        const batchPromises = [];
        
        // 每批处理5条数据，避免请求过大
        for (let i = 0; i < orders.length; i += 5) {
            const batch = orders.slice(i, i + 5);
            
            const batchPromise = axios.post(
                AI_SERVICES['kimi'].endpoint,
                {
                    model: AI_SERVICES['kimi'].model,
                    messages: [
                        {
                            role: "system",
                            content: `你是一个专业的数据处理助手。请优化以下订单数据，确保完全符合自由打印批量上传模板要求。
                            
                            具体要求：
                            1. 收件人省、市、区：必须是标准行政区名称，不包含"省"、"市"、"区"、"县"等后缀
                            2. 收件人详细地址：不包含省市区信息，只包含具体街道、门牌号等
                            3. 物品名称：确保规范、简洁，不超过50个字符
                            4. 数量：必须是正整数
                            5. 备注：处理特殊字符，保留有效信息
                            6. 寄件人省、市、区/县：与收件人格式一致，不包含后缀
                            7. 寄件人详细地址：与收件人格式一致，只包含具体位置信息
                            
                            请保留所有原始字段，不要添加新字段，不要删除任何字段。`
                        },
                        {
                            role: "user",
                            content: `请优化以下订单数据，使其完全符合自由打印批量上传模板要求，并以JSON数组格式返回，数组名称为orders：${JSON.stringify(batch)}`
                        }
                    ],
                    temperature: 0.1
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AI_SERVICES['kimi'].apiKey}`
                    }
                }
            );
            
            batchPromises.push(batchPromise);
        }
        
        // 等待所有批次处理完成
        const batchResults = await Promise.all(batchPromises);
        
        // 合并结果
        let optimizedOrders = [];
        batchResults.forEach(response => {
            const content = response.data.choices[0].message.content;
            
            // 从文本中提取JSON
            let jsonStr = content;
            if (content.includes('```json')) {
                jsonStr = content.split('```json')[1].split('```')[0].trim();
            } else if (content.includes('```')) {
                jsonStr = content.split('```')[1].split('```')[0].trim();
            }
            
            try {
                const result = JSON.parse(jsonStr);
                const processedOrders = (result.orders || []).map(order => {
                    // 确保省市区格式标准化
                    return {
                        ...order,
                        '收件人省': standardizeProvince(order['收件人省']),
                        '收件人市': standardizeCity(order['收件人市']),
                        '收件人区': standardizeDistrict(order['收件人区']),
                        '寄件人省': standardizeProvince(order['寄件人省']),
                        '寄件人市': standardizeCity(order['寄件人市']),
                        '寄件人县/区': standardizeDistrict(order['寄件人县/区'])
                    };
                });
                
                optimizedOrders = optimizedOrders.concat(processedOrders);
            } catch (e) {
                console.error('JSON解析错误:', e);
            }
        });
        
        return optimizedOrders.length > 0 ? optimizedOrders : orders;
    } catch (error) {
        console.error('Kimi AI数据优化错误:', error);
        // 如果AI处理失败，返回原始数据
        return orders;
    }
}

/**
 * 切换AI服务
 */
function switchAIService(serviceName) {
    if (AI_SERVICES[serviceName]) {
        currentAIService = serviceName;
        console.log(`已切换到AI服务: ${serviceName}`);
        return true;
    }
    return false;
}

/**
 * 切换地图服务
 */
function switchMapService(serviceName) {
    if (MAP_SERVICES[serviceName]) {
        currentMapService = serviceName;
        console.log(`已切换到地图服务: ${serviceName}`);
        return true;
    }
    return false;
}

/**
 * 获取服务状态
 */
function getServiceStatus() {
    return {
        currentAI: currentAIService,
        currentMap: currentMapService,
        availableAI: Object.keys(AI_SERVICES).filter(name => AI_SERVICES[name].apiKey),
        availableMap: Object.keys(MAP_SERVICES).filter(name => MAP_SERVICES[name].apiKey)
    };
}

module.exports = {
    parseAddressWithAI,
    optimizeExcelDataWithAI,
    switchAIService,
    switchMapService,
    getServiceStatus
};