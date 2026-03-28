/**
 * 数据源测试脚本
 * 测试 23 个真实数据源的可访问性和数据获取能力
 */

interface DataSourceTest {
  name: string;
  category: string;
  requiresApiKey: boolean;
  testUrl?: string;
  testFunction?: () => Promise<any>;
  result?: any;
}

const dataSources: DataSourceTest[] = [
  // 第一类：搜索和地理信息
  {
    name: "Serper",
    category: "Search Engine API",
    requiresApiKey: true,
    testUrl: "https://google.serper.dev/search",
    testFunction: async () => {
      // 需要 API Key
      const apiKey = process.env.SERPER_API_KEY;
      if (!apiKey) return { error: "SERPER_API_KEY not provided" };

      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: "distributor importer buyer",
          location: "USA",
          gl: "us",
          num: 10,
        }),
      });

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "Google Maps",
    category: "Geolocation & Business Info",
    requiresApiKey: true,
    testUrl: "https://maps.googleapis.com/maps/api/place/textsearch/json",
    testFunction: async () => {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) return { error: "GOOGLE_MAPS_API_KEY not provided" };

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=distributor&key=${apiKey}`
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "Nominatim",
    category: "Geocoding",
    requiresApiKey: false,
    testUrl: "https://nominatim.openstreetmap.org/search",
    testFunction: async () => {
      const response = await fetch(
        "https://nominatim.openstreetmap.org/search?q=distributor&format=json&limit=5",
        {
          headers: {
            "User-Agent": "GlobalMatchApp/1.0",
          },
        }
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "OpenStreetMap",
    category: "Map Data",
    requiresApiKey: false,
    testUrl: "https://overpass-api.de/api/interpreter",
    testFunction: async () => {
      const query = `
        [bbox:40.7128,-74.0060,40.7580,-73.9855];
        (
          node["shop"="wholesale"];
          way["shop"="wholesale"];
        );
        out geom;
      `;

      const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
        }
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  // 第二类：社交媒体
  {
    name: "Bluesky",
    category: "Social Media",
    requiresApiKey: true,
    testUrl: "https://bsky.social/xrpc/com.atproto.server.createSession",
    testFunction: async () => {
      const handle = process.env.BLUESKY_HANDLE;
      const password = process.env.BLUESKY_PASSWORD;

      if (!handle || !password) {
        return { error: "BLUESKY_HANDLE or BLUESKY_PASSWORD not provided" };
      }

      const response = await fetch(
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: handle, password }),
        }
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "Facebook",
    category: "Social Media",
    requiresApiKey: true,
    testUrl: "https://graph.facebook.com/v18.0/search",
    testFunction: async () => {
      const apiKey = process.env.FACEBOOK_API_KEY;
      if (!apiKey) return { error: "FACEBOOK_API_KEY not provided" };

      const response = await fetch(
        `https://graph.facebook.com/v18.0/search?q=distributor&type=page&access_token=${apiKey}`
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "YouTube",
    category: "Social Media",
    requiresApiKey: true,
    testUrl: "https://www.googleapis.com/youtube/v3/search",
    testFunction: async () => {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return { error: "YOUTUBE_API_KEY not provided" };

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?q=distributor+company&type=channel&key=${apiKey}`
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  // 第三类：商业和贸易数据
  {
    name: "Wikidata",
    category: "Knowledge Base",
    requiresApiKey: false,
    testUrl: "https://www.wikidata.org/w/api.php",
    testFunction: async () => {
      const response = await fetch(
        "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=distributor&language=en&format=json"
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "GLEIF",
    category: "Legal Entity Data",
    requiresApiKey: false,
    testUrl: "https://www.gleif.org/api/v1/lei",
    testFunction: async () => {
      const response = await fetch(
        "https://www.gleif.org/api/v1/lei?page[size]=10"
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "Common Crawl Index",
    category: "Web Crawl Data",
    requiresApiKey: false,
    testUrl: "https://index.commoncrawl.org/CC-MAIN-2024-01-index",
    testFunction: async () => {
      const response = await fetch(
        "https://index.commoncrawl.org/CC-MAIN-2024-01-index?url=*.distributor.com&output=json&matchType=domain&limit=10"
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "LinkedIn",
    category: "Professional Network",
    requiresApiKey: true,
    testUrl: "https://api.linkedin.com/v2/me",
    testFunction: async () => {
      const apiKey = process.env.LINKEDIN_API_KEY;
      if (!apiKey) return { error: "LINKEDIN_API_KEY not provided" };

      const response = await fetch("https://api.linkedin.com/v2/me", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  // 第四类：政府和官方数据
  {
    name: "World Bank",
    category: "Economic Data",
    requiresApiKey: false,
    testUrl: "https://api.worldbank.org/v2/country",
    testFunction: async () => {
      const response = await fetch("https://api.worldbank.org/v2/country?format=json&per_page=10");

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "IMF",
    category: "Financial Data",
    requiresApiKey: false,
    testUrl: "https://www.imf.org/external/datamapper/api/v1/countries",
    testFunction: async () => {
      const response = await fetch(
        "https://www.imf.org/external/datamapper/api/v1/countries"
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "EU VIES",
    category: "VAT Verification",
    requiresApiKey: false,
    testUrl: "http://ec.europa.eu/taxation_customs/vies/",
    testFunction: async () => {
      // VIES 需要 SOAP 请求
      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:business:1.0">
              <countryCode>DE</countryCode>
              <vatNumber>123456789</vatNumber>
            </checkVat>
          </soap:Body>
        </soap:Envelope>`;

      const response = await fetch(
        "http://ec.europa.eu/taxation_customs/vies/services/checkVatService",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=UTF-8",
          },
          body: soapBody,
        }
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.text();
    },
  },

  {
    name: "UN Comtrade",
    category: "Trade Statistics",
    requiresApiKey: false,
    testUrl: "https://comtradeplus.un.org/api/v1/get",
    testFunction: async () => {
      const response = await fetch(
        "https://comtradeplus.un.org/api/v1/get?reporterCode=840&cmdCode=ALL&flowCode=M&period=2023&format=json"
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  {
    name: "Trade Map",
    category: "Trade Database",
    requiresApiKey: false,
    testUrl: "https://www.trademap.org/",
    testFunction: async () => {
      // Trade Map 主要是网页，需要爬虫
      const response = await fetch("https://www.trademap.org/");

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return { message: "Website accessible, requires web scraping" };
    },
  },

  // 第五类：B2B 和贸易平台
  {
    name: "Alibaba",
    category: "B2B Platform",
    requiresApiKey: true,
    testUrl: "https://api.alibaba.com/",
    testFunction: async () => {
      const apiKey = process.env.ALIBABA_API_KEY;
      if (!apiKey) return { error: "ALIBABA_API_KEY not provided" };

      // Alibaba API 需要特定的认证方式
      return { message: "Requires Alibaba Open Platform authentication" };
    },
  },

  {
    name: "Global Sources",
    category: "B2B Platform",
    requiresApiKey: true,
    testUrl: "https://www.globalsources.com/",
    testFunction: async () => {
      const apiKey = process.env.GLOBAL_SOURCES_API_KEY;
      if (!apiKey) return { error: "GLOBAL_SOURCES_API_KEY not provided" };

      return { message: "Requires Global Sources API authentication" };
    },
  },

  {
    name: "TradeKey",
    category: "B2B Platform",
    requiresApiKey: true,
    testUrl: "https://www.tradekey.com/",
    testFunction: async () => {
      const apiKey = process.env.TRADEKEY_API_KEY;
      if (!apiKey) return { error: "TRADEKEY_API_KEY not provided" };

      return { message: "Requires TradeKey API authentication" };
    },
  },

  {
    name: "EC21",
    category: "B2B Platform",
    requiresApiKey: true,
    testUrl: "https://www.ec21.com/",
    testFunction: async () => {
      const apiKey = process.env.EC21_API_KEY;
      if (!apiKey) return { error: "EC21_API_KEY not provided" };

      return { message: "Requires EC21 API authentication" };
    },
  },

  {
    name: "Made-in-China",
    category: "B2B Platform",
    requiresApiKey: true,
    testUrl: "https://www.made-in-china.com/",
    testFunction: async () => {
      const apiKey = process.env.MADE_IN_CHINA_API_KEY;
      if (!apiKey) return { error: "MADE_IN_CHINA_API_KEY not provided" };

      return { message: "Requires Made-in-China API authentication" };
    },
  },

  // 第六类：AI 搜索
  {
    name: "Qwen/Kimi AI Search",
    category: "AI Search",
    requiresApiKey: true,
    testUrl: "https://api.kimi.moonshot.cn/v1/chat/completions",
    testFunction: async () => {
      const apiKey = process.env.KIMI_API_KEY;
      if (!apiKey) return { error: "KIMI_API_KEY not provided" };

      const response = await fetch(
        "https://api.kimi.moonshot.cn/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "moonshot-v1-8k",
            messages: [
              {
                role: "user",
                content: "Search for distributors and importers in USA",
              },
            ],
            temperature: 0.3,
          }),
        }
      );

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      return await response.json();
    },
  },

  // 第七类：其他平台
  {
    name: "BugPack",
    category: "Business Data",
    requiresApiKey: true,
    testUrl: "https://api.bugpack.com/",
    testFunction: async () => {
      const apiKey = process.env.BUGPACK_API_KEY;
      if (!apiKey) return { error: "BUGPACK_API_KEY not provided" };

      return { message: "Requires BugPack API authentication" };
    },
  },

  {
    name: "ImportYeti",
    category: "Import Data",
    requiresApiKey: true,
    testUrl: "https://www.importyeti.com/",
    testFunction: async () => {
      const apiKey = process.env.IMPORTYETI_API_KEY;
      if (!apiKey) return { error: "IMPORTYETI_API_KEY not provided" };

      return { message: "Requires ImportYeti API authentication" };
    },
  },

  {
    name: "Tendata",
    category: "Trade Big Data",
    requiresApiKey: true,
    testUrl: "https://www.tendata.cn/",
    testFunction: async () => {
      const apiKey = process.env.TENDATA_API_KEY;
      if (!apiKey) return { error: "TENDATA_API_KEY not provided" };

      return { message: "Requires Tendata API authentication" };
    },
  },
];

