export const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: 19,
    billingPeriod: "month",
    description: "Flexible access to score entry, draws, and charity participation.",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 190,
    billingPeriod: "year",
    description: "Discounted annual access with uninterrupted eligibility.",
  },
];

export const charities = [
  {
    id: "first-tee-futures",
    name: "First Tee Futures",
    mission: "Opening access to sport and education for young people.",
    contributionPercentage: 10,
  },
  {
    id: "fairway-relief-fund",
    name: "Fairway Relief Fund",
    mission: "Supporting families through rapid relief and recovery aid.",
    contributionPercentage: 10,
  },
  {
    id: "green-horizon-trust",
    name: "Green Horizon Trust",
    mission: "Backing community wellbeing and local sustainability projects.",
    contributionPercentage: 10,
  },
];

export const prizeRules = [
  { matchType: "5-number", poolShare: 40, rollover: true },
  { matchType: "4-number", poolShare: 35, rollover: false },
  { matchType: "3-number", poolShare: 25, rollover: false },
];

export const highlights = [
  {
    title: "Subscription-funded prize pool",
    description:
      "Members join on monthly or yearly plans, with every subscription powering prize draws and charitable giving.",
  },
  {
    title: "Simple score tracking",
    description:
      "Subscribers log rounds through an easy five-score flow designed for speed, clarity, and consistency.",
  },
  {
    title: "Visible social impact",
    description:
      "Every subscriber chooses where part of their membership goes, putting charity at the center of the product.",
  },
];

export const dashboardModules = [
  {
    title: "Subscription status and renewal date",
    description: "Display active state, renewal schedule, and access restrictions at a glance.",
  },
  {
    title: "Selected charity and contribution percentage",
    description: "Show the member's preferred charity and the contribution split tied to their subscription.",
  },
  {
    title: "Draw participation summary and upcoming entries",
    description: "Keep users informed about current draw eligibility, upcoming draws, and prior entries.",
  },
  {
    title: "Winnings overview with current payment state",
    description: "Track total winnings and payment progress from pending review through paid status.",
  },
  {
    title: "Score entry and score editing modules",
    description: "Support fast round submission and updates while enforcing the five-score rolling logic.",
  },
];

export const adminModules = [
  {
    title: "User and subscription management",
    description: "Review subscriber access, plan state, and lapsed memberships from a central panel.",
  },
  {
    title: "Charity listing management",
    description: "Add, update, and retire supported charities without touching application code.",
  },
  {
    title: "Draw configuration and execution",
    description: "Set up draw periods, run simulations, and publish official monthly outcomes.",
  },
  {
    title: "Winner proof review and payout tracking",
    description: "Validate uploaded score evidence and move winners through approval and payment states.",
  },
  {
    title: "Reports and platform analytics",
    description: "Monitor contribution totals, draw performance, and subscriber health over time.",
  },
];
