#!/usr/bin/env node

/**
 * 测试免费数据源（无需 API Key）
 */

const results = {
  passed: [],
  failed: [],
  warnings: []
};

async function testSource(name, testFn) {
  try {
    console.log(`\n🧪 测试: ${name}...`);
    const result = await testFn();
    
    if (result.success) {
      console.log(`  ✅ 成功 - ${result.message}`);
      results.passed.push({ name, ...result });
    } else {
      console.log(`  ⚠️  警告 - ${result.message}`);
      results.warnings.push({ name, ...result });
    }
  } catch (error) {
    console.log(`  ❌ 失败 - ${error.message}`);
    results.failed.push({ name, error: error.message });
  }
}

// 1. Nominatim (OpenStreetMap 地理编码)
async function testNominatim() {
  const response = await fetch(
    'https://nominatim.openstreetmap.org/search?q=distributor&format=json&limit=5',
    { headers: { 'User-Agent': 'GlobalMatchApp/1.0' } }
  );
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    return { success: false, message: '返回空结果' };
  }
  
  return { 
    success: true, 
    message: `获取 ${data.length} 个地理位置结果`,
    sampleData: data[0]
  };
}

// 2. OpenStreetMap (Overpass API)
async function testOpenStreetMap() {
  const query = `
    [bbox:40.7128,-74.0060,40.7580,-73.9855];
    (
      node["shop"="wholesale"];
      way["shop"="wholesale"];
    );
    out geom;
  `;
  
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  return { 
    success: true, 
    message: `获取 OSM 数据成功`,
    dataSize: JSON.stringify(data).length
  };
}

// 3. Wikidata
async function testWikidata() {
  const response = await fetch(
    'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=distributor&language=en&format=json'
  );
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (!data.search || data.search.length === 0) {
    return { success: false, message: '返回空结果' };
  }
  
  return { 
    success: true, 
    message: `获取 ${data.search.length} 个 Wikidata 实体`,
    sampleData: data.search[0]
  };
}

// 4. GLEIF (全球法人实体标识符)
async function testGLEIF() {
  const response = await fetch('https://www.gleif.org/api/v1/lei?page[size]=10');
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (!data.data || data.data.length === 0) {
    return { success: false, message: '返回空结果' };
  }
  
  return { 
    success: true, 
    message: `获取 ${data.data.length} 个 GLEIF 记录`,
    sampleData: data.data[0]
  };
}

// 5. Common Crawl Index
async function testCommonCrawl() {
  const response = await fetch(
    'https://index.commoncrawl.org/CC-MAIN-2024-01-index?url=*.distributor.com&output=json&matchType=domain&limit=10'
  );
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const text = await response.text();
  const lines = text.trim().split('\n').filter(l => l.length > 0);
  
  if (lines.length === 0) {
    return { success: false, message: '返回空结果' };
  }
  
  return { 
    success: true, 
    message: `获取 ${lines.length} 个 Common Crawl 索引记录`,
    recordCount: lines.length
  };
}

// 6. World Bank
async function testWorldBank() {
  const response = await fetch(
    'https://api.worldbank.org/v2/country?format=json&per_page=10'
  );
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (!data[1] || data[1].length === 0) {
    return { success: false, message: '返回空结果' };
  }
  
  return { 
    success: true, 
    message: `获取 ${data[1].length} 个国家经济数据`,
    sampleData: data[1][0]
  };
}

// 7. IMF
async function testIMF() {
  const response = await fetch(
    'https://www.imf.org/external/datamapper/api/v1/countries'
  );
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (!data.countries || Object.keys(data.countries).length === 0) {
    return { success: false, message: '返回空结果' };
  }
  
  return { 
    success: true, 
    message: `获取 ${Object.keys(data.countries).length} 个国家 IMF 数据`,
    countryCount: Object.keys(data.countries).length
  };
}

// 8. EU VIES (VAT 验证)
async function testEUVIES() {
  // VIES 需要 SOAP 请求，这里只测试可访问性
  const response = await fetch('http://ec.europa.eu/taxation_customs/vies/', {
    method: 'GET'
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  return { 
    success: true, 
    message: 'VIES 网站可访问（需要 SOAP 请求获取数据）'
  };
}

// 9. UN Comtrade
async function testComtrade() {
  const response = await fetch(
    'https://comtradeplus.un.org/api/v1/get?reporterCode=840&cmdCode=ALL&flowCode=M&period=2023&format=json'
  );
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (!data.data || data.data.length === 0) {
    return { success: false, message: '返回空结果' };
  }
  
  return { 
    success: true, 
    message: `获取 ${data.data.length} 条贸易统计数据`,
    recordCount: data.data.length
  };
}

// 10. Trade Map
async function testTradeMap() {
  const response = await fetch('https://www.trademap.org/');
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  return { 
    success: true, 
    message: 'Trade Map 网站可访问（需要网页爬虫获取数据）'
  };
}

// 运行所有测试
async function runAllTests() {
  console.log('🧪 开始测试免费数据源...\n');
  console.log('=' .repeat(50));
  
  await testSource('Nominatim', testNominatim);
  await testSource('OpenStreetMap', testOpenStreetMap);
  await testSource('Wikidata', testWikidata);
  await testSource('GLEIF', testGLEIF);
  await testSource('Common Crawl Index', testCommonCrawl);
  await testSource('World Bank', testWorldBank);
  await testSource('IMF', testIMF);
  await testSource('EU VIES', testEUVIES);
  await testSource('UN Comtrade', testComtrade);
  await testSource('Trade Map', testTradeMap);
  
  // 生成报告
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 测试报告\n');
  
  console.log(`✅ 成功: ${results.passed.length}`);
  results.passed.forEach(r => {
    console.log(`  - ${r.name}: ${r.message}`);
  });
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  警告: ${results.warnings.length}`);
    results.warnings.forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ 失败: ${results.failed.length}`);
    results.failed.forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log(`\n📈 总体: ${results.passed.length + results.warnings.length}/${results.passed.length + results.warnings.length + results.failed.length} 可访问`);
}

runAllTests().catch(console.error);
