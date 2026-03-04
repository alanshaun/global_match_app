import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SmartMatchLogo } from "@/components/SmartMatchLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Globe } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { language, setLanguage, t } = useLanguage();

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

            {/* 菜单项 */}
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
                {language === "en" ? "中文" : "EN"}
              </button>
              <a href={getLoginUrl()}>
                <Button className="bg-black hover:bg-gray-900 text-white border-0 rounded-full px-6 py-2 text-sm">
                  {language === "en" ? "Sign In" : "登录"}
                </Button>
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section - 极简落地页 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-20">
          {/* 主标语 */}
          <div className="text-center max-w-5xl">
            <h1 className="text-7xl md:text-8xl font-serif font-bold text-gray-900 mb-8 leading-tight tracking-tight">
              {language === "en"
                ? "Find your next opportunity"
                : "发现您的下一个机会"
              }
            </h1>

            {/* 副标题 */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 font-light leading-relaxed">
              {language === "en"
                ? "AI-powered matching to connect you with global buyers, jobs, and investment opportunities."
                : "AI 驱动的匹配系统，连接您与全球买家、工作和投资机会。"
              }
            </p>

            {/* 动态演示区 */}
            <div className="relative w-full max-w-4xl mx-auto mb-12">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "#E8E3DB" }}>
                {/* 动态演示区域 - 使用渐变和动画 */}
                <div className="w-full h-full flex items-center justify-center relative">
                  {/* 背景动画 */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                    <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-1/2 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
                  </div>

                  {/* 演示内容 */}
                  <div className="relative z-10 text-center">
                    <div className="inline-block">
                      <div className="text-6xl mb-4">✨</div>
                      <p className="text-gray-700 font-medium text-lg">
                        {language === "en" ? "AI-Powered Matching" : "AI 智能匹配"}
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        {language === "en"
                          ? "Real-time analysis & global search"
                          : "实时分析和全球搜索"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA 按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
          </div>
        </div>

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
