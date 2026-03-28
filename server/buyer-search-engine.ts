/**
 * 买家搜索引擎 - 集成真实数据源
 * 支持 Serper、Google Places、高德地图
 *
 * 使用方式：
 * const buyers = await searchBuyers({
 *   productName: 'Electronics',
 *   productCategory: 'Consumer Electronics',
 *   targetCountries: ['USA', 'China'],
 *   buyerTypes: ['distributor', 'importer', 'wholesaler']
 * });
 */

import { invokeLLM } from './_core/llm';

interface BuyerSearchQuery {
  productName: string;
  productCategory: string;
  targetCountries: string[];
  buyerTypes: string[];
  keywords?: string[];
}

interface BuyerCompany {
  name: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  country: string;
  city?: string;
  industry?: string;
  source: 'serper' | 'google_places' | 'amap' | 'kimi_ai';
  rating?: number;
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * 使用 Serper 搜索买家信息
 */
async function searchWithSerper(query: BuyerSearchQuery): Promise<BuyerCompany[]> {
  const SERPER_API_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_API_KEY) {
    console.warn('⚠️ SERPER_API_KEY 未设置');
    return [];
  }

  const results: BuyerCompany[] = [];

  try {
    // 构建搜索查询
    const searchTerms = [
      `${query.productCategory} distributor importer`,
      `${query.productCategory} wholesale buyer`,
      `${query.productCategory} reseller supplier`,
      ...query.keywords?.map(k => `${k} distributor`) || []
    ];

    for (const searchTerm of searchTerms.slice(0, 3)) {
      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: searchTerm,
            num: 20,
            type: 'search'
          })
        });

        if (!response.ok) {
          console.warn(`⚠️ Serper 请求失败: ${response.status}`);
          continue;
        }

        const data = await response.json();

        // Serper 返回的是 'organic' 字段，不是 'searchResults'
        const searchResults = data.organic || data.searchResults || [];
        if (Array.isArray(searchResults)) {
          for (const result of searchResults.slice(0, 5)) {
            // 从搜索结果中提取公司信息
            const company: BuyerCompany = {
              name: result.title || 'Unknown',
              website: result.link,
              description: result.snippet,
              country: extractCountryFromUrl(result.link) || 'Unknown',
              source: 'serper'
            };

            // 避免重复
            if (!results.some(c => c.website === company.website)) {
              results.push(company);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Serper 搜索错误: ${error}`);
      }
    }
  } catch (error) {
    console.error(`❌ Serper 集成错误: ${error}`);
  }

  return results;
}

/**
 * 使用 Google Places API (New) 搜索买家信息
 */
async function searchWithGooglePlaces(query: BuyerSearchQuery): Promise<BuyerCompany[]> {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('⚠️ GOOGLE_PLACES_API_KEY 未设置');
    return [];
  }

  const results: BuyerCompany[] = [];

  try {
    // 对于非中国国家，使用 Google Places API (New)
    const nonChinaCountries = query.targetCountries.filter(c => c.toLowerCase() !== 'china');

    for (const country of nonChinaCountries.slice(0, 2)) {
      try {
        const searchQuery = `${query.productCategory} distributor importer ${country}`;

        // 使用新的 Places API searchText 端点
        const response = await fetch(
          'https://places.googleapis.com/v1/places:searchText',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
            },
            body: JSON.stringify({
              textQuery: searchQuery,
              maxResultCount: 10,
              languageCode: 'en'
            })
          }
        );

        if (!response.ok) {
          console.warn(`⚠️ Google Places 请求失败: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.places && Array.isArray(data.places)) {
          for (const place of data.places.slice(0, 5)) {
            const company: BuyerCompany = {
              name: place.displayName?.text || 'Unknown',
              address: place.formattedAddress,
              phone: place.internationalPhoneNumber,
              country: country,
              rating: place.rating,
              coordinates: place.location,
              source: 'google_places',
              website: place.websiteUri,
              description: place.types?.slice(0, 3).join(', ')
            };

            // 避免重复
            if (!results.some(c => c.name === company.name && c.country === company.country)) {
              results.push(company);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Google Places 搜索错误: ${error}`);
      }
    }
  } catch (error) {
    console.error(`❌ Google Places 集成错误: ${error}`);
  }

  return results;
}

/**
 * 使用 Kimi AI 联网搜索买家信息
 */
async function searchWithKimiAI(query: BuyerSearchQuery): Promise<BuyerCompany[]> {
  const results: BuyerCompany[] = [];
  
  try {
    const searchQuery = `找一些是 ${query.productCategory} 的分销商、进口商、批发商。
    上源国家: ${query.targetCountries.join(', ')}
    返回一个 JSON 数组，每个元素包含: name, country, website, phone, description`;
    
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: '你是一个业务数据搜索专家。使用你的联网能力搜索真实的公司信息。返回的数据必须是有效的 JSON 数组。'
        },
        {
          role: 'user',
          content: searchQuery
        }
      ]
    });
    
    const content = typeof response.choices?.[0]?.message?.content === 'string' 
      ? response.choices[0].message.content 
      : '';
    
    // 从哦应中提取 JSON
    const jsonMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/)
    if (jsonMatch) {
      const companies = JSON.parse(jsonMatch[0]);
      
      for (const company of companies) {
        const buyerCompany: BuyerCompany = {
          name: company.name || 'Unknown',
          website: company.website,
          phone: company.phone,
          country: company.country || 'Unknown',
          description: company.description,
          source: 'kimi_ai'
        };
        
        // 避免重复
        if (!results.some(c => c.name === buyerCompany.name && c.country === buyerCompany.country)) {
          results.push(buyerCompany);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Kimi AI 搜索错误: ${error}`);
  }
  
  return results;
}

/**
 * 使用高德地图搜索买家信息（仅中国）
 */
async function searchWithAMap(query: BuyerSearchQuery): Promise<BuyerCompany[]> {
  const AMAP_KEY = process.env.AMAP_KEY;
  if (!AMAP_KEY) {
    console.warn('⚠️ AMAP_KEY 未设置');
    return [];
  }

  const results: BuyerCompany[] = [];

  try {
    // 仅在目标国家包含中国时使用高德地图
    if (!query.targetCountries.some(c => c.toLowerCase() === 'china')) {
      return results;
    }

    // 中国主要城市代码
    const chineseCities = ['0010', '0020', '0030', '0040', '0050']; // 北京、上海、广州、深圳、杭州

    for (const cityCode of chineseCities.slice(0, 3)) {
      try {
        const keywords = [
          `${query.productCategory} 分销商`,
          `${query.productCategory} 进口商`,
          `${query.productCategory} 批发商`
        ];

        for (const keyword of keywords.slice(0, 2)) {
          const response = await fetch(
            `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keyword)}&city=${cityCode}&key=${AMAP_KEY}&offset=20`
          );

          if (!response.ok) {
            console.warn(`⚠️ 高德地图请求失败: ${response.status}`);
            continue;
          }

          const data = await response.json();

          if (data.status === '1' && data.pois && Array.isArray(data.pois)) {
            for (const poi of data.pois.slice(0, 5)) {
              const company: BuyerCompany = {
                name: poi.name,
                address: poi.address,
                phone: poi.tel,
                country: 'China',
                city: poi.city,
                coordinates: {
                  lat: parseFloat(poi.location.split(',')[1]),
                  lng: parseFloat(poi.location.split(',')[0])
                },
                source: 'amap',
                description: poi.type
              };

              // 避免重复
              if (!results.some(c => c.name === company.name && c.city === company.city)) {
                results.push(company);
              }
            }
          }
        }
      } catch (error) {
        console.error(`❌ 高德地图搜索错误: ${error}`);
      }
    }
  } catch (error) {
    console.error(`❌ 高德地图集成错误: ${error}`);
  }

  return results;
}

/**
 * 从 URL 提取国家信息
 */
function extractCountryFromUrl(url: string): string | null {
  const countryMap: Record<string, string> = {
    '.com': 'USA',
    '.co.uk': 'UK',
    '.de': 'Germany',
    '.fr': 'France',
    '.jp': 'Japan',
    '.cn': 'China',
    '.in': 'India',
    '.au': 'Australia',
    '.ca': 'Canada',
    '.br': 'Brazil'
  };

  for (const [domain, country] of Object.entries(countryMap)) {
    if (url.includes(domain)) {
      return country;
    }
  }

  return null;
}

/**
 * 使用 AI 验证和增强买家信息
 */
async function verifyAndEnhanceBuyers(
  companies: BuyerCompany[],
  productData: any
): Promise<BuyerCompany[]> {
  if (companies.length === 0) return [];

  try {
    const companyNames = companies.map(c => c.name).join(', ');

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: '你是一个商业数据验证专家。验证这些公司是否真的是分销商/进口商/采购商。'
        },
        {
          role: 'user',
          content: `产品: ${productData.productName} (${productData.productCategory})
公司列表: ${companyNames}

请验证这些公司是否符合以下条件：
1. 是真实的分销商、进口商或采购商
2. 与产品类别相关
3. 规模足够大（至少50人）

返回 JSON 格式，包含每个公司的验证结果和可信度评分(0-100)`
        }
      ]
    });

    const msgContent = response.choices?.[0]?.message?.content;
    const content = typeof msgContent === 'string' ? msgContent : '';

    // 尝试解析 AI 响应中的 JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        const verification = JSON.parse(jsonMatch[0]);
        // 根据 AI 验证结果过滤公司
        return companies.filter(c => {
          const score = verification[c.name]?.score || 0;
          return score >= 60; // 只保留信度 >= 60 的公司
        });
      }
    } catch (e) {
      console.warn('⚠️ 无法解析 AI 验证结果');
    }
  } catch (error) {
    console.error(`❌ AI 验证错误: ${error}`);
  }

  return companies;
}

