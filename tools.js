const TOOLS_RAW = 'https://raw.githubusercontent.com/zhoukeyv/zhoukeyv.github.io/main/data/tools.json';

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

async function loadTools() {
    try {
        const r = await fetch(TOOLS_RAW + '?t=' + Date.now(), { cache: 'no-cache' });
        if (r.ok) return await r.json();
    } catch (e) { console.warn('加载工具失败', e); }
    return [];
}

function renderTools(categories) {
    const container = document.getElementById('tools-container');
    if (!container) return;

    if (!categories || !categories.length) {
        container.innerHTML = '<p style="color:#999;text-align:center;">暂无工具。</p>';
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
}

document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadTools();
    renderTools(data);
});