import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ExternalLink,
  ArrowLeft,
  MapPin,
  DollarSign,
  TrendingUp,
  Home,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

interface PropertyMatch {
  id: number;
  title: string;
  description: string;
  location: string;
  country: string;
  price: number;
  priceCurrency: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  roi: number;
  matchScore: number;
  matchReason: string;
  source: string;
  sourceUrl: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  tags: string[];
}

interface ProgressUpdate {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

export default function Properties() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"upload" | "results">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [propertyMatches, setPropertyMatches] = useState<PropertyMatch[]>([]);

  // 表单状态
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    country: "US",
    propertyType: "residential",
    budget: 500000,
    budgetCurrency: "USD",
    propertyCount: 10,
    submissionType: "buyer_demand" as "buyer_demand" | "seller_listing" | "investor_opportunity",
    transactionType: "buy" as "buy" | "sell" | "rent" | "invest",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error("请输入房产需求或房源描述");
      return;
    }

    if (!formData.location.trim()) {
      toast.error("请输入目标位置");
      return;
    }

    setIsProcessing(true);
    setProgress(null);
    setPropertyMatches([]);

    // 构建查询参数
    const params = new URLSearchParams();
    params.append("description", formData.description);
    params.append("location", formData.location);
    params.append("country", formData.country);
    params.append("propertyType", formData.propertyType);
    params.append("budget", formData.budget.toString());
    params.append("propertyCount", formData.propertyCount.toString());

    // 使用 EventSource 监听 SSE 进度更新
    const eventSource = new EventSource(
      `/api/process-properties/1?${params.toString()}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);

        if (data.data && data.data.properties) {
          setPropertyMatches(data.data.properties);
          setStep("results");
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource.close();
      setIsProcessing(false);

      if (propertyMatches.length === 0) {
        toast.error("搜索失败，请重试");
      }
    };

    // 监听 done 事件
    eventSource.addEventListener("done", () => {
      eventSource.close();
      setIsProcessing(false);
      if (propertyMatches.length > 0) {
        toast.success(`找到 ${propertyMatches.length} 个匹配房源`);
      }
    });
  };

  // 上传页面
  if (step === "upload") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
          >
            <ArrowLeft size={20} />
            返回首页
          </button>

          {/* 标题 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              房产投资/买卖匹配
            </h1>
            <p className="text-gray-600">
              输入房产需求或房源信息，AI 智能匹配全球买家/卖家/投资机会
            </p>
          </div>

          {/* 上传和配置区域 */}
          <Card className="p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 提交类型 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    提交类型 *
                  </label>
                  <select
                    value={formData.submissionType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        submissionType: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="buyer_demand">买家需求</option>
                    <option value="seller_listing">卖家房源</option>
                    <option value="investor_opportunity">投资机会</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    交易类型 *
                  </label>
                  <select
                    value={formData.transactionType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transactionType: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="buy">购买</option>
                    <option value="sell">出售</option>
                    <option value="rent">出租</option>
                    <option value="invest">投资</option>
                  </select>
                </div>
              </div>

              {/* 房产描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  房产需求/房源描述 *
                </label>
                <textarea
                  placeholder="例如：洛杉矶3-5卧室海景房，预算$150w-250w，投资出租回报>6%"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                />
              </div>

              {/* 位置信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标位置 *
                  </label>
                  <Input
                    type="text"
                    placeholder="例如：Los Angeles"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: e.target.value,
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标国家 *
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        country: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="US">美国</option>
                    <option value="UK">英国</option>
                    <option value="CA">加拿大</option>
                    <option value="CN">中国</option>
                    <option value="AU">澳大利亚</option>
                  </select>
                </div>
              </div>

              {/* 房产类型和预算 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    房产类型
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        propertyType: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="residential">住宅</option>
                    <option value="commercial">商业</option>
                    <option value="land">土地</option>
                    <option value="mixed">混合</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    预算 (USD)
                  </label>
                  <Input
                    type="number"
                    placeholder="例如：500000"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* 房产数量选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期望房产数量
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={formData.propertyCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        propertyCount: parseInt(e.target.value),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-blue-600 min-w-[60px] text-right">
                    {formData.propertyCount}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">选择要搜索的房产数量(1-50)</p>
              </div>

              {/* 提交按钮 */}
              <Button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" />
                    搜索中...
                  </>
                ) : (
                  <>
                    <Home className="mr-2" />
                    开始搜索
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* 进度显示 */}
          {isProcessing && progress && (
            <Card className="mt-6 p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {progress.message}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {progress.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // 结果页面
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => {
            setStep("upload");
            setPropertyMatches([]);
          }}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft size={20} />
          返回搜索
        </button>

        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            房产匹配结果
          </h1>
          <p className="text-gray-600">
            找到 {propertyMatches.length} 个匹配房源，按匹配度排序
          </p>
        </div>

        {/* 房产卡片列表 */}
        {propertyMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {propertyMatches.map((property) => (
              <Card key={property.id} className="p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="space-y-4">
                  {/* 标题和匹配度 */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">
                        {property.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {property.description}
                      </p>
                    </div>
                    <Badge className="bg-blue-600 text-white whitespace-nowrap">
                      {property.matchScore}% 匹配
                    </Badge>
                  </div>

                  {/* 位置和价格 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">位置</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {property.location}, {property.country}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">价格</p>
                        <p className="text-sm font-semibold text-gray-800">
                          ${property.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 房产详情 */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-gray-100 p-2 rounded">
                      <p className="text-xs text-gray-500">卧室</p>
                      <p className="font-semibold text-gray-800">
                        {property.bedrooms}
                      </p>
                    </div>
                    <div className="bg-gray-100 p-2 rounded">
                      <p className="text-xs text-gray-500">浴室</p>
                      <p className="font-semibold text-gray-800">
                        {property.bathrooms}
                      </p>
                    </div>
                    <div className="bg-gray-100 p-2 rounded">
                      <p className="text-xs text-gray-500">面积</p>
                      <p className="font-semibold text-gray-800">
                        {property.squareFeet} sqft
                      </p>
                    </div>
                  </div>

                  {/* 投资回报率 */}
                  {property.roi > 0 && (
                    <div className="flex items-center gap-2 bg-green-50 p-3 rounded">
                      <TrendingUp size={16} className="text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">预期回报率</p>
                        <p className="text-sm font-semibold text-green-600">
                          {property.roi}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 标签 */}
                  {property.tags && property.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {property.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 经纪人信息 */}
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-500 mb-1">房产经纪人</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {property.agentName}
                    </p>
                    <p className="text-xs text-gray-600">
                      📧 {property.agentEmail}
                    </p>
                    <p className="text-xs text-gray-600">
                      📞 {property.agentPhone}
                    </p>
                  </div>

                  {/* 查看房源按钮 */}
                  <a
                    href={property.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    查看房源
                    <ExternalLink size={16} />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Home size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">暂无匹配房源，请尝试调整搜索条件</p>
          </Card>
        )}
      </div>
    </div>
  );
}