/**
 * 主搜索函数 - 聚合多个数据源
 */
export async function searchBuyers(query: BuyerSearchQuery): Promise<BuyerCompany[]> {
  console.log(`🔍 开始搜索买家: ${query.productName}`);

  const allResults: BuyerCompany[] = [];

  // 1. Serper 搜索（全球）
  console.log('📍 使用 Serper 搜索...');
  const serperResults = await searchWithSerper(query);
  allResults.push(...serperResults);
  console.log(`   ✅ 获取 ${serperResults.length} 个结果`);

  // 2. Google Places 搜索（非中国国家）
  console.log('📍 使用 Google Places 搜索...');
  const googleResults = await searchWithGooglePlaces(query);
  allResults.push(...googleResults);
  console.log(`   ✅ 获取 ${googleResults.length} 个结果`);

  // 3. 高德地图搜索（仅中国）
  console.log('📍 使用高德地图搜索...');
  const amapResults = await searchWithAMap(query);
  allResults.push(...amapResults);
  console.log(`   ✅ 获取 ${amapResults.length} 个结果`);

  // 4. 去重
  let uniqueResults = Array.from(
    new Map(allResults.map(c => [c.name + c.country, c])).values()
  );

  console.log(`📊 总共获取 ${uniqueResults.length} 个唯一买家`);

  // 5. 如果数据不足，使用 Kimi AI 联网搜索补充
  if (uniqueResults.length < 10) {
    console.log(`⚠️ 数据不足 (${uniqueResults.length}/10)，使用 Kimi AI 联网搜索补充...`);
    try {
      const kimiResults = await searchWithKimiAI(query);
      console.log(`   ✅ Kimi AI 获取 ${kimiResults.length} 个结果`);
      
      // 合并结果
      allResults.push(...kimiResults);
      uniqueResults = Array.from(
        new Map(allResults.map(c => [c.name + c.country, c])).values()
      );
      
      console.log(`📊 补充后总计 ${uniqueResults.length} 个买家`);
    } catch (error) {
      console.error(`❌ Kimi AI 补充失败: ${error}`);
    }
  }

  return uniqueResults;
}

