// G-CyberRPcore - Central Shared Job & Hierarchy Registry
// Multi-tier career system with salary, grades, and permissions

const SharedJobs = {
  civilian: {
    label: 'Civilian Citizen',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      0: { name: 'Unemployed', payment: 750 },
      1: { name: 'Freelancer', payment: 1100 },
      2: { name: 'Delivery Courier', payment: 1400 },
      3: { name: 'Store Manager', payment: 1800 }
    }
  },

  police: {
    label: 'Night City Police Department',
    defaultDuty: false,
    offDutyPay: false,
    badgePrefix: 'NCPD',
    grades: {
      0: { name: 'Cadet', payment: 1800, isBoss: false },
      1: { name: 'Officer', payment: 2400, isBoss: false },
      2: { name: 'Senior Officer', payment: 2900, isBoss: false },
      3: { name: 'Sergeant', payment: 3500, isBoss: false },
      4: { name: 'Lieutenant', payment: 4200, isBoss: true },
      5: { name: 'Captain / Chief', payment: 5500, isBoss: true }
    }
  },

  ambulance: {
    label: 'Trauma Team International',
    defaultDuty: false,
    offDutyPay: false,
    badgePrefix: 'TRAUMA',
    grades: {
      0: { name: 'Trainee Medic', payment: 1700, isBoss: false },
      1: { name: 'Field Paramedic', payment: 2300, isBoss: false },
      2: { name: 'Combat Medic', payment: 2800, isBoss: false },
      3: { name: 'Emergency Physician', payment: 3400, isBoss: false },
      4: { name: 'Chief Medical Officer', payment: 5000, isBoss: true }
    }
  },

  ripperdoc: {
    label: 'Night City Ripperdoc Clinic',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      0: { name: 'Apprentice Tech', payment: 1500, isBoss: false },
      1: { name: 'Cyberware Specialist', payment: 2500, isBoss: false },
      2: { name: 'Master Cyber-Surgeon', payment: 3800, isBoss: false },
      3: { name: 'Clinic Owner', payment: 5200, isBoss: true }
    }
  },

  mechanic: {
    label: 'Night City Customs & Garage',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      0: { name: 'Shop Hand', payment: 1200, isBoss: false },
      1: { name: 'Diagnostic Tech', payment: 2000, isBoss: false },
      2: { name: 'Lead Tuner', payment: 3000, isBoss: false },
      3: { name: 'Garage Boss', payment: 4500, isBoss: true }
    }
  },

  delamain: {
    label: 'Delamain Automated Transport',
    defaultDuty: false,
    offDutyPay: false,
    grades: {
      0: { name: 'Contract Driver', payment: 1400, isBoss: false },
      1: { name: 'VIP Chauffeur', payment: 2200, isBoss: false },
      2: { name: 'Fleet Supervisor', payment: 3600, isBoss: true }
    }
  },

  fixer: {
    label: 'Night City Mercenary / Fixer',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      0: { name: 'Street Solo', payment: 1500, isBoss: false },
      1: { name: 'Operative', payment: 2500, isBoss: false },
      2: { name: 'Top Merc', payment: 3500, isBoss: false },
      3: { name: 'Distinguished Fixer', payment: 6000, isBoss: true }
    }
  },

  arasaka: {
    label: 'Arasaka Corporate Security',
    defaultDuty: false,
    offDutyPay: true,
    grades: {
      0: { name: 'Facility Guard', payment: 2200, isBoss: false },
      1: { name: 'Tactical Enforcer', payment: 3200, isBoss: false },
      2: { name: 'Executive Bodyguard', payment: 4500, isBoss: false },
      3: { name: 'Director of Counter-Intel', payment: 6800, isBoss: true }
    }
  }
};

module.exports = SharedJobs;
