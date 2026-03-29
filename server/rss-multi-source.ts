/**
 * RSS 多源搜索引擎
 *
 * 实际可用的数据来源（直连 RSS 或 Serper 代理）：
 *
 * ┌─ 社交/论坛 ──────────────────────────────────────────────────┐
 * │ 1. Reddit         RSS直连   r/Entrepreneur, r/smallbusiness 等│
 * │ 2. Hacker News    RSS直连   hnrss.org                        │
 * │ 3. X/Twitter      Serper    site:x.com 采购需求帖            │
 * │ 4. Facebook       Serper    site:facebook.com 采购组          │
 * │ 5. Instagram      Serper    site:instagram.com 贸易账号       │
 * ├─ B2B 黄页/平台 ────────────────────────────────────────────── │
 * │ 6. Alibaba        Serper    site:alibaba.com/trade 询盘       │
 * │ 7. LinkedIn       Serper    site:linkedin.com/company 档案    │
 * │ 8. Craigslist     Serper    site:craigslist.org 采购帖        │
 * ├─ 展会信息 ──────────────────────────────────────────────────── │
 * │ 9. Trade Events   Google News RSS  展会新闻                   │
 * │10. 10times.com    Serper    展会参展商名录                     │
 * ├─ 海关/贸易数据 ─────────────────────────────────────────────── │
 * │11. Google News    RSS直连   进口商/经销商新闻                  │
 * │12. PRNewswire     RSS直连   企业新闻稿（扩张/合作）           │
 * │13. WTO/政府       RSS直连   贸易政策/市场数据                 │
 * ├─ 公司注册/法律数据 ─────────────────────────────────────────── │
 * │14. SEC EDGAR      API直连   美国上市公司文件                  │
 * │15. GLEIF          API直连   全球法人 LEI 注册                 │
 * │16. OpenCorporates API       全球公司注册（限免费配额）         │
 * └──────────────────────────────────────────────────────────────┘
 */

import { BuyerCompany, ProductAnalysis, extractEnglishProduct } from './buyer-search-v2';

const UA = 'GlobalMatchApp/2.0 (buyer-search-engine; contact: info@globalmatch.app)';

