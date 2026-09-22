/**
 * GYAN AI — Intelligent Agentic Frontend Engine
 */

const CREATIVE_IMAGE_PROMPTS = [
  { prompt: "Futuristic neon cyberpunk city in the rain, ultra-detailed reflections on wet asphalt, cinematic lighting", style: "cyberpunk" },
  { prompt: "A majestic mythical dragon carved from glacial ice perched atop an obsidian peak beneath the Aurora Borealis", style: "fantasy" },
  { prompt: "Cute robotic red panda tending to glowing bonsai plants in a cozy solarpunk greenhouse, warm atmosphere", style: "digital-art" },
  { prompt: "Hyper-realistic 8k photograph of an astronaut gazing at a glowing nebula reflection in helmet visor", style: "photorealistic" },
  { prompt: "Steampunk flying galleon with brass clockwork gears navigating through sunset storm clouds, 3D volumetric render", style: "cinematic-3d" },
  { prompt: "Ethereal Japanese zen garden with sakura petals floating on a tranquil koi pond at twilight, watercolor wash", style: "watercolor" },
  { prompt: "An ancient arcane library inside a giant hollowed crystal tree with floating illuminated spellbooks", style: "fantasy" },
  { prompt: "Detailed graphite pencil sketch of an elderly clockmaker repairing an intricate celestial astrolabe, fine line art", style: "sketch" },
  { prompt: "Retro 16-bit pixel art scene of an adventurer camping by a mystical campfire in an enchanted forest", style: "pixel-art" },
  { prompt: "Minimalist geometric origami fox logo with gold foil accents on a matte black background, clean vector", style: "minimalist-logo" },
  { prompt: "Cybernetic samurai standing atop a skyscraper overlooking a rainy neo-Tokyo skyline with holographic billboards", style: "cyberpunk" },
  { prompt: "Studio portrait of an iridescent hummingbird hovering near a bioluminescent orchid, 8k macro photography", style: "photorealistic" }
];

class GyanApp {
  constructor() {
    this.currentConversationId = localStorage.getItem('gyan_active_conv_id') || null;
    this.conversations = [];
    this.effortLevel = 'medium';
    this.attachments = []; // [{ id, filename, type, extension, size_formatted, data_uri, text_content }]
    this.quotedSelection = null;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordStartTime = null;
    this.recordTimerInterval = null;
    this.isSending = false;
    this.currentSpeakingMsgId = null;

    // Image Generation Studio & Lightbox State
    this.isImageMode = false;
    this.studioSelectedStyle = 'photorealistic';
    this.studioSelectedAspect = '1:1';
    this.studioSelectedFormat = 'png';
    this.lastGeneratedStudioData = null;
    this.studioHistory = JSON.parse(sessionStorage.getItem('gyan_studio_history') || '[]');
    this.currentLightboxData = null;
    this.lightboxZoom = 1.0;
    this.synthesisStepTimer = null;

    this.initElements();
    this.initEvents();
    this.checkApiStatus();
    this.loadConversations('', true);
    this.setupMarkdown();
    this.renderStudioHistory();
  }

