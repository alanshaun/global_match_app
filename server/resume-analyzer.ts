import { invokeLLM } from "./_core/llm";

export interface ResumeAnalysis {
  targetPosition: string;
  targetLocation: string;
  targetCountry: string;
  skills: string[];
  experience: string;
  yearsOfExperience: number;
  education: string;
  keyStrengths: string[];
  preferredIndustries: string[];
  salaryExpectation?: {
    min: number;
    max: number;
    currency: string;
  };
}

/**
 * 使用 AI 分析简历，提取关键信息
 */
export async function analyzeResume(
  resumeText: string,
  targetPosition?: string,
  targetLocation?: string,
  targetCountry?: string,
  salaryMin?: number,
  salaryMax?: number,
  salaryCurrency?: string
): Promise<ResumeAnalysis> {
  try {
    const analysisPrompt = `
你是一个专业的简历分析专家。请深度分析以下简历，提取关键信息用于职位匹配。

简历内容：
${resumeText}

请返回 JSON 格式的分析结果，包含以下字段：
{
  "targetPosition": "目标职位（从简历中推断，如果用户指定则使用用户指定的：${targetPosition || ""}）",
  "targetLocation": "目标位置（从简历中推断，如果用户指定则使用用户指定的：${targetLocation || ""}）",
  "targetCountry": "目标国家（从简历中推断，如果用户指定则使用用户指定的：${targetCountry || "US"}）",
  "skills": ["技能1", "技能2", "技能3", ...],
  "experience": "工作经验总结（2-3句话）",
  "yearsOfExperience": 年数（数字），
  "education": "教育背景",
  "keyStrengths": ["优势1", "优势2", "优势3"],
  "preferredIndustries": ["行业1", "行业2", "行业3"],
  "salaryExpectation": {
    "min": ${salaryMin || 50000},
    "max": ${salaryMax || 150000},
    "currency": "${salaryCurrency || "USD"}"
  }
}

分析要求：
1. 准确提取简历中的所有技能
2. 计算总工作年限
3. 识别关键优势和特长
4. 推断目标职位和行业
5. 返回有效的 JSON 格式
6. 如果用户提供了目标职位/位置，优先使用用户提供的值
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume analyzer. Your task is to extract key information from resumes for job matching. Always return valid JSON with accurate data extraction.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resume_analysis",
          strict: false,
          schema: {
            type: "object",
            properties: {
              targetPosition: { type: "string" },
              targetLocation: { type: "string" },
              targetCountry: { type: "string" },
              skills: {
                type: "array",
                items: { type: "string" },
              },
              experience: { type: "string" },
              yearsOfExperience: { type: "number" },
              education: { type: "string" },
              keyStrengths: {
                type: "array",
                items: { type: "string" },
              },
              preferredIndustries: {
                type: "array",
                items: { type: "string" },
              },
              salaryExpectation: {
                type: "object",
                properties: {
                  min: { type: "number" },
                  max: { type: "number" },
                  currency: { type: "string" },
                },
              },
            },
            required: [
              "targetPosition",
              "targetLocation",
              "targetCountry",
              "skills",
              "experience",
              "yearsOfExperience",
            ],
          },
        },
      },
    });

    try {
      const content =
        typeof response.choices[0]?.message.content === "string"
          ? response.choices[0].message.content
          : "{}";

      console.log(`[Resume Analyzer] Raw response length: ${content.length}`);

      let analysis: ResumeAnalysis = {
        targetPosition: targetPosition || "Software Engineer",
        targetLocation: targetLocation || "New York",
        targetCountry: targetCountry || "US",
        skills: [],
        experience: "",
        yearsOfExperience: 0,
        education: "",
        keyStrengths: [],
        preferredIndustries: [],
        salaryExpectation: {
          min: salaryMin || 50000,
          max: salaryMax || 150000,
          currency: salaryCurrency || "USD",
        },
      };

      try {
        analysis = JSON.parse(content);
        console.log(
          `[Resume Analyzer] Successfully parsed resume analysis:`,
          {
            position: analysis.targetPosition,
            location: analysis.targetLocation,
            skills: analysis.skills.length,
            yearsOfExperience: analysis.yearsOfExperience,
          }
        );
      } catch (e) {
        console.log(
          `[Resume Analyzer] Direct JSON parse failed, trying to extract...`
        );
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysis = JSON.parse(jsonMatch[0]);
            console.log(
              `[Resume Analyzer] Successfully extracted and parsed analysis`
            );
          } catch (e2) {
            console.error(`[Resume Analyzer] Failed to parse extracted JSON:`, e2);
          }
        }
      }

      return analysis;
    } catch (e) {
      console.error("Failed to parse resume analysis:", e);
      return {
        targetPosition: targetPosition || "Software Engineer",
        targetLocation: targetLocation || "New York",
        targetCountry: targetCountry || "US",
        skills: [],
        experience: "",
        yearsOfExperience: 0,
        education: "",
        keyStrengths: [],
        preferredIndustries: [],
        salaryExpectation: {
          min: salaryMin || 50000,
          max: salaryMax || 150000,
          currency: salaryCurrency || "USD",
        },
      };
    }
  } catch (error) {
    console.error("Error analyzing resume:", error);
    return {
      targetPosition: targetPosition || "Software Engineer",
      targetLocation: targetLocation || "New York",
      targetCountry: targetCountry || "US",
      skills: [],
      experience: "",
      yearsOfExperience: 0,
      education: "",
      keyStrengths: [],
      preferredIndustries: [],
      salaryExpectation: {
        min: salaryMin || 50000,
        max: salaryMax || 150000,
        currency: salaryCurrency || "USD",
      },
    };
  }
}

/**
 * 使用 AI 计算职位和简历的匹配度
 */
export async function calculateMatchScore(
  resumeAnalysis: ResumeAnalysis,
  jobTitle: string,
  jobDescription: string,
  jobLocation: string
): Promise<number> {
  try {
    const matchPrompt = `
你是一个职位匹配专家。请根据以下简历分析和职位信息，计算匹配度（0-100）。

简历信息：
- 目标职位: ${resumeAnalysis.targetPosition}
- 位置: ${resumeAnalysis.targetLocation}
- 技能: ${resumeAnalysis.skills.join(", ")}
- 工作年限: ${resumeAnalysis.yearsOfExperience} 年
- 优势: ${resumeAnalysis.keyStrengths.join(", ")}

职位信息：
- 职位名称: ${jobTitle}
- 职位描述: ${jobDescription}
- 位置: ${jobLocation}

请返回 JSON 格式：
{
  "matchScore": 匹配度分数（0-100的整数），
  "reasoning": "匹配度分析原因（1-2句话）"
}

评分标准：
- 职位名称匹配: 30分
- 技能匹配: 30分
- 位置匹配: 20分
- 经验年限匹配: 20分

返回有效的 JSON 格式。
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a job matching expert. Calculate match scores between resumes and jobs accurately. Return valid JSON.",
        },
        {
          role: "user",
          content: matchPrompt,
        },
      ],
    });

    try {
      const content =
        typeof response.choices[0]?.message.content === "string"
          ? response.choices[0].message.content
          : "{}";

      let result = { matchScore: 50, reasoning: "Default match" };

      try {
        result = JSON.parse(content);
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      }

      const score = Math.min(100, Math.max(0, result.matchScore || 50));
      console.log(
        `[Match Score] ${jobTitle} vs ${resumeAnalysis.targetPosition}: ${score}`
      );
      return score;
    } catch (e) {
      console.error("Failed to parse match score:", e);
      return 50;
    }
  } catch (error) {
    console.error("Error calculating match score:", error);
    return 50;
  }
}
