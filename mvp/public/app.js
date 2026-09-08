const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const hotelInput = document.getElementById('hotel');

// ===== 个人主页 + 实名认证（前端 localStorage 演示版）=====
const PROFILE_KEY = 'cyd_profile_v1';
const PF_EMOJIS = ['🌱','🦊','🐱','🐰','🐻','🐼','🦁','🐯','🐨','🦄','🐧','🌟','🍊','🌿','🍡'];
function loadProfile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch(e){ return {}; } }
function saveProfile(p){ try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch(e){} }
function getProfile(){
  const p = loadProfile();
  if (!p.nick) p.nick = '我';
  if (!p.emoji) p.emoji = '🌱';
  if (!Array.isArray(p.tags)) p.tags = [];
  if (!Array.isArray(p.cities)) p.cities = [];
  if (!Array.isArray(p.teams)) p.teams = [];
  if (typeof p.verified !== 'boolean') p.verified = false;
  return p;
}
function addCity(city){ if(!city) return; const p=getProfile(); if(!p.cities.includes(city)){ p.cities.push(city); saveProfile(p); } }
function addTeam(name, city){ if(!name) return; const p=getProfile(); p.teams.push({name, city:city||'', date:new Date().toISOString().slice(0,10)}); saveProfile(p); }
function maskName(name){ name=(name||'').trim(); if(name.length<=1) return name; if(name.length===2) return name[0]+'*'; return name[0]+'*'.repeat(name.length-2)+name[name.length-1]; }
function validateIdCard(id){
  id=(id||'').trim().toUpperCase();
  if(!/^\d{17}[\dX]$/.test(id)) return {ok:false,msg:'请输入18位有效身份证号'};
  const w=[7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2], codes='10X98765432';
  let sum=0; for(let i=0;i<17;i++) sum+=parseInt(id[i],10)*w[i];
  if(codes[sum%11]!==id[17]) return {ok:false,msg:'身份证号校验位不正确'};
  const y=+id.slice(6,10), mo=+id.slice(10,12), d=+id.slice(12,14);
  if(y<1900||y>new Date().getFullYear()) return {ok:false,msg:'出生年份异常'};
  if(mo<1||mo>12||d<1||d>31) return {ok:false,msg:'出生日期异常'};
  return {ok:true, gender:(+id[16]%2===1?'男':'女'), birth:`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`};
}
function openVerify(parentMask){
  const m=el(`<div class="modal-mask" id="v-mask"><div class="modal verify-modal">
    <button class="modal-close" type="button">×</button>
    <div class="sec-title">🔐 实名认证（演示）</div>
    <div class="vf-tip">为保障组队安全建议完成认证。本 MVP 为演示版，仅做格式校验，不会真实上传或存储证件信息。</div>
    <input id="vf-name" class="vf-input" placeholder="真实姓名" maxlength="20" />
    <input id="vf-id" class="vf-input" placeholder="18位身份证号" maxlength="18" />
    <div id="vf-msg" class="vf-msg"></div>
    <button id="vf-submit" class="vf-submit" type="button">提交认证</button>
  </div></div>`);
  document.body.appendChild(m);
  m.querySelector('.modal-close').addEventListener('click',()=>m.remove());
  m.addEventListener('click',(e)=>{ if(e.target===m) m.remove(); });
  const nameI=m.querySelector('#vf-name'), idI=m.querySelector('#vf-id'), msg=m.querySelector('#vf-msg'), sub=m.querySelector('#vf-submit');
  const refresh=()=>{ const v=validateIdCard(idI.value); if(!nameI.value.trim()||!idI.value.trim()){ msg.textContent=''; msg.className='vf-msg'; return; } if(v.ok){ msg.textContent='✅ 校验通过'+(v.gender?`（${v.gender}）`:''); msg.className='vf-msg ok'; } else { msg.textContent='⚠️ '+v.msg; msg.className='vf-msg err'; } };
  nameI.addEventListener('input',refresh); idI.addEventListener('input',refresh);
  sub.addEventListener('click',()=>{ const name=nameI.value.trim(); const v=validateIdCard(idI.value); if(!name){ msg.textContent='请填写真实姓名'; msg.className='vf-msg err'; return; } if(!v.ok){ msg.textContent='⚠️ '+v.msg; msg.className='vf-msg err'; return; } const np=getProfile(); np.verified=true; np.realName=name; np.realNameMasked=maskName(name); np.verifiedAt=new Date().toISOString().slice(0,10); saveProfile(np); m.remove(); parentMask.remove(); openProfile(); });
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function addUser(text) {
  chat.appendChild(el(`<div class="msg user"><div class="avatar">你</div><div class="bubble">${escapeHtml(text)}</div></div>`));
  scroll();
}
function addBot(node) {
  const m = el(`<div class="msg bot"><div class="avatar">凑</div><div class="bubble"></div></div>`);
  m.querySelector('.bubble').appendChild(node);
  chat.appendChild(m);
  scroll();
}
function scroll() { chat.scrollTop = chat.scrollHeight; }
function escapeHtml(s) {
  return (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderPlan(p) {
  const wrap = el(`<div class="plan"></div>`);
  wrap.innerHTML = `
    <div class="plan-head">
      <h3>🧭 ${p.city} · ${p.days} 天行程</h3>
      <div class="meta">总预算 ¥${p.budget} ｜ 偏好：${p.tagLabels.join('、')}</div>
      <div class="tags">${p.tagLabels.map((t) => `<span>${t}</span>`).join('')}</div>
    </div>
    <div class="plan-body">
      ${p.groupingSupported === false ? `<div class="notice">⚠️ <span>该目的地为小众 / 偏远地区，当前仅提供行程攻略，暂不支持「凑一队」组队（安全优先）。</span></div>` : ''}
      ${p.hotel ? `<div class="hotel-banner">🏨 ${escapeHtml(p.hotel.label)} <span class="hotel-sub">${p.hotel.isUserProvided ? '（你提供的地址，交通按此计算）' : '（示例酒店，可点下方选项切换）'}</span></div>` : ''}
      ${p.hotel && p.hotel.options && p.hotel.options.length ? `
      <div class="sec">
        <div class="sec-title">🏨 为你推荐 ${p.hotel.options.length} 家酒店（点击查看详情 / 优缺点 / 地图检索 / 选为住宿）</div>
        <div class="hotel-updated">💱 ${escapeHtml(p.hotel.priceNote)} · 更新于 ${escapeHtml(p.hotel.updatedAt)}</div>
        <div class="hotel-opts">
          ${p.hotel.options.map((o, idx) => `
            <div class="hotel-card ${p.hotel.selectedId === o.id ? 'sel' : ''} ${idx >= 4 && p.hotel.selectedId !== o.id ? 'hc-more' : ''}" ${idx >= 4 && p.hotel.selectedId !== o.id ? 'hidden' : ''}>
              <div class="hc-head">
                <div class="hc-name">${p.hotel.selectedId === o.id ? '✅ ' : ''}${escapeHtml(o.name)}</div>
                <div class="hc-price">¥${o.price}<span>/晚</span> <span class="hc-ref">参考</span></div>
              </div>
              <div class="hc-area">📍 ${escapeHtml(o.area)} · ⭐${o.score} · ${o.star}星 ${o.tags.map((t) => `<span class="hc-tag">${escapeHtml(t)}</span>`).join('')}</div>
              <div class="hc-addr">🗺️ ${escapeHtml(o.addr)}</div>
              <div class="hc-fac">${o.facilities.map((f) => `<span>${escapeHtml(f)}</span>`).join('')}<span class="hc-best">🎯 ${escapeHtml(o.bestFor)}</span></div>
              <div class="hc-detail" hidden>
                <div class="hc-why">💡 ${escapeHtml(o.why)}</div>
                <div class="hc-pros">👍 优点：${escapeHtml(o.pros)}</div>
                <div class="hc-cons">👎 缺点：${escapeHtml(o.cons)}</div>
                <div class="hc-info">🏷️ ${escapeHtml(o.addr)} ｜ 🎯 适合：${escapeHtml(o.bestFor)} ｜ 设施：${o.facilities.join('、')}</div>
                <div class="hc-desc">${escapeHtml(o.detail)}</div>
              </div>
              <div class="hc-actions">
                <button class="hc-btn detail-btn" type="button">查看详情 ▾</button>
                <a class="hc-btn search-btn" href="https://www.amap.com/search?query=${encodeURIComponent(o.query)}" target="_blank" rel="noopener">🔍 地图中查看</a>
                <button class="hc-btn pick-btn" type="button" data-name="${escapeHtml(o.name)}">选为住宿</button>
              </div>
            </div>`).join('')}
          ${p.hotel.options.length > 4 ? `<button class="hotel-more-btn" type="button" data-count="${p.hotel.options.length}">查看全部 ${p.hotel.options.length} 家 ▾</button>` : ''}
        </div>
      </div>` : ''}
      ${p.highlights.map((h) => `<div class="sec"><div class="sec-title">亮点</div><div class="tips">${escapeHtml(h)}</div></div>`).join('')}
      <div class="sec">
        <div class="sec-title">🚌 交通衔接（总览）</div>
        <div class="tips">${escapeHtml(p.transport)}</div>
      </div>
      <div class="sec">
        <div class="sec-title">💰 预算分配</div>
        <div class="kv"><span>住宿</span><span>¥${p.budgetBreakdown.stay}</span></div>
        <div class="kv"><span>餐饮</span><span>¥${p.budgetBreakdown.food}</span></div>
        <div class="kv"><span>交通</span><span>¥${p.budgetBreakdown.transport}</span></div>
        <div class="kv"><span>玩乐</span><span>¥${p.budgetBreakdown.play}</span></div>
      </div>
      <div class="sec">
        <div class="sec-title">📍 每日行程</div>
        ${p.itinerary.map((d) => `
          <div class="day">
            <h4>第 ${d.day} 天 · 当日预算 ¥${d.budget}</h4>
            ${d.spots.map((s) => `
              <div class="spot"><b>${escapeHtml(s.name)}</b> <span class="d">— ${escapeHtml(s.desc)}</span></div>
              ${s.transport ? `
              <div class="trans">
                <span class="trans-route">🚌 从「${escapeHtml(s.transport.from)}」→ ${escapeHtml(s.transport.to)}</span>
                <span class="trans-mode">${escapeHtml(s.transport.mode)}</span>
                <span class="trans-meta">${escapeHtml(s.transport.dist)} ｜ ${escapeHtml(s.transport.time)}</span>
                <span class="trans-note">${escapeHtml(s.transport.note)}</span>
              </div>` : ''}
            `).join('')}
            ${d.food.map((f) => `<div class="food">🍜 ${escapeHtml(f.name)} ¥${f.price}（${escapeHtml(f.desc)}）${f.near ? ` · 近「${escapeHtml(f.near)}」` : ''}</div>`).join('')}
          </div>`).join('')}
      </div>
      <div class="sec">
        <div class="sec-title">💡 小贴士</div>
        <ul class="tips">${p.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      </div>
    </div>`;
  return wrap;
}

async function send(text) {
  text = (text || '').trim();
  if (!text) return;
  const hotel = (hotelInput.value || '').trim();
  addUser(text + (hotel ? `（酒店：${hotel}）` : ''));
  input.value = '';
  const loading = el(`<div class="msg bot"><div class="avatar">凑</div><div class="bubble"><span class="loading">凑凑正在生成行程…</span></div></div>`);
  chat.appendChild(loading);
  scroll();
  try {
    const r = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, hotel }),
    });
    const p = await r.json();
    loading.remove();
    if (!p.ok) {
      addBot(el(`<div>${escapeHtml(p.message)}</div>`));
    } else {
      const node = renderPlan(p);
      addBot(node);
      attachHotelHandlers(node, text);
      addCity(p.city);
      if (Array.isArray(p.tags) && p.tags.length) {
        const np = getProfile();
        np.tags = [...new Set([...(np.tags||[]), ...p.tags])];
        saveProfile(np);
      }
      if (p.groupingSupported) {
        const gnode = renderGroupForm(p, text);
        addBot(gnode);
        attachGroupForm(gnode, p, text);
      }
    }
  } catch (e) {
    loading.remove();
    addBot(el(`<div>生成失败了，稍后再试～</div>`));
  }
}

