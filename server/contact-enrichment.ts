/**
 * 联系方式富化引擎
 *
 * 三路并发（每家公司）：
 *  1. 官网爬取         → /contact /about /team 页面正则提取
 *  2. Google Places   → 用公司名查 Places API，补全电话/官网/地址
 *  3. Serper 定向搜   → 1次配额搜邮箱/WhatsApp/LinkedIn/Facebook
 *
 * 规则：只保留页面/API 中原文出现的数据，不推测、不构造
 */

import { BuyerCompany } from './buyer-search-v2';

// ─── 类型 ─────────────────────────────────────────────────────────

export interface ContactInfo {
  email?: string;
  phone?: string;
  whatsapp?: string;
  linkedinCompany?: string;   // linkedin.com/company/xxx
  linkedinPerson?: string;    // linkedin.com/in/xxx
  facebook?: string;
  contactPerson?: string;
  contactTitle?: string;
  aiVerified?: boolean;
}

// ─── 正则提取器 ───────────────────────────────────────────────────

function extractContacts(text: string): ContactInfo {
  const info: ContactInfo = {};

  // 邮箱（过滤示例邮箱）
  const emailMatch = text.match(/\b([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[a-z]{2,7})\b/);
  if (emailMatch) {
    const e = emailMatch[1].toLowerCase();
    const invalid = [
      'example', 'test@', 'your@', 'user@', 'email@', 'name@',
      'domain.com', 'yourdomain', 'sample@', 'eg.sample', 'noreply',
      'no-reply', 'donotreply', 'info@example', 'admin@example',
      'support@example', 'placeholder', 'dummy', 'fake@',
    ];
    if (!invalid.some(x => e.includes(x))) info.email = emailMatch[1];
  }

  // 电话（必须有国家区号 +XX）
  const phoneMatch = text.match(/\+[1-9][\d\s\-().]{5,18}\d/);
  if (phoneMatch) info.phone = phoneMatch[0].replace(/\s+/g, ' ').trim();

  // WhatsApp（只认 wa.me 或 whatsapp.com 链接中的号码）
  const waMatch = text.match(/wa\.me\/([+\d]{7,15})|whatsapp\.com\/send\?phone=([+\d]{7,15})/i);
  if (waMatch) {
    const raw = (waMatch[1] || waMatch[2]).replace(/\D/g, '');
    info.whatsapp = raw.startsWith('00') ? '+' + raw.slice(2) : raw.startsWith('+') ? raw : '+' + raw;
  }

  // LinkedIn 公司主页
  const liCo = text.match(/linkedin\.com\/company\/([A-Za-z0-9\-_.%]+)/i);
  if (liCo) info.linkedinCompany = `https://www.linkedin.com/company/${liCo[1]}`;

  // LinkedIn 个人主页
  const liIn = text.match(/linkedin\.com\/in\/([A-Za-z0-9\-_.%]+)/i);
  if (liIn) info.linkedinPerson = `https://www.linkedin.com/in/${liIn[1]}`;

  // Facebook（过滤功能性页面）
  const fbSkip = ['sharer', 'share', 'dialog', 'plugins', 'watch', 'events', 'groups', 'login', 'l.php'];
  const fbMatch = text.match(/facebook\.com\/([A-Za-z0-9._\-]{3,80})/i);
  if (fbMatch && !fbSkip.some(s => fbMatch[1].toLowerCase().startsWith(s))) {
    info.facebook = `https://www.facebook.com/${fbMatch[1]}`;
  }

  return info;
}

// ─── 1. 官网爬取（Tavily Extract 优先，fallback 原生 fetch） ──────

async function scrapeWebsite(website: string): Promise<ContactInfo> {
  let base: string;
  try { base = new URL(website).origin; } catch { return {}; }

  // ── 优先用 Tavily Extract（绕过反爬，内容更干净） ──────────────
  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  if (TAVILY_KEY) {
    try {
      // 每家公司只抓主页 1 个 URL，节省 Tavily credits
      const r = await fetch('https://api.tavily.com/extract', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ api_key: TAVILY_KEY, urls: [base] }),
        signal:  AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const d = await r.json() as any;
        for (const item of d.results || []) {
          const text = (item.raw_content || '').slice(0, 5000);
          const info = extractContacts(text);
          const hasValue = info.email || info.phone || info.whatsapp || info.linkedinCompany;
          if (hasValue) return info;
        }
      }
    } catch (_) {}
  }

  // ── Fallback：原生 fetch 爬取 ──────────────────────────────────
  const paths = ['', '/contact', '/contact-us', '/about', '/about-us', '/team', '/en/contact'];
  for (const path of paths) {
    try {
      const r = await fetch(base + path, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const html = await r.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ');

      const info = extractContacts(text);
      const hasValue = info.email || info.phone || info.whatsapp || info.linkedinCompany || info.linkedinPerson || info.facebook;
      if (hasValue) return info;
    } catch (_) {}
  }
  return {};
}

