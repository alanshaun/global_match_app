import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, ArrowLeft, MapPin, DollarSign, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Jobs() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"upload" | "results">("upload");
  const [resumeId, setResumeId] = useState<number | null>(null);

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
  });

  // API 调用
  const submitResumeMutation = trpc.jobs.submitResume.useMutation({
    onSuccess: (data) => {
      setResumeId(data.resumeId);
      setStep("results");
      toast.success("简历已提交，正在搜索职位...");
    },
    onError: (error) => {
      toast.error(`提交失败: ${error.message}`);
    },
  });

  const getJobsQuery = trpc.jobs.getJobMatches.useQuery(
    { resumeId: resumeId || 0 },
    { enabled: resumeId !== null }
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 这里应该上传文件到 S3 并获取 URL 和 key
    // 目前使用模拟数据
    const mockUrl = `https://example.com/resume-${Date.now()}.pdf`;
    const mockKey = `resumes/${user?.id}/${file.name}`;

    setFormData({
      ...formData,
      resumeFileUrl: mockUrl,
      resumeFileKey: mockKey,
    });

    toast.success("简历已上传");
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

  const formatDate = (date: Date | undefined | null) => {
    if (!date) return "未知";
    const d = new Date(date);
    return d.toLocaleDateString("zh-CN");
  };

  const formatSalary = (min: number | undefined | null, max: number | undefined | null, currency: string) => {
    if (!min && !max) return "面议";
    if (min && max) return `${min}-${max} ${currency}`;
    if (min) return `${min}+ ${currency}`;
    return `${max} ${currency}`;
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
            <h1 className="text-2xl font-bold text-gray-900">职位自动搜索</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>上传简历并设置搜索条件</CardTitle>
              <CardDescription>
                上传您的简历，设置期望的岗位、城市和薪资，我们将为您搜索最匹配的职位
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 简历上传 */}
                <div className="space-y-2">
                  <Label htmlFor="resume">上传简历 (PDF/Word) *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="resume"
                      className="cursor-pointer block"
                    >
                      {formData.resumeFileUrl ? (
                        <div className="text-green-600">
                          <p className="font-semibold">✓ 简历已上传</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {formData.resumeFileKey.split("/").pop()}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-gray-700">
                            点击上传或拖拽文件
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            支持 PDF、Word 格式
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* 目标岗位 */}
                <div className="space-y-2">
                  <Label htmlFor="targetPosition">目标岗位 *</Label>
                  <Input
                    id="targetPosition"
                    placeholder="例如：产品经理、数据分析师"
                    value={formData.targetPosition}
                    onChange={(e) =>
                      setFormData({ ...formData, targetPosition: e.target.value })
                    }
                  />
                </div>

                {/* 目标城市 */}
                <div className="space-y-2">
                  <Label htmlFor="targetCity">目标城市 *</Label>
                  <Input
                    id="targetCity"
                    placeholder="例如：北京、上海、旧金山"
                    value={formData.targetCity}
                    onChange={(e) =>
                      setFormData({ ...formData, targetCity: e.target.value })
                    }
                  />
                </div>

                {/* 目标国家 */}
                <div className="space-y-2">
                  <Label htmlFor="targetCountry">目标国家/地区</Label>
                  <Input
                    id="targetCountry"
                    placeholder="例如：中国、美国、新加坡（可选）"
                    value={formData.targetCountry}
                    onChange={(e) =>
                      setFormData({ ...formData, targetCountry: e.target.value })
                    }
                  />
                </div>

                {/* 薪资范围 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">最低薪资</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      placeholder="例如：50000"
                      value={formData.salaryMin || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salaryMin: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">最高薪资</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      placeholder="例如：100000"
                      value={formData.salaryMax || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salaryMax: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                {/* 货币 */}
                <div className="space-y-2">
                  <Label htmlFor="salaryCurrency">货币</Label>
                  <select
                    id="salaryCurrency"
                    value={formData.salaryCurrency}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryCurrency: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="USD">美元 (USD)</option>
                    <option value="CNY">人民币 (CNY)</option>
                    <option value="EUR">欧元 (EUR)</option>
                    <option value="GBP">英镑 (GBP)</option>
                    <option value="SGD">新加坡元 (SGD)</option>
                  </select>
                </div>

                {/* 提交按钮 */}
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={submitResumeMutation.isPending}
                >
                  {submitResumeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      搜索中...
                    </>
                  ) : (
                    "开始搜索"
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
          <h1 className="text-2xl font-bold text-gray-900">职位搜索结果</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {getJobsQuery.isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : getJobsQuery.error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">加载失败: {getJobsQuery.error.message}</p>
            </CardContent>
          </Card>
        ) : getJobsQuery.data?.matches && getJobsQuery.data.matches.length > 0 ? (
          <div className="space-y-4">
            {getJobsQuery.data.matches.map((job, index) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-600">
                          #{index + 1}
                        </span>
                        <CardTitle>{job.jobTitle}</CardTitle>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{job.companyName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round(parseFloat(job.matchScore || "0"))}%
                      </div>
                      <p className="text-sm text-gray-600">匹配度</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 职位信息 */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">地点</p>
                        <p className="font-semibold text-sm">{job.jobLocation}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <DollarSign className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">薪资</p>
                        <p className="font-semibold text-sm">
                          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency || "USD")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">发布时间</p>
                        <p className="font-semibold text-sm">
                          {formatDate(job.publishedDate)}
                        </p>
                      </div>
                    </div>

                    {job.companyWebsite && (
                      <div>
                        <p className="text-sm text-gray-600">公司官网</p>
                        <a
                          href={job.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline text-sm font-semibold"
                        >
                          访问
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 职位描述 */}
                  {job.jobDescription && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {job.jobDescription}
                      </p>
                    </div>
                  )}

                  {/* 匹配原因 */}
                  {job.matchReason && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-900">
                        <span className="font-semibold">匹配原因：</span>
                        {job.matchReason}
                      </p>
                    </div>
                  )}

                  {/* 申请按钮 */}
                  <Button
                    asChild
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      查看职位详情
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">暂无匹配职位</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
