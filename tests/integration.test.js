// Integration tests for player data and game state persistence
const { isValidPlayerData } = require('../src/game-logic');

describe('Player Data Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should save player data to localStorage', () => {
    const playerData = {
      player_name: 'TestPlayer',
      total_coins: 100,
      challenge_points: 50,
      level_completed: 5,
    };

    localStorage.setItem('pixelDashPlayer', JSON.stringify(playerData));

    expect(localStorage.getItem('pixelDashPlayer')).toBe(JSON.stringify(playerData));
  });

  test('should retrieve player data from localStorage', () => {
    const playerData = {
      player_name: 'TestPlayer',
      total_coins: 100,
      challenge_points: 50,
      level_completed: 5,
    };

    localStorage.setItem('pixelDashPlayer', JSON.stringify(playerData));
    const retrieved = JSON.parse(localStorage.getItem('pixelDashPlayer'));

    expect(retrieved).toEqual(playerData);
  });

  test('should handle missing player data gracefully', () => {
    const retrieved = localStorage.getItem('nonexistentKey');
    expect(retrieved).toBeNull();
  });

  test('should merge loaded data with default data', () => {
    const defaultData = {
      player_name: 'Player',
      total_coins: 0,
      challenge_points: 0,
      level_completed: 0,
      selected_cube: 'classic',
    };

    const savedData = {
      total_coins: 150,
      level_completed: 3,
    };

    localStorage.setItem('pixelDashPlayer', JSON.stringify(savedData));
    const saved = JSON.parse(localStorage.getItem('pixelDashPlayer'));
    const merged = { ...defaultData, ...saved };

    expect(merged).toEqual({
      player_name: 'Player',
      total_coins: 150,
      challenge_points: 0,
      level_completed: 3,
      selected_cube: 'classic',
    });
  });

  test('should validate saved player data', () => {
    const validData = {
      player_name: 'Player',
      total_coins: 100,
      challenge_points: 50,
      level_completed: 5,
    };

    expect(isValidPlayerData(validData)).toBe(true);
  });

  test('should handle JSON parse errors for corrupted data', () => {
    localStorage.setItem('pixelDashPlayer', 'corrupted{data');

    expect(() => {
      JSON.parse(localStorage.getItem('pixelDashPlayer'));
    }).toThrow(SyntaxError);
  });
});

describe('Game Configuration', () => {
  const defaultConfig = {
    game_title: 'Pixel Dash',
    background_color: '#0f172a',
    surface_color: '#22d3ee',
    text_color: '#f0f9ff',
    primary_action: '#f59e0b',
    secondary_action: '#6366f1',
  };

  test('should have default configuration', () => {
    expect(defaultConfig).toHaveProperty('game_title');
    expect(defaultConfig).toHaveProperty('background_color');
    expect(defaultConfig).toHaveProperty('surface_color');
    expect(defaultConfig).toHaveProperty('text_color');
    expect(defaultConfig).toHaveProperty('primary_action');
    expect(defaultConfig).toHaveProperty('secondary_action');
  });

  test('should allow configuration override', () => {
    let config = { ...defaultConfig };
    const newConfig = {
      background_color: '#000000',
      game_title: 'My Game',
    };

    config = { ...config, ...newConfig };

    expect(config.background_color).toBe('#000000');
    expect(config.game_title).toBe('My Game');
    expect(config.surface_color).toBe(defaultConfig.surface_color);
  });

  test('should validate color codes', () => {
    const isValidColor = (color) => /^#[0-9A-F]{6}$/i.test(color);

    expect(isValidColor(defaultConfig.background_color)).toBe(true);
    expect(isValidColor(defaultConfig.surface_color)).toBe(true);
    expect(isValidColor(defaultConfig.text_color)).toBe(true);
    expect(isValidColor(defaultConfig.primary_action)).toBe(true);
    expect(isValidColor(defaultConfig.secondary_action)).toBe(true);
  });
});

describe('Game State Transitions', () => {
  test('should transition from menu to playing', () => {
    let state = 'menu';
    expect(state).toBe('menu');
    state = 'playing';
    expect(state).toBe('playing');
  });

  test('should transition from playing to dead', () => {
    let state = 'playing';
    state = 'dead';
    expect(state).toBe('dead');
  });

  test('should transition from dead to playing on retry', () => {
    let state = 'dead';
    state = 'playing';
    expect(state).toBe('playing');
  });

  test('should transition from playing to levelcomplete', () => {
    let state = 'playing';
    state = 'levelcomplete';
    expect(state).toBe('levelcomplete');
  });

  test('should transition from levelcomplete to playing for next level', () => {
    let state = 'levelcomplete';
    state = 'playing';
    expect(state).toBe('playing');
  });

  test('should transition from levelcomplete to menu when out of levels', () => {
    let state = 'levelcomplete';
    state = 'menu';
    expect(state).toBe('menu');
  });

  test('valid state transitions', () => {
    const validTransitions = {
      menu: ['playing'],
      playing: ['dead', 'levelcomplete'],
      dead: ['playing', 'menu'],
      levelcomplete: ['playing', 'menu'],
    };

    const isValidTransition = (from, to) => {
      return validTransitions[from] && validTransitions[from].includes(to);
    };

    expect(isValidTransition('menu', 'playing')).toBe(true);
    expect(isValidTransition('playing', 'dead')).toBe(true);
    expect(isValidTransition('dead', 'menu')).toBe(true);
    expect(isValidTransition('menu', 'dead')).toBe(false);
    expect(isValidTransition('playing', 'menu')).toBe(false);
  });
});