// 酒店选项交互：查看详情、地图检索、选为住宿（就地重算交通）
function attachHotelHandlers(node, text) {
  node.querySelectorAll('.detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.hotel-card');
      const d = card.querySelector('.hc-detail');
      d.hidden = !d.hidden;
      btn.textContent = d.hidden ? '查看详情 ▾' : '收起 ▴';
    });
  });
  const moreBtn = node.querySelector('.hotel-more-btn');
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      const expanded = moreBtn.dataset.exp === '1';
      node.querySelectorAll('.hc-more').forEach((c) => { c.hidden = expanded; });
      moreBtn.dataset.exp = expanded ? '0' : '1';
      const n = moreBtn.dataset.count || '';
      moreBtn.textContent = expanded ? `查看全部 ${n} 家 ▾` : '收起 ▴';
    });
  }
  node.querySelectorAll('.pick-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.hotel-card');
      const hotelName = btn.dataset.name;
      card.querySelectorAll('.hc-btn').forEach((b) => (b.disabled = true));
      const orig = btn.textContent;
      btn.textContent = '重算中…';
      try {
        const r = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, hotel: hotelName }),
        });
        const p2 = await r.json();
        if (!p2.ok) {
          btn.textContent = orig;
          card.querySelectorAll('.hc-btn').forEach((b) => (b.disabled = false));
          return;
        }
        hotelInput.value = hotelName; // 同步到输入框，后续查询沿用
        const newNode = renderPlan(p2);
        node.replaceWith(newNode);
        attachHotelHandlers(newNode, text);
      } catch (e) {
        btn.textContent = orig;
        card.querySelectorAll('.hc-btn').forEach((b) => (b.disabled = false));
      }
    });
  });
}

