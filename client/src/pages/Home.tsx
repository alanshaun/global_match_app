import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SmartMatchLogo } from "@/components/SmartMatchLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Globe, ChevronDown, Sparkles } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{language === "en" ? "Loading..." : "加载中..."}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-stone-100" style={{
        backgroundImage: `
          linear-gradient(135deg, rgba(120, 113, 108, 0.05) 0%, transparent 50%),
          linear-gradient(45deg, rgba(168, 162, 158, 0.03) 0%, transparent 50%)
        `,
        backgroundSize: '100% 100%, 100% 100%'
      }}>
        {/* 导航栏 */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-7xl">
            <div className="flex items-center gap-3">
              <SmartMatchLogo className="w-8 h-8" />
              <span className="text-2xl font-bold text-gray-900">
                <span className="text-3xl font-black text-blue-600">S</span>martMatch
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#product" className="text-gray-700 hover:text-gray-900 transition font-medium">Product Matching</a>
              <a href="#jobs" className="text-gray-700 hover:text-gray-900 transition font-medium">Job Search</a>
              <a href="#properties" className="text-gray-700 hover:text-gray-900 transition font-medium">Real Estate</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === "en" ? "zh" : "en")}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                <Globe className="w-4 h-4" />
                {language === "en" ? "中文" : "EN"}
              </button>
              <a href={getLoginUrl()}>
                <Button variant="ghost" className="text-gray-900 hover:bg-gray-100">
                  {t("nav.login")}
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button className="bg-black hover:bg-gray-900 text-white border-0 rounded-full px-6">
                  Apply
                </Button>
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section - 功能介绍 */}
        <section className="py-20 px-6 relative">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                {language === "en" ? "AI-Powered Matching" : "AI 驱动的智能匹配"}
              </div>
              <h1 className="text-5xl md:text-6xl font-serif text-gray-900 mb-6 leading-tight">
                {language === "en" 
                  ? "Find Global Opportunities"
                  : "发现全球机会"
                }
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                {language === "en"
                  ? "SmartMatch uses advanced AI to intelligently match you with global opportunities - whether you're looking for buyers, jobs, or investment properties."
                  : "SmartMatch 使用先进的 AI 智能地将您与全球机会相匹配 - 无论您是在寻找买家、工作还是投资房产。"
                }
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-2xl">🏢</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {language === "en" ? "Product Matching" : "产品匹配"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {language === "en"
                    ? "Upload your product and find global buyers, distributors, and partners with AI-powered analysis."
                    : "上传您的产品，使用 AI 驱动的分析找到全球买家、分销商和合作伙伴。"
                  }
                </p>
                <a href="#product" className="text-blue-600 font-medium text-sm hover:text-blue-700 transition">
                  {language === "en" ? "Learn more →" : "了解更多 →"}
                </a>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-2xl">💼</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {language === "en" ? "Job Search" : "职位搜索"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {language === "en"
                    ? "Upload your resume and discover ideal jobs from global platforms with intelligent matching."
                    : "上传您的简历，通过智能匹配从全球平台发现理想工作。"
                  }
                </p>
                <a href="#jobs" className="text-blue-600 font-medium text-sm hover:text-blue-700 transition">
                  {language === "en" ? "Learn more →" : "了解更多 →"}
                </a>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-2xl">🏠</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {language === "en" ? "Real Estate" : "房产投资"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {language === "en"
                    ? "Find investment properties or buyers worldwide with AI-powered property analysis."
                    : "使用 AI 驱动的房产分析在全球范围内寻找投资房产或买家。"
                  }
                </p>
                <a href="#properties" className="text-blue-600 font-medium text-sm hover:text-blue-700 transition">
                  {language === "en" ? "Learn more →" : "了解更多 →"}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 产品匹配演示 */}
        <section id="product" className="py-20 px-6 bg-white">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  {language === "en" ? "Product Buyer Matching" : "产品买家匹配"}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  {language === "en"
                    ? "Upload your product PDF and our AI will analyze it, find potential global buyers, and generate personalized cold emails."
                    : "上传您的产品 PDF，我们的 AI 将分析它、找到潜在的全球买家并生成个性化的冷邮件。"
                  }
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex gap-3">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "AI-powered product analysis" : "AI 驱动的产品分析"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Global buyer database search" : "全球买家数据库搜索"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Personalized cold email generation" : "个性化冷邮件生成"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Real-time progress tracking" : "实时进度跟踪"}</span>
                  </li>
                </ul>
                <a href={getLoginUrl()}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg px-6 py-3">
                    {language === "en" ? "Try Now" : "立即尝试"} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
              <div className="relative h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl overflow-hidden border border-blue-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center shadow-lg">
                    <span className="text-5xl">📄</span>
                  </div>
                  <p className="text-gray-700 font-medium">{language === "en" ? "Upload Product PDF" : "上传产品 PDF"}</p>
                  <p className="text-sm text-gray-500 mt-2">{language === "en" ? "Get AI analysis & buyer matches" : "获取 AI 分析和买家匹配"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 职位搜索演示 */}
        <section id="jobs" className="py-20 px-6 bg-stone-50">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative h-96 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl overflow-hidden border border-green-200 flex items-center justify-center order-2 md:order-1">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-lg mx-auto mb-4 flex items-center justify-center shadow-lg">
                    <span className="text-5xl">💼</span>
                  </div>
                  <p className="text-gray-700 font-medium">{language === "en" ? "Upload Your Resume" : "上传您的简历"}</p>
                  <p className="text-sm text-gray-500 mt-2">{language === "en" ? "Find matching jobs worldwide" : "在全球范围内寻找匹配的工作"}</p>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  {language === "en" ? "Job Auto Search" : "职位自动搜索"}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  {language === "en"
                    ? "Upload your resume and search criteria. AI finds matching jobs from global platforms with real links and company information."
                    : "上传您的简历和搜索条件。AI 从全球平台找到匹配的工作，包括真实链接和公司信息。"
                  }
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Resume parsing & analysis" : "简历解析和分析"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Multi-platform job search" : "多平台职位搜索"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Intelligent matching algorithm" : "智能匹配算法"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Real-time job updates" : "实时职位更新"}</span>
                  </li>
                </ul>
                <a href={getLoginUrl()}>
                  <Button className="bg-green-600 hover:bg-green-700 text-white border-0 rounded-lg px-6 py-3">
                    {language === "en" ? "Try Now" : "立即尝试"} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 房产投资演示 */}
        <section id="properties" className="py-20 px-6 bg-white">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  {language === "en" ? "Real Estate Investment" : "房产投资"}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  {language === "en"
                    ? "Find investment properties or buyers worldwide. AI analyzes your criteria and matches you with opportunities from global platforms."
                    : "在全球范围内寻找投资房产或买家。AI 分析您的条件并将您与全球平台的机会相匹配。"
                  }
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex gap-3">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Property requirement analysis" : "房产需求分析"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Global property database" : "全球房产数据库"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Investment opportunity scoring" : "投资机会评分"}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-orange-600 font-bold">✓</span>
                    <span className="text-gray-700">{language === "en" ? "Market insights & trends" : "市场洞察和趋势"}</span>
                  </li>
                </ul>
                <a href={getLoginUrl()}>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white border-0 rounded-lg px-6 py-3">
                    {language === "en" ? "Try Now" : "立即尝试"} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
              <div className="relative h-96 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl overflow-hidden border border-orange-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg mx-auto mb-4 flex items-center justify-center shadow-lg">
                    <span className="text-5xl">🏠</span>
                  </div>
                  <p className="text-gray-700 font-medium">{language === "en" ? "Enter Your Criteria" : "输入您的条件"}</p>
                  <p className="text-sm text-gray-500 mt-2">{language === "en" ? "Find investment opportunities" : "寻找投资机会"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>





        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold mb-6">
              {language === "en" ? "Ready to Get Started?" : "准备好开始了吗？"}
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              {language === "en"
                ? "Join thousands of users finding opportunities worldwide with SmartMatch"
                : "加入数千名使用 SmartMatch 在全球寻找机会的用户"
              }
            </p>
            <a href={getLoginUrl()}>
              <Button className="bg-white text-blue-600 hover:bg-gray-100 border-0 rounded-lg px-8 py-6 text-lg font-semibold">
                {language === "en" ? "Start Free Today" : "立即免费开始"} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <SmartMatchLogo className="w-6 h-6" />
                  <span className="font-bold text-white">SmartMatch</span>
                </div>
                <p className="text-sm">
                  {language === "en"
                    ? "AI-powered intelligent matching platform"
                    : "AI 驱动的智能匹配平台"
                  }
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">
                  {language === "en" ? "Product" : "产品"}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "Features" : "功能"}</a></li>
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "Pricing" : "定价"}</a></li>
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "Security" : "安全"}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">
                  {language === "en" ? "Company" : "公司"}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "About" : "关于"}</a></li>
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "Blog" : "博客"}</a></li>
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "Contact" : "联系"}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">
                  {language === "en" ? "Legal" : "法律"}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "Privacy" : "隐私"}</a></li>
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "Terms" : "条款"}</a></li>
                  <li><a href="#" className="hover:text-white transition">{language === "en" ? "Cookies" : "Cookie"}</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm">
              <p>&copy; 2026 SmartMatch. {language === "en" ? "All rights reserved." : "版权所有。"}</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated user - 简单的仪表板
  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center gap-3">
            <SmartMatchLogo className="w-8 h-8" />
            <span className="text-2xl font-bold text-gray-900">
              <span className="text-3xl font-black text-blue-600">S</span>martMatch
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === "en" ? "zh" : "en")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              <Globe className="w-4 h-4" />
              {language === "en" ? "中文" : "EN"}
            </button>
            <div className="text-sm text-gray-600">
              {language === "en" ? "Welcome" : "欢迎"}, {user?.name || "User"}
            </div>
          </div>
        </div>
      </nav>

      {/* 仪表板 */}
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-12">
          {language === "en" ? "Select a Feature" : "选择功能"}
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div
            className="p-8 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/products")}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <span className="text-2xl">🏢</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {language === "en" ? "Product Matching" : "产品匹配"}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === "en"
                ? "Find global buyers and partners for your products."
                : "为您的产品找到全球买家和合作伙伴。"
              }
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
              {language === "en" ? "Enter" : "进入"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div
            className="p-8 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/jobs")}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <span className="text-2xl">💼</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {language === "en" ? "Job Search" : "职位搜索"}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === "en"
                ? "Discover your ideal job from global platforms."
                : "从全球平台发现您理想的工作。"
              }
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
              {language === "en" ? "Enter" : "进入"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div
            className="p-8 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/properties")}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <span className="text-2xl">🏠</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {language === "en" ? "Real Estate" : "房产投资"}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === "en"
                ? "Find investment properties or buyers worldwide."
                : "在全球范围内寻找投资房产或买家。"
              }
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
              {language === "en" ? "Enter" : "进入"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
