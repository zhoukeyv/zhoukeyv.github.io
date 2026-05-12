(function() {
    const MY_ACCOUNTS_KEY = 'zky_my_accounts';
    const data = localStorage.getItem(MY_ACCOUNTS_KEY);
    const accounts = data ? JSON.parse(data) : {
        github: 'zhoukeyv',
        email: 'coder1232026@outlook.com',
        luogu: '1534256',
        atcoder: 'cqbzzky',
        codeforces: 'cqbzzky'
    };

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