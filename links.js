const STORAGE_KEY = 'zky_friends';
const WORKER_URL = 'https://friends-api.coder1232026.workers.dev/api/friends';
const isLocal = window.location.protocol === 'file:';

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderLinks(friends) {
    const container = document.getElementById('friend-list');
    if (!container) return;

    container.innerHTML = '';

    if (!friends || friends.length === 0) {
        container.innerHTML = '<p style="color: #999;">暂无友链。</p>';
        return;
    }

    friends.forEach(friend => {
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.innerHTML = `
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

if (isLocal) {
    // 本地：读 localStorage
    const data = localStorage.getItem(STORAGE_KEY);
    const friends = data ? JSON.parse(data) : [];
    renderLinks(friends);
} else {
    // 网页端：读 Worker API
    fetch(WORKER_URL)
        .then(response => response.json())
        .then(friends => renderLinks(friends))
        .catch(() => {
            document.getElementById('friend-list').innerHTML = '<p style="color: #999;">加载友链失败。</p>';
        });
}