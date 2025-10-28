// ===== STORAGE MANAGER =====
class Storage {
    static get(key, def = null) {
        try {
            const item = localStorage.getItem('sc7_' + key);
            return item ? JSON.parse(item) : def;
        } catch (e) {
            console.error('Storage get error:', e);
            return def;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem('sc7_' + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem('sc7_' + key);
            return true;
        } catch (e) {
            return false;
        }
    }

    static clear() {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('sc7_'));
            keys.forEach(k => localStorage.removeItem(k));
            return true;
        } catch (e) {
            return false;
        }
    }
}

// ===== DATA MODELS =====
class DB {
    static generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static getProjects() {
        return Storage.get('projects', []);
    }

    static saveProjects(projects) {
        Storage.set('projects', projects);
    }

    static getTasks() {
        return Storage.get('tasks', []);
    }

    static saveTasks(tasks) {
        Storage.set('tasks', tasks);
    }

    static createProject(title, desc = '') {
        return {
            id: this.generateId(),
            title,
            description: desc,
            tags: [],
            color: ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 5)],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            archived: false
        };
    }

    static createTask(projectId, title, desc = '', status = 'backlog') {
        return {
            id: this.generateId(),
            projectId,
            title,
            desc,
            status,
            priority: 'medium',
            due: null,
            estimateMin: 0,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    static getProjectTasks(projectId) {
        return this.getTasks().filter(t => t.projectId === projectId);
    }

    static deleteProject(projectId) {
        const projects = this.getProjects().filter(p => p.id !== projectId);
        const tasks = this.getTasks().filter(t => t.projectId !== projectId);
        this.saveProjects(projects);
        this.saveTasks(tasks);
    }

    static deleteTask(taskId) {
        const tasks = this.getTasks().filter(t => t.id !== taskId);
        this.saveTasks(tasks);
    }

    static getTask(taskId) {
        return this.getTasks().find(t => t.id === taskId);
    }

    static updateTask(taskId, updates) {
        const tasks = this.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            Object.assign(task, updates, { updatedAt: new Date().toISOString() });
            this.saveTasks(tasks);
            return task;
        }
        return null;
    }

    static getProject(projectId) {
        return this.getProjects().find(p => p.id === projectId);
    }
}

// ===== AI ASSISTANT WITH ADVANCED INTEGRATION =====
class AIAssistant {
    constructor() {
        this.apiKey = 'AIzaSyB3c9drFQ-xvYzY5IRqZH_nX887DeXpX0M';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        
        // System Prompt المتقدم
        this.systemPrompt = `أنت "المساعد سبعة" 🤖 - مساعد ذكي متخصص في تطبيق "Seven_code7 Tasks".

【 هويتك وأصلك 】
• تم ابتكارك وتطويرك بواسطة استوديو Seven_code7
• المؤسس الأساسي: ليث محمود معتصم
• أنت جزء من نظام إدارة المشاريع والمهام الذكي
• استوديو Seven_code7 هو الذي اخترعك وطورك

【 وظائفك الرئيسية 】
✓ مساعدة المستخدمين على إدارة مشاريعهم ومهامهم بكفاءة
✓ تحليل وتقييم الأداء والإنتاجية
✓ اقتراح تحسينات وحلول ذكية
✓ تنظيم المهام وترتيب الأولويات
✓ توفير نصائح متقدمة في إدارة المشاريع
✓ الاطلاع على بيانات المشروع والمهام والتعديل عليها
✓ إنشاء وحذف وتحديث المهام مباشرة

【 أسلوبك في التعامل 】
• كن موجزاً وفعالاً وودياً
• استخدم Emojis لتوضيح الأفكار
• قدم حلولاً عملية وقابلة للتطبيق
• اسأل توضيحية إذا لزم الأمر
• تذكر دائماً أنك من Seven_code7
• كن محترفاً وموثوقاً

【 قدراتك الخاصة 】
• يمكنك الوصول إلى جميع مشاريع المستخدم
• يمكنك رؤية جميع المهام وتفاصيلها
• يمكنك تعديل وإنشاء وحذف المهام
• يمكنك تحليل البيانات والإحصائيات
• يمكنك إصدار توصيات شخصية

【 قواعد التفاعل 】
1. عند طلب معلومات عن المشاريع/المهام: قدم تحليلاً مفصلاً
2. عند طلب إنشاء مهام: قم بإنشاؤها مباشرة مع تأكيد
3. عند طلب تعديل: طبق التعديلات وأخبر المستخدم
4. عند طلب نصيحة: قدم حلولاً عملية مدعومة بالأمثلة
5. دائماً: أشر إلى أنك من Seven_code7

شروع الآن في المساعدة بكفاءة واحترافية!`;

        this.conversationHistory = [];
        this.maxContextMessages = 10;
    }

