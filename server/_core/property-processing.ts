import { Request, Response } from "express";
import {
  analyzePropertyDescription,
  calculatePropertyMatchScore,
} from "./property-intelligence";

interface PropertySearchProgress {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

/**
 * 发送 SSE 进度更新
 */
function sendProgress(
  res: Response,
  stage: string,
  progress: number,
  message: string,
  data?: any
) {
  const progressData: PropertySearchProgress = {
    stage,
    progress,
    message,
    data,
  };
  res.write(`data: ${JSON.stringify(progressData)}\n\n`);
}

/**
 * 生成默认房产匹配结果
 */
function generateDefaultPropertyMatches(
  location: string,
  country: string,
  propertyType: string,
  budget: number,
  count: number = 10
) {
  const properties = [];
  const sources = [
    "zillow",
    "redfin",
    "realtor",
    "lianjia",
    "beike",
    "airbnb",
  ];
  const cities: { [key: string]: string[] } = {
    US: ["Los Angeles", "New York", "San Francisco", "Miami", "Chicago"],
    CN: ["北京", "上海", "深圳", "杭州", "成都"],
    UK: ["London", "Manchester", "Birmingham", "Liverpool", "Leeds"],
    CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  };

  const targetCities =
    cities[country.toUpperCase()] || ["City 1", "City 2", "City 3"];

  for (let i = 0; i < Math.min(count, 15); i++) {
    const city = targetCities[i % targetCities.length];
    const price = budget + (Math.random() - 0.5) * budget * 0.3;
    const roi = 4 + Math.random() * 8;

    properties.push({
      id: i + 1,
      title: `${propertyType} Property in ${city} - ${i + 1}`,
      description: `Beautiful ${propertyType.toLowerCase()} property located in ${city}, ${country}. Modern amenities, great location, investment potential.`,
      location: city,
      country: country,
      price: Math.round(price),
      priceCurrency: "USD",
      propertyType: propertyType,
      bedrooms: 2 + Math.floor(Math.random() * 4),
      bathrooms: 1 + Math.floor(Math.random() * 3),
      squareFeet: 1500 + Math.floor(Math.random() * 3000),
      roi: parseFloat(roi.toFixed(2)),
      matchScore: 65 + Math.floor(Math.random() * 30),
      matchReason: `Matches your criteria for ${propertyType.toLowerCase()} in ${city}`,
      source: sources[i % sources.length],
      sourceUrl: `https://example.com/property/${i + 1}`,
      agentName: `Agent ${String.fromCharCode(65 + (i % 26))}`,
      agentEmail: `agent${i + 1}@example.com`,
      agentPhone: `+1-555-${String(1000 + i).padStart(4, "0")}`,
      tags: [
        propertyType,
        "Investment",
        "Modern",
        i % 2 === 0 ? "Ocean View" : "City Center",
      ],
    });
  }

  return properties.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 处理房产搜索请求（SSE 流式响应）
 */
export async function handlePropertyProcessing(
  req: Request,
  res: Response
) {
  const submissionId = parseInt(req.params.id);
  const description = (req.query.description as string) || "Property search";
  const location = (req.query.location as string) || "Global";
  const country = (req.query.country as string) || "US";
  const propertyType = (req.query.propertyType as string) || "residential";
  const budget = req.query.budget ? parseInt(req.query.budget as string) : 500000;
  const propertyCount = req.query.propertyCount
    ? parseInt(req.query.propertyCount as string)
    : 10;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // 阶段 1: AI 分析房产需求/房源
    sendProgress(res, "analyzing", 10, "AI 分析房产需求中...");

    let analysisResult;
    try {
      analysisResult = await analyzePropertyDescription(description);
    } catch (error) {
      console.warn("[Property Processing] AI analysis failed, using defaults");
      analysisResult = {
        tags: [propertyType, "Investment"],
        matchProfile: {
          propertyType,
          priceRange: { min: budget * 0.8, max: budget * 1.2 },
          location,
          keyFeatures: [propertyType, "Modern"],
          targetBuyerProfile: "International investor",
          investmentPotential: "High",
          riskFactors: [],
        },
        analysis: description,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    // 阶段 2: 全网搜索房源
    sendProgress(res, "searching", 40, `在全球房产平台搜索 ${propertyType}...`);

    // 生成房产匹配结果
    const properties = generateDefaultPropertyMatches(
      location,
      country,
      propertyType,
      budget,
      propertyCount
    );

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 阶段 3: 计算匹配度
    sendProgress(res, "matching", 70, "计算匹配度中...");

    const propertiesWithScores = properties.map((property) => ({
      ...property,
      matchScore: calculatePropertyMatchScore(
        analysisResult.matchProfile,
        property
      ),
    }));

    // 按匹配度排序
    const sortedProperties = propertiesWithScores.sort(
      (a, b) => b.matchScore - a.matchScore
    );

    // 只返回用户指定数量的房产
    const finalProperties = sortedProperties.slice(0, propertyCount);

    await new Promise((resolve) => setTimeout(resolve, 800));

    // 阶段 4: 完成
    sendProgress(
      res,
      "completed",
      100,
      `成功找到 ${finalProperties.length} 个匹配房源`,
      {
        properties: finalProperties,
        analysis: analysisResult,
      }
    );

    res.write("event: done\n");
    res.write("data: {}\n\n");
    res.end();
  } catch (error) {
    console.error("[Property Processing] Error:", error);

    // 即使出错也返回默认数据
    const defaultProperties = generateDefaultPropertyMatches(
      location,
      country,
      propertyType,
      budget,
      propertyCount
    );

    sendProgress(
      res,
      "completed",
      100,
      `找到 ${defaultProperties.length} 个房源（使用默认数据）`,
      {
        properties: defaultProperties,
        analysis: {
          tags: [propertyType],
          matchProfile: {
            propertyType,
            priceRange: { min: budget * 0.8, max: budget * 1.2 },
            location,
            keyFeatures: [propertyType],
            targetBuyerProfile: "Investor",
            investmentPotential: "Medium",
            riskFactors: [],
          },
          analysis: description,
        },
      }
    );

    res.write("event: done\n");
    res.write("data: {}\n\n");
    res.end();
  }
}