/**
 * 为买家匹配产品
 */
export async function matchBuyersWithProduct(
  buyers: BuyerCompany[],
  productData: any,
  buyerProfile: any
): Promise<Array<{ company: BuyerCompany; matchScore: number; reason: string }>> {
  if (buyers.length === 0) return [];

  try {
    const buyersList = buyers
      .map(b => `${b.name} (${b.country}, ${b.source})`)
      .join('\n');

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: '你是一个商业匹配专家。为买家和产品计算匹配度。'
        },
        {
          role: 'user',
          content: `产品: ${productData.productName}
类别: ${productData.productCategory}
目标买家类型: ${buyerProfile.buyerTypes.join(', ')}

买家列表:
${buyersList}

为每个买家计算匹配度(0-100)，考虑：
1. 买家类型匹配度
2. 地理位置
3. 行业相关性

返回 JSON 格式: {买家名称: {score: 数字, reason: 字符串}}`
        }
      ]
    });

    const msgContent = response.choices?.[0]?.message?.content;
    const content = typeof msgContent === 'string' ? msgContent : '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const matches = JSON.parse(jsonMatch[0]);

        return buyers
          .map(buyer => {
            const match = matches[buyer.name] || { score: 50, reason: '基础匹配' };
            return {
              company: buyer,
              matchScore: Math.min(100, Math.max(0, match.score || 50)),
              reason: match.reason || '无法确定原因'
            };
          })
          .sort((a, b) => b.matchScore - a.matchScore);
      }
    } catch (e) {
      console.warn('⚠️ 无法解析匹配结果');
    }
  } catch (error) {
    console.error(`❌ 匹配错误: ${error}`);
  }

  // 返回默认匹配
  return buyers.map(buyer => ({
    company: buyer,
    matchScore: 70,
    reason: '默认匹配'
  }));
}
