import { invokeLLM } from "./_core/llm";
import { ResumeAnalysis } from "./resume-deep-analysis";
import { JobListing } from "./job-aggregator-multi-source";

export interface MatchScore {
  overallScore: number; // 总匹配度 0-100
  skillsMatch: number; // 技能匹配度
  experienceMatch: number; // 经验匹配度
  schoolMatch: number; // 学校匹配度
  companyStageMatch: number; // 公司阶段匹配度
  locationMatch: number; // 地点匹配度
  salaryMatch: number; // 薪资匹配度
  details: string; // 详细匹配分析
  strengths: string[]; // 优势
  gaps: string[]; // 不足
}

/**
 * 使用 AI 计算简历与职位的多维度匹配度
 */
export async function calculateJobMatch(
  resume: ResumeAnalysis,
  job: JobListing
): Promise<MatchScore> {
  try {
    console.log(
      `[Job Matching] Calculating match score for ${job.title} at ${job.company}`
    );

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert career advisor and job matching specialist. 
Analyze the match between a candidate's resume and a job listing across multiple dimensions.

Return a JSON object with detailed matching analysis:
{
  "overallScore": number (0-100),
  "skillsMatch": number (0-100),
  "experienceMatch": number (0-100),
  "schoolMatch": number (0-100),
  "companyStageMatch": number (0-100),
  "locationMatch": number (0-100),
  "salaryMatch": number (0-100),
  "details": "detailed analysis",
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"]
}

Consider:
1. Technical skills alignment
2. Years of experience required vs provided
3. School prestige and reputation
4. Company stage fit (startup vs established)
5. Location preferences
6. Salary expectations
7. Career growth potential
8. Internship experience relevance`,
        },
        {
          role: "user",
          content: `Please analyze the match between this resume and job listing:

RESUME PROFILE:
- Seniority: ${resume.seniority}
- Technical Skills: ${resume.technicalSkills.join(", ")}
- School: ${resume.school.name} (Rank: ${resume.school.rank || "Unknown"})
- Internships: ${resume.internshipCount}
- Work Experience: ${resume.workExperience.totalMonths} months
- Key Strengths: ${resume.keyStrengths.join(", ")}
- Target Roles: ${resume.targetRoles.join(", ")}
- GPA: ${resume.gpa || "Not provided"}

JOB LISTING:
- Title: ${job.title}
- Company: ${job.company}
- Company Size: ${job.companySize}
- Company Stage: ${job.fundingStage || "Unknown"}
- Location: ${job.location}
- Required Experience: ${job.yearsOfExperience} years
- Required Skills: ${job.technicalSkills.join(", ")}
- Salary: ${job.salary ? `$${job.salary.min}-$${job.salary.max} ${job.salary.currency}` : "Not disclosed"}
- Job Type: ${job.jobType}
- Description: ${job.description.substring(0, 500)}...
- Requirements: ${job.requirements.slice(0, 5).join(", ")}

Provide a detailed matching analysis considering all dimensions.
Return JSON format only.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "job_match_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallScore: { type: "number", description: "Overall match score 0-100" },
              skillsMatch: { type: "number", description: "Technical skills match 0-100" },
              experienceMatch: { type: "number", description: "Experience level match 0-100" },
              schoolMatch: { type: "number", description: "School prestige match 0-100" },
              companyStageMatch: { type: "number", description: "Company stage fit 0-100" },
              locationMatch: { type: "number", description: "Location preference match 0-100" },
              salaryMatch: { type: "number", description: "Salary expectation match 0-100" },
              details: { type: "string", description: "Detailed analysis" },
              strengths: { type: "array", items: { type: "string" } },
              gaps: { type: "array", items: { type: "string" } },
            },
            required: [
              "overallScore",
              "skillsMatch",
              "experienceMatch",
              "schoolMatch",
              "companyStageMatch",
              "locationMatch",
              "salaryMatch",
              "details",
              "strengths",
              "gaps",
            ],
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("Invalid response format");
    }

    const matchScore = JSON.parse(content) as MatchScore;

    console.log(
      `[Job Matching] Match score calculated: ${matchScore.overallScore}% for ${job.title}`
    );

    return matchScore;
  } catch (error) {
    console.error("[Job Matching] Error calculating match score:", error);
    throw error;
  }
}

/**
 * 批量计算多个职位的匹配度
 */
export async function calculateBatchJobMatches(
  resume: ResumeAnalysis,
  jobs: JobListing[],
  topN: number = 20
): Promise<Array<JobListing & { matchScore: MatchScore }>> {
  try {
    console.log(`[Job Matching] Calculating matches for ${jobs.length} jobs...`);

    const matches = await Promise.all(
      jobs.map(async (job) => {
        try {
          const matchScore = await calculateJobMatch(resume, job);
          return { ...job, matchScore };
        } catch (error) {
          console.error(`Error matching job ${job.id}:`, error);
          return {
            ...job,
            matchScore: {
              overallScore: 0,
              skillsMatch: 0,
              experienceMatch: 0,
              schoolMatch: 0,
              companyStageMatch: 0,
              locationMatch: 0,
              salaryMatch: 0,
              details: "Error calculating match",
              strengths: [],
              gaps: [],
            },
          };
        }
      })
    );

    // 按匹配度排序，返回前 topN
    const sorted = matches
      .sort((a, b) => b.matchScore.overallScore - a.matchScore.overallScore)
      .slice(0, topN);

    console.log(
      `[Job Matching] Top matches: ${sorted.map((m) => `${m.title}(${m.matchScore.overallScore}%)`).join(", ")}`
    );

    return sorted;
  } catch (error) {
    console.error("[Job Matching] Error in batch matching:", error);
    throw error;
  }
}
