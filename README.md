# Pixel Dash 🎮

A fast-paced pixel-art platformer game built with vanilla JavaScript and Canvas. Navigate through challenging levels, collect coins, and unlock special cube skins!

## Features

### Game Mechanics
- **Smooth Platforming**: Precise controls with coyote time and jump buffering for responsive gameplay
- **Multiple Platform Types**:
  - Regular platforms (stone with moss)
  - Crumbling platforms (disappear after landing)
  - Bouncy platforms (slime - extra bounce height)
  - Ice platforms (slippery surface)
  - Fan platforms (provide upward boost)

- **Collectibles & Power-ups**:
  - Coins (earn currency for cube skins)
  - Jump Boost (enhanced jump height)
  - Coin Multiplier (double coin rewards)
  - Fly Mode (temporary flight ability)

- **13+ Curated Levels**: Progressive difficulty from "Getting Started" to "Slime Bounce"

### Customization
- **Cube Skins Shop**: Unlock 20+ different cube designs with unique visual effects
  - Shiny skins (diamond, solid gold, crystal)
  - Special effects (neon glow, ethereal, wisp)
  - Challenge point skins (quantum, nebula, radiant)
- **Challenge Points System**: Earn through achievements and special challenges
- **Persistent Player Data**: Automatic save/load via localStorage

### Additional Features
- **Touch Controls**: Mobile-friendly gameplay with on-screen buttons
- **Responsive Design**: Works on desktop and mobile devices
- **Pixel Art Aesthetic**: Retro pixel-perfect graphics with Silkscreen font
- **Dynamic Camera**: Smooth following camera system
- **Particle Effects**: Visual feedback for jumps, coin collection, and power-ups

## Getting Started

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/pixel_dash.git
   cd pixel_dash
   ```

2. **Run a local server**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Or use Node.js with http-server
   npx http-server
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8000`

### File Structure

```
pixel_dash/
├── index.html           # Main HTML entry point
├── package.json         # Project metadata
├── src/
│   ├── game.js         # Game engine and logic
│   └── styles.css      # Game styles
├── README.md           # This file
└── .gitignore          # Git ignore rules
```

## How to Play

### Controls
- **Arrow Keys** or **WASD**: Move left/right
- **Up**, **W**, or **Space**: Jump
- **M**: Return to menu

### Mobile
- **Left Side**: Move left
- **Center**: Move right  
- **Right Side**: Jump

### Gameplay Goals
1. **Reach the Flag**: Navigate to the end flag to complete each level
2. **Collect Coins**: Gather coins for currency
3. **Unlock Skins**: Use coins to unlock unique cube designs
4. **Progress**: Complete all 13 levels to master the game

## Game States

- **Menu**: Start screen with level/shop access
- **Playing**: Active gameplay
- **Level Complete**: Level finished, choice to continue
- **Game Over**: Fell or hit hazards, retry level
- **Shop**: Browse and purchase cube skins
- **Level Select**: Choose any unlocked level

## Technical Details

### Architecture
- **Canvas-based Rendering**: Pure 2D Canvas API, no external graphics libraries
- **Game Loop**: 60 FPS with requestAnimationFrame
- **Event-Driven Input**: Keyboard and touch event handling
- **State Machine**: Clear state management for game modes

### Technologies
- **HTML5 Canvas**: Graphics and animations
- **Vanilla JavaScript**: No frameworks or dependencies (except SDK files)
- **localStorage API**: Player data persistence
- **Web Audio API**: Sound effects and music

### Performance
- Optimized rendering with viewport culling
- Efficient collision detection
- Particle system with lifecycle management
- Minimal memory footprint

## Development

### Adding New Levels

Edit `src/game.js` and add to the `INITIAL_LEVELS` array:

```javascript
{
  name: "Your Level Name",
  platforms: [
    { x: 0, y: 500, w: 150, h: 20, type: 0 }, // x, y, width, height, type
    // type: 0=normal, 2=crumbling, 3=fan, 4=ice, 5=slime
  ],
  coins: [
    { x: 200, y: 380, w: 16, h: 16, collected: false }
  ],
  spikes: [
    { x: 150, y: 520, w: 40, h: 16, type: 0 }
  ],
  obstacles: [],
  powerups: []
}
```

### Adding New Cube Skins

Edit the `CUBE_SKINS` object in `src/game.js`:

```javascript
myskin: {
  name: 'My Skin',
  price: 50,
  bodyColor: '#ff0000',
  bodyStroke: '#cc0000',
  faceColor: '#ffcccc',
  faceStroke: '#ff6666',
  description: 'A custom skin'
}
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Touch controls supported

## Performance Targets

- Desktop: 60 FPS consistent
- Mobile: 30+ FPS on mid-range devices
- Level load time: < 100ms
- Memory usage: < 50MB

## License

Proprietary - All rights reserved

## Credits

Created by Isaac (IkeG801)  
Last Updated: March 2026

## Roadmap

- [ ] Daily challenge procedural levels
- [ ] Leaderboard system
- [ ] Achievement tracking
- [ ] Level editor
- [ ] Sound toggle
- [ ] Settings menu
- [ ] Difficulty modes

## Support

For issues or feedback, please open an issue on GitHub.

---

**Play it now!** Open `index.html` in your browser to start gaming.
