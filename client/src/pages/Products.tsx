"use client";

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Send, Paperclip, Globe, Building2, Phone, Mail, ExternalLink,
  Sparkles, CheckCircle2, Loader2, ChevronDown, ChevronUp, Search,
  TrendingUp, MapPin, Star, X
} from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useCallback } from "react";

// ─── 类型 ───────────────────────────────────────────────────────

interface ProgressUpdate {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

interface BuyerCompany {
  name: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  country: string;
  city?: string;
  industry?: string;
  description?: string;
  source: string;
  rating?: number;
  matchScore?: number;
  matchReason?: string;
  employees?: string;
  vatNumber?: string;
  leiCode?: string;
  // 联系方式富化字段
  whatsapp?: string;
  linkedinCompany?: string;
  linkedinUrl?: string;        // 联系人 LinkedIn
  facebook?: string;
  contactPerson?: string;
  contactTitle?: string;
  buyerType?: string;
  contactAiVerified?: boolean;
  aiReason?: string;        // AI推荐理由（一句话）
}

interface ProductAnalysis {
  productName: string;
  productType: string;
  targetCountries: string[];
  buyerTypes: string[];
  searchKeywords: Array<{country: string; language: string; sample: string}>;
}

const SOURCE_LABELS: Record<string, {label: string; color: string}> = {
  serper:       { label: '🔍 Serper',        color: 'bg-blue-100 text-blue-700' },
  gleif:        { label: '🏛️ GLEIF',          color: 'bg-purple-100 text-purple-700' },
  overpass:     { label: '🗺️ OpenStreetMap',  color: 'bg-green-100 text-green-700' },
  amap:         { label: '📍 高德地图',        color: 'bg-red-100 text-red-700' },
  kimi_ai:      { label: '🤖 Kimi AI',        color: 'bg-orange-100 text-orange-700' },
  google_places:{ label: '📌 Google Places',  color: 'bg-yellow-100 text-yellow-700' },
  common_crawl: { label: '🕸️ CommonCrawl',    color: 'bg-gray-100 text-gray-700' },
  eu_vies:      { label: '🇪🇺 EU VIES',        color: 'bg-indigo-100 text-indigo-700' },
  reddit:       { label: '🔴 Reddit',          color: 'bg-orange-50 text-orange-600 border border-orange-200' },
  social:       { label: '💬 社交媒体',         color: 'bg-pink-100 text-pink-700' },
  tavily:       { label: '🎯 Tavily',          color: 'bg-teal-100 text-teal-700' },
  apify_maps:   { label: '📍 Google Maps',     color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  comtrade:     { label: '📊 UN贸易数据',       color: 'bg-blue-50 text-blue-600 border border-blue-200' },
  exa:          { label: '⚡ Exa',             color: 'bg-violet-100 text-violet-700' },
};

// 社媒分组：这些 source 都算"社交媒体"
const SOCIAL_SOURCES = new Set(['reddit', 'social']);

const SUGGESTED_PROMPTS = [
  "我公司生产LED照明，主要优势是低价高质，希望找美国、德国、日本的进口商和经销商，大约20家",
  "我们做工业阀门，目标是中东、东南亚市场的工程公司和分销商",
  "纺织品原材料供应商，寻找欧洲和北美的服装制造商和批发商",
  "新能源储能电池，寻找全球经销商和系统集成商，重点欧洲市场",
];

const BUYER_TYPE_LABELS: Record<string, string> = {
  importer:       '进口商',
  distributor:    '经销商',
  wholesaler:     '批发商',
  manufacturer:   '工厂/OEM采购',
  retailer:       '零售商/电商',
  projectBuyer:   '项目采购/工程',
  tradingCompany: '贸易公司',
  agent:          '销售代理',
  emc:            'EMC出口中介',
  institution:    '机构/NGO',
  b2g:            '政府采购',
  verticalBuyer:  '垂直行业终端',
  onlineSeller:   '电商平台卖家',
  buyingGroup:    '采购集团',
  logistics:      '物流/清关',
  privateLabel:   '贴牌/私标采购',
  // 兼容旧值
  oem: 'OEM采购',
  endUser: '终端用户',
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  industrial: '工业品',
  consumer: '消费品',
  rawMaterial: '原材料',
  parts: '零部件',
  food: '食品',
  chemical: '化工品',
  textile: '纺织品',
  other: '其他',
};

// ─── 主页面 ─────────────────────────────────────────────────────

export default function Products() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [companies, setCompanies] = useState<BuyerCompany[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [pdfText, setPdfText] = useState<string>("");
  const [pdfName, setPdfName] = useState<string>("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSearch = useCallback(async (msg?: string) => {
    const message = (msg || input).trim();
    if (!message || isSearching) return;

    setIsSearching(true);
    setProgress(null);
    setAnalysis(null);
    setCompanies([]);
    setExpandedCards(new Set());

    try {
      const resp = await fetch("/api/buyer-chat-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, pdfText: pdfText || undefined }),
      });

      if (!resp.body) throw new Error("无响应流");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const update: ProgressUpdate = JSON.parse(line.slice(6));
            setProgress(update);

            if (update.stage === "analyzed" && update.data) {
              setAnalysis(update.data);
            }

            if (update.stage === "completed" && update.data) {
              setCompanies(update.data.companies || []);
              if (update.data.analysis) setAnalysis(update.data.analysis);
              toast.success(`搜索完成，找到 ${update.data.companies?.length || 0} 家买家`);
            }

            if (update.stage === "error") {
              toast.error(update.message);
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      toast.error(`搜索失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSearching(false);
    }
  }, [input, pdfText, isSearching]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) { toast.error("请上传 PDF 文件"); return; }

    setUploadingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const resp = await fetch("/api/upload-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileData: Array.from(uint8Array), fileType: "product" }),
      });
      if (!resp.ok) throw new Error("上传失败");
      const result = await resp.json();
      setPdfText(result.text || "");
      setPdfName(file.name);
      toast.success(`PDF 已上传: ${file.name}`);
    } catch (e) {
      toast.error(`上传失败: ${e instanceof Error ? e.message : "未知错误"}`);
    } finally {
      setUploadingPdf(false);
    }
  };

  const toggleCard = (i: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  // 市场洞察（comtrade）与企业列表分离
  const marketInsights   = companies.filter(c => c.source === 'comtrade');
  const buyerCompanies   = companies.filter(c => c.source !== 'comtrade');

  const filteredCompanies = filterSource === "all"
    ? buyerCompanies
    : filterSource === "social_all"
      ? buyerCompanies.filter(c => SOCIAL_SOURCES.has(c.source))
      : buyerCompanies.filter(c => c.source === filterSource);

  const sourceCounts = buyerCompanies.reduce((acc, c) => {
    acc[c.source] = (acc[c.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 社媒合计
  const socialTotal = buyerCompanies.filter(c => SOCIAL_SOURCES.has(c.source)).length;
  // 非社媒来源（用于独立 tab）
  const nonSocialSources = Object.entries(sourceCounts).filter(([src]) => !SOCIAL_SOURCES.has(src));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">请登录后使用</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Search className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI 智能找买家</h1>
            <p className="text-xs text-gray-500">20+ 数据源 · Kimi AI驱动 · 多语言搜索</p>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            {['Serper', 'GLEIF', 'OSM', '高德', 'Google', 'VIES', 'CCrawl', '🔴Reddit', '💬X/LinkedIn/FB'].map(s => (
              <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* 聊天输入框 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          {/* 提示词快捷按钮 */}
          {!isSearching && companies.length === 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">💡 快速开始（点击使用）</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(p); handleSearch(p); }}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition text-left max-w-xs truncate"
                  >
                    {p.slice(0, 40)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PDF 上传提示 */}
          {pdfName && (
            <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-700 flex-1">{pdfName}</span>
              <button onClick={() => { setPdfText(""); setPdfName(""); }} className="text-green-500 hover:text-green-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述您的产品、公司优势、目标市场… 例如：我做工业阀门，目标是中东市场的石油公司和总承包商，需要30家"
                className="min-h-[80px] max-h-[160px] resize-none border-gray-200 focus:ring-blue-500 text-sm"
                disabled={isSearching}
              />
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfUpload}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSearching || uploadingPdf}
                title="上传产品PDF"
              >
                {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>
              <Button
                size="icon"
                className="h-9 w-9 bg-blue-600 hover:bg-blue-700"
                onClick={() => handleSearch()}
                disabled={!input.trim() || isSearching}
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Enter 发送 · Shift+Enter 换行 · 可上传产品PDF辅助分析</p>
        </div>

        {/* 进度区域 */}
        {(isSearching || (progress && progress.stage !== 'completed')) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
              <span className="font-semibold text-gray-800">AI 正在搜索...</span>
              <span className="ml-auto text-sm text-gray-500">{progress?.progress || 0}%</span>
            </div>
            <Progress value={progress?.progress || 0} className="h-2" />
            <p className="text-sm text-gray-600">{progress?.message || '初始化...'}</p>

            {/* 产品分析预览 */}
            {analysis && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">✅ 产品分析完成</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-gray-400 mb-1">产品</p>
                    <p className="font-medium text-gray-800 truncate">{analysis.productName}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-gray-400 mb-1">类型</p>
                    <p className="font-medium text-gray-800">{PRODUCT_TYPE_LABELS[analysis.productType] || analysis.productType}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-gray-400 mb-1">目标国家</p>
                    <p className="font-medium text-gray-800">{analysis.targetCountries?.slice(0,3).join('、')}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-gray-400 mb-1">买家类型</p>
                    <p className="font-medium text-gray-800">{analysis.buyerTypes?.slice(0,3).map(t => BUYER_TYPE_LABELS[t] || t).join('、')}</p>
                  </div>
                </div>
                {analysis.searchKeywords && analysis.searchKeywords.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-1">多语言搜索关键词示例：</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.searchKeywords.slice(0, 5).map((k, i) => (
                        <span key={i} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                          {k.country} ({k.language}): {k.sample}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 结果区域 */}
        {companies.length > 0 && (
          <div className="space-y-4">
            {/* 汇总栏 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-gray-900">共找到 {buyerCompanies.length} 家买家</span>
                  {analysis && (
                    <span className="text-sm text-gray-500">· {analysis.productName}</span>
                  )}
                </div>

                {/* 数据源筛选 */}
                <div className="flex flex-wrap gap-2">
                  {/* 全部 */}
                  <button
                    onClick={() => setFilterSource("all")}
                    className={`text-xs px-3 py-1 rounded-full border transition ${filterSource === "all" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                  >
                    全部 ({buyerCompanies.length})
                  </button>

                  {/* 社媒聚合 tab（只要有社媒数据就显示） */}
                  {socialTotal > 0 && (
                    <button
                      onClick={() => setFilterSource("social_all")}
                      className={`text-xs px-3 py-1 rounded-full border transition font-medium ${filterSource === "social_all" ? "bg-pink-600 text-white border-pink-600" : "bg-pink-50 text-pink-700 border-pink-300 hover:bg-pink-100"}`}
                    >
                      💬 社交媒体 ({socialTotal})
                    </button>
                  )}

                  {/* 非社媒来源独立 tab */}
                  {nonSocialSources.map(([src, cnt]) => {
                    const info = SOURCE_LABELS[src] || { label: src, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <button
                        key={src}
                        onClick={() => setFilterSource(src)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${filterSource === src ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                      >
                        {info.label} ({cnt})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 📊 市场洞察（UN Comtrade 贸易数据） */}
            {marketInsights.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📊</span>
                  <span className="font-semibold text-blue-800 text-sm">市场洞察 · UN Comtrade 贸易数据</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {marketInsights.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl border border-blue-100 p-3 flex flex-col gap-1">
                      <div className="font-medium text-gray-800 text-sm">{item.name?.replace('📊 ', '')}</div>
                      <div className="text-xs text-gray-600">{item.description}</div>
                      {item.website && (
                        <a href={item.website} target="_blank" rel="noopener noreferrer"
                           className="text-xs text-blue-600 hover:underline mt-1">
                          查看详细数据 →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 公司卡片列表 */}
            {filteredCompanies.map((company, i) => {
              const isExpanded = expandedCards.has(i);
              const sourceInfo = SOURCE_LABELS[company.source] || { label: company.source, color: 'bg-gray-100 text-gray-600' };
              const score = company.matchScore || 70;
              const scoreColor = score >= 85 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-gray-500';

              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  {/* 卡片头部（始终显示） */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleCard(i)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* 序号 */}
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                            {company.buyerType && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                {BUYER_TYPE_LABELS[company.buyerType] || company.buyerType}
                              </span>
                            )}
                            {company.leiCode && (
                              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">LEI认证</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            {company.country && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" /> {company.country}{company.city ? ` · ${company.city}` : ''}
                              </span>
                            )}
                            {company.website && (
                              <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                                onClick={e => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3" /> {extractDomain(company.website)}
                              </a>
                            )}
                            {company.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {company.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${scoreColor}`}>{score}%</div>
                          <div className="text-xs text-gray-400">匹配度</div>
                          {company.aiReason && (
                            <div className="text-xs text-blue-500 mt-0.5 max-w-[140px] text-right leading-tight">{company.aiReason}</div>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                      {/* 描述 */}
                      {company.description && (
                        <p className="text-sm text-gray-600">{company.description}</p>
                      )}

                      {/* 联系方式区域 */}
                      {(company.email || company.phone || company.whatsapp || company.linkedinCompany || company.linkedinUrl || company.facebook || company.contactPerson) ? (
                        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                          {company.contactAiVerified && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">⚠️ AI搜索结果，建议自行验证</p>
                          )}
                          {company.contactPerson && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400 w-5">👤</span>
                              <span className="font-medium text-gray-800">{company.contactPerson}</span>
                              {company.contactTitle && <span className="text-gray-500 text-xs">· {company.contactTitle}</span>}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                              <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">{company.email}</a>
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-green-600 shrink-0" />
                              <a href={`tel:${company.phone}`} className="text-gray-800">{company.phone}</a>
                            </div>
                          )}
                          {company.whatsapp && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-500 text-base leading-none">💬</span>
                              <a
                                href={`https://wa.me/${company.whatsapp.replace(/[^\d]/g, '')}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-green-700 hover:underline"
                              >
                                WhatsApp: {company.whatsapp}
                              </a>
                            </div>
                          )}
                          {company.linkedinCompany && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-blue-700 font-bold text-xs bg-blue-100 px-1.5 py-0.5 rounded">in</span>
                              <a href={company.linkedinCompany} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                {company.linkedinCompany.replace('https://www.linkedin.com/company/', '').replace(/\/$/, '')}
                              </a>
                            </div>
                          )}
                          {company.linkedinUrl && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-blue-700 font-bold text-xs bg-blue-100 px-1.5 py-0.5 rounded">in</span>
                              <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                {company.contactPerson || company.linkedinUrl.replace('https://www.linkedin.com/in/', '').replace(/\/$/, '')}
                              </a>
                            </div>
                          )}
                          {company.facebook && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-blue-600 font-bold text-xs bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">f</span>
                              <a href={company.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                {company.facebook.replace('https://www.facebook.com/', '')}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">暂未找到联系方式</p>
                      )}

                      {/* 其他信息 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-500">
                        {company.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{company.address}</span>
                          </div>
                        )}
                        {company.industry && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span>{company.industry}</span>
                          </div>
                        )}
                        {company.rating && (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3 h-3 text-yellow-400 shrink-0" />
                            <span>{company.rating} / 5</span>
                          </div>
                        )}
                        {company.leiCode && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-purple-500 shrink-0" />
                            <span>LEI: {company.leiCode.slice(0, 12)}...</span>
                          </div>
                        )}
                      </div>

                      {/* 快捷操作按钮 */}
                      <div className="flex flex-wrap gap-2">
                        {company.website && (
                          <a href={company.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                            <Globe className="w-3 h-3" /> 官网
                          </a>
                        )}
                        {company.email && (
                          <a href={`mailto:${company.email}`}
                            className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                            <Mail className="w-3 h-3" /> 发邮件
                          </a>
                        )}
                        {company.whatsapp && (
                          <a href={`https://wa.me/${company.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition">
                            💬 WhatsApp
                          </a>
                        )}
                        {(company.linkedinCompany || company.linkedinUrl) && (
                          <a href={company.linkedinCompany || company.linkedinUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition">
                            in LinkedIn
                          </a>
                        )}
                        {company.facebook && (
                          <a href={company.facebook} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                            f Facebook
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 空状态 */}
        {!isSearching && companies.length === 0 && !progress && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700 mb-2">告诉 AI 你想找什么买家</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              直接描述您的产品、公司优势、目标市场和数量。<br />
              AI 会自动分析并从 10 个数据源搜索最匹配的全球买家（含 Reddit 社交采购需求）。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url.slice(0, 30); }
}
