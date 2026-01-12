# Flip 7 Calculator

A Progressive Web App for calculating optimal hit/stay decisions in the Flip 7 card game.

## Features

- **Real-time EV calculation** - Computes expected value of hitting vs staying
- **Bust probability tracking** - Shows your risk of drawing a duplicate
- **Card tracking** - Tap grids to track your cards and all revealed cards
- **Modifier support** - Second Chance and X2 modifier calculations
- **Flip 7 bonus** - Factors in the 15-point bonus when close to 7 cards
- **Offline support** - Works without internet after first load
- **Installable** - Add to home screen on Android for app-like experience

## Local Development

```bash
# Start a local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

## Deployment

### Option 1: GitHub Pages (Recommended)

1. Create a new GitHub repository
2. Push this code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/flip7-calculator.git
   git push -u origin main
   ```
3. Go to repository Settings > Pages
4. Select "Deploy from a branch" > "main" > "/ (root)"
5. Your app will be live at `https://YOUR_USERNAME.github.io/flip7-calculator/`

### Option 2: Netlify (Drag & Drop)

1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire `flip7-calculator` folder onto the page
3. Your app will be deployed instantly with a unique URL

### Option 3: Vercel

```bash
npx vercel
```

## Installing on Android

1. Open the deployed URL in Chrome on your Android phone
2. Tap the three-dot menu (⋮)
3. Select "Add to Home Screen"
4. The app will appear as an icon and launch fullscreen

## How to Use

1. **My Cards**: Tap cards 0-12 to mark which cards you have
2. **All Revealed**: Tap to track all cards visible on the table (yours + others)
3. **Modifiers**: Toggle if you have Second Chance or X2
4. **Recommendation**: Shows HIT or STAY based on expected value

**Tips:**
- Long-press or right-click to remove/decrement cards
- Watch for pulsing cards in "My Cards" - these are danger cards (duplicates exist)
- The app calculates Flip 7 bonus potential when you have 5+ cards

## Strategy Math

The calculator uses expected value (EV) to determine optimal play:

```
EV(hit) = P(not bust) × (current_points + expected_new_card + flip7_bonus_potential)
EV(stay) = current_points

Recommendation: HIT if EV(hit) > EV(stay)
```

Second Chance effectively gives you two "lives" - the bust probability becomes squared.

## Deck Composition

- Number cards 0-12: Card N appears N times (0 and 1 appear once)
- Total number cards: 79
- Special cards: 7 modifiers, 3 freeze, 3 flip three, 3 second chance

