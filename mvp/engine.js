// 凑一队 MVP 行程生成引擎：解析自然语言 → 四要素结构化行程
const Data = require('./data/cities');
const CITIES = Data.CITIES;
const ALL_CITY_NAMES = Data.ALL_CITY_NAMES;
const CITY_ALIASES = Data.CITY_ALIASES;
const MAJOR_CITIES = Data.MAJOR_CITIES;

const TAG_KEYWORDS = {
  niche: ['小众', '冷门', '人少', '宝藏', '秘境'],
  food: ['美食', '吃', '吃货', '好吃', '探店', '餐厅', '小吃'],
  outdoor: ['户外', '徒步', '爬山', '自然', '露营', '山水', '爬山'],
  photo: ['拍照', '出片', '摄影', '颜值', '网红', '机位'],
  night: ['夜生活', '酒吧', '夜店', '夜游', '深夜', '夜场'],
  culture: ['文化', '历史', '古迹', '博物馆', '人文', '古', '古镇'],
  shopping: ['购物', '逛街', '商场', '买'],
  coffee: ['咖啡', '咖啡馆'],
  relax: ['安静', '躺平', '松弛', '慢', '佛系', '养老'],
};

const TAG_LABEL = {
  niche: '小众秘境', food: '美食', outdoor: '户外自然', photo: '拍照出片',
  night: '夜生活', culture: '人文历史', shopping: '购物', coffee: '咖啡', relax: '松弛慢游',
};

// ---- 解析 ----
// 最长匹配：避免「南京」被「京」等短别名误判；覆盖精选城市 / 别名 / 全国名单
function detectCity(text) {
  const cands = [];
  for (const name of Object.keys(CITIES)) if (text.includes(name)) cands.push({ name, len: name.length });
  for (const [alias, city] of Object.entries(CITY_ALIASES)) if (text.includes(alias)) cands.push({ name: city, len: alias.length });
  for (const name of ALL_CITY_NAMES) if (text.includes(name)) cands.push({ name, len: name.length });
  if (!cands.length) return null;
  cands.sort((a, b) => b.len - a.len);
  return cands[0].name;
}
function detectDays(text) {
  const m = text.match(/(\d+)\s*(?:天|日|晚|夜)/);
  return m ? parseInt(m[1], 10) : 2;
}
function detectBudget(text) {
  let m = text.match(/预算[：:]?\s*(\d+)/);
  if (m) return parseInt(m[1], 10);
  m = text.match(/(\d+)\s*元/);
  if (m) return parseInt(m[1], 10);
  m = text.match(/(\d{3,5})/); // 兜底：3-5 位数字
  if (m) return parseInt(m[1], 10);
  return 800;
}
function detectTags(text) {
  const tags = [];
  for (const [tag, kws] of Object.entries(TAG_KEYWORDS)) {
    if (kws.some((k) => text.includes(k))) tags.push(tag);
  }
  return tags.length ? tags : ['niche', 'food', 'photo'];
}

// ---- 酒店 / 交通衔接 ----
// 从对话文本中解析用户提供的酒店地址 / 名称
function detectHotel(text) {
  const m = text.match(/(?:住|入住|住在|酒店在|民宿在|宾馆在|订的?酒店|住的?酒店|地址在|家庭住址|出发地)[：:是]?\s*([^，。,\.！!？?\n]{2,40})/);
  if (!m) return null;
  let h = m[1].trim();
  h = h.replace(/(酒店|民宿|旅馆|客栈|青旅|宾馆|公寓|附近|边上|旁边|那里)$/, '');
  return h.length >= 2 ? h : null;
}

