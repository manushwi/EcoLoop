// Shared logic for recycle/reuse/donate pages to render AI results
(function () {
    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    async function fetchRecommendations(uploadId, action) {
        const res = await fetch(
            `/api/upload/${encodeURIComponent(uploadId)}/${encodeURIComponent(
                action
            )}/recommendations`,
            {
                credentials: 'include',
            }
        );
        if (!res.ok) throw new Error('Failed to load recommendations');
        const data = await res.json();
        if (!data.success)
            throw new Error(data.message || 'Failed to load recommendations');
        return data.data;
    }

    function setTitleFromData(data) {
        const titleEl = document.getElementById('resultItemTitle');
        if (!titleEl) return;
        const fromStorage = safeGetSession('lastItemDescription');
        if (fromStorage) {
            titleEl.textContent = fromStorage;
            return;
        }
        if (data && data.description) {
            titleEl.textContent =
                data.description.split('\n').filter(Boolean)[0] ||
                titleEl.textContent;
        } else if (data && data.itemCategory) {
            titleEl.textContent =
                data.itemCategory.charAt(0).toUpperCase() +
                data.itemCategory.slice(1);
        }
    }

    function renderContent(container, data) {
        if (!container || !data) return;
        const action = data.action;
        const rec = data.recommendations || {};
        let html = '';

        if (action === 'recycle') {
            const instructions =
                rec.instructions ||
                'Follow local guidance for proper recycling.';
            const locations = (rec.locations || [])
                .map(
                    (l) =>
                        `<li>${l.name}${
                            l.address ? ' — ' + l.address : ''
                        }</li>`
                )
                .join('');
            html += `<div class="card"><h3>Instructions</h3><p>${escapeHtml(
                instructions
            )}</p></div>`;
            if (locations)
                html += `<div class="card"><h3>Nearby Locations</h3><ul>${locations}</ul></div>`;
        } else if (action === 'reuse') {
            const ideas = (rec.ideas || [])
                .map(
                    (i) =>
                        `<li><strong>${escapeHtml(
                            i.title || ''
                        )}</strong><br>${escapeHtml(i.description || '')}</li>`
                )
                .join('');
            html += ideas
                ? `<div class="card"><h3>Ideas</h3><ul>${ideas}</ul></div>`
                : '<div class="card"><p>No specific ideas available.</p></div>';
        } else if (action === 'donate') {
            const orgs = (rec.organizations || [])
                .map(
                    (o) =>
                        `<li><strong>${escapeHtml(o.name || '')}</strong>${
                            o.description
                                ? ' — ' + escapeHtml(o.description)
                                : ''
                        }</li>`
                )
                .join('');
            html += orgs
                ? `<div class="card"><h3>Organizations</h3><ul>${orgs}</ul></div>`
                : '<div class="card"><p>No organizations found.</p></div>';
        }

        if (data.environmental) {
            const env = data.environmental;
            html += `<div class="card"><h3>Impact</h3><p>Carbon saved: ${Number(
                env.carbonSaved || 0
            ).toFixed(2)} kg CO2</p><p>Carbon footprint: ${Number(
                env.carbonFootprint || 0
            ).toFixed(2)} kg CO2</p></div>`;
        }

        container.innerHTML = html;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"]+/g, function (s) {
            switch (s) {
                case '&':
                    return '&amp;';
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                case '"':
                    return '&quot;';
                default:
                    return s;
            }
        });
    }

    async function init() {
        const uploadId =
            getQueryParam('uploadId') || sessionStorage.getItem('lastUploadId');
        const path = window.location.pathname;
        const action = path.includes('/recycle')
            ? 'recycle'
            : path.includes('/reuse')
            ? 'reuse'
            : 'donate';
        const container =
            document.getElementById('resultContent') ||
            document.querySelector('.steps-section') ||
            document.querySelector('.main-content');
        try {
            if (!uploadId) throw new Error('Missing uploadId');
            const data = await fetchRecommendations(uploadId, action);
            setTitleFromData(data);
            renderContent(container, data);
            injectControls(container);
            wireBackButton();
        } catch (e) {
            if (container)
                container.innerHTML = `<div class="card"><p>Could not load details. ${escapeHtml(
                    e.message
                )}</p></div>`;
        }
    }

    function safeGetSession(key) {
        try {
            const v = sessionStorage.getItem(key) || '';
            return v.trim();
        } catch (_) {
            return '';
        }
    }

    function injectControls(container) {
        if (!container) return;
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '16px';
        wrapper.innerHTML = `
      <a href="/upload?new=1" class="back-button" style="display:inline-block; margin-top:8px;">Upload Another Item</a>
    `;
        container.appendChild(wrapper);
    }

    function wireBackButton() {
        const back = document.querySelector('.back-button');
        if (!back) return;
        back.addEventListener('click', function (ev) {
            try {
                const url = new URL(
                    back.getAttribute('href'),
                    window.location.origin
                );
                if (
                    url.pathname === '/upload' &&
                    !url.searchParams.get('new')
                ) {
                    sessionStorage.setItem('returnToUploadWithRestore', '1');
                }
            } catch (_) {}
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
