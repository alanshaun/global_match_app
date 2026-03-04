import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Briefcase, FileText, Home as HomeIcon, Sparkles, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader2 className="animate-spin w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <p className="text-white text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black overflow-hidden">
        {/* 背景装饰 */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        </div>

        {/* 内容 */}
        <div className="relative z-10">
          {/* 导航栏 */}
          <nav className="backdrop-blur-md bg-slate-900/40 border-b border-cyan-500/20 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-cyan-400" />
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  全球匹配平台
                </span>
              </div>
              <a href={getLoginUrl()}>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 rounded-full px-6">
                  登录
                </Button>
              </a>
            </div>
          </nav>

          {/* 主内容 */}
          <div className="container mx-auto px-4 py-20">
            {/* 标题区域 */}
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-300">AI 驱动的智能匹配平台</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  全球匹配
                </span>
                <br />
                <span className="text-white">一站式解决方案</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                AI 智能分析，全网搜索，精准匹配。产品、职位、房产，一个平台搞定
              </p>
              <a href={getLoginUrl()}>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 rounded-full px-8 py-6 text-lg">
                  立即开始 <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>

            {/* 功能卡片网格 */}
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* 功能一：产品客户匹配 */}
              <div
                className="group relative"
                onMouseEnter={() => setHoveredCard("products")}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative backdrop-blur-xl bg-slate-800/40 border border-cyan-500/30 rounded-2xl p-8 hover:border-cyan-400/60 transition-all duration-300 cursor-pointer h-full flex flex-col"
                  onClick={() => navigate("/products")}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-cyan-500/20 rounded-lg group-hover:bg-cyan-500/40 transition-colors">
                      <Briefcase className="w-6 h-6 text-cyan-400" />
                    </div>
                    <Zap className="w-5 h-5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">产品客户匹配</h3>
                  <p className="text-gray-300 text-sm mb-6 flex-grow">
                    上传产品，AI 智能匹配全球目标公司
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
                      AI 分析产品特征
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
                      智能匹配目标公司
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
                      自动生成 Cold Email
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 rounded-lg">
                    开始匹配 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* 功能二：职位自动搜索 */}
              <div
                className="group relative"
                onMouseEnter={() => setHoveredCard("jobs")}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative backdrop-blur-xl bg-slate-800/40 border border-green-500/30 rounded-2xl p-8 hover:border-green-400/60 transition-all duration-300 cursor-pointer h-full flex flex-col"
                  onClick={() => navigate("/jobs")}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-green-500/20 rounded-lg group-hover:bg-green-500/40 transition-colors">
                      <FileText className="w-6 h-6 text-green-400" />
                    </div>
                    <Zap className="w-5 h-5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">职位自动搜索</h3>
                  <p className="text-gray-300 text-sm mb-6 flex-grow">
                    上传简历，全网搜索最匹配的职位
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                      简历自动解析
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                      全网职位搜索
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                      智能匹配度排序
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 rounded-lg">
                    开始搜索 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* 功能三：房产投资匹配 */}
              <div
                className="group relative"
                onMouseEnter={() => setHoveredCard("properties")}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative backdrop-blur-xl bg-slate-800/40 border border-purple-500/30 rounded-2xl p-8 hover:border-purple-400/60 transition-all duration-300 cursor-pointer h-full flex flex-col"
                  onClick={() => navigate("/properties")}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/40 transition-colors">
                      <HomeIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <Zap className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">房产投资匹配</h3>
                  <p className="text-gray-300 text-sm mb-6 flex-grow">
                    AI 智能匹配全球房产买家/卖家
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                      AI 分析房产特征
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                      全网房源搜索
                    </div>
                    <div className="flex items-center text-sm text-gray-300">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                      投资回报分析
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 rounded-lg">
                    开始匹配 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 特性列表 */}
            <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                  AI 驱动
                </div>
                <p className="text-gray-400">使用 Kimi 2.5 LLM 进行智能分析</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-2">
                  全网搜索
                </div>
                <p className="text-gray-400">覆盖全球主流平台数据</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                  精准匹配
                </div>
                <p className="text-gray-400">基于 AI 的智能匹配算法</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* 导航栏 */}
      <nav className="backdrop-blur-md bg-slate-900/40 border-b border-cyan-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              全球匹配平台
            </span>
          </div>
          <div className="text-sm text-gray-300">
            欢迎，{user?.name || "用户"}
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-12">选择功能</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* 功能一 */}
            <div
              className="group relative cursor-pointer"
              onClick={() => navigate("/products")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative backdrop-blur-xl bg-slate-800/40 border border-cyan-500/30 rounded-2xl p-8 hover:border-cyan-400/60 transition-all duration-300">
                <div className="p-3 bg-cyan-500/20 rounded-lg w-fit mb-6 group-hover:bg-cyan-500/40 transition-colors">
                  <Briefcase className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">产品客户匹配</h3>
                <p className="text-gray-300 mb-6">上传产品，AI 智能匹配全球目标公司</p>
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 rounded-lg">
                  进入 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* 功能二 */}
            <div
              className="group relative cursor-pointer"
              onClick={() => navigate("/jobs")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative backdrop-blur-xl bg-slate-800/40 border border-green-500/30 rounded-2xl p-8 hover:border-green-400/60 transition-all duration-300">
                <div className="p-3 bg-green-500/20 rounded-lg w-fit mb-6 group-hover:bg-green-500/40 transition-colors">
                  <FileText className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">职位自动搜索</h3>
                <p className="text-gray-300 mb-6">上传简历，全网搜索最匹配的职位</p>
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 rounded-lg">
                  进入 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* 功能三 */}
            <div
              className="group relative cursor-pointer"
              onClick={() => navigate("/properties")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative backdrop-blur-xl bg-slate-800/40 border border-purple-500/30 rounded-2xl p-8 hover:border-purple-400/60 transition-all duration-300">
                <div className="p-3 bg-purple-500/20 rounded-lg w-fit mb-6 group-hover:bg-purple-500/40 transition-colors">
                  <HomeIcon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">房产投资匹配</h3>
                <p className="text-gray-300 mb-6">AI 智能匹配全球房产买家/卖家</p>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 rounded-lg">
                  进入 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
