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
    // Simple on-screen touch controls for mobile/tablet
    try {
      const cam = this.cameras.main
      const w = cam.width, h = cam.height
      const baseX = 64
      const baseY = h - 64
      const padSize = 44

      const makeBtn = (x:number,y:number,label?:string) => {
        const r = this.add.rectangle(x, y, padSize, padSize, 0x000000, 0.22).setScrollFactor(0).setDepth(2000)
        r.setStrokeStyle(2, 0xffffff, 0.18)
        r.setInteractive({ useHandCursor: true })
        if (label) this.add.text(x, y, label, { color: '#fff', fontSize: '14px' }).setOrigin(0.5).setScrollFactor(0).setDepth(2001)
        return r
      }

      const up = makeBtn(baseX, baseY - padSize, '↑')
      const left = makeBtn(baseX - padSize, baseY, '←')
      const down = makeBtn(baseX, baseY + padSize - 8, '↓')
      const right = makeBtn(baseX + padSize, baseY, '→')

      const emitDown = (dir:string) => this.events.emit('dpad-down', dir)
      const emitUp = (dir:string) => this.events.emit('dpad-up', dir)

      ;[up,left,down,right].forEach((btn, i) => {
        const dir = ['up','left','down','right'][i]
        btn.on('pointerdown', () => emitDown(dir))
        btn.on('pointerup', () => emitUp(dir))
        btn.on('pointerout', () => emitUp(dir))
      })

      // Action button (bottom-right)
      const actX = w - 64
      const actY = h - 64
      const action = makeBtn(actX, actY, 'A')
      action.on('pointerdown', () => this.events.emit('action-down'))
      action.on('pointerup', () => this.events.emit('action-up'))
      action.on('pointerout', () => this.events.emit('action-up'))
    } catch (e) {}
    // (Removed persistent instruction text per user request)
  }
}
