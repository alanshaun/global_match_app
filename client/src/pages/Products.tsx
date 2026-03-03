import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Download, ArrowLeft, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Products() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"upload" | "results">("upload");
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    productPdfUrl: "",
    productPdfKey: "",
    targetCountries: [] as string[],
    numberOfCompanies: 10,
  });

  const [country, setCountry] = useState("");

  // API 调用
  const submitProductMutation = trpc.products.submitProductPDF.useMutation({
    onSuccess: (data: any) => {
      setSubmissionId(data.submissionId);
      setStep("results");
      toast.success("产品已提交，正在进行 AI 分析...");
    },
    onError: (error: any) => {
      toast.error(`提交失败: ${error.message}`);
    },
  });

  const getMatchesQuery = trpc.products.getProductMatches.useQuery(
    { submissionId: submissionId || 0 },
    { enabled: submissionId !== null }
  );

  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      toast.error("请上传 PDF 文件");
      return;
    }

    try {
      setIsUploading(true);
      
      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 调用后端 API 上传到 S3
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileData: Array.from(uint8Array),
          fileType: "product",
        }),
      });

      if (!response.ok) {
        throw new Error("上传失败");
      }

      const uploadResult = await response.json();

      setFormData({
        ...formData,
        productPdfUrl: uploadResult.url,
        productPdfKey: uploadResult.key,
      });

      toast.success("产品 PDF 已上传");
    } catch (error) {
      toast.error(`上传失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsUploading(false);
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

  const handleRemoveCountry = (index: number) => {
    setFormData({
      ...formData,
      targetCountries: formData.targetCountries.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productPdfUrl) {
      toast.error("请上传产品 PDF");
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
              <CardTitle>上传产品 PDF</CardTitle>
              <CardDescription>
                上传您的产品 PDF 文件，我们将使用 AI 自动提取产品信息并为您匹配最合适的目标公司
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 产品 PDF 上传 */}
                <div className="space-y-2">
                  <Label htmlFor="productPdf">产品 PDF 文件 *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <input
                      id="productPdf"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label htmlFor="productPdf" className="cursor-pointer block">
                      {formData.productPdfUrl ? (
                        <div className="text-green-600">
                          <FileText className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-semibold">✓ PDF 已上传</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {formData.productPdfKey.split("/").pop()}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="font-semibold text-gray-700">
                            点击上传或拖拽 PDF 文件
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            系统将自动提取产品名称、描述、规格等信息
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
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
                  disabled={submitProductMutation.isPending || !formData.productPdfUrl || isUploading}
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
