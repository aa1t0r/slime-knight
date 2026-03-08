export type Upgrades = {
  hp: number
  atk: number
  def: number
}

type Listener = (state: Readonly<GameState>) => void

export type GameState = {
  gold: number
  level: number
  xp: number
  upgrades: Upgrades
}

// Simple in-memory global state for demo purposes
const gameState: GameState = {
  gold: 0,
  level: 1,
  xp: 0,
  upgrades: { hp: 0, atk: 0, def: 0 }
}

const listeners: Listener[] = []

function notify() {
  for (const l of listeners) l(Object.freeze({ ...gameState, upgrades: { ...gameState.upgrades } }))
}

export const state = {
  get(): Readonly<GameState> { return gameState },
  // Derived stats
  maxHP(): number {
    // Base 20 + 4 per level above 1; upgrades.hp can add on top if desired later
    const lvl = Math.max(1, gameState.level)
    return 20 + 4 * (lvl - 1)
  },
  dmgBonus(): number {
    // +1 damage per level above 1
    return Math.max(0, gameState.level - 1)
  },
  nextLevelCost(): number {
    // Level 1->2 costs 100, then doubles each level
    const lvl = Math.max(1, gameState.level)
    return 100 * Math.pow(2, lvl - 1)
  },
  subscribe(fn: Listener): () => void {
    listeners.push(fn)
    // immediate fire so UI can sync
    try { fn(Object.freeze({ ...gameState, upgrades: { ...gameState.upgrades } })) } catch {}
    return () => {
      const i = listeners.indexOf(fn)
      if (i >= 0) listeners.splice(i, 1)
    }
  },
  addGold(amount: number) {
    if (!Number.isFinite(amount)) return
    gameState.gold = Math.max(0, Math.floor(gameState.gold + amount))
    notify()
  },
  canSpend(amount: number) {
    return gameState.gold >= amount
  },
  spendGold(amount: number): boolean {
    if (this.canSpend(amount)) {
      gameState.gold -= amount
      notify()
      return true
    }
    return false
  },
  applyUpgrade(kind: keyof Upgrades, delta = 1) {
    gameState.upgrades[kind] = Math.max(0, gameState.upgrades[kind] + delta)
    notify()
  },
  addXP(amount: number) {
    if (!Number.isFinite(amount)) return
    gameState.xp = Math.max(0, Math.floor(gameState.xp + amount))
    // Auto level-up when enough XP for the next level; consume XP per level
    let leveled = false
    while (gameState.xp >= this.nextLevelCost()) {
      gameState.xp -= this.nextLevelCost()
      gameState.level += 1
      leveled = true
    }
    if (leveled) {
      // Optional: clamp XP if it somehow went negative (safety)
      if (gameState.xp < 0) gameState.xp = 0
    }
    notify()
  }
}
