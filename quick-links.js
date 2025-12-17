// 快速連結共用模組
// 提供：資料儲存、排序、管理頁初始化（含搜尋 / 分類 / 拖拉排序 / 匯出匯入 / 外觀設定）

;(function () {
  const STORAGE_KEY_LINKS = 'userQuickLinks'
  const STORAGE_KEY_CATEGORIES = 'userQuickLinkCategories'
  const STORAGE_KEY_THEME = 'quickLinksTheme'

  /** =========================
   *  日誌工具函數
   *  ========================= */
  function logImportant(emoji, message, data) {
    const timestamp = new Date().toLocaleTimeString('zh-TW')
    const logMessage = `[${timestamp}] ${emoji} ${message}`
    if (data !== undefined) {
      console.log(logMessage, data)
    } else {
      console.log(logMessage)
    }
  }

  function logDataChange(emoji, action, details) {
    const timestamp = new Date().toLocaleTimeString('zh-TW')
    console.log(`[${timestamp}] ${emoji} ${action}`, details)
  }

  function logError(emoji, message, error) {
    const timestamp = new Date().toLocaleTimeString('zh-TW')
    console.error(`[${timestamp}] ${emoji} ${message}`, error)
  }

  /** =========================
   *  資料存取層 QuickLinksStorage
   *  ========================= */
  const QuickLinksStorage = {
    loadLinks() {
      let links = []
      let isNewVisitor = false
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LINKS)
        if (saved) {
          links = JSON.parse(saved)
          logImportant('📥', `載入連結數據：從 localStorage 讀取 ${links.length} 個連結`)
        } else {
          isNewVisitor = true
          logImportant('📥', '載入連結數據：localStorage 中沒有數據，使用預設連結（新訪客）')
          const now = Date.now()
          links = [
            {
              id: now + 1,
              name: '首頁',
              url: 'index.html',
              description: '返回主頁',
              pinned: true,
              lastUsedAt: now,
              category: '預設',
              order: 0,
              openInNewTab: false,
              faviconUrl: getFaviconUrl('index.html')
            },
            {
              id: now + 2,
              name: '學習資料',
              url: 'user/subjects/',
              description: '瀏覽學習資源',
              pinned: false,
              lastUsedAt: now,
              category: '預設',
              order: 1,
              openInNewTab: false,
              faviconUrl: getFaviconUrl('user/subjects/')
            },
            {
              id: now + 3,
              name: 'Google',
              url: 'https://www.google.com',
              description: 'Google 搜尋引擎',
              pinned: false,
              lastUsedAt: now,
              category: '常用工具',
              order: 0,
              openInNewTab: true,
              faviconUrl: 'https://www.google.com/favicon.ico'
            },
            {
              id: now + 4,
              name: 'GitHub',
              url: 'https://github.com',
              description: '程式碼託管平台',
              pinned: false,
              lastUsedAt: now,
              category: '常用工具',
              order: 1,
              openInNewTab: true,
              faviconUrl: 'https://github.com/favicon.ico'
            },
            {
              id: now + 5,
              name: 'YouTube',
              url: 'https://www.youtube.com',
              description: '影片分享平台',
              pinned: false,
              lastUsedAt: now,
              category: '娛樂',
              order: 0,
              openInNewTab: true,
              faviconUrl: 'https://www.youtube.com/favicon.ico'
            },
            {
              id: now + 6,
              name: 'Wikipedia',
              url: 'https://www.wikipedia.org',
              description: '線上百科全書',
              pinned: false,
              lastUsedAt: now,
              category: '學習',
              order: 0,
              openInNewTab: true,
              faviconUrl: 'https://www.wikipedia.org/favicon.ico'
            },
            {
              id: now + 7,
              name: 'MDN Web Docs',
              url: 'https://developer.mozilla.org',
              description: 'Web 開發文檔',
              pinned: false,
              lastUsedAt: now,
              category: '學習',
              order: 1,
              openInNewTab: true,
              faviconUrl: 'https://developer.mozilla.org/favicon.ico'
            }
          ]
          localStorage.setItem(STORAGE_KEY_LINKS, JSON.stringify(links))
          logImportant('📥', `載入連結數據：已創建並保存 ${links.length} 個預設連結`)
        }
      } catch (e) {
        logError('⚠️', '載入連結數據失敗', e)
        links = []
      }
      const normalized = links.map(normalizeLink)
      logImportant('✅', `載入連結數據完成：共 ${normalized.length} 個連結`)
      return { links: normalized, isNewVisitor }
    },

    saveLinks(links) {
      try {
        localStorage.setItem(STORAGE_KEY_LINKS, JSON.stringify(links))
        logImportant('💾', `保存連結數據：已保存 ${links.length} 個連結到 localStorage`)
      } catch (e) {
        logError('⚠️', '保存連結數據失敗', e)
      }
    },

    loadCategories() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES)
        if (saved) {
          const categories = JSON.parse(saved)
          logImportant('📥', `載入分類數據：從 localStorage 讀取 ${categories.length} 個分類`, categories)
          return categories
        }
      } catch (e) {
        logError('⚠️', '載入分類數據失敗', e)
      }
      const defaults = ['預設', '常用工具', '學習', '娛樂']
      try {
        localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(defaults))
        logImportant('📥', `載入分類數據：使用預設分類`, defaults)
      } catch (e) {
        logError('⚠️', '保存預設分類失敗', e)
      }
      return defaults
    },

    saveCategories(categories) {
      try {
        localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories))
        logImportant('💾', `保存分類數據：已保存 ${categories.length} 個分類到 localStorage`, categories)
      } catch (e) {
        logError('⚠️', '保存分類數據失敗', e)
      }
    },

    sortLinks(links) {
      links.sort((a, b) => {
        if ((a.pinned ? 1 : 0) !== (b.pinned ? 1 : 0)) {
          return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
        }
        const orderA = typeof a.order === 'number' ? a.order : 0
        const orderB = typeof b.order === 'number' ? b.order : 0
        if (orderA !== orderB) return orderA - orderB
        return (b.lastUsedAt || 0) - (a.lastUsedAt || 0)
      })
    }
  }

  const STORAGE_KEY_CATEGORY_COLORS = 'userQuickLinkCategoryColors'

  let categoryColors = {
    數學: 'blue',
    英文: 'green',
    程式: 'orange',
    預設: 'gray',
    常用工具: 'blue',
    學習: 'green',
    娛樂: 'purple'
  }

  const availableColors = [
    'blue', 'green', 'orange', 'red', 'purple', 'yellow', 'cyan', 
    'pink', 'indigo', 'teal', 'lime', 'amber', 'gray', 'rose', 
    'violet', 'emerald', 'sky', 'fuchsia'
  ]

  const fallbackColors = ['blue', 'green', 'orange', 'gray', 'red', 'purple', 'yellow', 'cyan', 'pink', 'indigo', 'teal', 'lime', 'amber', 'rose', 'violet', 'emerald', 'sky', 'fuchsia']

  function loadCategoryColors() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORY_COLORS)
      if (saved) {
        const loaded = JSON.parse(saved)
        categoryColors = Object.assign({}, categoryColors, loaded)
        logImportant('📥', '載入分類顏色配置：從 localStorage 讀取', categoryColors)
      } else {
        logImportant('📥', '載入分類顏色配置：使用預設顏色配置', categoryColors)
      }
    } catch (e) {
      logError('⚠️', '載入分類顏色配置失敗', e)
    }
  }

  function saveCategoryColors() {
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORY_COLORS, JSON.stringify(categoryColors))
      logImportant('💾', '保存分類顏色配置：已保存到 localStorage', categoryColors)
    } catch (e) {
      logError('⚠️', '保存分類顏色配置失敗', e)
    }
  }

  loadCategoryColors()

  function normalizeLink(link) {
    const copy = Object.assign(
      {
        description: '',
        pinned: false,
        lastUsedAt: 0,
        category: '預設',
        order: 0,
        openInNewTab: false,
        faviconUrl: ''
      },
      link
    )
    // 移除不需要的舊字段
    delete copy.icon
    delete copy.color
    // 確保必要字段存在
    if (!copy.faviconUrl && copy.url) {
      copy.faviconUrl = getFaviconUrl(copy.url)
    }
    return copy
  }

  function getFaviconUrl(url) {
    try {
      const u = new URL(url, window.location.href)
      return u.origin + '/favicon.ico'
    } catch (e) {
      return '/favicon.ico'
    }
  }

  /** =========================
   *  管理頁 QuickLinksManager
   *  ========================= */

  const QuickLinksManager = (function () {
    let links = []
    let categories = []
    let state = {
      searchText: '',
      currentCategory: '全部'
    }

    let els = {}
    let editingLinkId = null
    let isAdvancedOpen = false
    let currentTheme = 'theme1'

    function initManagerPage(options) {
      els = {
        linksGrid: document.querySelector(options.linksGridSelector || '#linksGrid'),
        addForm: document.querySelector(options.addFormSelector || '#addLinkForm'),
        searchInput: document.querySelector(options.searchInputSelector || '#linkSearchInput'),
        categorySelect: document.querySelector(options.categorySelectSelector || '#categoryFilter'),
        categoryList: document.querySelector(options.categoryListSelector || '#categoryList'),
        addCategoryInput: document.querySelector(options.addCategoryInputSelector || '#newCategoryName'),
        addCategoryBtn: document.querySelector(options.addCategoryBtnSelector || '#addCategoryBtn'),
        exportBtn: document.querySelector(options.exportBtnSelector || '#exportLinksBtn'),
        importBtn: document.querySelector(options.importBtnSelector || '#importLinksBtn'),
        importFileInput: document.querySelector(options.importFileInputSelector || '#importLinksFile'),
        pasteJsonBtn: document.querySelector('#pasteJsonBtn'),
        pasteJsonArea: document.querySelector('#pasteJsonArea'),
        pasteJsonInput: document.querySelector('#pasteJsonInput'),
        confirmPasteJsonBtn: document.querySelector('#confirmPasteJsonBtn'),
        cancelPasteJsonBtn: document.querySelector('#cancelPasteJsonBtn'),
        toggleAdvanced: document.querySelector('#toggleAdvancedBtn'),
        advancedPanel: document.querySelector('#advancedPanel'),
        toolbarAddLinkBtn: document.querySelector('#toolbarAddLinkBtn'),
        themeToggleBtn: document.querySelector('#themeToggleBtn'),
        fontSizeDecrease: document.querySelector('#fontSizeDecrease'),
        fontSizeReset: document.querySelector('#fontSizeReset'),
        fontSizeIncrease: document.querySelector('#fontSizeIncrease'),
        editOverlay: document.getElementById('editModalOverlay'),
        editClose: document.getElementById('editModalClose'),
        editCancel: document.getElementById('editModalCancel'),
        editSave: document.getElementById('editModalSave'),
        editName: document.getElementById('editLinkName'),
        editUrl: document.getElementById('editLinkUrl'),
        editDescription: document.getElementById('editLinkDescription'),
        editImageUrl: document.getElementById('editLinkImageUrl'),
        editCategorySelect: document.getElementById('editLinkCategorySelect'),
        editCategory: document.getElementById('editLinkCategory'),
        editOpenInNewTab: document.getElementById('editLinkOpenInNewTab'),
        linkCategorySelect: document.getElementById('linkCategorySelect'),
        deleteDataBtn: document.getElementById('deleteDataBtn'),
        welcomeOverlay: document.getElementById('welcomeOverlay'),
        welcomeStartBtn: document.getElementById('welcomeStartBtn'),
        fireworksContainer: document.getElementById('fireworksContainer')
      }

      const loadResult = QuickLinksStorage.loadLinks()
      links = loadResult.links
      const isNewVisitor = loadResult.isNewVisitor
      
      categories = QuickLinksStorage.loadCategories()
      ensureCategoriesFromLinks()
      QuickLinksStorage.saveCategories(categories)
      
      // 如果是第一次載入且沒有保存的分類顏色，保存預設分類顏色
      if (!localStorage.getItem(STORAGE_KEY_CATEGORY_COLORS)) {
        saveCategoryColors()
      }

      bindForm()
      bindSearchAndFilter()
      bindCategoryManagement()
      bindExportImport()
      bindPasteJson()
      bindDeleteData()
      bindAdvancedToggle()
      bindEditModal()
      initTheme()
      bindFontSizeControls()

      renderCategories()
      updateCategorySelects()
      renderLinks()

      // 檢測是否顯示歡迎頁面：只有當 quickLinksHasSeenWelcome = 'true' 時才不顯示
      const hasSeenWelcome = localStorage.getItem('quickLinksHasSeenWelcome')
      if (hasSeenWelcome !== 'true') {
        showWelcomePage()
      }

      if (els.linkCategorySelect) {
        const categoryInput = document.getElementById('linkCategory')
        if (categoryInput && els.linkCategorySelect.value !== '__custom__') {
          categoryInput.style.display = 'none'
        }
        els.linkCategorySelect.addEventListener('change', function () {
          const categoryInput = document.getElementById('linkCategory')
          if (this.value === '__custom__') {
            if (categoryInput) categoryInput.style.display = 'block'
          } else {
            if (categoryInput) {
              categoryInput.style.display = 'none'
              categoryInput.value = this.value
            }
          }
        })
      }

      if (els.editCategorySelect) {
        if (els.editCategory && els.editCategorySelect.value !== '__custom__') {
          els.editCategory.style.display = 'none'
        }
        els.editCategorySelect.addEventListener('change', function () {
          if (els.editCategory) {
            if (this.value === '__custom__') {
              els.editCategory.style.display = 'block'
            } else {
              els.editCategory.style.display = 'none'
              els.editCategory.value = this.value
            }
          }
        })
      }
    }

    function ensureCategoriesFromLinks() {
      links.forEach(l => {
        if (l.category && !categories.includes(l.category)) {
          categories.push(l.category)
        }
      })
    }

    function bindForm() {
      if (!els.addForm) return
      els.addForm.addEventListener('submit', function (e) {
        e.preventDefault()
        const nameEl = document.getElementById('linkName')
        const urlEl = document.getElementById('linkUrl')
        const descriptionEl = document.getElementById('linkDescription')
        const imageUrlEl = document.getElementById('linkImageUrl')
        const categorySelectEl = els.linkCategorySelect
        const categoryEl = document.getElementById('linkCategory')
        const newTabEl = document.getElementById('linkOpenInNewTab')

        const name = nameEl.value.trim()
        const url = urlEl.value.trim()
        if (!name || !url) return

        const description = descriptionEl ? descriptionEl.value.trim() : ''
        const imageUrl = imageUrlEl ? imageUrlEl.value.trim() : ''
        let category = '預設'
        if (categorySelectEl && categorySelectEl.value) {
          if (categorySelectEl.value === '__custom__') {
            category = categoryEl && categoryEl.value.trim() ? categoryEl.value.trim() : '預設'
          } else {
            category = categorySelectEl.value
          }
        } else if (categoryEl && categoryEl.value.trim()) {
          category = categoryEl.value.trim()
        }
        const openInNewTab = !!(newTabEl && newTabEl.checked)

        if (!categories.includes(category)) {
          categories.push(category)
          QuickLinksStorage.saveCategories(categories)
          renderCategories()
          updateCategorySelects()
          logDataChange('➕', '新增分類', { 分類名稱: category })
        }

        const faviconUrl = imageUrl || getFaviconUrl(url)

        const newLink = normalizeLink({
          id: Date.now(),
          name,
          url,
          icon: '',
          description: description || '',
          pinned: false,
          lastUsedAt: Date.now(),
          category,
          order: links.length,
          openInNewTab,
          color: '',
          faviconUrl: faviconUrl
        })

        links.push(newLink)
        QuickLinksStorage.sortLinks(links)
        QuickLinksStorage.saveLinks(links)
        renderLinks()

        els.addForm.reset()
        logDataChange('➕', '新增連結', { 名稱: name, 網址: url, 分類: category })
        showNotification('連結已添加！', 'success')
      })
    }

    function bindSearchAndFilter() {
      if (els.searchInput) {
        els.searchInput.addEventListener('input', function () {
          state.searchText = this.value.toLowerCase()
          renderLinks()
        })
      }
      if (els.categorySelect) {
        els.categorySelect.addEventListener('change', function () {
          state.currentCategory = this.value
          renderLinks()
        })
      }
    }

    function bindCategoryManagement() {
      if (els.addCategoryBtn && els.addCategoryInput) {
        els.addCategoryBtn.addEventListener('click', function () {
          const name = els.addCategoryInput.value.trim()
          if (!name) return
          if (!categories.includes(name)) {
            categories.push(name)
            const color = inferColorForCategory(name)
            QuickLinksStorage.saveCategories(categories)
            renderCategories()
            updateCategorySelects()
            els.addCategoryInput.value = ''
            logDataChange('➕', '新增分類', { 分類名稱: name, 顏色: color })
          }
        })
      }
    }

    function bindExportImport() {
      if (els.exportBtn) {
        els.exportBtn.addEventListener('click', async function () {
          // 清理並標準化所有連結數據
          const cleanedLinks = links.map(link => normalizeLink(link))
          
          const data = {
            version: '2.0',
            links: cleanedLinks,
            categories: categories,
            categoryColors: categoryColors
          }
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
          })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'quick-links-backup.json'
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
          logDataChange('📤', '匯出數據', { 連結數量: cleanedLinks.length, 分類數量: categories.length, 檔案名稱: 'quick-links-backup.json' })
          showNotification('連結已匯出！', 'success')
        })
      }

      if (els.importBtn && els.importFileInput) {
        els.importBtn.addEventListener('click', async function () {
          els.importFileInput.click()
        })

        els.importFileInput.addEventListener('change', async function () {
          const file = this.files && this.files[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = function (e) {
            try {
              const result = JSON.parse(e.target.result)
              
              // 驗證數據格式
              if (!result) {
                showNotification('匯入失敗：檔案格式不正確', 'error')
                return
              }
              
              if (!Array.isArray(result.links)) {
                showNotification('匯入失敗：缺少連結數據', 'error')
                return
              }
              
              showConfirmDialog('匯入會覆蓋目前的快速連結與分類，確定要繼續嗎？').then(confirmed => {
                if (!confirmed) {
                  return
                }
                
                // 處理連結數據：標準化並移除舊字段
                links = result.links.map(link => normalizeLink(link))
                
                // 處理分類數據
                if (Array.isArray(result.categories)) {
                  categories = result.categories
                } else {
                  categories = QuickLinksStorage.loadCategories()
                }
                
                // 處理分類顏色數據
                if (result.categoryColors && typeof result.categoryColors === 'object') {
                  categoryColors = Object.assign({}, categoryColors, result.categoryColors)
                  saveCategoryColors()
                }
                
                // 確保所有連結的分類都存在於分類列表中
                ensureCategoriesFromLinks()
                
                // 保存數據
                QuickLinksStorage.saveLinks(links)
                QuickLinksStorage.saveCategories(categories)
                
                // 重新渲染
                renderCategories()
                updateCategorySelects()
                renderLinks()
                logDataChange('📥', '匯入數據（檔案）', { 連結數量: links.length, 分類數量: categories.length, 檔案名稱: file.name })
                showNotification('匯入成功！', 'success')
              })
            } catch (err) {
              logError('⚠️', '匯入數據失敗（檔案）', err)
              showNotification('匯入失敗：無法解析檔案 - ' + err.message, 'error')
            } finally {
              els.importFileInput.value = ''
            }
          }
          reader.readAsText(file, 'utf-8')
        })
      }
    }

    function bindPasteJson() {
      if (els.pasteJsonBtn && els.pasteJsonArea) {
        els.pasteJsonBtn.addEventListener('click', function () {
          els.pasteJsonArea.style.display = els.pasteJsonArea.style.display === 'none' ? 'block' : 'none'
          if (els.pasteJsonArea.style.display === 'block' && els.pasteJsonInput) {
            els.pasteJsonInput.focus()
          }
        })
      }

      if (els.cancelPasteJsonBtn && els.pasteJsonArea) {
        els.cancelPasteJsonBtn.addEventListener('click', function () {
          els.pasteJsonArea.style.display = 'none'
          if (els.pasteJsonInput) {
            els.pasteJsonInput.value = ''
          }
        })
      }

      if (els.confirmPasteJsonBtn && els.pasteJsonInput) {
        els.confirmPasteJsonBtn.addEventListener('click', function () {
          const jsonText = els.pasteJsonInput.value.trim()
          if (!jsonText) {
            showNotification('請輸入 JSON 數據', 'error')
            return
          }

          try {
            const result = JSON.parse(jsonText)
            
            // 驗證數據格式
            if (!result) {
              showNotification('匯入失敗：JSON 格式不正確', 'error')
              return
            }
            
            if (!Array.isArray(result.links)) {
              showNotification('匯入失敗：缺少連結數據', 'error')
              return
            }
            
            showConfirmDialog('匯入會覆蓋目前的快速連結與分類，確定要繼續嗎？').then(confirmed => {
              if (!confirmed) {
                return
              }
              
              // 處理連結數據：標準化並移除舊字段
              links = result.links.map(link => normalizeLink(link))
              
              // 處理分類數據
              if (Array.isArray(result.categories)) {
                categories = result.categories
              } else {
                categories = QuickLinksStorage.loadCategories()
              }
              
              // 處理分類顏色數據
              if (result.categoryColors && typeof result.categoryColors === 'object') {
                categoryColors = Object.assign({}, categoryColors, result.categoryColors)
                saveCategoryColors()
              }
              
              // 確保所有連結的分類都存在於分類列表中
              ensureCategoriesFromLinks()
              
              // 保存數據
              QuickLinksStorage.saveLinks(links)
              QuickLinksStorage.saveCategories(categories)
              
              // 重新渲染
              renderCategories()
              updateCategorySelects()
              renderLinks()
              
              // 關閉貼上區域
              els.pasteJsonArea.style.display = 'none'
              els.pasteJsonInput.value = ''
              
              logDataChange('📥', '匯入數據（貼上 JSON）', { 連結數量: links.length, 分類數量: categories.length, 長度: jsonText.length })
              showNotification('匯入成功！', 'success')
            })
          } catch (err) {
            logError('⚠️', '匯入數據失敗（貼上 JSON）', err)
            showNotification('匯入失敗：JSON 格式錯誤 - ' + err.message, 'error')
          }
        })
      }
    }

    function bindDeleteData() {
      if (!els.deleteDataBtn) return

      els.deleteDataBtn.addEventListener('click', async function () {
        // 第一階段：確認是否已備份
        const hasBackedUp = await showConfirmDialog('您是否已經備份好數據？\n\n建議先匯出數據進行備份，刪除操作無法復原。')
        if (!hasBackedUp) {
          logImportant('ℹ️', '用戶取消刪除數據：未確認備份')
          return
        }

        // 第二階段：確認是否還原預設數據
        const restoreDefault = await showConfirmDialog('是否還原預設數據？\n\n選擇「確定」將在刪除後載入預設連結，選擇「取消」將清空所有數據。')
        
        // 第三階段：最終確認（10秒倒計時）
        const finalConfirm = await showDeleteConfirmWithCountdown('您真的確定要刪除所有數據嗎？\n\n此操作無法復原，請謹慎確認。')
        if (!finalConfirm) {
          logImportant('ℹ️', '用戶取消刪除數據：最終確認取消')
          return
        }

        // 執行刪除操作
        try {
          // 清除所有數據
          localStorage.removeItem(STORAGE_KEY_LINKS)
          localStorage.removeItem(STORAGE_KEY_CATEGORIES)
          localStorage.removeItem(STORAGE_KEY_CATEGORY_COLORS)
          localStorage.removeItem("quickLinksHasSeenWelcome")
          
          
          if (restoreDefault) {
            // 還原預設數據
            // 注意：不清除 quickLinksHasSeenWelcome，因為用戶已經看過歡迎頁面
            const loadResult = QuickLinksStorage.loadLinks()
            links = loadResult.links
            categories = QuickLinksStorage.loadCategories()
            ensureCategoriesFromLinks()
            QuickLinksStorage.saveCategories(categories)
            saveCategoryColors()
            logDataChange('🗑️', '刪除所有數據並還原預設', { 還原預設: true })
          } else {
            // 清空所有數據
            links = []
            categories = []
            categoryColors = {}
            logDataChange('🗑️', '刪除所有數據', { 還原預設: false })
          }

          // 重新渲染
          renderCategories()
          updateCategorySelects()
          renderLinks()
          
          showNotification('數據已刪除！' + (restoreDefault ? '已還原預設數據。' : ''), 'success')
        } catch (err) {
          logError('⚠️', '刪除數據失敗', err)
          showNotification('刪除數據時發生錯誤：' + err.message, 'error')
        }
      })
    }

    function showDeleteConfirmWithCountdown(message) {
      return new Promise(resolve => {
        const overlay = document.getElementById('dialogOverlay')
        const msgEl = document.getElementById('dialogMessage')
        const inputGroup = document.getElementById('dialogInputGroup')
        const okBtn = document.getElementById('dialogOkBtn')
        const cancelBtn = document.getElementById('dialogCancelBtn')
        const closeBtn = document.getElementById('dialogClose')

        if (!overlay || !msgEl || !okBtn || !cancelBtn || !closeBtn) {
          resolve(window.confirm(message))
          return
        }

        inputGroup.style.display = 'none'
        msgEl.textContent = message
        overlay.style.display = 'flex'
        setTimeout(() => {
          overlay.classList.add('showing')
        }, 10)

        let countdown = 10
        okBtn.disabled = true
        okBtn.textContent = `確定 (${countdown}秒)`

        const countdownInterval = setInterval(() => {
          countdown--
          if (countdown > 0) {
            okBtn.textContent = `確定 (${countdown}秒)`
          } else {
            clearInterval(countdownInterval)
            okBtn.disabled = false
            okBtn.textContent = '確定'
          }
        }, 1000)

        const cleanup = result => {
          clearInterval(countdownInterval)
          overlay.classList.remove('showing')
          overlay.classList.add('hiding')
          setTimeout(() => {
            overlay.style.display = 'none'
            overlay.classList.remove('hiding')
            okBtn.disabled = false
            okBtn.textContent = '確定'
            okBtn.onclick = null
            cancelBtn.onclick = null
            closeBtn.onclick = null
            resolve(result)
          }, 200)
        }

        okBtn.onclick = () => cleanup(true)
        cancelBtn.onclick = () => cleanup(false)
        closeBtn.onclick = () => cleanup(false)
        overlay.onclick = e => {
          if (e.target === overlay) cleanup(false)
        }
      })
    }

    function showFireworks() {
      if (!els.fireworksContainer) return

      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#FF1493', '#00FF00', '#FF00FF', '#00CED1']
      const particleCount = 150
      const burstCount = 5

      // 多個煙花爆發點
      const burstPoints = [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 50, y: 30 },
        { x: 15, y: 70 },
        { x: 85, y: 70 }
      ]

      // 為每個爆發點創建煙花
      burstPoints.forEach((point, burstIndex) => {
        setTimeout(() => {
          const centerX = (window.innerWidth * point.x) / 100
          const centerY = (window.innerHeight * point.y) / 100

          for (let i = 0; i < particleCount / burstCount; i++) {
            const particle = document.createElement('div')
            particle.className = 'firework-particle'
            
            const angle = (Math.PI * 2 * i) / (particleCount / burstCount)
            const velocity = 150 + Math.random() * 400
            const color = colors[Math.floor(Math.random() * colors.length)]
            const size = 4 + Math.random() * 8
            
            particle.style.backgroundColor = color
            particle.style.left = centerX + 'px'
            particle.style.top = centerY + 'px'
            particle.style.width = size + 'px'
            particle.style.height = size + 'px'
            particle.style.borderRadius = '50%'
            particle.style.position = 'absolute'
            particle.style.pointerEvents = 'none'
            particle.style.zIndex = '10000'
            particle.style.boxShadow = `0 0 ${size * 2}px ${color}`
            
            els.fireworksContainer.appendChild(particle)

            const vx = Math.cos(angle) * velocity
            const vy = Math.sin(angle) * velocity
            const duration = 2000 + Math.random() * 2000

            particle.animate([
              {
                transform: 'translate(0, 0) scale(1)',
                opacity: 1
              },
              {
                transform: `translate(${vx}px, ${vy}px) scale(0)`,
                opacity: 0
              }
            ], {
              duration: duration,
              easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => {
              particle.remove()
            }
          }
        }, burstIndex * 300)
      })

      // 持續發射小煙花
      fireworksInterval = setInterval(() => {
        if (!els.fireworksContainer || !els.welcomeOverlay || els.welcomeOverlay.style.display === 'none') {
          clearInterval(fireworksInterval)
          fireworksInterval = null
          return
        }

        const randomX = Math.random() * window.innerWidth
        const randomY = Math.random() * window.innerHeight * 0.5
        const burstParticleCount = 30

        for (let i = 0; i < burstParticleCount; i++) {
          const particle = document.createElement('div')
          particle.className = 'firework-particle'
          
          const angle = (Math.PI * 2 * i) / burstParticleCount
          const velocity = 100 + Math.random() * 200
          const color = colors[Math.floor(Math.random() * colors.length)]
          const size = 3 + Math.random() * 5
          
          particle.style.backgroundColor = color
          particle.style.left = randomX + 'px'
          particle.style.top = randomY + 'px'
          particle.style.width = size + 'px'
          particle.style.height = size + 'px'
          particle.style.borderRadius = '50%'
          particle.style.position = 'absolute'
          particle.style.pointerEvents = 'none'
          particle.style.zIndex = '10000'
          particle.style.boxShadow = `0 0 ${size * 2}px ${color}`
          
          els.fireworksContainer.appendChild(particle)

          const vx = Math.cos(angle) * velocity
          const vy = Math.sin(angle) * velocity
          const duration = 1500 + Math.random() * 1000

          particle.animate([
            {
              transform: 'translate(0, 0) scale(1)',
              opacity: 1
            },
            {
              transform: `translate(${vx}px, ${vy}px) scale(0)`,
              opacity: 0
            }
          ], {
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }).onfinish = () => {
            particle.remove()
          }
        }
      }, 800)
    }

    let fireworksInterval = null

    function showWelcomePage() {
      if (!els.welcomeOverlay) return

      els.welcomeOverlay.style.display = 'flex'
      setTimeout(() => {
        els.welcomeOverlay.classList.add('showing')
        showFireworks()
      }, 100)

      if (els.welcomeStartBtn) {
        // 移除舊的事件監聽器（如果存在）
        const newBtn = els.welcomeStartBtn.cloneNode(true)
        els.welcomeStartBtn.parentNode.replaceChild(newBtn, els.welcomeStartBtn)
        els.welcomeStartBtn = newBtn

        els.welcomeStartBtn.addEventListener('click', function () {
          // 停止煙花動畫
          if (fireworksInterval) {
            clearInterval(fireworksInterval)
            fireworksInterval = null
          }
          // 清除所有煙花粒子
          if (els.fireworksContainer) {
            els.fireworksContainer.innerHTML = ''
          }

          els.welcomeOverlay.classList.remove('showing')
          els.welcomeOverlay.classList.add('hiding')
          setTimeout(() => {
            els.welcomeOverlay.style.display = 'none'
            els.welcomeOverlay.classList.remove('hiding')
            localStorage.setItem('quickLinksHasSeenWelcome', 'true')
            logImportant('🎉', '新訪客歡迎頁面已關閉')
          }, 300)
        })
      }
    }

    function bindAdvancedToggle() {
      if (els.toggleAdvanced && els.advancedPanel) {
        els.toggleAdvanced.addEventListener('click', function () {
          isAdvancedOpen = !isAdvancedOpen
          els.advancedPanel.classList.toggle('is-open', isAdvancedOpen)
          els.toggleAdvanced.setAttribute('aria-expanded', isAdvancedOpen ? 'true' : 'false')
          const icon = els.toggleAdvanced.querySelector('.advanced-toggle-icon')
          if (icon) {
            icon.textContent = isAdvancedOpen ? '▲' : '▼'
          }
        })
      }

      if (els.toolbarAddLinkBtn && els.advancedPanel) {
        els.toolbarAddLinkBtn.addEventListener('click', function () {
          if (!isAdvancedOpen && els.toggleAdvanced) {
            els.toggleAdvanced.click()
          }
          const addForm = document.getElementById('addLinkForm')
          if (addForm) {
            addForm.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        })
      }
    }

    function initTheme() {
      const saved = localStorage.getItem(STORAGE_KEY_THEME)
      if (saved === 'theme1' || saved === 'theme2') {
        currentTheme = saved
      }
      applyTheme()
      if (els.themeToggleBtn) {
        els.themeToggleBtn.addEventListener('click', function () {
          currentTheme = currentTheme === 'theme1' ? 'theme2' : 'theme1'
          localStorage.setItem(STORAGE_KEY_THEME, currentTheme)
          applyTheme()
        })
      }
    }

    function applyTheme() {
      const body = document.body
      body.classList.remove('theme-1', 'theme-2')
      if (currentTheme === 'theme2') {
        body.classList.add('theme-2')
        if (els.themeToggleBtn) els.themeToggleBtn.textContent = '外觀：方案二'
      } else {
        body.classList.add('theme-1')
        if (els.themeToggleBtn) els.themeToggleBtn.textContent = '外觀：方案一'
      }
    }

    function bindFontSizeControls() {
      const STORAGE_KEY_FONT_SIZE = 'quickLinksFontSize'
      const MIN_FONT_SIZE = 0.85
      const MAX_FONT_SIZE = 1.3
      const DEFAULT_FONT_SIZE = 1

      function getCurrentFontSize() {
        const saved = localStorage.getItem(STORAGE_KEY_FONT_SIZE)
        return saved ? parseFloat(saved) : DEFAULT_FONT_SIZE
      }

      function setFontSize(size) {
        const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size))
        document.documentElement.style.setProperty('--font-size-multiplier', clampedSize)
        localStorage.setItem(STORAGE_KEY_FONT_SIZE, String(clampedSize))
      }

      // 初始化字體大小
      setFontSize(getCurrentFontSize())

      if (els.fontSizeDecrease) {
        els.fontSizeDecrease.addEventListener('click', function () {
          const current = getCurrentFontSize()
          setFontSize(current - 0.05)
        })
      }

      if (els.fontSizeIncrease) {
        els.fontSizeIncrease.addEventListener('click', function () {
          const current = getCurrentFontSize()
          setFontSize(current + 0.05)
        })
      }

      if (els.fontSizeReset) {
        els.fontSizeReset.addEventListener('click', function () {
          setFontSize(DEFAULT_FONT_SIZE)
        })
      }
    }

    function bindEditModal() {
      if (!els.editOverlay) return

      function closeModal() {
        if (els.editOverlay) {
          els.editOverlay.classList.remove('showing')
          els.editOverlay.classList.add('hiding')
          setTimeout(() => {
            editingLinkId = null
            els.editOverlay.style.display = 'none'
            els.editOverlay.classList.remove('hiding')
          }, 200)
        }
      }

      els.editClose && els.editClose.addEventListener('click', closeModal)
      els.editCancel && els.editCancel.addEventListener('click', closeModal)

      els.editSave &&
        els.editSave.addEventListener('click', function () {
          if (editingLinkId == null) return
          const link = links.find(l => l.id === editingLinkId)
          if (!link) return

          const name = els.editName.value.trim()
          const url = els.editUrl.value.trim()
          const desc = els.editDescription ? els.editDescription.value.trim() : ''
          const imageUrl = els.editImageUrl ? els.editImageUrl.value.trim() : ''
          const category = els.editCategorySelect && els.editCategorySelect.value === '__custom__' 
            ? els.editCategory.value.trim() 
            : (els.editCategorySelect ? els.editCategorySelect.value : els.editCategory.value.trim())
          const openInNewTab = !!els.editOpenInNewTab.checked

          if (!name || !url) {
            showNotification('名稱與網址為必填', 'error')
            return
          }

          showConfirmDialog('確定要更新這個連結嗎？').then(confirmed => {
            if (!confirmed) return

            const oldName = link.name
            const oldCategory = link.category
            link.name = name
            link.url = url
            link.description = desc
            if (category) {
              link.category = category
              if (!categories.includes(category)) {
                categories.push(category)
                inferColorForCategory(category)
                logDataChange('➕', '新增分類（編輯連結時）', { 分類名稱: category })
              }
            }
            link.openInNewTab = openInNewTab
            link.faviconUrl = imageUrl || getFaviconUrl(url)

            QuickLinksStorage.saveLinks(links)
            QuickLinksStorage.saveCategories(categories)
            saveCategoryColors()
            renderCategories()
            updateCategorySelects()
            renderLinks()
            closeModal()
            logDataChange('✏️', '編輯連結', { 
              舊名稱: oldName, 
              新名稱: name, 
              舊分類: oldCategory, 
              新分類: category || oldCategory 
            })
            showNotification('連結已更新！', 'success')
          })
        })

      els.editOverlay.addEventListener('click', function (e) {
        if (e.target === els.editOverlay) {
          closeModal()
        }
      })
    }

    function renderCategories() {
      if (els.categorySelect) {
        els.categorySelect.innerHTML = ''
        const allOpt = document.createElement('option')
        allOpt.value = '全部'
        allOpt.textContent = '全部'
        els.categorySelect.appendChild(allOpt)
        categories.forEach(cat => {
          const opt = document.createElement('option')
          opt.value = cat
          opt.textContent = cat
          els.categorySelect.appendChild(opt)
        })
        els.categorySelect.value = state.currentCategory || '全部'
      }

      if (els.categoryList) {
        els.categoryList.innerHTML = ''
        categories.forEach(cat => {
          const li = document.createElement('div')
          li.className = 'category-item-wrapper'
          li.dataset.category = cat

          const itemRow = document.createElement('div')
          itemRow.className = 'category-item-row'

          const item = document.createElement('div')
          item.className = 'category-item'
          item.textContent = cat
          item.addEventListener('click', function () {
            state.currentCategory = cat
            if (els.categorySelect) {
              els.categorySelect.value = cat
            }
            renderLinks()
          })
          item.addEventListener('dblclick', async function () {
            const newName = await showPromptDialog('修改分類名稱：', cat)
            if (!newName || newName === cat) return
            if (categories.includes(newName)) {
              showNotification('已存在相同名稱的分類', 'error')
              return
            }
            const oldColor = categoryColors[cat]
            const affectedLinks = links.filter(l => l.category === cat).length
            if (oldColor) {
              categoryColors[newName] = oldColor
              delete categoryColors[cat]
            }
            categories = categories.map(c => (c === cat ? newName : c))
            links.forEach(l => {
              if (l.category === cat) l.category = newName
            })
            QuickLinksStorage.saveCategories(categories)
            QuickLinksStorage.saveLinks(links)
            saveCategoryColors()
            renderCategories()
            updateCategorySelects()
            renderLinks()
            logDataChange('✏️', '修改分類名稱', { 舊名稱: cat, 新名稱: newName, 受影響連結數: affectedLinks })
          })

          item.addEventListener('dragover', function (e) {
            e.preventDefault()
          })
          item.addEventListener('drop', function (e) {
            e.preventDefault()
            const id = parseInt(e.dataTransfer.getData('text/plain'), 10)
            const link = links.find(l => l.id === id)
            if (link) {
              const oldCategory = link.category
              link.category = cat
              QuickLinksStorage.saveLinks(links)
              renderLinks()
              logDataChange('🔄', '拖放連結到分類', { 連結名稱: link.name, 舊分類: oldCategory, 新分類: cat })
            }
          })

          const colorSelect = document.createElement('select')
          colorSelect.className = 'category-color-select'
          colorSelect.title = '選擇分類顏色'
          const currentColor = inferColorForCategory(cat)
          availableColors.forEach(color => {
            const opt = document.createElement('option')
            opt.value = color
            opt.textContent = getColorDisplayName(color)
            if (color === currentColor) opt.selected = true
            colorSelect.appendChild(opt)
          })
          colorSelect.addEventListener('change', function () {
            const oldColor = categoryColors[cat]
            const newColor = this.value
            categoryColors[cat] = newColor
            saveCategoryColors()
            renderLinks()
            renderCategories()
            updateCategorySelects()
            logDataChange('🎨', '變更分類顏色', { 分類名稱: cat, 舊顏色: oldColor, 新顏色: newColor })
          })

          const delBtn = document.createElement('button')
          delBtn.type = 'button'
          delBtn.className = 'category-delete-btn'
          delBtn.textContent = '✕'
          delBtn.title = '刪除分類'
          delBtn.addEventListener('click', function (e) {
            e.stopPropagation()
            showConfirmDialog(`刪除分類「${cat}」？此分類下的連結將變為「未分類」`).then(confirmed => {
              if (!confirmed) return
              const affectedLinks = links.filter(l => l.category === cat).length
              delete categoryColors[cat]
              categories = categories.filter(c => c !== cat)
              links.forEach(l => {
                if (l.category === cat) l.category = '未分類'
              })
              if (!categories.includes('未分類')) {
                categories.push('未分類')
              }
              QuickLinksStorage.saveCategories(categories)
              QuickLinksStorage.saveLinks(links)
              saveCategoryColors()
              if (state.currentCategory === cat) {
                state.currentCategory = '全部'
              }
              renderCategories()
              updateCategorySelects()
              renderLinks()
              logDataChange('🗑️', '刪除分類', { 分類名稱: cat, 受影響連結數: affectedLinks })
            })
          })

          itemRow.appendChild(item)
          itemRow.appendChild(colorSelect)
          itemRow.appendChild(delBtn)
          li.appendChild(itemRow)
          els.categoryList.appendChild(li)
        })
      }
    }

    function renderLinks() {
      if (!els.linksGrid) return
      els.linksGrid.innerHTML = ''

      QuickLinksStorage.sortLinks(links)

      const filtered = links.filter(link => {
        if (state.currentCategory && state.currentCategory !== '全部') {
          if (link.category !== state.currentCategory) return false
        }
        if (state.searchText) {
          const t = state.searchText
          const combined = (link.name + ' ' + (link.description || '') + ' ' + (link.url || '')).toLowerCase()
          if (!combined.includes(t)) return false
        }
        return true
      })

      const groups = {}
      filtered.forEach(link => {
        const cat = link.category || '未分類'
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(link)
      })

      const sortedCats = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'zh-Hant'))

      sortedCats.forEach(cat => {
        const section = document.createElement('div')
        const catColorClass = `category-${inferColorForCategory(cat)}`
        section.className = `category-section ${catColorClass}`

        const header = document.createElement('div')
        header.className = 'category-header'

        const leftLine = document.createElement('div')
        leftLine.className = 'category-header-line'

        const title = document.createElement('div')
        title.className = 'category-header-title'
        title.textContent = cat

        const rightLine = document.createElement('div')
        rightLine.className = 'category-header-line'

        header.appendChild(leftLine)
        header.appendChild(title)
        header.appendChild(rightLine)
        section.appendChild(header)

        const grid = document.createElement('div')
        grid.className = 'links-grid'

        groups[cat].forEach(link => {
          const card = document.createElement('div')
          card.className = 'link-card'
        card.draggable = true
        card.dataset.id = link.id

        card.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/plain', String(link.id))
          e.dataTransfer.effectAllowed = 'move'
          card.classList.add('dragging')
        })
        card.addEventListener('dragend', function () {
          card.classList.remove('dragging')
        })
        card.addEventListener('dragover', function (e) {
          e.preventDefault()
          card.classList.add('drag-over')
        })
        card.addEventListener('dragleave', function () {
          card.classList.remove('drag-over')
        })
        card.addEventListener('drop', function (e) {
          e.preventDefault()
          card.classList.remove('drag-over')
          const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10)
          if (!draggedId || draggedId === link.id) return
          reorderLinks(draggedId, link.id)
        })

          const colorClass = link.color ? ` link-card--${link.color}` : ''

          card.innerHTML = `
          <div class="link-card-header${colorClass}">
            <div class="link-card-handle" title="拖曳排序">≡</div>
            <div class="link-icon">
              <img src="${link.faviconUrl || getFaviconUrl(link.url)}" alt="icon" class="link-favicon">
            </div>
            <div class="link-info">
              <h3>${link.name}</h3>
              <p>${link.description || ''}</p>
              <p class="link-meta">
                <span class="link-category">分類：${link.category || '未分類'}</span>
                ${link.pinned ? '<span class="link-pinned">已置頂</span>' : ''}
              </p>
            </div>
          </div>
          <div class="link-actions">
            <a href="${link.url}" class="action-btn visit" ${link.openInNewTab ? 'target="_blank" rel="noopener"' : ''}>訪問</a>
            <button class="action-btn edit">編輯</button>
            <button class="action-btn" data-action="pin">${link.pinned ? '取消置頂' : '置頂'}</button>
            <button class="action-btn delete">刪除</button>
          </div>
        `

          card.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', String(link.id))
            e.dataTransfer.effectAllowed = 'move'
          })

          const visitBtn = card.querySelector('.visit')
          visitBtn.addEventListener('click', function () {
            visitLink(link.id)
          })

          const editBtn = card.querySelector('.edit')
          editBtn.addEventListener('click', function () {
            openEditModal(link.id)
          })

          const pinBtn = card.querySelector('[data-action="pin"]')
          pinBtn.addEventListener('click', function () {
            togglePin(link.id)
          })

          const deleteBtn = card.querySelector('.delete')
          deleteBtn.addEventListener('click', function () {
            deleteLink(link.id)
          })

          grid.appendChild(card)
        })

        section.appendChild(grid)
        els.linksGrid.appendChild(section)
      })
    }

    function reorderLinks(draggedId, targetId) {
      const draggedIndex = links.findIndex(l => l.id === draggedId)
      const targetIndex = links.findIndex(l => l.id === targetId)
      if (draggedIndex === -1 || targetIndex === -1) return
      const dragged = links[draggedIndex]
      const [moved] = links.splice(draggedIndex, 1)
      links.splice(targetIndex, 0, moved)
      links.forEach((l, idx) => {
        l.order = idx
      })
      QuickLinksStorage.saveLinks(links)
      renderLinks()
      logDataChange('🔄', '拖放排序連結', { 連結名稱: dragged.name, 從位置: draggedIndex, 到位置: targetIndex })
    }

    function visitLink(id) {
      const link = links.find(l => l.id === id)
      if (link) {
        link.lastUsedAt = Date.now()
        QuickLinksStorage.saveLinks(links)
      }
    }

    function togglePin(id) {
      const link = links.find(l => l.id === id)
      if (link) {
        const wasPinned = link.pinned
        link.pinned = !link.pinned
        QuickLinksStorage.sortLinks(links)
        links.forEach((l, idx) => {
          l.order = idx
        })
        QuickLinksStorage.saveLinks(links)
        renderLinks()
        logDataChange('📌', '切換置頂狀態', { 連結名稱: link.name, 舊狀態: wasPinned ? '已置頂' : '未置頂', 新狀態: link.pinned ? '已置頂' : '未置頂' })
      }
    }

    function deleteLink(id) {
      const linkToDelete = links.find(l => l.id === id)
      showConfirmDialog('確定要刪除這個連結嗎？').then(confirmed => {
        if (!confirmed) return
        const beforeCount = links.length
        links = links.filter(l => l.id !== id)
        QuickLinksStorage.saveLinks(links)
        renderLinks()
        logDataChange('🗑️', '刪除連結', { 連結名稱: linkToDelete ? linkToDelete.name : '未知', 分類: linkToDelete ? linkToDelete.category : '未知', 刪除前數量: beforeCount, 刪除後數量: links.length })
        showNotification('連結已刪除！', 'success')
      })
    }

    function updateCategorySelects() {
      if (els.linkCategorySelect) {
        els.linkCategorySelect.innerHTML = ''
        const defaultOpt = document.createElement('option')
        defaultOpt.value = '預設'
        defaultOpt.textContent = '預設'
        els.linkCategorySelect.appendChild(defaultOpt)
        categories.forEach(cat => {
          if (cat !== '預設') {
            const opt = document.createElement('option')
            opt.value = cat
            opt.textContent = cat
            els.linkCategorySelect.appendChild(opt)
          }
        })
        const customOpt = document.createElement('option')
        customOpt.value = '__custom__'
        customOpt.textContent = '自訂分類...'
        els.linkCategorySelect.appendChild(customOpt)
      }

      if (els.editCategorySelect) {
        els.editCategorySelect.innerHTML = ''
        const defaultOpt = document.createElement('option')
        defaultOpt.value = '預設'
        defaultOpt.textContent = '預設'
        els.editCategorySelect.appendChild(defaultOpt)
        categories.forEach(cat => {
          if (cat !== '預設') {
            const opt = document.createElement('option')
            opt.value = cat
            opt.textContent = cat
            els.editCategorySelect.appendChild(opt)
          }
        })
        const customOpt = document.createElement('option')
        customOpt.value = '__custom__'
        customOpt.textContent = '自訂分類...'
        els.editCategorySelect.appendChild(customOpt)
      }
    }

    function openEditModal(id) {
      const link = links.find(l => l.id === id)
      if (!link) return
      if (!els.editOverlay) return
      editingLinkId = id

      updateCategorySelects()

      if (els.editName) els.editName.value = link.name || ''
      if (els.editUrl) els.editUrl.value = link.url || ''
      if (els.editDescription) els.editDescription.value = link.description || ''
      if (els.editImageUrl) els.editImageUrl.value = link.faviconUrl && link.faviconUrl !== getFaviconUrl(link.url) ? link.faviconUrl : ''
      if (els.editCategorySelect) {
        if (link.category && categories.includes(link.category)) {
          els.editCategorySelect.value = link.category
          if (els.editCategory) els.editCategory.style.display = 'none'
        } else {
          els.editCategorySelect.value = '__custom__'
          if (els.editCategory) {
            els.editCategory.style.display = 'block'
            els.editCategory.value = link.category || ''
          }
        }
      } else if (els.editCategory) {
        els.editCategory.value = link.category || ''
      }
      if (els.editOpenInNewTab) els.editOpenInNewTab.checked = !!link.openInNewTab

      els.editOverlay.style.display = 'flex'
      setTimeout(() => {
        els.editOverlay.classList.add('showing')
      }, 10)
    }

    return {
      initManagerPage
    }
  })()

  function inferColorForCategory(category) {
    if (!category) return 'gray'
    if (categoryColors[category]) return categoryColors[category]
    const existing = Object.values(categoryColors)
    const color = fallbackColors.find(c => !existing.includes(c)) || 'gray'
    categoryColors[category] = color
    saveCategoryColors()
    return color
  }

  function getColorDisplayName(color) {
    const names = {
      blue: '藍色',
      green: '綠色',
      orange: '橘色',
      red: '紅色',
      purple: '紫色',
      yellow: '黃色',
      cyan: '青色',
      pink: '粉色',
      indigo: '靛色',
      teal: '青綠色',
      lime: '萊姆色',
      amber: '琥珀色',
      gray: '灰色',
      rose: '玫瑰色',
      violet: '紫羅蘭',
      emerald: '翠綠色',
      sky: '天空藍',
      fuchsia: '紫紅色'
    }
    return names[color] || color
  }

  function showNotification(message, type) {
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#111827'};
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      z-index: 1000;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `
    notification.textContent = message
    document.body.appendChild(notification)
    setTimeout(() => {
      notification.remove()
    }, 3000)
  }

  window.QuickLinks = {
    initManagerPage: QuickLinksManager.initManagerPage
  }

  // 通用對話窗 Promise 版本
  function showConfirmDialog(message) {
    return new Promise(resolve => {
      const overlay = document.getElementById('dialogOverlay')
      const msgEl = document.getElementById('dialogMessage')
      const inputGroup = document.getElementById('dialogInputGroup')
      const okBtn = document.getElementById('dialogOkBtn')
      const cancelBtn = document.getElementById('dialogCancelBtn')
      const closeBtn = document.getElementById('dialogClose')

      if (!overlay || !msgEl || !okBtn || !cancelBtn || !closeBtn) {
        resolve(window.confirm(message))
        return
      }

      inputGroup.style.display = 'none'
      msgEl.textContent = message
      overlay.style.display = 'flex'
      setTimeout(() => {
        overlay.classList.add('showing')
      }, 10)

      const cleanup = result => {
        overlay.classList.remove('showing')
        overlay.classList.add('hiding')
        setTimeout(() => {
          overlay.style.display = 'none'
          overlay.classList.remove('hiding')
          okBtn.onclick = null
          cancelBtn.onclick = null
          closeBtn.onclick = null
          resolve(result)
        }, 200)
      }

      okBtn.onclick = () => cleanup(true)
      cancelBtn.onclick = () => cleanup(false)
      closeBtn.onclick = () => cleanup(false)
      overlay.onclick = e => {
        if (e.target === overlay) cleanup(false)
      }
    })
  }

  function showPromptDialog(message, defaultValue) {
    return new Promise(resolve => {
      const overlay = document.getElementById('dialogOverlay')
      const msgEl = document.getElementById('dialogMessage')
      const inputGroup = document.getElementById('dialogInputGroup')
      const input = document.getElementById('dialogInput')
      const okBtn = document.getElementById('dialogOkBtn')
      const cancelBtn = document.getElementById('dialogCancelBtn')
      const closeBtn = document.getElementById('dialogClose')

      if (!overlay || !msgEl || !inputGroup || !input || !okBtn || !cancelBtn || !closeBtn) {
        const result = window.prompt(message, defaultValue || '')
        resolve(result)
        return
      }

      msgEl.textContent = message
      inputGroup.style.display = 'block'
      input.value = defaultValue || ''
      overlay.style.display = 'flex'
      setTimeout(() => {
        overlay.classList.add('showing')
        input.focus()
      }, 10)

      const cleanup = result => {
        overlay.classList.remove('showing')
        overlay.classList.add('hiding')
        setTimeout(() => {
          overlay.style.display = 'none'
          overlay.classList.remove('hiding')
          okBtn.onclick = null
          cancelBtn.onclick = null
          closeBtn.onclick = null
          resolve(result)
        }, 200)
      }

      okBtn.onclick = () => cleanup(input.value.trim() || null)
      cancelBtn.onclick = () => cleanup(null)
      closeBtn.onclick = () => cleanup(null)
      overlay.onclick = e => {
        if (e.target === overlay) cleanup(null)
      }
    })
  }
})()