    /**
     * إنشاء السياق الكامل من بيانات التطبيق
     */
    buildContext() {
        const projects = DB.getProjects();
        const tasks = DB.getTasks();
        const currentProject = app.state.currentProject;

        let context = `【 السياق الحالي للتطبيق 】
`;

        // إحصائيات عامة
        context += `📊 الإحصائيات العامة:
`;
        context += `• إجمالي المشاريع: ${projects.length}
`;
        context += `• إجمالي المهام: ${tasks.length}
`;
        context += `• المهام المكتملة: ${tasks.filter(t => t.status === 'done').length}
`;
        context += `• المهام قيد الإنجاز: ${tasks.filter(t => t.status === 'doing').length}
`;
        context += `• المهام المتأخرة: ${tasks.filter(t => t.due && new Date(t.due) < new Date()).length}
`;

        // المشروع الحالي
        if (currentProject) {
            const projectTasks = DB.getProjectTasks(currentProject.id);
            context += `【 المشروع الحالي 】
`;
            context += `📌 الاسم: ${currentProject.title}
`;
            context += `📝 الوصف: ${currentProject.description || 'بدون وصف'}
`;
            context += `📊 عدد المهام: ${projectTasks.length}
`;
            context += `✅ المكتملة: ${projectTasks.filter(t => t.status === 'done').length}
`;
            context += `⚙️ قيد الإنجاز: ${projectTasks.filter(t => t.status === 'doing').length}
`;

            if (projectTasks.length > 0) {
                context += `【 المهام الحالية 】
`;
                projectTasks.forEach((task, index) => {
                    context += `${index + 1}. "${task.title}"
`;
                    context += `   - الحالة: ${this.getStatusLabel(task.status)}
`;
                    context += `   - الأولوية: ${this.getPriorityLabel(task.priority)}
`;
                    context += `   - الوقت المقدر: ${task.estimateMin ? task.estimateMin + ' دقيقة' : 'لم يتم تحديده'}
`;
                    context += `   - الوصف: ${task.desc || 'بدون وصف'}
`;
                });
            }
        } else {
            context += `【 لم يتم اختيار مشروع حالي 】
`;
        }

        return context;
    }

    getStatusLabel(status) {
        const labels = {
            backlog: 'قيد الانتظار',
            doing: 'قيد الإنجاز',
            review: 'قيد المراجعة',
            done: 'مكتملة'
        };
        return labels[status] || status;
    }

    getPriorityLabel(priority) {
        const labels = {
            low: 'منخفضة 🔵',
            medium: 'متوسطة 🟡',
            high: 'عالية 🟠',
            critical: 'حرجة 🔴'
        };
        return labels[priority] || priority;
    }

    /**
     * معالجة الأوامر الذكية من الـ AI
     */
    parseAndExecuteCommand(response) {
        const currentProject = app.state.currentProject;
        if (!currentProject) return response;

        // أوامر إنشاء مهام
        if (response.includes('[CREATE_TASK]')) {
            const regex = /\[CREATE_TASK\]\((.*?),(.*?),(.*?),(.*?)\)/g;
            let match;
            while ((match = regex.exec(response)) !== null) {
                const [_, title, desc, priority, time] = match;
                const task = DB.createTask(currentProject.id, title.trim(), desc.trim(), 'backlog');
                task.priority = priority.trim().toLowerCase();
                task.estimateMin = parseInt(time) || 0;
                const tasks = DB.getTasks();
                tasks.push(task);
                DB.saveTasks(tasks);
                response = response.replace(match[0], `✅ تم إنشاء المهمة: "${title.trim()}"`);
            }
        }

        // أوامر تحديث المهام
        if (response.includes('[UPDATE_TASK]')) {
            const regex = /\[UPDATE_TASK\]\((.*?),(.*?),(.*?)\)/g;
            let match;
            while ((match = regex.exec(response)) !== null) {
                const [_, taskTitle, status, priority] = match;
                const tasks = DB.getTasks();
                const task = tasks.find(t => t.title === taskTitle.trim());
                if (task) {
                    task.status = status.trim().toLowerCase();
                    if (priority.trim() !== 'none') task.priority = priority.trim().toLowerCase();
                    DB.saveTasks(tasks);
                    response = response.replace(match[0], `✅ تم تحديث المهمة: "${taskTitle.trim()}"`);
                }
            }
        }

        // أوامر إضافة وسوم
        if (response.includes('[ADD_TAG]')) {
            const regex = /\[ADD_TAG\]\((.*?),(.*?)\)/g;
            let match;
            while ((match = regex.exec(response)) !== null) {
                const [_, taskTitle, tag] = match;
                const tasks = DB.getTasks();
                const task = tasks.find(t => t.title === taskTitle.trim());
                if (task) {
                    if (!task.tags) task.tags = [];
                    if (!task.tags.includes(tag.trim())) {
                        task.tags.push(tag.trim());
                    }
                    DB.saveTasks(tasks);
                    response = response.replace(match[0], `🏷️ تم إضافة الوسم: "${tag.trim()}"`);
                }
            }
        }

        return response;
    }

