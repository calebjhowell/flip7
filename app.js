/**
 * Flip 7 Calculator - UI Logic
 */

const App = (() => {
  // State
  const state = {
    myCards: [], // Array of card numbers I have (can have duplicates)
    revealedCounts: {}, // Map of card number to total count revealed (includes mine)
    hasSecondChance: false,
    hasX2: false,
    removeMode: false // When true, tapping removes cards instead of adding
  };
  
  // DOM Elements
  let elements = {};
  
  // Deck info
  const deckInfo = Flip7Strategy.getDeckInfo();
  
  /**
   * Initialize the app
   */
  function init() {
    cacheElements();
    renderCardGrids();
    bindEvents();
    updateUI();
    registerServiceWorker();
  }
  
  /**
   * Cache DOM elements
   */
  function cacheElements() {
    elements = {
      recommendation: document.getElementById('recommendation'),
      bustProb: document.getElementById('bustProb'),
      evHit: document.getElementById('evHit'),
      evStay: document.getElementById('evStay'),
      myCardsGrid: document.getElementById('myCardsGrid'),
      revealedGrid: document.getElementById('revealedGrid'),
      myCardCount: document.getElementById('myCardCount'),
      revealedCount: document.getElementById('revealedCount'),
      secondChanceBtn: document.getElementById('secondChanceBtn'),
      x2Btn: document.getElementById('x2Btn'),
      resetBtn: document.getElementById('resetBtn'),
      removeModeBtn: document.getElementById('removeModeBtn')
    };
  }
  
  /**
   * Render the card grids
   */
  function renderCardGrids() {
    // My cards grid (0-12)
    elements.myCardsGrid.innerHTML = '';
    for (let i = 0; i <= 12; i++) {
      const btn = createCardButton(i, 'my');
      elements.myCardsGrid.appendChild(btn);
    }
    
    // Revealed cards grid (0-12)
    elements.revealedGrid.innerHTML = '';
    for (let i = 0; i <= 12; i++) {
      const btn = createCardButton(i, 'revealed');
      elements.revealedGrid.appendChild(btn);
    }
  }
  
  /**
   * Create a card button element
   */
  function createCardButton(number, type) {
    const btn = document.createElement('button');
    btn.className = 'card-btn';
    btn.dataset.number = number;
    btn.dataset.type = type;
    btn.textContent = number;
    btn.setAttribute('aria-label', `Card ${number}`);
    return btn;
  }
  
  /**
   * Bind event handlers
   */
  function bindEvents() {
    // My cards grid - tap to add card (or remove in remove mode)
    elements.myCardsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.card-btn');
      if (!btn) return;
      
      const num = parseInt(btn.dataset.number);
      
      if (state.removeMode) {
        removeMyCard(num);
      } else {
        addMyCard(num);
      }
    });
    
    // Revealed cards grid - tap to increment (or decrement in remove mode)
    elements.revealedGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.card-btn');
      if (!btn) return;
      
      const num = parseInt(btn.dataset.number);
      
      if (state.removeMode) {
        decrementRevealed(num);
      } else {
        if (!btn.classList.contains('maxed')) {
          incrementRevealed(num);
        }
      }
    });
    
    // Right click to remove/decrement on desktop (always works regardless of mode)
    elements.myCardsGrid.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const btn = e.target.closest('.card-btn');
      if (!btn) return;
      
      const num = parseInt(btn.dataset.number);
      removeMyCard(num);
    });
    
    elements.revealedGrid.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const btn = e.target.closest('.card-btn');
      if (!btn) return;
      
      const num = parseInt(btn.dataset.number);
      decrementRevealed(num);
    });
    
    // Remove mode toggle
    elements.removeModeBtn.addEventListener('click', () => {
      state.removeMode = !state.removeMode;
      elements.removeModeBtn.dataset.active = state.removeMode;
      document.body.classList.toggle('remove-mode', state.removeMode);
    });
    
    // Modifier toggles
    elements.secondChanceBtn.addEventListener('click', () => {
      state.hasSecondChance = !state.hasSecondChance;
      elements.secondChanceBtn.dataset.active = state.hasSecondChance;
      updateUI();
    });
    
    elements.x2Btn.addEventListener('click', () => {
      state.hasX2 = !state.hasX2;
      elements.x2Btn.dataset.active = state.hasX2;
      updateUI();
    });
    
    // Reset button
    elements.resetBtn.addEventListener('click', resetState);
  }
  
  /**
   * Add a card to my hand (allows duplicates)
   */
  function addMyCard(num) {
    const maxCount = deckInfo.composition[num];
    const currentRevealed = state.revealedCounts[num] || 0;
    
    // Don't exceed deck limit
    if (currentRevealed >= maxCount) return;
    
    // Add to my cards
    state.myCards.push(num);
    
    // Also add to revealed counts
    state.revealedCounts[num] = currentRevealed + 1;
    
    updateUI();
  }
  
  /**
   * Remove a card from my hand
   */
  function removeMyCard(num) {
    const index = state.myCards.indexOf(num);
    if (index !== -1) {
      state.myCards.splice(index, 1);
      
      // Also decrement revealed counts
      if (state.revealedCounts[num]) {
        state.revealedCounts[num]--;
        if (state.revealedCounts[num] <= 0) {
          delete state.revealedCounts[num];
        }
      }
      
      updateUI();
    }
  }
  
  /**
   * Increment revealed count for a card
   */
  function incrementRevealed(num) {
    const maxCount = deckInfo.composition[num];
    const current = state.revealedCounts[num] || 0;
    
    if (current < maxCount) {
      state.revealedCounts[num] = current + 1;
      updateUI();
    }
  }
  
  /**
   * Decrement revealed count for a card
   */
  function decrementRevealed(num) {
    if (state.revealedCounts[num] && state.revealedCounts[num] > 0) {
      // Don't go below the count of my cards of this number
      const myCardCount = state.myCards.filter(c => c === num).length;
      
      if (state.revealedCounts[num] > myCardCount) {
        state.revealedCounts[num]--;
        if (state.revealedCounts[num] <= 0) {
          delete state.revealedCounts[num];
        }
        updateUI();
      }
    }
  }
  
  /**
   * Reset all state
   */
  function resetState() {
    state.myCards = [];
    state.revealedCounts = {};
    state.hasSecondChance = false;
    state.hasX2 = false;
    state.removeMode = false;
    
    elements.secondChanceBtn.dataset.active = false;
    elements.x2Btn.dataset.active = false;
    elements.removeModeBtn.dataset.active = false;
    document.body.classList.remove('remove-mode');
    
    updateUI();
  }
  
  /**
   * Update the UI based on current state
   */
  function updateUI() {
    // Calculate strategy
    const result = Flip7Strategy.calculateStrategy({
      myCards: state.myCards,
      revealedCounts: state.revealedCounts,
      hasSecondChance: state.hasSecondChance,
      hasX2: state.hasX2
    });
    
    // Update recommendation badge
    const badge = elements.recommendation.querySelector('.recommendation-badge');
    const text = elements.recommendation.querySelector('.recommendation-text');
    
    badge.classList.remove('pending', 'hit', 'stay', 'toss-up');
    
    if (state.myCards.length === 0) {
      badge.classList.add('pending');
      text.textContent = 'SELECT CARDS';
    } else {
      badge.classList.add(result.recommendation.toLowerCase());
      text.textContent = result.recommendation;
    }
    
    // Update stats
    const bustDisplay = state.myCards.length > 0 
      ? `${(result.bustProbability * 100).toFixed(1)}%`
      : '--%';
    elements.bustProb.textContent = bustDisplay;
    
    const evHitDisplay = state.myCards.length > 0
      ? result.evHit.toFixed(1)
      : '--';
    elements.evHit.textContent = evHitDisplay;
    
    const evStayDisplay = state.myCards.length > 0
      ? result.evStay.toFixed(1)
      : '--';
    elements.evStay.textContent = evStayDisplay;
    
    // Update card counts
    elements.myCardCount.textContent = state.myCards.length;
    
    const totalRevealed = Object.values(state.revealedCounts).reduce((a, b) => a + b, 0);
    elements.revealedCount.textContent = totalRevealed;
    
    // Update my cards grid
    const myCardBtns = elements.myCardsGrid.querySelectorAll('.card-btn');
    myCardBtns.forEach(btn => {
      const num = parseInt(btn.dataset.number);
      const count = state.myCards.filter(c => c === num).length;
      const isSelected = count > 0;
      const isDanger = result.dangerCards && result.dangerCards.includes(num);
      const maxCount = deckInfo.composition[num];
      const totalRevealed = state.revealedCounts[num] || 0;
      const isMaxed = totalRevealed >= maxCount;
      
      btn.classList.toggle('my-card', isSelected);
      btn.classList.toggle('danger', isSelected && isDanger);
      btn.classList.toggle('maxed', isMaxed);
      
      // Update or create count badge
      let badge = btn.querySelector('.count-badge');
      
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'count-badge my-badge';
          btn.appendChild(badge);
        }
        badge.textContent = count;
      } else if (badge) {
        badge.remove();
      }
    });
    
    // Update revealed cards grid
    const revealedBtns = elements.revealedGrid.querySelectorAll('.card-btn');
    revealedBtns.forEach(btn => {
      const num = parseInt(btn.dataset.number);
      const count = state.revealedCounts[num] || 0;
      const maxCount = deckInfo.composition[num];
      const isMaxed = count >= maxCount;
      
      btn.classList.toggle('selected', count > 0);
      btn.classList.toggle('maxed', isMaxed);
      
      // Update or create count badge
      let badge = btn.querySelector('.count-badge');
      
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'count-badge';
          btn.appendChild(badge);
        }
        badge.textContent = count;
      } else if (badge) {
        badge.remove();
      }
    });
  }
  
  /**
   * Register service worker for offline capability
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service worker registered'))
        .catch(err => console.log('Service worker registration failed:', err));
    }
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Expose for debugging
  return {
    getState: () => ({ ...state }),
    reset: resetState
  };
})();

