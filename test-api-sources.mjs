#!/usr/bin/env node

/**
 * 测试需要 API Key 的数据源
 * 这个脚本会检查这些 API 是否需要认证以及认证方式
 */

const results = {
  needsApiKey: [],
  canTest: [],
  noKey: []
};

async function testSource(name, testFn, requiresKey = true) {
  try {
    console.log(`\n🧪 测试: ${name}...`);
    const result = await testFn();
    
    if (result.hasKey) {
      console.log(`  ✅ 有 API Key - 可以测试`);
      results.canTest.push({ name, ...result });
    } else if (result.needsKey) {
      console.log(`  🔑 需要 API Key - ${result.message}`);
      results.needsApiKey.push({ name, ...result });
    } else {
      console.log(`  ⚠️  ${result.message}`);
      results.noKey.push({ name, ...result });
    }
  } catch (error) {
    console.log(`  ❌ 错误 - ${error.message}`);
    results.needsApiKey.push({ name, error: error.message, needsKey: true });
  }
}

// 1. Serper
async function testSerper() {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return { needsKey: true, message: 'SERPER_API_KEY 环境变量未设置' };
  }
  
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: 'distributor' })
    });
    
    if (response.status === 401) {
      return { needsKey: true, message: 'API Key 无效' };
    }
    
    if (response.ok) {
      return { hasKey: true, message: 'API Key 有效' };
    }
    
    return { needsKey: true, message: `HTTP ${response.status}` };
  } catch (error) {
    return { needsKey: true, message: error.message };
  }
}

// 2. Google Maps
async function testGoogleMaps() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { needsKey: true, message: 'GOOGLE_MAPS_API_KEY 环境变量未设置' };
  }
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=distributor&key=${apiKey}`
    );
    
    if (response.status === 403) {
      return { needsKey: true, message: 'API Key 无效或无权限' };
    }
    
    if (response.ok) {
      return { hasKey: true, message: 'API Key 有效' };
    }
    
    return { needsKey: true, message: `HTTP ${response.status}` };
  } catch (error) {
    return { needsKey: true, message: error.message };
  }
}

// 3. Bluesky
async function testBluesky() {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_PASSWORD;
  
  if (!handle || !password) {
    return { needsKey: true, message: 'BLUESKY_HANDLE 或 BLUESKY_PASSWORD 未设置' };
  }
  
  try {
    const response = await fetch(
      'https://bsky.social/xrpc/com.atproto.server.createSession',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: handle, password })
      }
    );
    
    if (response.status === 401) {
      return { needsKey: true, message: '认证失败' };
    }
    
    if (response.ok) {
      return { hasKey: true, message: '认证成功' };
    }
    
    return { needsKey: true, message: `HTTP ${response.status}` };
  } catch (error) {
    return { needsKey: true, message: error.message };
  }
}

// 4. Facebook Graph API
async function testFacebook() {
  const apiKey = process.env.FACEBOOK_API_KEY;
  if (!apiKey) {
    return { needsKey: true, message: 'FACEBOOK_API_KEY 环境变量未设置' };
  }
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/search?q=distributor&type=page&access_token=${apiKey}`
    );
    
    if (response.status === 401 || response.status === 403) {
      return { needsKey: true, message: 'API Key 无效或过期' };
    }
    
    if (response.ok) {
      return { hasKey: true, message: 'API Key 有效' };
    }
    
    return { needsKey: true, message: `HTTP ${response.status}` };
  } catch (error) {
    return { needsKey: true, message: error.message };
  }
}

