import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, X, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface FormData {
  productPdfUrl: string;
  productPdfKey: string;
  targetCountries: string[];
  numberOfCompanies: number;
}

interface ProgressUpdate {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

interface Contact {
  name: string;
  title: string;
  department: string;
  linkedinUrl?: string;
  relevanceScore: number;
  reason: string;
  coldEmail?: {
    subject: string;
    emailBody: string;
    language: string;
  };
}

interface CompanyMatch {
  company: {
    name: string;
    website: string;
    linkedin: string;
    description: string;
    employees: number;
    industry: string;
  };
  verification: {
    isQualified: boolean;
    score: number;
    reasons: string[];
    warnings: string[];
  };
  contacts: Contact[];
}

export default function Products() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    productPdfUrl: "",
    productPdfKey: "",
    targetCountries: [],
    numberOfCompanies: 10,
  });
  const [country, setCountry] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [companiesWithContacts, setCompaniesWithContacts] = useState<
    CompanyMatch[]
  >([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const submitProductMutation = trpc.products.submitProductPDF.useMutation({
    onSuccess: (data) => {
      setSubmissionId(data.submissionId);
      toast.success("产品已提交，开始 AI 分析...");
      startProgressMonitoring(data.submissionId);
    },
    onError: (error) => {
      toast.error(`提交失败: ${error.message}`);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      toast.error("请上传 PDF 文件");
      return;
    }

    try {
      setIsUploading(true);

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

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
      toast.error(
        `上传失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const startProgressMonitoring = (id: number) => {
    setIsProcessing(true);
    setProgress(null);
    setCompaniesWithContacts([]);

    const eventSource = new EventSource(`/api/process-product/${id}`);

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as ProgressUpdate;
        setProgress(update);

        if (update.stage === "completed" || update.stage === "error") {
          eventSource.close();
          setIsProcessing(false);

          if (update.stage === "completed" && update.data?.companiesWithContacts) {
            setCompaniesWithContacts(update.data.companiesWithContacts);
            toast.success("AI 分析完成！");
          } else if (update.stage === "error") {
            toast.error(update.message);
          }
        }
      } catch (error) {
        console.error("Failed to parse progress update:", error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsProcessing(false);
      toast.error("连接中断");
    };
  };

  const handleAddCountry = () => {
    if (country.trim()) {
      setFormData({
        ...formData,
        targetCountries: [...formData.targetCountries, country.trim()],
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
      toast.error("请先上传产品 PDF");
      return;
    }

    submitProductMutation.mutate({
      productPdfUrl: formData.productPdfUrl,
      productPdfKey: formData.productPdfKey,
      targetCountries:
        formData.targetCountries.length > 0
          ? formData.targetCountries
          : undefined,
      numberOfCompanies: formData.numberOfCompanies,
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          产品客户匹配
        </h1>
        <p className="text-gray-600 mb-8">
          上传产品 PDF，AI 智能分析并匹配全球优质买家
        </p>

        <div className="grid md:grid-cols-4 gap-8">
          {/* 左侧：上传表单 */}
          <div className="md:col-span-1">
            <Card className="p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">上传产品</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* PDF 上传 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    产品 PDF
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      disabled={isUploading || submitProductMutation.isPending}
                      className="hidden"
                      id="pdf-input"
                    />
                    <label
                      htmlFor="pdf-input"
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 transition"
                    >
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      ) : formData.productPdfUrl ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Upload className="w-6 h-6 text-blue-600" />
                      )}
                    </label>
                  </div>
                  {formData.productPdfUrl && (
                    <p className="text-sm text-green-600 mt-2">✓ PDF 已上传</p>
                  )}
                </div>

                {/* 目标国家 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标国家/地区
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="如: USA, UK"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCountry();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddCountry}
                      variant="outline"
                    >
                      添加
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.targetCountries.map((c, i) => (
                      <Badge key={i} variant="secondary">
                        {c}
                        <button
                          onClick={() => handleRemoveCountry(i)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 公司数量 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    匹配公司数量: {formData.numberOfCompanies}
                  </label>
                  <input
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
                  disabled={
                    submitProductMutation.isPending ||
                    !formData.productPdfUrl ||
                    isUploading ||
                    isProcessing
                  }
                >
                  {submitProductMutation.isPending || isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    "开始匹配"
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* 右侧：进度和结果 */}
          <div className="md:col-span-3 space-y-6">
            {/* 进度条 */}
            {isProcessing && progress && (
              <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-lg font-semibold mb-4">处理进度</h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {progress.message}
                      </span>
                      <span className="text-sm font-semibold text-blue-600">
                        {progress.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* 匹配结果 */}
            {!isProcessing && companiesWithContacts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  匹配结果 ({companiesWithContacts.length} 家公司)
                </h3>
                {companiesWithContacts.map((match, idx) => (
                  <Card key={idx} className="p-6">
                    {/* 公司信息 */}
                    <div className="mb-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-semibold">
                            {match.company.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {match.company.industry} · {match.company.employees} 员工
                          </p>
                        </div>
                        <Badge>匹配度: {match.verification.score}%</Badge>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">
                        {match.company.description}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        {match.company.website && (
                          <a
                            href={match.company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            官网 <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {match.company.linkedin && (
                          <a
                            href={match.company.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            LinkedIn <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 联系人列表 */}
                    <div className="border-t pt-6">
                      <h5 className="font-semibold mb-4">关键联系人</h5>
                      <div className="space-y-4">
                        {match.contacts.map((contact, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-gray-50 p-4 rounded-lg space-y-3"
                          >
                            {/* 联系人基本信息 */}
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-semibold">{contact.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {contact.title} · {contact.department}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  相关度: {contact.relevanceScore}%
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700">
                                {contact.reason}
                              </p>
                            </div>

                            {/* LinkedIn 链接 */}
                            {contact.linkedinUrl && (
                              <a
                                href={contact.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                LinkedIn 个人资料{" "}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}

                            {/* Cold Email */}
                            {contact.coldEmail && (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 mb-2">
                                  邮件主题:
                                </p>
                                <p className="text-sm font-medium mb-3">
                                  {contact.coldEmail?.subject}
                                </p>
                                <p className="text-xs font-semibold text-gray-600 mb-2">
                                  邮件内容:
                                </p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                                  {contact.coldEmail?.emailBody}
                                </p>
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      `${contact.coldEmail?.subject}\n\n${contact.coldEmail?.emailBody}`,
                                      `email-${idx}-${cIdx}`
                                    )
                                  }
                                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  {copiedId === `email-${idx}-${cIdx}` ? (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      已复制
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      复制邮件
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* 空状态 */}
            {!isProcessing && companiesWithContacts.length === 0 && submissionId && (
              <Card className="p-12 text-center">
                <p className="text-gray-600">暂无匹配结果</p>
              </Card>
            )}

            {!submissionId && !isProcessing && (
              <Card className="p-12 text-center">
                <p className="text-gray-600">上传产品 PDF 开始匹配</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
