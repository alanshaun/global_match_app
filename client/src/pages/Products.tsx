"use client";

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, X, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

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
    country?: string;
  };
  verification: {
    isQualified: boolean;
    score: number;
    reasons: string[];
    warnings: string[];
  };
  contacts: Contact[];
}

const AVAILABLE_COUNTRIES = [
  "USA",
  "Europe",
  "Asia",
  "Middle East",
  "Latin America",
];

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

    // 构建查询参数
    const params = new URLSearchParams();
    if (formData.targetCountries.length > 0) {
      params.append("targetCountries", formData.targetCountries.join(","));
    }
    params.append("numberOfCompanies", formData.numberOfCompanies.toString());

    const eventSource = new EventSource(
      `/api/process-product/${id}?${params.toString()}`
    );

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as ProgressUpdate;
        setProgress(update);

        if (update.stage === "completed") {
          eventSource.close();
          setIsProcessing(false);

          if (update.data?.companiesWithContacts) {
            setCompaniesWithContacts(update.data.companiesWithContacts);
            toast.success("AI 分析完成！");
          }
        } else if (update.stage === "error") {
          eventSource.close();
          setIsProcessing(false);
          toast.error(update.message);
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
    if (country && !formData.targetCountries.includes(country)) {
      setFormData({
        ...formData,
        targetCountries: [...formData.targetCountries, country],
      });
      setCountry("");
    }
  };

  const handleRemoveCountry = (countryToRemove: string) => {
    setFormData({
      ...formData,
      targetCountries: formData.targetCountries.filter(
        (c) => c !== countryToRemove
      ),
    });
  };

  const handleSubmit = () => {
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>请登录以使用此功能</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            产品客户匹配
          </h1>
          <p className="text-gray-600">
            上传产品 PDF，AI 智能分析并匹配全球潜在买家
          </p>
        </div>

        {/* 上传和配置区域 */}
        <Card className="p-6 mb-8 shadow-lg">
          <div className="space-y-6">
            {/* PDF 上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                产品 PDF 文件
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isUploading && <Loader2 className="animate-spin" />}
                {formData.productPdfUrl && (
                  <CheckCircle className="text-green-500" />
                )}
              </div>
            </div>

            {/* 目标国家选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标国家/地区
              </label>
              <div className="flex gap-2 mb-3">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择国家/地区...</option>
                  {AVAILABLE_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Button onClick={handleAddCountry} variant="outline">
                  添加
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.targetCountries.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">
                    {c}
                    <X
                      size={14}
                      className="cursor-pointer"
                      onClick={() => handleRemoveCountry(c)}
                    />
                  </Badge>
                ))}
              </div>
              {formData.targetCountries.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  未选择国家 - 将搜索全球公司
                </p>
              )}
            </div>

            {/* 公司数量设置 */}
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
              <p className="text-sm text-gray-500 mt-1">
                将匹配 {formData.numberOfCompanies} 家潜在买家公司
              </p>
            </div>

            {/* 提交按钮 */}
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.productPdfUrl || isProcessing || submitProductMutation.isPending
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
            >
              {isProcessing || submitProductMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Upload className="mr-2" />
                  开始匹配
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* 进度条 */}
        {progress && (
          <Card className="p-6 mb-8 shadow-lg">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">{progress.message}</h3>
                <span className="text-sm font-medium text-gray-600">
                  {progress.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* 匹配结果 */}
        {companiesWithContacts.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                匹配结果 ({companiesWithContacts.length} 家公司)
              </h2>
            </div>

            {companiesWithContacts.map((match, index) => (
              <Card key={index} className="p-6 shadow-lg hover:shadow-xl transition-shadow">
                {/* 公司信息 */}
                <div className="mb-6 pb-6 border-b">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {match.company.name}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {match.company.description}
                      </p>
                    </div>
                    <Badge
                      className="text-lg px-3 py-1"
                      style={{
                        backgroundColor:
                          match.verification.score > 80
                            ? "#10b981"
                            : match.verification.score > 60
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {match.verification.score}% 匹配
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">员工数</p>
                      <p className="font-semibold text-gray-900">
                        {match.company.employees}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">行业</p>
                      <p className="font-semibold text-gray-900">
                        {match.company.industry}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">国家</p>
                      <p className="font-semibold text-gray-900">
                        {match.company.country || "全球"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">官网</p>
                      <a
                        href={match.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        访问 <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* 联系人列表 */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">关键联系人</h4>
                  {match.contacts.map((contact, contactIndex) => (
                    <div
                      key={contactIndex}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {contact.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            {contact.department} 部门
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {contact.reason}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {contact.relevanceScore}% 相关度
                        </Badge>
                      </div>

                      {contact.linkedinUrl && (
                        <a
                          href={contact.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-3"
                        >
                          LinkedIn <ExternalLink size={12} />
                        </a>
                      )}

                      {/* Cold Email */}
                      {contact.coldEmail && (
                        <div className="bg-white p-3 rounded border border-gray-300 mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">
                            邮件主题:
                          </p>
                          <p className="text-sm text-gray-800 mb-3">
                            {contact.coldEmail.subject}
                          </p>

                          <p className="text-xs font-semibold text-gray-700 mb-2">
                            邮件内容:
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                            {contact.coldEmail.emailBody}
                          </p>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copyToClipboard(
                                contact.coldEmail!.emailBody,
                                `email-${index}-${contactIndex}`
                              )
                            }
                            className="gap-2"
                          >
                            {copiedId ===
                            `email-${index}-${contactIndex}` ? (
                              <>
                                <CheckCircle size={16} />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy size={16} />
                                复制邮件
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!isProcessing && companiesWithContacts.length === 0 && !progress && (
          <Card className="p-12 text-center shadow-lg">
            <p className="text-gray-500 text-lg">
              上传产品 PDF 并点击"开始匹配"来查看结果
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