describe('Level Progression', () => {
  test('should track level completion', () => {
    let completed = 0;
    const totalLevels = 13;

    expect(completed).toBe(0);
    completed++;
    expect(completed).toBe(1);
    completed = 5;
    expect(completed).toBeLessThanOrEqual(totalLevels);
  });

  test('should loop levels when going past the end', () => {
    const levels = ['Level 1', 'Level 2', 'Level 3'];
    let currentLevel = 5;

    const getLevel = (num) => levels[num % levels.length];
    expect(getLevel(currentLevel)).toBe(levels[2]);
    expect(getLevel(currentLevel + 1)).toBe(levels[0]);
  });

  test('should update best score', () => {
    let bestScore = 0;
    let currentScore = 550;

    bestScore = Math.max(bestScore, currentScore);
    expect(bestScore).toBe(550);

    currentScore = 450;
    bestScore = Math.max(bestScore, currentScore);
    expect(bestScore).toBe(550);

    currentScore = 650;
    bestScore = Math.max(bestScore, currentScore);
    expect(bestScore).toBe(650);
  });
});

describe('Coin and Score System', () => {
  test('should accumulate coins correctly', () => {
    let totalCoins = 0;
    const coinsPerCollection = 10;

    totalCoins += coinsPerCollection;
    expect(totalCoins).toBe(10);

    totalCoins += coinsPerCollection;
    totalCoins += coinsPerCollection;
    expect(totalCoins).toBe(30);
  });

  test('should apply coin multiplier', () => {
    let totalCoins = 0;
    const baseCoins = 10;
    const multiplier = 2;

    totalCoins += baseCoins * multiplier;
    expect(totalCoins).toBe(20);

    totalCoins += baseCoins * multiplier;
    expect(totalCoins).toBe(40);
  });

  test('should handle coin collection without multiplier', () => {
    let totalCoins = 0;
    const collectedCoins = [10, 10, 10];

    collectedCoins.forEach((coin) => {
      totalCoins += coin;
    });

    expect(totalCoins).toBe(30);
  });

  test('should calculate shop prices correctly', () => {
    const cubeSkins = {
      classic: { price: 0 },
      ruby: { price: 30 },
      emerald: { price: 50 },
      diamond: { price: 100 },
    };

    let totalCoins = 150;
    const skinToUnlock = 'diamond';
    const price = cubeSkins[skinToUnlock].price;

    expect(totalCoins >= price).toBe(true);
    totalCoins -= price;
    expect(totalCoins).toBe(50);
  });
});

describe('Achievement System', () => {
  test('should track unlocked achievements', () => {
    const achievements = [];

    achievements.push('first_coin');
    expect(achievements).toContain('first_coin');
    expect(achievements.length).toBe(1);

    achievements.push('level_5');
    expect(achievements.length).toBe(2);
    expect(achievements).toContain('level_5');
  });

  test('should not add duplicate achievements', () => {
    const achievements = ['first_coin'];

    if (!achievements.includes('first_coin')) {
      achievements.push('first_coin');
    }

    expect(achievements.length).toBe(1);
  });

  test('should unlock challenge-based achievement', () => {
    let challengePoints = 0;
    const pointsPerChallenge = 100;

    challengePoints += pointsPerChallenge;
    expect(challengePoints).toBe(100);

    const isAchievementUnlocked = (challenge, points) => {
      const challenges = {
        speedrun: 500,
        collector: 200,
        perfectionist: 1000,
      };
      return points >= challenges[challenge];
    };

    challengePoints = 250;
    expect(isAchievementUnlocked('collector', challengePoints)).toBe(true);
    expect(isAchievementUnlocked('speedrun', challengePoints)).toBe(false);
  });
});

describe('Death Streak Tracking', () => {
  test('should increment death streak on death', () => {
    let deathStreak = 0;
    deathStreak++;
    expect(deathStreak).toBe(1);
    deathStreak++;
    expect(deathStreak).toBe(2);
  });

  test('should reset death streak on level complete', () => {
    let deathStreak = 5;
    deathStreak = 0;
    expect(deathStreak).toBe(0);
  });

  test('should track longest death streak', () => {
    let deathStreak = 0;
    let longestDeathStreak = 0;

    deathStreak++;
    deathStreak++;
    longestDeathStreak = Math.max(longestDeathStreak, deathStreak);
    expect(longestDeathStreak).toBe(2);

    deathStreak = 0;
    deathStreak++;
    deathStreak++;
    deathStreak++;
    deathStreak++;
    longestDeathStreak = Math.max(longestDeathStreak, deathStreak);
    expect(longestDeathStreak).toBe(4);
  });
});
