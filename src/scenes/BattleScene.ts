import Phaser from 'phaser'
import { SOUL_SPEED } from '../config'
import GoblinEnemy from '../battle/GoblinEnemy'
import OrcEnemy from '../battle/OrcEnemy'
import GoblinKingEnemy from '../battle/GoblinKingEnemy'
import Enemy from '../battle/Enemy'
import { state } from '../state'

enum BattleState {
  MENU,
  TARGET,
  PLAYER_ATTACK,
  ENEMY_ATTACK,
  VICTORY,
  DEFEAT
}

type EnemyType = 'goblin' | 'orc' | 'goblinKing' | 'generic'
type EnemyEntry = {
  name: string
  hp: number
  currentHP: number
  type: EnemyType
  instance?: Enemy | null
}

export default class BattleScene extends Phaser.Scene {
  // core state + data
  private state: BattleState = BattleState.MENU
  private enemies: EnemyEntry[] = []
  private playerHP: number = 20
  private sfxGain?: any

  // menu/UI
  private menuOptions: string[] = ['Attack', 'Spare', 'Run']
  private menuTexts: Phaser.GameObjects.Text[] = []
  private menuArrow!: Phaser.GameObjects.Image
  private selectedIndex: number = 0
  private statusText!: Phaser.GameObjects.Text
  private enemyHpBars: Phaser.GameObjects.Rectangle[] = []
  private enemySprites: Phaser.GameObjects.Image[] = []

  // dodge phase
  private dodgeArea!: Phaser.GameObjects.Rectangle
  private playerBox!: Phaser.Physics.Arcade.Image
  private playerRadius: number = 0
  private bullets!: Phaser.Physics.Arcade.Group
  private movementKeys!: Record<string, Phaser.Input.Keyboard.Key>
  private enemyAttackTimer?: Phaser.Time.TimerEvent
  private invincibleUntil: number = 0
  private iframeTimer?: Phaser.Time.TimerEvent
  private multiAttackInProgress: boolean = false
  private pendingSubAttacks: number = 0
  private bulletsCollider?: Phaser.Physics.Arcade.Collider
  private soulAura?: Phaser.GameObjects.Ellipse
  private multiAttackWatchdog?: Phaser.Time.TimerEvent
  private heartBeatTween?: Phaser.Tweens.Tween
  // Purple Mode: gravity-applied soul for orc fights
  private purpleMode: boolean = false
  private purpleGravity: number = 900
  private purpleGravityAscendFactor: number = 0.25
  private purpleVy: number = 0
  private purpleJumpSpeed: number = 820 // slightly weaker initial jump impulse (px/s)
  private purpleJumpHoldAccel: number = 0 // no extra upward accel while holding; use lighter gravity instead
  private purpleJumpHoldMaxMs: number = 200 // slightly shorter hold window (ms)
  private purpleJumpHoldLeft: number = 0
  private purpleMaxJumpHeight: number = 160 // absolute cap from ground
  private jumpKey?: Phaser.Input.Keyboard.Key
  private purpleMaxUpSpeed: number = 520
  private purpleCoyoteMs: number = 90
  private purpleCoyoteLeft: number = 0
  private purpleJumpBufferMs: number = 90
  private purpleJumpBufferLeft: number = 0

  constructor() { super('Battle') }

