import { invokeKimiLLM } from "./kimi-llm";

/**
 * 房产 AI 分析结果接口
 */
export interface PropertyAnalysisResult {
  tags: string[]; // AI 提取的标签（海景、学区、高回报等）
  matchProfile: {
    propertyType: string;
    priceRange: { min: number; max: number };
    location: string;
    keyFeatures: string[];
    targetBuyerProfile: string;
    investmentPotential: string;
    riskFactors: string[];
  };
  analysis: string; // 详细分析文本
}

/**
 * 分析房产需求或房源，提取结构化标签和匹配画像
 * @param description 用户输入的房产需求或房源描述
 * @param images 可选的房产图片 URL 数组
 * @returns 结构化的房产分析结果
 */
export async function analyzePropertyDescription(
  description: string,
  images?: string[]
): Promise<PropertyAnalysisResult> {
  try {
    // 构建 LLM 提示词
    const systemPrompt = `你是一个房产投资专家。分析用户提供的房产需求或房源描述，提取关键信息并生成结构化的匹配画像。

返回 JSON 格式的结果，包含：
1. tags: 房产标签数组（如"海景"、"学区"、"高回报"、"新建"、"豪华"等）
2. matchProfile: 结构化匹配画像，包含：
   - propertyType: 房产类型（住宅/商业/土地等）
   - priceRange: 价格范围 {min, max}
   - location: 位置
   - keyFeatures: 关键特征列表
   - targetBuyerProfile: 目标买家画像描述
   - investmentPotential: 投资潜力评估
   - riskFactors: 风险因素列表
3. analysis: 详细的分析文本

确保返回有效的 JSON 格式。`;

    const userPrompt = `请分析以下房产信息并提取结构化数据：\n\n${description}${
      images && images.length > 0
        ? `\n\n房产图片：${images.join(", ")}`
        : ""
    }`;

    // 调用 Kimi LLM
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const response = await invokeKimiLLM(messages);

    // 解析响应
    let analysisText = "";
    if (response.choices && response.choices[0]) {
      const choice = response.choices[0];
      analysisText = choice.message.content || "";
    }

    // 尝试从响应中提取 JSON
    let result: PropertyAnalysisResult;
    try {
      // 查找 JSON 对象
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      // 如果 JSON 解析失败，使用默认值
      console.warn(
        "[Property Analysis] Failed to parse LLM response as JSON, using defaults"
      );
      result = generateDefaultPropertyAnalysis(description);
    }

    return result;
  } catch (error) {
    console.error("[Property Analysis] Error:", error);
    // 返回默认分析结果
    return generateDefaultPropertyAnalysis(description);
  }
}

/**
 * 生成默认的房产分析结果（当 AI 分析失败时使用）
 */
function generateDefaultPropertyAnalysis(
  description: string
): PropertyAnalysisResult {
  // 简单的关键词匹配来提取信息
  const lowerDesc = description.toLowerCase();

  const tags: string[] = [];
  if (lowerDesc.includes("海") || lowerDesc.includes("ocean") || lowerDesc.includes("beach"))
    tags.push("海景");
  if (
    lowerDesc.includes("学区") ||
    lowerDesc.includes("school") ||
    lowerDesc.includes("education")
  )
    tags.push("学区");
  if (
    lowerDesc.includes("投资") ||
    lowerDesc.includes("investment") ||
    lowerDesc.includes("roi")
  )
    tags.push("投资潜力");
  if (lowerDesc.includes("新") || lowerDesc.includes("new") || lowerDesc.includes("modern"))
    tags.push("新建");
  if (
    lowerDesc.includes("豪华") ||
    lowerDesc.includes("luxury") ||
    lowerDesc.includes("premium")
  )
    tags.push("豪华");
  if (lowerDesc.includes("商业") || lowerDesc.includes("commercial"))
    tags.push("商业");
  if (lowerDesc.includes("出租") || lowerDesc.includes("rental"))
    tags.push("出租");

  if (tags.length === 0) {
    tags.push("住宅", "投资机会");
  }

  return {
    tags,
    matchProfile: {
      propertyType: lowerDesc.includes("商业") ? "商业" : "住宅",
      priceRange: { min: 100000, max: 1000000 },
      location: "全球",
      keyFeatures: tags,
      targetBuyerProfile: "寻求房产投资或自住的国际买家",
      investmentPotential: "中等到高",
      riskFactors: ["市场波动", "汇率风险"],
    },
    analysis: `房产分析：${description.substring(0, 200)}...`,
  };
}

/**
 * 计算房产匹配度
 * @param submissionProfile 用户提交的房产需求/房源的匹配画像
 * @param matchedProperty 搜索到的房产信息
 * @returns 匹配度评分（0-100）
 */
export function calculatePropertyMatchScore(
  submissionProfile: any,
  matchedProperty: any
): number {
  let score = 50; // 基础分数

  // 位置匹配
  if (
    submissionProfile.location &&
    matchedProperty.location &&
    submissionProfile.location
      .toLowerCase()
      .includes(matchedProperty.location.toLowerCase())
  ) {
    score += 15;
  }

  // 价格范围匹配
  if (
    submissionProfile.priceRange &&
    matchedProperty.price >= submissionProfile.priceRange.min &&
    matchedProperty.price <= submissionProfile.priceRange.max
  ) {
    score += 20;
  }

  // 房产类型匹配
  if (
    submissionProfile.propertyType &&
    matchedProperty.propertyType &&
    submissionProfile.propertyType === matchedProperty.propertyType
  ) {
    score += 10;
  }

  // 卧室数匹配
  if (
    submissionProfile.bedrooms &&
    matchedProperty.bedrooms &&
    Math.abs(submissionProfile.bedrooms - matchedProperty.bedrooms) <= 1
  ) {
    score += 5;
  }

  // 投资回报率匹配
  if (submissionProfile.expectedROI && matchedProperty.roi) {
    if (matchedProperty.roi >= submissionProfile.expectedROI) {
      score += 15;
    } else if (matchedProperty.roi >= submissionProfile.expectedROI * 0.8) {
      score += 10;
    }
  }

  // 标签匹配
  if (submissionProfile.keyFeatures && matchedProperty.tags) {
    const matchedTags = submissionProfile.keyFeatures.filter((tag: string) =>
      matchedProperty.tags.some((t: string) =>
        t.toLowerCase().includes(tag.toLowerCase())
      )
    );
    if (matchedTags.length > 0) {
      score += Math.min(matchedTags.length * 5, 15);
    }
  }

  return Math.min(score, 100);
}
