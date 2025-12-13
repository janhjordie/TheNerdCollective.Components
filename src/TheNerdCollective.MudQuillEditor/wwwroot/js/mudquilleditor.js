// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

window.mudQuillEditor = window.mudQuillEditor || (function () {
    const instances = {};

    // Helper to load external assets
    function ensureAssetLoaded(url, type = 'script') {
        return new Promise((resolve, reject) => {
            if (type === 'script') {
                if (document.querySelector(`script[src="${url}"]`)) {
                    return resolve();
                }
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = (err) => reject(new Error(`Failed to load script: ${url}`));
                document.head.appendChild(script);
            } else if (type === 'style') {
                if (document.querySelector(`link[href="${url}"]`)) {
                    return resolve();
                }
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.onload = () => resolve();
                link.onerror = (err) => reject(new Error(`Failed to load stylesheet: ${url}`));
                document.head.appendChild(link);
            }
        });
    }

    async function ensureQuillLoaded() {
        if (window.Quill) {
            return Promise.resolve();
        }
        
        // Load Quill CSS
        await ensureAssetLoaded('https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css', 'style');
        
        // Load Quill JS
        await ensureAssetLoaded('https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js', 'script');
        
        // Wait for Quill to be available (it might take a moment to execute)
        let attempts = 0;
        while (!window.Quill && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.Quill) {
            throw new Error('Quill failed to load');
        }
    }

    return {
        preloadQuill: async function () {
            try {
                await ensureQuillLoaded();
            } catch (e) {
                // Ignore errors
            }
        },
        initialize: async function (id, dotNetRef, options) {
            try {
                await ensureQuillLoaded();
            } catch (e) {
                return;
            }

            const el = document.getElementById(id);
            if (!el) {
                return;
            }

            const toolbarOptions = options && options.toolbar ? options.toolbar : [['bold', 'italic', 'underline'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['link', 'image']];
            const cfg = {
                modules: { toolbar: toolbarOptions },
                theme: (options && options.theme) || 'snow',
                readOnly: (options && options.readOnly) || false,
                placeholder: (options && options.placeholder) || ''
            };

            // create editor container element
            const editorId = id + '-editor';
            el.innerHTML = '<div id="' + editorId + '"></div>';
            const editorEl = document.getElementById(editorId);
            if (!editorEl) {
                return;
            }

            // If an instance already exists (e.g. auto-init), reuse it and attach dotNetRef if provided
            if (instances[id]) {
                const inst = instances[id];
                // attach the dotNetRef if provided
                if (dotNetRef) {
                    inst.dotNetRef = dotNetRef;
                    try { inst.quill.off('text-change'); } catch (e) { }
                    inst._handler = function () {
                        const html = inst.quill.root ? inst.quill.root.innerHTML : '';
                        try {
                            if (inst.dotNetRef && typeof inst.dotNetRef.invokeMethodAsync === 'function') {
                                inst.dotNetRef.invokeMethodAsync('NotifyValueChanged', html);
                            }
                        } catch (e) { }
                    };
                    inst.quill.on('text-change', inst._handler);
                }
                return;
            }

            let quill;
            try {
                quill = new Quill(editorEl, cfg);
            } catch (err) {
                return;
            }

            // Quill creates .ql-toolbar (before editorEl) and .ql-container (wrapping editorEl)
            // We need to find the toolbar and container, then wrap both in a flex container
            const toolbar = el.querySelector('.ql-toolbar');
            const container = el.querySelector('.ql-container');
            
            if (toolbar && container && options && options.maxHeight) {
                // Apply flexbox to the outer element to distribute space properly
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.maxHeight = options.maxHeight;
                el.style.minHeight = (options && options.minHeight) || 'auto';
                el.style.overflow = 'hidden';
                el.style.border = 'none';
                
                // Toolbar takes natural height
                toolbar.style.flex = '0 0 auto';
                
                // Container fills remaining space and scrolls
                container.style.flex = '1 1 auto';
                container.style.overflow = 'hidden';
                
                // Editor content scrolls internally
                const editorContentEl = container.querySelector('.ql-editor');
                if (editorContentEl) {
                    editorContentEl.style.overflow = 'auto';
                }
            }

            if (options && options.value) {
                try {
                    if (quill.clipboard && typeof quill.clipboard.dangerouslyPasteHTML === 'function') {
                        quill.clipboard.dangerouslyPasteHTML(options.value);
                    } else if (quill.root) {
                        quill.root.innerHTML = options.value;
                    }
                } catch (e) {
                    // Ignore errors
                }
            }

            // create handler bound to this dotNetRef
            const handler = function () {
                const html = quill.root ? quill.root.innerHTML : '';
                try {
                    if (dotNetRef && typeof dotNetRef.invokeMethodAsync === 'function') {
                        dotNetRef.invokeMethodAsync('NotifyValueChanged', html);
                    }
                } catch (e) { }
            };

            quill.on('text-change', handler);

            instances[id] = { quill: quill, dotNetRef: dotNetRef, _handler: handler };
        },
        getHtml: function (id) {
            const inst = instances[id];
            if (!inst) return '';
            const el = document.getElementById(id);
            if (!el) return '';
            const editor = el.querySelector('.ql-editor');
            return editor ? editor.innerHTML : '';
        },
        setHtml: function (id, html) {
            const inst = instances[id];
            if (!inst) return;
            inst.quill.clipboard.dangerouslyPasteHTML(html || '');
        },
        dispose: function (id) {
            const inst = instances[id];
            if (!inst) return;
            inst.quill.off('text-change');
            if (inst.quill && inst.quill.root && inst.quill.root.parentNode) {
                inst.quill.root.parentNode.removeChild(inst.quill.root);
            }
            delete instances[id];
        }
        ,
        attachDotNetRef: function (id, dotNetRef) {
            try {
                const inst = instances[id];
                if (!inst) return false;
                inst.dotNetRef = dotNetRef;
                try { if (inst._handler) inst.quill.off('text-change', inst._handler); } catch (e) { }
                inst._handler = function () {
                    const html = inst.quill.root ? inst.quill.root.innerHTML : '';
                    try {
                        if (inst.dotNetRef && typeof inst.dotNetRef.invokeMethodAsync === 'function') {
                            inst.dotNetRef.invokeMethodAsync('NotifyValueChanged', html);
                        }
                    } catch (e) { }
                };
                inst.quill.on('text-change', inst._handler);
                return true;
            } catch (e) {
                return false;
            }
        },
        setDarkMode: function (isDark) {
            document.body.setAttribute('data-dark-mode', isDark ? 'true' : 'false');
        },
        setReadOnly: function (id, isReadOnly) {
            const inst = instances[id];
            if (!inst) return;
            inst.quill.enable(!isReadOnly);
        },
        setPlaceholder: function (id, placeholder) {
            const inst = instances[id];
            if (!inst) return;
            const editorEl = inst.quill.root;
            if (editorEl) {
                editorEl.setAttribute('data-placeholder', placeholder);
            }
        }
    };
})();

// Pre-load Quill on page load (but don't initialize editors; let Blazor components do that with correct dotNetRef).
(function preloadQuill() {
    async function ensureLoaded() {
        if (window.mudQuillEditor && typeof window.mudQuillEditor.preloadQuill === 'function') {
            await window.mudQuillEditor.preloadQuill();
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(ensureLoaded, 50);
    } else {
        window.addEventListener('load', ensureLoaded);
    }
})();

