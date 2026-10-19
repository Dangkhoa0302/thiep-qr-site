(() => {
    const config = window.LETTER_APP_CONFIG;
    const params = new URLSearchParams(window.location.search);
    const draftKey = new URLSearchParams(window.location.hash.slice(1)).get('key');
    const views = ['createView', 'draftView', 'readView', 'reviewView']
        .map(id => document.getElementById(id));
    const themes = ['rose', 'lavender', 'night', 'garden', 'sunset'];
    const form = document.getElementById('letterForm');
    const messageInput = document.getElementById('message');
    const statusButton = document.getElementById('checkStatus');
    let draft = null;
    let qrLibraryPromise;

    function showView(view) {
        for (const candidate of views) candidate.hidden = candidate !== view;
        document.getElementById('intro').hidden = view !== views[0];
        document.getElementById('siteNotice').hidden = true;
    }

    function showNotice(message) {
        const notice = document.getElementById('siteNotice');
        notice.textContent = message;
        notice.hidden = false;
    }

    function apiConfigured() {
        return config
            && typeof config.apiUrl === 'string'
            && !config.apiUrl.includes('YOUR_PROJECT_ID')
            && typeof config.anonKey === 'string'
            && !config.anonKey.includes('YOUR_SUPABASE_ANON_KEY');
    }

    async function requestApi(payload) {
        if (!apiConfigured()) {
            throw new Error('Thiệp trực tuyến chưa được cấu hình. Chủ trang cần điền URL và anon key của Supabase vào app-config.js.');
        }
        let response;
        try {
            response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    apikey: config.anonKey,
                    authorization: `Bearer ${config.anonKey}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch {
            throw new Error('Không kết nối được máy chủ thiệp. Kiểm tra mạng hoặc thử lại sau.');
        }
        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error('Máy chủ trả về dữ liệu không đọc được. Vui lòng thử lại sau.');
        }
        if (!response.ok) throw new Error(result.error || 'Không xử lý được yêu cầu.');
        return result;
    }

    function normalizedContent() {
        const data = new FormData(form);
        return {
            recipient: String(data.get('recipient')).trim(),
            occasion: String(data.get('occasion')),
            title: String(data.get('title')).trim(),
            message: String(data.get('message')).trim(),
            signoff: String(data.get('signoff')).trim(),
            theme: String(data.get('theme')),
            accent: String(data.get('accent'))
        };
    }

    function applyTheme(card, theme, accent) {
        card.classList.remove(...themes.map(name => `theme-${name}`));
        card.classList.add(themes.includes(theme) ? `theme-${theme}` : 'theme-rose');
        card.style.setProperty('--custom-accent', /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#d66b87');
    }

    function updatePreview() {
        const content = normalizedContent();
        document.getElementById('previewRecipient').textContent =
            content.recipient ? `Gửi ${content.recipient}` : 'Gửi đến người thương';
        document.getElementById('previewTitle').textContent = content.title || 'Tiêu đề tấm thiệp';
        document.getElementById('previewMessage').textContent =
            content.message || 'Lời nhắn bạn viết sẽ hiện ở đây. Hãy cứ dùng lời của chính mình nhé.';
        document.getElementById('previewSignoff').textContent = content.signoff || 'Thân mến,';
        applyTheme(document.getElementById('previewCard'), content.theme, content.accent);
        document.getElementById('messageCount').textContent = `${messageInput.value.length} / 4000`;
    }

    function buildReadLink(id) {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('letter', id);
        return url.toString();
    }

    function renderLetter(card, prefix, letter) {
        applyTheme(card, letter.theme, letter.accent);
        document.getElementById(`${prefix}Recipient`).textContent = `Gửi ${letter.recipient}`;
        document.getElementById(`${prefix}Title`).textContent = letter.title;
        document.getElementById(`${prefix}Message`).textContent = letter.message;
        document.getElementById(`${prefix}Signoff`).textContent = letter.signoff;
    }

    function showDraft(data) {
        draft = data;
        showView(views[1]);
        document.getElementById('draftTitle').textContent = 'Thiệp đã được gửi';
        document.getElementById('draftManage').hidden = false;
        document.getElementById('shareResult').hidden = true;
        statusButton.hidden = false;
        document.getElementById('copyDraftLink').dataset.url = window.location.href;
        updateDraftStatus();
    }

    async function updateDraftStatus() {
        if (!draft) return;
        statusButton.disabled = true;
        statusButton.textContent = 'Đang kiểm tra…';
        try {
            const result = await requestApi({
                action: 'status',
                id: draft.id,
                editKey: draft.editKey
            });
            const statusMessage = document.getElementById('draftStatus');
            if (result.status === 'published') {
                statusMessage.textContent = 'Thiệp đã được duyệt và có thể gửi riêng cho người nhận.';
                displayShare(result.id || draft.id);
            } else if (result.status === 'rejected') {
                statusMessage.textContent = 'Thiệp chưa được duyệt. Hãy quay lại trang tạo thiệp nếu bạn muốn gửi một phiên bản khác.';
                statusButton.hidden = true;
            } else {
                statusMessage.textContent = 'Thiệp đang chờ chủ trang xem và duyệt. Hãy lưu liên kết quản lý này để kiểm tra lại sau.';
            }
        } catch (error) {
            document.getElementById('draftStatus').textContent = error.message;
        } finally {
            statusButton.disabled = false;
            statusButton.textContent = 'Kiểm tra lại trạng thái';
        }
    }

    function loadQrLibrary() {
        if (typeof window.QRCode === 'function') return Promise.resolve();
        if (qrLibraryPromise) return qrLibraryPromise;
        qrLibraryPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
            script.referrerPolicy = 'no-referrer';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Không tải được bộ tạo mã QR.'));
            document.head.append(script);
        });
        return qrLibraryPromise;
    }

    async function displayShare(id) {
        const sharePageUrl = new URL(window.location.href);
        sharePageUrl.search = '';
        sharePageUrl.hash = '';
        sharePageUrl.searchParams.set('share', id);
        window.history.replaceState({}, '', sharePageUrl);
        views[0].replaceChildren();
        draft = null;
        const shareUrl = buildReadLink(id);
        document.getElementById('shareUrl').value = shareUrl;
        document.getElementById('draftTitle').textContent = 'Liên kết và mã QR của thiệp';
        document.getElementById('draftStatus').textContent = 'Thiệp đã được duyệt và có thể gửi cho người nhận.';
        document.getElementById('draftManage').hidden = true;
        document.getElementById('shareResult').hidden = false;
        statusButton.hidden = true;
        const qrCode = document.getElementById('qrCode');
        qrCode.replaceChildren();
        qrCode.classList.remove('qr-unavailable');
        try {
            await loadQrLibrary();
            new window.QRCode(qrCode, {
                text: shareUrl,
                width: 168,
                height: 168,
                colorDark: '#35273a',
                colorLight: '#ffffff',
                correctLevel: window.QRCode.CorrectLevel.M
            });
        } catch (error) {
            qrCode.textContent = `${error.message} Bạn vẫn có thể sao chép liên kết bên trên.`;
            qrCode.classList.add('qr-unavailable');
        }
    }

    async function loadPublicShare(id) {
        showView(views[1]);
        document.getElementById('draftManage').hidden = true;
        document.getElementById('draftTitle').textContent = 'Đang kiểm tra thiệp…';
        document.getElementById('draftStatus').textContent = '';
        document.getElementById('shareResult').hidden = true;
        statusButton.hidden = true;
        try {
            await requestApi({ action: 'read', id });
            await displayShare(id);
        } catch (error) {
            document.getElementById('draftTitle').textContent = 'Không mở được thiệp';
            document.getElementById('draftStatus').textContent = error.message;
        }
    }

    async function loadRecipientLetter(id) {
        showView(views[2]);
        const recipient = document.getElementById('readRecipient');
        recipient.textContent = 'Đang mở thiệp…';
        try {
            const result = await requestApi({ action: 'read', id });
            renderLetter(document.getElementById('readCard'), 'read', result.letter);
        } catch (error) {
            recipient.textContent = error.message;
        }
    }

    function addPendingCard(letter, adminToken) {
        const card = document.createElement('article');
        card.className = 'pending-card';
        const title = document.createElement('h3');
        title.textContent = letter.title;
        const recipient = document.createElement('p');
        const occasionLabels = {
            love: 'Một lời thương',
            birthday: 'Sinh nhật',
            thanks: 'Lời cảm ơn',
            encouragement: 'Động viên',
            apology: 'Lời xin lỗi',
            celebration: 'Dịp đặc biệt',
            custom: 'Chủ đề riêng'
        };
        recipient.textContent = `Gửi đến: ${letter.recipient} · Chủ đề: ${occasionLabels[letter.occasion] || 'Chủ đề riêng'}`;
        const message = document.createElement('p');
        message.textContent = letter.message;
        const signoff = document.createElement('p');
        signoff.textContent = `Ký tên: ${letter.signoff}`;
        const actions = document.createElement('div');
        actions.className = 'pending-actions';
        card.append(title, recipient, message, signoff, actions);

        for (const [status, label, className] of [
            ['published', 'Duyệt và phát hành', 'approve-button'],
            ['rejected', 'Từ chối', 'reject-button']
        ]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = className;
            button.textContent = label;
            button.addEventListener('click', async () => {
                button.disabled = true;
                try {
                    await requestApi({ action: 'review_update', adminToken, id: letter.id, status });
                    card.remove();
                } catch (error) {
                    showReviewError(error.message);
                    button.disabled = false;
                }
            });
            actions.append(button);
        }
        return card;
    }

    function showReviewError(message) {
        const error = document.getElementById('reviewError');
        error.textContent = message;
        error.hidden = false;
    }

    async function loadPendingLetters(adminToken) {
        const list = document.getElementById('pendingList');
        const error = document.getElementById('reviewError');
        error.hidden = true;
        list.replaceChildren();
        try {
            const result = await requestApi({ action: 'review_list', adminToken });
            if (result.letters.length === 0) {
                list.textContent = 'Chưa có thiệp nào cần duyệt.';
                return;
            }
            for (const letter of result.letters) {
                list.append(addPendingCard(letter, adminToken));
            }
        } catch (problem) {
            showReviewError(problem.message);
        }
    }

    form.addEventListener('input', updatePreview);
    form.addEventListener('change', updatePreview);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = document.getElementById('submitLetter');
        button.disabled = true;
        button.textContent = 'Đang gửi thiệp…';
        try {
            const result = await requestApi({ action: 'create', ...normalizedContent() });
            const draftUrl = new URL(window.location.href);
            draftUrl.search = '';
            draftUrl.hash = '';
            draftUrl.searchParams.set('draft', result.id);
            draftUrl.hash = new URLSearchParams({ key: result.editKey }).toString();
            window.history.pushState({}, '', draftUrl);
            showDraft({ id: result.id, editKey: result.editKey });
        } catch (error) {
            showNotice(error.message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            button.disabled = false;
            button.innerHTML = 'Gửi thiệp để duyệt <span aria-hidden="true">→</span>';
        }
    });

    document.getElementById('copyDraftLink').addEventListener('click', async event => {
        try {
            await navigator.clipboard.writeText(event.currentTarget.dataset.url);
            event.currentTarget.textContent = 'Đã sao chép liên kết kiểm tra';
        } catch {
            showNotice('Không sao chép được tự động. Hãy lưu liên kết hiện tại trên thanh địa chỉ.');
        }
    });

    document.getElementById('downloadQr').addEventListener('click', () => {
        const canvas = document.querySelector('#qrCode canvas');
        const image = document.querySelector('#qrCode img');
        const dataUrl = canvas?.toDataURL('image/png') || image?.src;
        if (!dataUrl) {
            showNotice('Mã QR chưa sẵn sàng. Vui lòng thử lại sau.');
            return;
        }
        const download = document.createElement('a');
        download.href = dataUrl;
        download.download = 'ma-qr-thiep.png';
        download.click();
    });

    statusButton.addEventListener('click', updateDraftStatus);
    document.getElementById('copyLink').addEventListener('click', async event => {
        try {
            await navigator.clipboard.writeText(document.getElementById('shareUrl').value);
            event.currentTarget.textContent = 'Đã sao chép';
            setTimeout(() => { event.currentTarget.textContent = 'Sao chép'; }, 1800);
        } catch {
            document.getElementById('shareUrl').select();
            showNotice('Trình duyệt không cho sao chép tự động. Hãy chọn và sao chép liên kết thủ công.');
        }
    });

    document.getElementById('reviewLogin').addEventListener('submit', async event => {
        event.preventDefault();
        const token = document.getElementById('adminToken').value;
        await loadPendingLetters(token);
    });

    const queryLetter = params.get('letter');
    const queryDraft = params.get('draft');
    if (params.has('review')) {
        showView(views[3]);
    } else if (queryLetter) {
        loadRecipientLetter(queryLetter);
    } else if (params.has('share') && params.get('share')) {
        loadPublicShare(params.get('share'));
    } else if (queryDraft && draftKey) {
        showDraft({ id: queryDraft, editKey: draftKey });
    } else {
        showView(views[0]);
        updatePreview();
        if (!apiConfigured()) {
            showNotice('Bản xem trước dùng được ngay. Để gửi thiệp trực tuyến, chủ trang cần cấu hình Supabase trong app-config.js theo hướng dẫn triển khai.');
        }
    }
})();
