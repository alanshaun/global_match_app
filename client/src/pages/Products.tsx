import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Download, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Products() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"upload" | "results">("upload");
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    productName: "",
    productDescription: "",
    productCategory: "",
    productImageUrls: [] as string[],
    targetCountries: [] as string[],
    numberOfCompanies: 10,
  });

  const [imageUrl, setImageUrl] = useState("");
  const [country, setCountry] = useState("");

  // API 调用
  const submitProductMutation = trpc.products.submitProduct.useMutation({
    onSuccess: (data) => {
      setSubmissionId(data.submissionId);
      setStep("results");
      toast.success("产品已提交，正在进行 AI 分析...");
    },
    onError: (error) => {
      toast.error(`提交失败: ${error.message}`);
    },
  });

  const getMatchesQuery = trpc.products.getProductMatches.useQuery(
    { submissionId: submissionId || 0 },
    { enabled: submissionId !== null }
  );

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setFormData({
        ...formData,
        productImageUrls: [...formData.productImageUrls, imageUrl],
      });
      setImageUrl("");
    }
  };

  const handleAddCountry = () => {
    if (country.trim()) {
      setFormData({
        ...formData,
        targetCountries: [...formData.targetCountries, country],
      });
      setCountry("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      productImageUrls: formData.productImageUrls.filter((_, i) => i !== index),
    });
  };

  const handleRemoveCountry = (index: number) => {
    setFormData({
      ...formData,
      targetCountries: formData.targetCountries.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productName.trim() || !formData.productDescription.trim()) {
      toast.error("请填写产品名称和描述");
      return;
    }

    submitProductMutation.mutate(formData);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("邮件已复制到剪贴板");
  };

  if (step === "upload") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4 flex items-center">
            <button
              onClick={() => navigate("/")}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">产品客户匹配</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>上传产品信息</CardTitle>
              <CardDescription>
                请填写您的产品详情，我们将使用 AI 为您匹配最合适的目标公司
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 产品名称 */}
                <div className="space-y-2">
                  <Label htmlFor="productName">产品名称 *</Label>
                  <Input
                    id="productName"
                    placeholder="例如：智能家居控制系统"
                    value={formData.productName}
                    onChange={(e) =>
                      setFormData({ ...formData, productName: e.target.value })
                    }
                  />
                </div>

                {/* 产品描述 */}
                <div className="space-y-2">
                  <Label htmlFor="productDescription">产品描述 *</Label>
                  <Textarea
                    id="productDescription"
                    placeholder="详细描述您的产品功能、特点和优势..."
                    rows={4}
                    value={formData.productDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, productDescription: e.target.value })
                    }
                  />
                </div>

                {/* 产品类别 */}
                <div className="space-y-2">
                  <Label htmlFor="productCategory">产品类别</Label>
                  <Input
                    id="productCategory"
                    placeholder="例如：电子产品、家居用品等"
                    value={formData.productCategory}
                    onChange={(e) =>
                      setFormData({ ...formData, productCategory: e.target.value })
                    }
                  />
                </div>

                {/* 产品图片 */}
                <div className="space-y-2">
                  <Label>产品图片 URL</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入图片 URL"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddImage}
                    >
                      添加
                    </Button>
                  </div>
                  {formData.productImageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.productImageUrls.map((url, index) => (
                        <div
                          key={index}
                          className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          <span className="truncate max-w-xs">{url}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 目标国家 */}
                <div className="space-y-2">
                  <Label>目标国家/地区</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="例如：美国、欧洲、日本"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddCountry}
                    >
                      添加
                    </Button>
                  </div>
                  {formData.targetCountries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.targetCountries.map((c, index) => (
                        <div
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {c}
                          <button
                            type="button"
                            onClick={() => handleRemoveCountry(index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 公司数量 */}
                <div className="space-y-2">
                  <Label htmlFor="numberOfCompanies">
                    期望匹配公司数量: {formData.numberOfCompanies}
                  </Label>
                  <input
                    id="numberOfCompanies"
                    type="range"
                    min="1"
                    max="50"
                    value={formData.numberOfCompanies}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        numberOfCompanies: parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>

                {/* 提交按钮 */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={submitProductMutation.isPending}
                >
                  {submitProductMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    "提交产品"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 结果页面
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => setStep("upload")}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">匹配结果</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {getMatchesQuery.isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : getMatchesQuery.error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">加载失败: {getMatchesQuery.error.message}</p>
            </CardContent>
          </Card>
        ) : getMatchesQuery.data?.matches && getMatchesQuery.data.matches.length > 0 ? (
          <div className="space-y-4">
            {getMatchesQuery.data.matches.map((match, index) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-blue-600">
                          #{index + 1}
                        </span>
                        <CardTitle>{match.companyName}</CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        {match.companyDescription}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {Math.round(parseFloat(match.matchScore || "0"))}%
                      </div>
                      <p className="text-sm text-gray-600">匹配度</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 联系信息 */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {match.contactEmail && (
                      <div>
                        <p className="text-sm text-gray-600">邮箱</p>
                        <p className="font-mono text-sm">{match.contactEmail}</p>
                      </div>
                    )}
                    {match.contactPhone && (
                      <div>
                        <p className="text-sm text-gray-600">电话</p>
                        <p className="font-mono text-sm">{match.contactPhone}</p>
                      </div>
                    )}
                    {match.companyWebsite && (
                      <div>
                        <p className="text-sm text-gray-600">官网</p>
                        <a
                          href={match.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          访问
                        </a>
                      </div>
                    )}
                    {match.companyLinkedin && (
                      <div>
                        <p className="text-sm text-gray-600">LinkedIn</p>
                        <a
                          href={match.companyLinkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          访问
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Cold Email */}
                  {match.coldEmail && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-semibold text-sm">Cold Email</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleCopyEmail(
                              `主题: ${match.coldEmail.subject}\n\n${match.coldEmail.emailBody}`
                            )
                          }
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          复制
                        </Button>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mb-2">
                        {match.coldEmail.subject}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {match.coldEmail.emailBody}
                      </p>
                    </div>
                  )}

                  {/* 匹配原因 */}
                  {match.matchReason && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <span className="font-semibold">匹配原因：</span>
                        {match.matchReason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">暂无匹配结果</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