// ─── 2. Google Places — 用公司名查官网/电话/地址 ──────────────────

async function googlePlacesEnrich(company: BuyerCompany): Promise<ContactInfo> {
  const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!GOOGLE_KEY) return {};

  // 查询：公司名 + 国家（更精准定位）
  const query = `${company.name} ${company.country || ''} ${company.city || ''}`.trim();

  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': [
          'places.displayName',
          'places.formattedAddress',
          'places.websiteUri',
          'places.internationalPhoneNumber',
          'places.location',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1,
        languageCode: 'en',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return {};
    const d = await r.json();
    const place = (d.places || [])[0];
    if (!place) return {};

    const info: ContactInfo = {};

    // 电话（Places 直接给 E.164 格式，含国家码）
    if (place.internationalPhoneNumber) {
      info.phone = place.internationalPhoneNumber;
    }

    // 官网：如果公司本来没有，从 Places 补上
    if (place.websiteUri && !company.website) {
      // 把官网写回公司对象
      (company as any)._placesWebsite = place.websiteUri;
    }

    // 地址（补全）
    if (place.formattedAddress && !company.address) {
      (company as any)._placesAddress = place.formattedAddress;
    }

    return info;
  } catch (_) { return {}; }
}

// ─── 3. Serper 定向搜索（每家公司仅用 1 次配额） ─────────────────

async function serperContactSearch(company: BuyerCompany, serperKey: string): Promise<ContactInfo> {
  const q = `"${company.name}" ${company.country || ''} email OR phone OR WhatsApp OR linkedin OR facebook contact`;
  try {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, num: 6 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return {};
    const d = await r.json();

    const liCompanyUrl = (d.organic || []).find((i: any) => i.link?.includes('linkedin.com/company'))?.link;
    const liPersonUrl  = (d.organic || []).find((i: any) => i.link?.includes('linkedin.com/in'))?.link;
    const fbUrl        = (d.organic || []).find((i: any) => i.link?.includes('facebook.com'))?.link;

    let text = '';
    for (const item of (d.organic || [])) {
      text += ` ${item.title || ''} ${item.snippet || ''} ${item.link || ''}`;
    }

    const info = extractContacts(text);
    if (liCompanyUrl) info.linkedinCompany = liCompanyUrl;
    if (liPersonUrl)  info.linkedinPerson  = liPersonUrl;
    if (fbUrl && !info.facebook) {
      const skipFb = ['sharer', 'share', 'dialog', 'plugins', 'watch', 'events', 'groups', 'login'];
      if (!skipFb.some(s => fbUrl.toLowerCase().includes(s))) info.facebook = fbUrl;
    }

    // 从 LinkedIn 个人页 snippet 提取联系人姓名/职位
    const liPersonSnippet = (d.organic || []).find((i: any) => i.link?.includes('linkedin.com/in'))?.snippet || '';
    if (liPersonSnippet) {
      const nameMatch  = liPersonSnippet.match(/^([A-Z][a-z]+\s[A-Z][a-z]+)/);
      const titleMatch = liPersonSnippet.match(/(Purchas\w+|Procurement|Import|Sourcing|Buying)[^.,]*/i);
      if (nameMatch)  info.contactPerson = nameMatch[1];
      if (titleMatch) info.contactTitle  = titleMatch[0].trim().slice(0, 60);
    }

    return info;
  } catch (_) { return {}; }
}

