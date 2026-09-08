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
// ===== 对话持久化：多页面切换后保留已生成的行程 =====
const CHAT_KEY = 'cyd_chat_v1';
const LASTPLAN_KEY = 'cyd_lastplan_v1';
function persistChat(){ if(chat) { try { localStorage.setItem(CHAT_KEY, chat.innerHTML); } catch(e){} } }
function loadLastPlan(){ try { return JSON.parse(localStorage.getItem(LASTPLAN_KEY)); } catch(e){ return null; } }
function restoreChat(){
  if(!chat) return;
  let saved=null; try { saved=localStorage.getItem(CHAT_KEY); } catch(e){}
  if(!saved) return;
  chat.innerHTML = saved;
  const lp = loadLastPlan();
  if(lp && lp.plan){
    chat.querySelectorAll('.group-form, .match-result').forEach(n=>{
      const gf = renderGroupForm(lp.plan, lp.text||'');
      n.replaceWith(gf);
      attachGroupForm(gf, lp.plan, lp.text||'');
    });
  }
}
function maskName(name){ name=(name||'').trim(); if(name.length<=1) return name; if(name.length===2) return name[0]+'*'; return name[0]+'*'.repeat(name.length-2)+name[name.length-1]; }
// ===== 互通通讯录：组队双方同意后，互相持久展示真实信息 =====
const CONN_KEY = 'cyd_connections_v1';
function loadConnections(){ try { return JSON.parse(localStorage.getItem(CONN_KEY)) || []; } catch(e){ return []; } }
function saveConnections(arr){ try { localStorage.setItem(CONN_KEY, JSON.stringify(arr)); } catch(e){} }
function hashStrLocal(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function rngFrom(seed){ let a=hashStrLocal(seed)||1; return function(){ a|=0; a=(a+0x6d2b79f5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
const SURNAMES=['张','王','李','赵','陈','刘','杨','黄','周','吴','徐','孙','马','朱','胡','林','郭','何','高','罗'];
const GIVEN=['一','晨','欣','宇','宁','然','悦','昊','瑶','航','桐','睿','安','予','辰','乐','可','川','南','星'];
function genPartnerReal(seed){
  const rnd=rngFrom(seed);
  const surname=SURNAMES[Math.floor(rnd()*SURNAMES.length)];
  const glen=1+Math.floor(rnd()*2);
  let given=''; for(let i=0;i<glen;i++) given+=GIVEN[Math.floor(rnd()*GIVEN.length)];
  const realName=surname+given;
  let phone='1'+(3+Math.floor(rnd()*7));
  for(let i=0;i<9;i++) phone+=Math.floor(rnd()*10);
  return { realName, realNameMasked:maskName(realName), phone, phoneMasked:maskPhone(phone) };
}
function addConnection(groupName, city, members){
  const list=loadConnections();
  const now=new Date().toISOString().slice(0,10);
  (members||[]).forEach(m=>{
    const seed=(m.nick||'')+'-'+(city||'')+'-'+(m.age||'');
    if(list.some(c=>c.nick===m.nick && c.city===city && c.groupName===groupName)) return;
    const real=genPartnerReal(seed);
    list.push({ id:'c'+hashStrLocal(seed+(m.fromCity||'')), groupName, city, nick:m.nick, emoji:m.emoji, age:m.age, fromCity:m.fromCity, tags:m.tags||[], spend:m.spend||'normal', persona:m.persona||'', realName:real.realName, realNameMasked:real.realNameMasked, phone:real.phone, phoneMasked:real.phoneMasked, connectedAt:now });
  });
  saveConnections(list);
}
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
function requireVerify(cb){
  const p=getProfile();
  if(p.verified){ cb(); return; }
  openVerify(null, cb);
}
// 人脸核身实名（Web MVP 演示级）：真实调用摄像头采集活体自拍；真实身份比对需后端，此处模拟通过。
function doFaceVerify(onDone){
  const prof=getProfile();
  if(prof.verified){ if(onDone) onDone(); return; }
  const m=el(`<div class="modal-mask" id="v-mask"><div class="modal verify-modal">
    <button class="modal-close" type="button" aria-label="关闭">×</button>
    <div class="sec-title">🔐 实名认证（必填）· 人脸核身</div>
    <div class="vf-tip"><b>实名认证为必填项</b>：发布动态、分享好地方、凑一队组队前都需先完成，用于保障组队安全与真实沟通。<br/>认证方式：<b>人脸核身</b>——开启摄像头完成活体采集。本 MVP 为演示版，仅做本地活体采集，不会真实上传或存储证件信息；真实身份比对（微信/支付宝核身）将在小程序 / App 阶段接入。</div>
    <div class="vf-field"><label>真实姓名（用于实名展示）</label><input id="vf-name" class="vf-input" placeholder="真实姓名" maxlength="20" /></div>
    <div class="vf-cam">
      <div class="vf-cam-stage">
        <video id="vf-video" class="vf-video" autoplay playsinline muted style="display:none"></video>
        <img id="vf-prev" class="vf-prev" alt="活体照" style="display:none" />
        <div id="vf-cam-hint" class="vf-cam-hint">📷 点击下方「开启摄像头」进行人脸核身</div>
      </div>
      <div class="vf-cam-btns">
        <button id="vf-cam-on" class="vf-sub" type="button">开启摄像头</button>
        <button id="vf-cam-shot" class="vf-sub" type="button" disabled>拍照核身</button>
      </div>
      <div id="vf-cam-msg" class="vf-msg"></div>
    </div>
    <div id="vf-msg" class="vf-msg"></div>
    <button id="vf-submit" class="vf-submit" type="button" disabled>提交认证</button>
  </div></div>`);
  document.body.appendChild(m);
  const xcv=m.querySelector('.modal-close'); if(xcv) xcv.addEventListener('click',stopCam);
  m.addEventListener('click',(e)=>{ if(e.target===m){ stopCam(); m.remove(); } });
  const nameI=m.querySelector('#vf-name');
  const video=m.querySelector('#vf-video');
  const prev=m.querySelector('#vf-prev');
  const hint=m.querySelector('#vf-cam-hint');
  const camOn=m.querySelector('#vf-cam-on');
  const camShot=m.querySelector('#vf-cam-shot');
  const camMsg=m.querySelector('#vf-cam-msg');
  const msg=m.querySelector('#vf-msg');
  const submit=m.querySelector('#vf-submit');
  let stream=null, faceOk=false;
  function stopCam(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } }
  function refresh(){ submit.disabled = !(nameI.value.trim() && faceOk); }
  function addSimBtn(){
    if(m.querySelector('#vf-cam-sim')) return;
    const sim=el('<button id="vf-cam-sim" class="vf-sub" type="button" style="margin-left:8px">模拟核身通过</button>');
    camOn.parentNode.appendChild(sim);
    sim.addEventListener('click',()=>{
      faceOk=true; prev.style.display='none'; video.style.display='none';
      hint.style.display='block'; hint.textContent='✅ 活体检测通过（演示）';
      camMsg.textContent='已模拟活体检测通过'; camMsg.className='vf-msg ok'; refresh();
    });
  }
  camOn.addEventListener('click',()=>{
    camMsg.textContent=''; camMsg.className='vf-msg';
    const md=navigator.mediaDevices;
    if(!md || !md.getUserMedia){ camMsg.textContent='⚠️ 当前环境不支持摄像头（需 HTTPS / localhost）。演示可点「模拟核身通过」继续。'; camMsg.className='vf-msg err'; addSimBtn(); return; }
    md.getUserMedia({ video:{facingMode:'user'}, audio:false }).then(st=>{
      stream=st; video.srcObject=st; video.style.display='block'; hint.style.display='none';
      camOn.disabled=true; camShot.disabled=false;
    }).catch(err=>{
      camMsg.textContent='⚠️ 无法访问摄像头（'+(err&&err.name||'权限不足')+'）。演示可点「模拟核身通过」继续。'; camMsg.className='vf-msg err'; addSimBtn();
    });
  });
  camShot.addEventListener('click',()=>{
    try{
      const c=document.createElement('canvas');
      const vw=video.videoWidth||320, vh=video.videoHeight||240;
      const scale=Math.min(1, 240/vw); c.width=Math.round(vw*scale); c.height=Math.round(vh*scale);
      c.getContext('2d').drawImage(video,0,0,c.width,c.height);
      const url=c.toDataURL('image/jpeg',0.6);
      prev.src=url; prev.style.display='block'; video.style.display='none';
      faceOk=true; hint.style.display='block'; hint.textContent='✅ 活体采集成功，检测通过（演示）';
      camMsg.textContent='活体采集成功'; camMsg.className='vf-msg ok';
      stopCam(); camOn.disabled=false; camShot.disabled=true;
      const np=getProfile(); np._faceDemo=url; saveProfile(np);
      refresh();
    }catch(e){ camMsg.textContent='拍照失败：'+(e&&e.message||e); camMsg.className='vf-msg err'; }
  });
  nameI.addEventListener('input',refresh);
  submit.addEventListener('click',()=>{
    const name=nameI.value.trim();
    if(!name){ msg.textContent='请填写真实姓名'; msg.className='vf-msg err'; return; }
    if(!faceOk){ msg.textContent='请先完成人脸核身'; msg.className='vf-msg err'; return; }
    const np=getProfile();
    np.verified=true; np.realName=name; np.realNameMasked=maskName(name);
    np.verifiedAt=new Date().toISOString().slice(0,10); np.verifyMethod='face';
    saveProfile(np);
    stopCam(); m.remove();
    if(onDone) onDone();
  });
  refresh();
}
function openVerify(parentMask, onDone){
  if(getProfile().verified){ if(onDone) onDone(); else openProfile(); return; }
  doFaceVerify(()=>{ if(parentMask) parentMask.remove(); if(onDone) onDone(); else openProfile(); });
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function addUser(text) {
  chat.appendChild(el(`<div class="msg user"><div class="avatar">你</div><div class="bubble">${escapeHtml(text)}</div></div>`));
  scroll();
  persistChat();
}
function addBot(node) {
  const m = el(`<div class="msg bot"><div class="avatar">凑</div><div class="bubble"></div></div>`);
  m.querySelector('.bubble').appendChild(node);
  chat.appendChild(m);
  scroll();
  persistChat();
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
        try { localStorage.setItem(LASTPLAN_KEY, JSON.stringify({ plan: p, text })); } catch(e){}
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

if (sendBtn) sendBtn.addEventListener('click', () => send(input.value));
if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(input.value); });
document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => send(c.textContent)));
const loginBtn = document.getElementById('login-btn');
if (loginBtn) loginBtn.addEventListener('click', openLogin);
updateLoginBtn();

// 页面感知初始化已移至文件末尾（openSquare/openGood 依赖的 SQUARE_KEY/GOOD_KEY 在下方 const 定义，提前调用会触发 TDZ 导致整页白屏）


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
    if(!getProfile().verified){ openVerify(null); return; }
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
    <div class="chat-head">
      <button class="modal-close chat-x" type="button" aria-label="关闭">×</button>
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
  const goV=modal.querySelector('.chat-go-verify'); if(goV) goV.addEventListener('click',()=>{ openVerify(null); });
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
        addConnection(groupName, city, roster);
        setTimeout(()=>{ const done=renderGroupDone(g, {city}); modal.replaceWith(done); }, 700);
      }, 400);
    }
  }
  const agreeBtn=modal.querySelector('#chat-agree');
  agreeBtn.addEventListener('click',()=>{
    if(!verified){ addMsg('系统', '请先完成实名认证再组队～', false); openVerify(null); return; }
    me.agreed=true; renderRoster(); addMsg('我', '我同意组队！', true);
    roster.forEach((m,idx)=>{ setTimeout(()=>{ if(!m.agreed){ m.agreed=true; renderRoster(); addMsg(m.emoji+' '+m.nick, '好呀，我也同意组队！', false); checkAll(); } }, 1200 + idx*900); });
    checkAll();
  });
  const input=modal.querySelector('#chat-input'), sendBtn=modal.querySelector('#chat-send');
  const doSend=()=>{ const t=input.value.trim(); if(!t) return; addMsg('我', t, true); input.value=''; };
  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown',(e)=>{ if(e.key==='Enter') doSend(); });
  modal.querySelector('#chat-back').addEventListener('click',()=>{ if(fromNode) fromNode.style.display=''; modal.remove(); });
  const chatX=modal.querySelector('.chat-x'); if(chatX) chatX.addEventListener('click',()=>{ if(fromNode) fromNode.style.display=''; modal.remove(); });
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
    {id:'s1', author:'小野', emoji:'🦊', verified:true, dest:'成都', date:'本周末', text:'找2-3人周末去成都吃喝，主打苍蝇馆子+熊猫基地，预算800内～', time:'2小时前', status:'approved'},
    {id:'s2', author:'阿乐', emoji:'🐼', verified:true, dest:'杭州', date:'下周三', text:'西湖边散步+龙井村，想找个同频的一起慢游，不赶景点', time:'5小时前', status:'approved'},
    {id:'s3', author:'鹿鹿', emoji:'🌿', verified:false, dest:'厦门', date:'国庆', text:'厦门海岛+拍照，凑4人拼车拼住宿更划算，有去的吗', time:'1天前', status:'approved'},
  ];
  saveSquare(seed);
}
function verifyGateBanner(target){
  const p=getProfile();
  if(p.verified) return '';
  return `<div class="verify-gate" id="vg-banner"><span>⚠️ 发布与组队前需先完成<b>实名认证</b></span><button class="vg-btn" type="button" id="vg-go">去认证</button></div>`;
}
function openSquare(){
  seedSquare();
  const posts = loadSquare();
  const listHtml = posts.map((pst,i)=>`
    <div class="sq-post ${pst.status==='pending'?'pending':''}">
      <div class="sq-head"><span class="sq-avatar">${pst.emoji}</span>
        <div><div class="sq-author">${escapeHtml(pst.author)} ${pst.verified?'<span class="sq-verified">已实名</span>':''}</div>
        <div class="sq-meta">📍 ${escapeHtml(pst.dest)} · 🗓️ ${escapeHtml(pst.date)} · ${escapeHtml(pst.time)}</div></div>
        ${statusBadge(pst.status)}
      </div>
      ${pst.media? (pst.media.type==='image'?`<img class="post-media" src="${pst.media.src}"/>`:`<video class="post-media" controls src="${pst.media.src}"></video>`):''}
      <div class="sq-text">${escapeHtml(pst.text)}</div>
      <div class="sq-actions">
        <button class="sq-chat" type="button" data-i="${i}" ${pst.status==='pending'?'disabled':''}>💬 聊一聊</button>
        <button class="sq-join" type="button" data-i="${i}" ${pst.status==='pending'?'disabled':''}>🤝 想一起</button>
      </div>
    </div>`).join('');
  const body=document.getElementById('square-body');
  body.innerHTML = `<div class="sq-title">📣 凑一队广场</div>
    <div class="sq-sub">发动态、约同频旅伴；不知道去哪也能来逛逛，合适的直接聊</div>
    ${verifyGateBanner('square')}
    <button class="sq-publish" id="sq-publish" type="button">＋ 发布动态 / 旅游邀请</button>
    <div class="sq-list">${listHtml}</div>
    <button class="fab" id="sq-fab" type="button" aria-label="发布">＋</button>`;
  body.querySelector('#sq-publish').addEventListener('click',()=>requireVerify(()=>openPublish(null)));
  const fab=body.querySelector('#sq-fab'); if(fab) fab.addEventListener('click',()=>requireVerify(()=>openPublish(null)));
  const vg=body.querySelector('#vg-go'); if(vg) vg.addEventListener('click',()=>requireVerify(()=>openSquare()));
  body.querySelectorAll('.sq-chat').forEach(b=>b.addEventListener('click',()=>{ if(b.disabled) return; const pst=posts[+b.dataset.i]; startSquareChat(pst); }));
  body.querySelectorAll('.sq-join').forEach(b=>b.addEventListener('click',()=>{ if(b.disabled) return; const pst=posts[+b.dataset.i]; startSquareChat(pst); }));
}
function startSquareChat(pst){
  const member={ id:'sq', nick:pst.author, emoji:pst.emoji, age:24, fromCity:pst.dest, tags:[], spend:'normal', persona:'发布者', verified:pst.verified };
  openChat([member], `凑一队·${pst.dest}小队`, pst.dest, null);
}
function openPublish(backMask){
  const m=el(`<div class="modal-mask" id="pub-mask"><div class="modal publish-modal">
    <button class="modal-close" type="button" aria-label="关闭">×</button>
    <div class="sec-title">＋ 发布到广场</div>
    <div class="vf-tip">支持<b>文字 / 图片 / 视频</b>。发布后需经<b>审核</b>，审核中仅自己可见，通过后公开展示。</div>
    <input id="pub-dest" class="vf-input" placeholder="目的地，如 成都" maxlength="20" />
    <input id="pub-date" class="vf-input" placeholder="时间，如 本周末" maxlength="20" />
    <textarea id="pub-text" class="vf-input" placeholder="说点什么：想找几个人、偏好什么、预算多少…" rows="3"></textarea>
    <label class="vf-file"><input id="pub-media" type="file" accept="image/*,video/*" hidden />📎 添加图片 / 视频</label>
    <div id="pub-prev" class="pub-prev"></div>
    <div id="pub-msg" class="vf-msg"></div>
    <button id="pub-submit" class="vf-submit" type="button">提交审核并发布</button>
  </div></div>`);
  document.body.appendChild(m);
  const xc=m.querySelector('.modal-close'); if(xc) xc.addEventListener('click',()=>m.remove());
  m.addEventListener('click',(e)=>{ if(e.target===m) m.remove(); });
  const destI=m.querySelector('#pub-dest'), dateI=m.querySelector('#pub-date'), textI=m.querySelector('#pub-text'), mediaI=m.querySelector('#pub-media'), prev=m.querySelector('#pub-prev'), msg=m.querySelector('#pub-msg'), sub=m.querySelector('#pub-submit');
  let media=null;
  mediaI.addEventListener('change',()=>{ const f=mediaI.files&&mediaI.files[0]; if(!f) return; readMedia(f).then(md=>{ media=md; prev.innerHTML = md.type==='image'?`<img class="pub-thumb" src="${md.src}"/>`:`<video class="pub-thumb" src="${md.src}" controls></video>`; }).catch(()=>{ msg.textContent='媒体读取失败'; msg.className='vf-msg err'; }); });
  sub.addEventListener('click',()=>{
    const dest=destI.value.trim(), date=dateI.value.trim(), text=textI.value.trim();
    if(!dest||!text){ msg.textContent='请填写目的地和内容'; msg.className='vf-msg err'; return; }
    const prof=getProfile();
    const id='u'+Date.now();
    const post={ id, author:prof.nick||'我', emoji:prof.emoji||'🌱', verified:!!prof.verified, dest, date:date||'待定', text, media, status:'pending', time:'刚刚' };
    let list=loadSquare()||[]; list.unshift(post);
    try { saveSquare(list); }
    catch(e){ post.media=null; list[0]=post; saveSquare(list); toast('视频过大未保存，已发布文字内容'); }
    m.remove(); if(backMask) backMask.remove();
    openSquare(); toast('已提交，等待审核 ⏳'); simulateReview('square', id, openSquare);
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
// 读取图片/视频媒体：图片压缩为 dataURL，视频读为 dataURL（过大标记 big）
function readMedia(file){
  return new Promise((res,rej)=>{
    if(!file) return rej(new Error('no file'));
    if(file.type.startsWith('image/')){
      compressImage(file, 720, 0.7).then(d=>res({type:'image', src:d, name:file.name})).catch(rej);
    } else {
      const fr=new FileReader();
      fr.onload=()=>res({type:'video', src:fr.result, name:file.name, big: fr.result.length>1500000});
      fr.onerror=rej; fr.readAsDataURL(file);
    }
  });
}
// 审核状态徽章
function statusBadge(status){
  if(status==='pending') return '<span class="pf-status pending">⏳ 审核中</span>';
  if(status==='approved') return '<span class="pf-status ok">✅ 已通过</span>';
  return '';
}
// 轻提示
let _toastTimer=null;
function toast(msg){
  let t=document.getElementById('cyd-toast');
  if(!t){ t=document.createElement('div'); t.id='cyd-toast'; t.className='cyd-toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  clearTimeout(_toastTimer); _toastTimer=setTimeout(()=>t.classList.remove('show'), 2600);
}
// 演示版审核：4 秒后把 pending 改为 approved 并重渲染
function simulateReview(kind, id, rerender){
  setTimeout(()=>{
    const get = kind==='square'? loadSquare : loadGood;
    const set = kind==='square'? saveSquare : saveGood;
    const list = get()||[];
    const item = list.find(x=>x.id===id);
    if(item && item.status==='pending'){ item.status='approved'; set(list); rerender(); toast('✅ 内容已通过审核，已公开展示'); }
  }, 4000);
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
  const verifyHtml=p.verified?`<span class="pf-badge ok">✅ 已实名 · ${escapeHtml(p.realNameMasked||'')}</span>`:`<button class="pf-verify-btn" type="button">🔐 实名认证（必填）</button>`;
  const socialName = p.verified?escapeHtml(p.realNameMasked||'已实名'):'未实名';
  const socialPhone = p.phone?maskPhone(p.phone):'未填写';
  const travelHidden = p.hidden.travel;
  const bioHidden = p.hidden.bio;
  const conns=loadConnections();
  const connHtml = conns.length ? conns.map((c,i)=>`<div class="pf-conn" data-i="${i}"><span class="pf-conn-emoji">${c.emoji}</span><div class="pf-conn-main"><div class="pf-conn-name">${escapeHtml(c.nick)} <span class="pf-conn-real">${escapeHtml(c.realNameMasked)}</span> <span class="pf-verified">已互通</span></div><div class="pf-conn-meta">${c.age}岁 · 从${escapeHtml(c.fromCity)}出发 · ${escapeHtml(c.city)}小队</div></div><span class="pf-conn-arrow">›</span></div>`).join('') : '<div class="pf-empty">还没有互通的队友。组队双方都同意后，真实信息会自动显示在这里～</div>';
  const me=document.getElementById('me-body');
  if(!me) return;
  me.innerHTML = `<div class="profile-view">
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
    <div class="pf-section"><div class="pf-sec-title">🪪 已互通队友 <span class="pf-lock">组队双方同意后自动展示真实信息</span></div>
      <div class="pf-conns">${connHtml}</div>
    </div>
    <div class="pf-tip">真实信息更利于找到同频伙伴；照片与经历可随时隐藏，社交信息（姓名/电话/照片）仅在沟通合适后向对方展示。</div>
  </div>`;
  me.querySelector('#pf-emoji-switch').addEventListener('click',()=>{ const np=getProfile(); let i=PF_EMOJIS.indexOf(np.emoji); i=(i+1)%PF_EMOJIS.length; np.emoji=PF_EMOJIS[i]; saveProfile(np); const av=me.querySelector('#pf-avatar'); if(av) av.textContent=np.emoji; });
  const nick=me.querySelector('#pf-nick'); nick.addEventListener('change',()=>{ const np=getProfile(); np.nick=nick.value.trim()||'我'; saveProfile(np); });
  const vb=me.querySelector('.pf-verify-btn'); if(vb) vb.addEventListener('click',()=>openVerify(null));
  const photoInput=me.querySelector('#pf-photo-input');
  photoInput.addEventListener('change', async ()=>{ const f=photoInput.files&&photoInput.files[0]; if(!f) return; try{ const data=await compressImage(f); const np=getProfile(); np.avatarImg=data; saveProfile(np); openProfile(); }catch(e){ alert('照片读取失败'); } });
  const travelInput=me.querySelector('#pf-travel-input');
  travelInput.addEventListener('change', async ()=>{ const files=Array.from(travelInput.files||[]); if(!files.length) return; const np=getProfile(); np.travelPhotos=np.travelPhotos||[]; for(const f of files){ try{ const d=await compressImage(f); np.travelPhotos.push(d); }catch(e){} } saveProfile(np); openProfile(); });
  const bio=me.querySelector('#pf-bio'); bio.addEventListener('change',()=>{ const np=getProfile(); np.bio=bio.value.trim(); saveProfile(np); });
  const phoneI=me.querySelector('#pf-phone'); phoneI.addEventListener('change',()=>{ const np=getProfile(); np.phone=phoneI.value.trim(); saveProfile(np); });
  const eyeT=me.querySelector('#pf-eye-travel'); if(eyeT) eyeT.addEventListener('click',()=>{ const np=getProfile(); np.hidden=np.hidden||{}; np.hidden.travel=!np.hidden.travel; saveProfile(np); openProfile(); });
  const eyeB=me.querySelector('#pf-eye-bio'); if(eyeB) eyeB.addEventListener('click',()=>{ const np=getProfile(); np.hidden=np.hidden||{}; np.hidden.bio=!np.hidden.bio; saveProfile(np); openProfile(); });
  me.querySelectorAll('.pf-conn').forEach(b=>b.addEventListener('click',()=>{ const c=loadConnections()[+b.dataset.i]; if(c) openPartnerCard(c); }));
}
// ===== 已互通队友资料卡：双方同意后展示对方真实信息 =====
function openPartnerCard(c){
  const spendLabel = SPEND_LABEL2[c.spend]||'';
  const tagsHtml=(c.tags&&c.tags.length)?c.tags.map(t=>`<span class="pf-tag">${GROUP_TAGS[t]||t}</span>`).join(''):'<span class="pf-empty">未设置</span>';
  const m=el(`<div class="modal-mask" id="pc-mask"><div class="modal profile-modal pf-partner">
    <button class="modal-close" type="button" aria-label="关闭">×</button>
    <div class="pf-head">
      <div class="pf-avatar-wrap"><div class="pf-avatar big">${c.emoji}</div></div>
      <div class="pf-nick2">${escapeHtml(c.nick)}</div>
      <div class="pf-conn-badge">🤝 你们已互相同意组队，真实信息已互通展示</div>
    </div>
    <div class="pf-section"><div class="pf-sec-title">🪪 真实信息（互通展示）</div>
      <div class="pf-social">
        <div class="pf-row"><span class="pf-k">姓名</span><span>${escapeHtml(c.realNameMasked)}</span></div>
        <div class="pf-row"><span class="pf-k">电话</span><span>${escapeHtml(c.phoneMasked)}</span></div>
        <div class="pf-row"><span class="pf-k">出发地</span><span>${escapeHtml(c.fromCity)}</span></div>
      </div>
    </div>
    <div class="pf-section"><div class="pf-sec-title">👤 画像</div>
      <div class="pf-row"><span class="pf-k">年龄</span><span>${c.age}岁</span></div>
      <div class="pf-row"><span class="pf-k">消费</span><span>${spendLabel}</span></div>
      <div class="pf-row"><span class="pf-k">风格</span><span>${escapeHtml(c.persona||'—')}</span></div>
      <div class="pf-tags">${tagsHtml}</div>
    </div>
    <div class="pf-section"><div class="pf-sec-title">🤝 所在小队</div><div class="pf-dim">${escapeHtml(c.groupName)} · ${escapeHtml(c.city)} · 互通于 ${escapeHtml(c.connectedAt)}</div></div>
    <div class="pf-tip">头像为示意（非真人）；姓名/电话为示意脱敏信息，仅用于演示「双方同意后互通真实信息」的效果。真实上线后，这里展示对方在沟通后主动上传的真实资料。</div>
  </div></div>`);
  document.body.appendChild(m);
  m.querySelector('.modal-close').addEventListener('click',()=>m.remove());
  m.addEventListener('click',(e)=>{ if(e.target===m) m.remove(); });
}

// ===== 有个好地方：用户分享值得去的地方，看到合适的直接聊 =====
const GOOD_KEY = 'cyd_good_v1';
function loadGood(){ try { return JSON.parse(localStorage.getItem(GOOD_KEY)) || null; } catch(e){ return null; } }
function saveGood(arr){ try { localStorage.setItem(GOOD_KEY, JSON.stringify(arr)); } catch(e){} }
function seedGood(){
  if(loadGood()) return;
  const seed=[
    {id:'g1', author:'小野', emoji:'🦊', verified:true, place:'庙子湖后山灯塔', city:'舟山·东极岛', reason:'避开主街人流，后山灯塔看日出几乎包场，海风配红白灯塔超级出片，适合想躲清静的人', tags:['小众','出片','海岛'], time:'3小时前', status:'approved'},
    {id:'g2', author:'阿乐', emoji:'🐼', verified:true, place:'榆树街老茶室', city:'上海近郊', reason:'工作日几乎没人，老榆树下喝茶一下午很松弛，本地人才知道的冷门角落，不挤不吵', tags:['松弛','小众','咖啡'], time:'6小时前', status:'approved'},
    {id:'g3', author:'鹿鹿', emoji:'🌿', verified:false, place:'雨崩神瀑', city:'迪庆', reason:'徒步进村的隐世村落，神瀑下转经，人少景野，是那种「别声张」的宝藏地，适合想断网发呆', tags:['户外','小众','秘境'], time:'1天前', status:'approved'},
  ];
  saveGood(seed);
}
function openGood(){
  seedGood();
  const list=loadGood();
  const html=list.map((p,i)=>`
    <div class="gd-post ${p.status==='pending'?'pending':''}">
      <div class="gd-head"><span class="gd-avatar">${p.emoji}</span>
        <div><div class="gd-author">${escapeHtml(p.author)} ${p.verified?'<span class="sq-verified">已实名</span>':''}</div>
        <div class="gd-meta">📍 ${escapeHtml(p.city)} · ${escapeHtml(p.time)}</div></div>
        ${statusBadge(p.status)}
      </div>
      <div class="gd-place">📌 ${escapeHtml(p.place)}</div>
      ${p.media? (p.media.type==='image'?`<img class="post-media" src="${p.media.src}"/>`:`<video class="post-media" controls src="${p.media.src}"></video>`):''}
      <div class="gd-text">${escapeHtml(p.reason)}</div>
      <div class="gd-tags">${(p.tags||[]).map(t=>`<span class="gd-tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="gd-actions">
        <button class="gd-chat" data-i="${i}" ${p.status==='pending'?'disabled':''}>💬 聊一聊</button>
        <button class="gd-want" data-i="${i}" ${p.status==='pending'?'disabled':''}>⭐ 想去</button>
      </div>
    </div>`).join('');
  const body=document.getElementById('good-body');
  body.innerHTML = `<div class="sq-title">📍 有个好地方</div>
    <div class="sq-sub">分享你私藏的<b>小众宝藏地</b>——冷门、人少、出片、有故事；别挤热门景点了，把好地方留给同频的人。看到合适的直接聊</div>
    ${verifyGateBanner('good')}
    <button class="sq-publish" id="good-publish" type="button">＋ 分享一个小众宝藏地</button>
    <div class="sq-list">${html}</div>
    <button class="fab" id="good-fab" type="button" aria-label="分享">＋</button>`;
  body.querySelector('#good-publish').addEventListener('click',()=>requireVerify(()=>openPublishGood(null)));
  const fab=body.querySelector('#good-fab'); if(fab) fab.addEventListener('click',()=>requireVerify(()=>openPublishGood(null)));
  const vg=body.querySelector('#vg-go'); if(vg) vg.addEventListener('click',()=>requireVerify(()=>openGood()));
  body.querySelectorAll('.gd-chat').forEach(b=>b.addEventListener('click',()=>{ if(b.disabled) return; const p=list[+b.dataset.i]; startGoodChat(p); }));
  body.querySelectorAll('.gd-want').forEach(b=>b.addEventListener('click',()=>{ if(b.disabled) return; b.textContent='已标记 ⭐'; b.disabled=true; }));
}
function startGoodChat(p){
  const member={ id:'good', nick:p.author, emoji:p.emoji, age:24, fromCity:p.city, tags:[], spend:'normal', persona:'分享者', verified:p.verified };
  openChat([member], `有个好地方·${p.city}·${p.place}`, p.city, null);
}
function openPublishGood(backMask){
  const m=el(`<div class="modal-mask" id="good-pub-mask"><div class="modal publish-modal">
    <button class="modal-close" type="button" aria-label="关闭">×</button>
    <div class="sec-title">＋ 分享一个小众宝藏地</div>
    <div class="vf-tip">冷门、人少、出片或有故事的宝藏地优先；别发人人都去的热门景点。支持<b>文字 / 图片 / 视频</b>。发布后需经<b>审核</b>，审核中仅自己可见。</div>
    <input id="good-place" class="vf-input" placeholder="地点名，如 某村后山的废矿湖" maxlength="30" />
    <input id="good-city" class="vf-input" placeholder="城市 / 地区，如 大理" maxlength="20" />
    <textarea id="good-reason" class="vf-input" placeholder="为什么是宝藏？冷门在哪、适合谁、什么季节、怎么去、私藏 tips…" rows="3"></textarea>
    <input id="good-tags" class="vf-input" placeholder="标签，用空格分隔，如 小众 出片 秘境" maxlength="30" />
    <label class="vf-file"><input id="good-media" type="file" accept="image/*,video/*" hidden />📎 添加图片 / 视频</label>
    <div id="good-prev" class="pub-prev"></div>
    <div id="good-msg" class="vf-msg"></div>
    <button id="good-submit" class="vf-submit" type="button">提交审核并发布</button>
  </div></div>`);
  document.body.appendChild(m);
  const xc=m.querySelector('.modal-close'); if(xc) xc.addEventListener('click',()=>m.remove());
  m.addEventListener('click',(e)=>{ if(e.target===m) m.remove(); });
  const placeI=m.querySelector('#good-place'), cityI=m.querySelector('#good-city'), reasonI=m.querySelector('#good-reason'), tagsI=m.querySelector('#good-tags'), mediaI=m.querySelector('#good-media'), prev=m.querySelector('#good-prev'), msg=m.querySelector('#good-msg'), sub=m.querySelector('#good-submit');
  let media=null;
  mediaI.addEventListener('change',()=>{ const f=mediaI.files&&mediaI.files[0]; if(!f) return; readMedia(f).then(md=>{ media=md; prev.innerHTML = md.type==='image'?`<img class="pub-thumb" src="${md.src}"/>`:`<video class="pub-thumb" src="${md.src}" controls></video>`; }).catch(()=>{ msg.textContent='媒体读取失败'; msg.className='vf-msg err'; }); });
  sub.addEventListener('click',()=>{
    const place=placeI.value.trim(), city=cityI.value.trim(), reason=reasonI.value.trim();
    if(!place||!reason){ msg.textContent='请填写地点和推荐理由'; msg.className='vf-msg err'; return; }
    const prof=getProfile();
    const id='u'+Date.now();
    const item={ id, author:prof.nick||'我', emoji:prof.emoji||'🌱', verified:!!prof.verified, place, city:city||'待定', reason, tags:(tagsI.value.trim().split(/\s+/).filter(Boolean)), time:'刚刚', media, status:'pending' };
    let list=loadGood()||[]; list.unshift(item);
    try { saveGood(list); }
    catch(e){ item.media=null; list[0]=item; saveGood(list); toast('视频过大未保存，已发布文字内容'); }
    m.remove();
    if(backMask) backMask.remove();
    openGood(); toast('已提交，等待审核 ⏳'); simulateReview('good', id, openGood);
  });
}

// ===== 登录设置：微信 / 手机号 / 邮箱，均需实名 + 绑定手机号 =====
function openLogin(){
  const prof = getProfile();
  if(prof.loggedIn){
    const m=el(`<div class="modal-mask" id="login-mask"><div class="modal login-modal">
        <button class="modal-close" type="button" aria-label="关闭">×</button>
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
    <button class="modal-close" type="button" aria-label="关闭">×</button>
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
      body.innerHTML = '<div class="login-step">最后一步：<b>人脸核身实名</b><br/><button class="vf-submit" id="lg-face" type="button">开始人脸核身</button><div id="lg-msg" class="vf-msg"></div></div>';
      body.querySelector('#lg-face').addEventListener('click',()=>{
        doFaceVerify(()=>{
          const p=getProfile();
          data.realName=p.realName; data.realNameMasked=p.realNameMasked;
          finishLogin();
        });
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

// ===== 页面感知初始化：置于文件末尾，确保 SQUARE_KEY/GOOD_KEY 等 const 已定义，避开 TDZ =====
const PAGE = document.body.dataset.page;
if (PAGE === 'plan') {
  restoreChat();
} else if (PAGE === 'square') {
  openSquare();
} else if (PAGE === 'good') {
  openGood();
} else if (PAGE === 'me') {
  openProfile();
}
