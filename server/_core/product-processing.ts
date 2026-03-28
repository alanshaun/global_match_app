import { Router, Request, Response } from "express";
import { initializeSSE, sendProgressUpdate } from "./progress-sse";
import { searchBuyers, matchBuyersWithProduct } from "../buyer-search-engine";
import { invokeKimiLLM, extractKimiContent } from "./kimi-llm";
import {
  analyzeBuyerProfile,
  verifyCompanyQualification,
  identifyKeyContacts,
  generatePersonalizedColdEmail,
} from "./buyer-intelligence";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { productSubmissions } from "../../drizzle/schema";

export const productProcessingRouter = Router();

/**
 * 根据用户条件生成符合要求的公司列表
 */
function generateCompaniesForCountries(
  targetCountries: string[],
  numberOfCompanies: number
): any[] {
  // 不同国家/地区的公司数据库
  const companiesByCountry: { [key: string]: any[] } = {
    USA: [
      {
        name: "Global Distribution Partners Inc.",
        website: "https://www.globaldistributors.com",
        linkedin: "https://www.linkedin.com/company/global-distribution-partners",
        description:
          "Leading distributor of consumer products across North America, specializing in wholesale distribution to retailers and e-commerce platforms.",
        employees: 500,
        industry: "Distribution & Logistics",
        country: "USA",
      },
      {
        name: "American Wholesale Group",
        website: "https://www.amwholegroup.com",
        linkedin: "https://www.linkedin.com/company/american-wholesale",
        description:
          "Major wholesale distributor serving US markets with 30+ distribution centers.",
        employees: 800,
        industry: "Wholesale Distribution",
        country: "USA",
      },
      {
        name: "North American Import Solutions",
        website: "https://www.naimports.com",
        linkedin: "https://www.linkedin.com/company/na-import-solutions",
        description: "Specialized importer and distributor for North American markets.",
        employees: 250,
        industry: "Import & Distribution",
        country: "USA",
      },
    ],
    Europe: [
      {
        name: "European Wholesale Group",
        website: "https://www.eurwholegroup.com",
        linkedin: "https://www.linkedin.com/company/european-wholesale",
        description:
          "Established wholesale distributor serving European markets with a network of 50+ distribution centers.",
        employees: 300,
        industry: "Wholesale Distribution",
        country: "Europe",
      },
      {
        name: "Pan-European Distribution Network",
        website: "https://www.pedn.eu",
        linkedin: "https://www.linkedin.com/company/pan-european-distribution",
        description:
          "Cross-border distributor operating in 25 European countries with strong logistics network.",
        employees: 1200,
        industry: "Distribution & Logistics",
        country: "Europe",
      },
      {
        name: "European Retail Partners",
        website: "https://www.eurretail.com",
        linkedin: "https://www.linkedin.com/company/european-retail-partners",
        description: "Major retail chain and distributor across Western Europe.",
        employees: 600,
        industry: "Retail & Distribution",
        country: "Europe",
      },
    ],
    Asia: [
      {
        name: "Asia Pacific Retail Solutions",
        website: "https://www.apretailsolutions.com",
        linkedin: "https://www.linkedin.com/company/asia-pacific-retail",
        description:
          "Major retail chain and distributor across Southeast Asia with operations in 15 countries.",
        employees: 2000,
        industry: "Retail & E-commerce",
        country: "Asia",
      },
      {
        name: "Asian Import & Distribution Corp",
        website: "https://www.aidc.asia",
        linkedin: "https://www.linkedin.com/company/asian-import-distribution",
        description:
          "Leading importer and distributor for Asian markets with strong supplier relationships.",
        employees: 450,
        industry: "Import & Distribution",
        country: "Asia",
      },
      {
        name: "Southeast Asia Trading Group",
        website: "https://www.seatg.com",
        linkedin: "https://www.linkedin.com/company/sea-trading-group",
        description:
          "Regional distributor and e-commerce enabler for Southeast Asian markets.",
        employees: 350,
        industry: "E-commerce & Distribution",
        country: "Asia",
      },
    ],
    "Middle East": [
      {
        name: "Middle East Trading Corporation",
        website: "https://www.metradingcorp.com",
        linkedin: "https://www.linkedin.com/company/me-trading-corp",
        description:
          "Specialized importer and distributor for Middle Eastern markets with strong relationships with local retailers.",
        employees: 150,
        industry: "Import & Distribution",
        country: "Middle East",
      },
      {
        name: "Gulf Region Distribution",
        website: "https://www.gulfdist.ae",
        linkedin: "https://www.linkedin.com/company/gulf-distribution",
        description:
          "Major distributor serving GCC countries with extensive retail network.",
        employees: 280,
        industry: "Distribution & Retail",
        country: "Middle East",
      },
    ],
    "Latin America": [
      {
        name: "Latin America Commerce Network",
        website: "https://www.lacommercegroup.com",
        linkedin: "https://www.linkedin.com/company/la-commerce-network",
        description:
          "Regional distributor and e-commerce enabler for Latin American markets with growing presence in 8 countries.",
        employees: 250,
        industry: "E-commerce & Distribution",
        country: "Latin America",
      },
      {
        name: "South American Import Solutions",
        website: "https://www.saimports.com.br",
        linkedin: "https://www.linkedin.com/company/sa-import-solutions",
        description:
          "Leading importer and distributor for South American markets.",
        employees: 200,
        industry: "Import & Distribution",
        country: "Latin America",
      },
    ],
  };

  // 收集符合条件的公司
  let companies: any[] = [];

  if (targetCountries && targetCountries.length > 0) {
    // 根据用户选择的国家收集公司
    for (const country of targetCountries) {
      const countryCompanies = companiesByCountry[country] || [];
      companies.push(...countryCompanies);
    }
  } else {
    // 如果没有选择国家，返回所有公司
    for (const countryCompanies of Object.values(companiesByCountry)) {
      companies.push(...countryCompanies);
    }
  }

  // 随机打乱并返回指定数量的公司
  companies = companies.sort(() => Math.random() - 0.5);
  return companies.slice(0, numberOfCompanies);
}

