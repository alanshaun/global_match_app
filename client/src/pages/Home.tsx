import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SmartMatchLogo } from "@/components/SmartMatchLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Globe, Menu, X } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { EmailSubscriptionFooter } from "@/components/EmailSubscriptionFooter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F9F8F6" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{language === "en" ? "Loading..." : "加载中..."}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F9F8F6" }}>
        {/* 固定导航栏 */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-7xl">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <SmartMatchLogo className="w-6 h-6" />
              <span className="text-xl font-bold text-gray-900">
                <span className="text-2xl font-black text-blue-600">S</span>martMatch
              </span>
            </div>

            {/* 桌面菜单项 */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => navigate("/products")}
                className="text-gray-700 hover:text-gray-900 transition font-medium text-sm"
              >
                {language === "en" ? "Find Buyers" : "找买家"}
              </button>
              <button
                onClick={() => navigate("/jobs")}
                className="text-gray-700 hover:text-gray-900 transition font-medium text-sm"
              >
                {language === "en" ? "Find Jobs" : "找工作"}
              </button>
              <button
                onClick={() => navigate("/properties")}
                className="text-gray-700 hover:text-gray-900 transition font-medium text-sm"
              >
                {language === "en" ? "Real Estate" : "找房产"}
              </button>
            </div>

            {/* 右侧按钮 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === "en" ? "zh" : "en")}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{language === "en" ? "中文" : "EN"}</span>
              </button>
              <a href={getLoginUrl()} className="hidden sm:block">
                <Button className="bg-black hover:bg-gray-900 text-white border-0 rounded-full px-6 py-2 text-sm">
                  {language === "en" ? "Sign In" : "登录"}
                </Button>
              </a>
              {/* 汉堡菜单按钮 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 移动端菜单 */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200">
              <div className="container mx-auto px-6 py-4 space-y-3">
                <button
                  onClick={() => {
                    navigate("/products");
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  {language === "en" ? "Find Buyers" : "找买家"}
                </button>
                <button
                  onClick={() => {
                    navigate("/jobs");
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  {language === "en" ? "Find Jobs" : "找工作"}
                </button>
                <button
                  onClick={() => {
                    navigate("/properties");
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  {language === "en" ? "Real Estate" : "找房产"}
                </button>
                <a href={getLoginUrl()} className="block">
                  <Button className="w-full bg-black hover:bg-gray-900 text-white border-0 rounded-lg py-2">
                    {language === "en" ? "Sign In" : "登录"}
                  </Button>
                </a>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section - 极简落地页 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-20">
          {/* 主标语 */}
          <div className="text-center max-w-5xl">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-gray-900 mb-8 leading-tight tracking-tight">
              {language === "en"
                ? "Find your next opportunity"
                : "发现您的下一个机会"
              }
            </h1>

            {/* 副标题 */}
            <p className="text-lg md:text-xl text-gray-600 mb-16 font-light leading-relaxed">
              {language === "en"
                ? "AI-powered matching to connect you with global buyers, jobs, and investment opportunities."
                : "AI 驱动的匹配系统，连接您与全球买家、工作和投资机会。"
              }
            </p>

            {/* 演示图片 */}
            <div className="relative w-full max-w-4xl mx-auto mb-16">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663378994043/YX66aCBXWR7kw3XuoMDswL/demo-screenshot-7C3iiTBNahwomDruwDYQmj.webp"
                  alt="SmartMatch Demo"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* CTA 按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={() => navigate("/products")}
                className="px-8 py-4 bg-black text-white rounded-full font-medium hover:bg-gray-900 transition text-lg"
              >
                {language === "en" ? "Get Started" : "立即开始"}
              </button>
              <a href={getLoginUrl()}>
                <button className="px-8 py-4 bg-gray-200 text-gray-900 rounded-full font-medium hover:bg-gray-300 transition text-lg">
                  {language === "en" ? "Learn More" : "了解更多"}
                </button>
              </a>
            </div>

            {/* 社交证明 - 统计数据 */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">5K+</div>
                <p className="text-gray-600 text-sm md:text-base">
                  {language === "en" ? "Active Users" : "活跃用户"}
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">50K+</div>
                <p className="text-gray-600 text-sm md:text-base">
                  {language === "en" ? "Matches Made" : "匹配成功"}
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">95%</div>
                <p className="text-gray-600 text-sm md:text-base">
                  {language === "en" ? "Success Rate" : "成功率"}
                </p>
              </div>
            </div>

            {/* 用户评价 */}
            <div className="max-w-2xl mx-auto">
              <p className="text-gray-600 italic mb-3">
                "{language === "en"
                  ? "SmartMatch helped us find qualified buyers in just 2 weeks. Highly recommended!"
                  : "SmartMatch 帮助我们在两周内找到了合格的买家。强烈推荐！"
                }"
              </p>
              <p className="text-gray-500 text-sm">
                {language === "en" ? "— Sarah Johnson, CEO at TechWave" : "— Sarah Johnson，TechWave CEO"}
              </p>
            </div>
          </div>
        </div>

        {/* Email Subscription Footer */}
        <EmailSubscriptionFooter />

        {/* Footer - 简洁 */}
        <footer className="border-t border-gray-300 py-8 px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-gray-600 text-sm">
                <p>&copy; 2026 SmartMatch. {language === "en" ? "All rights reserved." : "版权所有。"}</p>
              </div>
              <div className="flex gap-8 text-sm text-gray-600">
                <a href="#" className="hover:text-gray-900 transition">{language === "en" ? "Privacy" : "隐私"}</a>
                <a href="#" className="hover:text-gray-900 transition">{language === "en" ? "Terms" : "条款"}</a>
                <a href="#" className="hover:text-gray-900 transition">{language === "en" ? "Contact" : "联系"}</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated user - 简单的仪表板
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9F8F6" }}>
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center gap-2">
            <SmartMatchLogo className="w-6 h-6" />
            <span className="text-xl font-bold text-gray-900">
              <span className="text-2xl font-black text-blue-600">S</span>martMatch
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
              {language === "en" ? "Find Buyers" : "找买家"}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === "en"
                ? "Upload your product and find global buyers and partners."
                : "上传您的产品，找到全球买家和合作伙伴。"
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
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
              <span className="text-2xl">💼</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {language === "en" ? "Find Jobs" : "找工作"}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === "en"
                ? "Upload your resume and discover matching jobs worldwide."
                : "上传您的简历，发现全球匹配的工作。"
              }
            </p>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white border-0">
              {language === "en" ? "Enter" : "进入"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div
            className="p-8 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/properties")}
          >
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
              <span className="text-2xl">🏠</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {language === "en" ? "Real Estate" : "找房产"}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === "en"
                ? "Find investment properties or buyers worldwide."
                : "在全球范围内寻找投资房产或买家。"
              }
            </p>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0">
              {language === "en" ? "Enter" : "进入"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