sendBtn.addEventListener('click', () => send(input.value));
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(input.value); });
document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => send(c.textContent)));
const profileBtn = document.getElementById('profile-btn');
if (profileBtn) profileBtn.addEventListener('click', openProfile);
const squareBtn = document.getElementById('square-btn');
if (squareBtn) squareBtn.addEventListener('click', openSquare);
const loginBtn = document.getElementById('login-btn');
if (loginBtn) loginBtn.addEventListener('click', openLogin);
updateLoginBtn();


// ===== 阶段 2：组队前端流程 =====
const GROUP_TAGS = { niche:'小众秘境', food:'美食', outdoor:'户外自然', photo:'拍照出片', night:'夜生活', culture:'人文历史', shopping:'购物', coffee:'咖啡', relax:'松弛慢游' };
const SPEND_LABEL2 = { economy:'经济', normal:'适中', quality:'品质' };
function spendFromBudget(b){ return b>=1500?'quality':(b<800?'economy':'normal'); }

function renderGroupForm(p, text){
  const tags = p.tags || [];
  const spend = spendFromBudget(p.budget);
  const tagChips = Object.keys(GROUP_TAGS).map(k =>
    `<button type="button" class="gtag ${tags.includes(k)?'on':''}" data-tag="${k}">${GROUP_TAGS[k]}</button>`
  ).join('');
  const spendChips = ['economy','normal','quality'].map(sp =>
    `<button type="button" class="gspend ${sp===spend?'on':''}" data-spend="${sp}">${SPEND_LABEL2[sp]}</button>`
  ).join('');
  return el(`<div class="group-form">
    <div class="sec-title">🤝 要不要凑一队？帮你匹配同频伙伴</div>
    <div class="gf-tip">行程已生成～填一下画像，凑凑帮你匹配 4-8 人同频小团（合适的目的地才开放组队哦）</div>
    <div class="gf-label">兴趣标签（已按你的偏好勾选，可改）</div>
    <div class="gf-tags">${tagChips}</div>
    <div class="gf-label">消费档位</div>
    <div class="gf-spends">${spendChips}</div>
    <div class="gf-row">
      <input id="gf-age" type="number" min="16" max="40" placeholder="年龄" value="24" />
      <input id="gf-from" type="text" placeholder="出发城市（如 上海）" />
    </div>
    <button class="gf-go" type="button">开始匹配 🤝</button>
  </div>`);
}

function attachGroupForm(node, p, text){
  let selTags = (p.tags||[]).slice();
  let selSpend = spendFromBudget(p.budget);
  node.querySelectorAll('.gtag').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const t = btn.dataset.tag;
      if (selTags.includes(t)) { selTags = selTags.filter(x=>x!==t); btn.classList.remove('on'); }
      else { selTags.push(t); btn.classList.add('on'); }
    });
  });
  node.querySelectorAll('.gspend').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      node.querySelectorAll('.gspend').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      selSpend = btn.dataset.spend;
    });
  });
  const go = node.querySelector('.gf-go');
  go.addEventListener('click', async ()=>{
    const age = (node.querySelector('#gf-age').value||'').trim() || '24';
    const fromCity = (node.querySelector('#gf-from').value||'').trim();
    const profile = { age, fromCity, tags: selTags.length?selTags:['niche','food','photo'], spend: selSpend };
    const hotel = (hotelInput.value||'').trim();
    lastMatchReq = { city: p.city, profile, hotel };
    go.disabled = true; go.textContent = '匹配中…';
    try {
      const r = await fetch('/api/match', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ city:p.city, profile, hotel, salt: Math.random().toString(36).slice(2) }),
      });
      const g = await r.json();
      if (!g.ok) { go.disabled=false; go.textContent='开始匹配 🤝'; return; }
      const resNode = renderMatchResult(g, p);
      node.replaceWith(resNode);
      attachMatchResult(resNode, g, p);
    } catch(e){
      go.disabled=false; go.textContent='开始匹配 🤝';
    }
  });
}