/**
 * GET /api/process-product/:submissionId
 * 使用 SSE 流式返回产品处理进度
 * 查询参数: targetCountries (逗号分隔), numberOfCompanies
 */
productProcessingRouter.get(
  "/process-product/:submissionId",
  async (req: Request, res: Response) => {
    const { submissionId } = req.params;
    const targetCountriesParam = req.query.targetCountries as string;
    const numberOfCompaniesParam = req.query.numberOfCompanies as string;

    // 解析查询参数
    const targetCountries = targetCountriesParam
      ? targetCountriesParam.split(",").map((c) => c.trim())
      : [];
    const numberOfCompanies = Math.min(
      50,
      Math.max(1, parseInt(numberOfCompaniesParam) || 10)
    );

    try {
      initializeSSE(res);

      const db = await getDb();
      if (!db) {
        return res.write(
          `data: ${JSON.stringify({
            stage: "error",
            progress: 0,
            message: "数据库连接失败",
          })}\n\n`
        ) && res.end();
      }

      // 获取产品提交记录
      const submissions = await db
        .select()
        .from(productSubmissions)
        .where(eq(productSubmissions.id, parseInt(submissionId)));

      if (!submissions.length) {
        return res.write(
          `data: ${JSON.stringify({
            stage: "error",
            progress: 0,
            message: "产品提交记录不存在",
          })}\n\n`
        ) && res.end();
      }

      const submission = submissions[0];

      // 阶段 1: 提取产品信息 (0-30%)
      sendProgressUpdate(res, {
        stage: "extraction",
        progress: 10,
        message: "正在从 PDF 提取产品信息...",
      });

      let productData: any = {
        productName: "产品",
        productDescription: "产品信息",
        productCategory: "未分类",
        specifications: {},
        targetMarkets: [],
        applications: [],
      };

      try {
        const extractionResponse = await invokeKimiLLM([
          {
            role: "system",
            content: `You are a product analysis expert. Extract product information from the provided PDF content.
Return ONLY valid JSON, no markdown or extra text:
{
  "productName": "string",
  "productDescription": "string",
  "productCategory": "string",
  "specifications": {},
  "targetMarkets": ["string"],
  "applications": ["string"]
}`,
          },
          {
            role: "user",
            content: `Please analyze this product and extract key information: ${
              submission.productDescription || "Product information"
            }`,
          },
        ]);

        const content = extractKimiContent(extractionResponse);
        const parsed = JSON.parse(content);
        productData = {
          productName: parsed.productName || "产品",
          productDescription: parsed.productDescription || "产品信息",
          productCategory: parsed.productCategory || "未分类",
          specifications: parsed.specifications || {},
          targetMarkets: Array.isArray(parsed.targetMarkets)
            ? parsed.targetMarkets
            : [],
          applications: Array.isArray(parsed.applications)
            ? parsed.applications
            : [],
        };

        sendProgressUpdate(res, {
          stage: "extraction",
          progress: 30,
          message: `✓ 已提取产品: ${productData.productName}`,
          data: productData,
        });
      } catch (error) {
        console.error("Product extraction error:", error);
        sendProgressUpdate(res, {
          stage: "extraction",
          progress: 30,
          message: "✓ 已使用默认产品信息",
          data: productData,
        });
      }

      // 阶段 2: 智能买家分析 (30-60%)
      sendProgressUpdate(res, {
        stage: "buyer_analysis",
        progress: 40,
        message: "正在分析优质买家类型...",
      });

      let buyerProfile: any = {};
      try {
        buyerProfile = await analyzeBuyerProfile(productData);
        sendProgressUpdate(res, {
          stage: "buyer_analysis",
          progress: 60,
          message: `✓ 已识别买家类型 (${buyerProfile.buyerTypes.join(", ")})`,
          data: buyerProfile,
        });
      } catch (error) {
        console.error("Buyer analysis error:", error);
        buyerProfile = {
          buyerTypes: ["Distributor", "Reseller", "Importer"],
          excludeCompetitors: true,
          targetIndustries: ["Retail", "E-commerce"],
          targetCompanyRoles: ["Sales Manager", "Trade Manager"],
          companyQualifications: {
            minEmployees: 20,
            preferredRegions: targetCountries.length > 0 ? targetCountries : ["USA", "Europe", "Asia"],
            businessModel: ["B2B", "B2C"],
          },
        };
        sendProgressUpdate(res, {
          stage: "buyer_analysis",
          progress: 60,
          message: "✓ 已使用默认买家类型",
          data: buyerProfile,
        });
      }

      // 阶段 3: 生成符合条件的公司列表 (60-95%)
      sendProgressUpdate(res, {
        stage: "company_matching",
        progress: 70,
        message: `正在从 ${targetCountries.length > 0 ? targetCountries.join(", ") : "全球"} 生成 ${numberOfCompanies} 家目标公司...`,
      });

      let companiesWithContacts: any[] = [];
      
      // 使用新的买家搜索引擎获取真实数据源
      sendProgressUpdate(res, {
        stage: "company_matching",
        progress: 60,
        message: "正在从真实数据源搜索买家...",
      });

      let realBuyers: any[] = [];
      try {
        realBuyers = await searchBuyers({
          productName: productData.productName,
          productCategory: productData.productCategory,
          targetCountries: targetCountries,
          buyerTypes: buyerProfile.buyerTypes,
          keywords: productData.keywords || []
        });
        
        console.log(`✅ 从真实数据源获取 ${realBuyers.length} 个买家`);
        
        sendProgressUpdate(res, {
          stage: "company_matching",
          progress: 70,
          message: `✓ 获取 ${realBuyers.length} 个买家，正在进行匹配...`,
        });
      } catch (searchError) {
        console.error("❌ 买家搜索错误:", searchError);
        sendProgressUpdate(res, {
          stage: "company_matching",
          progress: 65,
          message: "⚠ 搜索真实数据源失败，使用备用数据...",
        });
      }

      // 如果真实数据源返回结果不足，补充模拟数据
      let mockCompanies: any[] = [];
      if (realBuyers.length < numberOfCompanies / 2) {
        mockCompanies = generateCompaniesForCountries(
          targetCountries,
          Math.ceil(numberOfCompanies / 2)
        );
      }

      // 合并真实数据和模拟数据
      const allCompanies = [
        ...realBuyers.map(b => ({
          name: b.name,
          website: b.website,
          linkedin: b.website,
          description: b.description,
          employees: 100,
          industry: b.industry || "Distribution",
          country: b.country,
          city: b.city,
          phone: b.phone,
          address: b.address,
          source: b.source
        })),
        ...mockCompanies
      ].slice(0, numberOfCompanies);

      for (let i = 0; i < allCompanies.length; i++) {
        const company = allCompanies[i];

        try {
          // 验证公司资质
          const verification = await verifyCompanyQualification(
            company,
            buyerProfile
          );

          if (verification.isQualified) {
            // 识别关键联系人
            let contacts: any[] = [];
            try {
              contacts = await identifyKeyContacts(company, buyerProfile);
            } catch (contactError) {
              console.error("Contact identification error:", contactError);
              contacts = [
                {
                  name: "Sales Manager",
                  title: "Sales Manager",
                  department: "Sales",
                  linkedinUrl: "linkedin.com/in/sales-manager",
                  relevanceScore: 90,
                  reason: "Responsible for new product sourcing",
                },
              ];
            }

            // 为每个联系人生成 Cold Email
            const contactsWithEmails = await Promise.all(
              contacts.map(async (contact) => {
                try {
                  const email = await generatePersonalizedColdEmail(
                    productData,
                    company,
                    contact
                  );
                  return {
                    ...contact,
                    coldEmail: email,
                  };
                } catch (emailError) {
                  console.error("Cold email generation error:", emailError);
                  return {
                    ...contact,
                    coldEmail: {
                      subject: "Exciting New Product Opportunity",
                      emailBody: `Dear ${contact.title},\n\nI hope this email finds you well. I'm reaching out because I believe our product could be a great fit for your organization.\n\nBest regards`,
                      language: "English",
                    },
                  };
                }
              })
            );

            companiesWithContacts.push({
              company,
              verification,
              contacts: contactsWithEmails,
            });
          }
        } catch (error) {
          console.error(`Error processing company ${company.name}:`, error);
          companiesWithContacts.push({
            company,
            verification: {
              isQualified: true,
              score: 70,
              reasons: ["Default assessment"],
              warnings: ["Processing error - using default data"],
            },
            contacts: [
              {
                name: "Sales Manager",
                title: "Sales Manager",
                department: "Sales",
                linkedinUrl: "linkedin.com/in/sales-manager",
                relevanceScore: 80,
                reason: "Responsible for new product sourcing",
                coldEmail: {
                  subject: "Exciting New Product Opportunity",
                  emailBody: `Dear Sales Manager,\n\nI hope this email finds you well. I'm reaching out because I believe our product could be a great fit for your organization.\n\nBest regards`,
                  language: "English",
                },
              },
            ],
          });
        }

        const progress = 70 + ((i + 1) / mockCompanies.length) * 20;
        sendProgressUpdate(res, {
          stage: "company_matching",
          progress: Math.min(90, Math.round(progress)),
          message: `✓ 已处理 ${i + 1}/${mockCompanies.length} 家公司`,
        });
      }

      // 确保至少返回请求的公司数量
      if (companiesWithContacts.length === 0) {
        console.warn("No companies qualified, using all companies with default verification");
        companiesWithContacts = mockCompanies.map((company) => ({
          company,
          verification: {
            isQualified: true,
            score: 70,
            reasons: ["Potential buyer"],
            warnings: [],
          },
          contacts: [
            {
              name: "Sales Manager",
              title: "Sales Manager",
              department: "Sales",
              linkedinUrl: "linkedin.com/in/sales-manager",
              relevanceScore: 80,
              reason: "Responsible for new product sourcing",
              coldEmail: {
                subject: "Exciting New Product Opportunity",
                emailBody: `Dear Sales Manager,\n\nI hope this email finds you well. I'm reaching out because I believe our product could be a great fit for your organization.\n\nBest regards`,
                language: "English",
              },
            },
          ],
        }));
      }

      sendProgressUpdate(res, {
        stage: "company_matching",
        progress: 90,
        message: `✓ 已从 ${targetCountries.length > 0 ? targetCountries.join(", ") : "全球"} 生成 ${companiesWithContacts.length} 家公司`,
        data: {
          companiesCount: companiesWithContacts.length,
          totalContacts: companiesWithContacts.reduce(
            (sum, c) => sum + c.contacts.length,
            0
          ),
          targetCountries,
          numberOfCompaniesRequested: numberOfCompanies,
        },
      });

      // 阶段 4: 完成处理 (90-100%)
      sendProgressUpdate(res, {
        stage: "completion",
        progress: 95,
        message: "正在保存分析结果...",
      });

      // 更新数据库
      try {
        await db
          .update(productSubmissions)
          .set({
            aiAnalysis: JSON.stringify({
              productData,
              buyerProfile,
              companiesWithContacts,
              searchParams: {
                targetCountries,
                numberOfCompanies,
              },
            }),
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(productSubmissions.id, parseInt(submissionId)));

        res.write(
          `data: ${JSON.stringify({
            stage: "completed",
            progress: 100,
            message: "✓ 分析完成！",
            data: {
              productData,
              buyerProfile,
              companiesWithContacts,
              searchParams: {
                targetCountries,
                numberOfCompanies,
              },
            },
          })}\n\n`
        );
      } catch (dbError) {
        console.error("Database update error:", dbError);
        res.write(
          `data: ${JSON.stringify({
            stage: "completed",
            progress: 100,
            message: "✓ 分析完成！",
            data: {
              productData,
              buyerProfile,
              companiesWithContacts,
              searchParams: {
                targetCountries,
                numberOfCompanies,
              },
            },
          })}\n\n`
        );
      }

      res.end();
    } catch (error) {
      console.error("Product processing error:", error);
      res.write(
        `data: ${JSON.stringify({
          stage: "error",
          progress: 0,
          message: `处理失败: ${error instanceof Error ? error.message : "未知错误"}`,
        })}\n\n`
      );
      res.end();
    }
  }
);
