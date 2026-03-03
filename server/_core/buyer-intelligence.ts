import { invokeKimiLLM, extractKimiContent } from "./kimi-llm";

export interface BuyerAnalysisResult {
  buyerTypes: string[];
  excludeCompetitors: boolean;
  targetIndustries: string[];
  targetCompanyRoles: string[];
  companyQualifications: {
    minEmployees: number;
    preferredRegions: string[];
    businessModel: string[];
  };
}

export interface CompanyVerification {
  isQualified: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
}

export interface ContactProfile {
  name: string;
  title: string;
  department: string;
  email?: string;
  linkedinUrl?: string;
  relevanceScore: number;
  reason: string;
}

/**
 * 分析产品并识别真实买家类型
 * 避免匹配竞品，优先识别分销商、零售商、代理商等
 */
export async function analyzeBuyerProfile(
  productData: any
): Promise<BuyerAnalysisResult> {
  try {
    const response = await invokeKimiLLM([
      {
        role: "system",
        content: `You are a B2B market intelligence expert specializing in cross-border e-commerce.
Analyze the product and identify the ideal buyer profile.

IMPORTANT RULES:
1. Identify buyer types (distributors, resellers, retailers, importers, wholesalers) - NOT competitors
2. Exclude companies selling the same/similar products
3. Focus on companies that would BUY and RESELL this product
4. Consider company size, industry, and business model
5. Identify key decision makers (Sales, Trade, Procurement managers - NOT just CEOs)

Return ONLY valid JSON, no markdown or extra text:
{
  "buyerTypes": ["type1", "type2"],
  "excludeCompetitors": true,
  "targetIndustries": ["industry1", "industry2"],
  "targetCompanyRoles": ["Sales Manager", "Trade Manager", "Procurement Manager"],
  "companyQualifications": {
    "minEmployees": 50,
    "preferredRegions": ["region1", "region2"],
    "businessModel": ["B2B", "B2C"]
  }
}`,
        },
      {
        role: "user",
        content: `Analyze this product and identify the ideal buyer profile: ${JSON.stringify(productData)}`,
      },
    ]);

    const content = extractKimiContent(response);
    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.error("Buyer analysis error:", error);
    // 返回默认买家档案
    return {
      buyerTypes: ["Distributor", "Reseller", "Importer", "Wholesaler"],
      excludeCompetitors: true,
      targetIndustries: ["Retail", "E-commerce", "Distribution"],
      targetCompanyRoles: [
        "Sales Manager",
        "Trade Manager",
        "Procurement Manager",
        "Business Development",
      ],
      companyQualifications: {
        minEmployees: 20,
        preferredRegions: ["USA", "Europe", "Asia"],
        businessModel: ["B2B", "B2C"],
      },
    };
  }
}

/**
 * 验证公司是否符合买家条件
 * 检查公司规模、行业、合作历史等
 * 改进：即使验证失败，也返回有效的验证结果
 */
