# Glitch Kingdom - Design Planning

## Overview
- **Kingdom Theme**: Digital/Corrupted (motherboard, tech aesthetics)
- **Level Type**: Horizontal progression with vertical sections
- **Total Levels**: 15 (following pattern of other kingdoms)
- **Difficulty**: Advanced (post-Sky Kingdom)

## Platform Types
- **Type 8** (new): Glitch Platform - Teleports horizontally at same Y-level
  - Visible duration: ? ms
  - Invisible/glitch duration: ? ms
  - Teleport distance: ? px
  - Visual: Dark blue + yellow tech patterns, flashing/corrupted effect when transitioning

## Visual Theme

## Colors ✓ FINALIZED
- **Platforms**: Dark blue (#0f172a) with neon yellow (#ffff00) circuit patterns
- **Obstacles**: Cyber-green (#00ff41) with neon yellow (#ffff00) accents
- **End Flag**: Cyber-green (#00ff41) with neon yellow (#ffff00) highlights
- **Background**: Motherboard visualization (dark with blue/green traces, grid overlay)

### Music
- **Track**: "Digital Corruption" or "Circuit Overload" or "Glitch Protocol"
- **Style**: Electronic/synth beats, 8-bit corruption sounds
- **File**: glitch_corruption.mp3 or similar

## Level Structure

### Horizontal Progression
- Start: Safe platform
- Mid: Glitch platform sequences requiring timing
- End: Flag challenge with glitch platform final jump

### Difficulty Progression (15 levels)
1. **Levels 1-3** (Introduction): Basic glitch platforms, long visibility
2. **Levels 4-6** (Intermediate): Multiple glitches, shorter visibility windows
3. **Levels 7-10** (Advanced): Complex glitch chains, moving through sequences
4. **Levels 11-15** (Expert): Rapid glitching, combined with other hazards

## Glitch Platform Mechanic ✓ FINALIZED

1. **Visibility Cycle**: 
   - 1200ms visible, 400ms invisible
   - All glitch platforms sync across level

2. **Destination Placement**:
   - Fixed A↔B positions (toggle between two locations on same Y-level)
   - Predictable, requires timing

3. **Visual Feedback**:
   - Pixel corruption effect during glitch transition
   - Flickering as platform disappears

4. **Level Layout**:
   - Wider levels (horizontal progression)
   - Mix of regular and glitch platforms
   - Waiting spaces between major glitch sequences for player recovery

## Integration Plan
1. Define Glitch platform type (8) in constants
2. Implement glitch mechanics in update() physics
3. Add rendering for glitch effect (flickering, corruption overlay)
4. Create buildGlitchLevels() generator function
5. Add motherboard background drawer
6. Integrate music track
7. Create level progression tests

## Status
- [ ] Finalize glitch mechanic parameters
- [ ] Approve color palette
- [ ] Decide on music track
- [ ] Plan level progression curve
- [ ] Implement platform type 8
- [ ] Create glitch rendering
- [ ] Build level generator
- [ ] Test playability