// ─── 合并（非AI来源优先） ─────────────────────────────────────────

function mergeContacts(...sources: ContactInfo[]): ContactInfo {
  const merged: ContactInfo = {};
  for (const src of sources) {
    if (!merged.email           && src.email)           merged.email           = src.email;
    if (!merged.phone           && src.phone)           merged.phone           = src.phone;
    if (!merged.whatsapp        && src.whatsapp)        merged.whatsapp        = src.whatsapp;
    if (!merged.linkedinCompany && src.linkedinCompany) merged.linkedinCompany = src.linkedinCompany;
    if (!merged.linkedinPerson  && src.linkedinPerson)  merged.linkedinPerson  = src.linkedinPerson;
    if (!merged.facebook        && src.facebook)        merged.facebook        = src.facebook;
    if (!merged.contactPerson   && src.contactPerson)   merged.contactPerson   = src.contactPerson;
    if (!merged.contactTitle    && src.contactTitle)    merged.contactTitle    = src.contactTitle;
  }
  return merged;
}

// ─── 主入口 ───────────────────────────────────────────────────────

export async function enrichContacts(
  companies: BuyerCompany[],
  onProgress: (msg: string, done: number, total: number) => void,
): Promise<BuyerCompany[]> {
  const SERPER_KEY  = process.env.SERPER_API_KEY;
  const total       = companies.length;
  let   serperUsed  = 0;
  const serperBudget = total;   // 10家→10次，100家→100次

  const results = companies.map(c => ({ ...c }));
  let done = 0;

  const BATCH = 5;

  for (let i = 0; i < total; i += BATCH) {
    const batch = results.slice(i, i + BATCH);

    await Promise.allSettled(batch.map(async (company, bi) => {
      const idx = i + bi;
      let info: ContactInfo = {};

      // ① 官网爬取（Tavily Extract 限 1 URL/公司；fallback 原生 fetch）
      // 只有尚无联系方式时才爬，避免浪费 API 额度
      if (company.website && !company.email && !company.phone) {
        const scraped = await scrapeWebsite(company.website);
        info = mergeContacts(info, scraped);
      }

      // ② Google Places 补全官网/电话/地址（无需 website 也能查）
      const placesInfo = await googlePlacesEnrich(company);
      info = mergeContacts(info, placesInfo);

      // 如果 Places 找到了官网，补上后再爬一次拿联系方式
      const placesWebsite = (company as any)._placesWebsite;
      if (placesWebsite && !company.website && !info.email) {
        company.website = placesWebsite;
        const scraped2 = await scrapeWebsite(placesWebsite);
        info = mergeContacts(info, scraped2);
      }
      if ((company as any)._placesAddress && !company.address) {
        company.address = (company as any)._placesAddress;
      }

      // ③ Serper 定向搜（每家 1 次配额，补 email/WhatsApp/LinkedIn/Facebook）
      if (SERPER_KEY && serperUsed < serperBudget) {
        serperUsed++;
        const serperInfo = await serperContactSearch(company, SERPER_KEY);
        info = mergeContacts(info, serperInfo);
      }

      // 写回结果
      const c = results[idx];
      if (info.email)           c.email                      = info.email;
      if (info.phone)           c.phone                      = info.phone;
      if (info.whatsapp)        (c as any).whatsapp          = info.whatsapp;
      if (info.linkedinCompany) (c as any).linkedinCompany   = info.linkedinCompany;
      if (info.linkedinPerson)  c.linkedinUrl                = info.linkedinPerson;
      if (info.facebook)        (c as any).facebook          = info.facebook;
      if (info.contactPerson)   c.contactPerson              = info.contactPerson;
      if (info.contactTitle)    (c as any).contactTitle      = info.contactTitle;
      // Places 补充的官网/地址
      if (placesWebsite && !c.website) c.website = placesWebsite;

      done++;
    }));

    onProgress(`联系方式富化 ${Math.min(i + BATCH, total)} / ${total}`, done, total);
  }

  return results;
}