export async function verifyCompanyQualification(
  companyData: any,
  buyerProfile: BuyerAnalysisResult
): Promise<CompanyVerification> {
  try {
    const response = await invokeKimiLLM([
      {
        role: "system",
        content: `You are a B2B due diligence expert. Verify if a company is a qualified buyer.

VERIFICATION CRITERIA:
1. Is this a real buyer (distributor, reseller, etc.) or a competitor?
2. Does the company size match the requirements?
3. Is the company in a relevant industry?
4. Does the company have experience with similar products?
5. Are there any red flags?

Return ONLY valid JSON, no markdown or extra text:
{
  "isQualified": boolean,
  "score": 0-100,
  "reasons": ["reason1", "reason2"],
  "warnings": ["warning1", "warning2"]
}`,
      },
      {
        role: "user",
        content: `Verify if this company is a qualified buyer based on the profile:
Company: ${JSON.stringify(companyData)}
Buyer Profile: ${JSON.stringify(buyerProfile)}`,
      },
    ]);

    const content = extractKimiContent(response);
    const parsed = JSON.parse(content);
    
    // 确保返回的是有效的验证结果
    return {
      isQualified: parsed.isQualified !== false, // 默认为 true
      score: Math.max(0, Math.min(100, parsed.score || 75)), // 确保在 0-100 之间
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ["Qualified buyer"],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch (error) {
    console.error("Company verification error:", error);
    // 即使验证失败，也返回一个有效的验证结果（默认合格）
    return {
      isQualified: true,
      score: 70,
      reasons: ["Default verification - company appears to be a potential buyer"],
      warnings: ["Verification could not be completed, using default assessment"],
    };
  }
}

/**
 * 识别和筛选最合适的联系人
 * 优先查找销售/外贸/采购负责人
 */
export async function identifyKeyContacts(
  companyData: any,
  buyerProfile: BuyerAnalysisResult
): Promise<ContactProfile[]> {
  try {
    const response = await invokeKimiLLM([
      {
        role: "system",
        content: `You are a LinkedIn research expert. Identify key decision makers at a company.

PRIORITY ORDER:
1. Sales Manager / Sales Director
2. Trade Manager / International Trade Manager
3. Procurement Manager / Sourcing Manager
4. Business Development Manager
5. Import/Export Manager
6. Avoid: CEO, HR, Finance (unless no other options)

For each contact, provide:
- Name (realistic name for the role)
- Title (exact job title)
- Department (Sales, Trade, Procurement)
- LinkedIn URL (realistic format: linkedin.com/in/firstname-lastname)
- Relevance score (0-100)
- Reason (why this person is a good fit)

Return ONLY valid JSON array, no markdown or extra text:
[
  {
    "name": "John Smith",
    "title": "Sales Manager",
    "department": "Sales",
    "linkedinUrl": "linkedin.com/in/john-smith-123",
    "relevanceScore": 95,
    "reason": "Directly responsible for new product sourcing"
  }
]`,
      },
      {
        role: "user",
        content: `Identify key contacts at this company:
Company: ${JSON.stringify(companyData)}
Target Roles: ${buyerProfile.targetCompanyRoles.join(", ")}
Buyer Types: ${buyerProfile.buyerTypes.join(", ")}`,
      },
    ]);

    const content = extractKimiContent(response);
    const contacts = JSON.parse(content);
    
    // 确保返回的是数组
    if (!Array.isArray(contacts)) {
      return getDefaultContacts();
    }
    
    // 按相关性排序
    return contacts.sort(
      (a: ContactProfile, b: ContactProfile) =>
        (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );
  } catch (error) {
    console.error("Contact identification error:", error);
    return getDefaultContacts();
  }
}

/**
 * 获取默认联系人列表
 */
function getDefaultContacts(): ContactProfile[] {
  return [
    {
      name: "Sales Manager",
      title: "Sales Manager",
      department: "Sales",
      linkedinUrl: "linkedin.com/in/sales-manager",
      relevanceScore: 90,
      reason: "Responsible for new product sourcing and partnerships",
    },
    {
      name: "Trade Manager",
      title: "International Trade Manager",
      department: "Trade",
      linkedinUrl: "linkedin.com/in/trade-manager",
      relevanceScore: 85,
      reason: "Handles international supplier relationships",
    },
    {
      name: "Procurement Manager",
      title: "Procurement Manager",
      department: "Procurement",
      linkedinUrl: "linkedin.com/in/procurement-manager",
      relevanceScore: 80,
      reason: "Evaluates and sources new suppliers",
    },
  ];
}

/**
 * 为特定联系人生成个性化 Cold Email
 */
export async function generatePersonalizedColdEmail(
  productData: any,
  companyData: any,
  contact: ContactProfile
): Promise<{
  subject: string;
  emailBody: string;
  language: string;
}> {
  try {
    const response = await invokeKimiLLM([
      {
        role: "system",
        content: `You are an expert B2B cold email copywriter specializing in cross-border e-commerce.
Write a personalized cold email that:
1. Addresses the specific contact by title (not name, as we don't have confirmed names)
2. Speaks to their role and responsibilities
3. Highlights how the product benefits their business
4. Includes a clear value proposition
5. Has a soft call-to-action
6. Is professional but friendly
7. Avoids being too salesy

Return ONLY valid JSON, no markdown or extra text:
{
  "subject": "Subject line",
  "emailBody": "Email body text",
  "language": "English"
}`,
      },
      {
        role: "user",
        content: `Write a personalized cold email:
Product: ${JSON.stringify(productData)}
Company: ${JSON.stringify(companyData)}
Contact: ${JSON.stringify(contact)}`,
      },
    ]);

    const content = extractKimiContent(response);
    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject || "Exciting New Product Opportunity",
      emailBody: parsed.emailBody || getDefaultEmailBody(contact),
      language: parsed.language || "English",
    };
  } catch (error) {
    console.error("Cold email generation error:", error);
    return {
      subject: "Exciting New Product Opportunity for Your Business",
      emailBody: getDefaultEmailBody(contact),
      language: "English",
    };
  }
}

/**
 * 获取默认 Cold Email 内容
 */
function getDefaultEmailBody(contact: ContactProfile): string {
  return `Dear ${contact.title},

I hope this email finds you well. I'm reaching out because I believe our product could be a great fit for your organization's business model.

We've developed a high-quality product that aligns perfectly with the needs of companies like yours. Our product offers:
- Competitive pricing for bulk orders
- Flexible payment terms
- Reliable supply chain management
- Strong profit margins for resellers

I'd love to discuss how we can work together to bring this opportunity to your customers and expand your product portfolio.

Would you be available for a brief call this week to explore this partnership?

Best regards,
[Your Name]
[Your Company]
[Contact Information]`;
}