// 5. YouTube API
async function testYouTube() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { needsKey: true, message: 'YOUTUBE_API_KEY 环境变量未设置' };
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?q=distributor&type=channel&key=${apiKey}`
    );
    
    if (response.status === 401 || response.status === 403) {
      return { needsKey: true, message: 'API Key 无效或无权限' };
    }
    
    if (response.ok) {
      return { hasKey: true, message: 'API Key 有效' };
    }
    
    return { needsKey: true, message: `HTTP ${response.status}` };
  } catch (error) {
    return { needsKey: true, message: error.message };
  }
}

// 6. LinkedIn
async function testLinkedIn() {
  const apiKey = process.env.LINKEDIN_API_KEY;
  if (!apiKey) {
    return { needsKey: true, message: 'LINKEDIN_API_KEY 环境变量未设置' };
  }
  
  try {
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    
    if (response.status === 401) {
      return { needsKey: true, message: 'API Key 无效或过期' };
    }
    
    if (response.ok) {
      return { hasKey: true, message: 'API Key 有效' };
    }
    
    return { needsKey: true, message: `HTTP ${response.status}` };
  } catch (error) {
    return { needsKey: true, message: error.message };
  }
}

// 7. Kimi AI
async function testKimi() {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    return { needsKey: true, message: 'KIMI_API_KEY 环境变量未设置' };
  }
  
  try {
    const response = await fetch(
      'https://api.kimi.moonshot.cn/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0.3
        })
      }
    );
    
    if (response.status === 401) {
      return { needsKey: true, message: 'API Key 无效' };
    }
    
    if (response.ok) {
      return { hasKey: true, message: 'API Key 有效' };
    }
    
    return { needsKey: true, message: `HTTP ${response.status}` };
  } catch (error) {
    return { needsKey: true, message: error.message };
  }
}

// 其他 B2B 平台（需要特殊认证）
async function testB2BPlatforms() {
  const platforms = [
    { name: 'Alibaba', key: 'ALIBABA_API_KEY' },
    { name: 'Global Sources', key: 'GLOBAL_SOURCES_API_KEY' },
    { name: 'TradeKey', key: 'TRADEKEY_API_KEY' },
    { name: 'EC21', key: 'EC21_API_KEY' },
    { name: 'Made-in-China', key: 'MADE_IN_CHINA_API_KEY' },
    { name: 'BugPack', key: 'BUGPACK_API_KEY' },
    { name: 'ImportYeti', key: 'IMPORTYETI_API_KEY' },
    { name: 'Tendata', key: 'TENDATA_API_KEY' }
  ];
  
  for (const platform of platforms) {
    const hasKey = !!process.env[platform.key];
    console.log(`\n🧪 测试: ${platform.name}...`);
    
    if (hasKey) {
      console.log(`  🔑 已提供 ${platform.key}`);
      results.canTest.push({ name: platform.name, hasKey: true });
    } else {
      console.log(`  🔑 需要 ${platform.key}`);
      results.needsApiKey.push({ name: platform.name, needsKey: true });
    }
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🧪 开始测试需要 API Key 的数据源...\n');
  console.log('='.repeat(60));
  
  await testSource('Serper', testSerper);
  await testSource('Google Maps', testGoogleMaps);
  await testSource('Bluesky', testBluesky);
  await testSource('Facebook Graph API', testFacebook);
  await testSource('YouTube API', testYouTube);
  await testSource('LinkedIn', testLinkedIn);
  await testSource('Kimi AI', testKimi);
  
  // 测试 B2B 平台
  await testB2BPlatforms();
  
  // 生成报告
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 API Key 需求报告\n');
  
  console.log(`✅ 已有 API Key: ${results.canTest.length}`);
  results.canTest.forEach(r => {
    console.log(`  - ${r.name}`);
  });
  
  console.log(`\n🔑 需要 API Key: ${results.needsApiKey.length}`);
  results.needsApiKey.forEach(r => {
    console.log(`  - ${r.name}`);
  });
  
  if (results.noKey.length > 0) {
    console.log(`\n⚠️  其他: ${results.noKey.length}`);
    results.noKey.forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }
  
  console.log(`\n📈 总体: ${results.canTest.length} 个可测试，${results.needsApiKey.length} 个需要 API Key`);
}

runAllTests().catch(console.error);
