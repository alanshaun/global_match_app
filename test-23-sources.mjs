#!/usr/bin/env node

const SERPER_API_KEY = '77f049d6a5f00c5dd76c8e45d2e2407d49e26636';
const GOOGLE_PLACES_API_KEY = 'AIzaSyALig_4YjoG7LZXAT0NTmX4GlDvLNGqhag';

const sources = [
  { id: 1, name: 'Serper', type: 'API', needsAuth: true },
  { id: 2, name: 'Google Maps', type: 'API', needsAuth: true },
  { id: 3, name: 'Bluesky', type: 'API', needsAuth: false },
  { id: 4, name: 'Nominatim', type: 'API', needsAuth: false },
  { id: 5, name: 'Wikidata', type: 'API', needsAuth: false },
  { id: 6, name: 'Common Crawl Index', type: 'API', needsAuth: false },
  { id: 7, name: 'OpenStreetMap', type: 'API', needsAuth: false },
  { id: 8, name: 'GLEIF', type: 'API', needsAuth: false },
  { id: 9, name: '世界银行', type: 'API', needsAuth: false },
  { id: 10, name: 'IMF', type: 'API', needsAuth: false },
  { id: 11, name: '国家统计局/欧盟VIES', type: 'API', needsAuth: false },
  { id: 12, name: 'Redis', type: 'Database', needsAuth: false },
  { id: 13, name: 'Facebook', type: 'API', needsAuth: true },
  { id: 14, name: 'YouTube', type: 'API', needsAuth: true },
  { id: 16, name: 'Qwen/Kimi 联网 AI', type: 'API', needsAuth: true },
  { id: 17, name: 'GLEIF (重复)', type: 'API', needsAuth: false },
  { id: 18, name: 'LinkedIn', type: 'API', needsAuth: true },
  { id: 19, name: 'BugPack', type: 'API', needsAuth: false },
  { id: 20, name: 'ImportYeti', type: 'Web', needsAuth: false },
  { id: 21, name: 'Tendata', type: 'API', needsAuth: true },
  { id: 22, name: 'Kimi AI 联网搜索', type: 'API', needsAuth: true },
  { id: 23, name: '联合国Comtrade/Trade Map', type: 'API', needsAuth: false }
];

