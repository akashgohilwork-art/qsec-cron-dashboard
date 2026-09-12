/**
 * QSEC Cron Dashboard — Mobile-First Interactions
 * Swipeable cards, bottom sheet history, pull-to-refresh, FAB, toast notifications
 */

(function() {
  'use strict';

  // ─── State ───
  const state = {
    pullStartY: 0,
    pullCurrentY: 0,
    pullThreshold: 80,
    isPulling: false,
    refreshTriggered: false,
    activeSheet: null,
    touchStartX: 0,
    touchStartY: 0,
  };

  // ─── DOM Elements ───
  const elements = {
    pullRefresh: null,
    fab: null,
    sheetOverlay: null,
    historySheet: null,
    sheetClose: null,
    sheetHandle: null,
    expandButtons: [],
    cards: [],
  };

  // ─── Initialize ───
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    cacheElements();
    initPullToRefresh();
    initFab();
    initBottomSheet();
    initExpandButtons();
    initSwipeableCards();
    initKeyboardAccessibility();
    initResizeHandler();

    // Update last updated timestamp
    updateLastUpdated();

    // Show welcome toast on first load
    if (!sessionStorage.getItem('dashboard-visited')) {
      sessionStorage.setItem('dashboard-visited', 'true');
      setTimeout(() => showToast('Dashboard loaded — pull down to refresh', 'success'), 1000);
    }

    console.log('[QSEC Dashboard] Mobile-first initialized');
  }

  function cacheElements() {
    elements.pullRefresh = document.querySelector('.pull-refresh');
    elements.fab = document.querySelector('.fab');
    elements.sheetOverlay = document.querySelector('.sheet-overlay');
    elements.historySheet = document.querySelector('.history-sheet');
    elements.sheetClose = document.querySelector('.sheet-close');
    elements.sheetHandle = document.querySelector('.sheet-handle');
    elements.expandButtons = Array.from(document.querySelectorAll('.card-expand'));
    elements.cards = Array.from(document.querySelectorAll('.card'));
  }

  // ─── Pull to Refresh ───
  function initPullToRefresh() {
    if (!elements.pullRefresh) return;

    document.addEventListener('touchstart', handlePullStart, { passive: true });
    document.addEventListener('touchmove', handlePullMove, { passive: false });
    document.addEventListener('touchend', handlePullEnd, { passive: true });
  }

  function handlePullStart(e) {
    // Only trigger at top of page
    if (window.scrollY === 0) {
      state.pullStartY = e.touches[0].clientY;
      state.isPulling = true;
      state.refreshTriggered = false;
    }
  }

  function handlePullMove(e) {
    if (!state.isPulling) return;

    state.pullCurrentY = e.touches[0].clientY;
    const delta = state.pullCurrentY - state.pullStartY;

    if (delta > 0) {
      e.preventDefault(); // Prevent native scroll
      const progress = Math.min(delta / state.pullThreshold, 1.5);
      const translateY = Math.min(delta * 0.5, state.pullThreshold * 1.2);

      elements.pullRefresh.style.transform = `translateY(calc(-100% + ${translateY}px))`;
      elements.pullRefresh.style.opacity = progress;

      if (progress >= 1 && !state.refreshTriggered) {
        state.refreshTriggered = true;
        elements.pullRefresh.classList.add('visible');
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);
      } else if (progress < 1) {
        elements.pullRefresh.classList.remove('visible');
      }
    }
  }

  function handlePullEnd() {
    if (!state.isPulling) return;

    state.isPulling = false;

    if (state.refreshTriggered) {
      // Trigger refresh
      triggerRefresh();
    } else {
      // Animate back
      elements.pullRefresh.style.transform = 'translateY(-100%)';
      elements.pullRefresh.style.opacity = '0';
    }
  }

  function triggerRefresh() {
    // Visual feedback
    const spinner = elements.pullRefresh.querySelector('.pull-refresh-spinner');
    const text = elements.pullRefresh.querySelector('.pull-refresh-text');
    if (text) text.textContent = 'Refreshing…';

    // Reload page (simple approach for static site)
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }

  // ─── FAB (Floating Action Button) ───
  function initFab() {
    if (!elements.fab) return;

    elements.fab.addEventListener('click', handleFabClick);
    elements.fab.addEventListener('keydown', handleFabKeydown);
  }

  function handleFabClick() {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);

    // Animate
    elements.fab.style.transform = 'scale(0.95)';
    setTimeout(() => {
      elements.fab.style.transform = 'scale(1)';
    }, 100);

    triggerRefresh();
  }

  function handleFabKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFabClick();
    }
  }

  // ─── Bottom Sheet History ───
  function initBottomSheet() {
    if (!elements.sheetOverlay || !elements.historySheet || !elements.sheetClose) return;

    // Close on overlay click
    elements.sheetOverlay.addEventListener('click', closeSheet);
    elements.sheetClose.addEventListener('click', closeSheet);
    elements.sheetClose.addEventListener('keydown', handleSheetCloseKeydown);

    // Handle drag to close
    let dragStartY = 0;
    let isDragging = false;

    elements.sheetHandle.addEventListener('touchstart', (e) => {
      dragStartY = e.touches[0].clientY;
      isDragging = true;
      elements.historySheet.style.transition = 'none';
    }, { passive: true });

    elements.sheetHandle.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const delta = e.touches[0].clientY - dragStartY;
      if (delta > 0) {
        elements.historySheet.style.transform = `translateY(${delta}px)`;
      }
    }, { passive: true });

    elements.sheetHandle.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      elements.historySheet.style.transition = '';
      const currentY = parseFloat(elements.historySheet.style.transform.replace('translateY(', '').replace('px)', '')) || 0;
      if (currentY > 100) {
        closeSheet();
      } else {
        elements.historySheet.style.transform = 'translateY(0)';
      }
    }, { passive: true });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.historySheet.classList.contains('open')) {
        closeSheet();
      }
    });
  }

  function openSheet(jobId) {
    const sheet = document.getElementById(`history-${jobId}`);
    const overlay = document.querySelector('.sheet-overlay');
    if (!sheet || !overlay) return;

    state.activeSheet = jobId;

    // Clone the sheet content to the global sheet
    const content = sheet.querySelector('.history-list').cloneNode(true);
    const title = sheet.closest('.card').querySelector('.card-title').textContent;

    elements.historySheet.querySelector('.sheet-title').textContent = `${title} — History`;
    const sheetContent = elements.historySheet.querySelector('.sheet-content');
    sheetContent.innerHTML = '';
    sheetContent.appendChild(content);

    // Show
    requestAnimationFrame(() => {
      overlay.classList.add('open');
      sheet.classList.add('open');
      document.body.style.overflow = 'hidden';

      // Haptic
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    });

    // Focus trap
    setTimeout(() => {
      elements.sheetClose.focus();
    }, 300);
  }

  function closeSheet() {
    if (!state.activeSheet) return;

    const overlay = document.querySelector('.sheet-overlay');
    const sheet = document.querySelector('.history-sheet');

    overlay.classList.remove('open');
    sheet.classList.remove('open');
    document.body.style.overflow = '';

    // Return focus to expand button
    const btn = document.querySelector(`[aria-controls="history-${state.activeSheet}"]`);
    if (btn) btn.focus();

    state.activeSheet = null;
  }

  function handleSheetCloseKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      closeSheet();
    }
  }

  // ─── Expand Buttons (Open Bottom Sheet) ───
  function initExpandButtons() {
    elements.expandButtons.forEach(btn => {
      btn.addEventListener('click', handleExpandClick);
      btn.addEventListener('keydown', handleExpandKeydown);
    });
  }

  function handleExpandClick(e) {
    const btn = e.currentTarget;
    const targetId = btn.getAttribute('aria-controls');
    const jobId = targetId.replace('history-', '');

    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !expanded);

    if (!expanded) {
      openSheet(jobId);
    } else {
      closeSheet();
    }

    // Update button text
    const textSpan = btn.querySelector('.expand-text');
    if (textSpan) {
      const count = document.querySelectorAll(`#${targetId} .history-item`).length;
      textSpan.textContent = btn.getAttribute('aria-expanded') === 'true'
        ? `Hide history (${count} previous runs)`
        : `Show history (${count} previous runs)`;
    }
  }

  function handleExpandKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  }

  // ─── Swipeable Cards (Horizontal Swipe for Quick Actions) ───
  function initSwipeableCards() {
    elements.cards.forEach(card => {
      let startX = 0;
      let currentX = 0;
      let isSwiping = false;
      let startTime = 0;

      card.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startTime = Date.now();
        isSwiping = true;
        card.style.transition = 'none';
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        currentX = e.touches[0].clientX;
        const delta = currentX - startX;

        // Only allow left swipe (reveal actions) or small right swipe (bounce)
        if (delta < 0 || delta < 50) {
          const translateX = Math.max(delta, -120); // Max 120px left
          card.style.transform = `translateX(${translateX}px)`;
        }
      }, { passive: true });

      card.addEventListener('touchend', () => {
        if (!isSwiping) return;
        isSwiping = false;
        const delta = currentX - startX;
        const duration = Date.now() - startTime;
        const velocity = delta / duration;

        card.style.transition = 'transform var(--transition-normal)';

        // Snap back or trigger action
        if (delta < -80 || (delta < -40 && velocity < -0.3)) {
          // Swipe left - could show quick actions here
          card.style.transform = 'translateX(-120px)';
          setTimeout(() => {
            card.style.transform = 'translateX(0)';
          }, 2000);
        } else {
          card.style.transform = 'translateX(0)';
        }
      }, { passive: true });
    });
  }

  // ─── Keyboard Accessibility ───
  function initKeyboardAccessibility() {
    // Ensure all interactive elements are reachable
    document.querySelectorAll('.card-expand, .sheet-close, .fab, .history-item').forEach(el => {
      if (!el.hasAttribute('tabindex') && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        el.setAttribute('tabindex', '0');
      }
    });

    // Arrow key navigation between cards
    document.addEventListener('keydown', (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      const focusableCards = Array.from(document.querySelectorAll('.card:focus-within, .card:focus'));
      if (focusableCards.length === 0) return;

      const currentIndex = elements.cards.indexOf(focusableCards[0]);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % elements.cards.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + elements.cards.length) % elements.cards.length;
      }

      const nextCard = elements.cards[nextIndex];
      const nextExpand = nextCard.querySelector('.card-expand');
      if (nextExpand) nextExpand.focus();
    });
  }

  // ─── Resize Handler ───
  function initResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Close sheet on resize to desktop
        if (window.innerWidth >= 768 && state.activeSheet) {
          closeSheet();
        }
        // Update grid layout
        updateGridLayout();
      }, 150);
    });
  }

  function updateGridLayout() {
    // Force reflow for CSS grid changes
    const grid = document.querySelector('.dashboard-grid');
    if (grid) {
      grid.style.display = 'none';
      grid.offsetHeight; // Force reflow
      grid.style.display = '';
    }
  }

  // ─── Toast Notifications ───
  function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    const iconSvg = type === 'success'
      ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ─── Utility ───
  function updateLastUpdated() {
    const el = document.getElementById('lastUpdated');
    if (el && window.DASHBOARD_GENERATED_AT) {
      el.textContent = `Last updated: ${window.DASHBOARD_GENERATED_AT}`;
    }
  }

  // ─── Global Refresh Function ───
  window.refreshDashboard = function() {
    triggerRefresh();
  };

  // Expose for debugging
  window.QSECDashboard = {
    showToast,
    openSheet,
    closeSheet,
    refresh: triggerRefresh,
  };

  init();
})();