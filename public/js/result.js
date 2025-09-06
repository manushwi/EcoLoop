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
        if (data && data.itemName) {
            titleEl.textContent = data.itemName;
        } else if (data && data.description) {
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
        const { itemName, itemCategory, confidence, environmental, alternatives, tips, warnings, funFacts } = data;
        let html = '';

        // Item information header
        if (itemName) {
            html += `
                <div class="card item-header">
                    <div class="item-info">
                        <h2 class="item-name">${escapeHtml(itemName)}</h2>
                        <div class="item-meta">
                            <span class="category-badge category-${itemCategory}">${itemCategory}</span>
                            <span class="confidence-badge">${Math.round((confidence || 0.8) * 100)}% confidence</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Environmental impact section
        if (environmental) {
            html += `
                <div class="card environmental-impact">
                    <h3>🌱 Environmental Impact</h3>
                    <div class="impact-grid">
                        <div class="impact-item">
                            <span class="impact-value">${environmental.carbonFootprint || 0} kg</span>
                            <span class="impact-label">CO2 Footprint</span>
                        </div>
                        <div class="impact-item">
                            <span class="impact-value">${environmental.carbonSaved || 0} kg</span>
                            <span class="impact-label">CO2 Saved</span>
                        </div>
                        <div class="impact-item">
                            <span class="impact-value">${environmental.wasteReduction || 0} kg</span>
                            <span class="impact-label">Waste Reduced</span>
                        </div>
                        <div class="impact-item">
                            <span class="impact-value">${environmental.energySaved || 0} kWh</span>
                            <span class="impact-label">Energy Saved</span>
                        </div>
                        ${environmental.waterSaved ? `
                        <div class="impact-item">
                            <span class="impact-value">${environmental.waterSaved} L</span>
                            <span class="impact-label">Water Saved</span>
                        </div>
                        ` : ''}
                    </div>
                    ${environmental.impactDescription ? `
                    <div class="impact-description">
                        <p>${escapeHtml(environmental.impactDescription)}</p>
                    </div>
                    ` : ''}
                    ${environmental.decompositionTime ? `
                    <div class="decomposition-info">
                        <h4>⏰ Decomposition Time</h4>
                        <p>${escapeHtml(environmental.decompositionTime)}</p>
                    </div>
                    ` : ''}
                    ${environmental.pollutionPotential ? `
                    <div class="pollution-info">
                        <h4>⚠️ Pollution Potential</h4>
                        <p>${escapeHtml(environmental.pollutionPotential)}</p>
                    </div>
                    ` : ''}
                    ${environmental.resourceConservation ? `
                    <div class="resource-info">
                        <h4>💎 Resource Conservation</h4>
                        <p>${escapeHtml(environmental.resourceConservation)}</p>
                    </div>
                    ` : ''}
                    ${environmental.globalImpact ? `
                    <div class="global-impact">
                        <h4>🌍 Global Impact</h4>
                        <p>${escapeHtml(environmental.globalImpact)}</p>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        // Action-specific content
        if (action === 'recycle') {
            html += renderRecycleContent(rec);
        } else if (action === 'reuse') {
            html += renderReuseContent(rec);
        } else if (action === 'donate') {
            html += renderDonateContent(rec);
        }

        // Alternatives section
        if (alternatives && alternatives.length > 0) {
            html += `
                <div class="card alternatives">
                    <h3>🔄 Alternative Options</h3>
                    <div class="alternatives-list">
                        ${alternatives.map(alt => `
                            <div class="alternative-item">
                                <h4>${escapeHtml(alt.title)}</h4>
                                <p>${escapeHtml(alt.description)}</p>
                                <div class="pros-cons">
                                    ${alt.pros && alt.pros.length > 0 ? `
                                    <div class="pros">
                                        <strong>Pros:</strong>
                                        <ul>
                                            ${alt.pros.map(pro => `<li>${escapeHtml(pro)}</li>`).join('')}
                                        </ul>
                                    </div>
                                    ` : ''}
                                    ${alt.cons && alt.cons.length > 0 ? `
                                    <div class="cons">
                                        <strong>Cons:</strong>
                                        <ul>
                                            ${alt.cons.map(con => `<li>${escapeHtml(con)}</li>`).join('')}
                                        </ul>
                                    </div>
                                    ` : ''}
                                </div>
                                ${alt.requirements ? `
                                <div class="requirements">
                                    <h5>Requirements:</h5>
                                    <p>${escapeHtml(alt.requirements)}</p>
                                </div>
                                ` : ''}
                                ${alt.costAnalysis ? `
                                <div class="cost-analysis">
                                    <h5>Cost Analysis:</h5>
                                    <p>${escapeHtml(alt.costAnalysis)}</p>
                                </div>
                                ` : ''}
                                ${alt.environmentalImpact ? `
                                <div class="alt-environmental">
                                    <h5>Environmental Impact:</h5>
                                    <p>${escapeHtml(alt.environmentalImpact)}</p>
                                </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Warnings section
        if (warnings && warnings.length > 0) {
            html += `
                <div class="card warnings">
                    <h3>⚠️ Important Warnings</h3>
                    <ul class="warnings-list">
                        ${warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Fun facts section
        if (funFacts && funFacts.length > 0) {
            html += `
                <div class="card fun-facts">
                    <h3>🎉 Fun Facts</h3>
                    <ul class="fun-facts-list">
                        ${funFacts.map(fact => `<li>${escapeHtml(fact)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // General tips section
        if (tips && tips.length > 0) {
            html += `
                <div class="card tips">
                    <h3>💡 Helpful Tips</h3>
                    <ul class="tips-list">
                        ${tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    function renderRecycleContent(rec) {
        if (!rec.possible) {
            return '<div class="card"><h3>⚠️ Not Recommended</h3><p>This item cannot be recycled through standard methods.</p></div>';
        }

        let html = `
            <div class="card recycle-instructions">
                <h3>♻️ Recycling Instructions</h3>
                <div class="instruction-content">
                    <div class="instructions-sections">
                        ${rec.instructions ? `
                        <div class="instruction-section">
                            <h4>📋 Step-by-Step Process</h4>
                            <div class="instruction-steps">
                                ${rec.instructions.split('\n').filter(line => line.trim()).map((step, index) => `
                                    <div class="step-item">
                                        <div class="step-number">${index + 1}</div>
                                        <div class="step-content">${escapeHtml(step.trim())}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
        `;

        if (rec.preparation) {
            html += `
                <div class="preparation-section">
                    <h4>Preparation Steps</h4>
                    <p>${escapeHtml(rec.preparation)}</p>
                </div>
            `;
        }

        if (rec.materials && rec.materials.length > 0) {
            html += `
                <div class="materials-section">
                    <h4>Materials</h4>
                    <div class="materials-tags">
                        ${rec.materials.map(material => `<span class="material-tag">${escapeHtml(material)}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        if (rec.difficulty || rec.timeRequired || rec.cost) {
            html += `
                <div class="recycle-meta">
                    ${rec.difficulty ? `<span class="difficulty-badge difficulty-${rec.difficulty}">${rec.difficulty}</span>` : ''}
                    ${rec.timeRequired ? `<span class="time-badge">⏱️ ${escapeHtml(rec.timeRequired)}</span>` : ''}
                    ${rec.cost ? `<span class="cost-badge">💰 ${escapeHtml(rec.cost)}</span>` : ''}
                </div>
            `;
        }

        if (rec.safetyNotes) {
            html += `
                <div class="safety-notes">
                    <h4>🛡️ Safety Notes</h4>
                    <p>${escapeHtml(rec.safetyNotes)}</p>
                </div>
            `;
        }

        if (rec.commonMistakes) {
            html += `
                <div class="common-mistakes">
                    <h4>❌ Common Mistakes to Avoid</h4>
                    <p>${escapeHtml(rec.commonMistakes)}</p>
                </div>
            `;
        }

        if (rec.benefits) {
            html += `
                <div class="recycle-benefits">
                    <h4>✅ Benefits</h4>
                    <p>${escapeHtml(rec.benefits)}</p>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    function renderReuseContent(rec) {
        if (!rec.possible) {
            return '<div class="card"><h3>⚠️ Not Recommended</h3><p>This item may not be suitable for reuse.</p></div>';
        }

        let html = `
            <div class="card reuse-ideas">
                <h3>🔄 Creative Reuse Ideas</h3>
        `;

        if (rec.tips) {
            html += `
                <div class="reuse-tips">
                    <h4>💡 Reuse Tips</h4>
                    <p>${escapeHtml(rec.tips)}</p>
                </div>
            `;
        }

        if (rec.creativeInspiration) {
            html += `
                <div class="creative-inspiration">
                    <h4>🎨 Creative Inspiration</h4>
                    <p>${escapeHtml(rec.creativeInspiration)}</p>
                </div>
            `;
        }

        if (rec.upcyclingPotential) {
            html += `
                <div class="upcycling-potential">
                    <h4>🌟 Upcycling Potential</h4>
                    <p>${escapeHtml(rec.upcyclingPotential)}</p>
                </div>
            `;
        }

        if (rec.ideas && rec.ideas.length > 0) {
            html += `
                <div class="ideas-grid">
                    ${rec.ideas.map(idea => `
                        <div class="idea-card">
                            <h4>${escapeHtml(idea.title)}</h4>
                            <p class="idea-description">${escapeHtml(idea.description)}</p>
                            <div class="idea-meta">
                                ${idea.difficulty ? `<span class="difficulty-badge difficulty-${idea.difficulty}">${idea.difficulty}</span>` : ''}
                                ${idea.timeRequired ? `<span class="time-badge">⏱️ ${escapeHtml(idea.timeRequired)}</span>` : ''}
                            </div>
                            ${idea.skillLevel ? `
                            <div class="skill-level">
                                <strong>Skill Level:</strong> ${escapeHtml(idea.skillLevel)}
                            </div>
                            ` : ''}
                            ${idea.toolsRequired && idea.toolsRequired.length > 0 ? `
                            <div class="tools-required">
                                <strong>Tools Required:</strong>
                                <div class="tools-tags">
                                    ${idea.toolsRequired.map(tool => `<span class="tool-tag">${escapeHtml(tool)}</span>`).join('')}
                                </div>
                            </div>
                            ` : ''}
                            ${idea.materialsNeeded && idea.materialsNeeded.length > 0 ? `
                            <div class="materials-needed">
                                <strong>Materials needed:</strong>
                                <div class="materials-tags">
                                    ${idea.materialsNeeded.map(material => `<span class="material-tag">${escapeHtml(material)}</span>`).join('')}
                                </div>
                            </div>
                            ` : ''}
                            ${idea.steps && idea.steps.length > 0 ? `
                            <div class="idea-steps">
                                <strong>Steps:</strong>
                                <ol>
                                    ${idea.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
                                </ol>
                            </div>
                            ` : ''}
                            ${idea.benefits ? `
                            <div class="idea-benefits">
                                <strong>Benefits:</strong>
                                <p>${escapeHtml(idea.benefits)}</p>
                            </div>
                            ` : ''}
                            ${idea.variations ? `
                            <div class="idea-variations">
                                <strong>Variations:</strong>
                                <p>${escapeHtml(idea.variations)}</p>
                            </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            html += '<p>No specific reuse ideas available.</p>';
        }

        html += '</div>';
        return html;
    }

    function renderDonateContent(rec) {
        if (!rec.possible) {
            return '<div class="card"><h3>⚠️ Not Recommended</h3><p>This item may not be suitable for donation.</p></div>';
        }

        let html = `
            <div class="card donate-info">
                <h3>❤️ Donation Information</h3>
        `;

        if (rec.preparation) {
            html += `
                <div class="preparation-section">
                    <h4>Preparation for Donation</h4>
                    <p>${escapeHtml(rec.preparation)}</p>
                </div>
            `;
        }

        if (rec.taxBenefits) {
            html += `
                <div class="tax-benefits">
                    <h4>💰 Tax Benefits</h4>
                    <p>${escapeHtml(rec.taxBenefits)}</p>
                </div>
            `;
        }

        if (rec.impact) {
            html += `
                <div class="donation-impact">
                    <h4>🌍 Impact</h4>
                    <p>${escapeHtml(rec.impact)}</p>
                </div>
            `;
        }

        if (rec.timing) {
            html += `
                <div class="donation-timing">
                    <h4>⏰ Best Timing</h4>
                    <p>${escapeHtml(rec.timing)}</p>
                </div>
            `;
        }

        if (rec.documentation) {
            html += `
                <div class="donation-documentation">
                    <h4>📋 Documentation</h4>
                    <p>${escapeHtml(rec.documentation)}</p>
                </div>
            `;
        }

        html += '</div>';

        if (rec.organizations && rec.organizations.length > 0) {
            html += `
                <div class="card organizations">
                    <h3>🏢 Donation Organizations</h3>
                    <div class="organizations-list">
                        ${rec.organizations.map(org => `
                            <div class="organization-item">
                                <h4>${escapeHtml(org.name)}</h4>
                                <p class="org-description">${escapeHtml(org.description)}</p>
                                ${org.website ? `<p class="website">🌐 <a href="${escapeHtml(org.website)}" target="_blank">${escapeHtml(org.website)}</a></p>` : ''}
                                ${org.acceptanceCriteria ? `<p class="criteria">✅ ${escapeHtml(org.acceptanceCriteria)}</p>` : ''}
                                ${org.preparation ? `<p class="prep">📋 ${escapeHtml(org.preparation)}</p>` : ''}
                                ${org.impact ? `<p class="impact">🌍 ${escapeHtml(org.impact)}</p>` : ''}
                                ${org.specializations ? `<p class="specializations">⭐ ${escapeHtml(org.specializations)}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return html;
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
