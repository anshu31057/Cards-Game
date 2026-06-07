// Card asset utilities for SVG playing cards
// Matches filenames like:
// ace_of_spades.svg
// king_of_hearts.svg
// 7_of_clubs.svg

const RANK_MAP: Record<string, string> = {
  'A': 'ace',
  'K': 'king',
  'Q': 'queen',
  'J': 'jack',
  '10': '10',
  '9': '9',
  '8': '8',
  '7': '7',
  '6': '6',
  '5': '5',
  '4': '4',
  '3': '3',
  '2': '2',
};

const SUIT_MAP: Record<string, string> = {
  spades: 'spades',
  hearts: 'hearts',
  diamonds: 'diamonds',
  clubs: 'clubs',
};

// Returns proper SVG card path
export function cardImagePath(
  suit: string,
  rank: string
): string {

  const safeRank = RANK_MAP[rank] ?? rank;
  const safeSuit = SUIT_MAP[suit] ?? suit;

  return `/cards/${safeRank}_of_${safeSuit}.svg`;
}

// Card back image
export const CARD_BACK_PATH =
  '/cards/card_back.svg';

// Preload all card assets
let preloaded = false;

export function preloadCards() {

  if (preloaded) return;

  preloaded = true;

  const suits = [
    'spades',
    'hearts',
    'diamonds',
    'clubs',
  ];

  const ranks = [
    'ace',
    'king',
    'queen',
    'jack',
    '10',
    '9',
    '8',
    '7',
    '6',
    '5',
    '4',
    '3',
    '2',
  ];

  // Preload all front cards
  for (const suit of suits) {

    for (const rank of ranks) {

      const img = new Image();

      img.src =
        `/cards/${rank}_of_${suit}.svg`;

    }
  }

  // Preload card back
  const back = new Image();

  back.src = CARD_BACK_PATH;
}