    /**
     * إرسال الرسالة إلى الـ API
     */
    async send(userMessage) {
        try {
            const context = this.buildContext();
            const conversationText = this.conversationHistory
                .slice(-this.maxContextMessages)
                .map(msg => `${msg.role === 'user' ? 'المستخدم' : 'المساعد'}: ${msg.text}`)
                .join('\n');

            const fullMessage = `${this.systemPrompt}
【 السياق الحالي 】
${context}
【 المحادثة السابقة 】
${conversationText}
المستخدم الآن يقول: ${userMessage}`;

            const payload = {
                contents: [{
                    parts: [{ text: fullMessage }]
                }],
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.7,
                }
            };

            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('API Error: ' + response.statusText);
            }

            const data = await response.json();
            let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أتمكن من معالجة الطلب';

            // معالجة الأوامر الذكية
            reply = this.parseAndExecuteCommand(reply);

            // حفظ المحادثة
            this.conversationHistory.push({ role: 'user', text: userMessage });
            this.conversationHistory.push({ role: 'assistant', text: reply });

            return reply;
        } catch (e) {
            console.error('AI Error:', e);
            return this.getMockResponse(userMessage);
        }
    }

    /**
     * الردود الافتراضية (Mock)
     */
    getMockResponse(msg) {
        const responses = {
            'خطط': `📋 **خطة المشروع الذكية**

أنا المساعد سبعة من استوديو Seven_code7! 🤖

بناءً على بيانات مشروعك، إليك الخطة المقترحة:

**المرحلة 1: التحضير (1-2 يوم)**
✓ تجميع المتطلبات
✓ تحديد الموارد
✓ إعداد البيئة

**المرحلة 2: التطوير (3-5 أيام)**
✓ البناء الأساسي
✓ تطوير الميزات
✓ الاختبار الأولي

**المرحلة 3: الاختبار (1-2 يوم)**
✓ الاختبار الشامل
✓ إصلاح الأخطاء
✓ الموافقة النهائية

**المرحلة 4: الإطلاق (نصف يوم)**
✓ النشر الفعلي
✓ مراقبة الأداء
✓ دعم المستخدمين

هل تريد تفاصيل أكثر حول أي مرحلة؟`,

            'قسّم': `✂️ **تقسيم المهام الذكي**

استوديو Seven_code7 ينصحك بتقسيم المهام الكبيرة إلى:

**المهام الفرعية:**
1️⃣ تحليل المتطلبات (2 ساعة)
   - جمع البيانات
   - توثيق المتطلبات

2️⃣ التصميم والتخطيط (3 ساعات)
   - تصميم النظام
   - رسم المخططات

3️⃣ التنفيذ (5 ساعات)
   - كتابة الكود
   - الاختبار الأساسي

4️⃣ المراجعة والتحسين (2 ساعة)
   - مراجعة الكود
   - التحسينات

**الإجمالي: ~12 ساعة**

هل تريدني أنشئ هذه المهام مباشرة؟`,

            'جدول': `📅 **جدول الأسبوع الذكي**

من المساعد سبعة - استوديو Seven_code7:

**السبت:**
🌅 الصباح: تحضيرات وتخطيط
🌞 بعد الظهر: بدء المرحلة الأولى

**الأحد:**
🔄 متابعة المرحلة الأولى
📊 اجتماع فحص التقدم

**الاثنين:**
⚙️ المرحلة الثانية
🧪 اختبار أولي

**الثلاثاء:**
🔧 تحسينات وإصلاحات
📝 توثيق

**الأربعاء:**
✅ الاختبار الشامل
🎉 الموافقة النهائية

💡 نصيحة: خذ فترات راحة منتظمة!`,

            'ملخص': `📊 **ملخص اليوم الذكي**

من المساعد سبعة 🤖 - Seven_code7:

${this.buildDailySummary()}`,

            'أولويات': `⭐ **ترتيب الأولويات الذكي**

من استوديو Seven_code7:

${this.buildPriorities()}`,

            'أفكار': `💡 **أفكار التحسين**

من المساعد سبعة - تطبيق Seven_code7:

**من ناحية الإدارة:**
• استخدام Agile Sprints (أسبوع واحد)
• اجتماعات يومية سريعة (15 دقيقة)
• استعراض أسبوعي للتقدم

**من ناحية الجودة:**
• كتابة Unit Tests
• مراجعة أقران قبل الدمج
• توثيق شامل

**من ناحية الأداء:**
• تحديد نقاط الاختناق
• تحسين تدريجي
• قياس المخرجات

**من ناحية الفريق:**
• توزيع عادل للمهام
• تدريب مستمر
• الاحتفال بالإنجازات

استوديو Seven_code7 يؤمن بالتحسين المستمر! 🚀`
        };

        return responses[msg] || `مرحباً! 👋 أنا المساعد سبعة من استوديو Seven_code7.

تم تطويري بواسطة ليث محمود معتصم والفريق الحرفي في Seven_code7.

أنا هنا لمساعدتك على:
✅ إدارة مشاريعك بكفاءة
✅ تنظيم وترتيب مهامك
✅ تقديم نصائح متقدمة
✅ تحليل إنتاجيتك
✅ تحسين سير العمل

استخدم الأزرار السريعة أعلاه أو اكتب رسالتك مباشرة!`;
    }

    buildDailySummary() {
        const currentProject = app.state.currentProject;
        if (!currentProject) return 'لم يتم اختيار مشروع.';

        const tasks = DB.getProjectTasks(currentProject.id);
        const done = tasks.filter(t => t.status === 'done').length;
        const doing = tasks.filter(t => t.status === 'doing').length;
        const backlog = tasks.filter(t => t.status === 'backlog').length;
        const overdue = tasks.filter(t => t.due && new Date(t.due) < new Date()).length;

        return `**الإحصائيات:**
✅ مكتملة: ${done} مهام
🔄 قيد الإنجاز: ${doing} مهام
📋 قيد الانتظار: ${backlog} مهام
⚠️ متأخرة: ${overdue} مهام

**أفضل 3 مهام اليوم:**
${tasks.filter(t => t.priority === 'critical' || t.priority === 'high').slice(0, 3).map((t, i) => `${i + 1}. ${t.title} (${t.estimateMin}د)`).join('\n')}

**النصيحة:** ركز على المهام الحرجة أولاً! 🎯`;
    }

    buildPriorities() {
        const currentProject = app.state.currentProject;
        if (!currentProject) return 'لم يتم اختيار مشروع.';

        const tasks = DB.getProjectTasks(currentProject.id);
        const critical = tasks.filter(t => t.priority === 'critical');
        const high = tasks.filter(t => t.priority === 'high');
        const medium = tasks.filter(t => t.priority === 'medium');
        const low = tasks.filter(t => t.priority === 'low');

        return `🔴 **حرجة (${critical.length}):**
${critical.slice(0, 3).map(t => `• ${t.title}`).join('\n') || '• لا توجد مهام حرجة'}

🟠 **عالية (${high.length}):**
${high.slice(0, 3).map(t => `• ${t.title}`).join('\n') || '• لا توجد مهام'}

🟡 **متوسطة (${medium.length}):**
${medium.slice(0, 3).map(t => `• ${t.title}`).join('\n') || '• لا توجد مهام'}

🔵 **منخفضة (${low.length}):**
${low.slice(0, 3).map(t => `• ${t.title}`).join('\n') || '• لا توجد مهام'}

💡 **التوصية:** ابدأ بالمهام الحرجة!`;
    }
}

