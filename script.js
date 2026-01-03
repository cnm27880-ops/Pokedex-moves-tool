/* =========================================
   2. 邏輯控制區 (Logic)
   ========================================= */
// 商店設定
const SHOP_ITEM_COUNT = 10;  // 每週抽取商品數量
const DISCOUNT_COUNT = 10;   // 打折商品數量（全部都打折）
const DISCOUNT_RATE = 0.8;   // 8折
document.addEventListener('DOMContentLoaded', () => {
    initMoves();
    initDowntime();
    initBerries();
    refreshShop();
    calcCatch(); // 初始化計算器
});

// --- 導航切換邏輯 ---
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelectorAll('.submenu-item').forEach(item => item.classList.remove('current'));
}

function toggleMenu(element) {
    element.classList.toggle('active');
    const submenu = element.nextElementSibling;
    if (submenu) {
        if (submenu.style.maxHeight) {
            submenu.style.maxHeight = null;
        } else {
            submenu.style.maxHeight = submenu.scrollHeight + "px";
        }
    }
}

// --- 資安防護函式 ---
function escapeHTML(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- 1. 招式查詢器邏輯 ---
function initMoves() {
    const container = document.getElementById('movesResults');
    const typeFilter = document.getElementById('typeFilter');
    
    // 填充屬性選單
    const uniqueTypes = new Set();
    movesData.forEach(m => { 
        if(m.type) uniqueTypes.add(m.type.split('/')[0].replace(/[()]/g, '').trim()); 
    });
    Array.from(uniqueTypes).sort().forEach(t => {
        const op = document.createElement('option'); 
        op.value = t; 
        op.textContent = t;
        typeFilter.appendChild(op);
    });

    // 渲染函式
    window.renderMoves = (list) => {
        container.innerHTML = '';
        document.getElementById('resultsCount').textContent = `找到 ${list.length} 個招式`;
        
        if(list.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#888;">沒有符合的結果</div>';
            return;
        }

        list.forEach(m => {
            const cleanType = m.type.split('/')[0].replace(/[()]/g, '').trim();
            const card = document.createElement('div');
            card.className = `move-card card-type-${cleanType}`;
            card.innerHTML = `
                <div class="move-header">
                    <span class="move-name"><strong>${escapeHTML(m.name)}</strong></span>
                    <span class="move-badge type-${cleanType}">${escapeHTML(m.type)}</span>
                </div>
                <div class="move-stats">
                    <div><span style="font-weight:bold">分類:</span> ${escapeHTML(m.category)}</div>
                    <div><span style="font-weight:bold">傷害:</span> ${escapeHTML(m.damage)}</div>
                    <div><span style="font-weight:bold">頻率:</span> ${escapeHTML(m.frequency)}</div>
                    <div><span style="font-weight:bold">範圍:</span> ${escapeHTML(m.range)}</div>
                </div>
                <div class="effect-text">${escapeHTML(m.effect)}</div>
            `;
            container.appendChild(card);
        });
    };

    // 搜尋事件
    const doSearch = () => {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const type = document.getElementById('typeFilter').value;
        const cat = document.getElementById('catFilter').value;
        const dice = document.getElementById('diceFilter').value;

        const filtered = movesData.filter(m => {
            const matchName = m.name.toLowerCase().includes(term);
            const matchType = type === 'all' || m.type.includes(type);
            const matchCat = cat === 'all' || m.category === cat;
            const matchDice = dice === 'all' || (m.damage && m.damage.toLowerCase().includes(dice));
            return matchName && matchType && matchCat && matchDice;
        });
        renderMoves(filtered);
    };

    document.getElementById('searchBtn').addEventListener('click', doSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => { if(e.key==='Enter') doSearch(); });
    ['typeFilter','catFilter','diceFilter'].forEach(id => document.getElementById(id).addEventListener('change', doSearch));

    // 初始渲染
    renderMoves(movesData);
}

// --- 2. 修整日規則渲染 ---
function initDowntime() {
    const container = document.getElementById('downtimeContainer');
    downtimeRules.forEach(rule => {
        const card = document.createElement('div');
        card.className = 'rule-card';
        card.innerHTML = `
            <div class="rule-title">${rule.title}</div>
            <div class="rule-content">${rule.content}</div>
        `;
        container.appendChild(card);
    });
}

// --- 3. 樹果圖鑑渲染 ---
function initBerries() {
    const container = document.getElementById('berryContainer');
    berryData.forEach(b => {
        const card = document.createElement('div');
        card.className = 'berry-card';
        card.innerHTML = `
            <div class="berry-header">
                <span class="berry-name"><strong>${escapeHTML(b.name)}</strong></span>
                <span class="berry-tier tier-${b.tier}">${b.tier}</span>
            </div>
            <div class="berry-info">
                <div class="berry-row"><div class="berry-label">顏色</div> <div>${escapeHTML(b.color)}</div></div>
                <div class="berry-row"><div class="berry-label">味道</div> <div>${escapeHTML(b.flavor)}</div></div>
                <div class="berry-row"><div class="berry-label">口感</div> <div>${escapeHTML(b.texture)}</div></div>
                <div class="berry-row"><div class="berry-label">氣味</div> <div>${escapeHTML(b.scent)}</div></div>
            </div>
        `;
        container.appendChild(card);
    });
}
// === 商店刷新函式 ===
function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function refreshShop() {
    const tbody = document.getElementById('shopBody');
    tbody.innerHTML = '';
    
    // 從所有商品中隨機抽取10個
    const shuffled = shuffleArray(shopDB);
    const allItems = shuffled.slice(0, SHOP_ITEM_COUNT);
    
    // 全部商品都打8折
    allItems.forEach((item) => {
        const finalPrice = Math.floor(item.price * DISCOUNT_RATE);
        
        let tagClass = '';
        switch(item.cat) {
            case '藥品': tagClass = 'tag-med'; break;
            case '球類': tagClass = 'tag-ball'; break;
            case '裝備': tagClass = 'tag-gear'; break;
            case '生活': tagClass = 'tag-life'; break;
            case '服飾': tagClass = 'tag-cloth'; break;
        }
        
        const priceHTML = `<span class="original">$${formatPrice(item.price)}</span>$${formatPrice(finalPrice)}<span class="discount-badge">8折</span>`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="shop-tag ${tagClass}">${item.cat}</span></td>
            <td><strong>${item.name}</strong></td>
            <td class="shop-price discounted">${priceHTML}</td>
            <td class="shop-desc">${item.desc}</td>
        `;
        tbody.appendChild(row);
    });
}

// --- 4. 收服計算器邏輯 (依據1條1球原則) ---
function calcCatch() {
    // 取得條件
    const scopeFull = document.getElementById('scope_full').checked;
    const scopeType = document.getElementById('scope_type').checked;
    const scopeGen = document.getElementById('scope_gen').checked;

    const customGender = document.getElementById('custom_gender').checked;
    const customShiny = document.getElementById('custom_shiny').checked;
    const customNature = document.getElementById('custom_nature').checked;

    const unlockPseudo = document.getElementById('unlock_pseudo').checked;
    const unlockMythical = document.getElementById('unlock_mythical').checked;
    const unlockUB = document.getElementById('unlock_ub').checked;

    // 取得球數
    const numPoke = parseInt(document.getElementById('ball_poke').value) || 0;
    const numGreat = parseInt(document.getElementById('ball_great').value) || 0;
    const numUltra = parseInt(document.getElementById('ball_ultra').value) || 0;
    const numMaster = parseInt(document.getElementById('ball_master').value) || 0;

    // 顯示/隱藏選項
    document.getElementById('genOption').style.display = scopeType ? 'block' : 'none';
    document.getElementById('natureSelector').style.display = customNature ? 'block' : 'none';

    // 建立詞條列表 (每個詞條代表一個可用球抵消的成本項)
    let terms = [];

    // 捕捉範圍詞條
    if (scopeFull) {
        terms.push({
            name: '全圖鑑抽取 (1025只)',
            cost: 3,
            canUse: { poke: 1, great: 2, ultra: 3 }
        });
    } else if (scopeType) {
        terms.push({
            name: '指定屬性區域',
            cost: 4,
            canUse: { poke: 1, great: 2, ultra: 3 }
        });
    }

    if (scopeType && scopeGen) {
        terms.push({
            name: '指定世代',
            cost: 2,
            canUse: { poke: 1, great: 2 }
        });
    }

    // 客製化屬性詞條 (不可用球抵消)
    if (customGender) {
        terms.push({ name: '指定性別', cost: 1, canUse: {} });
    }
    if (customShiny) {
        terms.push({ name: '異色', cost: 1, canUse: {} });
    }
    if (customNature) {
        terms.push({ name: '指定個性', cost: 1, canUse: {} });
    }

    // 稀有度解鎖詞條
    if (unlockPseudo) {
        terms.push({
            name: '解鎖大器晚成',
            cost: 2,
            canUse: { great: 1, ultra: 2 }
        });
    }
    if (unlockMythical) {
        terms.push({
            name: '解鎖幻之寶可夢',
            cost: 3,
            canUse: { ultra: 1, master: 2 }
        });
    }
    if (unlockUB) {
        terms.push({
            name: '解鎖究極異獸',
            cost: 3,
            canUse: { ultra: 1, master: 3 }
        });
    }

    // 計算基礎成本
    let baseCost = terms.reduce((sum, term) => sum + term.cost, 0);

    // 條件明細
    let conditionLines = terms.map(term => `${term.name}: +${term.cost} DD`);
    if (conditionLines.length === 0) conditionLines.push('尚未選擇任何條件');
    conditionLines.push(`<strong>小計: ${baseCost} DD</strong>`);

    // 建立可用精靈球列表
    let balls = [];
    for (let i = 0; i < numPoke; i++) balls.push({ type: 'poke', name: '寶貝球', used: false });
    for (let i = 0; i < numGreat; i++) balls.push({ type: 'great', name: '超級球', used: false });
    for (let i = 0; i < numUltra; i++) balls.push({ type: 'ultra', name: '高級球', used: false });
    for (let i = 0; i < numMaster; i++) balls.push({ type: 'master', name: '大師球', used: false });

    // 1條1球原則: 為每個詞條分配最優的球
    let ballAssignments = []; // 記錄球的使用情況

    for (let term of terms) {
        let bestBallIdx = -1;
        let bestValue = 0;

        // 尋找能為此詞條提供最大抵消值的球
        for (let i = 0; i < balls.length; i++) {
            if (balls[i].used) continue; // 已被使用的球跳過

            const ballType = balls[i].type;
            const discountValue = term.canUse[ballType] || 0;

            if (discountValue === 0) continue; // 此球無法抵消此詞條

            // 優先選擇能完全抵消的球
            if (discountValue >= term.cost && (bestBallIdx === -1 || discountValue < bestValue || bestValue < term.cost)) {
                bestBallIdx = i;
                bestValue = discountValue;
            }
            // 其次選擇抵消值最大的球
            else if (discountValue > bestValue && bestValue < term.cost) {
                bestBallIdx = i;
                bestValue = discountValue;
            }
        }

        // 分配球給此詞條
        if (bestBallIdx !== -1) {
            balls[bestBallIdx].used = true;
            const actualDiscount = Math.min(bestValue, term.cost);
            term.discount = actualDiscount;
            ballAssignments.push({
                ball: balls[bestBallIdx].name,
                term: term.name,
                discount: actualDiscount
            });
        } else {
            term.discount = 0;
        }
    }

    // 計算總折扣
    let totalDiscount = terms.reduce((sum, term) => sum + (term.discount || 0), 0);

    // 折扣明細 (按球類型分組顯示)
    let discountLines = [];
    let ballTypeUsage = { poke: 0, great: 0, ultra: 0, master: 0 };
    let ballTypeDiscount = { poke: 0, great: 0, ultra: 0, master: 0 };

    for (let assignment of ballAssignments) {
        const ballTypeMap = { '寶貝球': 'poke', '超級球': 'great', '高級球': 'ultra', '大師球': 'master' };
        const ballType = ballTypeMap[assignment.ball];
        ballTypeUsage[ballType]++;
        ballTypeDiscount[ballType] += assignment.discount;
    }

    if (ballTypeUsage.poke > 0) {
        discountLines.push(`寶貝球 x${ballTypeUsage.poke}: -${ballTypeDiscount.poke} DD`);
    }
    if (ballTypeUsage.great > 0) {
        discountLines.push(`超級球 x${ballTypeUsage.great}: -${ballTypeDiscount.great} DD`);
    }
    if (ballTypeUsage.ultra > 0) {
        discountLines.push(`高級球 x${ballTypeUsage.ultra}: -${ballTypeDiscount.ultra} DD`);
    }
    if (ballTypeUsage.master > 0) {
        discountLines.push(`大師球 x${ballTypeUsage.master}: -${ballTypeDiscount.master} DD`);
    }

    // 顯示詳細分配 (用於調試或詳細說明)
    if (ballAssignments.length > 0) {
        discountLines.push('<br><span style="font-size:0.85em;color:#aaa;">詳細分配:</span>');
        for (let assignment of ballAssignments) {
            discountLines.push(`<span style="font-size:0.85em;color:#aaa;">• ${assignment.ball} → ${assignment.term}: -${assignment.discount} DD</span>`);
        }
    }

    if (ballAssignments.length === 0) discountLines.push('未使用精靈球');
    discountLines.push(`<strong style="color:#69f0ae;">小計: -${totalDiscount} DD</strong>`);

    // 最終成本
    let finalCost = Math.max(0, baseCost - totalDiscount);

    // 更新 UI
    document.getElementById('txt_conditions').innerHTML = conditionLines.join('<br>');
    document.getElementById('txt_discounts').innerHTML = discountLines.join('<br>');
    document.getElementById('txt_final').innerText = finalCost + " DD";

    // 摘要
    const summaryDiv = document.getElementById('result_summary');
    if (scopeFull || scopeType) {
        summaryDiv.style.display = 'block';
        let summaryItems = [];
        if (customGender) summaryItems.push('性別: 指定');
        if (customShiny) summaryItems.push('特殊: 異色');
        if (customNature) {
            const nature = document.getElementById('natureSelect').value || '未選擇';
            summaryItems.push(`個性: ${nature}`);
        }
        summaryItems.push(`來源: ${scopeFull ? '全圖鑑' : '指定屬性區域'}${scopeGen ? ' + 指定世代' : ''}`);

        let rarityItems = [];
        if (unlockPseudo) rarityItems.push('大器晚成');
        if (unlockMythical) rarityItems.push('幻之寶可夢');
        if (unlockUB) rarityItems.push('究極異獸');
        if (rarityItems.length > 0) summaryItems.push(`解鎖稀有度: ${rarityItems.join(', ')}`);

        summaryItems.push(`形態: 初始形態 (有進化則以初始形態捕獲)`);

        document.getElementById('txt_summary').innerHTML = summaryItems.join('<br>');
    } else {
        summaryDiv.style.display = 'none';
    }
}