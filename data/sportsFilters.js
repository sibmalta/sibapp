/**
 * Sport-specific filter configurations for the Sib marketplace.
 *
 * Each sport subcategory can define:
 *   - children:       Third-level drill-down options (e.g. Tennis under Racket Sports)
 *   - filterGroups:   Dynamic filter sections shown in FilterPanel when this sport is active
 *   - brands:         Sport-specific brands (merged with global brand list)
 *
 * filterGroups[].key must match a key stored on listing.sportAttributes for filtering.
 */

/* ── Sport subcategory children (third-level drill-down) ───── */

export const SPORT_CHILDREN = {
  gym_fitness: [
    { id: 'weights', label: 'Weights & Dumbbells' },
    { id: 'benches', label: 'Benches & Racks' },
    { id: 'cardio_machines', label: 'Cardio Machines' },
    { id: 'resistance_bands', label: 'Resistance Bands' },
    { id: 'yoga_pilates', label: 'Yoga & Pilates' },
    { id: 'gym_accessories', label: 'Accessories' },
  ],
  cycling: [
    { id: 'road_bikes', label: 'Road Bikes' },
    { id: 'mountain_bikes', label: 'Mountain Bikes' },
    { id: 'electric_bikes', label: 'Electric Bikes' },
    { id: 'kids_bikes', label: 'Kids Bikes' },
    { id: 'bike_parts', label: 'Parts & Components' },
    { id: 'bike_accessories', label: 'Accessories' },
    { id: 'cycling_clothing', label: 'Cycling Clothing' },
  ],
  water_sports: [
    { id: 'swimming', label: 'Swimming' },
    { id: 'surfing', label: 'Surfing & Bodyboarding' },
    { id: 'diving', label: 'Diving & Snorkelling' },
    { id: 'kayaking', label: 'Kayaking & Canoeing' },
    { id: 'sailing', label: 'Sailing' },
    { id: 'sup', label: 'Stand-Up Paddle (SUP)' },
    { id: 'water_accessories', label: 'Accessories' },
  ],
  football: [
    { id: 'football_boots', label: 'Football Boots' },
    { id: 'footballs', label: 'Footballs' },
    { id: 'football_goals', label: 'Goals & Training' },
    { id: 'football_clothing', label: 'Jerseys & Kits' },
    { id: 'football_accessories', label: 'Accessories' },
  ],
  racket_sports: [
    { id: 'tennis', label: 'Tennis' },
    { id: 'padel', label: 'Padel' },
    { id: 'squash', label: 'Squash' },
    { id: 'badminton', label: 'Badminton' },
    { id: 'table_tennis', label: 'Table Tennis' },
  ],
  running: [
    { id: 'running_shoes', label: 'Running Shoes' },
    { id: 'running_clothing', label: 'Running Clothing' },
    { id: 'running_watches', label: 'GPS Watches & Trackers' },
    { id: 'running_accessories', label: 'Accessories' },
  ],
  outdoor_hiking: [
    { id: 'hiking_boots', label: 'Hiking Boots' },
    { id: 'backpacks', label: 'Backpacks' },
    { id: 'tents', label: 'Tents & Camping' },
    { id: 'climbing', label: 'Climbing' },
    { id: 'outdoor_clothing', label: 'Outdoor Clothing' },
    { id: 'outdoor_accessories', label: 'Accessories' },
  ],
  team_sports: [
    { id: 'basketball', label: 'Basketball' },
    { id: 'volleyball', label: 'Volleyball' },
    { id: 'rugby', label: 'Rugby' },
    { id: 'handball', label: 'Handball' },
    { id: 'cricket', label: 'Cricket' },
    { id: 'hockey', label: 'Hockey' },
    { id: 'team_other', label: 'Other Team Sports' },
  ],
  golf: [
    { id: 'golf_drivers', label: 'Drivers' },
    { id: 'golf_irons', label: 'Irons' },
    { id: 'golf_putters', label: 'Putters' },
    { id: 'golf_wedges', label: 'Wedges' },
    { id: 'golf_hybrids', label: 'Hybrids & Woods' },
    { id: 'golf_full_sets', label: 'Full Sets' },
    { id: 'golf_bags', label: 'Golf Bags' },
    { id: 'golf_accessories', label: 'Accessories' },
  ],
  combat_sports: [
    { id: 'boxing', label: 'Boxing' },
    { id: 'mma', label: 'MMA' },
    { id: 'jiu_jitsu', label: 'Jiu-Jitsu' },
    { id: 'karate_taekwondo', label: 'Karate & Taekwondo' },
    { id: 'combat_accessories', label: 'Accessories' },
  ],
  winter_sports: [
    { id: 'skiing', label: 'Skiing' },
    { id: 'snowboarding', label: 'Snowboarding' },
    { id: 'ice_skating', label: 'Ice Skating' },
    { id: 'winter_clothing', label: 'Winter Sports Clothing' },
    { id: 'winter_accessories', label: 'Accessories' },
  ],
}

