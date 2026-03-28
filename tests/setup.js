// Jest test setup
// Mocks and global test configuration

// Mock localStorage for tests
const localStorageMock = (() => {
  const store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      for (let key in store) {
        delete store[key];
      }
    }),
  };
})();
global.localStorage = localStorageMock;

// Clear mocks before each test
beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Mock Canvas API
class MockCanvasRenderingContext2D {
  constructor() {
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.globalAlpha = 1;
    this.textAlign = 'start';
    this.font = '10px sans-serif';
  }

  fillRect = jest.fn();
  strokeRect = jest.fn();
  clearRect = jest.fn();
  fillText = jest.fn();
  strokeText = jest.fn();
  beginPath = jest.fn();
  moveTo = jest.fn();
  lineTo = jest.fn();
  arc = jest.fn();
  stroke = jest.fn();
  fill = jest.fn();
  save = jest.fn();
  restore = jest.fn();
  translate = jest.fn();
  rotate = jest.fn();
  scale = jest.fn();
  createOscillator = jest.fn();
  createGain = jest.fn();
}

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => new MockCanvasRenderingContext2D()),
});

// Mock Audio Context
window.AudioContext = jest.fn(() => ({
  createOscillator: jest.fn(() => ({
    type: 'sine',
    frequency: { value: 440 },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
  })),
  destination: {},
  currentTime: 0,
}));

window.webkitAudioContext = window.AudioContext;