function renderMatchResult(g, p){
  const list = g.members.map(m=>{
    const tags = (m.tags||[]).map(t=>`<span class="mt-tag">${GROUP_TAGS[t]||t}</span>`).join('');
    const common = (m.common||[]).map(c=>`<span class="mt-common">${escapeHtml(c)}</span>`).join('');
    return `<div class="mcard">
      <div class="mc-head">
        <span class="mc-emoji">${m.emoji}</span>
        <span class="mc-name">${escapeHtml(m.nick)}</span>
        <span class="mc-meta">${m.age}岁 · 从${escapeHtml(m.fromCity)}出发</span>
      </div>
      <div class="mc-tags">${tags}</div>
      <div class="mc-score">
        <span class="mc-score-num">匹配度 ${m.score}%</span>
        <span class="mc-bar"><span class="mc-bar-fill" style="width:${m.score}%"></span></span>
        <span class="mc-spend">${SPEND_LABEL2[m.spend]||''}</span>
      </div>
      <div class="mc-common">${common}</div>
      <div class="mc-persona">「${escapeHtml(m.persona)}」</div>
    </div>`;
  }).join('');
  const top = (g.topTags||[]).map(t=>GROUP_TAGS[t]||t).join('、');
  return el(`<div class="match-result">
    <div class="sec-title">🎯 为你匹配到 ${g.members.length} 位同频伙伴（小队共 ${g.groupSize} 人）</div>
    <div class="mr-tip">基于你的画像，当前在线候选 ${g.poolSize} 人 · ${escapeHtml(g.note)}</div>
    ${top?`<div class="mr-top">🔥 小队共同兴趣：${top}</div>`:''}
    <div class="mcards">${list}</div>
    <div class="mr-meet">📍 集合建议：${escapeHtml(g.meetPoint)}</div>
    <div class="mr-actions">
      <button class="mr-confirm" type="button">💬 聊一聊再组队</button>
      <button class="mr-rematch" type="button">🔄 换一批</button>
    </div>
  </div>`);
}

function attachMatchResult(node, g, p){
  const confirm = node.querySelector('.mr-confirm');
  confirm.addEventListener('click', ()=>{
    openChat(g.members, g.groupName, g.city, node);
  });
  const rematch = node.querySelector('.mr-rematch');
  rematch.addEventListener('click', async ()=>{
    if (!lastMatchReq) return;
    rematch.disabled = true; rematch.textContent = '换一批中…';
    try {
      const r = await fetch('/api/match', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(Object.assign({}, lastMatchReq, { salt: Math.random().toString(36).slice(2) })),
      });
      const g2 = await r.json();
      const rn = renderMatchResult(g2, p);
      node.replaceWith(rn);
      attachMatchResult(rn, g2, p);
    } catch(e){ rematch.disabled=false; rematch.textContent='🔄 换一批'; }
  });
}

function renderGroupDone(g, p){
  const members = g.members.map(m=>
    `<li>${m.emoji} ${escapeHtml(m.nick)}（${m.age}岁·从${escapeHtml(m.fromCity)}出发）</li>`
  ).join('');
  return el(`<div class="group-done">
    <div class="gd-emoji">🎉</div>
    <div class="sec-title">组队成功！${escapeHtml(g.groupName)}</div>
    <div class="gd-size">共 ${g.groupSize} 人小团（你 + ${g.members.length} 位伙伴）</div>
    <div class="gd-members"><div class="gd-label">👥 成员</div><ul>${members}</ul></div>
    <div class="gd-meet">📍 ${escapeHtml(g.meetPoint)}</div>
    <div class="gd-tip">出行前可在群里敲定细节：${escapeHtml(g.city||p.city||"目的地")}，建议先同步到达时间～</div>
    <div class="gd-chat">💬 已为你建群「${escapeHtml(g.groupName)}」，出发前可聊细节</div>
  </div>`);
}

