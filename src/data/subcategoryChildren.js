/**
 * Third-level children for subcategories across ALL categories.
 *
 * This generalises the pattern already used by sportsFilters.js and shoeFilters.js.
 * When a subcategory is selected, BrowsePage checks this map for available
 * type-level chips (Row 3). Sports and Shoes are intentionally excluded here —
 * they keep their own dedicated files for backward compatibility.
 *
 * Key = `${categoryId}::${subcategoryId}` (namespaced to avoid collisions).
 */

const SUBCATEGORY_CHILDREN = {
  /* ── Fashion ───────────────────────────────────────────────── */
  'fashion::tops': [
    { id: 'tshirts', label: 'T-Shirts' },
    { id: 'tank_tops', label: 'Tank Tops & Vests' },
    { id: 'crop_tops', label: 'Crop Tops' },
    { id: 'polo_shirts', label: 'Polo Shirts' },
    { id: 'bodysuits', label: 'Bodysuits' },
    { id: 'other_tops', label: 'Other' },
  ],
  'fashion::dresses': [
    { id: 'mini_dresses', label: 'Mini Dresses' },
    { id: 'midi_dresses', label: 'Midi Dresses' },
    { id: 'maxi_dresses', label: 'Maxi Dresses' },
    { id: 'evening_dresses', label: 'Evening & Formal' },
    { id: 'casual_dresses', label: 'Casual & Day' },
    { id: 'other_dresses', label: 'Other' },
  ],
  'fashion::bags': [
    { id: 'handbags', label: 'Handbags' },
    { id: 'crossbody', label: 'Crossbody Bags' },
    { id: 'tote_bags', label: 'Tote Bags' },
    { id: 'backpacks', label: 'Backpacks' },
    { id: 'clutches', label: 'Clutches & Purses' },
    { id: 'shoulder_bags', label: 'Shoulder Bags' },
    { id: 'travel_bags', label: 'Travel & Gym Bags' },
    { id: 'other_bags', label: 'Other' },
  ],
  'fashion::coats': [
    { id: 'puffer_jackets', label: 'Puffer Jackets' },
    { id: 'blazers', label: 'Blazers' },
    { id: 'denim_jackets', label: 'Denim Jackets' },
    { id: 'leather_jackets', label: 'Leather Jackets' },
    { id: 'trench_coats', label: 'Trench & Raincoats' },
    { id: 'bomber_jackets', label: 'Bomber Jackets' },
    { id: 'parkas', label: 'Parkas & Overcoats' },
    { id: 'other_coats', label: 'Other' },
  ],
  'fashion::jeans': [
    { id: 'skinny_jeans', label: 'Skinny' },
    { id: 'straight_jeans', label: 'Straight' },
    { id: 'wide_leg_jeans', label: 'Wide Leg' },
    { id: 'bootcut_jeans', label: 'Bootcut / Flare' },
    { id: 'mom_jeans', label: 'Mom / Dad Jeans' },
    { id: 'shorts_denim', label: 'Denim Shorts' },
    { id: 'other_jeans', label: 'Other' },
  ],
  'fashion::jewellery': [
    { id: 'necklaces', label: 'Necklaces & Chains' },
    { id: 'rings', label: 'Rings' },
    { id: 'bracelets', label: 'Bracelets & Bangles' },
    { id: 'earrings', label: 'Earrings' },
    { id: 'anklets', label: 'Anklets' },
    { id: 'sets', label: 'Jewellery Sets' },
    { id: 'other_jewellery', label: 'Other' },
  ],
  'fashion::activewear': [
    { id: 'leggings', label: 'Leggings' },
    { id: 'sports_bras', label: 'Sports Bras' },
    { id: 'workout_tops', label: 'Tops & Tanks' },
    { id: 'tracksuits', label: 'Tracksuits' },
    { id: 'shorts_active', label: 'Shorts' },
    { id: 'other_activewear', label: 'Other' },
  ],

  /* ── Electronics ───────────────────────────────────────────── */
  'electronics::gaming': [
    { id: 'consoles', label: 'Consoles' },
    { id: 'video_games', label: 'Video Games' },
    { id: 'controllers', label: 'Controllers' },
    { id: 'vr_headsets', label: 'VR Headsets' },
    { id: 'gaming_accessories', label: 'Accessories' },
    { id: 'other_gaming', label: 'Other' },
  ],
  'electronics::audio': [
    { id: 'headphones', label: 'Headphones' },
    { id: 'earbuds', label: 'Earbuds' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'turntables', label: 'Turntables & Vinyl' },
    { id: 'microphones', label: 'Microphones' },
    { id: 'other_audio', label: 'Other' },
  ],
  'electronics::cameras': [
    { id: 'dslr', label: 'DSLR Cameras' },
    { id: 'mirrorless', label: 'Mirrorless Cameras' },
    { id: 'compact_cameras', label: 'Compact & Point-and-Shoot' },
    { id: 'lenses', label: 'Lenses' },
    { id: 'drones', label: 'Drones' },
    { id: 'camera_accessories', label: 'Accessories' },
    { id: 'other_cameras', label: 'Other' },
  ],

  /* ── Home & Living ─────────────────────────────────────────── */
  'home::kitchenware': [
    { id: 'cookware', label: 'Pots & Pans' },
    { id: 'bakeware', label: 'Bakeware' },
    { id: 'utensils', label: 'Utensils & Tools' },
    { id: 'dinnerware', label: 'Dinnerware & Crockery' },
    { id: 'glassware', label: 'Glassware' },
    { id: 'small_kitchen', label: 'Small Appliances' },
    { id: 'other_kitchen', label: 'Other' },
  ],
  'home::decor': [
    { id: 'wall_art', label: 'Wall Art & Prints' },
    { id: 'vases', label: 'Vases & Ornaments' },
    { id: 'candles', label: 'Candles & Holders' },
    { id: 'mirrors', label: 'Mirrors' },
    { id: 'rugs', label: 'Rugs & Carpets' },
    { id: 'cushions', label: 'Cushions & Throws' },
    { id: 'other_decor', label: 'Other' },
  ],

  /* ── Books ─────────────────────────────────────────────────── */
  'books::textbooks': [
    { id: 'school_books', label: 'Primary & Secondary' },
    { id: 'university_books', label: 'University' },
    { id: 'language_books', label: 'Language Learning' },
    { id: 'exam_prep', label: 'Exam Prep & Revision' },
    { id: 'other_textbooks', label: 'Other' },
  ],

  /* ── Toys & Games ──────────────────────────────────────────── */
  'toys::board_games': [
    { id: 'strategy_games', label: 'Strategy Games' },
    { id: 'party_games', label: 'Party Games' },
    { id: 'card_games', label: 'Card Games' },
    { id: 'jigsaw_puzzles', label: 'Jigsaw Puzzles' },
    { id: 'classic_games', label: 'Classic Games' },
    { id: 'other_boardgames', label: 'Other' },
  ],
  'toys::collectibles': [
    { id: 'trading_cards', label: 'Trading Cards' },
    { id: 'figurines', label: 'Figurines & Statues' },
    { id: 'model_kits', label: 'Model Kits' },
    { id: 'coins_stamps', label: 'Coins & Stamps' },
    { id: 'other_collectibles', label: 'Other' },
  ],

  /* ── Kids & Baby ───────────────────────────────────────────── */
  'kids::baby_clothing': [
    { id: 'bodysuits_baby', label: 'Bodysuits & Rompers' },
    { id: 'sleepsuits', label: 'Sleepsuits' },
    { id: 'sets_baby', label: 'Sets & Outfits' },
    { id: 'outerwear_baby', label: 'Outerwear' },
    { id: 'other_baby', label: 'Other' },
  ],
  'kids::kids_clothing': [
    { id: 'tops_kids', label: 'Tops & T-Shirts' },
    { id: 'bottoms_kids', label: 'Trousers & Shorts' },
    { id: 'dresses_kids', label: 'Dresses & Skirts' },
    { id: 'outerwear_kids', label: 'Coats & Jackets' },
    { id: 'shoes_kids', label: 'Shoes' },
    { id: 'school_uniform', label: 'School Uniform' },
    { id: 'other_kids_clothing', label: 'Other' },
  ],

  /* ── Furniture ─────────────────────────────────────────────── */
  'furniture::tables': [
    { id: 'dining_tables', label: 'Dining Tables' },
    { id: 'coffee_tables', label: 'Coffee Tables' },
    { id: 'desks', label: 'Desks' },
    { id: 'side_tables', label: 'Side & Console Tables' },
    { id: 'other_tables', label: 'Other' },
  ],
  'furniture::chairs': [
    { id: 'dining_chairs', label: 'Dining Chairs' },
    { id: 'office_chairs', label: 'Office Chairs' },
    { id: 'armchairs', label: 'Armchairs' },
    { id: 'bar_stools', label: 'Bar Stools' },
    { id: 'other_chairs', label: 'Other' },
  ],
}

/**
 * Get third-level children for a subcategory.
 * Returns [] if no children are defined.
 *
 * @param {string} categoryId   – e.g. 'fashion'
 * @param {string} subcategoryId – e.g. 'bags'
 */
export function getSubcategoryChildren(categoryId, subcategoryId) {
  if (!categoryId || !subcategoryId) return []
  return SUBCATEGORY_CHILDREN[`${categoryId}::${subcategoryId}`] || []
}

/**
 * All child IDs across every subcategory (for validation / search).
 */
export const ALL_SUBCATEGORY_CHILDREN_IDS = Object.values(SUBCATEGORY_CHILDREN)
  .flat()
  .map(c => c.id)

export default SUBCATEGORY_CHILDREN
