/**
 * Flip 7 Strategy Calculator
 * 
 * Deck composition:
 * - Number cards 0-12: each number N has N cards (except 0 and 1 have 1 each)
 * - Total number cards: 1+1+2+3+4+5+6+7+8+9+10+11+12 = 79
 * - Special cards: 7 modifiers, 3 freeze, 3 flip three, 3 second chance = 16
 * - Total deck: 95 cards (we only track number cards for bust calculation)
 */

const Flip7Strategy = (() => {
  // Deck composition: index = card number, value = count in deck
  const DECK_COMPOSITION = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const TOTAL_NUMBER_CARDS = DECK_COMPOSITION.reduce((a, b) => a + b, 0); // 79
  const FLIP_7_BONUS = 15;
  
  /**
   * Calculate the remaining unknown cards in the deck
   * @param {Object} revealedCounts - Map of card number to count revealed
   * @returns {Object} Map of card number to count remaining
   */
  function getUnknownPool(revealedCounts) {
    const pool = {};
    let totalRemaining = 0;
    
    for (let i = 0; i <= 12; i++) {
      const revealed = revealedCounts[i] || 0;
      const remaining = DECK_COMPOSITION[i] - revealed;
      pool[i] = Math.max(0, remaining);
      totalRemaining += pool[i];
    }
    
    pool.total = totalRemaining;
    return pool;
  }
  
  /**
   * Calculate bust probability
   * @param {Array<number>} myCards - Array of card numbers I have
   * @param {Object} unknownPool - Map of remaining cards
   * @returns {number} Probability of busting (0-1)
   */
  function calculateBustProbability(myCards, unknownPool) {
    if (unknownPool.total === 0) return 0;
    
    let dangerCards = 0;
    
    for (const card of myCards) {
      dangerCards += unknownPool[card] || 0;
    }
    
    return dangerCards / unknownPool.total;
  }
  
  /**
   * Calculate expected value of a draw (if we don't bust)
   * @param {Array<number>} myCards - Current cards
   * @param {Object} unknownPool - Remaining cards
   * @param {boolean} hasX2 - Whether we have X2 modifier
   * @returns {number} Expected point value of next card (given no bust)
   */
  function calculateExpectedDrawValue(myCards, unknownPool, hasX2) {
    if (unknownPool.total === 0) return 0;
    
    const myCardSet = new Set(myCards);
    let weightedSum = 0;
    let safeCardCount = 0;
    
    for (let i = 0; i <= 12; i++) {
      // Skip cards that would bust us
      if (myCardSet.has(i)) continue;
      
      const remaining = unknownPool[i] || 0;
      if (remaining > 0) {
        weightedSum += i * remaining;
        safeCardCount += remaining;
      }
    }
    
    if (safeCardCount === 0) return 0;
    
    const expectedValue = weightedSum / safeCardCount;
    return hasX2 ? expectedValue * 2 : expectedValue;
  }
  
  /**
   * Calculate current point total
   * @param {Array<number>} myCards - Array of card numbers
   * @param {boolean} hasX2 - Whether X2 modifier is active
   * @returns {number} Current point total
   */
  function calculateCurrentPoints(myCards, hasX2) {
    const sum = myCards.reduce((a, b) => a + b, 0);
    return hasX2 ? sum * 2 : sum;
  }
  
  /**
   * Calculate probability of reaching Flip 7
   * @param {Array<number>} myCards - Current unique cards
   * @param {Object} unknownPool - Remaining cards
   * @returns {number} Rough probability factor (0-1)
   */
  function calculateFlip7Potential(myCards, unknownPool) {
    const cardsNeeded = 7 - myCards.length;
    
    if (cardsNeeded <= 0) return 1;
    if (cardsNeeded > 3) return 0; // Too far away
    
    const myCardSet = new Set(myCards);
    
    // Count how many distinct safe cards remain
    let distinctSafeCards = 0;
    let totalSafeCards = 0;
    
    for (let i = 0; i <= 12; i++) {
      if (!myCardSet.has(i) && unknownPool[i] > 0) {
        distinctSafeCards++;
        totalSafeCards += unknownPool[i];
      }
    }
    
    // If not enough distinct cards available, can't reach 7
    if (distinctSafeCards < cardsNeeded) return 0;
    
    // Rough approximation: probability decreases with each card needed
    // This is simplified - true calculation would be complex
    const baseProbability = totalSafeCards / unknownPool.total;
    
    // Scale by how many we need and how risky it is
    const scaleFactor = Math.pow(0.7, cardsNeeded);
    
    return baseProbability * scaleFactor;
  }
  
  /**
   * Calculate effective bust probability with Second Chance
   * If we have Second Chance, we need to bust twice to actually bust
   * @param {number} pBust - Base bust probability
   * @param {Array<number>} myCards - Current cards
   * @param {Object} unknownPool - Remaining cards
   * @returns {number} Effective bust probability
   */
  function calculateEffectiveBustWithSecondChance(pBust, myCards, unknownPool) {
    // After using Second Chance, we discard the duplicate
    // Then we'd need to draw another duplicate
    // The second bust probability depends on what card caused the first bust
    
    // Simplified: assume if we bust once, second bust prob is similar
    // P(actual bust) = P(bust1) * P(bust2 | bust1)
    // Since we can hit multiple times with Second Chance, this is complex
    // 
    // For single-hit analysis: effective bust = pBust * pBust (simplified)
    // This underestimates safety but is a reasonable approximation
    return pBust * pBust * 0.8; // Small factor for averaging effect
  }
  
  /**
   * Main strategy calculation
   * @param {Object} params
   * @param {Array<number>} params.myCards - Cards I have
   * @param {Object} params.revealedCounts - All revealed cards count
   * @param {boolean} params.hasSecondChance - Second Chance modifier
   * @param {boolean} params.hasX2 - X2 modifier
   * @returns {Object} Strategy recommendation
   */
  function calculateStrategy({ myCards, revealedCounts, hasSecondChance, hasX2 }) {
    // Edge cases
    if (myCards.length === 0) {
      return {
        recommendation: 'HIT',
        bustProbability: 0,
        effectiveBustProbability: 0,
        evHit: TOTAL_NUMBER_CARDS / 13 * (hasX2 ? 2 : 1), // ~6 points expected
        evStay: 0,
        confidence: 1,
        flip7Potential: 0,
        dangerCards: []
      };
    }
    
    // Already have 7 unique cards - game over, you win
    if (myCards.length >= 7) {
      const currentPoints = calculateCurrentPoints(myCards, hasX2) + FLIP_7_BONUS;
      return {
        recommendation: 'STAY',
        bustProbability: 0,
        effectiveBustProbability: 0,
        evHit: currentPoints,
        evStay: currentPoints,
        confidence: 1,
        flip7Potential: 1,
        dangerCards: []
      };
    }
    
    const unknownPool = getUnknownPool(revealedCounts);
    const currentPoints = calculateCurrentPoints(myCards, hasX2);
    
    // Calculate bust probability
    const pBust = calculateBustProbability(myCards, unknownPool);
    const effectivePBust = hasSecondChance 
      ? calculateEffectiveBustWithSecondChance(pBust, myCards, unknownPool)
      : pBust;
    
    // Calculate expected value of drawing a card
    const expectedDrawValue = calculateExpectedDrawValue(myCards, unknownPool, hasX2);
    
    // Calculate Flip 7 potential bonus
    const flip7Potential = calculateFlip7Potential(myCards, unknownPool);
    const flip7ExpectedBonus = flip7Potential * FLIP_7_BONUS;
    
    // Expected value calculations
    const pNotBust = 1 - effectivePBust;
    
    // EV of hitting: probability of not busting * (current + expected new card + flip7 bonus potential)
    // Plus probability of busting * 0
    const evHit = pNotBust * (currentPoints + expectedDrawValue + flip7ExpectedBonus);
    
    // EV of staying: just our current points
    const evStay = currentPoints;
    
    // Determine recommendation
    const recommendation = evHit > evStay ? 'HIT' : evHit < evStay ? 'STAY' : 'TOSS-UP';
    
    // Confidence: how sure are we? (normalized difference)
    const confidence = evStay > 0 
      ? Math.min(1, Math.abs(evHit - evStay) / evStay)
      : (evHit > 0 ? 1 : 0);
    
    // Find danger cards (cards in my hand that have remaining copies)
    const dangerCards = myCards.filter(card => (unknownPool[card] || 0) > 0);
    
    return {
      recommendation,
      bustProbability: pBust,
      effectiveBustProbability: effectivePBust,
      evHit,
      evStay,
      confidence,
      flip7Potential,
      dangerCards,
      unknownPool
    };
  }
  
  /**
   * Get deck info for validation
   */
  function getDeckInfo() {
    return {
      composition: [...DECK_COMPOSITION],
      totalCards: TOTAL_NUMBER_CARDS,
      flip7Bonus: FLIP_7_BONUS
    };
  }
  
  return {
    calculateStrategy,
    getDeckInfo,
    getUnknownPool,
    calculateBustProbability,
    calculateCurrentPoints
  };
})();

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Flip7Strategy;
}

