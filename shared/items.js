// G-CyberRPcore - Central Shared Item Registry
// Standard item registry definitions for Night City

const SharedItems = {
  // --- MEDICAL & RECOVERY ---
  maxdoc_mk1: {
    name: 'maxdoc_mk1',
    label: 'MaxDoc Mk.1 Inhaler',
    weight: 0.3,
    type: 'medical',
    unique: false,
    useable: true,
    healAmount: 40,
    description: 'Trauma Team standard emergency medical inhaler. Restores 40% health instantly.'
  },
  maxdoc_mk2: {
    name: 'maxdoc_mk2',
    label: 'MaxDoc Mk.2 Inhaler',
    weight: 0.4,
    type: 'medical',
    unique: false,
    useable: true,
    healAmount: 70,
    description: 'Military-grade medical inhaler restoring 70% health.'
  },
  bounce_back_mk1: {
    name: 'bounce_back_mk1',
    label: 'Bounce Back Mk.1',
    weight: 0.2,
    type: 'medical',
    unique: false,
    useable: true,
    description: 'Subcutaneous injector that accelerates tissue regeneration over 30 seconds.'
  },
  trauma_defibrillator: {
    name: 'trauma_defibrillator',
    label: 'Trauma Neuro-Defibrillator',
    weight: 3.5,
    type: 'medical',
    unique: true,
    useable: true,
    job: 'TraumaTeam',
    description: 'High-voltage portable defibrillator used by paramedics to revive flatlined citizens.'
  },
  bandage: {
    name: 'bandage',
    label: 'Synthetic Hemostatic Dressing',
    weight: 0.1,
    type: 'medical',
    unique: false,
    useable: true,
    description: 'Stops heavy bleeding and stabilizes wounded limbs.'
  },

  // --- FOOD & CONSUMABLES ---
  synth_burger: {
    name: 'synth_burger',
    label: 'Synthetic Beef Burger',
    weight: 0.3,
    type: 'food',
    unique: false,
    useable: true,
    hunger: 35,
    description: 'AllFoods certified processed protein patty on soy bun.'
  },
  burrito_xxl: {
    name: 'burrito_xxl',
    label: 'Chupacabra XXL Burrito',
    weight: 0.5,
    type: 'food',
    unique: false,
    useable: true,
    hunger: 55,
    description: 'Massive street-vendor burrito loaded with synthesized beans and spicy artificial salsa.'
  },
  ramen_pack: {
    name: 'ramen_pack',
    label: 'Kabuki Instant Ramen',
    weight: 0.2,
    type: 'food',
    unique: false,
    useable: true,
    hunger: 25,
    description: 'Classic freeze-dried noodles. Just add heated mineral water.'
  },
  water_bottle: {
    name: 'water_bottle',
    label: 'Purified City Water (500ml)',
    weight: 0.5,
    type: 'drink',
    unique: false,
    useable: true,
    thirst: 40,
    description: 'Filtered Night City tap water. Guaranteed 99.4% heavy-metal free.'
  },
  nicola_blue: {
    name: 'nicola_blue',
    label: 'NiCola Blue (Original)',
    weight: 0.35,
    type: 'drink',
    unique: false,
    useable: true,
    thirst: 30,
    description: 'Taste the love! The sweetest carbonated beverage in Night City.'
  },
  spunky_monkey: {
    name: 'spunky_monkey',
    label: 'Spunky Monkey Energy Drink',
    weight: 0.35,
    type: 'drink',
    unique: false,
    useable: true,
    thirst: 25,
    energy: 40,
    description: 'Extreme caffeine and taurine stimulant drink with neon green coloring.'
  },
  silverhand_tequila: {
    name: 'silverhand_tequila',
    label: 'Centzon Totochtin Tequila',
    weight: 1.0,
    type: 'alcohol',
    unique: false,
    useable: true,
    thirst: 15,
    intoxication: 30,
    description: 'Johnny Silverhand’s signature drink ingredient: spicy tequila with a chili rim.'
  },

  // --- CYBERWARE & OPERATING SYSTEMS ---
  cyberdeck_paraline: {
    name: 'cyberdeck_paraline',
    label: 'Militech Paraline Cyberdeck Mk.2',
    weight: 1.2,
    type: 'cyberware',
    unique: true,
    slot: 'operating_system',
    description: 'Entry-level netrunning deck featuring 6 RAM slots and quickhack buffer.'
  },
  sandevistan_dynalar: {
    name: 'sandevistan_dynalar',
    label: 'Dynalar Sandevistan Mk.3',
    weight: 2.0,
    type: 'cyberware',
    unique: true,
    slot: 'operating_system',
    description: 'Reflex booster accelerating neural transmission, slowing perception of time by 50%.'
  },
  kiroshi_optics_v1: {
    name: 'kiroshi_optics_v1',
    label: 'Kiroshi Optical Suite v1',
    weight: 0.4,
    type: 'cyberware',
    unique: true,
    slot: 'ocular',
    description: 'High-definition cybernetic eye with optical zoom, threat evaluation, and HUD integration.'
  },
  subdermal_armor_t1: {
    name: 'subdermal_armor_t1',
    label: 'Subdermal Armor Weave Mk.1',
    weight: 3.0,
    type: 'cyberware',
    unique: true,
    slot: 'integumentary',
    description: 'Kevlar subcutaneous mesh granting +100 permanent physical ballistic protection.'
  },
  mantis_blades_t2: {
    name: 'mantis_blades_t2',
    label: 'Arasaka Mantis Blades (Rare)',
    weight: 4.5,
    type: 'cyberware',
    unique: true,
    slot: 'arms',
    description: 'Concealed forearm blades capable of rapid lethal slashing attacks.'
  },

  // --- WEAPONS & AMMUNITION ---
  weapon_unity: {
    name: 'weapon_unity',
    label: 'Constitutional Arms Unity (9mm)',
    weight: 2.2,
    type: 'weapon',
    ammoType: 'ammo_handgun',
    unique: true,
    description: 'Reliable, mass-produced semi-automatic pistol popular among Night City security.'
  },
  weapon_lexington: {
    name: 'weapon_lexington',
    label: 'Militech M-10AF Lexington',
    weight: 2.0,
    type: 'weapon',
    ammoType: 'ammo_handgun',
    unique: true,
    description: 'Fast-firing tactical combat handgun.'
  },
  weapon_copperhead: {
    name: 'weapon_copperhead',
    label: 'Nokota D5 Copperhead Rifle',
    weight: 4.8,
    type: 'weapon',
    ammoType: 'ammo_rifle',
    unique: true,
    description: 'Durable assault rifle favored by Nomad clans and street mercenaries.'
  },
  weapon_carnage: {
    name: 'weapon_carnage',
    label: 'Budget Arms Carnage Shotgun',
    weight: 7.2,
    type: 'weapon',
    ammoType: 'ammo_shotgun',
    unique: true,
    description: 'Brutal pump-action shotgun packing massive kinetic stopping power.'
  },
  ammo_handgun: {
    name: 'ammo_handgun',
    label: 'Standard Pistol Ammo (50x)',
    weight: 0.6,
    type: 'ammo',
    unique: false,
    useable: true,
    description: 'Box of 50 standard 9x19mm power rounds.'
  },
  ammo_rifle: {
    name: 'ammo_rifle',
    label: 'Rifle Cartridges (60x)',
    weight: 1.1,
    type: 'ammo',
    unique: false,
    useable: true,
    description: 'High-velocity 5.56mm caseless rifle cartridges.'
  },
  ammo_shotgun: {
    name: 'ammo_shotgun',
    label: 'Shotgun Shells (20x)',
    weight: 0.8,
    type: 'ammo',
    unique: false,
    useable: true,
    description: 'Heavy gauge kinetic buckshot shells.'
  },

  // --- TOOLS, UTILITIES & TECH ---
  cyber_lockpick: {
    name: 'cyber_lockpick',
    label: 'Digital Bypass Lockpick',
    weight: 0.3,
    type: 'tool',
    unique: false,
    useable: true,
    description: 'Handheld decryption tool used to crack mechanical and low-security smart doors.'
  },
  repair_kit: {
    name: 'repair_kit',
    label: 'Vehicle Diagnostic & Repair Kit',
    weight: 5.0,
    type: 'tool',
    unique: false,
    useable: true,
    description: 'Comprehensive socket and electronic patch set for restoring vehicle body and engine.'
  },
  data_shard_encrypted: {
    name: 'data_shard_encrypted',
    label: 'Encrypted Militech Data Shard',
    weight: 0.05,
    type: 'item',
    unique: true,
    description: 'High-security memory shard containing classified corporate manifests.'
  },
  fake_id_badge: {
    name: 'fake_id_badge',
    label: 'Forged NCPD Detective Badge',
    weight: 0.1,
    type: 'item',
    unique: true,
    description: 'Convincing counterfeit police badge fabricated in Pacifica.'
  },

  // --- CRAFTING COMPONENTS & VALUABLES ---
  crafting_component_t1: {
    name: 'crafting_component_t1',
    label: 'Common Crafting Material',
    weight: 0.02,
    type: 'material',
    unique: false,
    description: 'Scrap wires, circuit fragments, and basic sheet metal.'
  },
  crafting_component_t3: {
    name: 'crafting_component_t3',
    label: 'Rare Tech Component',
    weight: 0.05,
    type: 'material',
    unique: false,
    description: 'Precision manufactured microchips and gold-plated optical interconnects.'
  },
  crafting_component_t5: {
    name: 'crafting_component_t5',
    label: 'Legendary Nanotech Specimen',
    weight: 0.1,
    type: 'material',
    unique: false,
    description: 'Pristine self-repairing carbon-nanotube cluster.'
  }
};

module.exports = SharedItems;
