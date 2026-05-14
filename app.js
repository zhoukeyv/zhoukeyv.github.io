// ============================================================
// SPA 路由 + 各页面渲染
// ============================================================
const WORKER_URL = 'https://friends-api.coder1232026.workers.dev/api/friends';
const TOOLS_RAW  = 'https://raw.githubusercontent.com/zhoukeyv/zhoukeyv.github.io/main/data/tools.json';

const PAGE_TITLES = {
    home:     'zky',
    projects: '项目 - zky',
    skills:   '技能 - zky',
    tools:    '工具 - zky',
    links:    '友链 - zky',
    about:    '关于 - zky',
    contact:  '联系 - zky'
};

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

// ========== 路由 ==========
function getCurrentRoute() {
    const hash = location.hash.replace(/^#/, '');
    return PAGE_TITLES[hash] ? hash : 'home';
}

function showPage(route) {
    document.querySelectorAll('.route-page').forEach(el => {
        el.style.display = (el.dataset.page === route) ? '' : 'none';
    });
    document.querySelectorAll('#side-nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.route === route);
    });
    document.title = PAGE_TITLES[route] || 'zky';
    window.scrollTo(0, 0);

    // 懒加载：进入该页面再拉数据
    if (route === 'tools' && !toolsRendered) renderToolsPage();
    if (route === 'links' && !linksRendered) renderLinksPage();
}

function handleRouteChange() {
    showPage(getCurrentRoute());
}

window.addEventListener('hashchange', handleRouteChange);

// ========== 工具页 ==========
let toolsRendered = false;

async function renderToolsPage() {
    const container = document.getElementById('tools-container');
    if (!container) return;
    try {
        const r = await fetch(TOOLS_RAW + '?t=' + Date.now(), { cache: 'no-cache' });
        const categories = r.ok ? await r.json() : [];

        if (!categories.length) {
            container.innerHTML = '<p style="color:#999;text-align:center;">暂无工具。</p>';
            toolsRendered = true;
            return;
        }

        container.innerHTML = categories.map(cat => `
            <section class="tool-category">
                <div class="tool-category-header">
                    <h3>
                        ${cat.icon ? `<span class="tool-category-icon">${escapeHtml(cat.icon)}</span>` : ''}
                        ${escapeHtml(cat.category || '')}
                    </h3>
                    ${cat.desc ? `<p class="tool-category-desc">${escapeHtml(cat.desc)}</p>` : ''}
                </div>
                <div class="tool-list">
                    ${(cat.tools || []).map(t => `
                        <a class="tool-card" href="${escapeHtml(t.url)}" target="_blank" rel="noopener" title="${escapeHtml(t.url)}">
                            <div class="tool-card-name">${escapeHtml(t.name)}</div>
                            ${t.desc ? `<div class="tool-card-desc">${escapeHtml(t.desc)}</div>` : ''}
                        </a>
                    `).join('')}
                </div>
            </section>
        `).join('');
        toolsRendered = true;
    } catch (e) {
        container.innerHTML = '<p style="color:#999;text-align:center;">加载失败。</p>';
    }
}

// ========== 友链页 ==========
let linksRendered = false;

async function renderLinksPage() {
    const container = document.getElementById('friend-list');
    if (!container) return;
    try {
        const r = await fetch(WORKER_URL + '?t=' + Date.now());
        const friends = r.ok ? await r.json() : [];

        if (!friends.length) {
            container.innerHTML = '<p style="color:#999;">暂无友链。</p>';
            linksRendered = true;
            return;
        }

        container.innerHTML = friends.map(friend => `
            <div class="friend-card">
                <h3>${escapeHtml(friend.name)}</h3>
                <p class="friend-desc">${escapeHtml(friend.desc)}</p>
                <div class="friend-links">
                    ${friend.github ? `<a href="${escapeHtml(friend.github)}" target="_blank" class="btn-link btn-github">GitHub</a>` : ''}
                    ${friend.luogu ? `<a href="${escapeHtml(friend.luogu)}" target="_blank" class="btn-link btn-luogu">洛谷</a>` : ''}
                    ${friend.codeforces ? `<a href="${escapeHtml(friend.codeforces)}" target="_blank" class="btn-link btn-codeforces">CodeForces</a>` : ''}
                    ${friend.atcoder ? `<a href="${escapeHtml(friend.atcoder)}" target="_blank" class="btn-link btn-atcoder">AtCoder</a>` : ''}
                    ${friend.email ? `<a href="mailto:${escapeHtml(friend.email)}" class="btn-link btn-email">Email</a>` : ''}
                </div>
            </div>
        `).join('');
        linksRendered = true;
    } catch (e) {
        container.innerHTML = '<p style="color:#999;">加载失败。</p>';
    }
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', handleRouteChange);