// 酒店地址/地标推断（让地址更具体，仍属离线估算，以平台实际为准）
function landmarkFor(area) {
  const m = {
    '市中心商圈': '·近地铁1/2号线·核心广场旁',
    '老城区': '·近老街步行街·烟火气浓',
    '核心商圈': '·商场楼上·逛街即达',
    '火车站 / 枢纽': '·步行5分钟到车站',
    '近热门景区': '·景区东门步行8分钟',
    '文艺 / 创意街区': '·文创园旁·咖啡扎堆',
    '大学城 / 夜市': '·大学南门·夜市一条街',
    '江景 / 城市地标': '·江畔地标高楼',
  };
  return m[area] || '·市区核心地段';
}
function bestForFor(h) {
  const t = (h.tags || []).join(',');
  const a = h.area || '';
  if (a.includes('枢纽') || t.includes('赶车')) return '赶车 / 中转';
  if (a.includes('景区') || t.includes('早起')) return '想多睡 · 懒起党';
  if (a.includes('江景') || t.includes('高端')) return '犒劳自己 · 情侣';
  if (t.includes('设计') || t.includes('出片')) return '拍照党';
  if (a.includes('老城') || t.includes('烟火')) return '人文爱好者';
  if ((h.priceAdj || 0) <= -40) return '预算党 / 学生';
  if ((h.priceAdj || 0) >= 180) return '品质党 / 家庭';
  return '大众出行';
}
// 给酒店补全具体信息：星级 / 评分 / 地址 / 设施 / 适合人群（离线估算，以平台为准）
function enrichHotel(h, city) {
  const area = h.area || '市区';
  const priceAdj = h.priceAdj || 0;
  let star = 3;
  if (priceAdj >= 180) star = 5;
  else if (priceAdj >= 100) star = 4;
  else if (priceAdj >= -20) star = 3;
  else star = 2;
  const score = (4.3 + star * 0.11 + (Math.abs(hashStr(h.name)) % 9) / 100).toFixed(1);
  const addr = `${city}·${area}${landmarkFor(area)}`;
  const facilities = ['免费WiFi', '24h前台', '行李寄存']
    .concat(star >= 4 ? ['含早餐', '健身房'] : [])
    .concat(priceAdj <= 0 ? ['近地铁'] : [])
    .concat(priceAdj >= 180 ? ['行政酒廊'] : []);
  return {
    name: h.name,
    area,
    tags: h.tags || [],
    why: h.why || '',
    detail: h.detail || '',
    pros: h.pros || '整体符合价位预期',
    cons: h.cons || '暂无突出短板',
    priceAdj,
    query: h.name,
    star,
    score: Number(score),
    addr,
    facilities,
    bestFor: bestForFor(h),
  };
}

