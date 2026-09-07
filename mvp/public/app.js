const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const hotelInput = document.getElementById('hotel');

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
