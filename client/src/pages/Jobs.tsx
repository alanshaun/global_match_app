"use client";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
  Calendar,
  Upload,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

interface JobMatch {
  title: string;
  company: string;
  location: string;
  salary: string;
  currency: string;
  description: string;
  publishedDate: string;
  link: string;
  source: string;
  matchScore: number;
}

interface ProgressUpdate {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

export default function Jobs() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"upload" | "results">("upload");
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);

  // 表单状态
  const [formData, setFormData] = useState({
    resumeFileUrl: "",
    resumeFileKey: "",
    targetPosition: "",
    targetCity: "",
    targetCountry: "",
    salaryMin: undefined as number | undefined,
    salaryMax: undefined as number | undefined,
    salaryCurrency: "USD",
    jobCount: 10 as number,
  });

  // API 调用
  const submitResumeMutation = trpc.jobs.submitResume.useMutation({
    onSuccess: (data) => {
      setResumeId(data.resumeId);
      setStep("results");
      toast.success("简历已提交，开始搜索职位...");
      startProgressMonitoring(data.resumeId);
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
          fileType: "resume",
        }),
      });

      if (!response.ok) {
        throw new Error("上传失败");
      }

      const uploadResult = await response.json();

      setFormData({
        ...formData,
        resumeFileUrl: uploadResult.url,
        resumeFileKey: uploadResult.key,
      });

      toast.success("简历 PDF 已上传");
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
    setJobMatches([]);

    // 构建查询参数
    const params = new URLSearchParams();
    params.append("targetPosition", formData.targetPosition);
    params.append("targetCity", formData.targetCity);
    if (formData.salaryMin !== undefined) {
      params.append("salaryMin", formData.salaryMin.toString());
    }
    if (formData.salaryMax !== undefined) {
      params.append("salaryMax", formData.salaryMax.toString());
    }
    params.append("salaryCurrency", formData.salaryCurrency);
    params.append("jobCount", formData.jobCount.toString());

    const eventSource = new EventSource(
      `/api/process-jobs/${id}?${params.toString()}`
    );

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as ProgressUpdate;
        setProgress(update);

        if (update.stage === "completed") {
          eventSource.close();
          setIsProcessing(false);

          if (update.data?.jobMatches) {
            setJobMatches(update.data.jobMatches);
            toast.success("职位搜索完成！");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.resumeFileUrl ||
      !formData.targetPosition.trim() ||
      !formData.targetCity.trim()
    ) {
      toast.error("请填写所有必填项");
      return;
    }

    submitResumeMutation.mutate(formData);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("zh-CN");
    } catch {
      return "未知";
    }
  };

  const formatSalary = (salary: string) => {
    return salary;
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>请登录以使用此功能</p>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* 标题 */}
          <div className="mb-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft size={20} />
              返回首页
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              职位自动搜索
            </h1>
            <p className="text-gray-600">
              上传简历，AI 智能搜索全球最匹配的职位
            </p>
          </div>

          {/* 上传和配置区域 */}
          <Card className="p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 简历上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  简历 PDF 文件
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {isUploading && <Loader2 className="animate-spin" />}
                  {formData.resumeFileUrl && (
                    <span className="text-green-600 text-sm">✓ 已上传</span>
                  )}
                </div>
              </div>

              {/* 岗位信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标岗位 *
                  </label>
                  <Input
                    type="text"
                    placeholder="例如: Product Manager"
                    value={formData.targetPosition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetPosition: e.target.value,
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标城市 *
                  </label>
                  <Input
                    type="text"
                    placeholder="例如: San Francisco"
                    value={formData.targetCity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetCity: e.target.value,
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* 薪资范围 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最低薪资
                  </label>
                  <Input
                    type="number"
                    placeholder="例如: 100000"
                    value={formData.salaryMin || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryMin: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最高薪资
                  </label>
                  <Input
                    type="number"
                    placeholder="例如: 200000"
                    value={formData.salaryMax || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryMax: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    货币
                  </label>
                  <select
                    value={formData.salaryCurrency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryCurrency: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="SGD">SGD</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
              </div>

              {/* 职位数量选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期望职位数量
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={formData.jobCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jobCount: parseInt(e.target.value),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-green-600 min-w-[60px] text-right">
                    {formData.jobCount}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">选择要搜索的职位数量(1-50)</p>
              </div>

              {/* 提交按钮 */}
              <Button
                type="submit"
                disabled={
                  !formData.resumeFileUrl ||
                  isProcessing ||
                  submitResumeMutation.isPending
                }
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
              >
                {isProcessing || submitResumeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" />
                    搜索中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2" />
                    开始搜索
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // 结果页面
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <button
            onClick={() => setStep("upload")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            返回
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            职位搜索结果
          </h1>
          <p className="text-gray-600">
            {formData.targetPosition} - {formData.targetCity}
          </p>
        </div>

        {/* 进度条 */}
        {progress && isProcessing && (
          <Card className="p-6 mb-8 shadow-lg">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">
                  {progress.message}
                </h3>
                <span className="text-sm font-medium text-gray-600">
                  {progress.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* 职位列表 */}
        {jobMatches.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                找到 {jobMatches.length} 个职位
              </h2>
            </div>

            {jobMatches.map((job, index) => (
              <Card key={index} className="p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {job.title}
                    </h3>
                    <p className="text-gray-600 font-medium">{job.company}</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {job.description}
                    </p>
                  </div>
                  <Badge className={`text-lg px-3 py-1 ${getMatchColor(job.matchScore)}`}>
                    {job.matchScore}% 匹配
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4 border-t border-b">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">地点</p>
                      <p className="font-semibold text-gray-900">
                        {job.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">薪资</p>
                      <p className="font-semibold text-gray-900">
                        {formatSalary(job.salary)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">发布时间</p>
                      <p className="font-semibold text-gray-900">
                        {formatDate(job.publishedDate)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">来源</p>
                    <p className="font-semibold text-gray-900">{job.source}</p>
                  </div>
                </div>

                <a
                  href={job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
                >
                  查看职位 <ExternalLink size={16} />
                </a>
              </Card>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!isProcessing && jobMatches.length === 0 && !progress && (
          <Card className="p-12 text-center shadow-lg">
            <p className="text-gray-500 text-lg">
              搜索职位中，请稍候...
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