// ===== 聊一聊：匹配后先沟通，双方同意才建群（实名沟通）=====
function openChat(members, groupName, city, fromNode){
  const prof = getProfile();
  const verified = !!prof.verified;
  const roster = (members||[]).map(m => Object.assign({}, m, { agreed:false }));
  const me = { nick: prof.nick||'我', emoji: prof.emoji||'🌱', agreed:false, isMe:true, verified };
  const modal = el(`<div class="modal-mask" id="chat-mask"><div class="modal chat-modal">
    <button class="modal-close" type="button">×</button>
    <div class="chat-head">
      <div class="chat-title">💬 ${escapeHtml(groupName||'沟通中')} · ${escapeHtml(city||'')}</div>
      ${verified?`<div class="chat-verify ok">你已实名 · ${escapeHtml(prof.realNameMasked||'')}（实名沟通）</div>`:`<div class="chat-verify warn">组队需实名，<span class="chat-go-verify">去认证</span></div>`}
    </div>
    <div class="chat-roster" id="chat-roster"></div>
    <div class="chat-msgs" id="chat-msgs"></div>
    <div class="chat-input-row">
      <input id="chat-input" class="chat-input" placeholder="说点什么…" />
      <button id="chat-send" class="chat-send" type="button">发送</button>
    </div>
    <div class="chat-actions">
      <button id="chat-show-social" class="chat-show-social" type="button">🔓 展示社交信息</button>
      <button id="chat-agree" class="chat-agree" type="button">✅ 我同意组队</button>
      <button id="chat-back" class="chat-back" type="button">← 返回</button>
    </div>
  </div></div>`);
  document.body.appendChild(modal);
  const msgs = modal.querySelector('#chat-msgs');
  const rosterEl = modal.querySelector('#chat-roster');
  function renderRoster(){
    const all=[me, ...roster];
    rosterEl.innerHTML = all.map(x=>`<span class="roster-item ${x.agreed?'agreed':''}">${x.emoji} ${escapeHtml(x.nick)} ${x.agreed?'✓':''}</span>`).join('');
  }
  function addMsg(who, text, mine){
    const d=el(`<div class="chat-msg ${mine?'mine':''}"><span class="cm-name">${escapeHtml(who)}</span><span class="cm-text">${escapeHtml(text)}</span></div>`);
    msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight;
  }
  modal.querySelector('.modal-close').addEventListener('click',()=>modal.remove());
  modal.addEventListener('click',(e)=>{ if(e.target===modal) modal.remove(); });
  const goV=modal.querySelector('.chat-go-verify'); if(goV) goV.addEventListener('click',()=>{ openVerify(modal); });
  function pickReply(m){
    const lines=[`我是${m.nick}，${m.persona||'很高兴认识'}`, `我也想去${city}！`, `这几天有空，一起呀`, `我偏好${(m.tags&&m.tags[0])?(GROUP_TAGS[m.tags[0]]||m.tags[0]):'慢慢逛'}`, `咱们聊聊细节？`];
    return lines[Math.floor(Math.random()*lines.length)];
  }
  function simulateReplies(){
    roster.forEach((m, idx)=>{ setTimeout(()=>{ if(!m._spoke){ m._spoke=true; addMsg(m.emoji+' '+m.nick, pickReply(m), false); } }, 600 + idx*500); });
  }
  function checkAll(){
    const all=[me, ...roster];
    if(all.length>0 && all.every(x=>x.agreed)){
      setTimeout(()=>{
        addMsg('系统', '全部成员已同意，建群成功 🎉', false);
        const g={ groupName, city, members: roster.map(m=>({emoji:m.emoji,nick:m.nick,age:m.age,fromCity:m.fromCity})), groupSize: all.length, meetPoint:'出发前在群里敲定集合点' };
        addTeam(groupName, city);
        setTimeout(()=>{ const done=renderGroupDone(g, {city}); modal.replaceWith(done); }, 700);
      }, 400);
    }
  }
  const agreeBtn=modal.querySelector('#chat-agree');
  agreeBtn.addEventListener('click',()=>{
    if(!verified){ addMsg('系统', '请先完成实名认证再组队～点击顶部「去认证」', false); return; }
    me.agreed=true; renderRoster(); addMsg('我', '我同意组队！', true);
    roster.forEach((m,idx)=>{ setTimeout(()=>{ if(!m.agreed){ m.agreed=true; renderRoster(); addMsg(m.emoji+' '+m.nick, '好呀，我也同意组队！', false); checkAll(); } }, 1200 + idx*900); });
    checkAll();
  });
  const input=modal.querySelector('#chat-input'), sendBtn=modal.querySelector('#chat-send');
  const doSend=()=>{ const t=input.value.trim(); if(!t) return; addMsg('我', t, true); input.value=''; };
  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown',(e)=>{ if(e.key==='Enter') doSend(); });
  modal.querySelector('#chat-back').addEventListener('click',()=>{ if(fromNode) fromNode.style.display=''; modal.remove(); });
  const showBtn=modal.querySelector('#chat-show-social');
  if(showBtn) showBtn.addEventListener('click',()=>{
    const pp=getProfile();
    const name = pp.verified ? (pp.realNameMasked||pp.realName||'已实名用户') : '（未实名）';
    const phone = pp.phone ? maskPhone(pp.phone) : '（未填电话）';
    addMsg('我（已向对方展示）', '🪪 姓名 '+name+' · 电话 '+phone, true);
    if(pp.avatarImg){ const img=el('<div class="chat-social"><img class="chat-social-photo" src="'+pp.avatarImg+'"/></div>'); msgs.appendChild(img); msgs.scrollTop=msgs.scrollHeight; }
    showBtn.disabled=true; showBtn.textContent='已展示 ✓';
  });
  renderRoster();
  addMsg('系统', `已建立与 ${roster.length} 位伙伴的沟通群，双方都同意后才能建群。`, false);
  simulateReplies();
}

// ===== 广场：发布动态 / 旅游邀请，逛逛，直接沟通 =====
const SQUARE_KEY = 'cyd_square_v1';
function loadSquare(){ try { return JSON.parse(localStorage.getItem(SQUARE_KEY)) || null; } catch(e){ return null; } }
function saveSquare(arr){ try { localStorage.setItem(SQUARE_KEY, JSON.stringify(arr)); } catch(e){} }
function seedSquare(){
  if(loadSquare()) return;
  const seed=[
    {id:'s1', author:'小野', emoji:'🦊', verified:true, dest:'成都', date:'本周末', text:'找2-3人周末去成都吃喝，主打苍蝇馆子+熊猫基地，预算800内～', time:'2小时前'},
    {id:'s2', author:'阿乐', emoji:'🐼', verified:true, dest:'杭州', date:'下周三', text:'西湖边散步+龙井村，想找个同频的一起慢游，不赶景点', time:'5小时前'},
    {id:'s3', author:'鹿鹿', emoji:'🌿', verified:false, dest:'厦门', date:'国庆', text:'厦门海岛+拍照，凑4人拼车拼住宿更划算，有去的吗', time:'1天前'},
  ];
  saveSquare(seed);
}
function openSquare(){
  seedSquare();
  const posts = loadSquare();
  const listHtml = posts.map((pst,i)=>`
    <div class="sq-post">
      <div class="sq-head"><span class="sq-avatar">${pst.emoji}</span>
        <div><div class="sq-author">${escapeHtml(pst.author)} ${pst.verified?'<span class="sq-verified">已实名</span>':''}</div>
        <div class="sq-meta">📍 ${escapeHtml(pst.dest)} · 🗓️ ${escapeHtml(pst.date)} · ${escapeHtml(pst.time)}</div></div>
      </div>
      <div class="sq-text">${escapeHtml(pst.text)}</div>
      <div class="sq-actions">
        <button class="sq-chat" type="button" data-i="${i}">💬 聊一聊</button>
        <button class="sq-join" type="button" data-i="${i}">🤝 想一起</button>
      </div>
    </div>`).join('');
  const modal=el(`<div class="modal-mask" id="sq-mask"><div class="modal square-modal">
    <button class="modal-close" type="button">×</button>
    <div class="sq-title">📣 凑一队广场</div>
    <div class="sq-sub">发动态、约同频旅伴；不知道去哪也能来逛逛，合适的直接聊</div>
    <button class="sq-publish" type="button">＋ 发布动态 / 旅游邀请</button>
    <div class="sq-list">${listHtml}</div>
  </div></div>`);
  document.body.appendChild(modal);
  modal.querySelector('.modal-close').addEventListener('click',()=>modal.remove());
  modal.addEventListener('click',(e)=>{ if(e.target===modal) modal.remove(); });
  modal.querySelector('.sq-publish').addEventListener('click',()=>openPublish(modal));
  modal.querySelectorAll('.sq-chat').forEach(b=>b.addEventListener('click',()=>{ const pst=posts[+b.dataset.i]; startSquareChat(pst); modal.remove(); }));
  modal.querySelectorAll('.sq-join').forEach(b=>b.addEventListener('click',()=>{ const pst=posts[+b.dataset.i]; startSquareChat(pst); modal.remove(); }));
}
function startSquareChat(pst){
  const member={ id:'sq', nick:pst.author, emoji:pst.emoji, age:24, fromCity:pst.dest, tags:[], spend:'normal', persona:'发布者', verified:pst.verified };
  openChat([member], `凑一队·${pst.dest}小队`, pst.dest, null);
}
function openPublish(backMask){
  const m=el(`<div class="modal-mask" id="pub-mask"><div class="modal publish-modal">
    <button class="modal-close" type="button">×</button>
    <div class="sec-title">＋ 发布到广场</div>
    <input id="pub-dest" class="vf-input" placeholder="目的地，如 成都" maxlength="20" />
    <input id="pub-date" class="vf-input" placeholder="时间，如 本周末" maxlength="20" />
    <textarea id="pub-text" class="vf-input" placeholder="说点什么：想找几个人、偏好什么、预算多少…" rows="3"></textarea>
    <div id="pub-msg" class="vf-msg"></div>
    <button id="pub-submit" class="vf-submit" type="button">发布</button>
  </div></div>`);
  document.body.appendChild(m);
  m.querySelector('.modal-close').addEventListener('click',()=>m.remove());
  m.addEventListener('click',(e)=>{ if(e.target===m) m.remove(); });
  const destI=m.querySelector('#pub-dest'), dateI=m.querySelector('#pub-date'), textI=m.querySelector('#pub-text'), msg=m.querySelector('#pub-msg'), sub=m.querySelector('#pub-submit');
  sub.addEventListener('click',()=>{
    const dest=destI.value.trim(), date=dateI.value.trim(), text=textI.value.trim();
    if(!dest||!text){ msg.textContent='请填写目的地和内容'; msg.className='vf-msg err'; return; }
    const prof=getProfile();
    const posts=loadSquare()||[];
    posts.unshift({ id:'u'+Date.now(), author:prof.nick||'我', emoji:prof.emoji||'🌱', verified:!!prof.verified, dest, date:date||'待定', text, time:'刚刚' });
    saveSquare(posts);
    m.remove();
    if(backMask) backMask.remove();
    openSquare();
  });
}

