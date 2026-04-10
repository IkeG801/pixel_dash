# Pixel Dash 🎮

A fast-paced pixel-art platformer game built with vanilla JavaScript and Canvas. Navigate through challenging levels, collect coins, and unlock special cube skins!

## Current Version

- **v.0.8.9**
- Displayed on the home screen (main menu)
- Update this version string before each commit and push

## Features

### Game Mechanics
- **Smooth Platforming**: Precise controls with coyote time and jump buffering for responsive gameplay
- **Multiple Platform Types**:
  - Regular platforms (stone with moss)
  - Crumbling platforms (disappear after landing)
  - Bouncy platforms (slime - extra bounce height)
  - Ice platforms (slippery surface)
  - Magma geyser platforms (warning + eruption hazard cycle)
  - Elevator platforms (vertical travel in Sky Kingdom)
  - Glitch platforms (single A↔B teleport platform with warning phase)

- **Collectibles & Power-ups**:
  - Coins (earn currency for cube skins)
  - Jump Boost (enhanced jump height)
  - Coin Multiplier (double coin rewards)
  - Fly Mode (temporary flight ability)

- **90 Curated Levels Across 6 Kingdoms**:
  - Castle Kingdom (15)
  - Ice Kingdom (15)
  - Slime Kingdom (15)
  - Magma Kingdom (15)
  - Sky Kingdom (15)
  - Glitch Kingdom (15)

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
4. **Progress**: Complete all 90 levels to master the kingdoms

## Game States

- **Menu**: Start screen with level/shop access
- **Playing**: Active gameplay
- **Level Complete**: Level finished, choice to continue
- **Game Over**: Fell or hit hazards, retry level
- **Shop**: Browse and purchase cube skins
- **Level Select**: Choose any unlocked level
- **Settings**: Audio controls and tuning

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

## Testing

The game includes a comprehensive test suite to ensure reliability and prevent regressions.

### Running Tests

```bash
# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- **100+ Unit Tests**: Core game mechanics (physics, collision, state management)
- **Integration Tests**: Player data persistence, game flow, level progression
- **CI/CD Pipeline**: Automated testing on every push, auto-deployment on success

### Test Suite Stats

- **Game Constants & Physics**: 20+ tests
- **Collision Detection**: 10+ tests
- **Player Movement & Jumping**: 30+ tests  
- **Level Progression**: 15+ tests
- **Data Persistence**: 20+ tests
- **Integration Scenarios**: 25+ tests

### Documentation

- **[SETUP.md](./SETUP.md)** - Quick start guide for running tests
- **[TESTING.md](./TESTING.md)** - Comprehensive testing documentation
- **[.github/workflows/test-and-deploy.yml](./.github/workflows/test-and-deploy.yml)** - CI/CD configuration

### Continuous Integration

Every push to the repository triggers:
1. ✅ Automated test suite (Node.js 16.x, 18.x, 20.x)
2. ✅ Code coverage analysis
3. ✅ Automatic deployment to GitHub Pages (on passing tests)
4. ✅ Verification of deployed game

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

Project creator: Isaac (IkeG801)

### Media and Asset Credits

- Soundtrack (all current music files):
  - `assets/music/high_score_run.mp3` (in game: menu/castle)
  - `assets/music/frozen_ascent.mp3` (in game: ice kingdom)
  - `assets/music/squelchy_basin_run.mp3` (in game: slime kingdom)
  - `assets/music/Below_the_Obsidian_Peak.mp3` (in game: magma kingdom)
  - `assets/music/Seven_Thousand_Feet.mp3` (not in game yet)
  - `assets/music/Crashing_the_Cartridge.mp3` (not in game yet)
- Attribution: Soundtrack generated with Google Gemini (credited per project instruction when no better embedded MP3 metadata is available in this environment)
- Pixel art and in-game UI graphics: Original game art created for this project (player cube variants, platforms, hazards, icons, and particle visuals)
- Sound effects (jump, power-ups, death, level complete, crumble, and variants): Synthesized in code using the Web Audio API in `src/game.js`

### Font Credits

- Silkscreen (used in web build): by Jason Kottke, distributed via Google Fonts under the SIL Open Font License 1.1
- Press Start 2P (used in standalone build): by CodeMan38, distributed via Google Fonts under the SIL Open Font License 1.1

### AI and Development Tooling Credits

- GitHub Copilot (GPT-5.3-Codex) used for implementation support, refactoring, debugging, and documentation drafting
- Google Gemini credited for generating the soundtrack noted above
- Core build/test tooling and libraries used by the project:
  - esbuild (standalone build/minification)
  - Jest + jest-environment-jsdom (automated testing)
  - HTML5 Canvas API, Web Audio API, and localStorage API (runtime platform features)

## Recent Major Updates

- Added Magma Kingdom with lava/volcano visuals and magma geyser hazards
- Added Sky Kingdom with vertical layouts and elevator platform mechanics
- Added Glitch Kingdom with motherboard aesthetic, cyber-neon palette, and glitch platform teleport logic
- Added kingdom-specific background rendering and per-kingdom music routing
- Added geometry sanity checks for level playability and spawn safety
- Added standalone build output with embedded assets/music

## Roadmap

- [ ] Leaderboard system
- [ ] Achievement expansion
- [ ] Level editor
- [ ] Additional challenge modifiers
- [ ] Difficulty modes

## Support

For issues or feedback, please open an issue on GitHub.

---

**Play it now!** Open `index.html` in your browser to start gaming.