  create() {
    try {
      const cam = this.cameras.main
      const debugLabel = this.add.text(cam.width/2, cam.height/2 - 60, 'Battle: init', { color: '#ffffff', fontSize: '18px', backgroundColor: '#000000' }).setOrigin(0.5).setDepth(9999)
      debugLabel.setScrollFactor(0)
      debugLabel.setText('Battle: start')

      cam.setBackgroundColor('#0c1b1c')
      const bg = this.add.image(0, 0, 'battle_forest_bg').setOrigin(0).setDepth(-30)
      try { bg.setDisplaySize(cam.width, cam.height) } catch (e) {}
      debugLabel.setText('Battle: bg done')

      this.statusText = this.add.text(10, 6, this.status(), { color: '#ffffff', fontSize: '16px' }).setScrollFactor(0)
      // build enemy placeholders (will be positioned by init)
      this.enemyHpBars = []
      this.enemySprites = []
      const w = cam.width
      const per = Math.max(1, this.enemies.length)
      for (let i = 0; i < this.enemies.length; i++) {
        const ex = w / 2 + (i - (per - 1) / 2) * 120
        const t = this.enemies[i].type
        const enemyKey = t === 'goblin' ? 'goblin' : (t === 'orc' ? 'orc' : (t === 'goblinKing' ? 'goblin_king' : 'enemy'))
        const sprite = this.add.image(ex, 120, enemyKey).setScale(1.5)
        this.enemySprites[i] = sprite
        const bar = this.add.rectangle(ex - 32, 120 - 48, 64, 6, 0xff4444).setOrigin(0, 0.5)
        this.enemyHpBars[i] = bar
      }
      this.buildMenu()
      debugLabel.setText('Battle: UI done')
      try { this.input.keyboard!.off('keydown', this.handleMenuInput, this) } catch (e) {}
      this.input.keyboard!.on('keydown', this.handleMenuInput, this)
      this.movementKeys = this.input.keyboard!.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D }) as Record<string, Phaser.Input.Keyboard.Key>
      this.events.on('shutdown', this.cleanup, this)
      debugLabel.setText('Battle: handlers set; ready')
      this.time.delayedCall(1200, () => { try { debugLabel.destroy() } catch (e) {} })
    } catch (err) {
      console.error('BattleScene.create runtime error', err)
      try { this.add.text(20, 20, 'Battle failed to initialize. Returning...', { color: '#ff4444' }) } catch (e) {}
      try { this.scene.start('Overworld') } catch (e) {}
    }
  }

  init(data: any) {
    // Always start each battle at full HP based on level scaling
    try { this.playerHP = state.maxHP() } catch { this.playerHP = 20 }
    const list = Array.isArray(data?.enemies) ? data.enemies : (data?.enemy ? [data.enemy] : [])
    this.enemies = list.map((e: any): EnemyEntry => {
      const type: EnemyType = (e.type as EnemyType) ?? 'generic'
      let instance: Enemy | null | undefined = e.instance
      if (!instance) {
        if (type === 'goblin') {
          try { instance = new GoblinEnemy({ name: e.name, hp: e.hp }) } catch { instance = null }
        } else if (type === 'orc') {
          try { instance = new OrcEnemy({ name: e.name, hp: e.hp }) } catch { instance = null }
        } else if (type === 'goblinKing') {
          try { instance = new GoblinKingEnemy({ name: e.name, hp: e.hp }) } catch { instance = null }
        }
      }
      return {
        name: e.name ?? 'Enemy',
        hp: e.hp ?? 10,
        currentHP: e.hp ?? 10,
        type,
        instance
      }
    })
    // Ignore incoming playerHP to ensure full heal applies to all future fights
  }

  

  private cleanup() {
    try { this.input.keyboard!.off('keydown', this.handleMenuInput, this) } catch (e) {}
    if (this.enemyAttackTimer) { try { this.enemyAttackTimer.remove(false) } catch (e) {} }
    if (this.multiAttackWatchdog) { try { this.multiAttackWatchdog.remove(false) } catch (e) {} ; this.multiAttackWatchdog = undefined }
    if (this.bulletsCollider) { try { this.physics.world.removeCollider(this.bulletsCollider) } catch (e) {} ; this.bulletsCollider = undefined }
    if (this.bullets) { try { this.bullets.clear(true, true) } catch (e) {} ; try { (this.bullets as any).destroy?.(true) } catch (e) {} ; (this as any).bullets = undefined }
    try { if (this.dodgeArea) this.dodgeArea.destroy() } catch (e) {}
    try { if (this.playerBox) this.playerBox.destroy() } catch (e) {}
    try { if (this.soulAura) this.soulAura.destroy() } catch (e) {}
    this.multiAttackInProgress = false
    this.pendingSubAttacks = 0
  }

  private status() {
    const enemyStatus = this.enemies.map((e, i) => `${e.name} ${i + 1}: ${Math.max(0, e.currentHP)}/${e.hp}`).join('  ')
    return `${enemyStatus}    Player HP: ${this.playerHP}`
  }

  // Centralized damage handler with 1s i-frames to prevent multi-hits
  public applyDamage(amount: number, sfx: 'dagger' | 'bomb' | 'slash' | 'hit' | 'win' = 'hit') {
    // respect invincibility window
    if (this.time && this.time.now < this.invincibleUntil) return
    this.playerHP -= amount
    if (this.playerBox) {
      this.showDamageText(this.playerBox, amount, '#ff4444')
      // i-frames visual: green tint
      try { this.playerBox.setTint(0x00ff66) } catch (e) {}
      // trigger a single heartbeat pulse (~1s total with yoyo)
      try { this.heartBeatTween?.stop() } catch (e) {}
      try { this.playerBox.setScale(1) } catch (e) {}
      this.heartBeatTween = this.tweens.add({
        targets: this.playerBox,
        scale: { from: 1.0, to: 1.08 },
        duration: 500,
        yoyo: true,
        repeat: 0
      })
    }
    this.playSfx(sfx)
    try { this.cameras.main.shake(120, 0.008) } catch (e) {}
    if (this.statusText) this.statusText.setText(this.status())
    // start i-frames for 1s
    if (this.time) {
      this.invincibleUntil = this.time.now + 1000
      if (this.iframeTimer) { try { this.iframeTimer.remove(false) } catch (e) {} }
      this.iframeTimer = this.time.delayedCall(1000, () => {
        // Only clear if i-frames actually ended
        if (this.time && this.time.now >= this.invincibleUntil) {
          try {
            if (this.playerBox) {
              if (this.purpleMode) this.playerBox.setTint(0x9b59b6); else this.playerBox.clearTint()
            }
          } catch (e) {}
        }
      })
    }
    if (this.playerHP <= 0) {
      this.lose()
    }
  }

  private buildMenu() {
    const startY = 100
    const x = 20
    // remove existing
    this.menuTexts.forEach(t => t.destroy())
    this.menuTexts = []
    // panel bg
    const menuBg = this.add.rectangle(x - 10, startY - 8, 160, this.menuOptions.length * 28 + 12, 0x000000, 0.5).setOrigin(0, 0)
    this.menuArrow = this.add.image(x - 18, startY, 'arrow').setOrigin(0, 0.5)
    this.menuOptions.forEach((opt, idx) => {
      const txt = this.add.text(x, startY + idx * 28, opt, { color: '#ffffff', fontSize: '18px' })
      this.menuTexts.push(txt)
    })
    this.updateMenuHighlight()
  }

  private updateMenuHighlight() {
    this.menuTexts.forEach((txt, idx) => {
      const sel = idx === this.selectedIndex
      txt.setColor(sel ? '#ffff00' : '#ffffff')
      if (sel && this.menuArrow) this.menuArrow.setY(txt.y + txt.height / 2)
    })
  }

  private handleMenuInput(event: KeyboardEvent) {
    if (this.state !== BattleState.MENU && this.state !== BattleState.TARGET) return
    switch (event.key) {
      case 'w': this.moveSelection(-1); break
      case 's': this.moveSelection(1); break
      case 'Enter':
      case ' ': this.confirmSelection(); break
    }
  }

  private moveSelection(delta: number) {
    const len = this.menuOptions.length
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + delta, 0, len)
    this.updateMenuHighlight()
  }

  private confirmSelection() {
    // If we're in target mode, handle enemy selection/back
    if (this.state === BattleState.TARGET) {
      const idx = this.selectedIndex
      const choice = this.menuOptions[idx]
      if (choice === 'Back') {
        this.menuOptions = ['Attack', 'Spare', 'Run']
        this.selectedIndex = 0
        this.buildMenu()
        this.state = BattleState.MENU
        return
      }
      // perform attack on selected enemy index
      if (idx >= 0 && idx < this.enemies.length) {
        // lock input and perform attack
        this.state = BattleState.PLAYER_ATTACK
        this.playerAttack(idx)
        // restore menu for after the enemy turn
        this.menuOptions = ['Attack', 'Spare', 'Run']
        this.selectedIndex = 0
        this.buildMenu()
      }
      return
    }

    const choice = this.menuOptions[this.selectedIndex]
    switch (choice) {
      case 'Attack':
        if (this.enemies.length > 1) {
          // enter targeting mode
          this.menuOptions = this.enemies.map((e, i) => `${e.name} ${i + 1}`).concat(['Back'])
          this.selectedIndex = 0
          this.buildMenu()
          this.state = BattleState.TARGET
        } else {
          // lock input for this attack to prevent spamming
          this.state = BattleState.PLAYER_ATTACK
          this.playerAttack(0)
        }
        break
      case 'Spare':
        this.add.text(10, 140, 'You spared the enemy.', { color: '#aaffaa' })
        this.time.delayedCall(800, () => this.win())
        break
      case 'Run':
        this.add.text(10, 140, 'You ran away...', { color: '#ffffaa' })
        this.time.delayedCall(400, () => this.endBattle())
        break
    }
  }

  private playerAttack(targetIdx: number) {
    // simple attack flow
    // base 6 + 1 per level above 1
    let dmg = 6
    try { dmg += state.dmgBonus() } catch {}
    const t = this.enemies[targetIdx]
    if (!t) return
    t.currentHP -= dmg
    this.showDamageTextAtEnemy(targetIdx, dmg)
    this.updateHpBar(targetIdx)
    if (this.statusText) this.statusText.setText(this.status())
    this.playSfx('hit')
    if (t.currentHP <= 0) {
      this.enemyDefeated(targetIdx)
      return
    }
    // enemy turn
    this.time.delayedCall(400, () => this.startEnemyAttack())
  }

  private enemyDefeated(idx: number) {
    const sprite = this.enemySprites[idx]
    // award gold based on enemy type before removing
    try {
      const enemy = this.enemies[idx]
      if (enemy) {
        if (enemy.type === 'goblin') {
          state.addGold(10)
          state.addXP(20)
          if (sprite) this.showFloatingGold(sprite.x, sprite.y, 10)
        } else if (enemy.type === 'orc') {
          state.addGold(25)
          state.addXP(50)
          if (sprite) this.showFloatingGold(sprite.x, sprite.y, 25)
        }
      }
    } catch (e) {}
    if (sprite) sprite.destroy()
    this.enemies.splice(idx, 1)
    this.enemyHpBars.splice(idx, 1)
    this.enemySprites.splice(idx, 1)
    if (this.statusText) this.statusText.setText(this.status())

    if (this.enemies.length === 0) {
      this.win()
      return
    }
    // rebuild menu if in target state
    this.menuOptions = ['Attack', 'Spare', 'Run']
    this.buildMenu()
    this.startEnemyAttack()
  }

  private showDamageTextAtEnemy(idx: number, amount: number) {
    const sprite = this.enemySprites[idx]
    if (!sprite) return
    const x = sprite.x, y = sprite.y
    const t = this.add.text(x, y - 20, `-${amount}`, { color: '#ff4444', fontSize: '16px' }).setOrigin(0.5)
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() })
  }

  private updateHpBar(idx: number) {
    const enemy = this.enemies[idx]
    const bar = this.enemyHpBars[idx]
    if (!enemy || !bar) return
    const ratio = Phaser.Math.Clamp(enemy.currentHP / enemy.hp, 0, 1)
    bar.scaleX = ratio
  }

  // sprites are tracked explicitly via enemySprites[]

  private startEnemyAttack() {
    this.state = BattleState.ENEMY_ATTACK
    const cam = this.cameras.main
    // prepare dodge area once
    this.setupDodgePhase( Math.min(cam.width - 40, 900), Math.min(cam.height * 0.6, 600) )
    // Enable Purple Mode (gravity) for orc encounters
    const hasOrc = this.enemies.some(e => e.type === 'orc')
    this.setPurpleMode(hasOrc)
    // determine how many concurrent enemies will attack (up to 2 as per request)
    const attackers = Math.min(2, this.enemies.length)
    if (attackers <= 0) { this.endEnemyAttack(); return }
    this.multiAttackInProgress = attackers > 1
    this.pendingSubAttacks = attackers
    // ensure a shared bullets group exists and overlap is set
    if (!this.bullets) {
      this.bullets = this.physics.add.group()
      if (this.bulletsCollider) { try { this.physics.world.removeCollider(this.bulletsCollider) } catch (e) {} }
      this.bulletsCollider = this.physics.add.overlap(this.playerBox, this.bullets, (a: any, b: any) => this.onPlayerHit(a as any, b as any), undefined, this)
    }
    for (let i = 0; i < attackers; i++) {
      const enemy = this.enemies[i]
      try {
        // Set per-enemy telegraph color (first = green, second = yellow)
        const color = i === 0 ? 0x33ff66 : 0xffff55
        if (enemy?.instance) { (enemy.instance as any).attackColor = color }
        if (enemy?.instance && typeof (enemy.instance as any).performAttack === 'function') {
          const b = this.dodgeArea.getBounds()
          ;(enemy.instance as any).performAttack(this, b.x, b.y, b.width, b.height)
        } else {
          this.runGenericSpray()
        }
      } catch (e) {
        console.warn('Enemy performAttack failed, using generic spray', e)
        this.runGenericSpray()
      }
    }
    // Safety watchdog: force finalize if sub-attacks fail to complete
    if (this.multiAttackInProgress) {
      if (this.multiAttackWatchdog) { try { this.multiAttackWatchdog.remove(false) } catch (e) {} }
      this.multiAttackWatchdog = this.time.delayedCall(12000, () => {
        if (this.state === BattleState.ENEMY_ATTACK) {
          this.pendingSubAttacks = 0
          this.multiAttackInProgress = false
          this.finalizeEnemyAttackCleanup()
        }
      })
    }
  }

  private setPurpleMode(on: boolean) {
    this.purpleMode = !!on
    // Adjust visuals if playerBox/aura already exist
    if (this.playerBox) {
      try { this.playerBox.setTint(on ? 0x9b59b6 : 0xffffff) } catch (e) {}
      try { (this.playerBox.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(!on) } catch (e) {}
    }
    if (this.soulAura) {
      try { (this.soulAura as any).setFillStyle?.(on ? 0x9b59b6 : 0x66ccff, on ? 0.22 : 0.18) } catch (e) {}
      this.soulAura.setAlpha(on ? 0.22 : 0.18)
    }
    if (on) {
      // initialize platformer state
      this.purpleVy = 0
      this.purpleJumpHoldLeft = 0
      // Prime coyote time and jump buffer at mode start to avoid missed jumps when spawning mid-air or pressing early
      this.purpleCoyoteLeft = this.purpleCoyoteMs
      this.purpleJumpBufferLeft = this.purpleJumpBufferMs
      if (!this.jumpKey) this.jumpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      // adapt max jump to dodge area size (cap reasonable range)
      const b = this.dodgeArea?.getBounds()
      if (b) {
        this.purpleMaxJumpHeight = Phaser.Math.Clamp(Math.floor(b.height * 0.55), 100, 220)
        // Snap the soul to ground at mode start to ensure a valid initial jump state
        try {
          const hh = this.playerRadius || (this.playerBox.displayHeight / 2)
          const groundY = b.y + b.height - hh
          this.playerBox.y = groundY
          const body = this.playerBox.body as Phaser.Physics.Arcade.Body
          body.setVelocityY(0)
        } catch (e) {}
      }
      // If Space is already held as the phase begins, ensure a buffered jump is allowed
      try { if (this.jumpKey && this.jumpKey.isDown) this.purpleJumpBufferLeft = this.purpleJumpBufferMs } catch (e) {}
    } else {
      this.purpleVy = 0
      this.purpleJumpHoldLeft = 0
      this.purpleCoyoteLeft = 0
      this.purpleJumpBufferLeft = 0
    }
  }

  private runGenericSpray() {
    const cam = this.cameras.main
    if (!this.bullets) {
      this.bullets = this.physics.add.group()
      this.physics.add.overlap(this.playerBox, this.bullets, (a: any, b: any) => this.onPlayerHit(a as any, b as any), undefined, this)
    }
    const count = 8
    const areaX = (cam.width - 300) / 2
    for (let i = 0; i < count; i++) {
      const bx = Phaser.Math.Between(areaX + 12, areaX + 300 - 12)
      const by = Phaser.Math.Between(20, 80)
      const bullet = this.physics.add.image(bx, by, 'bullet')
      bullet.setVelocity(0, Phaser.Math.Between(120, 200))
      bullet.setData('damage', 1)
      bullet.setCircle(5)
      this.bullets.add(bullet)
    }
    this.enemyAttackTimer = this.time.delayedCall(2200, () => this.endEnemyAttack())
  }

  private setupDodgePhase(width: number, height: number) {
    // clear existing
    if (this.dodgeArea) try { this.dodgeArea.destroy() } catch (e) {}
    if (this.playerBox) try { this.playerBox.destroy() } catch (e) {}

    const cam = this.cameras.main
    const areaW = Math.min(cam.width - 40, width)
    const areaH = Math.min(cam.height * 0.6, height)
    const x = (cam.width - areaW) / 2
    const y = cam.height - areaH - 50
    this.dodgeArea = this.add.rectangle(x, y, areaW, areaH, 0x000000, 0.55).setOrigin(0)

    // create player soul
    this.playerBox = this.physics.add.image(x + areaW / 2, y + areaH / 2, 'heart').setScale(1)
    this.playerBox.setOrigin(0.5, 0.5)
    const pbBody = this.playerBox.body as Phaser.Physics.Arcade.Body
    const fullDiameter = Math.min(this.playerBox.displayWidth, this.playerBox.displayHeight)
    const fullRadius = Math.max(1, Math.floor(fullDiameter / 2))
    // shrink hitbox to 80% for tighter dodging
    const radius = Math.max(1, Math.floor(fullRadius * 0.8))
    const diameter = radius * 2
    pbBody.setCircle(radius)
    const offsetX = Math.floor((this.playerBox.displayWidth - diameter) / 2)
    const offsetY = Math.floor((this.playerBox.displayHeight - diameter) / 2)
    pbBody.setOffset(offsetX, offsetY)
    pbBody.setCollideWorldBounds(true)
    this.playerRadius = radius
    this.playerBox.setDepth(5)

    // soft glow aura following the soul (low overhead)
    try { if (this.soulAura) this.soulAura.destroy() } catch (e) {}
    this.soulAura = this.add.ellipse(this.playerBox.x, this.playerBox.y, radius * 2.8, radius * 2.2, 0x66ccff, 0.18)
    try { this.soulAura.setBlendMode(Phaser.BlendModes.ADD) } catch (e) {}
    this.soulAura.setDepth(4)
    this.tweens.add({ targets: this.soulAura, alpha: { from: 0.12, to: 0.22 }, scaleX: { from: 0.95, to: 1.05 }, scaleY: { from: 0.95, to: 1.05 }, duration: 900, yoyo: true, repeat: -1 })
    // If Purple Mode active, re-apply visuals immediately
    if (this.purpleMode) {
      try { this.playerBox.setTint(0x9b59b6) } catch {}
      try { (this.soulAura as any).setFillStyle?.(0x9b59b6, 0.22) } catch {}
      this.soulAura.setAlpha(0.22)
    }

    // ensure movement keys exist
    if (!this.movementKeys) {
      this.movementKeys = this.input.keyboard!.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      }) as Record<string, Phaser.Input.Keyboard.Key>
    }
    // Ensure bullets group and collider exist for upcoming overlaps
    if (!this.bullets) {
      this.bullets = this.physics.add.group()
      if (this.bulletsCollider) { try { this.physics.world.removeCollider(this.bulletsCollider) } catch (e) {} }
      this.bulletsCollider = this.physics.add.overlap(this.playerBox, this.bullets, (a: any, b: any) => this.onPlayerHit(a as any, b as any), undefined, this)
    }
  }


  private onPlayerHit(objA: Phaser.GameObjects.GameObject, objB: Phaser.GameObjects.GameObject) {
    // Ignore hits once battle has ended
    if (this.state === BattleState.DEFEAT || this.state === BattleState.VICTORY) return
    // Overlap is registered as (playerBox, bulletsGroup), so objB is the projectile
    const bullet: any = objB
    const dmg = (bullet && bullet.getData) ? (bullet.getData('damage') ?? 1) : 1
    // Persist certain projectiles (e.g., boulders) on hit
    try {
      const persist = bullet?.getData ? bullet.getData('persistOnHit') : false
      if (!persist) bullet.destroy()
    } catch (e) {}
    this.applyDamage(dmg, 'hit')
  }

  private showDamageText(target: Phaser.GameObjects.GameObject, amount: number, color: string) {
    const x = (target as any).x || 0
    const y = (target as any).y || 0
    const t = this.add.text(x, y - 20, `-${amount}`, { color, fontSize: '16px' }).setOrigin(0.5)
    this.tweens.add({ targets: t, y: y - 44, alpha: 0, duration: 700, onComplete: () => t.destroy() })
  }

  private showFloatingGold(x: number, y: number, amount: number) {
    try {
      const txt = this.add.text(x, y - 12, `+${amount} G`, { color: '#ffdd55', fontSize: '16px', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5)
      this.tweens.add({ targets: txt, y: y - 52, alpha: 0, duration: 900, onComplete: () => txt.destroy() })
    } catch (e) {}
  }

  private endEnemyAttack() {
    if (this.multiAttackInProgress) {
      this.pendingSubAttacks = Math.max(0, this.pendingSubAttacks - 1)
      if (this.pendingSubAttacks > 0) return
      this.multiAttackInProgress = false
    }
    this.finalizeEnemyAttackCleanup()
  }

  private finalizeEnemyAttackCleanup() {
    if (this.multiAttackWatchdog) { try { this.multiAttackWatchdog.remove(false) } catch (e) {} ; this.multiAttackWatchdog = undefined }
    if (this.bulletsCollider) { try { this.physics.world.removeCollider(this.bulletsCollider) } catch (e) {} ; this.bulletsCollider = undefined }
    if (this.bullets) { try { this.bullets.clear(true, true) } catch (e) {} ; try { (this.bullets as any).destroy?.(true) } catch (e) {} ; (this as any).bullets = undefined }
    if (this.dodgeArea) try { this.dodgeArea.destroy() } catch (e) {}
    if (this.playerBox) try { this.playerBox.destroy() } catch (e) {}
    if (this.soulAura) try { this.soulAura.destroy() } catch (e) {}
    if (this.heartBeatTween) { try { this.heartBeatTween.stop() } catch (e) {} ; this.heartBeatTween = undefined }
    // Disable Purple Mode after attack phase ends
    this.setPurpleMode(false)
    this.state = BattleState.MENU
    this.menuOptions = ['Attack', 'Spare', 'Run']
    this.buildMenu()
    if (this.statusText) this.statusText.setText(this.status())
    if (this.playerHP <= 0) return
    const msg = this.add.text(10, 120, 'Your turn...', { color: '#ffffff', fontSize: '18px' })
    this.tweens.add({ targets: msg, alpha: 0, duration: 1000, onComplete: () => msg.destroy() })
  }

  private win() {
    this.state = BattleState.VICTORY
    this.playSfx('win')
    this.add.text(10, 140, 'Enemy defeated! Returning to overworld...', { color: '#aaffaa' })
    this.time.delayedCall(800, () => this.endBattle())
  }

  private lose() {
    this.state = BattleState.DEFEAT
    const cam = this.cameras.main
    const cx = cam.width / 2
    const cy = cam.height / 2
    this.add.text(cx, cy - 10, 'You fell in battle...', { color: '#ffaaaa', fontSize: '18px' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(9999)
    this.add.text(cx, cy + 14, 'A warm light restores you to full health (20).', { color: '#aaffaa', fontSize: '14px' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(9999)
    // Immediately stop any ongoing attacks/overlaps
    try { this.input.keyboard!.off('keydown', this.handleMenuInput, this) } catch (e) {}
    if (this.enemyAttackTimer) { try { this.enemyAttackTimer.remove(false) } catch (e) {} ; this.enemyAttackTimer = undefined }
    if (this.multiAttackWatchdog) { try { this.multiAttackWatchdog.remove(false) } catch (e) {} ; this.multiAttackWatchdog = undefined }
    if (this.bulletsCollider) { try { this.physics.world.removeCollider(this.bulletsCollider) } catch (e) {} ; this.bulletsCollider = undefined }
    if (this.bullets) { try { this.bullets.clear(true, true) } catch (e) {} ; try { (this.bullets as any).destroy?.(true) } catch (e) {} ; (this as any).bullets = undefined }
    try { if (this.dodgeArea) this.dodgeArea.destroy() } catch (e) {}
    try { if (this.playerBox) this.playerBox.destroy() } catch (e) {}
    try { if (this.soulAura) this.soulAura.destroy() } catch (e) {}
    if (this.heartBeatTween) { try { this.heartBeatTween.stop() } catch (e) {} ; this.heartBeatTween = undefined }
    // Heal to full before leaving battle so the next encounter starts at max HP for current level
    try { this.playerHP = state.maxHP() } catch { this.playerHP = 20 }
    // Keep the defeat screen visible a bit longer (additional ~2s)
    this.time.delayedCall(2900, () => this.endBattle())
  }

  private endBattle() {
    const cam = this.cameras.main
    cam.fadeOut(200)
    cam.once('camerafadeoutcomplete', () => {
      try { this.scene.start('Overworld') } catch (e) {}
      // cleanup
      try { this.input.keyboard!.off('keydown', this.handleMenuInput, this) } catch (e) {}
      if (this.enemyAttackTimer) try { this.enemyAttackTimer.remove(false) } catch (e) {}
      if (this.bullets) try { this.bullets.clear(true, true) } catch (e) {}
      try { if (this.dodgeArea) this.dodgeArea.destroy() } catch (e) {}
      try { if (this.playerBox) this.playerBox.destroy() } catch (e) {}
      this.state = BattleState.MENU
      this.menuTexts.forEach(t => t.setVisible(true))
      this.scene.stop()
    })
  }

  update(time: number, delta: number) {
    if (this.state === BattleState.ENEMY_ATTACK && this.playerBox) {
      const keys = this.movementKeys
      const body = this.playerBox.body as Phaser.Physics.Arcade.Body
      const speed = SOUL_SPEED
      // Horizontal velocity from input
      if (keys.left.isDown) body.setVelocityX(-speed)
      else if (keys.right.isDown) body.setVelocityX(speed)
      else body.setVelocityX(0)

      // Vertical motion: platformer style when Purple Mode; otherwise free-fly
      if (this.purpleMode) {
        const { x, y, width, height } = this.dodgeArea!.getBounds()
        const hh = this.playerRadius || (this.playerBox.displayHeight / 2)
        const groundY = y + height - hh
        const ceilY = y + hh
        const maxJumpY = groundY - this.purpleMaxJumpHeight
        const dt = delta / 1000
        // buffer Space presses slightly before landing
        if (this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
          this.purpleJumpBufferLeft = this.purpleJumpBufferMs
        }
        // when releasing jump in-air, cancel upward momentum immediately (classic variable jump height)
        if (this.jumpKey && Phaser.Input.Keyboard.JustUp(this.jumpKey)) {
          // only if ascending and not grounded
          if (this.playerBox.y < groundY - 0.6 && this.purpleVy < 0) {
            this.purpleVy = 0
          }
          this.purpleJumpHoldLeft = 0
        }
        // detect grounded with tolerance
        const grounded = this.playerBox.y >= groundY - 0.6
        // coyote refresh
        if (grounded) this.purpleCoyoteLeft = this.purpleCoyoteMs
        else this.purpleCoyoteLeft = Math.max(0, this.purpleCoyoteLeft - delta)
        // process jump: buffer + coyote or on ground
        const canJumpNow = grounded || this.purpleCoyoteLeft > 0
        if (this.purpleJumpBufferLeft > 0 && canJumpNow) {
          this.purpleVy = -this.purpleJumpSpeed
          this.purpleJumpHoldLeft = this.purpleJumpHoldMaxMs
          this.purpleJumpBufferLeft = 0
          this.purpleCoyoteLeft = 0
        }
        // determine if at or above max jump height; stop further 'hold' effect at the cap
        const reachedMax = this.playerBox.y <= maxJumpY + 0.5
        // apply hold timer decay while below the cap
        if (this.jumpKey && this.jumpKey.isDown && this.purpleJumpHoldLeft > 0 && !reachedMax) {
          this.purpleJumpHoldLeft = Math.max(0, this.purpleJumpHoldLeft - delta)
        } else if (reachedMax) {
          this.purpleJumpHoldLeft = 0
        }
        // gravity (lighter while ascending and holding AND below height cap)
        let effG = this.purpleGravity
        if (this.purpleVy < 0 && this.jumpKey && this.jumpKey.isDown && !reachedMax) effG = this.purpleGravity * this.purpleGravityAscendFactor
        this.purpleVy += effG * dt
        // cap upward speed so jump doesn't accelerate too much
        if (this.purpleVy < -this.purpleMaxUpSpeed) this.purpleVy = -this.purpleMaxUpSpeed
        // apply manual integration; stop physics Y from interfering
        body.setVelocityY(0)
        this.playerBox.y += this.purpleVy * dt
        // clamp to ceiling and ground
        if (this.playerBox.y < ceilY) {
          this.playerBox.y = ceilY
          if (this.purpleVy < 0) this.purpleVy = 0
        }
        // Do not hard-clamp to max jump height; simply stop upward assistance and let gravity decelerate
        if (this.playerBox.y > groundY) {
          this.playerBox.y = groundY
          this.purpleVy = 0
          this.purpleJumpHoldLeft = 0
        }
        // decay jump buffer over time
        if (this.purpleJumpBufferLeft > 0) this.purpleJumpBufferLeft = Math.max(0, this.purpleJumpBufferLeft - delta)
      } else {
        // Normal free-fly
        let vy = 0
        if (keys.up.isDown) vy = -speed
        else if (keys.down.isDown) vy = speed
        body.setVelocityY(vy)
      }
      if (this.dodgeArea) {
        const { x, y, width, height } = this.dodgeArea.getBounds()
        const hw = this.playerRadius || (this.playerBox.displayWidth / 2)
        const hh = this.playerRadius || (this.playerBox.displayHeight / 2)
        this.playerBox.x = Phaser.Math.Clamp(this.playerBox.x, x + hw, x + width - hw)
        this.playerBox.y = Phaser.Math.Clamp(this.playerBox.y, y + hh, y + height - hh)
      }
      // follow aura to playerBox
      if (this.soulAura && this.playerBox) {
        this.soulAura.x = this.playerBox.x
        this.soulAura.y = this.playerBox.y
      }
    }
  }

  private playSfx(type: 'dagger' | 'bomb' | 'slash' | 'hit' | 'win' = 'hit') {
    try {
      const sm: any = this.sound
      const ctx = sm.context
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      if (this.sfxGain) gain.connect(this.sfxGain); else gain.connect(ctx.destination)
      switch (type) {
        case 'dagger': osc.frequency.value = 880; break
        case 'bomb': osc.frequency.value = 120; break
        case 'slash': osc.frequency.value = 540; break
        case 'win': osc.frequency.value = 980; break
        default: osc.frequency.value = 440; break
      }
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      osc.connect(gain)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch (e) {}
  }
}