// ===== 个人主页扩展：真实照片/旅游照片/经历 + 隐私隐藏 + 社交信息渐进披露 =====
function maskPhone(phone){
  phone=(phone||'').trim();
  const d=phone.replace(/\D/g,'');
  if(d.length>=7) return d.slice(0,3)+'****'+d.slice(-4);
  if(d.length>=4) return d.slice(0,2)+'***'+d.slice(-2);
  return phone;
}
function compressImage(file, maxW=480, quality=0.72){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>{ const img=new Image(); img.onload=()=>{
      const scale=Math.min(1, maxW/(img.width||maxW));
      const w=Math.round((img.width||maxW)*scale), h=Math.round((img.height||maxW)*scale);
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg', quality));
    }; img.onerror=rej; img.src=fr.result; };
    fr.onerror=rej; fr.readAsDataURL(file);
  });
}
function openProfile(){
  const raw=getProfile();
  if(!raw.hidden) raw.hidden={};
  if(!Array.isArray(raw.travelPhotos)) raw.travelPhotos=[];
  if(typeof raw.phone!=='string') raw.phone='';
  saveProfile(raw);
  const p=raw;
  const tagsHtml=(p.tags&&p.tags.length?p.tags:[]).map(t=>`<span class="pf-tag">${GROUP_TAGS[t]||t}</span>`).join('')||'<span class="pf-empty">还没设置兴趣，去凑一队会自动记录</span>';
  const citiesHtml=(p.cities||[]).map(c=>`<span class="pf-chip">${escapeHtml(c)}</span>`).join('')||'<span class="pf-empty">还没有出行记录，规划第一程吧</span>';
  const teamsHtml=(p.teams&&p.teams.length)?p.teams.map(t=>`<li>🤝 ${escapeHtml(t.name)} <span class="pf-dim">· ${escapeHtml(t.city)} · ${t.date}</span></li>`).join(''):'<li class="pf-empty">还没有组队记录，凑一队试试？</li>';
  const verifyHtml=p.verified?`<span class="pf-badge ok">✅ 已实名 · ${escapeHtml(p.realNameMasked||'')}</span>`:`<button class="pf-verify-btn" type="button">🔐 实名认证（可选）</button>`;
  const socialName = p.verified?escapeHtml(p.realNameMasked||'已实名'):'未实名';
  const socialPhone = p.phone?maskPhone(p.phone):'未填写';
  const travelHidden = p.hidden.travel;
  const bioHidden = p.hidden.bio;
  const modal=el(`<div class="modal-mask" id="pf-mask"><div class="modal profile-modal">
    <button class="modal-close" type="button">×</button>
    <div class="pf-head">
      <div class="pf-avatar-wrap">
        ${p.avatarImg?`<img class="pf-photo" src="${p.avatarImg}"/>`:`<div class="pf-avatar" id="pf-avatar">${p.emoji}</div>`}
        <label class="pf-upload" title="上传真实照片">📷<input id="pf-photo-input" type="file" accept="image/*" hidden /></label>
      </div>
      <input class="pf-nick" id="pf-nick" value="${escapeHtml(p.nick)}" maxlength="12" />
      <div class="pf-emoji-switch" id="pf-emoji-switch">换头像</div>
    </div>
    <div class="pf-row"><span class="pf-k">实名</span>${verifyHtml}</div>
    <div class="pf-section"><div class="pf-sec-title">🪪 社交信息 <span class="pf-lock">🔒 沟通合适后再向对方展示</span></div>
      <div class="pf-social">
        <div class="pf-row"><span class="pf-k">姓名</span><span>${socialName}</span></div>
        <div class="pf-row"><span class="pf-k">电话</span><span>${socialPhone}</span> <input id="pf-phone" class="pf-phone-input" placeholder="填电话（将脱敏）" value="${escapeHtml(p.phone||'')}" maxlength="20"/></div>
      </div>
    </div>
    <div class="pf-section"><div class="pf-sec-title">🖼️ 旅游照片 ${travelHidden?'<span class="pf-hide-tag">已隐藏</span>':'<span class="pf-show-tag">公开</span>'}<button class="pf-eye" id="pf-eye-travel" type="button" title="隐藏/公开">${travelHidden?'👁️':'🙈'}</button></div>
      <div class="pf-travel-list">${(p.travelPhotos&&p.travelPhotos.length)?p.travelPhotos.map(src=>`<img class="pf-travel" src="${src}"/>`).join(''):'<span class="pf-empty">还没有旅游照片</span>'}</div>
      <label class="pf-upload-btn">＋ 添加旅游照片<input id="pf-travel-input" type="file" accept="image/*" multiple hidden /></label>
    </div>
    <div class="pf-section"><div class="pf-sec-title">📝 我的经历 ${bioHidden?'<span class="pf-hide-tag">已隐藏</span>':'<span class="pf-show-tag">公开</span>'}<button class="pf-eye" id="pf-eye-bio" type="button" title="隐藏/公开">${bioHidden?'👁️':'🙈'}</button></div>
      <textarea id="pf-bio" class="pf-bio-input" placeholder="写写你的旅行经历、风格、去过哪、想约去哪…">${escapeHtml(p.bio||'')}</textarea>
    </div>
    <div class="pf-section"><div class="pf-sec-title">🎯 我的兴趣</div><div class="pf-tags">${tagsHtml}</div></div>
    <div class="pf-section"><div class="pf-sec-title">🗺️ 出行足迹</div><div class="pf-chips">${citiesHtml}</div></div>
    <div class="pf-section"><div class="pf-sec-title">🤝 我的小队</div><ul class="pf-teams">${teamsHtml}</ul></div>
    <div class="pf-tip">真实信息更利于找到同频伙伴；照片与经历可随时隐藏，社交信息（姓名/电话/照片）仅在沟通合适后向对方展示。</div>
  </div></div>`);
  document.body.appendChild(modal);
  modal.querySelector('.modal-close').addEventListener('click',()=>modal.remove());
  modal.addEventListener('click',(e)=>{ if(e.target===modal) modal.remove(); });
  modal.querySelector('#pf-emoji-switch').addEventListener('click',()=>{ const np=getProfile(); let i=PF_EMOJIS.indexOf(np.emoji); i=(i+1)%PF_EMOJIS.length; np.emoji=PF_EMOJIS[i]; saveProfile(np); const av=modal.querySelector('#pf-avatar'); if(av) av.textContent=np.emoji; });
  const nick=modal.querySelector('#pf-nick'); nick.addEventListener('change',()=>{ const np=getProfile(); np.nick=nick.value.trim()||'我'; saveProfile(np); });
  const vb=modal.querySelector('.pf-verify-btn'); if(vb) vb.addEventListener('click',()=>openVerify(modal));
  const photoInput=modal.querySelector('#pf-photo-input');
  photoInput.addEventListener('change', async ()=>{ const f=photoInput.files&&photoInput.files[0]; if(!f) return; try{ const data=await compressImage(f); const np=getProfile(); np.avatarImg=data; saveProfile(np); modal.remove(); openProfile(); }catch(e){ alert('照片读取失败'); } });
  const travelInput=modal.querySelector('#pf-travel-input');
  travelInput.addEventListener('change', async ()=>{ const files=Array.from(travelInput.files||[]); if(!files.length) return; const np=getProfile(); np.travelPhotos=np.travelPhotos||[]; for(const f of files){ try{ const d=await compressImage(f); np.travelPhotos.push(d); }catch(e){} } saveProfile(np); modal.remove(); openProfile(); });
  const bio=modal.querySelector('#pf-bio'); bio.addEventListener('change',()=>{ const np=getProfile(); np.bio=bio.value.trim(); saveProfile(np); });
  const phoneI=modal.querySelector('#pf-phone'); phoneI.addEventListener('change',()=>{ const np=getProfile(); np.phone=phoneI.value.trim(); saveProfile(np); });
  const eyeT=modal.querySelector('#pf-eye-travel'); if(eyeT) eyeT.addEventListener('click',()=>{ const np=getProfile(); np.hidden=np.hidden||{}; np.hidden.travel=!np.hidden.travel; saveProfile(np); modal.remove(); openProfile(); });
  const eyeB=modal.querySelector('#pf-eye-bio'); if(eyeB) eyeB.addEventListener('click',()=>{ const np=getProfile(); np.hidden=np.hidden||{}; np.hidden.bio=!np.hidden.bio; saveProfile(np); modal.remove(); openProfile(); });
}

