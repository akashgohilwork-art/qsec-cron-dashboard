/**
 * QSEC Cron Dashboard - Minimal JavaScript
 * Handles history expand/collapse with smooth animation
 */

(function() {
  'use strict';

  // Initialize expand buttons
  function initExpandButtons() {
    const buttons = document.querySelectorAll('.card-expand');

    buttons.forEach(btn => {
      // Click handler
      btn.addEventListener('click', handleExpandClick);

      // Keyboard handler for accessibility
      btn.addEventListener('keydown', handleExpandKeydown);
    });
  }

  function handleExpandClick(event) {
    const btn = event.currentTarget;
    const targetId = btn.getAttribute('aria-controls');
    const history = document.getElementById(targetId);

    if (!history) return;

    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const newExpanded = !expanded;

    btn.setAttribute('aria-expanded', newExpanded);
    history.open = newExpanded;

    // Update button text
    const textSpan = btn.querySelector('.expand-text');
    if (textSpan) {
      const count = history.querySelectorAll('.history-item').length;
      textSpan.textContent = newExpanded
        ? `Hide history (${count} previous runs)`
        : `Show history (${count} previous runs)`;
    }
  }

  function handleExpandKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
    }
  }

  // Initialize details/summary fallback for no-JS
  function initDetailsFallback() {
    const details = document.querySelectorAll('.card-history');

    details.forEach(detail => {
      const summary = detail.querySelector('summary');
      if (summary) {
        summary.style.display = 'none'; // Hide native summary, we use custom button
      }
    });
  }

  // Smooth height animation for details (progressive enhancement)
  function initDetailsAnimation() {
    if (!('animate' in Element.prototype)) return;

    const detailsElements = document.querySelectorAll('.card-history');

    detailsElements.forEach(detail => {
      detail.addEventListener('toggle', () => {
        if (detail.open) {
          animateOpen(detail);
        } else {
          animateClose(detail);
        }
      });
    });
  }

  function animateOpen(detail) {
    const content = detail.querySelector('.history-list');
    if (!content) return;

    content.style.overflow = 'hidden';
    content.style.height = '0';

    const targetHeight = content.scrollHeight;

    content.animate(
      { height: ['0px', `${targetHeight}px`] },
      { duration: 200, easing: 'ease-out', fill: 'forwards' }
    ).onfinish = () => {
      content.style.height = '';
      content.style.overflow = '';
    };
  }

  function animateClose(detail) {
    const content = detail.querySelector('.history-list');
    if (!content) return;

    const startHeight = content.scrollHeight;
    content.style.overflow = 'hidden';
    content.style.height = `${startHeight}px`;

    // Force reflow
    content.offsetHeight;

    content.animate(
      { height: [`${startHeight}px`, '0px'] },
      { duration: 150, easing: 'ease-in', fill: 'forwards' }
    ).onfinish = () => {
      if (!detail.open) {
        content.style.height = '';
        content.style.overflow = '';
      }
    };
  }

  // Handle reduced motion preference
  function respectsReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Initialize everything
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    initDetailsFallback();

    if (!respectsReducedMotion()) {
      initDetailsAnimation();
    }

    initExpandButtons();

    // Log ready for debugging
    console.log('[QSEC Dashboard] Initialized');
  }

  init();
})();