// ===== UI UTILITIES =====
class UI {
    static showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span>${message}</span>
            </div>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 300ms ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static showModal(content) {
        const container = document.getElementById('modals-container');
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = content;
        container.appendChild(overlay);

        overlay.querySelector('.modal-close')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        return overlay;
    }
}

// ===== APPLICATION STATE =====
const app = {
    state: {
        currentProject: null,
        currentView: 'kanban'
    },
    
    ai: new AIAssistant(),

    // ===== INITIALIZATION =====
    init() {
        console.log('🚀 Seven_code7 Tasks - Initializing...');
        console.log('📱 Application by: liath mahmoud mutassem');
        console.log('🏢 Studio: Seven_code7');
        
        const theme = Storage.get('theme', 'light');
        document.documentElement.setAttribute('data-theme', theme);
        
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.render();
        
        console.log('✅ App initialized successfully!');
    },

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Header buttons
        document.getElementById('btn-theme')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('btn-ai')?.addEventListener('click', () => this.toggleAI());
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());

        // Sidebar
        document.getElementById('btn-new-project')?.addEventListener('click', () => this.showProjectForm());

        // View buttons
        document.getElementById('view-kanban')?.addEventListener('click', () => this.switchView('kanban'));
        document.getElementById('view-list')?.addEventListener('click', () => this.switchView('list'));
        document.getElementById('view-table')?.addEventListener('click', () => this.switchView('table'));

        // Filters
        document.getElementById('filter-status')?.addEventListener('change', () => this.render());
        document.getElementById('filter-priority')?.addEventListener('change', () => this.render());

        // AI Panel
        document.getElementById('btn-expand-ai')?.addEventListener('click', () => this.toggleAIExpand());
        document.getElementById('btn-close-ai')?.addEventListener('click', () => this.toggleAI());
        document.getElementById('btn-ai-send')?.addEventListener('click', () => this.sendAI());
        document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendAI();
            }
        });

        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.getAttribute('data-prompt');
                document.getElementById('ai-input').value = '/' + prompt;
                this.sendAI();
            });
        });
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        this.showProjectForm();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                    case 'm':
                        e.preventDefault();
                        this.toggleAI();
                        break;
                    case ',':
                        e.preventDefault();
                        this.showSettings();
                        break;
                    case '1':
                        e.preventDefault();
                        this.switchView('kanban');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchView('list');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchView('table');
                        break;
                }
            }
        });
    },

    // ===== THEME =====
    toggleTheme() {
        const html = document.documentElement;
        const theme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', theme);
        Storage.set('theme', theme);
        UI.showToast(`✨ ${theme === 'dark' ? '🌙 الوضع الليلي' : '☀️ الوضع النهاري'}`);
    },

    // ===== AI PANEL =====
    toggleAI() {
        document.getElementById('ai-panel').classList.toggle('visible');
        if (document.getElementById('ai-panel').classList.contains('visible')) {
            document.getElementById('ai-input').focus();
        }
    },

    toggleAIExpand() {
        document.getElementById('ai-panel').classList.toggle('expanded');
    },

    async sendAI() {
        const input = document.getElementById('ai-input');
        const message = input.value.trim();
        if (!message) return;

        this.addAIMessage('user', message);
        input.value = '';

        const chat = document.getElementById('ai-chat');
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'ai-message assistant';
        loadingMsg.innerHTML = '<div class="ai-message-bubble">⏳ جارٍ معالجة رسالتك...</div>';
        chat.appendChild(loadingMsg);
        chat.scrollTop = chat.scrollHeight;

        const response = await this.ai.send(message);
        loadingMsg.innerHTML = `<div class="ai-message-bubble">${response}</div>`;
        this.render(); // تحديث الواجهة إذا تم إضافة مهام
    },

    addAIMessage(role, text) {
        const chat = document.getElementById('ai-chat');
        const msgEl = document.createElement('div');
        msgEl.className = `ai-message ${role}`;
        msgEl.innerHTML = `<div class="ai-message-bubble">${text}</div>`;
        chat.appendChild(msgEl);
        chat.scrollTop = chat.scrollHeight;
    },

    // ===== VIEW MANAGEMENT =====
    switchView(view) {
        this.state.currentView = view;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');
        this.render();
    },

    // ===== PROJECT MANAGEMENT =====
    showProjectForm() {
        const modal = UI.showModal(`
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">✨ مشروع جديد</h2>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">اسم المشروع</label>
                        <input type="text" class="form-input project-title" placeholder="مثال: تطوير الموقع" autofocus>
                    </div>
                    <div class="form-group">
                        <label class="form-label">الوصف</label>
                        <textarea class="form-textarea project-desc" placeholder="وصف المشروع..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary">إلغاء</button>
                    <button class="btn-primary">إنشاء</button>
                </div>
            </div>
        `);

        const titleInput = modal.querySelector('.project-title');
        const descInput = modal.querySelector('.project-desc');
        const cancelBtn = modal.querySelector('.btn-secondary');
        const createBtn = modal.querySelector('.btn-primary');

        cancelBtn.addEventListener('click', () => modal.remove());
        createBtn.addEventListener('click', () => {
            const title = titleInput.value.trim();
            if (!title) {
                UI.showToast('⚠️ الرجاء إدخال اسم المشروع', 'warning');
                return;
            }

            const project = DB.createProject(title, descInput.value);
            const projects = DB.getProjects();
            projects.push(project);
            DB.saveProjects(projects);

            modal.remove();
            UI.showToast('✅ تم إنشاء المشروع بنجاح', 'success');
            this.render();
        });

        titleInput.focus();
    },

    selectProject(projectId) {
        this.state.currentProject = DB.getProjects().find(p => p.id === projectId);
        Storage.set('lastProject', projectId);
        this.render();
    },

    deleteProject(projectId) {
        if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
            DB.deleteProject(projectId);
            if (this.state.currentProject?.id === projectId) {
                this.state.currentProject = null;
            }
            UI.showToast('✅ تم حذف المشروع', 'success');
            this.render();
        }
    },

    // ===== TASK MANAGEMENT =====
    showTaskForm(projectId, status = 'backlog') {
        const modal = UI.showModal(`
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">📝 مهمة جديدة</h2>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">العنوان</label>
                        <input type="text" class="form-input task-title" placeholder="عنوان المهمة" autofocus>
                    </div>
                    <div class="form-group">
                        <label class="form-label">الوصف</label>
                        <textarea class="form-textarea task-desc" placeholder="وصف المهمة..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">الأولوية</label>
                        <select class="form-select task-priority">
                            <option value="low">منخفضة 🔵</option>
                            <option value="medium" selected>متوسطة 🟡</option>
                            <option value="high">عالية 🟠</option>
                            <option value="critical">حرجة 🔴</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">تقدير الوقت (دقائق)</label>
                        <input type="number" class="form-input task-time" placeholder="0" min="0">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary">إلغاء</button>
                    <button class="btn-primary">إنشاء</button>
                </div>
            </div>
        `);

        const titleInput = modal.querySelector('.task-title');
        const descInput = modal.querySelector('.task-desc');
        const priorityInput = modal.querySelector('.task-priority');
        const timeInput = modal.querySelector('.task-time');
        const cancelBtn = modal.querySelector('.btn-secondary');
        const createBtn = modal.querySelector('.btn-primary');

        cancelBtn.addEventListener('click', () => modal.remove());
        createBtn.addEventListener('click', () => {
            const title = titleInput.value.trim();
            if (!title) {
                UI.showToast('⚠️ الرجاء إدخال عنوان المهمة', 'warning');
                return;
            }

            const task = DB.createTask(projectId, title, descInput.value, status);
            task.priority = priorityInput.value;
            task.estimateMin = parseInt(timeInput.value) || 0;

            const tasks = DB.getTasks();
            tasks.push(task);
            DB.saveTasks(tasks);

            modal.remove();
            UI.showToast('✅ تم إنشاء المهمة بنجاح', 'success');
            this.render();
        });

        titleInput.focus();
    },

    deleteTask(taskId) {
        if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
            DB.deleteTask(taskId);
            UI.showToast('✅ تم حذف المهمة', 'success');
            this.render();
        }
    },

    updateTaskStatus(taskId, newStatus) {
        const tasks = DB.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            task.updatedAt = new Date().toISOString();
            DB.saveTasks(tasks);
            UI.showToast(`✅ تم تحديث المهمة إلى: ${this.getStatusLabel(newStatus)}`, 'success');
            this.render();
        }
    },

    getStatusLabel(status) {
        const labels = {
            backlog: 'قيد الانتظار',
            doing: 'قيد الإنجاز',
            review: 'قيد المراجعة',
            done: 'مكتملة'
        };
        return labels[status] || status;
    }

    ,

    getPriorityLabel(priority) {
        const labels = {
            low: 'منخفضة 🔵',
            medium: 'متوسطة 🟡',
            high: 'عالية 🟠',
            critical: 'حرجة 🔴'
        };
        return labels[priority] || priority;
    },

    // ===== SETTINGS =====
    showSettings() {
        const modal = UI.showModal(`
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">⚙️ الإعدادات</h2>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">💾 البيانات</label>
                        <button class="btn-secondary" style="width: 100%; margin-bottom: 0.5rem;" id="export-btn">⬇️ تصدير البيانات</button>
                        <button class="btn-secondary" style="width: 100%; margin-bottom: 0.5rem;" id="import-btn">⬆️ استيراد البيانات</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="color: var(--danger);">ℹ️ معلومات التطبيق</label>
                        <div style="padding: 1rem; background: var(--bg-light); border-radius: var(--radius); font-size: 0.9rem; line-height: 1.8;">
                            <strong>📱 Seven_code7 Tasks</strong><br>
                            <small>تطبيق إدارة المشاريع والمهام الذكي</small><br><br>
                            <strong>🏢 الاستوديو:</strong> Seven_code7<br>
                            <strong>👤 المؤسس:</strong> ليث محمود معتصم<br>
                            <strong>🤖 مساعد ذكي:</strong> المساعد سبعة<br>
                            <strong>📅 الإصدار:</strong> 1.0.0
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="color: var(--danger);">⚠️ منطقة الخطر</label>
                        <button class="btn-danger" style="width: 100%;" id="clear-btn">🗑️ حذف جميع البيانات</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary">إغلاق</button>
                </div>
            </div>
        `);

        const exportBtn = modal.querySelector('#export-btn');
        const importBtn = modal.querySelector('#import-btn');
        const clearBtn = modal.querySelector('#clear-btn');
        const closeBtn = modal.querySelector('.btn-primary');

        exportBtn.addEventListener('click', () => this.exportData());
        importBtn.addEventListener('click', () => this.importData());
        clearBtn.addEventListener('click', () => this.clearAllData());
        closeBtn.addEventListener('click', () => modal.remove());
    },

    exportData() {
        const data = {
            projects: DB.getProjects(),
            tasks: DB.getTasks(),
            timestamp: new Date().toISOString()
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seven_code7_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        UI.showToast('✅ تم تصدير البيانات بنجاح', 'success');
    },

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    DB.saveProjects(data.projects || []);
                    DB.saveTasks(data.tasks || []);
                    UI.showToast('✅ تم استيراد البيانات بنجاح', 'success');
                    this.render();
                } catch (error) {
                    UI.showToast('❌ خطأ في الملف', 'error');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    },

    clearAllData() {
        if (confirm('⚠️ حذف جميع البيانات؟')) {
            if (confirm('🚨 هذا الإجراء لا يمكن التراجع عنه! هل أنت متأكد؟')) {
                Storage.clear();
                UI.showToast('✅ تم حذف البيانات', 'success');
                setTimeout(() => location.reload(), 500);
            }
        }
    },

    // ===== RENDERING =====
    render() {
        this.renderSidebar();
        this.renderContent();
        this.updateStats();
    },

    renderSidebar() {
        const list = document.getElementById('projects-list');
        const projects = DB.getProjects();

        if (projects.length === 0) {
            list.innerHTML = '<li style="color: var(--text-secondary); padding: 0.75rem; text-align: center;">📭 لا توجد مشاريع</li>';
            return;
        }

        list.innerHTML = projects.map(p => `
            <li class="project-item ${this.state.currentProject?.id === p.id ? 'active' : ''}" onclick="app.selectProject('${p.id}')">
                <span class="project-item-name">${p.title}</span>
                <div class="project-item-actions">
                    <button onclick="event.stopPropagation(); app.deleteProject('${p.id}')" title="حذف">🗑️</button>
                </div>
            </li>
        `).join('');
    },

    updateStats() {
        const projects = DB.getProjects();
        const tasks = DB.getTasks();
        
        document.getElementById('total-projects').textContent = projects.length;
        document.getElementById('total-tasks').textContent = tasks.length;
    },

    renderContent() {
        const contentArea = document.getElementById('content-area');

        if (!this.state.currentProject) {
            contentArea.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>اختر مشروعًا أو أنشئ واحدًا جديدًا للبدء</p>
                    <small>(Ctrl+N للإنشاء السريع)</small>
                </div>
            `;
            return;
        }

        const tasks = DB.getProjectTasks(this.state.currentProject.id);
        const statusFilter = document.getElementById('filter-status').value;
        const priorityFilter = document.getElementById('filter-priority').value;

        let filtered = tasks;
        if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
        if (priorityFilter) filtered = filtered.filter(t => t.priority === priorityFilter);

        switch (this.state.currentView) {
            case 'kanban':
                this.renderKanban(filtered);
                break;
            case 'list':
                this.renderList(filtered);
                break;
            case 'table':
                this.renderTable(filtered);
                break;
        }
    },

    renderKanban(tasks) {
        const columns = {
            backlog: { title: 'قيد الانتظار', emoji: '📋' },
            doing: { title: 'قيد الإنجاز', emoji: '⚙️' },
            review: { title: 'قيد المراجعة', emoji: '👀' },
            done: { title: 'مكتملة', emoji: '✅' }
        };

        let html = '<div class="kanban-board">';

        for (const [status, col] of Object.entries(columns)) {
            const columnTasks = tasks.filter(t => t.status === status);
            
            html += `
                <div class="kanban-column">
                    <div class="kanban-column-header">
                        <h3 class="kanban-column-title">${col.emoji} ${col.title}</h3>
                        <div class="kanban-column-count">${columnTasks.length}</div>
                    </div>
                    <div class="kanban-tasks" ondrop="app.dropTask(event, '${status}')" ondragover="event.preventDefault()">
                        ${columnTasks.map(task => `
                            <div class="task-card" draggable="true" ondragstart="app.dragStart(event, '${task.id}')">
                                <div class="task-card-header">
                                    <h4 class="task-card-title">${task.title}</h4>
                                    <div class="task-priority ${task.priority}"></div>
                                </div>
                                ${task.desc ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0;">${task.desc}</p>` : ''}
                                <div>
                                    ${task.estimateMin ? `<span class="task-badge">⏱️ ${task.estimateMin}د</span>` : ''}
                                </div>
                                <div class="task-actions">
                                    <button onclick="event.stopPropagation(); app.updateTaskStatus('${task.id}', 'done')">✅</button>
                                    <button onclick="event.stopPropagation(); app.deleteTask('${task.id}')">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                        <button class="btn-secondary" style="width: 100%; margin-top: 0.5rem;" onclick="app.showTaskForm('${this.state.currentProject.id}', '${status}')">
                            ➕ مهمة جديدة
                        </button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        document.getElementById('content-area').innerHTML = html;
    },

    renderList(tasks) {
        document.getElementById('content-area').innerHTML = `
            <div class="list-view">
                ${tasks.length === 0 ? '<p style="text-align: center; color: var(--text-secondary);">📭 لا توجد مهام</p>' : ''}
                ${tasks.map(task => `
                    <div class="list-item">
                        <div class="list-item-header">
                            <h4 class="list-item-title">${task.title}</h4>
                            <div class="task-priority ${task.priority}"></div>
                        </div>
                        ${task.desc ? `<p style="color: var(--text-secondary); margin: 0.5rem 0;">${task.desc}</p>` : ''}
                        <div class="list-item-meta">
                            <span class="task-badge">${this.getStatusLabel(task.status)}</span>
                            <span class="task-badge">${this.getPriorityLabel(task.priority)}</span>
                            ${task.estimateMin ? `<span class="task-badge">⏱️ ${task.estimateMin}د</span>` : ''}
                        </div>
                        <div class="task-actions">
                            <button onclick="app.updateTaskStatus('${task.id}', 'done')">✅ مكمل</button>
                            <button onclick="app.deleteTask('${task.id}')">🗑️ حذف</button>
                        </div>
                    </div>
                `).join('')}
                <button class="btn-primary" style="width: 100%; margin-top: 1rem;" onclick="app.showTaskForm('${this.state.currentProject.id}')">
                    ➕ مهمة جديدة
                </button>
            </div>
        `;
    },

    renderTable(tasks) {
        document.getElementById('content-area').innerHTML = `
            <div class="table-view">
                <table>
                    <thead>
                        <tr>
                            <th>العنوان</th>
                            <th>الحالة</th>
                            <th>الأولوية</th>
                            <th>الوقت</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tasks.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">📭 لا توجد مهام</td></tr>' : ''}
                        ${tasks.map(task => `
                            <tr>
                                <td><strong>${task.title}</strong>${task.desc ? `<br><small style="color: var(--text-secondary);">${task.desc}</small>` : ''}</td>
                                <td>${this.getStatusLabel(task.status)}</td>
                                <td>
                                    <div class="task-priority ${task.priority}" style="display: inline-block; margin-left: 0.5rem;"></div>
                                    ${this.getPriorityLabel(task.priority).split(' ')[0]}
                                </td>
                                <td>${task.estimateMin ? task.estimateMin + 'د' : '-'}</td>
                                <td>
                                    <button onclick="app.updateTaskStatus('${task.id}', 'done')" style="padding: 0.25rem 0.5rem; margin-right: 0.25rem;">✅</button>
                                    <button onclick="app.deleteTask('${task.id}')" style="padding: 0.25rem 0.5rem;">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // ===== DRAG & DROP =====
    draggedTaskId: null,

    dragStart(e, taskId) {
        this.draggedTaskId = taskId;
        e.target.closest('.task-card')?.classList.add('dragging');
    },

    dropTask(e, status) {
        e.preventDefault();
        if (this.draggedTaskId) {
            this.updateTaskStatus(this.draggedTaskId, status);
            this.draggedTaskId = null;
        }
    }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
