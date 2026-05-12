const STORAGE_KEY = 'zky_friends';
const WORKER_URL = 'https://friends-api.coder1232026.workers.dev/api/friends';
const isLocal = window.location.protocol === 'file:';
let editingIndex = -1;

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== 本地模式 ==========

function loadLocal() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveLocal(friends) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

// ========== 网页模式 ==========

async function loadRemote() {
    const response = await fetch(WORKER_URL);
    return response.json();
}

async function saveRemote(friends) {
    await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(friends)
    });
}

// ========== 统一接口 ==========

async function loadFriends() {
    if (isLocal) return loadLocal();
    return await loadRemote();
}

async function saveFriends(friends) {
    if (isLocal) saveLocal(friends);
    else await saveRemote(friends);
}

// ========== 提取用户名（从完整链接反推） ==========

function extractUser(url, prefix) {
    if (!url || !url.startsWith(prefix)) return '';
    return url.replace(prefix, '');
}

// ========== 渲染友链列表 ==========

async function renderFriends() {
    const friends = await loadFriends();
    const container = document.getElementById('friend-list-edit');
    if (!container) return;

    container.innerHTML = '';

    if (friends.length === 0) {
        container.innerHTML = '<p style="color: #999;">暂无友链，请在上方添加。</p>';
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

// ========== 新增 / 修改 ==========

async function addFriend() {
    const name = document.getElementById('input-name').value.trim();
    const desc = document.getElementById('input-desc').value.trim();
    const githubUser = document.getElementById('input-github').value.trim();
    const luoguUser = document.getElementById('input-luogu').value.trim();
    const codeforcesUser = document.getElementById('input-codeforces').value.trim();
    const atcoderUser = document.getElementById('input-atcoder').value.trim();
    const email = document.getElementById('input-email').value.trim();

    if (!name) {
        alert('请至少填写名字');
        return;
    }

    const friend = {
        name: name,
        desc: desc,
        github: githubUser ? 'https://github.com/' + githubUser : '',
        luogu: luoguUser ? 'https://luogu.com.cn/user/' + luoguUser : '',
        codeforces: codeforcesUser ? 'https://codeforces.com/profile/' + codeforcesUser : '',
        atcoder: atcoderUser ? 'https://atcoder.jp/users/' + atcoderUser : '',
        email: email
    };

    const friends = await loadFriends();

    if (editingIndex === -1) {
        // 新增
        friends.push(friend);
    } else {
        // 修改
        friends[editingIndex] = friend;
        editingIndex = -1;
        document.querySelector('.btn-save').textContent = '添加';
    }

    await saveFriends(friends);
    await renderFriends();
    clearForm();
}

// ========== 点击修改按钮 ==========

function startEdit(index) {
    loadFriends().then(friends => {
        const friend = friends[index];
        document.getElementById('input-name').value = friend.name;
        document.getElementById('input-desc').value = friend.desc;
        document.getElementById('input-github').value = extractUser(friend.github, 'https://github.com/');
        document.getElementById('input-luogu').value = extractUser(friend.luogu, 'https://luogu.com.cn/user/');
        document.getElementById('input-codeforces').value = extractUser(friend.codeforces, 'https://codeforces.com/profile/');
        document.getElementById('input-atcoder').value = extractUser(friend.atcoder, 'https://atcoder.jp/users/');
        document.getElementById('input-email').value = friend.email;

        editingIndex = index;
        document.querySelector('.btn-save').textContent = '保存修改';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== 删除 ==========

async function deleteFriend(index) {
    if (!confirm('确定删除这个友链吗？')) return;

    const friends = await loadFriends();
    friends.splice(index, 1);
    await saveFriends(friends);
    await renderFriends();
}

// ========== 清空表单 ==========

function clearForm() {
    document.querySelectorAll('.edit-form input').forEach(input => input.value = '');
}

// ========== 初始化 ==========

renderFriends();

// ========== 我的账号 ==========

const MY_ACCOUNTS_KEY = 'zky_my_accounts';

function loadMyAccounts() {
    const data = localStorage.getItem(MY_ACCOUNTS_KEY);
    return data ? JSON.parse(data) : {
        github: 'zhoukeyv',
        email: 'coder1232026@outlook.com',
        luogu: '1534256',
        atcoder: 'cqbzzky',
        codeforces: 'cqbzzky'
    };
}

function saveMyAccounts() {
    const accounts = {
        github: document.getElementById('my-github').value.trim(),
        email: document.getElementById('my-email').value.trim(),
        luogu: document.getElementById('my-luogu').value.trim(),
        atcoder: document.getElementById('my-atcoder').value.trim(),
        codeforces: document.getElementById('my-codeforces').value.trim()
    };
    localStorage.setItem(MY_ACCOUNTS_KEY, JSON.stringify(accounts));
    alert('账号信息已保存！刷新其他页面即可看到更新。');
}

function fillMyAccountForm() {
    const accounts = loadMyAccounts();
    document.getElementById('my-github').value = accounts.github || '';
    document.getElementById('my-email').value = accounts.email || '';
    document.getElementById('my-luogu').value = accounts.luogu || '';
    document.getElementById('my-atcoder').value = accounts.atcoder || '';
    document.getElementById('my-codeforces').value = accounts.codeforces || '';
}

// 页面加载时填充我的账号表单
fillMyAccountForm();