  initElements() {
    // Layout & Navigation
    this.appLayout = document.getElementById('appLayout');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOverlay = document.getElementById('sidebarOverlay');
    this.toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    this.closeSidebarBtn = document.getElementById('closeSidebarBtn');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.chatSearchInput = document.getElementById('chatSearchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.conversationList = document.getElementById('conversationList');
    this.historyCount = document.getElementById('historyCount');
    this.clearAllChatsBtn = document.getElementById('clearAllChatsBtn');

    // Header & Meta
    this.currentChatTitle = document.getElementById('currentChatTitle');
    this.currentEffortBadge = document.getElementById('currentEffortBadge');
    this.badgeEffortText = document.getElementById('badgeEffortText');
    this.currentModelBadge = document.getElementById('currentModelBadge');
    this.badgeModelText = document.getElementById('badgeModelText');
    this.exportChatBtn = document.getElementById('exportChatBtn');

    // Chat Viewport
    this.chatViewport = document.getElementById('chatViewport');
    this.welcomeScreen = document.getElementById('welcomeScreen');
    this.messagesContainer = document.getElementById('messagesContainer');

    // Tooltip for Text Selection
    this.selectionTooltip = document.getElementById('selectionTooltip');
    this.querySelectionBtn = document.getElementById('querySelectionBtn');
    this.explainSelectionBtn = document.getElementById('explainSelectionBtn');

    // Composer Elements
    this.quotePreviewBar = document.getElementById('quotePreviewBar');
    this.quoteText = document.getElementById('quoteText');
    this.dismissQuoteBtn = document.getElementById('dismissQuoteBtn');
    this.attachmentsPreviewBar = document.getElementById('attachmentsPreviewBar');
    this.effortPills = document.getElementById('effortPills');
    this.promptInput = document.getElementById('promptInput');
    this.fileInput = document.getElementById('fileInput');
    this.imageInput = document.getElementById('imageInput');
    this.attachFileBtn = document.getElementById('attachFileBtn');
    this.attachImageBtn = document.getElementById('attachImageBtn');
    this.voiceRecordBtn = document.getElementById('voiceRecordBtn');
    this.sendBtn = document.getElementById('sendBtn');

    // Dedicated Composer Image Toolbar
    this.composerGenImageBtn = document.getElementById('composerGenImageBtn');
    this.composerImageToolbar = document.getElementById('composerImageToolbar');
    this.composerImageStyle = document.getElementById('composerImageStyle');
    this.composerImageAspect = document.getElementById('composerImageAspect');
    this.composerImageFormat = document.getElementById('composerImageFormat');
    this.composerRandomPromptBtn = document.getElementById('composerRandomPromptBtn');
    this.composerExitImageBtn = document.getElementById('composerExitImageBtn');

    // Top Nav & Extra Controls
    this.navNewChatBtn = document.getElementById('navNewChatBtn');
    this.editNavTitleBtn = document.getElementById('editNavTitleBtn');
    this.shortcutsBtn = document.getElementById('shortcutsBtn');
    this.shortcutsModal = document.getElementById('shortcutsModal');
    this.closeShortcutsBtn = document.getElementById('closeShortcutsBtn');

    // Viewport Enhancements
    this.scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
    this.dragDropOverlay = document.getElementById('dragDropOverlay');
    this.welcomeCategoryTabs = document.getElementById('welcomeCategoryTabs');
    this.welcomeCardsGrid = document.getElementById('welcomeCardsGrid');
    this.dragCounter = 0;

    // Settings Modal
    this.settingsModal = document.getElementById('settingsModal');
    this.openSettingsBtn = document.getElementById('openSettingsBtn');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    this.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    this.groqApiKeyInput = document.getElementById('groqApiKeyInput');
    this.toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibilityBtn');
    this.keyStatusBanner = document.getElementById('keyStatusBanner');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusLabel = document.getElementById('statusLabel');

    // Audio Floating Banner
    this.recordingBanner = document.getElementById('recordingBanner');
    this.recordingTimer = document.getElementById('recordingTimer');
    this.stopRecordingBtn = document.getElementById('stopRecordingBtn');
    this.cancelRecordingBtn = document.getElementById('cancelRecordingBtn');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');

    // Image Studio Elements
    this.openImageStudioBtn = document.getElementById('openImageStudioBtn');
    this.imageStudioModal = document.getElementById('imageStudioModal');
    this.closeImageStudioBtn = document.getElementById('closeImageStudioBtn');
    this.closeStudioFooterBtn = document.getElementById('closeStudioFooterBtn');
    this.imageStudioPromptInput = document.getElementById('imageStudioPromptInput');
    this.studioRandomPromptBtn = document.getElementById('studioRandomPromptBtn');
    this.studioEnhancePromptBtn = document.getElementById('studioEnhancePromptBtn');
    this.imageStylePills = document.getElementById('imageStylePills');
    this.imageAspectPills = document.getElementById('imageAspectPills');
    this.imageFormatPills = document.getElementById('imageFormatPills');
    this.generateStudioImgBtn = document.getElementById('generateStudioImgBtn');
    this.studioCanvasContainer = document.getElementById('studioCanvasContainer');
    this.studioEmptyState = document.getElementById('studioEmptyState');
    this.studioImgWrapper = document.getElementById('studioImgWrapper');
    this.studioPreviewImg = document.getElementById('studioPreviewImg');
    this.studioZoomCanvasBtn = document.getElementById('studioZoomCanvasBtn');
    this.studioImgLoadingOverlay = document.getElementById('studioImgLoadingOverlay');
    this.studioLoadingStep = document.getElementById('studioLoadingStep');
    this.studioMetaActionBar = document.getElementById('studioMetaActionBar');
    this.studioMetaStyle = document.getElementById('studioMetaStyle');
    this.studioMetaAspect = document.getElementById('studioMetaAspect');
    this.studioMetaFormat = document.getElementById('studioMetaFormat');
    this.studioMetaDimensions = document.getElementById('studioMetaDimensions');
    this.insertStudioImgBtn = document.getElementById('insertStudioImgBtn');
    this.downloadStudioImgBtn = document.getElementById('downloadStudioImgBtn');
    this.regenStudioImgBtn = document.getElementById('regenStudioImgBtn');
    this.studioHistoryFilmstrip = document.getElementById('studioHistoryFilmstrip');
    this.studioGalleryCount = document.getElementById('studioGalleryCount');

    // Full-Screen Image Lightbox Elements
    this.imageLightboxModal = document.getElementById('imageLightboxModal');
    this.lightboxBackdrop = document.getElementById('lightboxBackdrop');
    this.lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
    this.lightboxTitle = document.getElementById('lightboxTitle');
    this.lbMetaStyle = document.getElementById('lbMetaStyle');
    this.lbMetaFormat = document.getElementById('lbMetaFormat');
    this.lbMetaDimensions = document.getElementById('lbMetaDimensions');
    this.lightboxImg = document.getElementById('lightboxImg');
    this.lightboxImgWrapper = document.getElementById('lightboxImgWrapper');
    this.lightboxViewport = document.getElementById('lightboxViewport');
    this.lightboxCopyPromptBtn = document.getElementById('lightboxCopyPromptBtn');
    this.lightboxRemixBtn = document.getElementById('lightboxRemixBtn');
    this.lightboxZoomInBtn = document.getElementById('lightboxZoomInBtn');
    this.lightboxZoomOutBtn = document.getElementById('lightboxZoomOutBtn');
    this.lightboxZoomResetBtn = document.getElementById('lightboxZoomResetBtn');
    this.lightboxZoomText = document.getElementById('lightboxZoomText');
    this.lightboxDlPngBtn = document.getElementById('lightboxDlPngBtn');
    this.lightboxDlJpgBtn = document.getElementById('lightboxDlJpgBtn');
    this.lightboxDlWebpBtn = document.getElementById('lightboxDlWebpBtn');
    this.lightboxDlDefaultBtn = document.getElementById('lightboxDlDefaultBtn');
  }

  initEvents() {
    // Sidebar toggles
    this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
    if (this.closeSidebarBtn) {
      this.closeSidebarBtn.addEventListener('click', () => this.toggleSidebar(false));
    }
    this.sidebarOverlay.addEventListener('click', () => this.toggleSidebar(false));
    this.newChatBtn.addEventListener('click', () => this.startNewConversation());

    // Search
    this.chatSearchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.clearSearchBtn.addEventListener('click', () => {
      this.chatSearchInput.value = '';
      this.clearSearchBtn.classList.add('hidden');
      this.loadConversations();
    });

    // Clear all history
    this.clearAllChatsBtn.addEventListener('click', () => this.clearAllHistory());

    // Header actions
    this.exportChatBtn.addEventListener('click', () => this.exportCurrentChat());

    // Effort Pill Clicks
    this.effortPills.querySelectorAll('.effort-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        this.setEffortLevel(pill.dataset.level);
      });
    });

    // Textarea Auto-expand & Enter Key
    this.promptInput.addEventListener('input', () => this.autoExpandTextarea());
    this.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send Button
    this.sendBtn.addEventListener('click', () => this.sendMessage());

    // File Uploads
    this.attachFileBtn.addEventListener('click', () => this.fileInput.click());
    this.attachImageBtn.addEventListener('click', () => this.imageInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFilesUpload(e.target.files));
    this.imageInput.addEventListener('change', (e) => this.handleFilesUpload(e.target.files));

    // Full-Window Drag & Drop Overlay
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.dragCounter++;
      if (this.dragDropOverlay) this.dragDropOverlay.classList.remove('hidden');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dragCounter--;
      if (this.dragCounter <= 0 && this.dragDropOverlay) {
        this.dragCounter = 0;
        this.dragDropOverlay.classList.add('hidden');
      }
    });

    window.addEventListener('dragover', (e) => e.preventDefault());

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dragCounter = 0;
      if (this.dragDropOverlay) this.dragDropOverlay.classList.add('hidden');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleFilesUpload(e.dataTransfer.files);
      }
    });

    // Voice Recording
    this.voiceRecordBtn.addEventListener('click', () => this.toggleVoiceRecording());
    this.stopRecordingBtn.addEventListener('click', () => this.stopVoiceRecording(true));
    this.cancelRecordingBtn.addEventListener('click', () => this.stopVoiceRecording(false));

    // Quoted text dismissal
    this.dismissQuoteBtn.addEventListener('click', () => this.clearQuotedSelection());

    // Text selection monitoring for "Ask GYAN about this"
    document.addEventListener('selectionchange', () => this.handleTextSelection());
    this.querySelectionBtn.addEventListener('click', () => this.applyQuotedSelection('query'));
    this.explainSelectionBtn.addEventListener('click', () => this.applyQuotedSelection('explain'));

    // Top Nav actions
    if (this.navNewChatBtn) {
      this.navNewChatBtn.addEventListener('click', () => this.startNewConversation());
    }
    if (this.currentChatTitle) {
      this.currentChatTitle.addEventListener('click', () => this.promptRenameActiveConversation());
    }
    if (this.editNavTitleBtn) {
      this.editNavTitleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.promptRenameActiveConversation();
      });
    }
    if (this.shortcutsBtn) {
      this.shortcutsBtn.addEventListener('click', () => this.openShortcutsModal());
    }
    if (this.closeShortcutsBtn) {
      this.closeShortcutsBtn.addEventListener('click', () => this.closeShortcutsModal());
    }
    if (this.shortcutsModal) {
      this.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === this.shortcutsModal) this.closeShortcutsModal();
      });
    }

    // Floating Scroll to Bottom
    if (this.scrollToBottomBtn) {
      this.scrollToBottomBtn.addEventListener('click', () => this.scrollToBottom(true));
    }
    if (this.chatViewport) {
      this.chatViewport.addEventListener('scroll', () => this.handleViewportScroll());
    }

    // Settings Modal
    this.openSettingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
    this.toggleKeyVisibilityBtn.addEventListener('click', () => this.toggleApiKeyVisibility());

    // Welcome Category Tabs Filtering
    if (this.welcomeCategoryTabs) {
      this.welcomeCategoryTabs.querySelectorAll('.wcat-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          this.welcomeCategoryTabs.querySelectorAll('.wcat-tab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          const targetCat = tab.dataset.cat;
          document.querySelectorAll('#welcomeCardsGrid .wvp-card').forEach((card) => {
            if (targetCat === 'all' || card.dataset.category === targetCat) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });
    }

    // Welcome Screen Discovery Sparks Clicks
    document.querySelectorAll('.wvp-card').forEach((card) => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt;
        const isArt = card.classList.contains('is-art-card') || card.dataset.category === 'art';
        this.promptInput.value = prompt;
        if (isArt) {
          const style = card.dataset.style || 'photorealistic';
          if (!this.isImageMode) {
            this.toggleComposerImageMode(true);
          }
          if (this.composerImageStyle) {
            this.composerImageStyle.value = style;
          }
        } else {
          if (this.isImageMode) {
            this.toggleComposerImageMode(false);
          }
        }
        this.autoExpandTextarea();
        this.promptInput.focus();
      });
    });

    // Composer Image Toolbar Events
    if (this.composerGenImageBtn) {
      this.composerGenImageBtn.addEventListener('click', () => this.toggleComposerImageMode());
    }
    if (this.composerExitImageBtn) {
      this.composerExitImageBtn.addEventListener('click', () => this.toggleComposerImageMode(false));
    }
    if (this.composerRandomPromptBtn) {
      this.composerRandomPromptBtn.addEventListener('click', () => this.applyRandomComposerPrompt());
    }

    // Image Studio Modal Events
    if (this.openImageStudioBtn) {
      this.openImageStudioBtn.addEventListener('click', () => this.openImageStudio());
    }
    if (this.closeImageStudioBtn) {
      this.closeImageStudioBtn.addEventListener('click', () => this.closeImageStudio());
    }
    if (this.closeStudioFooterBtn) {
      this.closeStudioFooterBtn.addEventListener('click', () => this.closeImageStudio());
    }
    if (this.imageStudioModal) {
      this.imageStudioModal.addEventListener('click', (e) => {
        if (e.target === this.imageStudioModal) {
          this.closeImageStudio();
        }
      });
    }

    if (this.generateStudioImgBtn) {
      this.generateStudioImgBtn.addEventListener('click', () => this.generateStudioImage());
    }
    if (this.insertStudioImgBtn) {
      this.insertStudioImgBtn.addEventListener('click', () => this.insertStudioImageIntoChat());
    }
    if (this.downloadStudioImgBtn) {
      this.downloadStudioImgBtn.addEventListener('click', () => this.downloadStudioImage(this.studioSelectedFormat));
    }
    if (this.regenStudioImgBtn) {
      this.regenStudioImgBtn.addEventListener('click', () => this.generateStudioImage(true));
    }
    if (this.studioZoomCanvasBtn) {
      this.studioZoomCanvasBtn.addEventListener('click', () => {
        if (this.lastGeneratedStudioData) {
          this.openLightbox(this.lastGeneratedStudioData);
        }
      });
    }

    // Studio Multi-Format Download Menu
    document.querySelectorAll('.download-format-menu .dl-fmt-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fmt = btn.dataset.fmt;
        this.downloadStudioImage(fmt);
      });
    });

    // Studio Quick Tools ("Surprise Me" & "Enhance Prompt")
    if (this.studioRandomPromptBtn) {
      this.studioRandomPromptBtn.addEventListener('click', () => this.applyRandomStudioPrompt());
    }
    if (this.studioEnhancePromptBtn) {
      this.studioEnhancePromptBtn.addEventListener('click', () => this.enhanceStudioPrompt());
    }

    // Inspiration Chips in Studio
    document.querySelectorAll('.preset-chips .preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (this.imageStudioPromptInput) {
          this.imageStudioPromptInput.value = chip.dataset.prompt;
          const targetStyle = chip.dataset.style;
          if (targetStyle) {
            this.selectStudioStyle(targetStyle);
          }
          this.imageStudioPromptInput.focus();
        }
      });
    });

    // Visual Style Cards in Studio
    if (this.imageStylePills) {
      this.imageStylePills.querySelectorAll('.studio-style-card').forEach((card) => {
        card.addEventListener('click', () => {
          this.selectStudioStyle(card.dataset.style);
        });
      });
    }

    // Aspect Ratio Options in Studio
    if (this.imageAspectPills) {
      this.imageAspectPills.querySelectorAll('.aspect-option').forEach((option) => {
        option.addEventListener('click', () => {
          this.imageAspectPills.querySelectorAll('.aspect-option').forEach((o) => o.classList.remove('active'));
          option.classList.add('active');
          this.studioSelectedAspect = option.dataset.aspect;
        });
      });
    }

    // Format Options in Studio
    if (this.imageFormatPills) {
      this.imageFormatPills.querySelectorAll('.format-option').forEach((option) => {
        option.addEventListener('click', () => {
          this.imageFormatPills.querySelectorAll('.format-option').forEach((o) => o.classList.remove('active'));
          option.classList.add('active');
          this.studioSelectedFormat = option.dataset.format || 'png';
        });
      });
    }

    // Full-Screen Image Lightbox Events
    if (this.lightboxCloseBtn) {
      this.lightboxCloseBtn.addEventListener('click', () => this.closeLightbox());
    }
    if (this.lightboxBackdrop) {
      this.lightboxBackdrop.addEventListener('click', () => this.closeLightbox());
    }
    if (this.lightboxZoomInBtn) {
      this.lightboxZoomInBtn.addEventListener('click', () => this.zoomLightbox(0.25));
    }
    if (this.lightboxZoomOutBtn) {
      this.lightboxZoomOutBtn.addEventListener('click', () => this.zoomLightbox(-0.25));
    }
    if (this.lightboxZoomResetBtn) {
      this.lightboxZoomResetBtn.addEventListener('click', () => this.resetLightboxZoom());
    }
    if (this.lightboxViewport) {
      this.lightboxViewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        this.zoomLightbox(delta);
      }, { passive: false });
    }
    if (this.lightboxCopyPromptBtn) {
      this.lightboxCopyPromptBtn.addEventListener('click', () => {
        if (this.currentLightboxData && this.currentLightboxData.prompt) {
          this.copyToClipboard(this.currentLightboxData.prompt, 'Prompt copied to clipboard!');
        }
      });
    }
    if (this.lightboxRemixBtn) {
      this.lightboxRemixBtn.addEventListener('click', () => {
        if (this.currentLightboxData) {
          const d = this.currentLightboxData;
          this.closeLightbox();
          this.openImageStudio();
          if (this.imageStudioPromptInput) {
            this.imageStudioPromptInput.value = d.prompt || '';
          }
          if (d.style) {
            this.selectStudioStyle(d.style);
          }
        }
      });
    }
    if (this.lightboxDlPngBtn) {
      this.lightboxDlPngBtn.addEventListener('click', () => this.downloadLightboxImage('png'));
    }
    if (this.lightboxDlJpgBtn) {
      this.lightboxDlJpgBtn.addEventListener('click', () => this.downloadLightboxImage('jpg'));
    }
    if (this.lightboxDlWebpBtn) {
      this.lightboxDlWebpBtn.addEventListener('click', () => this.downloadLightboxImage('webp'));
    }
    if (this.lightboxDlDefaultBtn) {
      this.lightboxDlDefaultBtn.addEventListener('click', () => this.downloadLightboxImage());
    }

    // Global Keyboard Listeners
    document.addEventListener('keydown', (e) => {
      // Escape key to dismiss modals
      if (e.key === 'Escape') {
        if (this.imageLightboxModal && !this.imageLightboxModal.classList.contains('hidden')) {
          this.closeLightbox();
        } else if (this.imageStudioModal && !this.imageStudioModal.classList.contains('hidden')) {
          this.closeImageStudio();
        } else if (this.shortcutsModal && !this.shortcutsModal.classList.contains('hidden')) {
          this.closeShortcutsModal();
        } else if (this.settingsModal && !this.settingsModal.classList.contains('hidden')) {
          this.closeSettings();
        }
      }

      // Ctrl+K to focus conversation search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (this.chatSearchInput) {
          if (window.innerWidth <= 900) this.toggleSidebar(true);
          this.chatSearchInput.focus();
          this.chatSearchInput.select();
        }
      }

      // Ctrl+Shift+O to start new conversation
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.startNewConversation();
      }

      // Ctrl+B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }

      // Ctrl+I to open AI Image Studio
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        this.openImageStudio();
      }

      // '?' key to open keyboard shortcuts cheatsheet (when not focused on input)
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.openShortcutsModal();
      }

      // Lightbox zoom shortcuts
      if (this.imageLightboxModal && !this.imageLightboxModal.classList.contains('hidden')) {
        if (e.key === '+' || e.key === '=') {
          this.zoomLightbox(0.25);
        } else if (e.key === '-' || e.key === '_') {
          this.zoomLightbox(-0.25);
        } else if (e.key === '0') {
          this.resetLightboxZoom();
        }
      }
    });
  }

  setupMarkdown() {
    marked.setOptions({
      highlight: (code, lang) => {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
      breaks: true,
      gfm: true
    });
  }

  // --- API KEY STATUS & SETTINGS ---

  async checkApiStatus() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.has_api_key) {
        this.statusIndicator.className = 'status-indicator ready';
        this.statusLabel.textContent = 'Groq Connected';
      } else {
        this.statusIndicator.className = 'status-indicator missing';
        this.statusLabel.textContent = 'Configure API Key';
        this.showToast('Please configure your Groq API Key to chat with GYAN.', 'error');
      }
    } catch (e) {
      this.statusIndicator.className = 'status-indicator missing';
      this.statusLabel.textContent = 'Offline';
    }
  }

  openSettings() {
    this.keyStatusBanner.classList.add('hidden');
    this.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    this.settingsModal.classList.add('hidden');
  }

  toggleApiKeyVisibility() {
    const isPassword = this.groqApiKeyInput.type === 'password';
    this.groqApiKeyInput.type = isPassword ? 'text' : 'password';
    const icon = this.toggleKeyVisibilityBtn.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
      lucide.createIcons();
    }
  }

  async saveApiKey() {
    const key = this.groqApiKeyInput.value.trim();
    if (!key) {
      this.showKeyBanner('API key cannot be empty.', 'error');
      return;
    }

    this.saveApiKeyBtn.disabled = true;
    this.saveApiKeyBtn.textContent = 'Saving...';

    try {
      const res = await fetch('/api/config/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key })
      });
      const data = await res.json();

      if (res.ok) {
        this.showKeyBanner('API Key saved successfully! Ready to chat.', 'success');
        this.statusIndicator.className = 'status-indicator ready';
        this.statusLabel.textContent = 'Groq Connected';
        this.showToast('Groq API Key saved!', 'success');
        setTimeout(() => this.closeSettings(), 1200);
      } else {
        this.showKeyBanner(data.error || 'Failed to save key.', 'error');
      }
    } catch (e) {
      this.showKeyBanner('Network error saving key.', 'error');
    } finally {
      this.saveApiKeyBtn.disabled = false;
      this.saveApiKeyBtn.textContent = 'Save & Apply Key';
    }
  }

  showKeyBanner(msg, type) {
    this.keyStatusBanner.className = `key-status-banner ${type}`;
    this.keyStatusBanner.textContent = msg;
    this.keyStatusBanner.classList.remove('hidden');
  }

  // --- EFFORT LEVEL MANAGEMENT ---

  setEffortLevel(level) {
    this.effortLevel = level;

    // Update Pills
    this.effortPills.querySelectorAll('.effort-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.level === level);
    });

    // Update Meta and badge
    const badgeTextMap = {
      low: 'Low Effort',
      medium: 'Medium Effort',
      high: 'High Effort (CoT)',
      extreme: 'Extreme (Verified)'
    };

    const modelMap = {
      low: 'Instant / Fast',
      medium: 'Balanced Depth',
      high: 'Deep Reasoning',
      extreme: 'Dual-Pass Verification'
    };

    if (this.badgeEffortText) this.badgeEffortText.textContent = badgeTextMap[level] || 'Medium Effort';
    if (this.badgeModelText) this.badgeModelText.textContent = modelMap[level] || 'Balanced Depth';

    if (this.currentEffortBadge) this.currentEffortBadge.className = `effort-badge ${level}`;
    if (this.effortInfoBadge) {
      this.effortInfoBadge.textContent = `${badgeTextMap[level]} • ${modelMap[level]}`;
    }
  }

  // --- CONVERSATION MANAGEMENT ---

  async loadConversations(searchQuery = '', autoRestore = false) {
    try {
      const url = searchQuery
        ? `/api/conversations?q=${encodeURIComponent(searchQuery)}`
        : '/api/conversations';
      const res = await fetch(url);
      const data = await res.json();
      this.conversations = data.conversations || [];
      this.renderConversationList();
      this.historyCount.textContent = this.conversations.length;

      // Auto-restore active conversation if one exists
      if (autoRestore && this.currentConversationId) {
        const found = this.conversations.find((c) => c.id === this.currentConversationId);
        if (found) {
          await this.refreshConversationMessages(this.currentConversationId);
        } else {
          this.currentConversationId = null;
          localStorage.removeItem('gyan_active_conv_id');
        }
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }

  groupConversationsByDate(conversations) {
    const groups = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: []
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const startOfYesterday = startOfToday - oneDayMs;
    const startOf7Days = startOfToday - (7 * oneDayMs);

    conversations.forEach((conv) => {
      let dateVal = conv.updated_at || conv.created_at;
      let timestamp = dateVal ? new Date(typeof dateVal === 'string' ? dateVal.replace(' ', 'T') : dateVal).getTime() : Date.now();
      if (isNaN(timestamp)) timestamp = Date.now();

      if (timestamp >= startOfToday) {
        groups['Today'].push(conv);
      } else if (timestamp >= startOfYesterday) {
        groups['Yesterday'].push(conv);
      } else if (timestamp >= startOf7Days) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });

    return groups;
  }

  renderConversationList() {
    this.conversationList.innerHTML = '';

    if (this.conversations.length === 0) {
      this.conversationList.innerHTML = `
        <div class="empty-history-state">
          <i data-lucide="message-square-dashed"></i>
          <p>No conversations found</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    const groups = this.groupConversationsByDate(this.conversations);

    Object.entries(groups).forEach(([groupName, convList]) => {
      if (!convList || convList.length === 0) return;

      const groupContainer = document.createElement('div');
      groupContainer.className = 'conv-date-group';

      const header = document.createElement('div');
      header.className = 'conv-date-group-header';
      header.textContent = groupName;
      groupContainer.appendChild(header);

      convList.forEach((conv) => {
        const item = document.createElement('div');
        item.className = `conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}`;
        item.innerHTML = `
          <div class="conv-item-content">
            <i data-lucide="message-square" class="conv-item-icon"></i>
            <span class="conv-item-title" title="${this.escapeHtml(conv.title)}">${this.escapeHtml(conv.title)}</span>
          </div>
          <div class="conv-actions">
            <button class="conv-action-btn edit-title-btn" title="Rename conversation">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="conv-action-btn delete-btn" title="Delete conversation">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `;

        item.querySelector('.conv-item-content').addEventListener('click', () => {
          this.switchConversation(conv.id);
        });

        item.querySelector('.edit-title-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.promptRenameConversation(conv.id, conv.title);
        });

        item.querySelector('.delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteConversation(conv.id);
        });

        groupContainer.appendChild(item);
      });

      this.conversationList.appendChild(groupContainer);
    });

    lucide.createIcons();
  }

  async switchConversation(convId) {
    if (this.currentConversationId === convId) {
      if (window.innerWidth <= 900) {
        this.toggleSidebar(false);
      }
      return;
    }
    this.currentConversationId = convId;
    localStorage.setItem('gyan_active_conv_id', convId);
    if (window.innerWidth <= 900) {
      this.toggleSidebar(false);
    }

    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (!res.ok) throw new Error('Conversation not found');
      const data = await res.json();

      if (this.currentChatTitle) this.currentChatTitle.textContent = data.conversation.title || 'Conversation';
      this.setEffortLevel(data.conversation.effort_level || 'medium');

      this.renderMessages(data.messages || []);
      this.renderConversationList();
    } catch (e) {
      this.showToast('Failed to load conversation messages.', 'error');
    }
  }

  startNewConversation() {
    this.currentConversationId = null;
    localStorage.removeItem('gyan_active_conv_id');
    if (this.currentChatTitle) this.currentChatTitle.textContent = '';
    this.messagesContainer.innerHTML = '';
    this.welcomeScreen.classList.remove('hidden');
    this.clearQuotedSelection();
    this.clearAttachments();
    this.promptInput.value = '';
    this.autoExpandTextarea();
    this.renderConversationList();
    if (window.innerWidth <= 900) {
      this.toggleSidebar(false);
    }
    this.promptInput.focus();
  }

  async promptRenameConversation(convId, oldTitle) {
    const newTitle = prompt('Enter new conversation title:', oldTitle);
    if (!newTitle || newTitle.trim() === '' || newTitle === oldTitle) return;

    try {
      const res = await fetch(`/api/conversations/${convId}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (res.ok) {
        if (this.currentChatTitle && this.currentConversationId === convId) {
          this.currentChatTitle.textContent = newTitle.trim();
        }
        this.loadConversations();
        this.showToast('Conversation renamed.', 'success');
      }
    } catch (e) {
      this.showToast('Failed to rename conversation.', 'error');
    }
  }

  promptRenameActiveConversation() {
    if (!this.currentConversationId) {
      this.showToast('Send a message first to name this conversation.', 'info');
      return;
    }
    const currentTitle = this.currentChatTitle ? this.currentChatTitle.textContent : 'Conversation';
    this.promptRenameConversation(this.currentConversationId, currentTitle);
  }

  async deleteConversation(convId) {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
      if (res.ok) {
        if (this.currentConversationId === convId) {
          this.startNewConversation();
        }
        this.loadConversations();
        this.showToast('Conversation deleted.', 'success');
      }
    } catch (e) {
      this.showToast('Failed to delete conversation.', 'error');
    }
  }

  async clearAllHistory() {
    if (!confirm('Are you sure you want to delete all previous conversations? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/conversations', { method: 'DELETE' });
      if (res.ok) {
        this.startNewConversation();
        this.loadConversations();
        this.showToast('All conversations cleared.', 'success');
      }
    } catch (e) {
      this.showToast('Failed to clear conversations.', 'error');
    }
  }

  handleSearch(query) {
    if (query.trim()) {
      this.clearSearchBtn.classList.remove('hidden');
      this.loadConversations(query.trim());
    } else {
      this.clearSearchBtn.classList.add('hidden');
      this.loadConversations();
    }
  }

  // --- MESSAGE RENDERING ---

  renderMessages(messages) {
    this.messagesContainer.innerHTML = '';
    if (!messages || messages.length === 0) {
      this.welcomeScreen.classList.remove('hidden');
      return;
    }

    this.welcomeScreen.classList.add('hidden');
    messages.forEach((msg) => {
      this.appendMessageElement(msg, false);
    });

    this.scrollToBottom();
  }

  appendMessageElement(msg, shouldScroll = true) {
    this.welcomeScreen.classList.add('hidden');

    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;
    row.id = `msg-${msg.id}`;

    if (msg.role === 'user') {
      row.innerHTML = `
        <div class="message-avatar" title="You">
          <i data-lucide="user"></i>
        </div>
        <div class="message-content-wrapper">
          <div class="message-bubble">
            ${this.renderMessageAttachments(msg.attachments)}
            <div class="user-text-content">${this.escapeHtml(msg.content)}</div>
          </div>
          <div class="message-actions">
            <button class="action-mini-btn edit-msg-btn" title="Edit prompt and regenerate">
              <i data-lucide="edit-2"></i> Edit
            </button>
            <button class="action-mini-btn copy-msg-btn" title="Copy prompt">
              <i data-lucide="copy"></i> Copy
            </button>
          </div>
        </div>
      `;

      // Hook edit prompt
      row.querySelector('.edit-msg-btn').addEventListener('click', () => {
        this.showInlineEditPrompt(msg);
      });

      // Hook copy prompt
      row.querySelector('.copy-msg-btn').addEventListener('click', () => {
        this.copyToClipboard(msg.content, 'Prompt copied to clipboard!');
      });

    } else {
      // Assistant message
      const thinkingHtml = msg.thinking ? this.renderThinkingBox(msg.thinking) : '';
      const imageCardInfo = this.extractImageCardInfo(msg.content, msg.thinking);

      if (imageCardInfo) {
        // Record artwork into local session history
        this.addArtworkToHistory({
          url: imageCardInfo.imageUrl,
          downloadUrl: imageCardInfo.downloadUrl,
          filename: imageCardInfo.filename,
          prompt: imageCardInfo.prompt,
          style: imageCardInfo.style,
          format: imageCardInfo.format,
          dimensions: imageCardInfo.dimensions
        });

        const cardHtml = `
          <div class="ai-art-card" data-img-url="${imageCardInfo.imageUrl}">
            <div class="ai-art-card-header">
              <span class="ai-art-engine-badge"><i data-lucide="palette"></i> FLUX Vision Synthesis</span>
              <div class="ai-art-meta-tags">
                <span class="ai-art-tag">${this.escapeHtml(imageCardInfo.style)}</span>
                <span class="ai-art-tag">${this.escapeHtml(imageCardInfo.format)}</span>
                <span class="ai-art-tag">${this.escapeHtml(imageCardInfo.dimensions)}</span>
              </div>
            </div>
            <div class="ai-art-media-wrap" title="Click to inspect in Fullscreen Lightbox">
              <img src="${imageCardInfo.imageUrl}" class="ai-art-card-img" alt="${this.escapeHtml(imageCardInfo.prompt)}" />
              <div class="ai-art-overlay">
                <div class="ai-art-overlay-tools">
                  <button type="button" class="ai-art-overlay-btn art-zoom-btn" title="Fullscreen Lightbox">
                    <i data-lucide="maximize-2"></i> Inspect
                  </button>
                  <button type="button" class="ai-art-overlay-btn art-copy-prompt-btn" title="Copy Prompt">
                    <i data-lucide="copy"></i> Copy Prompt
                  </button>
                </div>
                <div class="ai-art-overlay-tools">
                  <button type="button" class="ai-art-overlay-btn art-remix-btn" title="Remix in Studio">
                    <i data-lucide="sliders-horizontal"></i> Remix
                  </button>
                </div>
              </div>
            </div>
            <div class="ai-art-footer">
              <div class="ai-art-prompt-text">"${this.escapeHtml(imageCardInfo.prompt)}"</div>
              <div class="ai-art-footer-actions">
                <div class="ai-art-dl-group">
                  <button type="button" class="ai-art-dl-pill dl-png-pill" title="Download lossless PNG">
                    <i data-lucide="download"></i> PNG
                  </button>
                  <button type="button" class="ai-art-dl-pill dl-jpg-pill" title="Download high-res JPG">
                    <i data-lucide="download"></i> JPG
                  </button>
                  <button type="button" class="ai-art-dl-pill dl-webp-pill" title="Download optimized WEBP">
                    <i data-lucide="download"></i> WEBP
                  </button>
                </div>
                <button type="button" class="ai-art-variation-btn" title="Generate another variation with new seed">
                  <i data-lucide="refresh-cw"></i> Variation
                </button>
              </div>
            </div>
          </div>
        `;

        row.innerHTML = `
          <div class="message-avatar" title="GYAN Vision">
            <img src="/static/img/logo.svg" alt="GYAN" />
          </div>
          <div class="message-content-wrapper">
            <div class="message-bubble assistant-bubble" data-msg-id="${msg.id}">
              ${thinkingHtml}
              ${cardHtml}
            </div>
            <div class="message-actions">
              <button class="action-mini-btn copy-msg-btn" title="Copy prompt">
                <i data-lucide="copy"></i> <span>Copy Prompt</span>
              </button>
              <button class="action-mini-btn art-lb-open-btn" title="Fullscreen Lightbox">
                <i data-lucide="maximize-2"></i> <span>Lightbox</span>
              </button>
              <button class="action-mini-btn rating-btn thumb-up-btn" title="Helpful artwork">
                <i data-lucide="thumbs-up"></i>
              </button>
              <button class="action-mini-btn rating-btn thumb-down-btn" title="Unhelpful artwork">
                <i data-lucide="thumbs-down"></i>
              </button>
              <span class="action-mini-btn model-tag" title="Engine">
                <i data-lucide="sparkles"></i> FLUX Vision
              </span>
            </div>
          </div>
        `;

        // Wire interactive art card events
        const mediaWrap = row.querySelector('.ai-art-media-wrap');
        const zoomBtn = row.querySelector('.art-zoom-btn');
        const lbActionBtn = row.querySelector('.art-lb-open-btn');
        const openLb = () => this.openLightbox(imageCardInfo);

        if (mediaWrap) mediaWrap.addEventListener('click', (e) => {
          if (!e.target.closest('.ai-art-overlay-btn')) openLb();
        });
        if (zoomBtn) zoomBtn.addEventListener('click', (e) => { e.stopPropagation(); openLb(); });
        if (lbActionBtn) lbActionBtn.addEventListener('click', () => openLb());

        const copyPromptBtn = row.querySelector('.art-copy-prompt-btn');
        if (copyPromptBtn) copyPromptBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.copyToClipboard(imageCardInfo.prompt, 'Prompt copied to clipboard!');
        });

        const remixBtn = row.querySelector('.art-remix-btn');
        if (remixBtn) remixBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openImageStudio();
          if (this.imageStudioPromptInput) this.imageStudioPromptInput.value = imageCardInfo.prompt;
          if (imageCardInfo.style) this.selectStudioStyle(imageCardInfo.style);
        });

        const dlPng = row.querySelector('.dl-png-pill');
        const dlJpg = row.querySelector('.dl-jpg-pill');
        const dlWebp = row.querySelector('.dl-webp-pill');
        if (dlPng) dlPng.addEventListener('click', () => this.downloadSpecificImage(imageCardInfo, 'png'));
        if (dlJpg) dlJpg.addEventListener('click', () => this.downloadSpecificImage(imageCardInfo, 'jpg'));
        if (dlWebp) dlWebp.addEventListener('click', () => this.downloadSpecificImage(imageCardInfo, 'webp'));

        const variationBtn = row.querySelector('.ai-art-variation-btn');
        if (variationBtn) variationBtn.addEventListener('click', () => {
          this.requestVariationFromChat(imageCardInfo);
        });

        // Copy button in action bar
        const barCopyBtn = row.querySelector('.copy-msg-btn');
        barCopyBtn.addEventListener('click', () => {
          this.copyToClipboard(imageCardInfo.prompt, 'Prompt copied to clipboard!');
          barCopyBtn.classList.add('copied');
          barCopyBtn.innerHTML = '<i data-lucide="check"></i> <span>Copied</span>';
          lucide.createIcons();
          setTimeout(() => {
            barCopyBtn.classList.remove('copied');
            barCopyBtn.innerHTML = '<i data-lucide="copy"></i> <span>Copy Prompt</span>';
            lucide.createIcons();
          }, 1800);
        });

        // Ratings on art cards
        const artUp = row.querySelector('.thumb-up-btn');
        const artDown = row.querySelector('.thumb-down-btn');
        artUp.addEventListener('click', () => {
          const isUp = artUp.classList.contains('active-up');
          artUp.classList.toggle('active-up', !isUp);
          artDown.classList.remove('active-down');
        });
        artDown.addEventListener('click', () => {
          const isDown = artDown.classList.contains('active-down');
          artDown.classList.toggle('active-down', !isDown);
          artUp.classList.remove('active-up');
        });

      } else {
        // Standard text/markdown assistant message
        const parsedContent = this.parseMarkdown(msg.content);

        row.innerHTML = `
          <div class="message-avatar" title="GYAN Intelligence">
            <img src="/static/img/logo.svg" alt="GYAN" />
          </div>
          <div class="message-content-wrapper">
            <div class="message-bubble assistant-bubble" data-msg-id="${msg.id}">
              ${thinkingHtml}
              <div class="markdown-body">${parsedContent}</div>
            </div>
            <div class="message-actions">
              <button class="action-mini-btn copy-msg-btn" title="Copy response">
                <i data-lucide="copy"></i> <span>Copy</span>
              </button>
              <button class="action-mini-btn speak-msg-btn" title="Read response aloud">
                <i data-lucide="volume-2"></i> <span>Read</span>
              </button>
              <button class="action-mini-btn rating-btn thumb-up-btn" title="Helpful response">
                <i data-lucide="thumbs-up"></i>
              </button>
              <button class="action-mini-btn rating-btn thumb-down-btn" title="Unhelpful response">
                <i data-lucide="thumbs-down"></i>
              </button>
              <button class="action-mini-btn regenerate-msg-btn" title="Regenerate response">
                <i data-lucide="rotate-cw"></i> <span>Regenerate</span>
              </button>
              <span class="action-mini-btn model-tag" title="Effort level">
                <i data-lucide="sparkles"></i> ${this.escapeHtml(msg.effort_level || 'medium')}
              </span>
            </div>
          </div>
        `;

        // Hook copy response with instant checkmark feedback
        const copyBtn = row.querySelector('.copy-msg-btn');
        copyBtn.addEventListener('click', () => {
          this.copyToClipboard(msg.content, 'Response copied to clipboard!');
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = '<i data-lucide="check"></i> <span>Copied</span>';
          lucide.createIcons();
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i data-lucide="copy"></i> <span>Copy</span>';
            lucide.createIcons();
          }, 1800);
        });

        // Hook ratings
        const upBtn = row.querySelector('.thumb-up-btn');
        const downBtn = row.querySelector('.thumb-down-btn');
        upBtn.addEventListener('click', () => {
          const isSelected = upBtn.classList.contains('active-up');
          upBtn.classList.toggle('active-up', !isSelected);
          downBtn.classList.remove('active-down');
        });
        downBtn.addEventListener('click', () => {
          const isSelected = downBtn.classList.contains('active-down');
          downBtn.classList.toggle('active-down', !isSelected);
          upBtn.classList.remove('active-up');
        });

        // Hook read aloud
        const speakBtn = row.querySelector('.speak-msg-btn');
        speakBtn.addEventListener('click', () => {
          this.toggleTextToSpeech(msg.id, msg.content, speakBtn);
        });

        // Hook regenerate response
        const regenBtn = row.querySelector('.regenerate-msg-btn');
        if (regenBtn) {
          regenBtn.addEventListener('click', () => {
            this.regenerateResponse(msg.id);
          });
        }

        // Hook code block copy buttons inside this response
        this.attachCodeBlockCopyButtons(row);
      }
    }

    this.messagesContainer.appendChild(row);
    lucide.createIcons();

    if (shouldScroll) {
      this.scrollToBottom();
    }
  }

  renderThinkingBox(thinking) {
    return `
      <details class="thinking-box">
        <summary class="thinking-summary">
          <div class="thinking-title-wrap">
            <span class="thinking-pulse"></span>
            <span>Reasoning & Verification Chain</span>
          </div>
          <i data-lucide="chevron-down"></i>
        </summary>
        <div class="thinking-body">${this.escapeHtml(thinking)}</div>
      </details>
    `;
  }

  renderMessageAttachments(attachments) {
    if (!attachments || attachments.length === 0) return '';
    let html = '<div class="message-attachments-row">';
    attachments.forEach((att) => {
      if (att.type === 'image' && att.data_uri) {
        html += `<img src="${att.data_uri}" class="msg-attachment-img" alt="${this.escapeHtml(att.filename)}" onclick="window.open('${att.data_uri}')" />`;
      } else {
        html += `
          <div class="msg-attachment-chip">
            <i data-lucide="file-text"></i>
            <span>${this.escapeHtml(att.filename)} (${att.size_formatted || ''})</span>
          </div>
        `;
      }
    });
    html += '</div>';
    return html;
  }

  parseMarkdown(content) {
    if (!content) return '';

    const mathBlocks = [];

    // Helper to register a math block and return a placeholder
    const saveMath = (formula, display) => {
      const idx = mathBlocks.length;
      const placeholder = `@@MATH_BLOCK_${idx}@@`;
      mathBlocks.push({ placeholder, formula: formula.trim(), display });
      return placeholder;
    };

    // 1. Display math blocks: $$ ... $$ and \[ ... \]
    let prepared = content.replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => saveMath(f, true));
    prepared = prepared.replace(/\\\[([\s\S]*?)\\\]/g, (m, f) => saveMath(f, true));

    // 2. Inline math blocks: $ ... $ and \( ... \)
    prepared = prepared.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (m, prefix, f) => {
      return prefix + saveMath(f, false);
    });
    prepared = prepared.replace(/\\\(([\s\S]*?)\\\)/g, (m, f) => saveMath(f, false));

    // 3. Parse standard Markdown
    let html = '';
    try {
      html = marked.parse(prepared);
    } catch (e) {
      html = this.escapeHtml(prepared);
    }

    const esc = (str) => {
      if (this && typeof this.escapeHtml === 'function') return this.escapeHtml(str);
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    // 4. Render protected math blocks via KaTeX
    mathBlocks.forEach(({ placeholder, formula, display }) => {
      let rendered = '';
      if (typeof katex !== 'undefined') {
        try {
          rendered = katex.renderToString(formula, {
            displayMode: display,
            throwOnError: false
          });
        } catch (err) {
          rendered = display
            ? `<div class="katex-display">$$${esc(formula)}$$</div>`
            : `<span class="katex-inline">$${esc(formula)}$</span>`;
        }
      } else {
        rendered = display
          ? `<div class="katex-display">$$${esc(formula)}$$</div>`
          : `<span class="katex-inline">$${esc(formula)}$</span>`;
      }
      html = html.split(placeholder).join(rendered);
    });

    return html;
  }

  attachCodeBlockCopyButtons(container) {
    container.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      const lang = (code && code.className.match(/language-(\w+)/) || [, 'code'])[1];

      // Wrap pre inside code-block-wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <span>${lang}</span>
        <button class="code-copy-btn">
          <i data-lucide="copy"></i>
          <span>Copy</span>
        </button>
      `;

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      header.querySelector('.code-copy-btn').addEventListener('click', () => {
        const textToCopy = code ? code.innerText : pre.innerText;
        this.copyToClipboard(textToCopy, 'Code copied to clipboard!');
      });
    });
  }

  // --- PROMPT EDITING & REGENERATION ---

  showInlineEditPrompt(msg) {
    const row = document.getElementById(`msg-${msg.id}`);
    if (!row) return;

    const wrapper = row.querySelector('.message-content-wrapper');
    const originalBubble = row.querySelector('.message-bubble');
    const originalActions = row.querySelector('.message-actions');

    originalBubble.classList.add('hidden');
    originalActions.classList.add('hidden');

    const editBox = document.createElement('div');
    editBox.className = 'edit-prompt-box';
    editBox.innerHTML = `
      <textarea class="edit-prompt-textarea">${this.escapeHtml(msg.content)}</textarea>
      <div class="edit-actions-row">
        <button class="btn btn-secondary cancel-edit-btn">Cancel</button>
        <button class="btn btn-primary save-edit-btn">
          <i data-lucide="refresh-cw"></i>
          <span>Save & Regenerate</span>
        </button>
      </div>
    `;

    wrapper.appendChild(editBox);
    lucide.createIcons();

    const textarea = editBox.querySelector('.edit-prompt-textarea');
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

    editBox.querySelector('.cancel-edit-btn').addEventListener('click', () => {
      editBox.remove();
      originalBubble.classList.remove('hidden');
      originalActions.classList.remove('hidden');
    });

    editBox.querySelector('.save-edit-btn').addEventListener('click', () => {
      const newPrompt = textarea.value.trim();
      if (!newPrompt) return;
      this.executeEditPrompt(msg.id, newPrompt);
    });
  }

  async executeEditPrompt(messageId, newPrompt) {
    if (!this.currentConversationId) return;

    this.isSending = true;
    this.appendTypingIndicator();

    try {
      const res = await fetch(`/api/conversations/${this.currentConversationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          new_prompt: newPrompt,
          effort_level: this.effortLevel
        })
      });

      const data = await res.json();
      this.removeTypingIndicator();

      if (!res.ok) {
        this.showToast(data.error || 'Failed to regenerate response.', 'error');
        return;
      }

      // Reload updated messages
      await this.refreshConversationMessages(this.currentConversationId);
      this.showToast('Response updated!', 'success');

    } catch (e) {
      this.removeTypingIndicator();
      this.showToast('Network error while updating prompt.', 'error');
    } finally {
      this.isSending = false;
    }
  }

  async regenerateResponse(messageId) {
    if (!this.currentConversationId || this.isSending) return;

    this.isSending = true;
    this.appendTypingIndicator();

    try {
      const res = await fetch(`/api/conversations/${this.currentConversationId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          effort_level: this.effortLevel
        })
      });

      const data = await res.json();
      this.removeTypingIndicator();

      if (!res.ok) {
        this.showToast(data.error || 'Failed to regenerate response.', 'error');
        return;
      }

      // Reload updated messages
      await this.refreshConversationMessages(this.currentConversationId);
      this.showToast('Response regenerated!', 'success');

      if (this.badgeModelText && data.model_used) {
        this.badgeModelText.textContent = data.model_used;
      }

    } catch (e) {
      this.removeTypingIndicator();
      this.showToast('Network error while regenerating response.', 'error');
    } finally {
      this.isSending = false;
    }
  }

  async refreshConversationMessages(convId) {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (!res.ok) throw new Error('Conversation not found');
      const data = await res.json();

      if (this.currentChatTitle) this.currentChatTitle.textContent = data.conversation.title || 'Conversation';
      this.renderMessages(data.messages || []);
      this.renderConversationList();
    } catch (e) {
      console.error('Failed to reload conversation messages:', e);
    }
  }

  // --- SEND MESSAGE ---

  async sendMessage() {
    if (this.isSending) return;

    const rawPrompt = this.promptInput.value.trim();
    if (!rawPrompt && this.attachments.length === 0) return;

    // Incorporate quoted selection if active
    let promptToSend = rawPrompt;
    if (this.quotedSelection) {
      promptToSend = `> "${this.quotedSelection}"\n\n${rawPrompt}`;
      this.clearQuotedSelection();
    }

    const currentAttachments = [...this.attachments];
    const sendingImageMode = this.isImageMode;

    if (this.isImageMode) {
      this.isImageMode = false;
      if (this.composerGenImageBtn) {
        this.composerGenImageBtn.classList.remove('active');
      }
      this.promptInput.placeholder = 'Ask GYAN anything';
    }

    this.clearAttachments();
    this.promptInput.value = '';
    this.autoExpandTextarea();

    // Hide welcome screen and display user message
    this.welcomeScreen.classList.add('hidden');

    const tempUserMsg = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: promptToSend,
      attachments: currentAttachments
    };
    this.appendMessageElement(tempUserMsg, true);

    // Check if sending an image query
    const isImageQuery = sendingImageMode ||
      promptToSend.toLowerCase().startsWith('/imagine') ||
      promptToSend.toLowerCase().startsWith('/image') ||
      promptToSend.toLowerCase().startsWith('/draw') ||
      promptToSend.toLowerCase().startsWith('/paint') ||
      /\b(generate|create|draw|paint|render)\b.{0,30}\b(image|picture|photo|illustration|wallpaper|logo)\b/i.test(promptToSend);

    this.isSending = true;
    this.sendBtn.disabled = true;

    if (isImageQuery) {
      this.appendImageSynthesisIndicator(promptToSend);
    } else {
      this.appendTypingIndicator();
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: this.currentConversationId,
          prompt: promptToSend,
          effort_level: this.effortLevel,
          attachments: currentAttachments,
          is_image_generation: sendingImageMode,
          image_style: this.composerImageStyle ? this.composerImageStyle.value : undefined,
          image_aspect_ratio: this.composerImageAspect ? this.composerImageAspect.value : undefined,
          target_format: this.composerImageFormat ? this.composerImageFormat.value : undefined
        })
      });

      const data = await res.json();
      this.removeTypingIndicator();

      if (!res.ok) {
        this.showToast(data.error || 'Failed to generate response.', 'error');
        return;
      }

      this.currentConversationId = data.conversation_id;
      localStorage.setItem('gyan_active_conv_id', data.conversation_id);

      // Replace temp user message with saved version and append assistant message
      const tempEl = document.getElementById(`msg-${tempUserMsg.id}`);
      if (tempEl) tempEl.remove();

      this.appendMessageElement(data.user_message, false);
      this.appendMessageElement(data.assistant_message, true);

      if (this.badgeModelText && data.model_used) {
        this.badgeModelText.textContent = data.model_used;
      }

      // Refresh conversations list to update title / sorting
      this.loadConversations();

    } catch (e) {
      this.removeTypingIndicator();
      this.showToast('Network error while sending message.', 'error');
    } finally {
      this.isSending = false;
      this.sendBtn.disabled = false;
    }
  }

  appendTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row assistant typing-row';
    row.id = 'typingIndicator';
    row.innerHTML = `
      <div class="message-avatar">
        <img src="/static/img/logo.svg" alt="GYAN" />
      </div>
      <div class="message-content-wrapper">
        <div class="message-bubble assistant-bubble">
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(row);
    this.scrollToBottom();
  }

  appendImageSynthesisIndicator(prompt) {
    const row = document.createElement('div');
    row.className = 'message-row assistant typing-row';
    row.id = 'imageSynthIndicator';
    row.innerHTML = `
      <div class="message-avatar" title="GYAN Vision">
        <img src="/static/img/logo.svg" alt="GYAN" />
      </div>
      <div class="message-content-wrapper">
        <div class="image-synth-loader">
          <div class="synth-pulse-icon">
            <i data-lucide="palette"></i>
          </div>
          <div class="synth-loader-body">
            <div class="synth-loader-title">
              <span>Synthesizing Visual Art</span>
              <span class="studio-badge-pro">FLUX</span>
            </div>
            <div class="synth-loader-bar">
              <div class="synth-loader-bar-fill"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(row);
    lucide.createIcons();
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
    const synthIndicator = document.getElementById('imageSynthIndicator');
    if (synthIndicator) synthIndicator.remove();
  }

  // --- TEXT SELECTION QUERY ("Ask GYAN about this") ---

  handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText || selectedText.length < 3) {
      this.hideSelectionTooltip();
      return;
    }

    // Ensure selection originated inside an assistant bubble
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;
    const parentBubble = anchorNode.nodeType === 3
      ? anchorNode.parentElement.closest('.assistant-bubble')
      : anchorNode.closest('.assistant-bubble');

    if (!parentBubble) {
      this.hideSelectionTooltip();
      return;
    }

    // Position tooltip right above selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const viewportRect = this.chatViewport.getBoundingClientRect();

    const top = rect.top - viewportRect.top + this.chatViewport.scrollTop - 12;
    const left = rect.left - viewportRect.left + (rect.width / 2);

    this.selectionTooltip.style.top = `${top}px`;
    this.selectionTooltip.style.left = `${left}px`;
    this.selectionTooltip.style.display = 'flex';
    this.currentRawSelection = selectedText;
  }

  hideSelectionTooltip() {
    this.selectionTooltip.style.display = 'none';
  }

  applyQuotedSelection(action) {
    if (!this.currentRawSelection) return;

    this.quotedSelection = this.currentRawSelection;
    this.quoteText.textContent = `"${this.quotedSelection}"`;
    this.quotePreviewBar.classList.remove('hidden');
    this.hideSelectionTooltip();

    if (action === 'explain') {
      this.promptInput.value = 'Please explain this in simpler terms and give clear examples.';
    } else {
      this.promptInput.placeholder = 'What would you like to ask about this selection?';
    }

    this.promptInput.focus();
    this.autoExpandTextarea();
  }

  clearQuotedSelection() {
    this.quotedSelection = null;
    this.quotePreviewBar.classList.add('hidden');
    this.promptInput.placeholder = 'Ask GYAN anything... (Upload documents, images or speak)';
  }

  // --- FILE & IMAGE UPLOAD ---

  async handleFilesUpload(files) {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      this.showToast(`Uploading & analyzing ${file.name}...`);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (res.ok && data.attachment) {
          this.attachments.push(data.attachment);
          this.renderAttachmentChips();
          this.showToast(`${file.name} ready!`, 'success');
        } else {
          this.showToast(data.error || `Upload failed for ${file.name}`, 'error');
        }
      } catch (e) {
        this.showToast(`Error uploading ${file.name}`, 'error');
      }
    }

    // Reset input fields
    this.fileInput.value = '';
    this.imageInput.value = '';
  }

  renderAttachmentChips() {
    if (this.attachments.length === 0) {
      this.attachmentsPreviewBar.classList.add('hidden');
      this.attachmentsPreviewBar.innerHTML = '';
      return;
    }

    this.attachmentsPreviewBar.classList.remove('hidden');
    this.attachmentsPreviewBar.innerHTML = '';

    this.attachments.forEach((att, idx) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';

      let iconHtml = '<i data-lucide="file-text"></i>';
      if (att.type === 'image' && att.data_uri) {
        iconHtml = `<img src="${att.data_uri}" class="chip-thumb" alt="Preview" />`;
      }

      chip.innerHTML = `
        ${iconHtml}
        <span class="chip-name" title="${this.escapeHtml(att.filename)}">${this.escapeHtml(att.filename)}</span>
        <button class="chip-remove-btn" title="Remove attachment">
          <i data-lucide="x"></i>
        </button>
      `;

      chip.querySelector('.chip-remove-btn').addEventListener('click', () => {
        this.attachments.splice(idx, 1);
        this.renderAttachmentChips();
      });

      this.attachmentsPreviewBar.appendChild(chip);
    });

    lucide.createIcons();
  }

  clearAttachments() {
    this.attachments = [];
    this.renderAttachmentChips();
  }

  // --- AUDIO VOICE INPUT & TRANSCRIBE ---

  async toggleVoiceRecording() {
    if (this.isRecording) {
      this.stopVoiceRecording(true);
    } else {
      this.startVoiceInput();
    }
  }

  async startVoiceInput() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.showToast('Microphone access is not supported by this browser.', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.voiceRecordBtn.classList.add('recording');
      this.recordingBanner.classList.remove('hidden');

      this.recordStartTime = Date.now();
      this.recordTimerInterval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - this.recordStartTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        this.recordingTimer.textContent = `${mins}:${secs}`;
      }, 500);

    } catch (e) {
      this.showToast('Microphone permission denied or unavailable.', 'error');
    }
  }

  stopVoiceRecording(shouldTranscribe = true) {
    if (!this.isRecording || !this.mediaRecorder) return;

    clearInterval(this.recordTimerInterval);
    this.recordingBanner.classList.add('hidden');
    this.voiceRecordBtn.classList.remove('recording');
    this.isRecording = false;

    this.mediaRecorder.onstop = async () => {
      if (shouldTranscribe && this.audioChunks.length > 0) {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.sendAudioForTranscription(audioBlob);
      }
      this.audioChunks = [];
    };

    this.mediaRecorder.stop();
  }

  async sendAudioForTranscription(audioBlob) {
    this.showToast('Transcribing voice with Groq Whisper...');
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice_input.webm');

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.text) {
        const currentVal = this.promptInput.value;
        this.promptInput.value = currentVal ? `${currentVal} ${data.text}` : data.text;
        this.autoExpandTextarea();
        this.promptInput.focus();
        this.showToast('Transcribed successfully!', 'success');
      } else {
        this.showToast(data.error || 'Could not transcribe audio.', 'error');
      }
    } catch (e) {
      this.showToast('Error during audio transcription.', 'error');
    }
  }

  // --- TEXT TO SPEECH ---

  cleanTextForSpeech(rawText) {
    if (!rawText) return '';

    let text = rawText;

    // 1. Handle code blocks: explain them rather than reading syntax
    text = text.replace(/```[\s\S]*?```/g, ' Code snippet omitted. ');

    // 2. Preprocess Math & Chemical Equations before stripping symbols:
    // Arrows to spoken words
    text = text.replace(/\\(right|longright)arrow|->|-->|→/g, ' yields ');
    text = text.replace(/\\(left|longleft)arrow|<-|<--|←/g, ' from ');
    text = text.replace(/\\(leftright|longleftright)arrow|<->|↔/g, ' is in equilibrium with ');
    text = text.replace(/\\approx|≈/g, ' is approximately ');
    text = text.replace(/\\neq|≠/g, ' is not equal to ');
    text = text.replace(/\\leq|<=|≤/g, ' is less than or equal to ');
    text = text.replace(/\\geq|>=|≥/g, ' is greater than or equal to ');
    text = text.replace(/\\times|×/g, ' times ');
    text = text.replace(/\\pm|±/g, ' plus or minus ');
    text = text.replace(/\\cdot|·/g, ' dot ');
    text = text.replace(/\\%/g, ' percent');
    text = text.replace(/%/g, ' percent');
    
    // Fractions: \frac{A}{B} -> "A over B"
    text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, ' $1 over $2 ');
    // Square roots: \sqrt{A} -> "square root of A"
    text = text.replace(/\\sqrt\{([^{}]+)\}/g, ' square root of $1 ');

    // \text{...} or \mathrm{...} -> keep inner text
    text = text.replace(/\\(text|mathrm|mathbf|mathit|textsf)\{([^{}]+)\}/g, ' $2 ');

    // Subscripts: e.g. _{...} or _num or _letter -> convert to clean space (e.g. O_2 -> O 2)
    text = text.replace(/_\{([^{}]+)\}/g, ' $1 ');
    text = text.replace(/_([a-zA-Z0-9])/g, ' $1 ');

    // Exponents: ^{...} or ^num -> "to the power of"
    text = text.replace(/\^\{2\}|\^2/g, ' squared ');
    text = text.replace(/\^\{3\}|\^3/g, ' cubed ');
    text = text.replace(/\^\{([^{}]+)\}/g, ' to the power of $1 ');
    text = text.replace(/\^([0-9a-zA-Z])/g, ' to the power of $1 ');

    // Plus signs in equations: "6CO2 + 6H2O" -> "plus"
    text = text.replace(/\+/g, ' plus ');

    // Chemical symbols spacing: e.g. (O2) -> O 2
    text = text.replace(/\b([A-Z])([a-z]?)([0-9]+)\b/g, '$1$2 $3');

    // 3. Remove all dollar signs ($$ and $) so TTS never says "dollar" or "dollar symbol"
    text = text.replace(/\$+/g, '');

    // 4. Clean brackets and parentheses so it doesn't say "bracket", "open parenthesis", "curly bracket":
    // For parentheses like "(O 2)" or "(phloem)" or "(CO2)": replace with natural pauses
    text = text.replace(/\(([^()]+)\)/g, ', $1, ');
    // Markdown links: [label](url) -> keep label only
    text = text.replace(/\[([^\[\]]+)\]\([^\)]+\)/g, ' $1 ');
    // Markdown brackets: [label] -> label
    text = text.replace(/\[([^\[\]]+)\]/g, ' $1 ');

    // Strip remaining braces, brackets, backslashes
    text = text.replace(/[\{\}\[\]\\]/g, ' ');

    // 5. Clean markdown headers (#, ##, ###) -> convert to sentence with pause
    text = text.replace(/^#+\s*(.*)$/gm, '$1. ');

    // 6. Clean markdown bold, italics, strikethrough, underline, backticks
    text = text.replace(/[\*\_~`]/g, '');

    // 7. Clean table vertical pipes
    text = text.replace(/\|/g, ', ');

    // 8. Clean markdown list bullets: "- item", "* item" -> smooth pause
    text = text.replace(/^[\s]*[-*+]\s+/gm, '. ');
    text = text.replace(/^[0-9]+\.\s+/gm, '. ');

    // 9. Remove emojis that screen readers pronounce awkwardly (📝, ✨, 💡, 👤, 🚀, etc.)
    text = text.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, '');

    // 10. Clean punctuation and multiple whitespaces
    text = text.replace(/\s+,/g, ',');
    text = text.replace(/,\s*:/g, ': ');
    text = text.replace(/,\s*,+/g, ',');
    text = text.replace(/\.\s*\.+/g, '.');
    text = text.replace(/\s+/g, ' ');

    return text.trim();
  }

  toggleTextToSpeech(msgId, text, btn) {
    if (!('speechSynthesis' in window)) {
      this.showToast('Text-to-speech is not supported by your browser.', 'error');
      return;
    }

    if (window.speechSynthesis.speaking && this.currentSpeakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      btn.classList.remove('speaking');
      btn.innerHTML = '<i data-lucide="volume-2"></i> Read';
      this.currentSpeakingMsgId = null;
      lucide.createIcons();
      return;
    }

    window.speechSynthesis.cancel();
    document.querySelectorAll('.speak-msg-btn.speaking').forEach((b) => {
      b.classList.remove('speaking');
      b.innerHTML = '<i data-lucide="volume-2"></i> <span>Read</span>';
    });

    const plainText = this.cleanTextForSpeech(text);
    if (!plainText) {
      this.showToast('No readable text in message.', 'info');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural sounding English voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online'))
      ) || voices.find((v) => v.lang.startsWith('en'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    btn.classList.add('speaking');
    btn.innerHTML = '<span class="audio-equalizer"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></span> <span>Stop</span>';
    this.currentSpeakingMsgId = msgId;

    utterance.onend = utterance.onerror = () => {
      btn.classList.remove('speaking');
      btn.innerHTML = '<i data-lucide="volume-2"></i> <span>Read</span>';
      this.currentSpeakingMsgId = null;
      lucide.createIcons();
    };

    window.speechSynthesis.speak(utterance);
  }

  // --- SHORTCUTS & VIEWPORT HELPERS ---

  openShortcutsModal() {
    if (this.shortcutsModal) {
      this.shortcutsModal.classList.remove('hidden');
      lucide.createIcons();
    }
  }

  closeShortcutsModal() {
    if (this.shortcutsModal) {
      this.shortcutsModal.classList.add('hidden');
    }
  }

  handleViewportScroll() {
    if (!this.scrollToBottomBtn) return;
    const distanceToBottom = this.chatViewport.scrollHeight - (this.chatViewport.scrollTop + this.chatViewport.clientHeight);
    if (distanceToBottom > 220) {
      this.scrollToBottomBtn.classList.remove('hidden');
    } else {
      this.scrollToBottomBtn.classList.add('hidden');
    }
  }

  scrollToBottom(smooth = false) {
    requestAnimationFrame(() => {
      if (smooth) {
        this.chatViewport.scrollTo({ top: this.chatViewport.scrollHeight, behavior: 'smooth' });
      } else {
        this.chatViewport.scrollTop = this.chatViewport.scrollHeight;
      }
    });
  }

  insertPrompt(text) {
    this.promptInput.value = text;
    this.autoExpandTextarea();
    this.promptInput.focus();
  }

  autoExpandTextarea() {
    this.promptInput.style.height = 'auto';
    this.promptInput.style.height = Math.min(this.promptInput.scrollHeight, 180) + 'px';
  }

  toggleSidebar(forceOpen = null) {
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      if (forceOpen === null) {
        const isOpen = this.sidebar.classList.toggle('open');
        this.sidebarOverlay.classList.toggle('active', isOpen);
      } else {
        this.sidebar.classList.toggle('open', forceOpen);
        this.sidebarOverlay.classList.toggle('active', forceOpen);
      }
    } else {
      if (forceOpen === null) {
        this.sidebar.classList.toggle('collapsed');
      } else {
        this.sidebar.classList.toggle('collapsed', !forceOpen);
      }
    }
  }

  copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(successMsg, 'success');
    }).catch(() => {
      this.showToast('Failed to copy to clipboard.', 'error');
    });
  }

  exportCurrentChat() {
    if (!this.currentConversationId) {
      this.showToast('No active conversation to export.', 'error');
      return;
    }

    const conv = this.conversations.find((c) => c.id === this.currentConversationId);
    const title = conv ? conv.title : 'GYAN_Conversation';

    fetch(`/api/conversations/${this.currentConversationId}`)
      .then((res) => res.json())
      .then((data) => {
        let md = `# ${data.conversation.title || 'GYAN Chat'}\n`;
        md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

        data.messages.forEach((m) => {
          const roleTitle = m.role === 'user' ? '👤 User' : '✨ GYAN';
          md += `### ${roleTitle}\n\n${m.content}\n\n`;
          if (m.thinking) {
            md += `> **Thinking Process:**\n> ${m.thinking.replace(/\n/g, '\n> ')}\n\n`;
          }
          md += `---\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Conversation exported as Markdown!', 'success');
      });
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';

    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${this.escapeHtml(message)}</span>`;
    this.toastContainer.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.25s ease-out';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- AI IMAGE STUDIO & LIGHTBOX CONTROLLER ---

  openImageStudio() {
    if (!this.imageStudioModal) return;
    this.imageStudioModal.classList.remove('hidden');
    this.renderStudioHistory();
    if (this.imageStudioPromptInput) {
      this.imageStudioPromptInput.focus();
    }
  }

  closeImageStudio() {
    if (!this.imageStudioModal) return;
    this.imageStudioModal.classList.add('hidden');
    if (this.synthesisStepTimer) {
      clearInterval(this.synthesisStepTimer);
      this.synthesisStepTimer = null;
    }
  }

  toggleComposerImageMode(forceState = null) {
    this.isImageMode = forceState !== null ? forceState : !this.isImageMode;

    if (this.composerGenImageBtn) {
      this.composerGenImageBtn.classList.toggle('active', this.isImageMode);
    }
    if (this.composerImageToolbar) {
      this.composerImageToolbar.classList.toggle('hidden', !this.isImageMode);
    }

    if (this.isImageMode) {
      this.promptInput.placeholder = 'Describe the visual art to synthesize with FLUX (e.g., A celestial observatory at night)...';
    } else {
      this.promptInput.placeholder = 'Ask GYAN anything';
    }
    this.promptInput.focus();
  }

  applyRandomComposerPrompt() {
    const item = CREATIVE_IMAGE_PROMPTS[Math.floor(Math.random() * CREATIVE_IMAGE_PROMPTS.length)];
    this.promptInput.value = item.prompt;
    if (this.composerImageStyle && item.style) {
      this.composerImageStyle.value = item.style;
    }
    this.autoExpandTextarea();
    this.promptInput.focus();
  }

  applyRandomStudioPrompt() {
    const item = CREATIVE_IMAGE_PROMPTS[Math.floor(Math.random() * CREATIVE_IMAGE_PROMPTS.length)];
    if (this.imageStudioPromptInput) {
      this.imageStudioPromptInput.value = item.prompt;
    }
    if (item.style) {
      this.selectStudioStyle(item.style);
    }
  }

  enhanceStudioPrompt() {
    if (!this.imageStudioPromptInput) return;
    const currentPrompt = this.imageStudioPromptInput.value.trim();
    if (!currentPrompt) {
      this.showToast('Please type a base prompt before enhancing.', 'error');
      return;
    }

    const enhanced = this.enhancePromptWithDetails(currentPrompt, this.studioSelectedStyle);
    this.imageStudioPromptInput.value = enhanced;
  }

  enhancePromptWithDetails(prompt, style) {
    const p = prompt.trim();
    if (!p) return '';
    const enhancers = {
      photorealistic: '8k UHD photograph, natural cinematic lighting, highly detailed textures, sharp focus, raytraced shadows',
      'digital-art': 'trending on ArtStation, vivid vibrant colors, dynamic atmospheric composition, highly detailed digital concept art',
      anime: 'Makoto Shinkai aesthetic, Kyoto Animation style, vivid anime illustration, dramatic sky, cinematic volumetric lighting',
      'cinematic-3d': 'Octane 3D render, volumetric light rays, raytracing, cinematic atmosphere, Unreal Engine 5 render',
      cyberpunk: 'cyberpunk neon lighting, rain-slicked wet reflections, high contrast, moody dark atmosphere, volumetric fog',
      fantasy: 'ethereal magical glow, mythical atmosphere, highly intricate details, epic composition, glowing particles, masterpiece',
      watercolor: 'soft fluid paint bleed, delicate brush strokes, subtle pastel hues, handmade paper texture, artistic wash',
      sketch: 'detailed graphite pencil sketch, cross-hatching, fine line work, monochrome shading, sketchbook texture',
      'pixel-art': '16-bit retro game aesthetic, vibrant limited palette, clean pixel clusters, nostalgic arcade atmosphere',
      'minimalist-logo': 'clean vector lines, modern branding, minimalist geometry, bold negative space, high contrast'
    };
    const addon = enhancers[style] || enhancers.photorealistic;
    return `${p}, ${addon}`;
  }

  selectStudioStyle(styleKey) {
    this.studioSelectedStyle = styleKey;
    if (this.imageStylePills) {
      this.imageStylePills.querySelectorAll('.studio-style-card').forEach((card) => {
        card.classList.toggle('active', card.dataset.style === styleKey);
      });
    }
  }

  async generateStudioImage(isVariation = false) {
    const prompt = this.imageStudioPromptInput ? this.imageStudioPromptInput.value.trim() : '';
    if (!prompt) {
      this.showToast('Please enter a visual prompt to generate.', 'error');
      return;
    }

    // Switch UI from empty state to preview frame
    if (this.studioEmptyState) this.studioEmptyState.classList.add('hidden');
    if (this.studioImgWrapper) this.studioImgWrapper.classList.remove('hidden');
    if (this.studioImgLoadingOverlay) this.studioImgLoadingOverlay.classList.remove('hidden');
    if (this.generateStudioImgBtn) this.generateStudioImgBtn.disabled = true;

    // Start cycling synthesis status messages
    const stepMessages = [
      'Framing composition & layout...',
      'Synthesizing lighting, atmosphere & style...',
      'Simulating volumetric textures & fine details...',
      'Encoding final high-resolution render...'
    ];
    let stepIdx = 0;
    if (this.studioLoadingStep) this.studioLoadingStep.textContent = stepMessages[0];
    if (this.synthesisStepTimer) clearInterval(this.synthesisStepTimer);
    this.synthesisStepTimer = setInterval(() => {
      stepIdx = (stepIdx + 1) % stepMessages.length;
      if (this.studioLoadingStep) this.studioLoadingStep.textContent = stepMessages[stepIdx];
    }, 1800);

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          style: this.studioSelectedStyle || 'photorealistic',
          aspect_ratio: this.studioSelectedAspect || '1:1',
          format: this.studioSelectedFormat || 'png',
          conversation_id: this.currentConversationId,
          insert_into_chat: false
        })
      });

      const data = await res.json();
      if (this.synthesisStepTimer) {
        clearInterval(this.synthesisStepTimer);
        this.synthesisStepTimer = null;
      }

      if (!res.ok) {
        this.showToast(data.error || 'Failed to generate image.', 'error');
        if (this.studioImgLoadingOverlay) this.studioImgLoadingOverlay.classList.add('hidden');
        return;
      }

      this.lastGeneratedStudioData = data;

      // Preload image
      const img = new Image();
      img.onload = () => {
        if (this.studioPreviewImg) this.studioPreviewImg.src = data.image_url;
        if (this.studioImgLoadingOverlay) this.studioImgLoadingOverlay.classList.add('hidden');
        this.updateStudioMetadataBar(data);
        this.addArtworkToHistory({
          url: data.image_url,
          downloadUrl: data.download_url,
          filename: data.filename,
          prompt: data.prompt,
          style: data.style,
          aspect: data.aspect_ratio,
          format: data.format,
          dimensions: '1024×1024'
        });
        this.showToast('Artwork synthesized successfully!', 'success');
      };
      img.onerror = () => {
        if (this.studioPreviewImg) this.studioPreviewImg.src = data.image_url;
        if (this.studioImgLoadingOverlay) this.studioImgLoadingOverlay.classList.add('hidden');
        this.updateStudioMetadataBar(data);
      };
      img.src = data.image_url;

    } catch (e) {
      if (this.synthesisStepTimer) clearInterval(this.synthesisStepTimer);
      if (this.studioImgLoadingOverlay) this.studioImgLoadingOverlay.classList.add('hidden');
      this.showToast('Network error while generating image.', 'error');
    } finally {
      if (this.generateStudioImgBtn) this.generateStudioImgBtn.disabled = false;
    }
  }

  updateStudioMetadataBar(data) {
    if (this.studioMetaActionBar) this.studioMetaActionBar.classList.remove('hidden');
    if (this.studioMetaStyle) this.studioMetaStyle.textContent = (data.style || 'Photorealistic').toUpperCase();
    if (this.studioMetaAspect) this.studioMetaAspect.textContent = data.aspect_ratio || '1:1';
    if (this.studioMetaFormat) this.studioMetaFormat.textContent = (data.format || 'PNG').toUpperCase();
    if (this.studioMetaDimensions) this.studioMetaDimensions.textContent = `${data.width || 1024}×${data.height || 1024}`;
  }

  async insertStudioImageIntoChat() {
    if (!this.lastGeneratedStudioData) return;

    const data = this.lastGeneratedStudioData;
    if (this.insertStudioImgBtn) this.insertStudioImgBtn.disabled = true;

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: data.prompt,
          style: data.style,
          aspect_ratio: data.aspect_ratio,
          format: data.format || 'png',
          conversation_id: this.currentConversationId,
          insert_into_chat: true
        })
      });

      const result = await res.json();
      if (res.ok) {
        this.currentConversationId = result.conversation_id;
        localStorage.setItem('gyan_active_conv_id', result.conversation_id);
        await this.refreshConversationMessages(result.conversation_id);
        this.closeImageStudio();
        this.showToast('Artwork added to chat!', 'success');
      } else {
        this.showToast(result.error || 'Failed to insert into chat.', 'error');
      }
    } catch (e) {
      this.showToast('Network error inserting image into chat.', 'error');
    } finally {
      if (this.insertStudioImgBtn) this.insertStudioImgBtn.disabled = false;
    }
  }

  downloadStudioImage(targetFormat = 'png') {
    if (!this.lastGeneratedStudioData) return;
    this.downloadSpecificImage(this.lastGeneratedStudioData, targetFormat);
  }

  downloadSpecificImage(imgData, targetFormat = 'png') {
    const filename = imgData.filename || '';
    const fmt = (targetFormat || 'png').toLowerCase().replace('.', '');
    let downloadUrl = '';

    if (filename) {
      downloadUrl = `/api/image/download/${filename}?format=${fmt}`;
    } else {
      downloadUrl = imgData.downloadUrl || imgData.imageUrl || imgData.image_url;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.setAttribute('download', filename ? `${filename.split('.')[0]}.${fmt}` : `gyan_art_${Date.now()}.${fmt}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast(`Downloading ${fmt.toUpperCase()} image...`, 'info');
  }

  requestVariationFromChat(imageCardInfo) {
    if (!imageCardInfo) return;
    this.promptInput.value = `/imagine ${imageCardInfo.prompt}`;
    this.sendMessage();
  }

  extractImageCardInfo(content, thinking) {
    if (!content) return null;
    const imgRegex = /!\[(.*?)\]\((https?:\/\/[^\s\)]+|\/uploads\/generated\/[^\s\)]+)\)/;
    const match = content.match(imgRegex);
    if (!match) return null;

    const alt = match[1];
    const imgUrl = match[2];

    let prompt = '';
    const promptMatch = content.match(/for:\s*\*\*"([^"]+)"\*\*/i) || content.match(/for:\s*\*\*“([^”]+)”\*\*/i);
    if (promptMatch) {
      prompt = promptMatch[1];
    } else {
      prompt = alt || 'Visual Art';
    }

    let format = 'PNG';
    const fmtMatch = content.match(/Format:\s*\*\*([A-Za-z0-9]+)\*\*/i);
    if (fmtMatch) {
      format = fmtMatch[1].toUpperCase();
    } else if (imgUrl.endsWith('.jpg') || imgUrl.endsWith('.jpeg')) {
      format = 'JPG';
    } else if (imgUrl.endsWith('.webp')) {
      format = 'WEBP';
    }

    let style = 'Photorealistic';
    const styleMatch = content.match(/Style:\s*([A-Za-z0-9\s\-]+?)\s*•/i);
    if (styleMatch) {
      style = styleMatch[1].trim();
    }

    let dimensions = '1024×1024';
    const dimMatch = content.match(/Dimensions:\s*([0-9]+x[0-9]+)/i);
    if (dimMatch) {
      dimensions = dimMatch[1].replace('x', '×');
    }

    let downloadUrl = imgUrl;
    const dlMatch = content.match(/\[Download [^\]]+\]\(([^\)]+)\)/i);
    if (dlMatch) {
      downloadUrl = dlMatch[1];
    }

    // Extract filename if present
    let filename = '';
    const fnMatch = imgUrl.match(/generated\/([^/?#]+)/);
    if (fnMatch) {
      filename = fnMatch[1];
    }

    return {
      imageUrl: imgUrl,
      downloadUrl: downloadUrl,
      filename: filename,
      prompt: prompt,
      style: style,
      format: format,
      dimensions: dimensions,
      thinking: thinking || ''
    };
  }

  // --- STUDIO HISTORY (SESSION FILMSTRIP) ---

  addArtworkToHistory(art) {
    if (!art || !art.url) return;
    const exists = this.studioHistory.some((item) => item.url === art.url);
    if (exists) return;

    this.studioHistory.unshift({
      url: art.url,
      downloadUrl: art.downloadUrl || art.url,
      filename: art.filename || '',
      prompt: art.prompt || 'Artwork',
      style: art.style || 'Photorealistic',
      aspect: art.aspect || '1:1',
      format: art.format || 'PNG',
      dimensions: art.dimensions || '1024×1024',
      timestamp: Date.now()
    });

    if (this.studioHistory.length > 20) {
      this.studioHistory = this.studioHistory.slice(0, 20);
    }
    sessionStorage.setItem('gyan_studio_history', JSON.stringify(this.studioHistory));
    this.renderStudioHistory();
  }

  renderStudioHistory() {
    if (!this.studioHistoryFilmstrip) return;
    if (this.studioGalleryCount) {
      this.studioGalleryCount.textContent = `${this.studioHistory.length} pieces`;
    }

    if (this.studioHistory.length === 0) {
      this.studioHistoryFilmstrip.innerHTML = '<div class="filmstrip-empty">Synthesized artworks will appear here</div>';
      return;
    }

    this.studioHistoryFilmstrip.innerHTML = '';
    this.studioHistory.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'filmstrip-item';
      el.title = `${item.prompt} (${item.style})`;
      el.innerHTML = `<img src="${item.url}" alt="${this.escapeHtml(item.prompt)}" loading="lazy" />`;

      el.addEventListener('click', () => {
        document.querySelectorAll('.filmstrip-item').forEach((f) => f.classList.remove('active'));
        el.classList.add('active');

        // Restore to canvas
        if (this.studioEmptyState) this.studioEmptyState.classList.add('hidden');
        if (this.studioImgWrapper) this.studioImgWrapper.classList.remove('hidden');
        if (this.studioPreviewImg) this.studioPreviewImg.src = item.url;
        if (this.imageStudioPromptInput) this.imageStudioPromptInput.value = item.prompt;
        if (item.style) this.selectStudioStyle(item.style);
        this.updateStudioMetadataBar(item);
        this.lastGeneratedStudioData = {
          image_url: item.url,
          download_url: item.downloadUrl,
          filename: item.filename,
          prompt: item.prompt,
          style: item.style,
          aspect_ratio: item.aspect,
          format: item.format
        };
      });

      this.studioHistoryFilmstrip.appendChild(el);
    });
  }

  // --- FULL-SCREEN IMAGE LIGHTBOX CONTROLLER ---

  openLightbox(data) {
    if (!this.imageLightboxModal || !data) return;
    this.currentLightboxData = data;
    this.lightboxZoom = 1.0;
    this.updateLightboxZoom();

    const imgUrl = data.imageUrl || data.image_url || data.url;
    if (this.lightboxImg) this.lightboxImg.src = imgUrl;

    const promptText = data.prompt || data.original_prompt || 'Visual Artwork';
    if (this.lightboxTitle) this.lightboxTitle.textContent = promptText;

    if (this.lbMetaStyle) this.lbMetaStyle.textContent = (data.style || 'Photorealistic').toUpperCase();
    if (this.lbMetaFormat) this.lbMetaFormat.textContent = (data.format || 'PNG').toUpperCase();
    if (this.lbMetaDimensions) this.lbMetaDimensions.textContent = data.dimensions || `${data.width || 1024}×${data.height || 1024}`;

    this.imageLightboxModal.classList.remove('hidden');
  }

  closeLightbox() {
    if (!this.imageLightboxModal) return;
    this.imageLightboxModal.classList.add('hidden');
    this.lightboxZoom = 1.0;
    this.updateLightboxZoom();
  }

  zoomLightbox(delta) {
    this.lightboxZoom = Math.min(3.5, Math.max(0.5, this.lightboxZoom + delta));
    this.updateLightboxZoom();
  }

  resetLightboxZoom() {
    this.lightboxZoom = 1.0;
    this.updateLightboxZoom();
  }

  updateLightboxZoom() {
    if (this.lightboxImgWrapper) {
      this.lightboxImgWrapper.style.transform = `scale(${this.lightboxZoom})`;
    }
    if (this.lightboxZoomText) {
      this.lightboxZoomText.textContent = `${Math.round(this.lightboxZoom * 100)}%`;
    }
  }

  downloadLightboxImage(format = 'png') {
    if (!this.currentLightboxData) return;
    this.downloadSpecificImage(this.currentLightboxData, format);
  }
}

// Instantiate App on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new GyanApp();
  lucide.createIcons();
});
