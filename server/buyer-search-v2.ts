/**
 * 买家搜索引擎 v2 - 多源聚合 + Kimi AI 驱动
 *
 * 数据源（18+个）:
 * ─ 传统搜索 ──────────────────────────────────────────
 * 1. Serper          - 全球网页搜索
 * 2. GLEIF           - 全球法人实体注册 (LEI)
 * 3. OpenStreetMap   - 商业POI
 * 4. 高德地图         - 中国POI
 * 5. Google Places   - 全球商业地点
 * 6. EU VIES         - 欧盟VAT验证
 * 7. Common Crawl    - 网页域名索引
 * ─ RSS/社交/黄页（rss-multi-source）─────────────────
 * 8. Reddit          - RSS直连 + Serper 代理
 * 9. Hacker News     - hnrss.org
 * 10. X/Twitter      - Serper site:x.com
 * 11. Facebook       - Serper site:facebook.com
 * 12. Instagram      - Serper site:instagram.com
 * 13. Alibaba        - Serper site:alibaba.com 买家询盘
 * 14. LinkedIn       - Serper site:linkedin.com/company
 * 15. Google News    - RSS直连
 * 16. PRNewswire     - RSS直连企业新闻稿
 * 17. 展会信息        - Google News + Serper 参展商名录
 * 18. ImportYeti/Panjiva - 海关进口记录（Serper代理）
 * 19. SEC EDGAR      - 美国上市公司文件
 * 20. OpenCorporates - 全球工商注册
 * ─ AI 补充 ────────────────────────────────────────────
 * 21. Kimi AI        - AI联网搜索（兜底+补充）
 */

import { invokeKimiLLM, invokeKimiWithWebSearch } from './_core/kimi-llm';
import { runRSSMultiSearch } from './rss-multi-source';

// ─── 类型定义 ───────────────────────────────────────────────────

export interface ChatInput {
  message: string;
  pdfText?: string;
  linkUrl?: string;
}

export interface ProductAnalysis {
  productName: string;
  productType: 'industrial' | 'consumer' | 'rawMaterial' | 'parts' | 'food' | 'chemical' | 'textile' | 'other';
  productDescription: string;
  hsCode?: string;
  buyerTypes: BuyerType[];
  targetCountries: string[];
  requestedCount: number;
  advantages: string[];
  searchKeywords: CountryKeywords[];
}

export type BuyerType =
  | 'importer'        // 进口商
  | 'distributor'     // 分销商/经销商
  | 'wholesaler'      // 批发商
  | 'manufacturer'    // 工厂/OEM采购商（把产品当原材料/配件）
  | 'retailer'        // 零售商/电商卖家
  | 'projectBuyer'    // 项目采购方/工程公司/政府
  | 'tradingCompany'  // 贸易公司/国际贸易商
  | 'agent'           // 佣金代理/销售代理
  | 'emc'             // 出口管理公司/出口中介（EMC）
  | 'institution'     // 机构采购/非营利（学校/医院/NGO）
  | 'b2g'             // 政府采购/公共部门招标
  | 'verticalBuyer'   // 垂直行业终端（酒店/建筑/汽配/农业等）
  | 'onlineSeller'    // 电商平台卖家（Amazon/eBay/Shopee/Lazada/Temu）
  | 'buyingGroup'     // 采购集团/联合采购组织
  | 'logistics'       // 物流/供应链/清关代理（有自采需求）
  | 'privateLabel';   // 品牌授权/贴牌采购（OEM/ODM/Private Label）

export interface CountryKeywords {
  country: string;
  countryCode: string;
  language: string;
  englishKeywords: string[];  // 3-5条英文关键词（含角色词）
  localKeywords: string[];    // 2-3条本地语言关键词
}

export interface BuyerCompany {
  name: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  country: string;
  city?: string;
  industry?: string;
  description?: string;
  source: DataSource;
  rating?: number;
  employees?: string;
  matchScore?: number;
  matchReason?: string;
  coordinates?: { lat: number; lng: number };
  vatNumber?: string;
  leiCode?: string;
  // 新增：联系人 & 买家类型
  contactPerson?: string;   // 采购联系人/高管姓名
  buyerType?: BuyerType;    // 具体买家类型
  linkedinUrl?: string;     // LinkedIn 主页
  aiReason?: string;        // AI推荐理由（一句话）
}

export type DataSource =
  | 'serper'
  | 'gleif'
  | 'overpass'
  | 'amap'
  | 'kimi_ai'
  | 'google_places'
  | 'eu_vies'
  | 'common_crawl'
  | 'reddit'
  | 'social'      // X/Twitter/LinkedIn/Facebook/Instagram/Alibaba/HackerNews
  | 'tavily'      // Tavily AI 搜索（B2B 定向）
  | 'apify_maps'  // Apify Google Maps 爬虫（真实本地企业）
  | 'comtrade'    // UN Comtrade 贸易数据（市场洞察）
  | 'exa';        // Exa 神经网络搜索（company 分类）

