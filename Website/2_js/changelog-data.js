// 'new': '新功能',
// 'fix': '修復',
// 'improvement': '改進',
// 'development': '開發中'

const changelogData = {
    currentVersion: "3.0.0",
    lastUpdated: "2025-3-9 22:24",
    versions: [
        {
            version: "3.0.0",
            date: "2025-3-9 | 21:05pm",
            isLatest: true,
            changes: [
                {
                    icon: "fab fa-google",
                    description: "Google API 製作使用 Google 帳戶登入",
                    type: "new"
                },
                {
                    icon: "fas fa-book-open",
                    description: "添加 殺戮的天使 期待製作更多劇集摘要 | 優化返回功能",
                    type: "improvement"
                },
                {
                    icon: "fas fa-shield-alt",
                    description: "為了適應新系統 優化更多登入邏輯 | 防止作弊者 3.0",
                    type: "fix"
                },
                {
                    icon: "fas fa-server",
                    description: " 盡量使用「伺服器源」加快載入流量",
                    type: "improvement"
                },
                {
                    icon: "fas fa-tools",
                    description: "製作更多特色功能 + ing",
                    type: "development"
                }
            ]
        },
        {
            version: "2.0.3.2",
            date: "2025-01-29 | 21:54pm",
            changes: [
                {
                    icon: "fas fa-sign-in-alt",
                    description: "修改 登入成功後 還留在登入介面的邏輯 | 防止作弊者 2.0",
                    type: "fix"
                },
                {
                    icon: "fas fa-book",
                    description: "添加了再見螢火蟲 完善更多故事摘要",
                    type: "new"
                },
                {
                    icon: "fas fa-history",
                    description: "重新設計更新日誌 | 製作更多功能 連結 22:48pm",
                    type: "improvement"
                },
                {
                    icon: "fas fa-database",
                    description: "開發版 : 目前製作數據庫 方便整理每套電影龐大數據誌",
                    type: "development"
                }
            ]
        },
        {
            version: "2.0.3.1",
            date: "2025-01-28",
            changes: [
                {
                    icon: "fas fa-mobile-alt",
                    description: "開發人員/指令庫 響應式設計",
                    type: "improvement"
                },
                {
                    icon: "fas fa-film",
                    description: "添加龍貓 和  不支持播放溫馨提醒",
                    type: "new"
                },
                {
                    icon: "fas fa-video",
                    description: "期待製作更多影片平台功能",
                    type: "development"
                }
            ]
        },
        {
            version: "2.0.3",
            date: "2025-01-25",
            changes: [
                {
                    icon: "fas fa-terminal",
                    description: "製作影片平台 分享",
                    type: "new"
                },
                {
                    icon: "fas fa-film",
                    description: "有多啦A夢 新海城 電影",
                    type: "new"
                },
                {
                    icon: "fas fa-lock",
                    description: "目前需要登入 權限",
                    type: "new"
                }
            ]
        },
        {
            version: "2.0.2",
            date: "2025-01-21",
            changes: [
                {
                    icon: "fas fa-terminal",
                    description: "開發指令庫 驗證",
                    type: "new"
                },
                {
                    icon: "fas fa-magic",
                    description: "互動式效果",
                    type: "improvement"
                },
                {
                    icon: "fas fa-tools",
                    description: "敬請期待",
                    type: "development"
                }
            ]
        },
        {
            version: "2.0.1",
            date: "2025-01-20",
            changes: [
                {
                    icon: "fas fa-code-branch",
                    description: "開發人員 改版",
                    type: "new"
                },
                {
                    icon: "fas fa-user-shield",
                    description: "防止 作弊者",
                    type: "fix"
                },
                {
                    icon: "fas fa-brush",
                    description: "提高整體外觀",
                    type: "improvement"
                }
            ]
        },
        {
            version: "2.0.0",
            date: "2024-03-20",
            changes: [
                {
                    icon: "fas fa-star",
                    description: "全新界面設計",
                    type: "new"
                },
                {
                    icon: "fas fa-palette",
                    description: "優化使用者體驗",
                    type: "improvement"
                },
                {
                    icon: "fas fa-shield-alt",
                    description: "提升安全性",
                    type: "improvement"
                }
            ]
        },
        {
            version: "1.5.0",
            date: "2024-03-15",
            changes: [
                {
                    icon: "fas fa-plus",
                    description: "新增功能模組",
                    type: "new"
                },
                {
                    icon: "fas fa-bug",
                    description: "修復已知問題",
                    type: "fix"
                }
            ]
        },
        {
            version: "1.0.0",
            date: "2023-05-20",
            changes: [
                {
                    icon: "fas fa-rocket",
                    description: "首次發布",
                    type: "new"
                }
            ]
        }
    ]
};

function renderChangelog() {
    const changelogList = document.querySelector('.changelog-list');
    changelogList.innerHTML = '';

    changelogData.versions.forEach((version, index) => {
        const isFirst = index === 0;
        
        // 如果是第一個之後的版本，添加歷史版本標題
        if (index === 1) {
            const historyTitle = `
                <div class="history-title">
                    <i class="fas fa-history"></i>
                    歷史版本
                </div>
            `;
            changelogList.innerHTML += historyTitle;
        }

        const changelogItem = `
            <div class="changelog-item">
                <div class="version-header">
                    <div class="version" ${!isFirst ? 'onclick="toggleChangelog(this)"' : ''}>
                        ${!isFirst ? '<i class="fas fa-chevron-down"></i>' : ''}
                        Version ${version.version}
                        ${version.isLatest ? '<span class="version-tag">最新版本</span>' : ''}
                    </div>
                    <div class="date">${version.date}</div>
                </div>
                <div class="changes">
                    ${version.changes.map(change => `
                        <div class="change-item">
                            <i class="${change.icon}"></i>
                            <span>${change.description}</span>
                            <span class="feature-tag ${change.type}">${getTypeText(change.type)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        changelogList.innerHTML += changelogItem;
    });
}

function getTypeText(type) {
    const typeMap = {
        'new': '新功能',
        'fix': '修復',
        'improvement': '改進',
        'development': '開發中'
    };
    return typeMap[type] || type;
} 