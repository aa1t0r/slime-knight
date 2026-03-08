import Phaser from 'phaser'
import { state } from '../state'

export default class TownScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private lastDir: 'up'|'down'|'left'|'right' = 'down'
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private interactionPrompt!: Phaser.GameObjects.Text
  private altarZone!: Phaser.GameObjects.Zone
  private guildZone!: Phaser.GameObjects.Zone
  private altarUI?: Phaser.GameObjects.Container
  private altarMsg?: Phaser.GameObjects.Text
  private uiOpen: boolean = false
  private entryFrom?: string

  constructor() { super('Town') }

  init(data?: any) {
    this.entryFrom = data?.from
  }

  create() {
    const width = 800, height = 600
    this.add.rectangle(width/2, height/2, width, height, 0x7fbf7f)

    // Paths
    const road = this.add.graphics(); road.fillStyle(0xb48a5a, 1)
    road.fillRect(width/2 - 28, 0, 56, height)
    road.fillRect(0, height/2 - 18, width, 36)

    // Placeholders
    const altar = this.add.rectangle(width*0.25, height*0.52, 160, 110, 0x6d6d6d).setStrokeStyle(2, 0x3b3b3b)
    this.add.text(altar.x - 52, altar.y - 8, 'Altar (WIP)', { color: '#ffffff' })
    const guild = this.add.rectangle(width*0.75, height*0.52, 200, 120, 0x8b5a2b).setStrokeStyle(2, 0x3b3b3b)
    this.add.text(guild.x - 96, guild.y - 8, 'Adventurers Guild (WIP)', { color: '#ffffff' })

    const blocks = this.physics.add.staticGroup(); blocks.add(this.physics.add.existing(altar, true)); blocks.add(this.physics.add.existing(guild, true))

    // Player spawn: default near bottom; if returning from Goblin Camp, spawn at top
    let spawnX = width/2
    let spawnY = height*0.85
    if (this.entryFrom === 'GoblinCamp') {
      spawnY = height*0.18
    }
    this.player = this.physics.add.sprite(spawnX, spawnY, 'slime_d_1').setScale(1.5)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, blocks)

    // Camera/world
    const cam = this.cameras.main; cam.startFollow(this.player); this.physics.world.setBounds(0,0,width,height); cam.setBounds(0,0,width,height)

    // Input
    this.keys = this.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D, interact: Phaser.Input.Keyboard.KeyCodes.E }) as Record<string, Phaser.Input.Keyboard.Key>

    // Prompt
    this.interactionPrompt = this.add.text(12, height - 24, '', { color: '#ffffaa', fontSize: '12px', backgroundColor: '#000000' }).setScrollFactor(0)

    // Exits
    const northExit = this.add.zone(width/2, 12, 140, 24).setOrigin(0.5)
    const southExit = this.add.zone(width/2, height - 12, 140, 24).setOrigin(0.5)
    this.physics.add.existing(northExit, true); this.physics.add.existing(southExit, true)
    // North now leads to Goblin Camp instead of Overworld
    this.physics.add.overlap(this.player, northExit as any, () => { this.scene.start('GoblinCamp', { from: 'TownNorth' }) })
    this.physics.add.overlap(this.player, southExit as any, () => { this.scene.start('Overworld', { from: 'TownSouth' }) })

    // Zones for placeholders
    this.altarZone = this.add.zone(altar.x, altar.y, altar.width as number, altar.height as number).setOrigin(0.5)
    this.guildZone = this.add.zone(guild.x, guild.y, guild.width as number, guild.height as number).setOrigin(0.5)
    this.physics.add.existing(this.altarZone, true); this.physics.add.existing(this.guildZone, true)

    // Subtle polish: edge stones along roads and small wooden signs
    const edge = this.add.graphics(); edge.fillStyle(0x9e8f7a, 1)
    for (let y = 0; y < height; y += 20) {
      edge.fillCircle(width/2 - 32, y + Phaser.Math.Between(-2,2), 2)
      edge.fillCircle(width/2 + 32, y + Phaser.Math.Between(-2,2), 2)
    }
    for (let x = 0; x < width; x += 20) {
      edge.fillCircle(x + Phaser.Math.Between(-2,2), height/2 - 22, 2)
      edge.fillCircle(x + Phaser.Math.Between(-2,2), height/2 + 22, 2)
    }
    const altarSign = this.add.container(altar.x - 90, altar.y - 10)
    altarSign.add([ this.add.rectangle(0, 10, 4, 30, 0x6b4f2e), this.add.rectangle(16, 0, 44, 16, 0xffe082), this.add.text(16, 0, 'Altar', { fontSize: '10px', color: '#3b2d1b' }).setOrigin(0.5) ])
    const guildSign = this.add.container(guild.x + 90, guild.y - 10)
    guildSign.add([ this.add.rectangle(0, 10, 4, 30, 0x6b4f2e), this.add.rectangle(-16, 0, 54, 16, 0xffe082), this.add.text(-16, 0, 'Guild', { fontSize: '10px', color: '#3b2d1b' }).setOrigin(0.5) ])
    // Warning sign at the north road
    const warn = this.add.container(width/2 - 140, 44)
    const post = this.add.rectangle(0, 18, 6, 36, 0x6b4f2e)
    const board = this.add.rectangle(0, 0, 280, 30, 0xffe082).setStrokeStyle(2, 0x6b5f3b)
    const label = this.add.text(0, 0, 'Beware, here lies the goblin king.', { color: '#3b2d1b', fontSize: '12px', wordWrap: { width: 260 } }).setOrigin(0.5)
    warn.add([post, board, label])
    // compute a no-tree zone around the warning sign to keep visibility clear
    const warnBounds = { x: (warn.x as number) - 160, y: (warn.y as number) - 34, w: 320, h: 90 }
    // Nature details: trees, bushes, flowers, grass speckles, small pond, butterflies
    const decor = this.add.graphics()
    const isNearRoad = (x:number,y:number) => {
      // avoid main vertical and horizontal roads
      if (Math.abs(x - width/2) < 110) return true
      if (Math.abs(y - height/2) < 60) return true
      return false
    }
    // Small decorative pond (place before trees so trees avoid it)
    const px = width * 0.12, py = height * 0.72, pr = 36
    const pond = this.add.graphics()
    pond.fillStyle(0x2e9fbf, 1); pond.fillEllipse(px, py, pr * 2, pr)
    pond.fillStyle(0x8fd7ee, 0.45); pond.fillEllipse(px - 6, py - 6, pr * 1.4, pr * 0.7)
    pond.setDepth(py - 1)
    // gentle ripple
    this.tweens.add({ targets: pond, alpha: { from: 0.9, to: 0.7 }, duration: 1600, yoyo: true, repeat: -1 })

    // Trees (use existing 'tree' texture), placed off-road and away from altar/guild/pond
    const altarBounds = { x: altar.x - (altar.width as number)/2, y: altar.y - (altar.height as number)/2, w: altar.width as number, h: altar.height as number }
    const guildBounds = { x: guild.x - (guild.width as number)/2, y: guild.y - (guild.height as number)/2, w: guild.width as number, h: guild.height as number }
    const pondBounds = { x: px - pr, y: py - pr/2, w: pr*2, h: pr }
    const rectsOverlap = (rx:number, ry:number, rw:number, rh:number, x:number, y:number) => {
      return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
    }
    for (let i = 0, attempts = 0; i < 10 && attempts < 120; attempts++) {
      const x = Phaser.Math.Between(24, width - 24)
      const y = Phaser.Math.Between(48, height - 80)
      if (isNearRoad(x,y)) continue
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 80) continue
      if (rectsOverlap(altarBounds.x, altarBounds.y, altarBounds.w, altarBounds.h, x, y)) continue
      if (rectsOverlap(guildBounds.x, guildBounds.y, guildBounds.w, guildBounds.h, x, y)) continue
      if (rectsOverlap(pondBounds.x, pondBounds.y, pondBounds.w, pondBounds.h, x, y)) continue
      if (rectsOverlap(warnBounds.x, warnBounds.y, warnBounds.w, warnBounds.h, x, y)) continue
      const t = this.add.image(x, y, 'tree').setOrigin(0.5, 1)
      t.setDepth(y)
      i++
    }
    // Bushes and low foliage
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(24, width - 24)
      const y = Phaser.Math.Between(120, height - 60)
      if (isNearRoad(x,y)) continue
      const b = this.add.graphics({ x: x, y: y })
      const shade = Phaser.Math.Between(0,1) ? 0x3b8e3b : 0x2e7d32
      b.fillStyle(shade, 1)
      const w = Phaser.Math.Between(18, 36)
      const h = Phaser.Math.Between(10, 22)
      b.fillEllipse(0, 0, w, h)
      b.setDepth(y - 2)
    }

    // Flowers and grass speckles
    for (let i = 0; i < 160; i++) {
      const x = Phaser.Math.Between(12, width - 12)
      const y = Phaser.Math.Between(18, height - 18)
      if (isNearRoad(x,y)) continue
      const c = Math.random() < 0.6 ? 0x2e7d32 : 0x3b8e3b
      decor.fillStyle(c, 0.28)
      decor.fillCircle(x, y, Math.random() * 1.6 + 0.6)
      if (Math.random() < 0.06) {
        const fx = this.add.graphics(); fx.fillStyle(0xffc0cb, 1); fx.fillCircle(x + 2, y - 2, 2); fx.setDepth(y + 1)
      }
    }

    

    // Butterflies (tiny moving decorative circles)
    for (let i = 0; i < 6; i++) {
      const bx = Phaser.Math.Between(80, width - 80)
      const by = Phaser.Math.Between(80, height - 160)
      if (isNearRoad(bx,by)) continue
      const f = this.add.graphics({ x: bx, y: by })
      f.fillStyle(0xffdd77, 1); f.fillCircle(0, 0, 3)
      f.setDepth(by + 2)
      const dx = Phaser.Math.Between(-40, 40)
      const dy = Phaser.Math.Between(-24, 24)
      this.tweens.add({ targets: f, x: bx + dx, y: by + dy, duration: Phaser.Math.Between(1800, 3000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
  }

  update() {
    const speed = 160
    let vx = 0, vy = 0
    if (this.keys.left.isDown) vx = -speed
    if (this.keys.right.isDown) vx = speed
    if (this.keys.up.isDown) vy = -speed
    if (this.keys.down.isDown) vy = speed
    this.player.setVelocity(vx, vy)
    // Walk animations
    const moving = Math.abs(vx) + Math.abs(vy) > 0
    if (moving) {
      if (Math.abs(vy) >= Math.abs(vx)) this.lastDir = vy < 0 ? 'up' : 'down'; else this.lastDir = vx < 0 ? 'left' : 'right'
      const key = this.lastDir === 'up' ? 'slime-walk-up' : this.lastDir === 'down' ? 'slime-walk-down' : this.lastDir === 'left' ? 'slime-walk-left' : 'slime-walk-right'
      this.player.anims.play(key, true)
    } else {
      this.player.anims.stop()
      const idleKey = this.lastDir === 'up' ? 'slime_u_1' : this.lastDir === 'down' ? 'slime_d_1' : this.lastDir === 'left' ? 'slime_l_1' : 'slime_r_1'
      this.player.setTexture(idleKey)
    }

    // Altar/Guild proximity prompts + UI toggle
    const near = (z: Phaser.GameObjects.Zone, pad = 8) => {
      const b = z.getBounds();
      return Math.abs(this.player.x - (b.x + b.width/2)) <= b.width/2 + pad && Math.abs(this.player.y - (b.y + b.height/2)) <= b.height/2 + pad
    }
    if (!this.uiOpen) {
      if (near(this.altarZone)) this.interactionPrompt.setText('E: Use Altar (placeholder)')
      else if (near(this.guildZone)) this.interactionPrompt.setText('E: Enter Adventurers Guild (placeholder)')
      else if (vx === 0 && vy === 0) this.interactionPrompt.setText('')
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      if (!this.uiOpen && near(this.altarZone)) {
        this.openAltarUI()
      } else if (this.uiOpen) {
        this.closeAltarUI()
      }
    }

    // Handle altar UI hotkeys when open
    if (this.uiOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE))) {
        this.tryPurchase('hp', 40)
      }
      if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO))) {
        this.tryPurchase('atk', 50)
      }
    }
  }

  private openAltarUI() {
    const w = this.scale.width, h = this.scale.height
    const panel = this.add.container(w/2, h/2).setScrollFactor(0).setDepth(20)
    const bg = this.add.rectangle(0, 0, 340, 190, 0x000000, 0.86)
    const border = this.add.rectangle(0, 0, 348, 198).setStrokeStyle(2, 0xffffaa)
    const title = this.add.text(0, -70, 'Altar Blessings (Mock)', { color: '#ffffaa', fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5)
    const gold = this.add.text(0, -48, `Your Gold: ${state.get().gold}`, { color: '#ffff66', fontSize: '12px' }).setOrigin(0.5)
    const opt1 = this.add.text(-150, -12, '1) +5 Max HP — 40 Gold', { color: '#ffffff', fontSize: '13px' })
    const opt2 = this.add.text(-150, 16, '2) +1 ATK — 50 Gold', { color: '#ffffff', fontSize: '13px' })
    const hint = this.add.text(0, 74, 'E: close  •  1/2: purchase', { color: '#cccccc', fontSize: '11px' }).setOrigin(0.5)
    this.altarMsg = this.add.text(0, 44, '', { color: '#aaffaa', fontSize: '12px' }).setOrigin(0.5)
    panel.add([bg, border, title, gold, opt1, opt2, this.altarMsg, hint])
    this.altarUI = panel
    this.uiOpen = true

    // Keep gold display live while open
    const unsub = state.subscribe(s => { try { gold.setText(`Your Gold: ${s.gold}`) } catch {} })
    panel.setData('unsub', unsub)
  }

  private closeAltarUI() {
    try {
      const unsub: (() => void) | undefined = this.altarUI?.getData('unsub')
      unsub && unsub()
      this.altarUI?.destroy()
    } catch (e) {}
    this.altarUI = undefined
    try { this.altarMsg?.destroy() } catch {}
    this.altarMsg = undefined
    this.uiOpen = false
  }

  private tryPurchase(kind: 'hp'|'atk', cost: number) {
    if (!this.uiOpen) return
    if (!state.canSpend(cost)) {
      this.flashAltarMsg('Not enough gold')
      return
    }
    const ok = state.spendGold(cost)
    if (ok) {
      state.applyUpgrade(kind, 1)
      const label = kind === 'hp' ? '+5 Max HP (mock)' : '+1 ATK (mock)'
      this.flashAltarMsg(`Blessing received: ${label}`)
      // Small floating text near player for feedback
      const t = this.add.text(this.player.x, this.player.y - 30, `-${cost} Gold`, { color: '#ffdd77', fontSize: '12px' }).setScrollFactor(0)
      this.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 900, onComplete: () => t.destroy() })
    }
  }

  private flashAltarMsg(text: string) {
    if (!this.altarMsg) return
    this.altarMsg.setText(text).setColor('#aaffaa')
    this.altarMsg.alpha = 1
    this.tweens.add({ targets: this.altarMsg, alpha: { from: 1, to: 0.2 }, duration: 1200, yoyo: true })
  }
}