// 推荐酒店：生成 8 家带详情 / 优缺点 / 具体信息的候选（用户可点开查看、在地图检索、或选为住宿）
function recommendHotels(city, data) {
  let base;
  if (data && Array.isArray(data.hotels) && data.hotels.length) {
    base = data.hotels;
  } else {
    // 通用生成：覆盖不同区位 / 价位的主流住宿需求
    base = [
      { name: `${city}·如家精选(市中心店)`, area: '市中心商圈', tags: ['地铁沿线', '性价比高'], priceAdj: 0, why: '地处市中心，地铁直达多数景点，吃喝方便', detail: `位于${city}市中心核心商圈，步行可达地铁站，周边餐饮与便利店齐全，适合想省交通时间的你。`, pros: '交通最方便，吃饭逛街出门就有；同区位里性价比很能打', cons: '房间偏小，市中心夜里略吵' },
      { name: `${city}·汉庭(老城区店)`, area: '老城区', tags: ['烟火气', '近老街'], priceAdj: -40, why: '藏在老城区，出门就是本地味道', detail: `坐落于${city}老城区，周边是本地人常去的小吃街与老建筑，适合喜欢慢游、拍人文的你。`, pros: '出门即本地小吃街，烟火气与人文感浓', cons: '老楼隔音一般，车位偏紧张' },
      { name: `${city}·亚朵(核心商圈店)`, area: '核心商圈', tags: ['品质连锁', '安静'], priceAdj: 180, why: '品质连锁，干净安静，逛街方便', detail: `位于${city}核心商圈，房间较新、隔音好，楼下即商场与餐厅，适合对住宿品质有要求的你。`, pros: '房间新、隔音好、服务稳定', cons: '价格偏高，去景区需一段通勤' },
      { name: `${city}·全季(交通枢纽店)`, area: '火车站 / 枢纽', tags: ['近车站', '赶车方便'], priceAdj: -20, why: '离车站近，适合落地或返程当天', detail: `靠近${city}火车站 / 长途枢纽，拖着行李最省事，适合抵达或离开当天过渡住宿。`, pros: '拖行李最省力，赶车零焦虑', cons: '周边配套一般，离景点较远' },
      { name: `${city}·锦江之星(景区店)`, area: '近热门景区', tags: ['近景点', '早起不赶'], priceAdj: -10, why: '就在热门景区旁，玩到晚也不慌', detail: `紧邻${city}热门景区，步行或短驳即可入园，适合想多睡一会儿、把时间留给风景的你。`, pros: '步行到景区，早起不赶路', cons: '旺季涨价明显，景区餐饮偏贵' },
      { name: `${city}·桔子水晶(文艺街区店)`, area: '文艺 / 创意街区', tags: ['设计感', '出片'], priceAdj: 120, why: '藏在小资街区，拍照出片还安静', detail: `位于${city}文艺 / 创意街区，装修有设计感、公共空间适合拍照，楼下咖啡馆与买手店扎堆，适合爱拍照的你。`, pros: '装修好看出片，楼下咖啡买手店', cons: '价格中上，街区安静夜生活少' },
      { name: `${city}·七天优品(大学城店)`, area: '大学城 / 夜市', tags: ['便宜', '年轻', '夜市'], priceAdj: -60, why: '最划算，旁边就是夜市小吃街', detail: `坐落在${city}大学城，楼下夜市与奶茶店云集、价格友好，适合预算有限又想吃得热闹的你。`, pros: '最划算，夜市奶茶一条龙', cons: '设施简单，部分房型无窗' },
      { name: `${city}·美仑国际(江景 / 地标店)`, area: '江景 / 城市地标', tags: ['视野好', '高端'], priceAdj: 320, why: '高层江景房，城市夜景尽收眼底', detail: `位于${city}江岸 / 城市地标高楼，落地窗俯瞰江景或夜景，适合想犒劳自己、住得舒服的你。`, pros: '高层江景夜景，犒劳自己首选', cons: '价格最高，距市中心与景点通勤长' },
    ];
  }
  return base.map((h, i) => {
    const e = enrichHotel(h, city);
    e.id = `h${i}`;
    return e;
  });
}

// 综合解析：用户地址优先，否则用推荐酒店首选项；同时返回全部可选项供前端展示
function resolveHotel(city, text, opts, data, budget, days) {
  let userHotel = detectHotel(text);
  if (opts && opts.hotel && String(opts.hotel).trim()) userHotel = String(opts.hotel).trim();
  const options = recommendHotels(city, data);
  const perNight = Math.max(80, Math.round((budget * 0.35) / days / 10) * 10);
  const now = new Date();
  const updatedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const priceNote = '参考价 · 以各平台实际为准';
  options.forEach((o) => { o.price = Math.max(80, perNight + o.priceAdj); o.priceNote = priceNote; });
  const isUserProvided = !!userHotel;
  const effective = userHotel || options[0].name;
  const sel = options.find((o) => o.name === effective);
  const label = userHotel
    ? `您入住：${userHotel}`
    : `推荐入住：${options[0].name}（${options[0].area}）`;
  return {
    label,
    name: effective,
    area: isUserProvided ? '' : (options[0].area || ''),
    isUserProvided,
    selectedId: sel ? sel.id : null,
    options,
    updatedAt,
    priceNote,
  };
}

// 估算从酒店到景点的路程（离线无地图，按景点属性给合理估算值，实际以导航为准）
function estimateKm(spot) {
  const tags = spot.tags || [];
  const far = tags.includes('outdoor') || tags.includes('nature') || tags.includes('relax');
  const base = far ? 16 : 3;
  const span = far ? 44 : 12; // 近郊/景区 16-60km；市区 3-15km
  return base + (hashStr(spot.name) % span);
}

