import Phaser from 'phaser'
import { state } from '../state'

export default class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private xpText!: Phaser.GameObjects.Text
  constructor() {
    super('UI')
  }

  create() {
    this.scene.bringToTop()
    // Currency counter (top-left)
    this.goldText = this.add.text(10, 30, 'Gold: 0', { color: '#ffff66', fontSize: '14px', backgroundColor: '#00000088' }).setScrollFactor(0)
    this.levelText = this.add.text(10, 48, 'Lv: 1', { color: '#aaffff', fontSize: '14px', backgroundColor: '#00000066' }).setScrollFactor(0)
    this.xpText = this.add.text(10, 66, 'XP: 0/100', { color: '#aaccff', fontSize: '13px', backgroundColor: '#00000044' }).setScrollFactor(0)
    state.subscribe(s => {
      this.goldText.setText(`Gold: ${s.gold}`)
      this.levelText.setText(`Lv: ${s.level}`)
      try {
        const need = state.nextLevelCost()
        this.xpText.setText(`XP: ${s.xp}/${need}`)
      } catch {}
    })
    // (Removed persistent instruction text per user request)
  }
}
