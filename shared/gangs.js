// G-CyberRPcore - Central Shared Gangs & Factions Registry

const SharedGangs = {
  none: {
    label: 'No Affiliation',
    grades: {
      0: { name: 'Civilian', isBoss: false }
    }
  },

  valentinos: {
    label: 'Los Valentinos',
    territory: 'Heywood (The Glen / Vista Del Rey)',
    grades: {
      0: { name: 'Prospecto', isBoss: false },
      1: { name: 'Soldado', isBoss: false },
      2: { name: 'Enforcer', isBoss: false },
      3: { name: 'Teniente', isBoss: false },
      4: { name: 'Padre / Jefazo', isBoss: true }
    }
  },

  maelstrom: {
    label: 'Maelstrom Syndicate',
    territory: 'Watson (Northside Industrial)',
    grades: {
      0: { name: 'Initiate', isBoss: false },
      1: { name: 'Cyborg Ganger', isBoss: false },
      2: { name: 'Heavy Chrome Solo', isBoss: false },
      3: { name: 'Lieutenant', isBoss: false },
      4: { name: 'Maelstrom Warlord', isBoss: true }
    }
  },

  tyger_claws: {
    label: 'Tyger Claws',
    territory: 'Westbrook (Japantown / Charter Hill)',
    grades: {
      0: { name: 'Kobun', isBoss: false },
      1: { name: 'Wakashu', isBoss: false },
      2: { name: 'Kyodai', isBoss: false },
      3: { name: 'Shateigashira', isBoss: false },
      4: { name: 'Oyabun', isBoss: true }
    }
  },

  moxes: {
    label: 'The Mox',
    territory: 'Watson (Lizzie’s Bar & Kabuki)',
    grades: {
      0: { name: 'Club Regular', isBoss: false },
      1: { name: 'Doll Protector', isBoss: false },
      2: { name: 'Bouncer', isBoss: false },
      3: { name: 'Bar Matron', isBoss: true }
    }
  },

  sixth_street: {
    label: '6th Street Gang',
    territory: 'Santo Domingo (Arroyo / Rancho Coronado)',
    grades: {
      0: { name: 'Militia Recruit', isBoss: false },
      1: { name: 'Patriot', isBoss: false },
      2: { name: 'Veteran Guard', isBoss: false },
      3: { name: 'Squad Leader', isBoss: false },
      4: { name: 'Commander', isBoss: true }
    }
  },

  aldecados: {
    label: 'Aldecaldos Nomad Clan',
    territory: 'The Outskirts & Badlands',
    grades: {
      0: { name: 'Outsider Scout', isBoss: false },
      1: { name: 'Nomad Driver', isBoss: false },
      2: { name: 'Convoy Veteran', isBoss: false },
      3: { name: 'Family Council Leader', isBoss: true }
    }
  }
};

module.exports = SharedGangs;
