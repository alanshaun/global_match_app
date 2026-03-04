import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "zh";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.logo": "SmartMatch",
    "nav.login": "Log In",
    "nav.welcome": "Welcome",

    // Home Page
    "home.tagline": "AI-Powered Global Matching Platform",
    "home.title": "Global Matching",
    "home.subtitle": "One-Stop Solution",
    "home.description": "AI-powered analysis, global search, precise matching. Products, jobs, properties - all in one platform",
    "home.cta": "Get Started",

    // Feature Cards
    "feature.products.title": "Product Buyer Matching",
    "feature.products.desc": "Upload your product and AI intelligently matches global target companies",
    "feature.products.feature1": "AI analyzes product features",
    "feature.products.feature2": "Intelligent company matching",
    "feature.products.feature3": "Auto-generated Cold Emails",
    "feature.products.button": "Start Matching",

    "feature.jobs.title": "Job Auto Search",
    "feature.jobs.desc": "Upload your resume and search for the most matching jobs worldwide",
    "feature.jobs.feature1": "Resume auto-parsing",
    "feature.jobs.feature2": "Global job search",
    "feature.jobs.feature3": "Smart matching ranking",
    "feature.jobs.button": "Start Searching",

    "feature.properties.title": "Real Estate Investment Matching",
    "feature.properties.desc": "AI intelligently matches global property buyers/sellers",
    "feature.properties.feature1": "AI analyzes property features",
    "feature.properties.feature2": "Global property search",
    "feature.properties.feature3": "Investment ROI analysis",
    "feature.properties.button": "Start Matching",

    // Features List
    "features.ai": "AI-Powered",
    "features.ai.desc": "Using Kimi 2.5 LLM for intelligent analysis",
    "features.search": "Global Search",
    "features.search.desc": "Covers major global platforms",
    "features.matching": "Precise Matching",
    "features.matching.desc": "AI-based intelligent matching algorithm",

    // Dashboard
    "dashboard.selectFeature": "Select Feature",
    "dashboard.enter": "Enter",

    // Products Page
    "products.title": "Product Buyer Matching",
    "products.upload": "Upload Product PDF",
    "products.targetCountry": "Target Country/Region",
    "products.companyCount": "Number of Companies",
    "products.analyze": "Analyze with AI",
    "products.analyzing": "Analyzing...",
    "products.results": "Matching Results",
    "products.noResults": "No matching results",
    "products.matchScore": "Match Score",
    "products.company": "Company",
    "products.website": "Website",
    "products.contact": "Contact",
    "products.coldEmail": "Cold Email",
    "products.linkedin": "LinkedIn",

    // Jobs Page
    "jobs.title": "Job Auto Search",
    "jobs.upload": "Upload Resume",
    "jobs.position": "Target Position",
    "jobs.city": "City",
    "jobs.salaryRange": "Salary Range",
    "jobs.jobCount": "Number of Jobs",
    "jobs.search": "Search with AI",
    "jobs.searching": "Searching...",
    "jobs.results": "Job Matching Results",
    "jobs.noResults": "No matching jobs found",
    "jobs.jobTitle": "Job Title",
    "jobs.company": "Company",
    "jobs.location": "Location",
    "jobs.jobSalary": "Salary",
    "jobs.posted": "Posted",
    "jobs.link": "Apply",

    // Properties Page
    "properties.title": "Real Estate Investment Matching",
    "properties.upload": "Upload Property Info",
    "properties.location": "Location",
    "properties.country": "Country",
    "properties.type": "Property Type",
    "properties.budget": "Budget Range",
    "properties.analyze": "Analyze with AI",
    "properties.analyzing": "Analyzing...",
    "properties.results": "Property Matching Results",
    "properties.noResults": "No matching properties found",
    "properties.price": "Price",
    "properties.bedrooms": "Bedrooms",
    "properties.area": "Area",
    "properties.roi": "ROI",
    "properties.contact": "Contact Agent",
  },
  zh: {
    // Navigation
    "nav.logo": "智能匹配",
    "nav.login": "登录",
    "nav.welcome": "欢迎",

    // Home Page
    "home.tagline": "AI 驱动的全球匹配平台",
    "home.title": "全球匹配",
    "home.subtitle": "一站式解决方案",
    "home.description": "AI 智能分析，全网搜索，精准匹配。产品、职位、房产，一个平台搞定",
    "home.cta": "立即开始",

    // Feature Cards
    "feature.products.title": "产品客户匹配",
    "feature.products.desc": "上传产品，AI 智能匹配全球目标公司",
    "feature.products.feature1": "AI 分析产品特征",
    "feature.products.feature2": "智能匹配目标公司",
    "feature.products.feature3": "自动生成 Cold Email",
    "feature.products.button": "开始匹配",

    "feature.jobs.title": "职位自动搜索",
    "feature.jobs.desc": "上传简历，全网搜索最匹配的职位",
    "feature.jobs.feature1": "简历自动解析",
    "feature.jobs.feature2": "全网职位搜索",
    "feature.jobs.feature3": "智能匹配度排序",
    "feature.jobs.button": "开始搜索",

    "feature.properties.title": "房产投资匹配",
    "feature.properties.desc": "AI 智能匹配全球房产买家/卖家",
    "feature.properties.feature1": "AI 分析房产特征",
    "feature.properties.feature2": "全网房源搜索",
    "feature.properties.feature3": "投资回报分析",
    "feature.properties.button": "开始匹配",

    // Features List
    "features.ai": "AI 驱动",
    "features.ai.desc": "使用 Kimi 2.5 LLM 进行智能分析",
    "features.search": "全网搜索",
    "features.search.desc": "覆盖全球主流平台数据",
    "features.matching": "精准匹配",
    "features.matching.desc": "基于 AI 的智能匹配算法",

    // Dashboard
    "dashboard.selectFeature": "选择功能",
    "dashboard.enter": "进入",

    // Products Page
    "products.title": "产品客户匹配",
    "products.upload": "上传产品 PDF",
    "products.targetCountry": "目标国家/地区",
    "products.companyCount": "公司数量",
    "products.analyze": "AI 分析",
    "products.analyzing": "分析中...",
    "products.results": "匹配结果",
    "products.noResults": "暂无匹配结果",
    "products.matchScore": "匹配度",
    "products.company": "公司",
    "products.website": "网站",
    "products.contact": "联系方式",
    "products.coldEmail": "Cold Email",
    "products.linkedin": "LinkedIn",

    // Jobs Page
    "jobs.title": "职位自动搜索",
    "jobs.upload": "上传简历",
    "jobs.position": "目标岗位",
    "jobs.city": "城市",
    "jobs.salaryRange": "薪资范围",
    "jobs.jobCount": "职位数量",
    "jobs.search": "AI 搜索",
    "jobs.searching": "搜索中...",
    "jobs.results": "职位匹配结果",
    "jobs.noResults": "未找到匹配职位",
    "jobs.jobTitle": "职位名称",
    "jobs.company": "公司",
    "jobs.location": "地点",
    "jobs.jobSalary": "薪资",
    "jobs.posted": "发布时间",
    "jobs.link": "申请",

    // Properties Page
    "properties.title": "房产投资匹配",
    "properties.upload": "上传房产信息",
    "properties.location": "位置",
    "properties.country": "国家",
    "properties.type": "房产类型",
    "properties.budget": "预算范围",
    "properties.analyze": "AI 分析",
    "properties.analyzing": "分析中...",
    "properties.results": "房产匹配结果",
    "properties.noResults": "未找到匹配房产",
    "properties.price": "价格",
    "properties.bedrooms": "卧室数",
    "properties.area": "面积",
    "properties.roi": "回报率",
    "properties.contact": "联系经纪人",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "en";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
