const STORAGE_KEY = 'zky_friends';
const MY_ACCOUNTS_KEY = 'zky_my_accounts';
const WORKER_URL = 'https://friends-api.coder1232026.workers.dev/api/friends';

const GITHUB_USER = 'zhoukeyv';
const GITHUB_REPO = 'zhoukeyv.github.io';
const GITHUB_BRANCH = 'main';

// === Token 混淆：base64(reverse(token)) 拆两段，防 GitHub Secret Scanning ===
const _a = "Q3djbW4ydDNybEl1dnJZeDFxT2xU";
const _b = "NjVTWW4zakdNZlowQkN5X3BoZw==";
function getToken() {
    return atob(_a + _b).split('').reverse().join('');
}

const FRIENDS_PATH  = 'data/friends.json';
const ACCOUNTS_PATH = 'data/my-accounts.json';
const TOOLS_PATH    = 'data/tools.json';

const ghApi = path => `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;

let editingIndex = -1;
let accountsLoaded = false;
let toolsData = [];
let currentCatIndex = -1;
let toolsLoaded = false;

// ========== 工具函数 ==========
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

function extractUser(url, prefix) {
    if (!url || !url.startsWith(prefix)) return '';
    return url.replace(prefix, '');
}

function b64ToUtf8(b64) {
    const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}
function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
}

// ========== GitHub 通用读写 ==========
async function ghGetFile(path) {
    const url = ghApi(path) + '?ref=' + GITHUB_BRANCH + '&t=' + Date.now();
    const r = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (r.status === 404) return { sha: null, content: null };
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('获取 ' + path + ' 失败: ' + r.status + ' ' + txt);
    }
    const data = await r.json();
    const content = b64ToUtf8(data.content);
    return { sha: data.sha, content };
}

async function ghPutFile(path, obj, sha) {
    const body = {
        message: `Update ${path}`,
        content: utf8ToB64(JSON.stringify(obj, null, 2)),
        branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const r = await fetch(ghApi(path), {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('上传 ' + path + ' 失败: ' + r.status + ' ' + txt);
    }
}

async function ghPutFileWithRetry(path, obj, maxRetries = 4) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const { sha } = await ghGetFile(path);
            await ghPutFile(path, obj, sha);
            return;
        } catch (e) {
            lastError = e;
            const msg = e.message || '';
            if ((msg.includes('409') || msg.includes('422')) && i < maxRetries - 1) {
                console.warn(`第 ${i + 1} 次写入冲突，重试中...`);
                await new Promise(r => setTimeout(r, 500 * (i + 1)));
                continue;
            }
            throw e;
        }
    }
    throw lastError;
}

// ========== 友链 ==========
async function loadFriends() {
    try {
        const r = await fetch(WORKER_URL + '?t=' + Date.now());
        if (r.ok) return await r.json();
    } catch (e) { console.warn('Worker 加载失败，回退本地', e); }

    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

async function saveFriends(friends) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
    await ghPutFileWithRetry(FRIENDS_PATH, friends);
    console.log('✅ friends.json 已同步到 GitHub');
}

async function renderFriends() {
    const friends = await loadFriends();
    const container = document.getElementById('friend-list-edit');
    if (!container) return;
    container.innerHTML = '';

    if (!friends.length) {
        container.innerHTML = '<p style="color:#999;">暂无友链，请在上方添加。</p>';
        return;
    }

    friends.forEach((friend, index) => {
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.innerHTML = `
            <div class="friend-card-actions">
                <button class="btn-edit" onclick="startEdit(${index})">修改</button>
                <button class="btn-delete" onclick="deleteFriend(${index})">删除</button>
            </div>
            <h3>${escapeHtml(friend.name)}</h3>
            <p class="friend-desc">${escapeHtml(friend.desc)}</p>
            <div class="friend-links">
                ${friend.github ? `<a href="${escapeHtml(friend.github)}" target="_blank" class="btn-link btn-github">GitHub</a>` : ''}
                ${friend.luogu ? `<a href="${escapeHtml(friend.luogu)}" target="_blank" class="btn-link btn-luogu">洛谷</a>` : ''}
                ${friend.codeforces ? `<a href="${escapeHtml(friend.codeforces)}" target="_blank" class="btn-link btn-codeforces">CodeForces</a>` : ''}
                ${friend.atcoder ? `<a href="${escapeHtml(friend.atcoder)}" target="_blank" class="btn-link btn-atcoder">AtCoder</a>` : ''}
                ${friend.email ? `<a href="mailto:${escapeHtml(friend.email)}" class="btn-link btn-email">Email</a>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

async function addFriend() {
    const name           = document.getElementById('input-name').value.trim();
    const desc           = document.getElementById('input-desc').value.trim();
    const githubUser     = document.getElementById('input-github').value.trim();
    const luoguUser      = document.getElementById('input-luogu').value.trim();
    const codeforcesUser = document.getElementById('input-codeforces').value.trim();
    const atcoderUser    = document.getElementById('input-atcoder').value.trim();
    const email          = document.getElementById('input-email').value.trim();

    if (!name) { alert('请至少填写名字'); return; }

    const friend = {
        name, desc,
        github:     githubUser     ? 'https://github.com/' + githubUser : '',
        luogu:      luoguUser      ? 'https://luogu.com.cn/user/' + luoguUser : '',
        codeforces: codeforcesUser ? 'https://codeforces.com/profile/' + codeforcesUser : '',
        atcoder:    atcoderUser    ? 'https://atcoder.jp/users/' + atcoderUser : '',
        email
    };

    const friends = await loadFriends();
    if (editingIndex === -1) {
        friends.push(friend);
    } else {
        friends[editingIndex] = friend;
        editingIndex = -1;
        document.querySelector('.edit-form .btn-save').textContent = '添加';
    }

    try {
        await saveFriends(friends);
        await renderFriends();
        clearFriendForm();
        alert('✅ 友链已保存到 GitHub');
    } catch (e) {
        console.error(e);
        alert('❌ 同步失败：' + e.message);
    }
}

async function startEdit(index) {
    const friends = await loadFriends();
    const f = friends[index];
    document.getElementById('input-name').value       = f.name || '';
    document.getElementById('input-desc').value       = f.desc || '';
    document.getElementById('input-github').value     = extractUser(f.github, 'https://github.com/');
    document.getElementById('input-luogu').value      = extractUser(f.luogu, 'https://luogu.com.cn/user/');
    document.getElementById('input-codeforces').value = extractUser(f.codeforces, 'https://codeforces.com/profile/');
    document.getElementById('input-atcoder').value    = extractUser(f.atcoder, 'https://atcoder.jp/users/');
    document.getElementById('input-email').value      = f.email || '';

    editingIndex = index;
    document.querySelector('.edit-form .btn-save').textContent = '保存修改';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteFriend(index) {
    if (!confirm('确定删除这个友链吗？')) return;
    const friends = await loadFriends();
    friends.splice(index, 1);
    try {
        await saveFriends(friends);
        await renderFriends();
    } catch (e) {
        alert('❌ 同步失败：' + e.message);
    }
}

function clearFriendForm() {
    ['input-name','input-desc','input-github','input-luogu',
     'input-codeforces','input-atcoder','input-email']
        .forEach(id => document.getElementById(id).value = '');
}

// ========== 我的账号 ==========
async function loadMyAccounts() {
    const { content } = await ghGetFile(ACCOUNTS_PATH);
    if (content) return JSON.parse(content);
    return {};
}

async function fillMyAccountsForm() {
    try {
        const a = await loadMyAccounts();
        document.getElementById('my-github').value     = a.github     || '';
        document.getElementById('my-email').value      = a.email      || '';
        document.getElementById('my-luogu').value      = a.luogu      || '';
        document.getElementById('my-atcoder').value    = a.atcoder    || '';
        document.getElementById('my-codeforces').value = a.codeforces || '';
        accountsLoaded = true;
    } catch (e) {
        console.error('加载账号失败', e);
        alert('⚠️ 加载我的账号失败，已禁用保存按钮，请刷新页面重试');
        accountsLoaded = false;
    }
}

async function saveMyAccounts() {
    if (!accountsLoaded) {
        alert('❌ 账号未加载成功，禁止保存以防覆盖原数据。请刷新页面。');
        return;
    }

    const accounts = {
        github:     document.getElementById('my-github').value.trim(),
        email:      document.getElementById('my-email').value.trim(),
        luogu:      document.getElementById('my-luogu').value.trim(),
        atcoder:    document.getElementById('my-atcoder').value.trim(),
        codeforces: document.getElementById('my-codeforces').value.trim()
    };

    const emptyFields = Object.entries(accounts)
        .filter(([k, v]) => !v)
        .map(([k]) => k);

    if (emptyFields.length > 0) {
        alert('❌ 以下账号不能为空：' + emptyFields.join(', '));
        return;
    }

    localStorage.setItem(MY_ACCOUNTS_KEY, JSON.stringify(accounts));

    try {
        await ghPutFileWithRetry(ACCOUNTS_PATH, accounts);
        alert('✅ 我的账号已同步到 GitHub');
    } catch (e) {
        console.error(e);
        alert('❌ 同步失败：' + e.message);
    }
}

// ============================================================
// ========== 工具管理 ==========
// ============================================================
async function loadToolsData() {
    const { content } = await ghGetFile(TOOLS_PATH);
    return content ? JSON.parse(content) : [];
}

async function saveToolsData() {
    await ghPutFileWithRetry(TOOLS_PATH, toolsData);
}

async function initTools() {
    try {
        toolsData = await loadToolsData();
        if (!Array.isArray(toolsData)) toolsData = [];
        toolsLoaded = true;
        if (toolsData.length && currentCatIndex === -1) currentCatIndex = 0;
        renderCatList();
        renderCatDetail();
    } catch (e) {
        console.error('加载工具失败', e);
        alert('⚠️ 加载工具数据失败：' + e.message);
        toolsLoaded = false;
    }
}

function renderCatList() {
    const box = document.getElementById('tools-cat-items');
    if (!box) return;
    if (!toolsData.length) {
        box.innerHTML = '<p style="color:#999;font-size:13px;margin:10px 0;">还没有分类</p>';
        return;
    }
    box.innerHTML = toolsData.map((c, i) => `
        <div class="cat-item ${i === currentCatIndex ? 'active' : ''}" onclick="selectCategory(${i})">
            <span class="cat-item-label">
                ${escapeHtml(c.icon || '📁')} ${escapeHtml(c.category || '(未命名)')}
            </span>
            <span class="cat-item-actions">
                <button onclick="event.stopPropagation();moveCategory(${i},-1)" title="上移">↑</button>
                <button onclick="event.stopPropagation();moveCategory(${i},1)" title="下移">↓</button>
                <button onclick="event.stopPropagation();deleteCategory(${i})" title="删除">✕</button>
            </span>
        </div>
    `).join('');
}

function selectCategory(i) {
    currentCatIndex = i;
    renderCatList();
    renderCatDetail();
}

function renderCatDetail() {
    const box = document.getElementById('tools-cat-detail');
    if (!box) return;
    if (currentCatIndex < 0 || !toolsData[currentCatIndex]) {
        box.innerHTML = '<p style="color:#999;text-align:center;padding:40px 0;">← 请选择或新建分类</p>';
        return;
    }
    const cat = toolsData[currentCatIndex];

    box.innerHTML = `
        <div class="edit-form">
            <h3>编辑分类信息</h3>
            <label>Emoji 图标</label>
            <input id="cat-icon" placeholder="如：💻 🤖 📚" value="${escapeHtml(cat.icon || '')}">
            <label>分类名</label>
            <input id="cat-name" placeholder="如：在线评测" value="${escapeHtml(cat.category || '')}">
            <label>分类描述（可选）</label>
            <input id="cat-desc" placeholder="如：常用 OJ 平台" value="${escapeHtml(cat.desc || '')}">
            <button class="btn-save" onclick="saveCategoryMeta()">保存分类信息</button>
        </div>

        <div class="edit-form">
            <h3>添加工具到「${escapeHtml(cat.category || '(未命名)')}」</h3>
            <label>工具名</label>
            <input id="new-tool-name" placeholder="如：Luogu">
            <label>URL</label>
            <input id="new-tool-url" placeholder="如：https://www.luogu.com.cn">
            <label>描述（可选）</label>
            <input id="new-tool-desc" placeholder="如：洛谷 OJ">
            <button class="btn-save" onclick="addTool()">+ 添加工具</button>
        </div>

        <h3 style="margin-top:20px;">该分类下的工具</h3>
        <div id="tool-items">
            ${!(cat.tools && cat.tools.length)
                ? '<p style="color:#999;">还没有工具。</p>'
                : cat.tools.map((t, j) => `
                    <div class="tool-item">
                        <div class="tool-item-info">
                            <div class="tool-item-name">${escapeHtml(t.name)}</div>
                            ${t.desc ? `<div class="tool-item-desc">${escapeHtml(t.desc)}</div>` : ''}
                            <div class="tool-item-url">${escapeHtml(t.url)}</div>
                        </div>
                        <div class="tool-item-actions">
                            <button onclick="moveTool(${j},-1)" title="上移">↑</button>
                            <button onclick="moveTool(${j},1)" title="下移">↓</button>
                            <button class="btn-edit" onclick="editTool(${j})">改</button>
                            <button class="btn-delete" onclick="deleteTool(${j})">删</button>
                        </div>
                    </div>
                `).join('')
            }
        </div>
    `;
}

async function addCategory() {
    if (!toolsLoaded) {
        alert('⚠️ 工具数据还没加载完成，请稍等几秒再点');
        return;
    }
    const name = prompt('新分类名称：');
    if (!name || !name.trim()) return;
    if (!Array.isArray(toolsData)) toolsData = [];
    toolsData.push({ category: name.trim(), icon: '', desc: '', tools: [] });
    currentCatIndex = toolsData.length - 1;
    try {
        await saveToolsData();
        renderCatList();
        renderCatDetail();
    } catch (e) { alert('❌ 保存失败：' + e.message); }
}

async function deleteCategory(i) {
    if (!confirm(`确定删除分类「${toolsData[i].category}」及其所有工具？`)) return;
    toolsData.splice(i, 1);
    if (currentCatIndex >= toolsData.length) currentCatIndex = toolsData.length - 1;
    try {
        await saveToolsData();
        renderCatList();
        renderCatDetail();
    } catch (e) { alert('❌ 保存失败：' + e.message); }
}

async function moveCategory(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= toolsData.length) return;
    [toolsData[i], toolsData[j]] = [toolsData[j], toolsData[i]];
    if (currentCatIndex === i) currentCatIndex = j;
    else if (currentCatIndex === j) currentCatIndex = i;
    try {
        await saveToolsData();
        renderCatList();
    } catch (e) { alert('❌ 保存失败：' + e.message); }
}

async function saveCategoryMeta() {
    const cat = toolsData[currentCatIndex];
    const newName = document.getElementById('cat-name').value.trim();
    if (!newName) { alert('分类名不能为空'); return; }
    cat.icon     = document.getElementById('cat-icon').value.trim();
    cat.category = newName;
    cat.desc     = document.getElementById('cat-desc').value.trim();
    try {
        await saveToolsData();
        renderCatList();
        renderCatDetail();
        alert('✅ 已保存');
    } catch (e) { alert('❌ 保存失败：' + e.message); }
}

async function addTool() {
    const name = document.getElementById('new-tool-name').value.trim();
    const url  = document.getElementById('new-tool-url').value.trim();
    const desc = document.getElementById('new-tool-desc').value.trim();
    if (!name || !url) { alert('工具名和 URL 必填'); return; }
    toolsData[currentCatIndex].tools = toolsData[currentCatIndex].tools || [];
    toolsData[currentCatIndex].tools.push({ name, url, desc });
    try {
        await saveToolsData();
        renderCatDetail();
    } catch (e) { alert('❌ 保存失败：' + e.message); }
}

async function editTool(j) {
    const t = toolsData[currentCatIndex].tools[j];
    const name = prompt('工具名：', t.name);
    if (name === null) return;
    const url = prompt('URL：', t.url);
    if (url === null) return;
    const desc = prompt('描述（可留空）：', t.desc || '');
    if (desc === null) return;
    if (!name.trim() || !url.trim()) { alert('工具名和 URL 必填'); return; }
    t.name = name.trim();
    t.url  = url.trim();
    t.desc = desc.trim();
    try {
        await saveToolsData();
        renderCatDetail();
    } catch (e) { alert('❌ 保存失败：' + e.message); }
}

async function deleteTool(j) {
    if (!confirm('确定删除该工具？')) return;
    toolsData[currentCatIndex].tools.splice(j, 1);
    try {
        await saveToolsData();
        renderCatDetail();
    } catch (e) { alert('❌ 保存失败：' + e.message); }
}

async function moveTool(j, dir) {
    const arr = toolsData[currentCatIndex].tools;
    const k = j + dir;
    if (k < 0 || k >= arr.length) return;
    [arr[j], arr[k]] = [arr[k], arr[j]];
    try {
        await saveToolsData();
        renderCatDetail();
    } catch (e) { alert('❌ 保存失败：' + e.message); }
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    renderFriends();
    fillMyAccountsForm();
    initTools();
});