export interface SearchProgress {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

// ─── 全球国家名映射（中英文 → 标准英文，覆盖200+国家） ─────────

const COUNTRY_ALIASES: Record<string, string> = {
  // 中文
  '越南':'Vietnam','美国':'USA','德国':'Germany','日本':'Japan','英国':'UK',
  '法国':'France','阿联酋':'UAE','迪拜':'UAE','印度':'India','巴西':'Brazil',
  '墨西哥':'Mexico','韩国':'South Korea','澳大利亚':'Australia','加拿大':'Canada',
  '意大利':'Italy','西班牙':'Spain','荷兰':'Netherlands','泰国':'Thailand',
  '印度尼西亚':'Indonesia','马来西亚':'Malaysia','新加坡':'Singapore',
  '菲律宾':'Philippines','土耳其':'Turkey','沙特阿拉伯':'Saudi Arabia',
  '沙特':'Saudi Arabia','波兰':'Poland','俄罗斯':'Russia','南非':'South Africa',
  '埃及':'Egypt','阿根廷':'Argentina','哥伦比亚':'Colombia','智利':'Chile',
  '尼日利亚':'Nigeria','肯尼亚':'Kenya','巴基斯坦':'Pakistan',
  '孟加拉国':'Bangladesh','斯里兰卡':'Sri Lanka','缅甸':'Myanmar',
  '柬埔寨':'Cambodia','老挝':'Laos','尼泊尔':'Nepal','以色列':'Israel',
  '科威特':'Kuwait','卡塔尔':'Qatar','阿曼':'Oman','巴林':'Bahrain',
  '约旦':'Jordan','黎巴嫩':'Lebanon','希腊':'Greece','葡萄牙':'Portugal',
  '比利时':'Belgium','瑞士':'Switzerland','瑞典':'Sweden','丹麦':'Denmark',
  '挪威':'Norway','芬兰':'Finland','奥地利':'Austria','捷克':'Czech Republic',
  '匈牙利':'Hungary','罗马尼亚':'Romania','乌克兰':'Ukraine','中国':'China',
  '台湾':'Taiwan','香港':'Hong Kong','澳门':'Macao',
  '新西兰':'New Zealand','阿尔及利亚':'Algeria','摩洛哥':'Morocco',
  '突尼斯':'Tunisia','加纳':'Ghana','坦桑尼亚':'Tanzania','埃塞俄比亚':'Ethiopia',
  '秘鲁':'Peru','厄瓜多尔':'Ecuador','委内瑞拉':'Venezuela','危地马拉':'Guatemala',
  '巴拿马':'Panama','哥斯达黎加':'Costa Rica',
  // 泛称
  '中东':'UAE','东南亚':'Vietnam','欧洲':'Germany','北美':'USA',
  '南美':'Brazil','非洲':'South Africa','东非':'Kenya','西非':'Nigeria',
  // English
  'vietnam':'Vietnam','viet nam':'Vietnam','usa':'USA','united states':'USA',
  'america':'USA','germany':'Germany','deutschland':'Germany','japan':'Japan',
  'uk':'UK','united kingdom':'UK','great britain':'UK','france':'France',
  'uae':'UAE','dubai':'UAE','india':'India','brazil':'Brazil','mexico':'Mexico',
  'south korea':'South Korea','korea':'South Korea','australia':'Australia',
  'canada':'Canada','italy':'Italy','spain':'Spain','netherlands':'Netherlands',
  'holland':'Netherlands','thailand':'Thailand','indonesia':'Indonesia',
  'malaysia':'Malaysia','singapore':'Singapore','philippines':'Philippines',
  'turkey':'Turkey','saudi arabia':'Saudi Arabia','poland':'Poland',
  'russia':'Russia','south africa':'South Africa','egypt':'Egypt',
  'argentina':'Argentina','colombia':'Colombia','chile':'Chile',
  'nigeria':'Nigeria','kenya':'Kenya','pakistan':'Pakistan',
  'bangladesh':'Bangladesh','myanmar':'Myanmar','cambodia':'Cambodia',
  'taiwan':'Taiwan','hong kong':'Hong Kong','new zealand':'New Zealand',
  'israel':'Israel','kuwait':'Kuwait','qatar':'Qatar','oman':'Oman',
  'bahrain':'Bahrain','jordan':'Jordan','lebanon':'Lebanon','greece':'Greece',
  'portugal':'Portugal','belgium':'Belgium','switzerland':'Switzerland',
  'sweden':'Sweden','denmark':'Denmark','norway':'Norway','finland':'Finland',
  'austria':'Austria','czech republic':'Czech Republic','hungary':'Hungary',
  'romania':'Romania','ukraine':'Ukraine','morocco':'Morocco','algeria':'Algeria',
  'ghana':'Ghana','tanzania':'Tanzania','ethiopia':'Ethiopia','peru':'Peru',
  'ecuador':'Ecuador','venezuela':'Venezuela','guatemala':'Guatemala',
  'panama':'Panama','sri lanka':'Sri Lanka','laos':'Laos','nepal':'Nepal',
  'middle east':'UAE','southeast asia':'Vietnam','europe':'Germany',
  'north america':'USA','south america':'Brazil','africa':'South Africa',
};

/** 从用户原文中提取国家，任意语言均可识别 */
function extractCountriesFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  // 优先长词匹配（避免 'uk' 匹配到 'turkey'）
  const sorted = Object.entries(COUNTRY_ALIASES).sort((a,b) => b[0].length - a[0].length);
  for (const [alias, country] of sorted) {
    if (lower.includes(alias.toLowerCase())) found.add(country);
  }
  return found.size > 0 ? Array.from(found) : [];
}

/** 从用户原文中提取数量要求 */
function extractCountFromText(text: string): number {
  const m = text.match(/(\d+)\s*(?:家|个|条|家公司|个买家|results?|companies)/i);
  return m ? Math.min(Math.max(parseInt(m[1]), 5), 100) : 20;
}

/**
 * 从可能含中文的文本中提取英文产品关键词（Kimi失败时兜底）
 * 输出结果供 Serper / 社交媒体搜索使用
 */
