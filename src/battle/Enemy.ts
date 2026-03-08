export default abstract class Enemy {
  name: string
  hp: number
  currentHP: number
  type: string

  constructor(opts: { name?: string; hp?: number; type?: string }) {
    this.name = opts.name ?? 'Enemy'
    this.hp = opts.hp ?? 10
    this.currentHP = this.hp
    this.type = opts.type ?? 'generic'
  }

  abstract performAttack(battleScene: any, x: number, y: number, width: number, height: number): void
}
