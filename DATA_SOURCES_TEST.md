# 买家搜索系统 - 真实数据源测试计划

## 📋 数据源清单（23 个）

### 第一类：搜索和地理信息
1. **Serper** - 搜索引擎 API
   - 用途：搜索公司和采购商信息
   - 需要 API Key：✅ 是
   - 预期数据：搜索结果、公司网站
   
2. **Google Maps** - 地理位置和商业信息
   - 用途：查找本地企业、地址、电话
   - 需要 API Key：✅ 是
   - 预期数据：企业位置、评分、联系方式

3. **Nominatim** - 开源地理编码
   - 用途：地址转坐标、反向地理编码
   - 需要 API Key：❌ 否（有使用限制）
   - 预期数据：地理坐标、地址信息

4. **OpenStreetMap** - 开源地图数据
   - 用途：企业位置、地理信息
   - 需要 API Key：❌ 否
   - 预期数据：地理数据、企业位置

### 第二类：社交媒体和内容
5. **Bluesky** - 去中心化社交网络
   - 用途：公司动态、行业信息
   - 需要 API Key：✅ 是
   - 预期数据：公司账户、行业动态

6. **Facebook** - 社交媒体平台
   - 用途：公司主页、联系信息
   - 需要 API Key：✅ 是
   - 预期数据：公司页面、联系方式

7. **YouTube** - 视频平台
   - 用途：公司宣传视频、行业信息
   - 需要 API Key：✅ 是
   - 预期数据：公司视频、频道信息

### 第三类：商业和贸易数据
8. **Wikidata** - 结构化知识库
   - 用途：公司信息、组织数据
   - 需要 API Key：❌ 否
   - 预期数据：公司基本信息、分类

9. **GLEIF** - 全球法人实体标识符
   - 用途：公司法律实体信息
   - 需要 API Key：❌ 否
   - 预期数据：公司注册信息、所有权结构

10. **Common Crawl Index** - 网络爬虫索引
    - 用途：网站内容搜索
    - 需要 API Key：❌ 否
    - 预期数据：网站内容、结构化数据

11. **LinkedIn** - 职业社交网络
    - 用途：公司信息、员工、联系人
    - 需要 API Key：✅ 是
    - 预期数据：公司页面、员工信息、职位

### 第四类：政府和官方数据
12. **世界银行 (World Bank)** - 经济数据
    - 用途：国家经济指标、商业环境
    - 需要 API Key：❌ 否
    - 预期数据：GDP、贸易数据、商业指数

13. **IMF** - 国际货币基金组织
    - 用途：国家金融数据
    - 需要 API Key：❌ 否
    - 预期数据：贸易统计、经济指标

14. **国家统计局** - 各国统计数据
    - 用途：国家商业统计
    - 需要 API Key：❌ 否（部分需要）
    - 预期数据：商业统计、行业数据

15. **欧盟 VIES** - VAT 验证系统
    - 用途：欧盟公司 VAT 验证
    - 需要 API Key：❌ 否
    - 预期数据：公司 VAT 号、法律地位

16. **联合国 Comtrade** - 贸易统计
    - 用途：国际贸易数据
    - 需要 API Key：❌ 否
    - 预期数据：贸易流量、产品分类

17. **Trade Map** - 国际贸易数据库
    - 用途：贸易统计、市场分析
    - 需要 API Key：❌ 否
    - 预期数据：贸易数据、市场规模

### 第五类：B2B 和贸易平台
18. **Alibaba** - 全球采购平台
    - 用途：采购商、供应商信息
    - 需要 API Key：✅ 是
    - 预期数据：采购商、供应商、交易信息

19. **Global Sources** - 采购商目录
    - 用途：全球采购商信息
    - 需要 API Key：✅ 是
    - 预期数据：采购商公司、联系方式

20. **TradeKey** - B2B 贸易平台
    - 用途：买家、卖家信息
    - 需要 API Key：✅ 是
    - 预期数据：买家信息、交易历史

21. **EC21** - 中文贸易平台
    - 用途：中文采购商信息
    - 需要 API Key：✅ 是
    - 预期数据：采购商、供应商

22. **Made-in-China** - 中国制造平台
    - 用途：中国供应商和采购商
    - 需要 API Key：✅ 是
    - 预期数据：供应商、采购商

### 第六类：AI 搜索和数据聚合
23. **Qwen/Kimi 联网 AI 搜索** - AI 搜索引擎
    - 用途：实时网络搜索和信息聚合
    - 需要 API Key：✅ 是
    - 预期数据：实时搜索结果、聚合信息

### 第七类：其他数据源
24. **Redis** - 缓存和数据存储
    - 用途：缓存买家数据
    - 需要 API Key：❌ 否（本地部署）
    - 预期数据：缓存数据

25. **BugPack** - 企业信息平台
    - 用途：企业信息、联系方式
    - 需要 API Key：✅ 是
    - 预期数据：企业信息、电话、邮箱

26. **ImportYeti** - 进口商数据库
    - 用途：美国进口商信息
    - 需要 API Key：✅ 是
    - 预期数据：进口商公司、进口记录

27. **Tendata** - 贸易大数据平台
    - 用途：全球采购商、进口商信息
    - 需要 API Key：✅ 是
    - 预期数据：采购商、进口数据、联系方式

---

## 🧪 测试计划

### 阶段 1：免费数据源测试（无需 API Key）
- [ ] Nominatim
- [ ] OpenStreetMap
- [ ] Wikidata
- [ ] GLEIF
- [ ] Common Crawl Index
- [ ] 世界银行
- [ ] IMF
- [ ] 欧盟 VIES
- [ ] 联合国 Comtrade
- [ ] Trade Map

### 阶段 2：需要 API Key 的数据源测试
- [ ] Serper
- [ ] Google Maps
- [ ] Bluesky
- [ ] Facebook
- [ ] YouTube
- [ ] LinkedIn
- [ ] Alibaba
- [ ] Global Sources
- [ ] TradeKey
- [ ] EC21
- [ ] Made-in-China
- [ ] Qwen/Kimi 联网搜索
- [ ] BugPack
- [ ] ImportYeti
- [ ] Tendata

---

## 📊 测试结果模板

| 数据源 | 可访问性 | 需要 API Key | 数据质量 | 更新频率 | 备注 |
|------|--------|----------|--------|--------|------|
| | ✅/❌ | 是/否 | 高/中/低 | 实时/每日/每周 | |

---

## 🔑 需要的 API Keys

用户需要提供以下 API Keys：

1. Serper API Key
2. Google Maps API Key
3. Bluesky API Key
4. Facebook Graph API Key
5. YouTube API Key
6. LinkedIn API Key
7. Alibaba API Key
8. Global Sources API Key
9. TradeKey API Key
10. EC21 API Key
11. Made-in-China API Key
12. Qwen/Kimi API Key
13. BugPack API Key
14. ImportYeti API Key
15. Tendata API Key

---

## 📝 测试脚本

将在 `test-data-sources.ts` 中创建测试脚本