// 生成「从 fromName 到景点」的交通攻略；fromHotel 标记上一段是否从酒店出发
function buildTransport(fromName, spot, fromHotel) {
  let km = estimateKm(spot);
  if (!fromHotel) km = Math.round(km * 0.6); // 景点→景点通常在同一城区，路程更短
  const far = km > 15;
  const speed = far ? 42 : 16; // 有效时速（含等车/步行）
  const time = Math.round((km / speed) * 60) + (far ? 10 : 8);
  const tags = spot.tags || [];
  let mode;
  if (far) mode = tags.includes('niche') ? '建议打车 / 自驾，或乘景区专线' : '建议打车或乘旅游直通车';
  else if (!fromHotel) mode = tags.includes('niche') ? '景点间可骑行 / 步行巷弄，或乘公交' : '地铁 / 公交 + 步行即可顺路';
  else mode = tags.includes('niche') ? '建议骑行 / 步行巷弄，或乘公交' : '地铁 / 公交 + 步行';
  let note;
  if (far) note = '路程较远，建议早出发并预留返程时间；景区周边停车紧张，优先公共交通。';
  else if (!fromHotel) note = '相邻景点距离不远，按路线顺路游玩最省力，留意营业时间衔接。';
  else if (tags.includes('niche')) note = '导航至具体入口，部分为步行街 / 小巷，留意限行与单行道。';
  else note = '高峰时段请预留 10-15 分钟缓冲，避免迟到。';
  return {
    from: fromName,
    to: spot.name,
    mode,
    time: `约 ${time} 分钟`,
    dist: `约 ${km} 公里`,
    note,
  };
}