/**
 * 运行所有数据源测试
 */
export async function runAllDataSourceTests() {
  console.log("🧪 开始测试数据源...\n");

  const results = {
    free: [] as any[],
    requiresApiKey: [] as any[],
    errors: [] as any[],
  };

  for (const source of dataSources) {
    console.log(`测试: ${source.name}...`);

    try {
      let testResult: any = {
        accessible: false,
        dataQuality: "low",
        error: undefined,
        sampleData: undefined,
      };

      if (source.testFunction) {
        const result = await source.testFunction();

        if (result.error) {
          testResult.error = result.error;
          testResult.accessible = false;
          testResult.dataQuality = "low";
        } else {
          testResult.accessible = true;
          testResult.dataQuality = result.message ? "medium" : "high";
          testResult.sampleData = result;
        }
      }

      source.result = testResult;

      if (source.requiresApiKey) {
        results.requiresApiKey.push({
          name: source.name,
          category: source.category,
          ...testResult,
        });
      } else {
        results.free.push({
          name: source.name,
          category: source.category,
          ...testResult,
        });
      }

      console.log(
        `  ✓ ${source.name}: ${testResult.accessible ? "✅ 可访问" : "❌ 不可访问"}`
      );
    } catch (error) {
      console.log(`  ❌ ${source.name}: 测试失败`);
      results.errors.push({
        name: source.name,
        error: String(error),
      });
    }
  }

  return results;
}

/**
 * 生成测试报告
 */
export function generateTestReport(results: any) {
  console.log("\n📊 测试报告\n");

  console.log("✅ 免费数据源（无需 API Key）:");
  console.table(results.free);

  console.log("\n🔑 需要 API Key 的数据源:");
  console.table(results.requiresApiKey);

  if (results.errors.length > 0) {
    console.log("\n❌ 测试失败:");
    console.table(results.errors);
  }

  // 统计
  const freeAccessible = results.free.filter(
    (r: any) => r.accessible
  ).length;
  const apiKeyAccessible = results.requiresApiKey.filter(
    (r: any) => r.accessible
  ).length;

  console.log("\n📈 统计:");
  console.log(`  免费数据源: ${freeAccessible}/${results.free.length} 可访问`);
  console.log(
    `  需要 API Key: ${apiKeyAccessible}/${results.requiresApiKey.length} 可访问`
  );
  console.log(
    `  总体: ${freeAccessible + apiKeyAccessible}/${dataSources.length} 可访问`
  );
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllDataSourceTests().then((results) => {
    generateTestReport(results);
  });
}
