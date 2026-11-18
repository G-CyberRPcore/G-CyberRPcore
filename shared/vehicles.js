// G-CyberRPcore - Central Shared Vehicle Catalog
// Vehicles with REDengine TweakDBID, CName appearance, trunk capacity, and dealership pricing

const SharedVehicles = {
  // --- SPORTS & HYPERCARS ---
  quadra_turbo_r: {
    model: 'Vehicle.v_sport1_quadra_turbo_r_player',
    skin: 'quadra_turbo_r__basic_player_01',
    name: 'Quadra Turbo-R V-Tech',
    brand: 'Quadra',
    category: 'sports',
    price: 125000,
    trunkCapacity: 45, // in kg
    seats: 2,
    shop: 'luxury'
  },
  rayfield_caliburn: {
    model: 'Vehicle.v_sport1_rayfield_caliburn_player',
    skin: 'rayfield_caliburn__basic_player_01',
    name: 'Rayfield Caliburn',
    brand: 'Rayfield',
    category: 'hypercar',
    price: 350000,
    trunkCapacity: 30,
    seats: 2,
    shop: 'luxury'
  },
  mizutani_shion: {
    model: 'Vehicle.v_sport2_mizutani_shion_player',
    skin: 'mizutani_shion__basic_player_01',
    name: 'Mizutani Shion MZ2',
    brand: 'Mizutani',
    category: 'sports',
    price: 75000,
    trunkCapacity: 40,
    seats: 2,
    shop: 'standard'
  },
  porsche_911: {
    model: 'Vehicle.v_sport1_porsche_911_player',
    skin: 'porsche_911__basic_player_01',
    name: 'Porsche 911 Turbo (1977)',
    brand: 'Porsche',
    category: 'classic',
    price: 280000,
    trunkCapacity: 35,
    seats: 2,
    shop: 'luxury'
  },

  // --- MOTORCYCLES ---
  arch_nazare: {
    model: 'Vehicle.v_sportbike2_arch_player',
    skin: 'arch__basic_player_01',
    name: 'Arch Nazaré Sport Bike',
    brand: 'ARCH',
    category: 'motorcycle',
    price: 65000,
    trunkCapacity: 15,
    seats: 2,
    shop: 'standard'
  },
  yaiba_kusanagi: {
    model: 'Vehicle.v_sportbike1_yaiba_kusanagi_player',
    skin: 'yaiba_kusanagi__basic_player_01',
    name: 'Yaiba Kusanagi CT-3X',
    brand: 'Yaiba',
    category: 'motorcycle',
    price: 82000,
    trunkCapacity: 12,
    seats: 2,
    shop: 'standard'
  },
  brennan_apollo: {
    model: 'Vehicle.v_sportbike3_brennan_apollo_player',
    skin: 'brennan_apollo__basic_player_01',
    name: 'Brennan Apollo (Off-road)',
    brand: 'Brennan',
    category: 'motorcycle',
    price: 36000,
    trunkCapacity: 20,
    seats: 2,
    shop: 'standard'
  },

  // --- COMPACT & STANDARD SEDANS ---
  archer_hella: {
    model: 'Vehicle.v_standard2_archer_hella_player',
    skin: 'archer_hella__basic_player_01',
    name: 'Archer Hella EC-D i360',
    brand: 'Archer',
    category: 'sedan',
    price: 22000,
    trunkCapacity: 60,
    seats: 4,
    shop: 'budget'
  },
  villefort_cortes: {
    model: 'Vehicle.v_standard2_villefort_cortes_player',
    skin: 'villefort_cortes__basic_player_01',
    name: 'Villefort Cortes V5000',
    brand: 'Villefort',
    category: 'luxury_sedan',
    price: 45000,
    trunkCapacity: 75,
    seats: 4,
    shop: 'standard'
  },
  makigai_maimai: {
    model: 'Vehicle.v_standard2_makigai_maimai_player',
    skin: 'makigai_maimai__basic_player_01',
    name: 'Makigai MaiMai P126',
    brand: 'Makigai',
    category: 'compact',
    price: 14000,
    trunkCapacity: 25,
    seats: 2,
    shop: 'budget'
  },

  // --- TRUCKS & SUVS ---
  thorton_mackinaw: {
    model: 'Vehicle.v_standard3_thorton_mackinaw_player',
    skin: 'thorton_mackinaw__basic_player_01',
    name: 'Thorton Mackinaw MTL1 Heavy Truck',
    brand: 'Thorton',
    category: 'truck',
    price: 48000,
    trunkCapacity: 160,
    seats: 2,
    shop: 'standard'
  },
  chevillon_thrax: {
    model: 'Vehicle.v_standard2_chevillon_thrax_player',
    skin: 'chevillon_thrax__basic_player_01',
    name: 'Chevillon Thrax 388 Jefferson',
    brand: 'Chevillon',
    category: 'executive',
    price: 52000,
    trunkCapacity: 80,
    seats: 4,
    shop: 'standard'
  },

  // --- EMERGENCY & PUBLIC SERVICE ---
  ncpd_cruiser: {
    model: 'Vehicle.v_standard2_villefort_cortes_police',
    skin: 'villefort_cortes__police_basic',
    name: 'NCPD Villefort Cortes Cruiser',
    brand: 'Villefort',
    category: 'emergency',
    price: 0,
    trunkCapacity: 100,
    seats: 4,
    job: 'police'
  },
  trauma_ambulance: {
    model: 'Vehicle.v_utility4_kaukaz_bratsk_trauma',
    skin: 'kaukaz_bratsk__trauma_basic',
    name: 'Trauma Team Bratsk Tactical Unit',
    brand: 'Kaukaz',
    category: 'emergency',
    price: 0,
    trunkCapacity: 250,
    seats: 4,
    job: 'ambulance'
  },
  delamain_cab: {
    model: 'Vehicle.v_standard2_villefort_cortes_delamain',
    skin: 'villefort_cortes__delamain_basic',
    name: 'Delamain AI Autonomous Cab',
    brand: 'Delamain',
    category: 'service',
    price: 0,
    trunkCapacity: 80,
    seats: 4,
    job: 'delamain'
  }
};

module.exports = SharedVehicles;
