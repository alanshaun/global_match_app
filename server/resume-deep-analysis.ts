import { invokeLLM } from "./_core/llm";

export interface ResumeAnalysis {
  atsScore: number; // 0-100, ATS 可读性评分
  internshipCount: number; // 实习经历数量
  technicalSkills: string[]; // 技术栈列表
  school: {
    name: string;
    rank: number | null; // 学校排名（如果可识别）
    degree: string; // 学位
    major: string; // 专业
  };
  workExperience: {
    totalMonths: number; // 总工作月数
    companies: Array<{
      name: string;
      title: string;
      months: number;
      isStartup: boolean; // 是否初创公司
    }>;
  };
  keyStrengths: string[]; // 核心优势
  weaknesses: string[]; // 薄弱环节
  targetRoles: string[]; // 适合的职位方向
  seniority: "entry" | "junior" | "mid" | "senior"; // 职位等级
  gpa?: number; // GPA（如果有）
  certifications: string[]; // 证书
  languages: string[]; // 语言能力
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
}

/**
 * 使用 AI 进行深度简历分析
 */
export async function analyzeResumeDeep(resumeText: string): Promise<ResumeAnalysis> {
  try {
    console.log("[Resume Analysis] Starting deep resume analysis...");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer for tech internships and entry-level positions. 
Analyze the resume and extract structured information. Be precise and factual.
Return a JSON object with the following structure:
{
  "atsScore": number (0-100),
  "internshipCount": number,
  "technicalSkills": string[],
  "school": {
    "name": string,
    "rank": number or null,
    "degree": string,
    "major": string
  },
  "workExperience": {
    "totalMonths": number,
    "companies": [{"name": string, "title": string, "months": number, "isStartup": boolean}]
  },
  "keyStrengths": string[],
  "weaknesses": string[],
  "targetRoles": string[],
  "seniority": "entry" | "junior" | "mid" | "senior",
  "gpa": number or null,
  "certifications": string[],
  "languages": string[],
  "projects": [{"name": string, "description": string, "technologies": string[]}]
}`,
        },
        {
          role: "user",
          content: `Please analyze this resume and extract all relevant information:\n\n${resumeText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resume_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              atsScore: { type: "number", description: "ATS readability score 0-100" },
              internshipCount: { type: "number", description: "Number of internships" },
              technicalSkills: { type: "array", items: { type: "string" } },
              school: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  rank: { type: ["number", "null"] },
                  degree: { type: "string" },
                  major: { type: "string" },
                },
                required: ["name", "degree", "major"],
              },
              workExperience: {
                type: "object",
                properties: {
                  totalMonths: { type: "number" },
                  companies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        title: { type: "string" },
                        months: { type: "number" },
                        isStartup: { type: "boolean" },
                      },
                      required: ["name", "title", "months", "isStartup"],
                    },
                  },
                },
                required: ["totalMonths", "companies"],
              },
              keyStrengths: { type: "array", items: { type: "string" } },
              weaknesses: { type: "array", items: { type: "string" } },
              targetRoles: { type: "array", items: { type: "string" } },
              seniority: { type: "string", enum: ["entry", "junior", "mid", "senior"] },
              gpa: { type: ["number", "null"] },
              certifications: { type: "array", items: { type: "string" } },
              languages: { type: "array", items: { type: "string" } },
              projects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    technologies: { type: "array", items: { type: "string" } },
                  },
                  required: ["name", "description", "technologies"],
                },
              },
            },
            required: [
              "atsScore",
              "internshipCount",
              "technicalSkills",
              "school",
              "workExperience",
              "keyStrengths",
              "weaknesses",
              "targetRoles",
              "seniority",
              "certifications",
              "languages",
              "projects",
            ],
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("Invalid response format");
    }

    const analysis = JSON.parse(content) as ResumeAnalysis;
    console.log("[Resume Analysis] Analysis complete:", {
      atsScore: analysis.atsScore,
      internships: analysis.internshipCount,
      skills: analysis.technicalSkills.length,
      seniority: analysis.seniority,
    });

    return analysis;
  } catch (error) {
    console.error("[Resume Analysis] Error analyzing resume:", error);
    throw error;
  }
}

/**
 * 计算简历的整体评分（0-100）
 */
export function calculateResumeScore(analysis: ResumeAnalysis): number {
  let score = 0;

  // ATS 评分权重 20%
  score += analysis.atsScore * 0.2;

  // 技术栈权重 20%
  const skillsScore = Math.min(analysis.technicalSkills.length * 10, 100);
  score += skillsScore * 0.2;

  // 实习经历权重 15%
  const internshipScore = Math.min(analysis.internshipCount * 15, 100);
  score += internshipScore * 0.15;

  // 工作经验权重 20%
  const experienceScore = Math.min(analysis.workExperience.totalMonths / 12 * 20, 100);
  score += experienceScore * 0.2;

  // 项目经验权重 15%
  const projectScore = Math.min(analysis.projects.length * 20, 100);
  score += projectScore * 0.15;

  // 学校排名权重 10%
  let schoolScore = 50; // 默认中等
  if (analysis.school.rank) {
    if (analysis.school.rank <= 50) schoolScore = 90;
    else if (analysis.school.rank <= 100) schoolScore = 75;
    else if (analysis.school.rank <= 200) schoolScore = 60;
    else schoolScore = 40;
  }
  score += schoolScore * 0.1;

  return Math.round(score);
}