// ---- 稳定随机（同输入同结果）----
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(arr, n, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function buildHighlights(city, tags, data) {
  const out = [];
  out.push(`${city} · ${data.intro}`);
  if (tags.includes('niche')) out.push('已优先为你挑出人少秘境，避开人从众。');
  if (tags.includes('food')) out.push('按你的口味安排了本地地道吃食，不止网红店。');
  if (tags.includes('photo')) out.push('路线里标了出片机位，记得带充电宝。');
  if (tags.includes('night')) out.push('夜生活点位已排上，傍晚后更精彩。');
  if (tags.includes('relax')) out.push('整体节奏偏松弛，留出发呆时间。');
  return out;
}

function generatePlan(text, opts) {
  text = (text || '').trim();
  const city = detectCity(text);
  if (!city) {
    const totalCities = new Set([...Object.keys(CITIES), ...ALL_CITY_NAMES]).size;
    const samples = ALL_CITY_NAMES.slice(0, 12).join('、');
    return { ok: false, message: `想去哪个城市呀？目前已覆盖全国 ${totalCities}+ 座城市，例如：${samples}…` };
  }
  const days = Math.min(Math.max(detectDays(text), 1), 5);
  const budget = Math.max(detectBudget(text), 200);
  const tags = detectTags(text);
  // 未收录详细 POI 的城市：生成通用攻略框架，不再报错
  if (!CITIES[city]) return generateGenericPlan(city, days, budget, tags, text, opts);
  const rng = mulberry32(hashStr(city + days + budget + tags.join(',')));
  const data = CITIES[city];
  const preferNiche = tags.includes('niche');
  const hotel = resolveHotel(city, text, opts, data, budget, days);

  // 打卡点：先按偏好标签过滤，不足则回退全量；niche 偏好时把秘境前置
  let spotPool = data.spots.filter((s) => s.tags.some((t) => tags.includes(t)));
  if (spotPool.length < 4) spotPool = data.spots.slice();
  let spots = pick(spotPool, Math.min(spotPool.length, Math.max(days * 2, 6)), rng);
  if (preferNiche) {
    const n = spots.filter((s) => s.niche);
    if (n.length >= 2) spots = n.concat(spots.filter((s) => !s.niche));
  }

  // 餐饮
  const foods = pick(data.foods, Math.min(data.foods.length, Math.max(days * 2, 4)), rng);

  // 预算分配
  const stay = Math.round(budget * 0.35);
  const foodB = Math.round(budget * 0.3);
  const transB = Math.round(budget * 0.15);
  const playB = budget - stay - foodB - transB;

  // 每日行程（打卡点/餐饮不足时循环复用，避免长行程出现空日）
  // 交通链：每天从酒店出发 → 景点1 → 景点2，每段都生成具体交通
  const itinerary = [];
  for (let d = 1; d <= days; d++) {
    const ds = [];
    const df = [];
    for (let i = 0; i < 2; i++) {
      ds.push(spots[((d - 1) * 2 + i) % spots.length]);
      df.push(foods[((d - 1) * 2 + i) % foods.length]);
    }
    let prevName = hotel.label;
    let prevIsHotel = true;
    const spotItems = ds.map((s) => {
      const t = buildTransport(prevName, s, prevIsHotel);
      prevName = s.name;
      prevIsHotel = false;
      return { name: s.name, desc: s.desc, tags: s.tags, transport: t };
    });
    const foodItems = df.map((f, i) => ({
      name: f.name, price: f.price, desc: f.desc,
      near: i === 0 ? ds[0].name : ds[ds.length - 1].name,
    }));
    itinerary.push({ day: d, spots: spotItems, food: foodItems, budget: Math.round(budget / days) });
  }

  const transport =
    `以「${hotel.label}」为起点，已为每天的「酒店 → 景点1 → 景点2」每段生成具体交通方式、距离与建议时间（见下方每日行程）；跨城大交通按你的出发地另行查询。`;

  // 小众 / 偏远目的地：暂不支持组队（安全考虑，仅提供攻略）
  const groupingSupported = !data.remote;

  const highlights = buildHighlights(city, tags, data);
  if (!groupingSupported) {
    highlights.push('该目的地为小众 / 偏远地区，当前仅提供行程攻略，暂不支持「凑一队」组队（安全优先）。');
  }

  return {
    ok: true,
    city,
    days,
    budget,
    tags,
    tagLabels: tags.map((t) => TAG_LABEL[t] || t),
    intro: data.intro,
    transport,
    budgetBreakdown: { stay, food: foodB, transport: transB, play: playB },
    itinerary,
    highlights,
    tips: data.tips || [],
    groupingSupported,
    hotel,
  };
}

// 未收录详细 POI 的城市：按偏好生成「带城市名的引导式」攻略框架，保证「任何城市都不空手而归」
function generateGenericPlan(city, days, budget, tags, text, opts) {
  const rng = mulberry32(hashStr(city + days + budget + tags.join(',')));
  // 通用模板：把城市名嵌进去，给出可落地的「去哪查/怎么玩」建议，而非空泛占位
  const genericSpotTemplates = [
    { name: `${city}老城区 / 历史街区`, tags: ['culture', 'niche'], niche: true, desc: `先感受${city}的烟火气，可搜「${city}老街/必去景点」锁定具体街区` },
    { name: `${city}博物馆 / 规划馆`, tags: ['culture'], niche: false, desc: `快速了解${city}的脉络，搜官方推荐的具体馆名` },
    { name: `${city}城市地标 / 观景台`, tags: ['photo'], niche: false, desc: `打卡${city}天际线，搜「${city}地标/电视塔/最高观景点」` },
    { name: `${city}近郊自然公园`, tags: ['outdoor', 'relax'], niche: false, desc: `吸氧放松一下午，搜「${city}近郊登山/湿地公园」` },
    { name: `${city}人气夜市 / 步行街`, tags: ['night', 'food'], niche: false, desc: `傍晚最热闹，搜「${city}夜市/美食街」` },
    { name: `${city}小众咖啡馆 / 书店`, tags: ['coffee', 'niche', 'photo'], niche: true, desc: `发呆出片两不误，搜「${city}咖啡/独立书店」` },
    { name: `${city}本地人常去的市场`, tags: ['food', 'niche'], niche: true, desc: `最地道的物价与味道，搜「${city}菜市场/早市」` },
    { name: `${city}滨水步道 / 城市公园`, tags: ['relax', 'photo'], niche: false, desc: `黄昏散步很舒服，搜「${city}河边/湖边公园」` },
  ];
  const genericFoodTemplates = [
    { name: `${city}本地招牌菜`, price: 60, tags: ['food'], desc: '到店必点，可搜具体菜名' },
    { name: `${city}街边小吃 / 夜市`, price: 25, tags: ['food'], desc: '边走边吃，搜本地人推荐' },
    { name: `${city}老字号馆子`, price: 80, tags: ['food'], desc: '本地人认可的味道' },
    { name: `${city}特色早 / 午茶`, price: 40, tags: ['food', 'coffee'], desc: '慢享一餐' },
    { name: `${city}地方甜品 / 饮品`, price: 18, tags: ['food'], desc: '解腻收尾' },
  ];
  let spotPool = genericSpotTemplates.filter((s) => s.tags.some((t) => tags.includes(t)));
  if (spotPool.length < 4) spotPool = genericSpotTemplates.slice();
  let spots = pick(spotPool, Math.min(spotPool.length, Math.max(days * 2, 6)), rng);
  if (tags.includes('niche')) {
    const n = spots.filter((s) => s.niche);
    if (n.length >= 2) spots = n.concat(spots.filter((s) => !s.niche));
  }
  const foods = pick(genericFoodTemplates, Math.min(genericFoodTemplates.length, Math.max(days * 2, 4)), rng);

  const hotel = resolveHotel(city, text, opts, undefined, budget, days);

  const stay = Math.round(budget * 0.35);
  const foodB = Math.round(budget * 0.3);
  const transB = Math.round(budget * 0.15);
  const playB = budget - stay - foodB - transB;

  const itinerary = [];
  for (let d = 1; d <= days; d++) {
    const ds = [];
    const df = [];
    for (let i = 0; i < 2; i++) {
      ds.push(spots[((d - 1) * 2 + i) % spots.length]);
      df.push(foods[((d - 1) * 2 + i) % foods.length]);
    }
    let prevName = hotel.label;
    let prevIsHotel = true;
    const spotItems = ds.map((s) => {
      const t = buildTransport(prevName, s, prevIsHotel);
      prevName = s.name;
      prevIsHotel = false;
      return { name: s.name, desc: s.desc, tags: s.tags, transport: t };
    });
    const foodItems = df.map((f, i) => ({
      name: f.name, price: f.price, desc: f.desc,
      near: i === 0 ? ds[0].name : ds[ds.length - 1].name,
    }));
    itinerary.push({ day: d, spots: spotItems, food: foodItems, budget: Math.round(budget / days) });
  }

  const transport = `以「${hotel.label}」为起点，已为每天每段生成具体交通估算（酒店 → 景点1 → 景点2）；跨城大交通请按你的出发地另行查询，建议提前看好班次。`;
  const groupingSupported = MAJOR_CITIES.includes(city);

  const highlights = [`${city} · 通用攻略框架（该城市详细 POI 正在补充，已按你的偏好生成模板）`];
  if (tags.includes('niche')) highlights.push('已尽量避开人从众，挑了相对小众的玩法。');
  if (tags.includes('food')) highlights.push('餐饮按「找本地人排队」的原则安排。');
  highlights.push('想让攻略更准？告诉我要去的具体区县 / 景点，我们优先补齐这座城市。');
  if (!groupingSupported) highlights.push('该城市「凑一队」组队功能即将开放，当前仅提供行程攻略。');

  return {
    ok: true,
    city,
    days,
    budget,
    tags,
    tagLabels: tags.map((t) => TAG_LABEL[t] || t),
    intro: `${city} · 通用攻略框架`,
    transport,
    budgetBreakdown: { stay, food: foodB, transport: transB, play: playB },
    itinerary,
    highlights,
    tips: ['大交通尽早订，节假日价格波动大', '住宿定在地铁沿线，省时', '随身带充电宝，拍照耗电快', '保留 1-2 个弹性时段，别排太满'],
    groupingSupported,
    generic: true,
    hotel,
  };
}

module.exports = { generatePlan, CITIES, TAG_LABEL };
