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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white">
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
              <div className="relative group">
                <button className="text-gray-700 hover:text-gray-900 transition flex items-center gap-1">
                  About <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="relative group">
                <button className="text-gray-700 hover:text-gray-900 transition flex items-center gap-1">
                  Features <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition">Resources</a>
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

        {/* Hero Section - 中心标题布局 */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute top-20 right-10 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-8 left-10 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

          <div className="relative z-10 text-center max-w-4xl">
            {/* 小标签 */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              {language === "en" ? "AI-Powered Matching" : "AI 驱动的智能匹配"}
            </div>

            {/* 主标题 */}
            <h1 className="text-6xl md:text-7xl font-serif text-gray-900 mb-6 leading-tight">
              {language === "en" 
                ? "SmartMatch turns seekers into finders"
                : "SmartMatch 将寻求者变成发现者"
              }
            </h1>

            {/* 副标题和引用 */}
            <div className="mb-12">
              <p className="text-xl md:text-2xl text-gray-600 italic mb-6 leading-relaxed">
                {language === "en"
                  ? "\"Find what you're looking for, regardless of where it is in the world.\""
                  : "\"找到你要找的东西，无论它在世界的哪个角落。\""
                }
              </p>
              <p className="text-gray-500">
                {language === "en" ? "— SmartMatch Team" : "— SmartMatch 团队"}
              </p>
            </div>

            {/* CTA 按钮 */}
            <div className="flex gap-4 justify-center mb-12">
              <a href={getLoginUrl()}>
                <Button className="bg-black hover:bg-gray-900 text-white border-0 rounded-full px-8 py-6 text-lg">
                  {language === "en" ? "Get Started" : "开始使用"} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <Button variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-50 rounded-full px-8 py-6 text-lg">
                {language === "en" ? "Watch Demo" : "观看演示"}
              </Button>
            </div>

            {/* 下方提示 */}
            <p className="text-sm text-gray-500">
              {language === "en" 
                ? "✓ No credit card required • ✓ Free forever plan • ✓ 24/7 support"
                : "✓ 无需信用卡 • ✓ 永久免费计划 • ✓ 24/7 支持"
              }
            </p>
          </div>

          {/* 向下滚动指示 */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-gray-400" />
          </div>
        </section>

        {/* 动态内容区域 - 演示 */}
        <section className="py-20 px-6 bg-white">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  {language === "en" ? "How It Works" : "工作原理"}
                </h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {language === "en" ? "Upload Your Info" : "上传您的信息"}
                      </h3>
                      <p className="text-gray-600">
                        {language === "en" 
                          ? "Share your product, resume, or property details with our platform."
                          : "与我们的平台分享您的产品、简历或房产详情。"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">2</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {language === "en" ? "AI Analysis" : "AI 分析"}
                      </h3>
                      <p className="text-gray-600">
                        {language === "en"
                          ? "Our advanced AI analyzes your information and searches globally."
                          : "我们先进的 AI 分析您的信息并进行全球搜索。"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">3</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {language === "en" ? "Get Results" : "获取结果"}
                      </h3>
                      <p className="text-gray-600">
                        {language === "en"
                          ? "Receive ranked matches with contact info and outreach templates."
                          : "获得排名的匹配结果，包括联系信息和外联模板。"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl overflow-hidden flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-gray-600 text-lg font-medium">
                    {language === "en" ? "Interactive Demo" : "交互式演示"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 特性预览 */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {language === "en" ? "Three Powerful Features" : "三大强大功能"}
              </h2>
              <p className="text-xl text-gray-600">
                {language === "en"
                  ? "Everything you need to find opportunities worldwide"
                  : "找到全球机会所需的一切"
                }
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-2xl">🏢</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {language === "en" ? "Product Matching" : "产品匹配"}
                </h3>
                <p className="text-gray-600">
                  {language === "en"
                    ? "Find global buyers and partners for your products."
                    : "为您的产品找到全球买家和合作伙伴。"
                  }
                </p>
              </div>

              <div className="p-8 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-2xl">💼</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {language === "en" ? "Job Search" : "职位搜索"}
                </h3>
                <p className="text-gray-600">
                  {language === "en"
                    ? "Discover your ideal job from global platforms."
                    : "从全球平台发现您理想的工作。"
                  }
                </p>
              </div>

              <div className="p-8 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <span className="text-2xl">🏠</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {language === "en" ? "Real Estate" : "房产投资"}
                </h3>
                <p className="text-gray-600">
                  {language === "en"
                    ? "Find investment properties or buyers worldwide."
                    : "在全球范围内寻找投资房产或买家。"
                  }
                </p>
              </div>
            </div>
          </div>
        </section>



        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold mb-6">
              {language === "en" ? "Ready to Find Your Match?" : "准备好找到您的匹配了吗？"}
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              {language === "en"
                ? "Join thousands of users finding opportunities worldwide"
                : "加入数千名在全球寻找机会的用户"
              }
            </p>
            <a href={getLoginUrl()}>
              <Button className="bg-white text-blue-600 hover:bg-gray-100 border-0 rounded-full px-8 py-6 text-lg font-semibold">
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
