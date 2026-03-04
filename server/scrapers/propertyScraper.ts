import axios from "axios";
import * as cheerio from "cheerio";

export interface PropertyListing {
  id: string;
  title: string;
  location: string;
  price: string;
  pricePerSqft?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  description: string;
  url: string;
  source: "zillow" | "redfin" | "lianjia" | "beike" | "duckduckgo";
  listingDate?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  imageUrl?: string;
}

/**
 * Zillow 房产搜索爬虫
 */
export async function scrapePropertiesFromZillow(
  location: string,
  limit: number = 10
): Promise<PropertyListing[]> {
  try {
    const url = `https://www.zillow.com/homes/for_sale/${encodeURIComponent(location)}/`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const properties: PropertyListing[] = [];

    $("article[data-zpid]").each((i, elem) => {
      if (i >= limit) return;

      const zpid = $(elem).attr("data-zpid");
      const title = $(elem).find("a[data-test='property-card-link']").text().trim();
      const url = $(elem).find("a[data-test='property-card-link']").attr("href") || "";
      const price = $(elem).find("[data-test='property-card-price']").text().trim();
      const beds = $(elem).find("[data-test='property-card-beds']").text();
      const baths = $(elem).find("[data-test='property-card-baths']").text();
      const sqft = $(elem).find("[data-test='property-card-sqft']").text();

      if (title && price) {
        properties.push({
          id: `zillow-${zpid}`,
          title,
          location,
          price,
          bedrooms: parseInt(beds) || undefined,
          bathrooms: parseInt(baths) || undefined,
          squareFeet: parseInt(sqft) || undefined,
          description: "",
          url: `https://www.zillow.com${url}`,
          source: "zillow",
        });
      }
    });

    return properties;
  } catch (error) {
    console.error("Zillow scraping error:", error);
    return [];
  }
}

/**
 * Redfin 房产搜索爬虫
 */
export async function scrapePropertiesFromRedfin(
  location: string,
  limit: number = 10
): Promise<PropertyListing[]> {
  try {
    const url = `https://www.redfin.com/homes-for-sale/${encodeURIComponent(location)}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const properties: PropertyListing[] = [];

    $("[data-testid='home-card']").each((i, elem) => {
      if (i >= limit) return;

      const titleElem = $(elem).find("a[data-testid='home-card-link']");
      const title = titleElem.attr("aria-label") || titleElem.text().trim();
      const url = titleElem.attr("href") || "";
      const price = $(elem).find("[data-testid='home-card-price']").text().trim();
      const details = $(elem).find("[data-testid='home-card-details']").text();

      if (title && price) {
        const [beds, baths, sqft] = parsePropertyDetails(details);

        properties.push({
          id: `redfin-${Date.now()}-${i}`,
          title,
          location,
          price,
          bedrooms: beds,
          bathrooms: baths,
          squareFeet: sqft,
          description: "",
          url: `https://www.redfin.com${url}`,
          source: "redfin",
        });
      }
    });

    return properties;
  } catch (error) {
    console.error("Redfin scraping error:", error);
    return [];
  }
}

/**
 * 链家网房产爬虫
 */
export async function scrapePropertiesFromLianjia(
  city: string,
  limit: number = 10
): Promise<PropertyListing[]> {
  try {
    const cityCode = getCityCodeForLianjia(city);
    const url = `https://${cityCode}.lianjia.com/ershoufang/`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const properties: PropertyListing[] = [];

    $("li.clear").each((i, elem) => {
      if (i >= limit) return;

      const titleElem = $(elem).find("a.title");
      const title = titleElem.text().trim();
      const url = titleElem.attr("href") || "";
      const price = $(elem).find(".totalPrice .num").text().trim();
      const priceUnit = $(elem).find(".totalPrice .unit").text().trim();
      const unitPrice = $(elem).find(".unitPrice .num").text().trim();
      const info = $(elem).find(".info").text();
      const agentName = $(elem).find(".dealerinfo .name").text().trim();
      const agentPhone = $(elem).find(".dealerinfo .phone").attr("data-phone") || "";

      if (title && price) {
        properties.push({
          id: `lianjia-${Date.now()}-${i}`,
          title,
          location: city,
          price: `${price}${priceUnit}`,
          pricePerSqft: unitPrice,
          description: info,
          url: `https://${cityCode}.lianjia.com${url}`,
          source: "lianjia",
          agentName,
          agentPhone,
        });
      }
    });

    return properties;
  } catch (error) {
    console.error("链家网 scraping error:", error);
    return [];
  }
}

/**
 * 贝壳找房爬虫
 */