/** 从 analysis 中取最佳英文关键词，防止中文原文传入搜索 */
function getBestEngKeyword(analysis: ProductAnalysis): string {
  const kw = analysis.searchKeywords[0]?.englishKeywords[0];
  if (kw && !/[\u4e00-\u9fff]/.test(kw)) return kw.replace(/["""'']/g, '').slice(0, 50);
  return extractEnglishProduct(analysis.productName);
}

/** 最近3年关键词，给 Serper 的 tbs 时效过滤 */
const RECENCY_WORDS = '2023 OR 2024 OR 2025';

// ─── 工具函数 ───────────────────────────────────────────────────

function parseRssItems(xml: string): Array<{title: string; link: string; description: string; pubDate?: string}> {
  const items: Array<{title: string; link: string; description: string; pubDate?: string}> = [];
  const rawItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);

  for (const raw of rawItems) {
    const title = extractXmlText(raw, 'title');
    const link = extractXmlText(raw, 'link') || raw.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
    const desc = extractXmlText(raw, 'description');
    const pubDate = extractXmlText(raw, 'pubDate');
    if (title) items.push({ title, link, description: desc, pubDate });
  }
  return items;
}

function parseAtomEntries(xml: string): Array<{title: string; link: string; description: string}> {
  const entries: Array<{title: string; link: string; description: string}> = [];
  const rawEntries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]);

  for (const raw of rawEntries) {
    const title = extractXmlText(raw, 'title');
    const link = raw.match(/<link[^>]*href="([^"]+)"/)?.[1] || extractXmlText(raw, 'id');
    const desc = extractXmlText(raw, 'content') || extractXmlText(raw, 'summary');
    if (title && link) entries.push({ title, link: link.replace(/&amp;/g, '&'), description: desc });
  }
  return entries;
}

function extractXmlText(xml: string, tag: string): string {
  const raw = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function hasBuyerIntent(text: string): boolean {
  const keywords = [
    'supplier', 'sourcing', 'distributor', 'importer', 'wholesale', 'manufacturer',
    'looking for', 'need supplier', 'where to buy', 'bulk order', 'procurement',
    'supply chain', 'vendor', 'trade', 'import', 'buyer', 'purchase',
    '供应商', '进口商', '经销商', '采购'
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

// ─── 1. Google News RSS ─────────────────────────────────────────

export async function searchGoogleNews(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const results: BuyerCompany[] = [];
  const queries = [
    `${analysis.productName} importer distributor`,
    `${analysis.productName} wholesale buyer sourcing`,
    `${analysis.searchKeywords[0]?.englishKeywords[0] || analysis.productName} supplier`,
  ];

  for (const q of queries.slice(0, 2)) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=US&ceid=US:en`;
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const xml = await r.text();
      const items = parseRssItems(xml);

      for (const item of items.slice(0, 5)) {
        if (!item.title || item.title === 'Google News') continue;
        // 从新闻标题提取公司名
        const companyMatch = item.title.match(/^([A-Z][A-Za-z\s&.,]+(?:Inc|Corp|Ltd|LLC|Co|GmbH|AG|SA|BV)\.?)/);
        const companyName = companyMatch?.[1]?.trim() || item.title.slice(0, 60);

        results.push({
          name: `[新闻] ${companyName}`,
          website: item.link,
          description: item.description?.slice(0, 200) || item.title,
          country: guessCountryFromText(item.title + ' ' + item.description),
          source: 'serper', // reuse serper badge for news
          industry: '行业新闻',
          matchReason: `Google新闻 | ${item.pubDate?.slice(0,16) || '最新'}`,
        });
      }
    } catch (_) {}
  }
  return results;
}

// ─── 2. PRNewswire RSS ──────────────────────────────────────────

export async function searchPRNewswire(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const results: BuyerCompany[] = [];
  try {
    // PRNewswire 搜索RSS（按关键词）
    const searchUrl = `https://www.prnewswire.com/rss/news-releases-list.rss`;
    const r = await fetch(searchUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return results;
    const xml = await r.text();
    const items = parseRssItems(xml);

    const productTerms = [
      analysis.productName.toLowerCase(),
      ...analysis.searchKeywords[0]?.englishKeywords.map(k => k.toLowerCase()) || []
    ];

    for (const item of items) {
      const text = (item.title + ' ' + item.description).toLowerCase();
      const isRelevant = productTerms.some(term => text.includes(term.split(' ')[0]));
      if (!isRelevant) continue;

      results.push({
        name: `[PR] ${item.title.slice(0, 70)}`,
        website: item.link,
        description: item.description?.slice(0, 200),
        country: guessCountryFromText(item.title + item.description),
        source: 'serper',
        industry: '企业新闻稿',
        matchReason: `PRNewswire企业新闻 | ${item.pubDate?.slice(0,16) || ''}`,
      });
    }
  } catch (_) {}
  return results.slice(0, 5);
}

// ─── 3. Reddit RSS (多子版块) ────────────────────────────────────

export async function searchRedditRSS(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const results: BuyerCompany[] = [];
  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) return [];

  const eng     = getBestEngKeyword(analysis);
  const country = analysis.targetCountries[0] || '';

  // 模糊搜索（不加引号）+ 购买意图词 + 时效
  const queries = [
    `site:reddit.com ${eng} supplier China ${country} ${RECENCY_WORDS}`,
    `site:reddit.com looking for ${eng} supplier OR manufacturer`,
    `site:reddit.com ${eng} wholesale import ${country}`,
    `site:reddit.com where to buy ${eng} bulk OR wholesale`,
  ];

  for (const q of queries) {
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST', headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, num: 6, tbs: 'qdr:y3' }), // 最近3年
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      for (const item of (d.organic || []).slice(0, 3)) {
        if (!item.link?.includes('reddit.com')) continue;
        const sub = item.link.match(/reddit\.com\/r\/([^/]+)/)?.[1] || 'reddit';
        // 过滤明显无关帖子（如 AMA、meme、news 子版块）
        if (['memes','funny','news','politics','gaming','movies'].includes(sub.toLowerCase())) continue;
        results.push({
          name: `[Reddit] ${cleanTitle(item.title)}`,
          website: item.link,
          description: item.snippet,
          country: country || guessCountryFromText(item.snippet || ''),
          source: 'reddit',
          industry: `r/${sub}`,
          matchReason: `Reddit采购意向帖 | r/${sub} | ${RECENCY_WORDS}`,
        });
      }
    } catch (_) {}
  }

  return results;
}

// ─── 4. Hacker News RSS ─────────────────────────────────────────

export async function searchHackerNews(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const results: BuyerCompany[] = [];
  const queries = [
    `${analysis.searchKeywords[0]?.englishKeywords[0] || analysis.productName} supplier`,
    `${analysis.productName} sourcing`,
    'Ask HN: supplier manufacturer',
  ];

  for (const q of queries.slice(0, 2)) {
    try {
      const r = await fetch(`https://hnrss.org/newest?q=${encodeURIComponent(q)}&count=5`, {
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) continue;
      const xml = await r.text();
      const items = parseRssItems(xml);

      for (const item of items) {
        if (!hasBuyerIntent(item.title + ' ' + item.description)) continue;
        results.push({
          name: `[HN] ${item.title.slice(0, 80)}`,
          website: item.link, description: item.description?.slice(0, 200),
          country: 'Unknown', source: 'social', industry: 'Hacker News',
          matchReason: 'Hacker News 科技圈采购/合作需求',
        });
      }
    } catch (_) {}
  }
  return results.slice(0, 5);
}

// ─── 5. Serper 社交媒体代理搜索 (X/LinkedIn/Facebook/Instagram/Alibaba) ──

export async function searchSocialViaSerper(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) return [];

  const results: BuyerCompany[] = [];
  const eng     = getBestEngKeyword(analysis);
  const country = analysis.targetCountries[0] || '';

  const platformQueries: Array<{platform: string; q: string; label: string}> = [
    // X/Twitter — 模糊 + 近3年
    { platform: 'x.com',
      q: `site:x.com ${eng} supplier OR sourcing ${country} ${RECENCY_WORDS}`,
      label: 'X(Twitter)采购需求' },
    // LinkedIn 个人买家（采购经理/买手）— /in/ 个人主页
    { platform: 'linkedin.com/in',
      q: `site:linkedin.com/in ${eng} buyer OR purchasing OR procurement ${country}`,
      label: 'LinkedIn采购人' },
    // LinkedIn 企业
    { platform: 'linkedin.com/company',
      q: `site:linkedin.com/company ${eng} importer OR distributor OR wholesaler ${country}`,
      label: 'LinkedIn企业' },
    // Facebook — 近3年
    { platform: 'facebook.com',
      q: `site:facebook.com ${eng} wholesale import ${country} ${RECENCY_WORDS}`,
      label: 'Facebook商业' },
    // Alibaba 买家询盘
    { platform: 'alibaba.com',
      q: `site:alibaba.com/trade ${eng} buy leads ${country}`,
      label: 'Alibaba买家询盘' },
    // 行业论坛/社区
    { platform: 'forum',
      q: `${eng} supplier China ${country} forum OR community 2023 OR 2024 OR 2025`,
      label: '行业论坛' },
  ];

  for (const { platform, q, label } of platformQueries) {
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST', headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, num: 5 }), signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) continue;
      const d = await r.json();
      for (const item of (d.organic || []).slice(0, 3)) {
        if (!item.link) continue;
        results.push({
          name: `[${label}] ${cleanTitle(item.title)}`,
          website: item.link, description: item.snippet?.slice(0, 200),
          country: guessCountryFromText(item.snippet || ''),
          source: 'social', industry: label,
          matchReason: `${label} | 通过Serper索引`,
        });
      }
    } catch (_) {}
  }

  return results;
}

// ─── 6. 展会 RSS 搜索 ────────────────────────────────────────────

export async function searchTradeShows(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const SERPER_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_KEY) return [];

  const results: BuyerCompany[] = [];
  const product = analysis.productName;
  const countries = analysis.targetCountries.slice(0, 4).join(' OR ');

  // Google News RSS - 展会新闻
  try {
    const q = `${product} trade show OR exhibition OR expo 2024 OR 2025 buyers exhibitors`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=US&ceid=US:en`;
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const xml = await r.text();
      const items = parseRssItems(xml);
      for (const item of items.slice(0, 4)) {
        if (!item.title || item.title === 'Google News') continue;
        results.push({
          name: `[展会] ${item.title.slice(0, 70)}`,
          website: item.link, description: item.description?.slice(0, 200),
          country: guessCountryFromText(item.title + item.description),
          source: 'serper', industry: '展会信息',
          matchReason: `行业展会新闻 | Google News`,
        });
      }
    }
  } catch (_) {}

  // Serper 搜索展会参展商名录
  try {
    const q = `${product} exhibition exhibitors list 2024 2025 ${countries} importer distributor`;
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST', headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, num: 5 }), signal: AbortSignal.timeout(8000)
    });
    if (r.ok) {
      const d = await r.json();
      for (const item of (d.organic || []).slice(0, 3)) {
        results.push({
          name: `[展会名录] ${cleanTitle(item.title)}`,
          website: item.link, description: item.snippet?.slice(0, 200),
          country: guessCountryFromText(item.snippet || ''), source: 'serper', industry: '展会参展商',
          matchReason: `展会参展商名录 | Serper`,
        });
      }
    }
  } catch (_) {}

  return results;
}

// ─── 7. 海关/贸易数据 RSS ────────────────────────────────────────

export async function searchTradeData(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const SERPER_KEY = process.env.SERPER_API_KEY;
  const results: BuyerCompany[] = [];
  const product = analysis.productName;

  // ImportYeti via Serper (美国进口记录)
  if (SERPER_KEY) {
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST', headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `site:importyeti.com ${product} importer`, num: 5 }), signal: AbortSignal.timeout(8000)
      });
      if (r.ok) {
        const d = await r.json();
        for (const item of (d.organic || []).slice(0, 4)) {
          if (!item.link?.includes('importyeti')) continue;
          results.push({
            name: `[进口记录] ${cleanTitle(item.title)}`,
            website: item.link, description: item.snippet,
            country: 'USA', source: 'serper', industry: '美国海关进口记录',
            matchReason: `ImportYeti美国进口数据 | 真实进口记录`,
          });
        }
      }
    } catch (_) {}
  }

  // WTO/政府贸易新闻
  try {
    const r = await fetch('https://www.wto.org/english/news_e/news_e.rss', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const xml = await r.text();
      const items = parseRssItems(xml).slice(0, 3);
      for (const item of items) {
        if (!item.title) continue;
        results.push({
          name: `[WTO] ${item.title.slice(0, 70)}`,
          website: item.link, description: item.description?.slice(0, 200),
          country: 'Global', source: 'serper', industry: 'WTO贸易政策',
          matchReason: 'WTO官方新闻 | 贸易政策参考',
        });
      }
    }
  } catch (_) {}

  // Panjiva/Tradesparq via Serper
  if (SERPER_KEY) {
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST', headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `site:tradesparq.com OR site:panjiva.com ${product} importer buyer`, num: 4 }),
        signal: AbortSignal.timeout(8000)
      });
      if (r.ok) {
        const d = await r.json();
        for (const item of (d.organic || []).slice(0, 3)) {
          results.push({
            name: `[贸易数据] ${cleanTitle(item.title)}`,
            website: item.link, description: item.snippet,
            country: guessCountryFromText(item.snippet || ''), source: 'serper', industry: '海关贸易记录',
            matchReason: `供应链贸易数据 | ${item.link?.includes('panjiva') ? 'Panjiva' : 'Tradesparq'}`,
          });
        }
      }
    } catch (_) {}
  }

  return results;
}

// ─── 8. 公司注册数据 ─────────────────────────────────────────────

export async function searchCompanyRegistries(analysis: ProductAnalysis): Promise<BuyerCompany[]> {
  const results: BuyerCompany[] = [];
  const product = analysis.productName;

  // SEC EDGAR 全文搜索（美国上市公司）
  try {
    const r = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(product)}%22+%22import%22&forms=10-K,8-K&dateRange=custom&startdt=2023-01-01&hits.hits._source=entity_name,file_date,period_of_report,file_num`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (r.ok) {
      const d = await r.json();
      const hits = d.hits?.hits?.slice(0, 5) || [];
      for (const hit of hits) {
        const name = hit._source?.entity_name;
        if (!name || name === 'undefined') continue;
        results.push({
          name: `[SEC上市] ${name}`,
          website: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(name)}&CIK=&type=&dateb=&owner=include&count=10&search_text=`,
          country: 'USA', source: 'gleif', industry: '美国上市公司',
          description: `SEC上市公司，在${hit._source?.file_date}提交的文件中提及"${product}"进口业务`,
          matchReason: `SEC EDGAR | 文件日期: ${hit._source?.file_date?.slice(0,10)}`,
        });
      }
    }
  } catch (_) {}

  // OpenCorporates（部分免费）
  try {
    const engKeyword = analysis.searchKeywords[0]?.englishKeywords[0] || product;
    const r = await fetch(
      `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(engKeyword + ' import')}&per_page=5`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (r.ok) {
      const d = await r.json();
      for (const item of (d.results?.companies || []).slice(0, 4)) {
        const co = item.company;
        if (!co?.name) continue;
        results.push({
          name: co.name,
          website: co.opencorporates_url,
          country: co.jurisdiction_code?.split('_')[0]?.toUpperCase() || 'Unknown',
          city: co.registered_address?.locality,
          source: 'gleif', industry: '工商注册信息',
          description: `工商注册: ${co.company_type || ''}，状态: ${co.current_status || ''}`,
          matchReason: `OpenCorporates工商注册数据 | ${co.jurisdiction_code}`,
        });
      }
    }
  } catch (_) {}

  return results;
}

// ─── 统一入口：运行所有 RSS/社交来源 ────────────────────────────

export async function runRSSMultiSearch(
  analysis: ProductAnalysis,
  onProgress: (msg: string, count: number) => void
): Promise<BuyerCompany[]> {
  const allResults: BuyerCompany[] = [];

  // 并发执行所有 RSS 源
  const tasks = [
    { name: '🔴 Reddit', fn: () => searchRedditRSS(analysis) },
    { name: '📰 Google News', fn: () => searchGoogleNews(analysis) },
    { name: '📢 PRNewswire', fn: () => searchPRNewswire(analysis) },
    { name: '💬 HN/社交平台', fn: () => searchHackerNews(analysis) },
    { name: '🌐 X/LinkedIn/Facebook/Alibaba', fn: () => searchSocialViaSerper(analysis) },
    { name: '🏛️ 展会信息', fn: () => searchTradeShows(analysis) },
    { name: '🛳️ 海关/贸易数据', fn: () => searchTradeData(analysis) },
    { name: '🏢 公司注册数据', fn: () => searchCompanyRegistries(analysis) },
  ];

  const settled = await Promise.allSettled(tasks.map(t => t.fn()));

  settled.forEach((result, i) => {
    const items = result.status === 'fulfilled' ? result.value : [];
    allResults.push(...items);
    onProgress(`${tasks[i].name}: ${items.length} 条`, items.length);
  });

  // 去重
  const seen = new Set<string>();
  return allResults.filter(c => {
    const key = (c.website || c.name).toLowerCase().replace(/https?:\/\//,'').replace(/\/$/,'');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── 工具 ────────────────────────────────────────────────────────

function cleanTitle(title: string): string {
  return title.replace(/\s*[-|–—|]\s*.*$/, '').replace(/\s*::\s*.*$/, '').trim().slice(0, 80);
}

function guessCountryFromText(text: string): string {
  const lower = text.toLowerCase();
  const map: Record<string, string> = {
    'united states': 'USA', ' usa ': 'USA', 'american': 'USA', 'u.s.': 'USA',
    'germany': 'Germany', 'deutschland': 'Germany', 'german': 'Germany',
    'japan': 'Japan', 'japanese': 'Japan',
    'united kingdom': 'UK', ' uk ': 'UK', 'british': 'UK', 'england': 'UK',
    'france': 'France', 'french': 'France',
    'china': 'China', 'chinese': 'China',
    'india': 'India', 'indian': 'India',
    'brazil': 'Brazil', 'brazilian': 'Brazil',
    'uae': 'UAE', 'dubai': 'UAE', 'emirates': 'UAE',
    'australia': 'Australia', 'australian': 'Australia',
    'canada': 'Canada', 'canadian': 'Canada',
    'mexico': 'Mexico', 'mexican': 'Mexico',
    'south korea': 'South Korea', 'korean': 'South Korea',
    'singapore': 'Singapore', 'thai': 'Thailand', 'vietnam': 'Vietnam',
  };
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return 'Unknown';
}