/* ── Sport-specific filter groups (dynamic filters per sport) ── */

export const SPORT_FILTER_GROUPS = {
  gym_fitness: [
    {
      key: 'equipment_type',
      label: 'Equipment Type',
      options: [
        { id: 'dumbbells', label: 'Dumbbells' },
        { id: 'barbells', label: 'Barbells & Plates' },
        { id: 'kettlebells', label: 'Kettlebells' },
        { id: 'machines', label: 'Machines' },
        { id: 'bench', label: 'Benches' },
        { id: 'rack', label: 'Racks & Stands' },
        { id: 'bands', label: 'Resistance Bands' },
        { id: 'mats', label: 'Mats' },
        { id: 'cardio', label: 'Cardio Equipment' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      key: 'weight_range',
      label: 'Weight Range',
      options: [
        { id: '0-5', label: '0–5 kg' },
        { id: '5-10', label: '5–10 kg' },
        { id: '10-20', label: '10–20 kg' },
        { id: '20-50', label: '20–50 kg' },
        { id: '50+', label: '50+ kg' },
      ],
    },
  ],
  cycling: [
    {
      key: 'bike_type',
      label: 'Bike Type',
      options: [
        { id: 'road', label: 'Road' },
        { id: 'mountain', label: 'Mountain' },
        { id: 'hybrid', label: 'Hybrid / City' },
        { id: 'electric', label: 'Electric (e-bike)' },
        { id: 'folding', label: 'Folding' },
        { id: 'kids', label: 'Kids' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      key: 'frame_size',
      label: 'Frame Size',
      options: [
        { id: 'xs', label: 'XS (< 50cm)' },
        { id: 's', label: 'S (50–52cm)' },
        { id: 'm', label: 'M (53–55cm)' },
        { id: 'l', label: 'L (56–58cm)' },
        { id: 'xl', label: 'XL (59cm+)' },
      ],
    },
  ],
  water_sports: [
    {
      key: 'water_type',
      label: 'Type',
      options: [
        { id: 'wetsuit', label: 'Wetsuits' },
        { id: 'board', label: 'Boards' },
        { id: 'mask_snorkel', label: 'Masks & Snorkels' },
        { id: 'fins', label: 'Fins' },
        { id: 'tank', label: 'Dive Tanks' },
        { id: 'paddle', label: 'Paddles & Oars' },
        { id: 'life_jacket', label: 'Life Jackets' },
        { id: 'other', label: 'Other' },
      ],
    },
  ],
  football: [
    {
      key: 'football_type',
      label: 'Type',
      options: [
        { id: 'boots', label: 'Boots' },
        { id: 'ball', label: 'Footballs' },
        { id: 'goal', label: 'Goals' },
        { id: 'training', label: 'Training Equipment' },
        { id: 'jersey', label: 'Jerseys & Kits' },
        { id: 'shin_guards', label: 'Shin Guards' },
        { id: 'gloves', label: 'Goalkeeper Gloves' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      key: 'boot_size',
      label: 'Boot Size (EU)',
      options: Array.from({ length: 17 }, (_, i) => ({
        id: String(i + 34),
        label: String(i + 34),
      })),
    },
  ],
  racket_sports: [
    {
      key: 'racket_type',
      label: 'Equipment',
      options: [
        { id: 'racket', label: 'Rackets' },
        { id: 'balls', label: 'Balls & Shuttlecocks' },
        { id: 'strings', label: 'Strings' },
        { id: 'grip', label: 'Grips & Tape' },
        { id: 'bag', label: 'Bags' },
        { id: 'shoes', label: 'Court Shoes' },
        { id: 'net', label: 'Nets' },
        { id: 'table', label: 'Tables' },
        { id: 'other', label: 'Other' },
      ],
    },
  ],
  running: [
    {
      key: 'running_type',
      label: 'Type',
      options: [
        { id: 'shoes', label: 'Shoes' },
        { id: 'clothing', label: 'Clothing' },
        { id: 'watch', label: 'GPS Watch' },
        { id: 'hydration', label: 'Hydration' },
        { id: 'belt', label: 'Belts & Vests' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      key: 'shoe_size',
      label: 'Shoe Size (EU)',
      options: Array.from({ length: 17 }, (_, i) => ({
        id: String(i + 34),
        label: String(i + 34),
      })),
    },
  ],
  outdoor_hiking: [
    {
      key: 'outdoor_type',
      label: 'Type',
      options: [
        { id: 'boots', label: 'Boots & Shoes' },
        { id: 'backpack', label: 'Backpacks' },
        { id: 'tent', label: 'Tents' },
        { id: 'sleeping_bag', label: 'Sleeping Bags' },
        { id: 'poles', label: 'Trekking Poles' },
        { id: 'stove', label: 'Stoves & Cookware' },
        { id: 'clothing', label: 'Clothing' },
        { id: 'other', label: 'Other' },
      ],
    },
  ],
  team_sports: [
    {
      key: 'team_type',
      label: 'Equipment',
      options: [
        { id: 'ball', label: 'Balls' },
        { id: 'shoes', label: 'Shoes' },
        { id: 'protective', label: 'Protective Gear' },
        { id: 'clothing', label: 'Clothing & Jerseys' },
        { id: 'training', label: 'Training Equipment' },
        { id: 'other', label: 'Other' },
      ],
    },
  ],
  golf: [
    {
      key: 'club_type',
      label: 'Club Type',
      options: [
        { id: 'driver', label: 'Driver' },
        { id: 'iron', label: 'Irons' },
        { id: 'putter', label: 'Putter' },
        { id: 'wedge', label: 'Wedge' },
        { id: 'hybrid', label: 'Hybrid / Wood' },
        { id: 'full_set', label: 'Full Set' },
        { id: 'bag', label: 'Golf Bag' },
        { id: 'trolley', label: 'Trolley / Cart' },
        { id: 'balls', label: 'Balls' },
        { id: 'clothing', label: 'Golf Clothing' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      key: 'hand',
      label: 'Handedness',
      options: [
        { id: 'right', label: 'Right-Handed' },
        { id: 'left', label: 'Left-Handed' },
      ],
    },
  ],
  combat_sports: [
    {
      key: 'combat_type',
      label: 'Equipment',
      options: [
        { id: 'gloves', label: 'Gloves' },
        { id: 'pads', label: 'Pads & Mitts' },
        { id: 'bag', label: 'Punch Bags' },
        { id: 'wraps', label: 'Hand Wraps' },
        { id: 'headgear', label: 'Headgear' },
        { id: 'gi', label: 'Gi / Uniform' },
        { id: 'shin_guards', label: 'Shin Guards' },
        { id: 'mouthguard', label: 'Mouthguards' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      key: 'glove_size',
      label: 'Glove Size',
      options: [
        { id: '8oz', label: '8 oz' },
        { id: '10oz', label: '10 oz' },
        { id: '12oz', label: '12 oz' },
        { id: '14oz', label: '14 oz' },
        { id: '16oz', label: '16 oz' },
      ],
    },
  ],
  winter_sports: [
    {
      key: 'winter_type',
      label: 'Type',
      options: [
        { id: 'skis', label: 'Skis' },
        { id: 'snowboard', label: 'Snowboards' },
        { id: 'boots', label: 'Boots' },
        { id: 'bindings', label: 'Bindings' },
        { id: 'helmet', label: 'Helmets' },
        { id: 'goggles', label: 'Goggles' },
        { id: 'poles', label: 'Poles' },
        { id: 'clothing', label: 'Clothing' },
        { id: 'other', label: 'Other' },
      ],
    },
  ],
}

/* ── Sport-specific brand lists ──────────────────────────────── */

export const SPORT_BRANDS = {
  gym_fitness: [
    'Technogym', 'Rogue', 'Bowflex', 'NordicTrack', 'Life Fitness',
    'Domyos', 'Hammer', 'Concept2', 'TRX', 'Manduka',
    'Nike', 'Adidas', 'Under Armour', 'Reebok', 'Decathlon',
  ],
  cycling: [
    'Trek', 'Giant', 'Specialized', 'Cannondale', 'Scott',
    'Bianchi', 'Merida', 'Cube', 'Shimano', 'SRAM',
    'Garmin', 'Wahoo', 'Rapha', 'Castelli', 'Canyon',
  ],
  water_sports: [
    'Speedo', 'Arena', 'O\'Neill', 'Rip Curl', 'Billabong',
    'Cressi', 'Mares', 'Aqua Lung', 'Suunto', 'GoPro',
    'Red Paddle Co', 'Naish', 'Starboard', 'Decathlon',
  ],
  football: [
    'Nike', 'Adidas', 'Puma', 'New Balance', 'Mizuno',
    'Under Armour', 'Umbro', 'Joma', 'Reusch', 'Uhlsport',
    'Select', 'Mitre', 'Jako', 'Decathlon',
  ],
  racket_sports: [
    'Wilson', 'Head', 'Babolat', 'Yonex', 'Prince',
    'Tecnifibre', 'Dunlop', 'Bullpadel', 'Adidas', 'Nox',
    'Butterfly', 'STIGA', 'Joola', 'Victor', 'Li-Ning',
  ],
  running: [
    'Nike', 'Adidas', 'ASICS', 'New Balance', 'Brooks',
    'Hoka', 'Saucony', 'On Running', 'Garmin', 'Polar',
    'Coros', 'Salomon', 'Mizuno', 'Under Armour',
  ],
  outdoor_hiking: [
    'The North Face', 'Patagonia', 'Salomon', 'Columbia', 'Merrell',
    'Arc\'teryx', 'Osprey', 'Mammut', 'Deuter', 'Lowa',
    'MSR', 'Black Diamond', 'Scarpa', 'Jack Wolfskin', 'Decathlon',
  ],
  team_sports: [
    'Nike', 'Adidas', 'Spalding', 'Molten', 'Mikasa',
    'Under Armour', 'Puma', 'Wilson', 'Kookaburra', 'Gray-Nicolls',
    'Canterbury', 'Gilbert', 'Mizuno', 'Decathlon',
  ],
  golf: [
    'Callaway', 'TaylorMade', 'Titleist', 'Ping', 'Cobra',
    'Mizuno', 'Cleveland', 'Odyssey', 'Scotty Cameron', 'Vokey',
    'Srixon', 'Bridgestone', 'Bushnell', 'FootJoy', 'Ecco',
  ],
  combat_sports: [
    'Everlast', 'Venum', 'Fairtex', 'Hayabusa', 'Twins Special',
    'Cleto Reyes', 'Ringside', 'RDX', 'Title Boxing', 'Rival',
    'Tatami', 'Scramble', 'Century', 'Adidas', 'Nike',
  ],
  winter_sports: [
    'Rossignol', 'Salomon', 'Atomic', 'Head', 'Fischer',
    'Burton', 'K2', 'Volkl', 'Nordica', 'Tecnica',
    'Oakley', 'Smith', 'Giro', 'Mammut', 'The North Face',
  ],
}

/* ── Helper: get children for a sport subcategory ────────────── */

export function getSportChildren(subcategoryId) {
  return SPORT_CHILDREN[subcategoryId] || []
}

/* ── Helper: get filter groups for a sport subcategory ───────── */

export function getSportFilterGroups(subcategoryId) {
  return SPORT_FILTER_GROUPS[subcategoryId] || []
}

/* ── Helper: get brands for a sport subcategory ──────────────── */

export function getSportBrands(subcategoryId) {
  return SPORT_BRANDS[subcategoryId] || []
}

/* ── All sport subcategory IDs (for validation) ──────────────── */

export const ALL_SPORT_CHILDREN_IDS = Object.values(SPORT_CHILDREN)
  .flat()
  .map(c => c.id)

/* ── Reverse lookup: child id → parent sport subcategory id ──── */

export const SPORT_CHILD_TO_PARENT = Object.fromEntries(
  Object.entries(SPORT_CHILDREN).flatMap(([parentId, children]) =>
    children.map(c => [c.id, parentId])
  )
)
