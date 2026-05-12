(async function() {
    const MY_ACCOUNTS_KEY = 'zky_my_accounts';
    const ACCOUNTS_URL = 'https://raw.githubusercontent.com/zhoukeyv/zhoukeyv.github.io/main/data/my-accounts.json';

    const DEFAULT = {
        github: 'zhoukeyv',
        email: 'coder1232026@outlook.com',
        luogu: '1534256',
        atcoder: 'cqbzzky',
        codeforces: 'cqbzzky'
    };

    let accounts = DEFAULT;

    // 优先从 GitHub 拉，失败再用 localStorage，再失败用默认
    try {
        const r = await fetch(ACCOUNTS_URL, { cache: 'no-cache' });
        if (r.ok) {
            const data = await r.json();
            if (data && Object.keys(data).length) {
                accounts = data;
                localStorage.setItem(MY_ACCOUNTS_KEY, JSON.stringify(data));
            }
        }
    } catch (e) {
        const cached = localStorage.getItem(MY_ACCOUNTS_KEY);
        if (cached) accounts = JSON.parse(cached);
    }

    const container = document.getElementById('my-social-links');
    if (!container) return;

    container.innerHTML = `
        ${accounts.github ? `<a href="https://github.com/${accounts.github}" target="_blank">GitHub</a>` : ''}
        ${accounts.email ? `<a href="mailto:${accounts.email}">Email</a>` : ''}
        ${accounts.luogu ? `<a href="https://luogu.com.cn/user/${accounts.luogu}" target="_blank">洛谷</a>` : ''}
        ${accounts.atcoder ? `<a href="https://atcoder.jp/users/${accounts.atcoder}" target="_blank">Atcoder</a>` : ''}
        ${accounts.codeforces ? `<a href="https://codeforces.com/profile/${accounts.codeforces}" target="_blank">CodeForces</a>` : ''}
    `;
})();