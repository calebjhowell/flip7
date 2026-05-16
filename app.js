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
    modifierBonus: 0, // Sum of +2/+4/+6/+8/+10 cards
    specialCardsRevealed: 0, // Count of special cards seen (max 16)
    removeMode: false, // When true, tapping removes cards instead of adding
    archivedCounts: {}, // Number cards removed from deck by previous rounds
    archivedSpecialCards: 0, // Special cards removed from deck by previous rounds
    roundNumber: 1
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
      revealedGridWrapper: document.getElementById('revealedGridWrapper'),
      secondChanceBtn: document.getElementById('secondChanceBtn'),
      x2Btn: document.getElementById('x2Btn'),
      modifierInput: document.getElementById('modifierInput'),
      modifierValue: document.getElementById('modifierValue'),
      modifierMinus: document.getElementById('modifierMinus'),
      modifierPlus: document.getElementById('modifierPlus'),
      specialValue: document.getElementById('specialValue'),
      specialMinus: document.getElementById('specialMinus'),
      specialPlus: document.getElementById('specialPlus'),
      resetBtn: document.getElementById('resetBtn'),
      endRoundBtn: document.getElementById('endRoundBtn'),
      shuffleBtn: document.getElementById('shuffleBtn'),
      roundBadge: document.getElementById('roundBadge'),
      removeModeBtn: null // Created dynamically
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
    
    // Revealed cards grid (0-12) with remove button after
    elements.revealedGrid.innerHTML = '';
    for (let i = 0; i <= 12; i++) {
      const btn = createCardButton(i, 'revealed');
      elements.revealedGrid.appendChild(btn);
    }
    
    // Create remove mode button and add after grid
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-mode-btn';
    removeBtn.id = 'removeModeBtn';
    removeBtn.dataset.active = 'false';
    removeBtn.title = 'Remove Mode';
    removeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      </svg>
    `;
    elements.revealedGridWrapper.appendChild(removeBtn);
    elements.removeModeBtn = removeBtn;
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
    // My cards grid - tap to toggle (unique cards only)
    elements.myCardsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.card-btn');
      if (!btn) return;
      
      const num = parseInt(btn.dataset.number);
      toggleMyCard(num);
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
    
    // Right click to decrement on desktop (always works regardless of mode)
    elements.revealedGrid.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const btn = e.target.closest('.card-btn');
      if (!btn) return;
      
      const num = parseInt(btn.dataset.number);
      decrementRevealed(num);
    });
    
    // Remove mode toggle (only affects revealed grid)
    elements.removeModeBtn.addEventListener('click', () => {
      state.removeMode = !state.removeMode;
      elements.removeModeBtn.dataset.active = state.removeMode;
      elements.revealedGrid.classList.toggle('remove-mode', state.removeMode);
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
    
    // Modifier bonus controls (max 38: +2+4+6+8+8+10)
    const MAX_MODIFIER_BONUS = 38;
    const MAX_SPECIAL_CARDS = 16;
    
    elements.modifierMinus.addEventListener('click', () => {
      if (state.modifierBonus >= 2) {
        state.modifierBonus -= 2;
        updateUI();
      }
    });
    
    elements.modifierPlus.addEventListener('click', () => {
      if (state.modifierBonus < MAX_MODIFIER_BONUS) {
        state.modifierBonus += 2;
        updateUI();
      }
    });
    
    // Special cards revealed controls (max 16 total across all rounds)
    elements.specialMinus.addEventListener('click', () => {
      if (state.specialCardsRevealed > 0) {
        state.specialCardsRevealed--;
        updateUI();
      }
    });

    elements.specialPlus.addEventListener('click', () => {
      const remainingSpecial = MAX_SPECIAL_CARDS - state.archivedSpecialCards;
      if (state.specialCardsRevealed < remainingSpecial) {
        state.specialCardsRevealed++;
        updateUI();
      }
    });

    // End Round: archive current revealed cards and start fresh
    elements.endRoundBtn.addEventListener('click', endRound);

    // Shuffle Deck: return previous round cards to deck, keep current round
    elements.shuffleBtn.addEventListener('click', shuffleDeck);

    // Reset button
    elements.resetBtn.addEventListener('click', resetState);
  }
  
  /**
   * Toggle a card in my hand (unique cards only - duplicates would bust)
   */
  function toggleMyCard(num) {
    const index = state.myCards.indexOf(num);
    
    if (index === -1) {
      // Add to my cards
      const maxCount = deckInfo.composition[num];
      const archivedCount = state.archivedCounts[num] || 0;
      const currentRevealed = state.revealedCounts[num] || 0;

      // Don't exceed deck limit (accounting for cards archived from previous rounds)
      if (currentRevealed + archivedCount >= maxCount) return;
      
      state.myCards.push(num);
      
      // Also add to revealed counts
      state.revealedCounts[num] = currentRevealed + 1;
    } else {
      // Remove from my cards
      state.myCards.splice(index, 1);
      
      // Also decrement revealed counts
      if (state.revealedCounts[num]) {
        state.revealedCounts[num]--;
        if (state.revealedCounts[num] <= 0) {
          delete state.revealedCounts[num];
        }
      }
    }
    
    updateUI();
  }
  
  /**
   * Increment revealed count for a card
   */
  function incrementRevealed(num) {
    const maxCount = deckInfo.composition[num];
    const archivedCount = state.archivedCounts[num] || 0;
    const current = state.revealedCounts[num] || 0;

    if (current + archivedCount < maxCount) {
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
    state.modifierBonus = 0;
    state.specialCardsRevealed = 0;
    state.removeMode = false;
    state.archivedCounts = {};
    state.archivedSpecialCards = 0;
    state.roundNumber = 1;

    elements.secondChanceBtn.dataset.active = false;
    elements.x2Btn.dataset.active = false;
    elements.removeModeBtn.dataset.active = false;
    elements.revealedGrid.classList.remove('remove-mode');

    updateUI();
  }

  function endRound() {
    // Merge current round's revealed cards into the archive
    for (const [num, count] of Object.entries(state.revealedCounts)) {
      state.archivedCounts[num] = (state.archivedCounts[num] || 0) + count;
    }
    state.archivedSpecialCards += state.specialCardsRevealed;
    state.roundNumber++;

    // Clear current round
    state.myCards = [];
    state.revealedCounts = {};
    state.hasSecondChance = false;
    state.hasX2 = false;
    state.modifierBonus = 0;
    state.specialCardsRevealed = 0;
    state.removeMode = false;

    elements.secondChanceBtn.dataset.active = false;
    elements.x2Btn.dataset.active = false;
    elements.removeModeBtn.dataset.active = false;
    elements.revealedGrid.classList.remove('remove-mode');

    updateUI();
  }

  function shuffleDeck() {
    // Return all previous-round cards to the deck; current round stays as-is
    state.archivedCounts = {};
    state.archivedSpecialCards = 0;
    updateUI();
  }

  function getCombinedRevealedCounts() {
    const combined = { ...state.archivedCounts };
    for (const [num, count] of Object.entries(state.revealedCounts)) {
      combined[num] = (combined[num] || 0) + count;
    }
    return combined;
  }
  
  /**
   * Update the UI based on current state
   */
  function updateUI() {
    // Calculate strategy using combined current + archived revealed counts
    const result = Flip7Strategy.calculateStrategy({
      myCards: state.myCards,
      revealedCounts: getCombinedRevealedCounts(),
      hasSecondChance: state.hasSecondChance,
      hasX2: state.hasX2,
      modifierBonus: state.modifierBonus,
      specialCardsRevealed: state.specialCardsRevealed + state.archivedSpecialCards
    });
    
    // Update round badge and modifier displays
    elements.roundBadge.textContent = `R${state.roundNumber}`;
    elements.modifierValue.textContent = `+${state.modifierBonus}`;
    elements.specialValue.textContent = state.specialCardsRevealed;
    
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
      const isSelected = state.myCards.includes(num);
      const isDanger = result.dangerCards && result.dangerCards.includes(num);
      
      btn.classList.toggle('my-card', isSelected);
      btn.classList.toggle('danger', isSelected && isDanger);
      
      // Remove any existing badge (my cards don't need count badges)
      const existingBadge = btn.querySelector('.count-badge');
      if (existingBadge) existingBadge.remove();
    });
    
    // Update revealed cards grid
    const revealedBtns = elements.revealedGrid.querySelectorAll('.card-btn');
    revealedBtns.forEach(btn => {
      const num = parseInt(btn.dataset.number);
      const count = state.revealedCounts[num] || 0;
      const maxCount = deckInfo.composition[num];
      const archivedCount = state.archivedCounts[num] || 0;
      const isMaxed = count + archivedCount >= maxCount;
      
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

