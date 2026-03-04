import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SmartMatchLogo } from "@/components/SmartMatchLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Briefcase, FileText, Home as HomeIcon, Sparkles, Zap, Globe } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { language, setLanguage, t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="text-center">
          <Zap className="animate-spin w-12 h-12 text-blue-400 mx-auto mb-4" />
          <p className="text-white text-lg">{language === "en" ? "Loading..." : "加载中..."}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 overflow-hidden">
        {/* 背景装饰 */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        </div>

        {/* 内容 */}
        <div className="relative z-10">
          {/* 导航栏 */}
          <nav className="backdrop-blur-md bg-slate-950/40 border-b border-blue-500/20 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <SmartMatchLogo className="w-8 h-8" />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  <span className="text-3xl font-black">S</span>martMatch
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLanguage(language === "en" ? "zh" : "en")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:border-blue-400/60 text-sm text-blue-300 transition-all"
                >
                  <Globe className="w-4 h-4" />
                  {language === "en" ? "中文" : "English"}
                </button>
                <a href={getLoginUrl()}>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg px-6">
                    {t("nav.login")}
                  </Button>
                </a>
              </div>
            </div>
          </nav>

          {/* 主内容 */}
          <div className="container mx-auto px-4 py-20">
            {/* 标题区域 */}
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">{t("home.tagline")}</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  {t("home.title")}
                </span>
                <br />
                <span className="text-white">{t("home.subtitle")}</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                {t("home.description")}
              </p>
              <a href={getLoginUrl()}>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg px-8 py-6 text-lg">
                  {t("home.cta")} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>

            {/* 功能卡片网格 */}
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* 功能一：产品客户匹配 */}
              <div
                className="group relative cursor-pointer"
                onClick={() => navigate("/products")}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative backdrop-blur-xl bg-slate-900/40 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-400/60 transition-all duration-300 h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/40 transition-colors">
                      <Briefcase className="w-6 h-6 text-blue-400" />
                    </div>
                    <Zap className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t("feature.products.title")}</h3>
                  <p className="text-gray-300 text-sm mb-6 flex-grow">
                    {t("feature.products.desc")}
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.products.feature1")}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.products.feature2")}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.products.feature3")}
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg">
                    {t("feature.products.button")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* 功能二：职位自动搜索 */}
              <div
                className="group relative cursor-pointer"
                onClick={() => navigate("/jobs")}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative backdrop-blur-xl bg-slate-900/40 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-400/60 transition-all duration-300 h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/40 transition-colors">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <Zap className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t("feature.jobs.title")}</h3>
                  <p className="text-gray-300 text-sm mb-6 flex-grow">
                    {t("feature.jobs.desc")}
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.jobs.feature1")}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.jobs.feature2")}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.jobs.feature3")}
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg">
                    {t("feature.jobs.button")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* 功能三：房产投资匹配 */}
              <div
                className="group relative cursor-pointer"
                onClick={() => navigate("/properties")}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative backdrop-blur-xl bg-slate-900/40 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-400/60 transition-all duration-300 h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/40 transition-colors">
                      <HomeIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <Zap className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t("feature.properties.title")}</h3>
                  <p className="text-gray-300 text-sm mb-6 flex-grow">
                    {t("feature.properties.desc")}
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.properties.feature1")}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.properties.feature2")}
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      {t("feature.properties.feature3")}
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg">
                    {t("feature.properties.button")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 特性列表 */}
            <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                  {t("features.ai")}
                </div>
                <p className="text-gray-400">{t("features.ai.desc")}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                  {t("features.search")}
                </div>
                <p className="text-gray-400">{t("features.search.desc")}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                  {t("features.matching")}
                </div>
                <p className="text-gray-400">{t("features.matching.desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* 导航栏 */}
      <nav className="backdrop-blur-md bg-slate-950/40 border-b border-blue-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SmartMatchLogo className="w-8 h-8" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              <span className="text-3xl font-black">S</span>martMatch
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === "en" ? "zh" : "en")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:border-blue-400/60 text-sm text-blue-300 transition-all"
            >
              <Globe className="w-4 h-4" />
              {language === "en" ? "中文" : "English"}
            </button>
            <div className="text-sm text-gray-300">
              {t("nav.welcome")}, {user?.name || "User"}
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-12">{t("dashboard.selectFeature")}</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* 功能一 */}
            <div
              className="group relative cursor-pointer"
              onClick={() => navigate("/products")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative backdrop-blur-xl bg-slate-900/40 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-400/60 transition-all duration-300">
                <div className="p-3 bg-blue-500/20 rounded-lg w-fit mb-6 group-hover:bg-blue-500/40 transition-colors">
                  <Briefcase className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t("feature.products.title")}</h3>
                <p className="text-gray-300 mb-6">{t("feature.products.desc")}</p>
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg">
                  {t("dashboard.enter")} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* 功能二 */}
            <div
              className="group relative cursor-pointer"
              onClick={() => navigate("/jobs")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative backdrop-blur-xl bg-slate-900/40 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-400/60 transition-all duration-300">
                <div className="p-3 bg-blue-500/20 rounded-lg w-fit mb-6 group-hover:bg-blue-500/40 transition-colors">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t("feature.jobs.title")}</h3>
                <p className="text-gray-300 mb-6">{t("feature.jobs.desc")}</p>
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg">
                  {t("dashboard.enter")} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* 功能三 */}
            <div
              className="group relative cursor-pointer"
              onClick={() => navigate("/properties")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative backdrop-blur-xl bg-slate-900/40 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-400/60 transition-all duration-300">
                <div className="p-3 bg-blue-500/20 rounded-lg w-fit mb-6 group-hover:bg-blue-500/40 transition-colors">
                  <HomeIcon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t("feature.properties.title")}</h3>
                <p className="text-gray-300 mb-6">{t("feature.properties.desc")}</p>
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg">
                  {t("dashboard.enter")} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