export async function scrapePropertiesFromBeike(
  city: string,
  limit: number = 10
): Promise<PropertyListing[]> {
  try {
    const cityCode = getCityCodeForBeike(city);
    const url = `https://${cityCode}.ke.com/ershoufang/`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const properties: PropertyListing[] = [];

    $("li.clear").each((i, elem) => {
      if (i >= limit) return;

      const titleElem = $(elem).find("a.title");
      const title = titleElem.text().trim();
      const url = titleElem.attr("href") || "";
      const price = $(elem).find(".totalPrice .num").text().trim();
      const priceUnit = $(elem).find(".totalPrice .unit").text().trim();
      const info = $(elem).find(".info").text();
      const agentName = $(elem).find(".dealerinfo .name").text().trim();

      if (title && price) {
        properties.push({
          id: `beike-${Date.now()}-${i}`,
          title,
          location: city,
          price: `${price}${priceUnit}`,
          description: info,
          url: `https://${cityCode}.ke.com${url}`,
          source: "beike",
          agentName,
        });
      }
    });

    return properties;
  } catch (error) {
    console.error("贝壳找房 scraping error:", error);
    return [];
  }
}

/**
 * DuckDuckGo 房产搜索
 */
export async function scrapePropertiesFromDuckDuckGo(
  location: string,
  limit: number = 10
): Promise<PropertyListing[]> {
  try {
    const searchQuery = `properties for sale in ${location}`;
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const properties: PropertyListing[] = [];

    $(".result").each((i, elem) => {
      if (i >= limit) return;

      const title = $(elem).find(".result__title").text().trim();
      const url = $(elem).find(".result__url").attr("href") || "";
      const snippet = $(elem).find(".result__snippet").text().trim();

      if (title && snippet.includes("property") || snippet.includes("home")) {
        properties.push({
          id: `duckduckgo-${Date.now()}-${i}`,
          title,
          location,
          price: extractPrice(snippet),
          description: snippet,
          url,
          source: "duckduckgo",
        });
      }
    });

    return properties;
  } catch (error) {
    console.error("DuckDuckGo property scraping error:", error);
    return [];
  }
}

/**
 * 聚合多个数据源的房产
 */
export async function aggregateProperties(
  location: string,
  country: "US" | "CN" = "US",
  limit: number = 20
): Promise<PropertyListing[]> {
  const allProperties: PropertyListing[] = [];

  try {
    if (country === "US") {
      // 美国房产来源
      const [zillowProps, redfinProps, duckProps] = await Promise.all([
        scrapePropertiesFromZillow(location, limit / 3),
        scrapePropertiesFromRedfin(location, limit / 3),
        scrapePropertiesFromDuckDuckGo(location, limit / 3),
      ]);

      allProperties.push(...zillowProps, ...redfinProps, ...duckProps);
    } else if (country === "CN") {
      // 中国房产来源
      const [lianjiaProps, beikeProps] = await Promise.all([
        scrapePropertiesFromLianjia(location, limit / 2),
        scrapePropertiesFromBeike(location, limit / 2),
      ]);

      allProperties.push(...lianjiaProps, ...beikeProps);
    }
  } catch (error) {
    console.error("Property aggregation error:", error);
  }

  // 去重和排序
  return deduplicateProperties(allProperties).slice(0, limit);
}

/**
 * 去重房产列表
 */
function deduplicateProperties(properties: PropertyListing[]): PropertyListing[] {
  const seen = new Set<string>();
  return properties.filter((prop) => {
    const key = `${prop.title}-${prop.price}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 从文本中提取价格
 */
function extractPrice(text: string): string {
  const match = text.match(/\$[\d,]+|\¥[\d,]+|￥[\d,]+/);
  return match ? match[0] : "Price not available";
}

/**
 * 解析房产详情
 */
function parsePropertyDetails(details: string): [number | undefined, number | undefined, number | undefined] {
  const bedMatch = details.match(/(\d+)\s*(?:bed|br)/i);
  const bathMatch = details.match(/(\d+)\s*(?:bath|ba)/i);
  const sqftMatch = details.match(/(\d+)\s*(?:sqft|sq ft|sf)/i);

  return [
    bedMatch ? parseInt(bedMatch[1]) : undefined,
    bathMatch ? parseInt(bathMatch[1]) : undefined,
    sqftMatch ? parseInt(sqftMatch[1]) : undefined,
  ];
}

/**
 * 获取链家网的城市代码
 */
function getCityCodeForLianjia(city: string): string {
  const cityMap: Record<string, string> = {
    beijing: "bj",
    shanghai: "sh",
    shenzhen: "sz",
    guangzhou: "gz",
    hangzhou: "hz",
    chengdu: "cd",
    wuhan: "wh",
    xian: "xa",
    nanjing: "nj",
    suzhou: "su",
  };

  return cityMap[city.toLowerCase()] || "bj"; // 默认北京
}

/**
 * 获取贝壳找房的城市代码
 */
function getCityCodeForBeike(city: string): string {
  const cityMap: Record<string, string> = {
    beijing: "bj",
    shanghai: "sh",
    shenzhen: "sz",
    guangzhou: "gz",
    hangzhou: "hz",
    chengdu: "cd",
    wuhan: "wh",
    xian: "xa",
    nanjing: "nj",
    suzhou: "su",
  };

  return cityMap[city.toLowerCase()] || "bj"; // 默认北京
}