// ===== 登录设置：微信 / 手机号 / 邮箱，均需实名 + 绑定手机号 =====
function openLogin(){
  const prof = getProfile();
  if(prof.loggedIn){
    const m=el(`<div class="modal-mask" id="login-mask"><div class="modal login-modal">
      <button class="modal-close" type="button">×</button>
      <div class="sec-title">✅ 已登录</div>
      <div class="login-info">登录方式：${escapeHtml(prof.loginType||'—')}<br/>已绑定手机：${escapeHtml(prof.phone||'—')}<br/>实名：${prof.verified?'已实名 · '+escapeHtml(prof.realNameMasked||''):'未实名'}</div>
      <button class="vf-submit" id="login-out" type="button">退出登录</button>
    </div></div>`);
    document.body.appendChild(m);
    m.querySelector('.modal-close').addEventListener('click',()=>m.remove());
    m.addEventListener('click',(e)=>{ if(e.target===m) m.remove(); });
    m.querySelector('#login-out').addEventListener('click',()=>{ const np=getProfile(); np.loggedIn=false; np.loginType=null; saveProfile(np); m.remove(); updateLoginBtn(); });
    return;
  }
  const data={ type:null, nick:null, email:null, phone:null, realName:null, realNameMasked:null };
  const m=el(`<div class="modal-mask" id="login-mask"><div class="modal login-modal">
    <button class="modal-close" type="button">×</button>
    <div class="sec-title">🔐 登录凑一队</div>
    <div class="login-sub">无论微信 / 手机号 / 邮箱，都需完成 <b>实名认证</b> + <b>绑定手机号</b></div>
    <div id="login-body"></div>
  </div></div>`);
  document.body.appendChild(m);
  m.querySelector('.modal-close').addEventListener('click',()=>m.remove());
  m.addEventListener('click',(e)=>{ if(e.target===m) m.remove(); });
  const body=m.querySelector('#login-body');
  function render(){
    if(!data.type){
      body.innerHTML = ['<button class="login-opt" data-t="wechat" type="button">💬 微信登录</button>',
        '<button class="login-opt" data-t="phone" type="button">📱 手机号登录</button>',
        '<button class="login-opt" data-t="email" type="button">✉️ 邮箱登录</button>'].join('');
      body.querySelectorAll('.login-opt').forEach(b=>b.addEventListener('click',()=>{ data.type=b.dataset.t; render(); }));
      return;
    }
    if(data.type==='wechat' && !data.nick){
      body.innerHTML = '<div class="login-step">微信授权中…<br/><button class="vf-submit" id="wx-go" type="button">模拟微信授权</button></div>';
      body.querySelector('#wx-go').addEventListener('click',()=>{ data.nick='微信用户'+Math.floor(Math.random()*9000+1000); render(); });
      return;
    }
    if(data.type==='phone' && !data.phone){
      body.innerHTML = '<div class="login-step">手机号：<input id="lg-phone" class="vf-input" placeholder="11位手机号" maxlength="11"/><br/>验证码（演示：123456）：<input id="lg-code" class="vf-input" placeholder="6位验证码" maxlength="6"/><div id="lg-msg" class="vf-msg"></div><button class="vf-submit" id="lg-next" type="button">下一步</button></div>';
      const ph=body.querySelector('#lg-phone'), cd=body.querySelector('#lg-code'), msg=body.querySelector('#lg-msg');
      body.querySelector('#lg-next').addEventListener('click',()=>{
        if(!/^1\d{10}$/.test(ph.value.trim())){ msg.textContent='手机号格式不正确'; msg.className='vf-msg err'; return; }
        if(cd.value.trim()!=='123456'){ msg.textContent='验证码错误（演示用 123456）'; msg.className='vf-msg err'; return; }
        data.phone=ph.value.trim(); render();
      });
      return;
    }
    if(data.type==='email' && !data.email){
      body.innerHTML = '<div class="login-step">邮箱：<input id="lg-email" class="vf-input" placeholder="you@example.com"/><br/>验证码（演示：123456）：<input id="lg-code" class="vf-input" placeholder="6位验证码" maxlength="6"/><div id="lg-msg" class="vf-msg"></div><button class="vf-submit" id="lg-next" type="button">下一步</button></div>';
      const em=body.querySelector('#lg-email'), cd=body.querySelector('#lg-code'), msg=body.querySelector('#lg-msg');
      body.querySelector('#lg-next').addEventListener('click',()=>{
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value.trim())){ msg.textContent='邮箱格式不正确'; msg.className='vf-msg err'; return; }
        if(cd.value.trim()!=='123456'){ msg.textContent='验证码错误（演示用 123456）'; msg.className='vf-msg err'; return; }
        data.email=em.value.trim(); render();
      });
      return;
    }
    if(data.type!=='phone' && !data.phone){
      body.innerHTML = '<div class="login-step">还需绑定手机号：<input id="lg-phone" class="vf-input" placeholder="11位手机号" maxlength="11"/><br/>验证码（演示：123456）：<input id="lg-code" class="vf-input" placeholder="6位验证码" maxlength="6"/><div id="lg-msg" class="vf-msg"></div><button class="vf-submit" id="lg-next" type="button">下一步</button></div>';
      const ph=body.querySelector('#lg-phone'), cd=body.querySelector('#lg-code'), msg=body.querySelector('#lg-msg');
      body.querySelector('#lg-next').addEventListener('click',()=>{
        if(!/^1\d{10}$/.test(ph.value.trim())){ msg.textContent='手机号格式不正确'; msg.className='vf-msg err'; return; }
        if(cd.value.trim()!=='123456'){ msg.textContent='验证码错误（演示用 123456）'; msg.className='vf-msg err'; return; }
        data.phone=ph.value.trim(); render();
      });
      return;
    }
    if(!data.realName){
      body.innerHTML = '<div class="login-step">实名认证（必填）：<br/>真实姓名：<input id="lg-name" class="vf-input" placeholder="真实姓名" maxlength="20"/><br/>身份证号：<input id="lg-id" class="vf-input" placeholder="18位身份证号" maxlength="18"/><div id="lg-msg" class="vf-msg"></div><button class="vf-submit" id="lg-next" type="button">完成登录</button></div>';
      const nm=body.querySelector('#lg-name'), idI=body.querySelector('#lg-id'), msg=body.querySelector('#lg-msg');
      body.querySelector('#lg-next').addEventListener('click',()=>{
        const name=nm.value.trim(); const v=validateIdCard(idI.value);
        if(!name){ msg.textContent='请填写真实姓名'; msg.className='vf-msg err'; return; }
        if(!v.ok){ msg.textContent='⚠️ '+v.msg; msg.className='vf-msg err'; return; }
        data.realName=name; data.realNameMasked=maskName(name); finishLogin();
      });
      return;
    }
  }
  function finishLogin(){
    const np=getProfile();
    np.loggedIn=true; np.loginType=(data.type==='wechat'?'微信':data.type==='phone'?'手机号':'邮箱'); np.phone=data.phone; np.verified=true; np.realName=data.realName; np.realNameMasked=data.realNameMasked;
    saveProfile(np);
    m.remove(); updateLoginBtn();
    openProfile();
  }
  render();
}
function updateLoginBtn(){
  const b=document.getElementById('login-btn'); if(!b) return;
  const p=getProfile();
  b.textContent = p.loggedIn ? '已登录' : '登录';
}