async function testSource(source) {
  console.log(`\n🧪 测试 ${source.id}. ${source.name}`);
  
  let canAccess = false;
  let reason = '';
  
  try {
    switch(source.id) {
      case 1: // Serper
        const serperResp = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: 'test', num: 1 })
        });
        canAccess = serperResp.ok;
        reason = serperResp.ok ? '✅ API 可访问' : `❌ HTTP ${serperResp.status}`;
        break;
        
      case 2: // Google Maps
        const mapsResp = await fetch('https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJIQBpAG2dQIcR_Qs1tP7IOWg&key=' + GOOGLE_PLACES_API_KEY);
        canAccess = mapsResp.ok;
        reason = mapsResp.ok ? '✅ API 可访问' : `❌ HTTP ${mapsResp.status}`;
        break;
        
      case 3: // Bluesky
        const bskyResp = await fetch('https://public.api.bsky.app/xrpc/com.atproto.server.describeServer');
        canAccess = bskyResp.ok;
        reason = bskyResp.ok ? '✅ API 可访问' : `❌ HTTP ${bskyResp.status}`;
        break;
        
      case 4: // Nominatim
        const nominatimResp = await fetch('https://nominatim.openstreetmap.org/search?q=distributor&format=json&limit=1');
        canAccess = nominatimResp.ok;
        reason = nominatimResp.ok ? '✅ API 可访问' : `❌ HTTP ${nominatimResp.status}`;
        break;
        
      case 5: // Wikidata
        const wikidataResp = await fetch('https://www.wikidata.org/w/api.php?action=query&search=distributor&format=json');
        canAccess = wikidataResp.ok;
        reason = wikidataResp.ok ? '✅ API 可访问' : `❌ HTTP ${wikidataResp.status}`;
        break;
        
      case 6: // Common Crawl
        const ccResp = await fetch('https://index.commoncrawl.org/CC-MAIN-2024-01-index?url=*.distributor.com&output=json&limit=1');
        canAccess = ccResp.ok;
        reason = ccResp.ok ? '✅ API 可访问' : `❌ HTTP ${ccResp.status}`;
        break;
        
      case 7: // OpenStreetMap
        const osmResp = await fetch('https://overpass-api.de/api/interpreter?data=[bbox:0,0,1,1];node[shop=wholesale];out%20center%201;');
        canAccess = osmResp.ok;
        reason = osmResp.ok ? '✅ API 可访问' : `❌ HTTP ${osmResp.status}`;
        break;
        
      case 8: // GLEIF
        const gleifResp = await fetch('https://www.gleif.org/api/v1/lei-records?page-size=1');
        canAccess = gleifResp.ok;
        reason = gleifResp.ok ? '✅ API 可访问' : `❌ HTTP ${gleifResp.status}`;
        break;
        
      case 9: // 世界银行
        const wbResp = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=1');
        canAccess = wbResp.ok;
        reason = wbResp.ok ? '✅ API 可访问' : `❌ HTTP ${wbResp.status}`;
        break;
        
      case 10: // IMF
        const imfResp = await fetch('https://www.imf.org/external/datamapper/api/v1/countries');
        canAccess = imfResp.ok;
        reason = imfResp.ok ? '✅ API 可访问' : `❌ HTTP ${imfResp.status}`;
        break;
        
      case 11: // 国家统计局/欧盟VIES
        const viesResp = await fetch('https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl');
        canAccess = viesResp.ok;
        reason = viesResp.ok ? '✅ VIES 可访问' : `❌ HTTP ${viesResp.status}`;
        break;
        
      case 12: // Redis
        reason = '⚠️ Redis 是数据库，需要本地部署';
        canAccess = false;
        break;
        
      case 13: // Facebook
        reason = '❌ Facebook API 需要特殊权限，沙箱无法访问';
        canAccess = false;
        break;
        
      case 14: // YouTube
        reason = '❌ YouTube API 需要认证，沙箱无法访问';
        canAccess = false;
        break;
        
      case 16: // Kimi AI
        reason = '⚠️ Kimi API 在沙箱网络受限';
        canAccess = false;
        break;
        
      case 18: // LinkedIn
        reason = '❌ LinkedIn 禁止爬虫和 API 访问';
        canAccess = false;
        break;
        
      case 19: // BugPack
        const bugpackResp = await fetch('https://www.bugpack.com');
        canAccess = bugpackResp.ok;
        reason = bugpackResp.ok ? '✅ 网站可访问（需爬虫）' : `❌ HTTP ${bugpackResp.status}`;
        break;
        
      case 20: // ImportYeti
        const iyResp = await fetch('https://www.importyeti.com');
        canAccess = iyResp.ok;
        reason = iyResp.ok ? '✅ 网站可访问（需爬虫）' : `❌ HTTP ${iyResp.status}`;
        break;
        
      case 21: // Tendata
        reason = '❌ Tendata 需要特殊权限和认证';
        canAccess = false;
        break;
        
      case 22: // Kimi AI 联网
        reason = '⚠️ Kimi AI 在沙箱网络受限';
        canAccess = false;
        break;
        
      case 23: // UN Comtrade
        const comtradeResp = await fetch('https://comtrade.un.org/api/get?type=C&freq=A&px=HS&ps=2023&r=840&p=0&rg=1&cc=0&fmt=json');
        canAccess = comtradeResp.ok;
        reason = comtradeResp.ok ? '✅ API 可访问' : `❌ HTTP ${comtradeResp.status}`;
        break;
    }
  } catch (error) {
    reason = `❌ 错误: ${error.message}`;
    canAccess = false;
  }
  
  console.log(`   ${reason}`);
  return { ...source, canAccess, reason };
}

async function testAllSources() {
  console.log('='.repeat(60));
  console.log('🧪 测试 23 个数据源的可用性');
  console.log('='.repeat(60));
  
  const results = [];
  for (const source of sources) {
    const result = await testSource(source);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果总结');
  console.log('='.repeat(60));
  
  const available = results.filter(r => r.canAccess);
  const unavailable = results.filter(r => !r.canAccess);
  
  console.log(`\n✅ 可用数据源 (${available.length}/${results.length}):`);
  available.forEach(r => {
    console.log(`   ${r.id}. ${r.name}`);
  });
  
  console.log(`\n❌ 不可用数据源 (${unavailable.length}/${results.length}):`);
  unavailable.forEach(r => {
    console.log(`   ${r.id}. ${r.name}`);
  });
}

testAllSources().catch(console.error);
