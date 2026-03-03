import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Briefcase, FileText } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">全球匹配平台</h1>
            <p className="text-xl text-gray-600 mb-8">
              智能产品客户匹配 × 职位自动搜索
            </p>
            <a href={getLoginUrl()}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                登录开始使用
              </Button>
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* 功能一卡片 */}
            <Card className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Briefcase className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>产品客户匹配</CardTitle>
                <CardDescription>
                  AI 智能匹配全球目标公司
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ 上传产品信息和图片</li>
                  <li>✓ AI 分析产品特征</li>
                  <li>✓ 智能匹配目标公司</li>
                  <li>✓ 全网搜索联系方式</li>
                  <li>✓ 自动生成 Cold Email</li>
                </ul>
              </CardContent>
            </Card>

            {/* 功能二卡片 */}
            <Card className="border-2 border-green-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="w-8 h-8 text-green-600 mb-2" />
                <CardTitle>职位自动搜索</CardTitle>
                <CardDescription>
                  全网搜索最匹配的职位
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ 上传简历自动解析</li>
                  <li>✓ 设置岗位和地点</li>
                  <li>✓ 全网职位搜索</li>
                  <li>✓ 智能匹配度计算</li>
                  <li>✓ 时效性过滤（半年内）</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">全球匹配平台</h1>
          <div className="text-sm text-gray-600">
            欢迎，{user?.name || "用户"}
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">选择功能</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 功能一 */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-400"
              onClick={() => navigate("/products")}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">产品客户匹配</CardTitle>
                    <CardDescription className="mt-2">
                      上传产品，AI 智能匹配全球目标公司
                    </CardDescription>
                  </div>
                  <Briefcase className="w-8 h-8 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    AI 分析产品特征和市场定位
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    自定义搜索参数（公司数量、国家）
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    全网搜索公司联系方式
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    自动生成个性化 Cold Email
                  </div>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  开始匹配 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* 功能二 */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:border-green-400"
              onClick={() => navigate("/jobs")}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">职位自动搜索</CardTitle>
                    <CardDescription className="mt-2">
                      上传简历，全网搜索最匹配的职位
                    </CardDescription>
                  </div>
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    上传简历自动解析关键信息
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    设置岗位、城市、薪资范围
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    搜索 Indeed、LinkedIn、Boss 等平台
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    按匹配度排序，仅显示半年内职位
                  </div>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  开始搜索 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