export function extractEnglishProduct(text: string): string {
  if (!text) return 'goods';
  // 已经是英文
  if (!/[\u4e00-\u9fff]/.test(text)) return text.replace(/["""'']/g, '').slice(0, 50).trim();
  // 从混合文本中提取英文词组
  const engWords = text.match(/[a-zA-Z]{3,}/g);
  if (engWords && engWords.length >= 2) return engWords.slice(0, 4).join(' ');
  // 中文→英文常用产品词映射
  const MAP: Array<[RegExp, string]> = [
    [/运动服|运动装|运动衣|sportswear|sport.?wear/i,  'sportswear'],
    [/面料|织物|布料|纺织|fabric|textile/i,           'fabric textile'],
    [/服装|衣服|成衣|clothing|garment|apparel/i,      'clothing apparel'],
    [/鞋|shoes?|footwear|sneaker/i,                   'shoes footwear'],
    [/手机|mobile.?phone|smartphone/i,                'smartphone'],
    [/电子|electronics?/i,                            'electronics'],
    [/机械|设备|machinery|equipment/i,                'machinery equipment'],
    [/家具|furniture/i,                               'furniture'],
    [/玩具|toys?/i,                                   'toys'],
    [/食品|食物|food/i,                               'food products'],
    [/化妆|美妆|美容|cosmetics?|beauty/i,             'cosmetics beauty'],
    [/汽车|零配件|auto.?part|car.?part/i,             'auto parts'],
    [/化工|化学|chemical/i,                           'chemicals'],
    [/医疗|医药|medical|pharma/i,                     'medical supplies'],
    [/家电|appliance/i,                               'home appliance'],
    [/箱包|包袋|bags?|luggage/i,                      'bags luggage'],
    [/灯|照明|light|lamp|LED/i,                       'LED lighting'],
    [/建材|建筑|construction/i,                       'construction materials'],
    [/农产品|农业|agricultural/i,                     'agricultural products'],
    [/纸|paper/i,                                     'paper products'],
    [/塑料|plastic/i,                                 'plastic products'],
    [/金属|钢|steel|metal/i,                          'metal products'],
    [/木|木材|wood/i,                                 'wood products'],
  ];
  for (const [pat, en] of MAP) if (pat.test(text)) return en;
  return 'goods';
}

/** 根据产品名和国家生成默认关键词（Kimi失败时使用） */
function buildFallbackKeywords(productEn: string, countries: string[]): CountryKeywords[] {
  // 确保 productEn 是英文（防止中文原文传入）
  productEn = extractEnglishProduct(productEn);
  const langMap: Record<string, {language: string; code: string; local: string[]}> = {
    'Vietnam':       { language:'Vietnamese', code:'VN', local:[`nhà nhập khẩu ${productEn}`,`nhà phân phối ${productEn}`,`bán sỉ ${productEn} Việt Nam`] },
    'Germany':       { language:'German',     code:'DE', local:[`${productEn} Importeur Deutschland`,`${productEn} Großhändler`,`${productEn} Händler`] },
    'Japan':         { language:'Japanese',   code:'JP', local:[`${productEn} 輸入業者 日本`,`${productEn} 卸売業者`] },
    'Brazil':        { language:'Portuguese', code:'BR', local:[`importador de ${productEn} Brasil`,`distribuidor ${productEn}`,`atacadista ${productEn}`] },
    'Mexico':        { language:'Spanish',    code:'MX', local:[`importador de ${productEn} México`,`distribuidor ${productEn} Mexico`] },
    'Spain':         { language:'Spanish',    code:'ES', local:[`importador de ${productEn} España`,`distribuidor ${productEn}`] },
    'France':        { language:'French',     code:'FR', local:[`importateur ${productEn} France`,`distributeur ${productEn}`] },
    'Italy':         { language:'Italian',    code:'IT', local:[`importatore ${productEn} Italia`,`distributore ${productEn}`] },
    'Saudi Arabia':  { language:'Arabic',     code:'SA', local:[`مستورد ${productEn} السعودية`,`موزع ${productEn}`] },
    'UAE':           { language:'Arabic',     code:'AE', local:[`مستورد ${productEn} الإمارات`,`موزع ${productEn} دبي`] },
    'South Korea':   { language:'Korean',     code:'KR', local:[`${productEn} 수입업체 한국`,`${productEn} 유통업체`] },
    'Thailand':      { language:'Thai',       code:'TH', local:[`ผู้นำเข้า ${productEn} ไทย`,`ผู้จัดจำหน่าย ${productEn}`] },
    'Indonesia':     { language:'Indonesian', code:'ID', local:[`importir ${productEn} Indonesia`,`distributor ${productEn}`] },
    'Malaysia':      { language:'Malay',      code:'MY', local:[`pengimport ${productEn} Malaysia`,`pengedar ${productEn}`] },
    'Philippines':   { language:'Filipino',   code:'PH', local:[`importer ${productEn} Philippines`,`distributor ${productEn} Manila`] },
    'Poland':        { language:'Polish',     code:'PL', local:[`importer ${productEn} Polska`,`dystrybutor ${productEn}`] },
    'Russia':        { language:'Russian',    code:'RU', local:[`импортёр ${productEn} Россия`,`дистрибьютор ${productEn}`] },
    'Turkey':        { language:'Turkish',    code:'TR', local:[`${productEn} ithalatçı Türkiye`,`${productEn} distribütör`] },
    'India':         { language:'English',    code:'IN', local:[`${productEn} importer India`,`${productEn} distributor India`,`${productEn} wholesale India`] },
    'China':         { language:'Chinese',    code:'CN', local:[`${productEn} 进口商 中国`,`${productEn} 经销商`,`${productEn} 批发商 中国`] },
  };

  return countries.map(country => {
    const info = langMap[country] || { language:'English', code:'XX', local:[] };
    return {
      country,
      countryCode: info.code,
      language: info.language,
      englishKeywords: [
        `${productEn} importer ${country}`,
        `${productEn} distributor ${country}`,
        `${productEn} wholesaler ${country}`,
        `${productEn} buyer ${country}`,
      ],
      localKeywords: info.local.length > 0 ? info.local : [`${productEn} importer ${country}`],
    };
  });
}

// ─── Step 1A: Kimi 分析产品基本信息（小JSON，不含关键词） ────────

async function analyzeProductBasic(input: ChatInput): Promise<Omit<ProductAnalysis, 'searchKeywords'>> {
  // 构造用户消息——把所有输入类型整合进去
  const parts: string[] = [];

  if (input.message?.trim()) parts.push(`用户描述：${input.message}`);
  if (input.pdfText?.trim()) parts.push(`[PDF文件内容（节选）]:\n${input.pdfText.slice(0, 3000)}`);
  if (input.linkUrl?.trim()) parts.push(`[链接URL，请联网访问后分析内容]: ${input.linkUrl}`);

  const userContent = parts.join('\n\n') || '（无输入）';

  const systemPrompt = `你是资深外贸专家和产品分析师。
用户输入可能是：中文/英文/任意语言的产品描述、HS编码、URL链接、PDF摘要、简称缩写等任意格式。
无论输入多模糊，都要尽最大努力推断产品信息。
只返回JSON，不要Markdown代码块，不要任何解释文字。`;

  const userPrompt = `${userContent}

请分析上面的输入，提取产品信息，返回以下JSON（字段必须完整，用英文填写国家名）：
{
  "productName": "产品名（中英文均可）",
  "productType": "industrial|consumer|rawMaterial|parts|food|chemical|textile|other",
  "productDescription": "产品描述，50字以内",
  "hsCode": "HS编码（能推断则填，否则填null）",
  "advantages": ["产品优势1","优势2"],
  "buyerTypes": ["从以下选3-6个最匹配的: importer,distributor,wholesaler,manufacturer,retailer,projectBuyer,tradingCompany,agent,emc,institution,b2g,verticalBuyer,onlineSeller,buyingGroup,logistics,privateLabel"],
  "targetCountries": ["用户明确指定的国家用英文填写；未指定则填最适合该产品的10个国家"],
  "requestedCount": 20
}`;

  // Step A：纯文本解析，不需要联网工具（kimi-k2.5 推理能力足以理解任意语言输入）
  // 含 linkUrl 时用联网版本，否则用普通版本
  let content: string;
  if (input.linkUrl?.trim()) {
    content = await invokeKimiWithWebSearch([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { max_tokens: 900 });
  } else {
    const resp = await invokeKimiLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { max_tokens: 900 });
    content = resp.choices[0]?.message?.content || '';
  }

  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Step A JSON parse failed');
  return JSON.parse(m[0]);
}

// ─── Step 1B: Kimi 生成每国关键词（精简，独立调用） ──────────────

async function generateKeywords(productName: string, countries: string[]): Promise<CountryKeywords[]> {
  const prompt = `为以下产品和目标国家生成搜索关键词，只返回JSON数组，不要其他文字。

产品：${productName}
目标国家：${countries.join(', ')}

返回格式（每个国家一条）：
[
  {
    "country": "Vietnam",
    "countryCode": "VN",
    "language": "Vietnamese",
    "englishKeywords": ["tent importer Vietnam","camping tent distributor Ho Chi Minh","outdoor tent wholesaler Vietnam","tent buyer Vietnam"],
    "localKeywords": ["nhà nhập khẩu lều cắm trại Việt Nam","nhà phân phối lều","bán sỉ lều cắm trại"]
  }
]

注意：
- englishKeywords：3-4条，英文，含国家名+角色词（importer/distributor/wholesaler/buyer）
- localKeywords：2-3条，该国本地语言（德→德语，巴西→葡语，中东→阿拉伯语，日→日语，韩→韩语，东南亚→当地语言，等）
- 每个国家必须都有条目`;

  const resp = await invokeKimiLLM([
    { role: 'system', content: '只返回JSON数组，不要Markdown，不要解释。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.1, max_tokens: 1200 });  // 使用默认 kimi-k2.5

  const content = resp.choices[0]?.message?.content || '';
  const m = content.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('Step B JSON parse failed');
  return JSON.parse(m[0]) as CountryKeywords[];
}

// ─── Step 1: 主入口（两步走 + 全覆盖fallback） ───────────────────

export async function analyzeUserInput(input: ChatInput): Promise<ProductAnalysis> {
  // 合并所有文本用于正则提取国家/数量（不依赖AI）
  const contextText = [
    input.message,
    input.pdfText ? input.pdfText.slice(0, 2000) : '',
    input.linkUrl || '',
  ].filter(Boolean).join(' ');

  // ── 从用户原文提取国家（任何情况下都先跑，作为保底） ──────────
  const textCountries = extractCountriesFromText(contextText);
  const textCount = extractCountFromText(contextText);

  // ── Step A：kimi-latest + 联网，分析任意格式输入 ─────────────
  let basic: Omit<ProductAnalysis, 'searchKeywords'>;
  try {
    basic = await analyzeProductBasic(input);  // 传完整 ChatInput，含 linkUrl
    // 强制用文本提取到的国家覆盖（防止AI忽略用户指定国家）
    if (textCountries.length > 0) basic.targetCountries = textCountries;
    if (textCount && textCount !== 20) basic.requestedCount = textCount;
  } catch (e) {
    console.error('Step A 分析失败，使用文本提取兜底:', e);
    // 纯文本兜底：不依赖任何AI
    basic = {
      productName: input.message.slice(0, 60),
      productType: 'other',
      productDescription: input.message.slice(0, 100),
      buyerTypes: ['importer','distributor','wholesaler','manufacturer','retailer',
        'projectBuyer','tradingCompany','agent','emc','institution','b2g',
        'verticalBuyer','onlineSeller','buyingGroup','logistics','privateLabel'],
      targetCountries: textCountries.length > 0 ? textCountries : ['USA','Germany','Japan','UK','France','UAE','India','Brazil','Mexico','South Korea'],
      requestedCount: textCount || 20,
      advantages: [],
    };
  }

  // ── Step B：关键词生成（独立调用，失败不影响国家/产品） ──────
  let keywords: CountryKeywords[];
  try {
    keywords = await generateKeywords(basic.productName, basic.targetCountries);
    // 补全缺失国家（Step B可能漏掉某些国家）
    const covered = new Set(keywords.map(k => k.country));
    const missing = basic.targetCountries.filter(c => !covered.has(c));
    if (missing.length > 0) {
      keywords.push(...buildFallbackKeywords(basic.productName.split('/')[0].trim(), missing));
    }
  } catch (e) {
    console.error('Step B 关键词生成失败，使用内置模板:', e);
    keywords = buildFallbackKeywords(basic.productName.split('/')[0].trim(), basic.targetCountries);
  }

  return { ...basic, searchKeywords: keywords };
}

// ─── Step 2: Serper 搜索（内部生成4类变体，不依赖 Kimi） ────────

// B2B 目录黄页（内置，不依赖 Kimi 生成）
const B2B_DIRECTORIES: Record<string, string> = {
  'USA':          'site:thomasnet.com OR site:manta.com OR site:importyeti.com',
  'Germany':      'site:wlw.de OR site:europages.de',
  'UK':           'site:europages.co.uk OR site:yell.com',
  'France':       'site:europages.fr OR site:societe.com',
  'Italy':        'site:europages.it OR site:paginegialle.it',
  'Spain':        'site:europages.es OR site:infobel.com',
  'Vietnam':      'site:yellowpages.vn OR site:vietnamtrade.gov.vn',
  'India':        'site:indiamart.com OR site:tradeindia.com',
  'Brazil':       'site:empresasdobrasil.com OR site:telelistas.net',
  'Mexico':       'site:empresasenmexico.com.mx OR site:paginas-amarillas.com.mx',
  'Japan':        'site:jstage.jst.go.jp OR site:j-net21.smrj.go.jp',
  'South Korea':  'site:kita.net OR site:kotra.or.kr',
  'UAE':          'site:zawya.com OR site:gulfjobsmarket.com',
  'Thailand':     'site:thaitradefair.com OR site:ditp.go.th',
  'Indonesia':    'site:indonetwork.co.id OR site:bizindonesia.com',
  'Malaysia':     'site:malaysia.com OR site:matrade.gov.my',
  '_default':     'site:kompass.com OR site:europages.co.uk OR site:globaltrade.net',
};

async function searchSerper(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) return [];

  const prod = analysis.productName.split('/')[0].trim();
  const queries: Array<{q: string; country: string; hint: string}> = [];

  for (const ck of analysis.searchKeywords.slice(0, 6)) {
    const dir = B2B_DIRECTORIES[ck.country] || B2B_DIRECTORIES['_default'];

    // 变体1：英文关键词（Kimi生成或fallback模板）
    for (const kw of ck.englishKeywords.slice(0, 2))
      queries.push({ q: kw, country: ck.country, hint: '全球搜索' });

    // 变体2：本地语言
    for (const kw of ck.localKeywords.slice(0, 1))
      queries.push({ q: kw, country: ck.country, hint: '当地语言' });

    // 变体3：B2B目录（内置，必然生成）
    queries.push({ q: `${dir} "${prod}" importer OR distributor OR wholesaler`, country: ck.country, hint: 'B2B目录' });

    // 变体4：采购意图词（内置模板）
    queries.push({ q: `"${prod}" "looking for supplier" OR "seeking manufacturer" OR "import from China" ${ck.country}`, country: ck.country, hint: '采购意图' });
  }

  const uniqueMap = new Map<string, BuyerCompany>();
  const BATCH = 5;
  const list = queries.slice(0, 24); // 最多24次查询

  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(({ q, country, hint }) =>
      fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, num: 10 }),
        signal: AbortSignal.timeout(8000)
      }).then(r => r.ok ? r.json() : null).then(d => ({ d, country, hint }))
    ));

    for (const result of settled) {
      if (result.status !== 'fulfilled' || !result.value?.d) continue;
      const { d, country, hint } = result.value;
      for (const item of (d.organic || []).slice(0, 6)) {
        const domain = extractDomain(item.link);
        if (!domain || isBlacklisted(domain)) continue;
        if (uniqueMap.has(domain)) continue;
        uniqueMap.set(domain, {
          name: cleanCompanyName(item.title),
          website: item.link,
          description: item.snippet,
          country: guessCountryFromUrl(item.link) || country,
          source: 'serper',
          matchReason: hint,
        });
      }
    }
  }

  return Array.from(uniqueMap.values());
}

// ─── Step 3: GLEIF 法人实体搜索 ─────────────────────────────────

/**
 * GLEIF：用已知公司名查法人注册数据（enrichment 模式）
 * 传入 Serper/其他来源找到的公司名称列表，
 * 在 GLEIF 精确验证并补全 LEI / 注册地址 / 实体状态。
 */
async function enrichGLEIF(companies: BuyerCompany[]): Promise<void> {
  const targets = companies
    .filter(c => (c.source === 'serper' || c.source === 'exa' || c.source === 'tavily') && c.name && !c.leiCode)
    .slice(0, 5); // 最多 5 家，锦上添花

  await Promise.allSettled(targets.map(async (company) => {
    try {
      // ① 通过公司名搜索 lei-records（fuzzycompletions 只返回文字无 ID，需用 filter 搜索）
      const searchUrl = `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(company.name)}&page[size]=1`;
      const r = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return;
      const d = await r.json();
      const rec = (d.data || [])[0];
      if (!rec) return;

      const lei: string    = rec.id || '';
      const entity         = rec.attributes?.entity;
      if (!lei || !entity) return;

      // 名字相似度校验（防止错误匹配）
      const gleifName: string = entity.legalName?.name || '';
      const q6  = company.name.toLowerCase().slice(0, 6);
      const g6  = gleifName.toLowerCase().slice(0, 6);
      const nameMatch = gleifName.toLowerCase().includes(q6) || company.name.toLowerCase().includes(g6);
      if (!nameMatch) return;

      // ② 补全公司基础字段
      company.leiCode  = company.leiCode  || lei;
      company.address  = company.address  || [
        entity.legalAddress?.addressLines?.join(', '),
        entity.legalAddress?.postalCode,
        entity.legalAddress?.city,
      ].filter(Boolean).join(', ');
      company.country  = company.country  || entity.legalAddress?.country || company.country;
      company.industry = company.industry || entity.category;

      // ③ 母公司穿透：先查 ultimate-parent-relationship，fallback direct-parent-relationship
      //    端点格式：/lei-records/{lei}/ultimate-parent-relationship
      //    返回 data.attributes.relationship.endNode.id = 母公司 LEI
      let parentTag = '';
      for (const rel of ['ultimate-parent-relationship', 'direct-parent-relationship']) {
        try {
          const rp = await fetch(
            `https://api.gleif.org/api/v1/lei-records/${lei}/${rel}`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (!rp.ok) continue;
          const dp = await rp.json();
          const parentLei: string = dp.data?.attributes?.relationship?.endNode?.id || '';
          if (!parentLei) continue;

          // 用母公司 LEI 查名称 & 国家
          const rp2 = await fetch(
            `https://api.gleif.org/api/v1/lei-records/${parentLei}`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (!rp2.ok) break;
          const dp2      = await rp2.json();
          const pEntity  = dp2.data?.attributes?.entity;
          const pName    = pEntity?.legalName?.name || '';
          const pCountry = pEntity?.legalAddress?.country || '';
          if (pName) {
            parentTag = ` | 🏢 母公司: ${pName}${pCountry ? ` (${pCountry})` : ''}`;
          }
          break; // 找到一个就够了
        } catch (_) { break; }
      }

      company.description = (company.description || '') + ` | ✅ GLEIF验证 LEI:${lei.slice(0, 8)}…${parentTag}`;
    } catch (_) {}
  }));
}

// ─── Step 5: 高德地图 (仅中国) ───────────────────────────────────

async function searchAmap(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const AMAP_KEY = process.env.AMAP_KEY;
  if (!AMAP_KEY) return [];

  const hasChinaTarget = analysis.targetCountries.some(
    c => ['China', 'CN', '中国'].includes(c)
  );
  if (!hasChinaTarget && !analysis.searchKeywords.some(k => k.countryCode === 'CN')) return [];

  const results: BuyerCompany[] = [];
  const chineseCities = ['020', '021', '010', '0755', '0571']; // 广州/上海/北京/深圳/杭州 的区号作为城市码
  const amapCityCodes = ['广州', '上海', '北京', '深圳', '杭州'];

  // 生成中文关键词
  const cnKeywords = analysis.searchKeywords.find(k => k.countryCode === 'CN');
  const keywords = cnKeywords?.localKeywords.slice(0, 3) || [
    analysis.productName + '进口商',
    analysis.productName + '经销商',
    analysis.productName + '批发商'
  ];

  for (const city of amapCityCodes.slice(0, 3)) {
    for (const kw of keywords.slice(0, 2)) {
      try {
        const r = await fetch(
          `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(kw)}&city=${encodeURIComponent(city)}&key=${AMAP_KEY}&offset=10&extensions=all`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!r.ok) continue;
        const d = await r.json();
        if (d.status !== '1') continue;
        for (const poi of (d.pois || []).slice(0, 3)) {
          const [lng, lat] = (poi.location || '').split(',').map(Number);
          results.push({
            name: poi.name,
            country: '中国',
            city: poi.cityname || city,
            address: poi.address,
            phone: poi.tel,
            source: 'amap',
            coordinates: lat && lng ? { lat, lng } : undefined,
            description: poi.type || poi.typecode,
          });
        }
      } catch (_) {}
    }
  }

  return results;
}

// ─── Step 6: Google Places (服务器侧，无Referer限制) ───────────

async function searchGooglePlaces(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!GOOGLE_KEY) return [];

  const results: BuyerCompany[] = [];

  for (const ck of analysis.searchKeywords.filter(k => k.countryCode !== 'CN').slice(0, 3)) {
    const query = `${ck.englishKeywords[0]} ${ck.country}`;
    try {
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,places.rating,places.location'
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 5, languageCode: 'en' }),
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) continue;
      const d = await r.json();
      for (const place of (d.places || []).slice(0, 3)) {
        results.push({
          name: place.displayName?.text || 'Unknown',
          country: ck.country,
          address: place.formattedAddress,
          phone: place.internationalPhoneNumber,
          website: place.websiteUri,
          rating: place.rating,
          coordinates: place.location,
          source: 'google_places',
        });
      }
    } catch (_) {}
  }

  return results;
}

// ─── Step 7: EU VIES (已知域名反查VAT) ─────────────────────────

async function searchEUVIES(companies: BuyerCompany[]): Promise<BuyerCompany[]> {
  // VIES 用于验证已找到的欧洲公司，添加VAT号
  const euCountries = ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'PL', 'BE', 'AT', 'SE'];
  const euCompanies = companies.filter(c =>
    euCountries.some(code =>
      c.country?.toLowerCase().includes('germany') ||
      c.country?.toLowerCase().includes('france') ||
      c.country?.toLowerCase().includes('uk') ||
      c.country?.toLowerCase().includes('italy') ||
      (c.website && (c.website.includes('.de') || c.website.includes('.fr') || c.website.includes('.co.uk')))
    )
  );

  // VIES 验证功能 - 为欧洲公司打标记
  for (const company of euCompanies.slice(0, 5)) {
    company.description = (company.description || '') + ' | 已标记为欧盟企业（可通过VIES验证VAT）';
  }

  return companies; // 返回原列表（已更新）
}

function parseXmlText(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ─── Tavily AI 搜索（B2B 定向，评分自带相关度） ──────────────────

async function searchTavily(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const KEY = process.env.TAVILY_API_KEY;
  if (!KEY) return [];

  // 每个目标国家生成 2 条查询：通用词 + 本地关键词
  const queries: { q: string; country: string }[] = [];
  for (const ck of analysis.searchKeywords.slice(0, 3)) {
    const en = ck.englishKeywords[0] || `${analysis.productName} importer`;
    queries.push({ q: `${en} ${ck.country}`,            country: ck.country });
    queries.push({ q: `${analysis.productName} distributor wholesaler ${ck.country} company`, country: ck.country });
  }

  const results: BuyerCompany[] = [];

  await Promise.allSettled(queries.map(async ({ q, country }) => {
    try {
      const r = await fetch('https://api.tavily.com/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key:      KEY,
          query:        q,
          search_depth: 'basic',
          max_results:  5,
          // 优先 B2B 目录和贸易数据库
          include_domains: [
            'kompass.com', 'europages.co.uk', 'globaltrade.net',
            'importyeti.com', 'tradeindia.com', 'indiamart.com',
            'tradekey.com', 'linkedin.com', 'panjiva.com', 'volza.com',
          ],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return;
      const data = await r.json() as any;
      for (const item of data.results || []) {
        // 从页面标题里去掉网站名后缀，拿公司名
        const rawName = (item.title || '')
          .replace(/\s*[-|–|·]\s*(LinkedIn|Kompass|Europages|Panjiva|ImportYeti|TradeIndia|.{1,25})$/, '')
          .trim();
        if (!rawName || rawName.length < 3) continue;

        const score = Math.round((item.score ?? 0.5) * 100);
        results.push({
          id:          `tavily_${Buffer.from(item.url || rawName).toString('base64').slice(0, 10)}`,
          name:        rawName.slice(0, 80),
          website:     item.url || undefined,
          country,
          description: (item.content || '').slice(0, 200),
          source:      'tavily',
          matchScore:  score,
        });
      }
    } catch (_) {}
  }));

  return results;
}

// ─── Exa 神经网络搜索（company 分类，企业主页精准） ──────────────

async function searchExa(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const KEY = process.env.EXA_API_KEY;
  if (!KEY) return [];

  const results: BuyerCompany[] = [];

  // 每个目标国家 2 种查询：通用 company 分类 + 普通搜索
  const tasks = analysis.searchKeywords.slice(0, 3).flatMap(ck => [
    {
      q:        `${analysis.productName} importer distributor ${ck.country}`,
      country:  ck.country,
      category: 'company' as const,
    },
    {
      q:        `${ck.englishKeywords[0] || analysis.productName} ${ck.country} wholesale`,
      country:  ck.country,
      category: undefined,
    },
  ]);

  await Promise.allSettled(tasks.map(async ({ q, country, category }) => {
    try {
      const body: Record<string, unknown> = {
        query:       q,
        type:        'auto',
        num_results: 5,
        contents:    { highlights: { max_characters: 300 } },
      };
      if (category) body.category = category;

      const r = await fetch('https://api.exa.ai/search', {
        method:  'POST',
        headers: { 'x-api-key': KEY, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(8000),
      });
      if (!r.ok) return;
      const data = await r.json() as any;

      for (const item of data.results || []) {
        if (!item.url || !item.title) continue;
        const rawName = (item.title || '')
          .replace(/\s*[-|–]\s*(Trademo|Kompass|LinkedIn|Europages|.{1,20})$/, '')
          .trim();
        if (!rawName || rawName.length < 3) continue;

        const snippet = (item.highlights?.[0] || item.text || '').slice(0, 200);
        results.push({
          id:          `exa_${Buffer.from(item.url).toString('base64').slice(0, 10)}`,
          name:        rawName.slice(0, 80),
          website:     item.url,
          country,
          description: snippet,
          source:      'exa',
          matchScore:  70,  // Exa 结果质量稳定，给固定初始分
        });
      }
    } catch (_) {}
  }));

  return results;
}

// ─── Apify Google Maps 爬虫（真实本地企业 + 电话） ────────────────

async function searchApifyGoogleMaps(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const TOKEN = process.env.APIFY_API_KEY;
  if (!TOKEN) return [];

  // 每个目标国家 2 种查询，最多 3 个国家 = 6 条
  const searchStrings: string[] = [];
  for (const ck of analysis.searchKeywords.slice(0, 3)) {
    searchStrings.push(`${analysis.productName} importer ${ck.country}`);
    searchStrings.push(`${analysis.productName} distributor ${ck.country}`);
  }

  try {
    const r = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items` +
      `?token=${TOKEN}&timeout=60&memory=256`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray:       searchStrings,
          maxCrawledPlacesPerSearch: 3,
          language: 'en',
        }),
        signal: AbortSignal.timeout(75000),  // Apify 同步运行需要更长时间
      }
    );
    if (!r.ok) return [];
    const data = await r.json() as any[];
    if (!Array.isArray(data)) return [];

    // ISO2 代码 → 英文国家名（Apify 返回 "VN" 而非 "Vietnam"）
    const ISO2_TO_NAME: Record<string, string> = {
      VN:'Vietnam', TH:'Thailand', ID:'Indonesia', MY:'Malaysia', PH:'Philippines',
      SG:'Singapore', IN:'India', BD:'Bangladesh', PK:'Pakistan', LK:'Sri Lanka',
      DE:'Germany', FR:'France', IT:'Italy', ES:'Spain', NL:'Netherlands',
      PL:'Poland', GB:'UK', BE:'Belgium', AT:'Austria', SE:'Sweden',
      US:'USA', CA:'Canada', MX:'Mexico', BR:'Brazil', AR:'Argentina',
      AU:'Australia', NZ:'New Zealand', JP:'Japan', KR:'South Korea', CN:'China',
      AE:'UAE', SA:'Saudi Arabia', TR:'Turkey', EG:'Egypt', NG:'Nigeria',
      ZA:'South Africa', KE:'Kenya', MA:'Morocco',
    };

    return data
      .filter((item: any) => item.title && item.title.length > 2)
      .map((item: any) => {
        const iso2    = (item.countryCode || '').toUpperCase();
        const country = ISO2_TO_NAME[iso2]
          || (item.address || '').split(',').slice(-1)[0]?.trim()
          || '';
        return {
          id:          `apify_${item.placeId || Buffer.from(item.title || '').toString('base64').slice(0, 10)}`,
          name:        (item.title || '').slice(0, 80),
          website:     item.website   || undefined,
          phone:       item.phone     || undefined,
          address:     item.address   || undefined,
          country,
          description: (item.description || item.categoryName || '').slice(0, 200),
          source:      'apify_maps' as DataSource,
        };
      });
  } catch (_) {
    return [];
  }
}

// ─── UN Comtrade 贸易数据（市场洞察卡片） ────────────────────────

// 国家名 → UN Comtrade 报告国代码（numeric）
const COMTRADE_CODES: Record<string, number> = {
  'USA':842, 'United States':842, 'Germany':276, 'Japan':392,
  'UK':826, 'United Kingdom':826, 'France':250, 'UAE':784,
  'United Arab Emirates':784, 'India':356, 'Brazil':76, 'Mexico':484,
  'South Korea':410, 'Korea':410, 'Vietnam':704, 'Viet Nam':704,
  'Thailand':764, 'Indonesia':360, 'Malaysia':458, 'Singapore':702,
  'Philippines':608, 'Australia':36, 'Canada':124, 'Italy':380,
  'Spain':724, 'Netherlands':528, 'Poland':616, 'Turkey':792,
  'Saudi Arabia':682, 'China':156, 'Hong Kong':344, 'Taiwan':490,
  'Russia':643, 'Nigeria':566, 'South Africa':710, 'Kenya':404,
  'Egypt':818, 'Morocco':504, 'Pakistan':586, 'Bangladesh':50,
  'Sri Lanka':144, 'Cambodia':116, 'Myanmar':104, 'Chile':152,
  'Colombia':170, 'Peru':604, 'Argentina':32, 'Netherlands':528,
};

async function searchUNComtrade(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  // 需要 HS 编码才能查（取前4位）
  const hsRaw = analysis.hsCode?.replace(/\D/g, '') || '';
  if (!hsRaw || hsRaw.length < 4) return [];
  const hsCode4 = hsRaw.slice(0, 4);

  const results: BuyerCompany[] = [];
  const year = new Date().getFullYear() - 1;  // 上一年数据

  // 对每个目标国家查进口数据
  await Promise.allSettled(
    analysis.targetCountries.slice(0, 4).map(async (country) => {
      const reporterCode = COMTRADE_CODES[country];
      if (!reporterCode) return;

      try {
        // 优先用付费 key，fallback 到免费 public preview
        const KEY = process.env.UN_COMTRADE_KEY;
        const baseUrl = KEY
          ? `https://comtradeapi.un.org/data/v1/get/C/A/HS`
          : `https://comtradeapi.un.org/public/v1/preview/C/A/HS`;
        const headers: Record<string, string> = KEY
          ? { 'Ocp-Apim-Subscription-Key': KEY }
          : {};

        const url = `${baseUrl}?reporterCode=${reporterCode}&period=${year}&cmdCode=${hsCode4}&flowCode=M&includeDesc=true&maxRecords=5`;
        const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
        if (!r.ok) return;
        const d = await r.json() as any;
        const rows: any[] = d.data || [];
        if (!rows.length) return;

        // 聚合总贸易额和主要进口来源国
        let totalValue = 0;
        const partners: string[] = [];
        for (const row of rows) {
          if (row.partnerDesc && row.partnerDesc !== 'World') {
            partners.push(`${row.partnerDesc}($${((row.primaryValue||0)/1e6).toFixed(1)}M)`);
          }
          if (row.partnerDesc === 'World') totalValue = row.primaryValue || 0;
        }

        const valueStr = totalValue > 1e6
          ? `$${(totalValue / 1e6).toFixed(1)}M`
          : totalValue > 1e3
          ? `$${(totalValue / 1e3).toFixed(0)}K`
          : `$${totalValue}`;

        results.push({
          id:          `comtrade_${country}_${hsCode4}`,
          name:        `📊 ${country} 市场洞察 · HS${hsCode4}`,
          country,
          description: `${year}年 ${country} 进口 HS${hsCode4} 总额 ${valueStr}` +
                       (partners.length ? `，主要来自：${partners.slice(0, 3).join('、')}` : ''),
          source:      'comtrade',
          website:     `https://comtradeplus.un.org/TradeFlow?Frequency=A&Flows=M&CommodityCodes=${hsCode4}&Partners=0&Reporters=${reporterCode}&period=${year}&AggregateBy=none&BreakdownMode=plus`,
          matchScore:  55,  // 市场洞察固定分数，不参与企业排名
        });
      } catch (_) {}
    })
  );

  return results;
}

// ─── 规则预打分（快速，用于 Kimi 之前的粗排） ────────────────────

function ruleScore(c: BuyerCompany, analysis: ProductAnalysis): number {
  let score = 50;
  if (c.website) score += 10;
  if (c.phone || c.email) score += 10;
  if (c.source === 'serper')        score += 8;
  if (c.source === 'gleif')         score += 7;
  if (c.source === 'google_places') score += 8;
  if (c.source === 'apify_maps')    score += 8;
  if (c.source === 'exa')           score += 8;
  if (c.source === 'tavily')        score += 7;
  if (c.source === 'comtrade')      score += 0;  // 市场洞察不参与企业排名
  if (c.source === 'overpass')      score += 4;
  if (c.source === 'reddit')        score += 3;
  if (c.source === 'social')        score += 3;
  if (analysis.targetCountries.some(tc =>
    c.country?.toLowerCase().includes(tc.toLowerCase()) ||
    tc.toLowerCase().includes(c.country?.toLowerCase() || '')
  )) score += 5;
  return Math.min(99, score);
}

// ─── Kimi AI 打分 + 虚假过滤 ─────────────────────────────────────

async function scoreAndRank(
  companies: BuyerCompany[],
  analysis: ProductAnalysis,
  requestedN: number = 20,
): Promise<BuyerCompany[]> {
  if (companies.length === 0) return [];

  // Step 1：规则预打分（粗排）
  const preRanked = companies
    .map(c => ({ ...c, matchScore: ruleScore(c, analysis) }))
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  // Step 2：Kimi AI 精排 — 按 requestedN 控制消耗
  // N=10 → 处理 top30；N=20 → top60；N=100 → top100
  const kimiLimit = Math.min(requestedN * 3, 100);
  const toScore   = preRanked.slice(0, kimiLimit);
  const rest      = preRanked.slice(kimiLimit);  // 超出的保留规则分

  const BATCH  = 25;   // 每批 25 家，减少调用次数
  const scored: BuyerCompany[] = [];

  for (let i = 0; i < toScore.length; i += BATCH) {
    const batch = toScore.slice(i, i + BATCH);
    try {
      const input = batch.map((c, idx) => ({
        idx,
        name:        c.name?.slice(0, 60),
        website:     c.website ? '有' : '无',
        country:     c.country || '',
        source:      c.source,
        description: (c.description || c.matchReason || '').slice(0, 80),
      }));

      const prompt = `产品：${analysis.productName}
目标买家国家：${analysis.targetCountries.join(', ')}

对下面每条记录打分（0-100），判断它是否是真实且有成交可能的该产品买家/进口商/经销商。

评分标准：
- 70-100：真实中小企业，是该产品的活跃进口商/经销商/批发商，国家匹配，有采购意向
- 40-69：真实企业，相关性一般，或国家不完全匹配，或行业相关
- 10-39：真实存在但与产品无关，或是新闻/展会信息/供应商而非买家
- 0-9：以下情况直接给0：PDF文件、目录网站首页（tradekey/exportgenius/alibaba.com/importyeti）、明显虚假数据、无意义噪音

扣分规则（重要）：
- 是供应商/制造商而非买家：-30分
- 国家与目标不符：-20分
- 大型跨国公司（财富500强、年营收>10亿美元）：-15分（大公司不会理小供应商）
- 没有联系方式且来源可疑：-10分
- 联系方式含example/test/sample/noreply等明显虚假：-20分

加分规则：
- description/matchReason含2022/2023/2024/2025近年采购记录：+10分
- 社交媒体帖子/Reddit帖子含明确采购意图（looking for supplier/want to buy）：+15分
- 有官网+有联系方式：+5分

记录列表：
${JSON.stringify(input)}

只返回JSON数组，reason字段一句话中文说明推荐/不推荐理由：
[{"idx":0,"score":75,"reason":"俄罗斯中型运动服经销商，有近期进口记录"},...]`;

      const resp = await invokeKimiLLM([
        { role: 'system', content: '你是外贸数据质量专家。只返回JSON数组，无需解释。' },
        { role: 'user',   content: prompt },
      ], { max_tokens: 1500 });

      const raw = resp.choices[0]?.message?.content || '';
      const m   = raw.match(/\[[\s\S]*\]/);
      if (!m) { scored.push(...batch); continue; }

      const scores = JSON.parse(m[0]) as Array<{ idx: number; score: number; reason?: string }>;
      for (const s of scores) {
        const company = batch[s.idx];
        if (!company) continue;
        if (s.score < 10) continue;   // 只过滤明显垃圾，其余保留
        company.matchScore  = s.score;
        company.aiReason    = s.reason || '';   // AI一句话推荐理由
        company.matchReason = `${s.reason || ''} | 来源: ${sourceLabel(company.source)}${company.website ? ' | 有官网' : ''}`;
        scored.push(company);
      }
    } catch (_) {
      scored.push(...batch);  // Kimi 失败则保留规则分
    }
  }

  return [...scored, ...rest].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

// ─── 主函数：聚合搜索（Suite1 + Suite2 并发，Apify 后台追加） ────

export async function runBuyerSearch(
  analysis: ProductAnalysis,
  onProgress: (p: SearchProgress) => void
): Promise<BuyerCompany[]> {

  const N = Math.max(analysis.requestedCount, 10); // 用户要求数量

  onProgress({ stage: 'searching', progress: 20, message: '🚀 三路引擎并发启动...' });

  // ── Apify 提前启动（后台运行，不阻塞主流程）────────────────────
  // 给 Apify 30s 总预算；Suite1+2 约 8-12s，之后再等 ~18s
  const apifyStartTime = Date.now();
  const apifyPromise   = searchApifyGoogleMaps(analysis).catch(() => [] as BuyerCompany[]);

  // ── Suite1 + Suite2 并发（8-12s 内完成）────────────────────────
  const [suite1Settled, suite2Settled] = await Promise.allSettled([

    // ★ Suite 1：Serper + 高德 + Google Places + Comtrade
    (async (): Promise<BuyerCompany[]> => {
      const r: BuyerCompany[] = [];

      onProgress({ stage: 'searching', progress: 22, message: '🔍 [Suite1] Serper 多语言关键词搜索...' });
      const serper = await searchSerper(analysis);
      r.push(...serper);
      onProgress({ stage: 'searching', progress: 32, message: `✅ [Suite1] Serper ${serper.length} 条` });

      onProgress({ stage: 'searching', progress: 33, message: '🏛️ [Suite1] 高德 + GPlaces + Comtrade 并发...' });
      const [amap, google, comtrade] = await Promise.allSettled([
        searchAmap(analysis),
        searchGooglePlaces(analysis),
        searchUNComtrade(analysis),
      ]);
      const av  = amap.status     === 'fulfilled' ? amap.value     : [];
      const gpv = google.status   === 'fulfilled' ? google.value   : [];
      const ctv = comtrade.status === 'fulfilled' ? comtrade.value : [];
      r.push(...av, ...gpv, ...ctv);
      onProgress({ stage: 'searching', progress: 48, message: `✅ [Suite1] 高德 ${av.length} · GPlaces ${gpv.length} · Comtrade ${ctv.length}` });

      // GLEIF enrichment（限 5 家，3s 超时，锦上添花）
      await enrichGLEIF(r);
      return r;
    })(),

    // ★ Suite 2：Exa + Tavily + RSS + 社交
    (async (): Promise<BuyerCompany[]> => {
      onProgress({ stage: 'searching', progress: 22, message: '📡 [Suite2] Exa + Tavily + RSS + 社交并发...' });
      const [rssResult, tavilyResult, exaResult] = await Promise.allSettled([
        runRSSMultiSearch(analysis, (msg) => {
          onProgress({ stage: 'searching', progress: 36, message: `  [Suite2] ${msg}` });
        }),
        searchTavily(analysis),
        searchExa(analysis),
      ]);
      const rssItems    = rssResult.status    === 'fulfilled' ? rssResult.value    : [];
      const tavilyItems = tavilyResult.status === 'fulfilled' ? tavilyResult.value : [];
      const exaItems    = exaResult.status    === 'fulfilled' ? exaResult.value    : [];
      const r = [...rssItems, ...tavilyItems, ...exaItems];
      const socialCnt = r.filter(c => c.source === 'social' || c.source === 'reddit').length;
      onProgress({ stage: 'searching', progress: 50, message: `✅ [Suite2] Exa ${exaItems.length} · Tavily ${tavilyItems.length} · RSS/社交 ${rssItems.length}（社媒 ${socialCnt}条）` });
      return r;
    })(),
  ]);

  const allResults: BuyerCompany[] = [];
  if (suite1Settled.status === 'fulfilled') allResults.push(...suite1Settled.value);
  if (suite2Settled.status === 'fulfilled') allResults.push(...suite2Settled.value);

  // ── Apify 追加（在剩余时间窗口内等待，超时则跳过）──────────────
  const elapsedMs    = Date.now() - apifyStartTime;
  const remainingMs  = Math.max(0, 30000 - elapsedMs); // 30s 总预算
  if (remainingMs > 500) {
    onProgress({ stage: 'searching', progress: 52, message: `📍 等待 Google Maps 本地企业数据（剩余 ${Math.round(remainingMs / 1000)}s）...` });
    const apifyResults = await Promise.race([
      apifyPromise,
      new Promise<BuyerCompany[]>(resolve => setTimeout(() => resolve([]), remainingMs)),
    ]);
    if (apifyResults.length) {
      allResults.push(...apifyResults);
      onProgress({ stage: 'searching', progress: 54, message: `✅ Google Maps 追加 ${apifyResults.length} 条本地企业` });
    }
  }

  onProgress({ stage: 'searching', progress: 55, message: `🔀 三路完成，原始 ${allResults.length} 条，正在处理...` });

  // ── EU VIES 标注 ─────────────────────────────────────────────
  await searchEUVIES(allResults);

  // ── 分离市场洞察（comtrade）不参与去重和 Kimi 评分 ─────────────
  const comtradeItems = allResults.filter(c => c.source === 'comtrade');
  const mainItems     = allResults.filter(c => c.source !== 'comtrade');

  // ── 去重（website 域名 / source+name+country）────────────────
  onProgress({ stage: 'dedup', progress: 57, message: '🔄 去重合并...' });
  const uniqueMap = new Map<string, BuyerCompany>();
  for (const c of mainItems) {
    const key = c.website
      ? c.website.toLowerCase().replace(/https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '')
      : `${c.source}:${(c.name || '').toLowerCase().trim()}:${(c.country || '').toLowerCase()}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, c);
  }
  const unique = Array.from(uniqueMap.values());
  onProgress({ stage: 'dedup', progress: 60, message: `✅ 去重后 ${unique.length} 家企业` });

  // ── Kimi AI 打分 + 虚假过滤（按 N 控制消耗）────────────────────
  // N=10 → 最多处理 30 家；N=20 → 60 家；N=100 → 100 家
  onProgress({ stage: 'ranking', progress: 62, message: `🤖 Kimi AI 筛查中（${unique.length} 家企业）...` });
  const ranked      = await scoreAndRank(unique, analysis, N);
  const topResults  = ranked.slice(0, N);
  onProgress({ stage: 'ranking', progress: 80, message: `✅ Kimi筛查完成，保留 ${topResults.length} 家，开始获取联系方式...` });

  // comtrade 市场洞察追加到末尾，前端单独渲染
  return [...topResults, ...comtradeItems];
}

// ─── 工具函数 ───────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch { return ''; }
}

const BLACKLIST = ['amazon', 'alibaba', 'google', 'youtube', 'facebook', 'twitter', 'linkedin', 'wikipedia', 'baidu', 'taobao', 'jd.com', 'ebay', 'walmart'];
function isBlacklisted(domain: string): boolean {
  return BLACKLIST.some(b => domain.includes(b));
}

function cleanCompanyName(title: string): string {
  return title
    .replace(/\s*[-|–—]\s*.*$/, '')  // 删除 " - some site name" 后缀
    .replace(/\s*\|.*$/, '')
    .replace(/\s*::.*$/, '')
    .trim()
    .slice(0, 80);
}

function guessCountryFromUrl(url: string): string {
  const tldMap: Record<string, string> = {
    '.de': 'Germany', '.fr': 'France', '.co.uk': 'UK', '.jp': 'Japan',
    '.cn': 'China', '.in': 'India', '.au': 'Australia', '.ca': 'Canada',
    '.br': 'Brazil', '.mx': 'Mexico', '.kr': 'South Korea', '.ae': 'UAE',
    '.sg': 'Singapore', '.nl': 'Netherlands', '.it': 'Italy', '.es': 'Spain',
    '.pl': 'Poland', '.ru': 'Russia', '.tr': 'Turkey', '.sa': 'Saudi Arabia',
  };
  for (const [tld, country] of Object.entries(tldMap)) {
    if (url.includes(tld)) return country;
  }
  return 'USA'; // .com 默认
}

function guessCountryFromText(text: string): string {
  const countryMap: Record<string, string> = {
    'usa': 'USA', 'united states': 'USA', 'america': 'USA',
    'germany': 'Germany', 'deutschland': 'Germany',
    'japan': 'Japan', 'uk': 'UK', 'france': 'France',
    'china': 'China', 'india': 'India', 'brazil': 'Brazil',
    'uae': 'UAE', 'dubai': 'UAE',
  };
  const lower = text.toLowerCase();
  for (const [key, country] of Object.entries(countryMap)) {
    if (lower.includes(key)) return country;
  }
  return 'Unknown';
}

function sourceLabel(source: DataSource): string {
  const labels: Record<DataSource, string> = {
    serper:       'Serper搜索',
    gleif:        'GLEIF法人注册',
    overpass:     'OpenStreetMap',
    amap:         '高德地图',
    kimi_ai:      'Kimi AI',
    google_places:'Google Places',
    eu_vies:      'EU VIES',
    common_crawl: 'CommonCrawl',
    reddit:       'Reddit',
    social:       '社交媒体',
    tavily:       'Tavily AI搜索',
    apify_maps:   'Google Maps',
    comtrade:     'UN贸易数据',
    exa:          'Exa神经搜索',
  };
  return labels[source] || source;
}
