import Phaser from 'phaser'
import BattleScene from './BattleScene'

export default class OverworldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private lastDir: 'up'|'down'|'left'|'right' = 'down'
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private battleKey!: Phaser.Input.Keyboard.Key
  private townZone!: Phaser.GameObjects.Zone
  private ruinsZone!: Phaser.GameObjects.Zone
  private mapWidth!: number
  private mapHeight!: number
  private entryFrom?: string
  private playerShadow?: Phaser.GameObjects.Ellipse
  private entryCooldownUntil: number = 0
  // Battle selection UI
  private battleMenu?: Phaser.GameObjects.Container
  private battleMenuOptions: Array<{ label: string; type: 'goblin'|'orc' }> = [
    { label: 'Goblin', type: 'goblin' },
    { label: 'Orc', type: 'orc' }
  ]
  private battleMenuTexts: Phaser.GameObjects.Text[] = []
  private battleMenuIndex: number = 0
  private touchInput: Record<string, boolean> = { up: false, down: false, left: false, right: false }

  constructor() {
    super('Overworld')
  }

  init(data?: any) {
    this.entryFrom = data?.from
  }

  create() {
    // load tilemap from preload
    // create a bigger map (40x30) with a border of walls (1) and floor (0)
    // player will start in the very center so the camera is centered on them
    const cols = 40
    const rows = 30
    const mapData: number[][] = []
    for (let y = 0; y < rows; y++) {
      const row: number[] = []
      for (let x = 0; x < cols; x++) {
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) row.push(1)
        else row.push(0)
      }
      mapData.push(row)
    }

    // Create a centered gate opening in the top wall so the path can connect
    const centerCol = Math.floor(cols / 2)
    const gateTilesW = 6
    for (let dx = -Math.floor(gateTilesW / 2); dx <= Math.floor(gateTilesW / 2); dx++) {
      const x = Phaser.Math.Clamp(centerCol + dx, 1, cols - 2)
      mapData[0][x] = 0 // open top border tiles to form a gate
    }
    // Bottom gate opening for Ruins
    for (let dx = -Math.floor(gateTilesW / 2); dx <= Math.floor(gateTilesW / 2); dx++) {
      const x = Phaser.Math.Clamp(centerCol + dx, 1, cols - 2)
      mapData[rows - 1][x] = 0 // open bottom border tiles to form a gate
    }

    const map = this.make.tilemap({ data: mapData, tileWidth: 16, tileHeight: 16 })
    const tiles = map.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)
    const layer = map.createLayer(0, tiles, 0, 0)
    layer.setCollision([1])
    // push ground layer behind custom path graphics
    layer.setDepth(-10)

    // tint floor for visibility (light gray for easier on the eyes)
    layer.forEachTile((tile) => {
      if (tile.index === 0) {
        tile.tint = 0xaaaaaa
      }
    })

    // decide spawn: default center, or bottom gate if coming from Ruins
    const centerX = map.widthInPixels / 2
    const centerY = map.heightInPixels / 2
    const topGateY = 8
    const bottomGateY = map.heightInPixels - 8
    const ruinsZoneHalfH = 18
    const ruinsZoneCenterY = bottomGateY - 6
    const spawnX = centerX
    let spawnY = centerY
    if (this.entryFrom === 'Ruins') {
      spawnY = bottomGateY - 72
    } else if (this.entryFrom === 'TownNorth') {
      // coming from Town north exit: appear just inside bottom gate
      spawnY = bottomGateY - 72
    } else if (this.entryFrom === 'TownSouth') {
      // coming from Town south exit: appear further down from the top gate
      // (ensure player doesn't immediately re-trigger the town teleporter)
      spawnY = topGateY + 140
    }
    // place player
    this.player = this.physics.add.sprite(spawnX, spawnY, 'slime_d_1').setScale(1.5)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, layer)
    // small shadow under player for grounding
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 18, 30, 10, 0x000000, 0.22)
    this.playerShadow.setDepth(-1)
    // brief entry cooldown to prevent immediate re-trigger of gate overlaps
    if (this.entryFrom) {
      // slightly longer cooldown when coming from town to avoid bounce-back
      const extra = this.entryFrom === 'TownSouth' ? 400 : 0
      this.entryCooldownUntil = this.time.now + 1100 + extra
    }

    const cam = this.cameras.main
    cam.startFollow(this.player)
    // ensure camera begins centered on the map, not the top-left
    cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2)

    // store map dimensions so we can recenter when the scene is woken
    this.mapWidth = map.widthInPixels
    this.mapHeight = map.heightInPixels

    // If this scene is resumed/woken (e.g. returning from a room), re-center the camera
    const restoreView = () => {
      console.log('Overworld: restoreView called (wake/resume)')
      const c = this.cameras.main
      c.centerOn(this.mapWidth / 2, this.mapHeight / 2)
      c.startFollow(this.player)
      // rebind movement keys in case they were lost
      this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D
      }) as Record<string, Phaser.Input.Keyboard.Key>
    }
    this.events.on('wake', restoreView)
    this.events.on('resume', restoreView)

    console.log('map size', map.widthInPixels, map.heightInPixels)
    console.log('layer size', layer.tilemap.width, layer.tilemap.height)

    // if the viewport is larger than the map, pad the bounds so the map
    // can sit in the middle instead of being forced to a corner
    const padX = Math.max((cam.width - map.widthInPixels) / 2, 0)
    const padY = Math.max((cam.height - map.heightInPixels) / 2, 0)
    cam.setBounds(-padX, -padY, map.widthInPixels + padX * 2, map.heightInPixels + padY * 2)
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    const instr = this.add.text(8, 8, 'Overworld: WASD | B: battle | Roads: Town (north), Ruins (south)', { color: '#ffffff', scrollFactor: 0, fontFamily: 'Arial', fontSize: '12px' })
    const bg = this.add.rectangle(0, 0, instr.width + 16, instr.height + 8, 0x000000, 0.5).setOrigin(0)
    bg.setScrollFactor(0)
    instr.setScrollFactor(0)

    // WASD controls only
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as Record<string, Phaser.Input.Keyboard.Key>
    this.battleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B)

    // Hook up on-screen touch controls (from UI scene) for mobile
    try {
      const ui: any = this.scene.get('UI')
      if (ui && ui.events) {
        ui.events.on('dpad-down', (dir: string) => { try { this.touchInput[dir] = true } catch (e) {} }, this)
        ui.events.on('dpad-up', (dir: string) => { try { this.touchInput[dir] = false } catch (e) {} }, this)
        ui.events.on('action-down', () => { if (this.battleMenu) this.closeBattleMenu(); else this.openBattleMenu() }, this)
      }
    } catch (e) {}

    // VISUALS: Smooth dirt path bottom->top that connects to both gates
    const gateY = topGateY // just inside the opened wall
    const gPath = this.add.graphics().setDepth(-9)
    const baseW = 22 // general half-width
    const meanderAmp = 36
    const pathColor = 0xb48a5a
    const pathEdgeDark = 0x8d6e4a
    const pathHighlight = 0xcaa06d
    const fenceStartY = gateY + 112 // where the straight approach begins

    // helper to draw a thick polyline as the path
    const drawPolyline = (pts: {x:number,y:number}[], width: number, color: number, alpha=1) => {
      gPath.lineStyle(width, color, alpha)
      gPath.beginPath()
      gPath.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) gPath.lineTo(pts[i].x, pts[i].y)
      gPath.strokePath()
    }

    // construct points for the path: meander from bottom area to fenceStartY, then straight to top gate
    const pts: {x:number,y:number}[] = []
    const steps = 34
    const startY = map.heightInPixels - 40
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const y = startY - t * (startY - fenceStartY)
      const sway = Math.sin(t * Math.PI * 1.05) * meanderAmp
      const cx = centerX + sway
      pts.push({ x: cx, y })
    }
    // continue straight up to gate
    pts.push({ x: centerX, y: fenceStartY - 32 })
    pts.push({ x: centerX, y: gateY + 22 })

    // main path stroke
    gPath.setDepth(-5) // ensure path renders below player and most objects
    drawPolyline(pts, baseW * 2, pathColor, 1)
    // inner highlight down the center
    drawPolyline(pts, Math.max(6, baseW * 0.6), pathHighlight, 0.35)
    // edge darkening for definition
    drawPolyline(pts, Math.max(8, baseW * 1.4), pathEdgeDark, 0.25)

    // sprinkle pebbles near edges
    const rand = (min:number,max:number)=> Phaser.Math.Between(min,max)
    const rfloat = ()=> Math.random()
    gPath.fillStyle(0x6d4c41, 0.35)
    for (let i = 0; i < 90; i++) {
      const t = rfloat()
      const idx = Math.floor(t * (pts.length - 1))
      const p = pts[idx]
      const side = rfloat() < 0.5 ? -1 : 1
      const off = baseW - 4 + rfloat() * 8
      const ang = Math.atan2(pts[Math.min(idx + 1, pts.length - 1)].y - p.y, pts[Math.min(idx + 1, pts.length - 1)].x - p.x) + Math.PI/2
      const x = p.x + Math.cos(ang) * off * side + rand(-3,3)
      const y = p.y + Math.sin(ang) * off * side + rand(-3,3)
      gPath.fillCircle(x, y, rfloat() * 2 + 0.8)
    }

    // FENCES visuals and blocking (parallel rails on both sides of straight approach)
    const straightW = baseW
    const fenceGraphics = this.add.graphics().setDepth(2)
    // ensure corridor is comfortably wider than the player sprite
    const desiredCorridor = this.player.displayWidth + 80
    let leftX = centerX - desiredCorridor / 2
    let rightX = centerX + desiredCorridor / 2
    const fenceTop = gateY + 22
    const fenceBottom = fenceStartY
    // rails
    fenceGraphics.lineStyle(3, 0x8b6b34, 1)
    fenceGraphics.strokeLineShape(new Phaser.Geom.Line(leftX, fenceTop, leftX, fenceBottom))
    fenceGraphics.strokeLineShape(new Phaser.Geom.Line(leftX + 6, fenceTop, leftX + 6, fenceBottom))
    fenceGraphics.strokeLineShape(new Phaser.Geom.Line(rightX, fenceTop, rightX, fenceBottom))
    fenceGraphics.strokeLineShape(new Phaser.Geom.Line(rightX - 6, fenceTop, rightX - 6, fenceBottom))
    // posts
    fenceGraphics.lineStyle(4, 0x775a2e, 1)
    for (let y = fenceTop; y <= fenceBottom; y += 32) {
      fenceGraphics.strokeLineShape(new Phaser.Geom.Line(leftX - 3, y, leftX + 9, y))
      fenceGraphics.strokeLineShape(new Phaser.Geom.Line(rightX - 9, y, rightX + 3, y))
    }
    // simple gate posts near the wall opening
    fenceGraphics.lineStyle(6, 0x6d4c2b, 1)
    fenceGraphics.strokeLineShape(new Phaser.Geom.Line(leftX, fenceTop + 4, leftX, fenceTop - 10))
    fenceGraphics.strokeLineShape(new Phaser.Geom.Line(rightX, fenceTop + 4, rightX, fenceTop - 10))
    // blocking rectangles just outside path edges (keep player on road through the approach)
    const blocks: Phaser.GameObjects.Rectangle[] = []
    const thickness = 12
    const blockL = this.add.rectangle(leftX - thickness / 2, (fenceTop + fenceBottom) / 2, thickness, fenceBottom - fenceTop + 2, 0x000000, 0)
    const blockR = this.add.rectangle(rightX + thickness / 2, (fenceTop + fenceBottom) / 2, thickness, fenceBottom - fenceTop + 2, 0x000000, 0)
    blocks.push(blockL, blockR)
    blocks.forEach((b) => {
      this.physics.add.existing(b, true)
      this.physics.add.collider(this.player, b)
    })

    // TREES: pushed to the sides, away from path corridor
    const trees: Phaser.GameObjects.Image[] = []
    const rng = (min: number, max: number) => Phaser.Math.Between(min, max)
    const pathCorridor = (x:number,y:number)=>{
      // approximate corridor width around path centerline
      const nearStraight = (y <= fenceBottom + 24 && y >= fenceTop - 24)
      const cxStraight = centerX
      const straightKeep = nearStraight && Math.abs(x - cxStraight) < (straightW + 64)
      // meander part: compare with sinus centerline
      const t = Phaser.Math.Clamp((startY - y) / (startY - fenceStartY), 0, 1)
      const cxMeander = centerX + Math.sin(t * Math.PI * 1.1) * meanderAmp
      const meanderKeep = (y > fenceStartY) && Math.abs(x - cxMeander) < (baseW + 76)
      return straightKeep || meanderKeep
    }
    const tries = 160
    for (let i = 0, placed = 0; i < tries && placed < 42; i++) {
      // bias trees to left/right thirds
      const side = Math.random() < 0.5 ? -1 : 1
      const x = side < 0 ? rng(24, Math.floor(centerX - 140)) : rng(Math.floor(centerX + 140), map.widthInPixels - 24)
      const y = rng(56, map.heightInPixels - 24)
      if (x < 24 || x > map.widthInPixels - 24) continue
      if (y < 40 || y > map.heightInPixels - 24) continue
      if (pathCorridor(x,y)) continue
      // keep immediate spawn clear (based on current player position)
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60) continue
      const img = this.add.image(x, y, 'tree').setOrigin(0.5, 1)
      img.setDepth(y)
      trees.push(img)
      const stump = this.add.rectangle(x, y - 8, 16, 12, 0x000000, 0)
      this.physics.add.existing(stump, true)
      this.physics.add.collider(this.player, stump)
      placed++
    }

    // GRASS speckles and flowers for detail
    const decor = this.add.graphics().setDepth(1)
    const drawSpeck = (x:number,y:number,c:number,a:number,r:number)=>{ decor.fillStyle(c,a); decor.fillCircle(x,y,r) }
    for (let i = 0; i < 240; i++) {
      const x = rng(12, map.widthInPixels - 12)
      const y = rng(18, map.heightInPixels - 12)
      if (pathCorridor(x,y)) continue
      const c = Math.random() < 0.5 ? 0x3b8e3b : 0x2e7d32
      drawSpeck(x, y, c, 0.35 + Math.random()*0.25, Math.random()*1.8+0.6)
    }
    // small flowers near path edges
    for (let i = 0; i < 60; i++) {
      const idx = Phaser.Math.Between(1, Math.max(1, pts.length - 2))
      const p = pts[idx]
      const next = pts[idx+1]
      const ang = Math.atan2(next.y - p.y, next.x - p.x) + Math.PI/2
      const side = Math.random() < 0.5 ? -1 : 1
      const off = straightW + 10 + Math.random()*14
      const x = p.x + Math.cos(ang) * off * side + Phaser.Math.Between(-4,4)
      const y = p.y + Math.sin(ang) * off * side + Phaser.Math.Between(-3,3)
      if (x <= 8 || x >= map.widthInPixels-8 || y <= 8 || y >= map.heightInPixels-8) continue
      decor.fillStyle(0xffcdd2, 0.9)
      decor.fillCircle(x, y, 1.6)
      decor.fillStyle(0xfff59d, 0.9)
      decor.fillCircle(x+1, y, 0.9)
    }

    // TOWN entrance sensor and label (just inside the opened top wall)
    const doorX = centerX
    this.add.text(doorX - 18, gateY - 12, 'Town', { color: '#00ff88', fontSize: '12px' })
    this.townZone = this.add.zone(doorX, gateY + 18, Math.max(straightW * 2 + 80, desiredCorridor + 20), 36).setOrigin(0.5)
    this.physics.add.existing(this.townZone, true)
    this.physics.add.overlap(this.player, this.townZone, () => {
      if (this.time.now < this.entryCooldownUntil || this.battleMenu) return
      this.scene.start('Town')
    })

    // RUINS entrance sensor and label at bottom gate
    const ruinsLabel = this.add.text(centerX - 22, bottomGateY - 18, 'Ruins', { color: '#80cbc4', fontSize: '12px' })
    this.ruinsZone = this.add.zone(centerX, ruinsZoneCenterY, straightW * 2 + 20, ruinsZoneHalfH * 2).setOrigin(0.5)
    this.physics.add.existing(this.ruinsZone, true)
    this.physics.add.overlap(this.player, this.ruinsZone, () => {
      if (this.time.now < this.entryCooldownUntil || this.battleMenu) return
      this.scene.start('Ruins')
    })
  }

  update() {
    const speed = 160
    let vx = 0
    let vy = 0

    if (!this.battleMenu) {
      // WASD with diagonal movement support + touch D-pad
      const leftDown = (this.keys.left && this.keys.left.isDown) || this.touchInput.left
      const rightDown = (this.keys.right && this.keys.right.isDown) || this.touchInput.right
      const upDown = (this.keys.up && this.keys.up.isDown) || this.touchInput.up
      const downDown = (this.keys.down && this.keys.down.isDown) || this.touchInput.down
      if (leftDown) vx = -speed
      if (rightDown) vx = speed
      if (upDown) vy = -speed
      if (downDown) vy = speed
    }

    this.player.setVelocity(vx, vy)
    // Play walk animations
    const moving = Math.abs(vx) + Math.abs(vy) > 0
    if (moving) {
      if (Math.abs(vy) >= Math.abs(vx)) {
        this.lastDir = vy < 0 ? 'up' : 'down'
      } else {
        this.lastDir = vx < 0 ? 'left' : 'right'
      }
      const key = this.lastDir === 'up' ? 'slime-walk-up' : this.lastDir === 'down' ? 'slime-walk-down' : this.lastDir === 'left' ? 'slime-walk-left' : 'slime-walk-right'
      this.player.anims.play(key, true)
    } else {
      this.player.anims.stop()
      const idleKey = this.lastDir === 'up' ? 'slime_u_1' : this.lastDir === 'down' ? 'slime_d_1' : this.lastDir === 'left' ? 'slime_l_1' : 'slime_r_1'
      this.player.setTexture(idleKey)
    }
    // depth-sorting and shadow follow for correct layering
    this.player.setDepth(this.player.y)
    if (this.playerShadow) {
      this.playerShadow.x = this.player.x
      this.playerShadow.y = this.player.y + 18
      const vel = Math.abs(vx) + Math.abs(vy)
      const w = Phaser.Math.Clamp(30 + vel * 0.02, 30, 44)
      const h = Phaser.Math.Clamp(10 - vel * 0.01, 6, 10)
      this.playerShadow.setDisplaySize(w, h)
      this.playerShadow.setAlpha(0.18 + Math.min(vel, 180) / 180 * 0.08)
    }

    if (Phaser.Input.Keyboard.JustDown(this.battleKey)) {
      if (this.battleMenu) this.closeBattleMenu(); else this.openBattleMenu()
    }

    // When the menu is open, handle its navigation
    if (this.battleMenu) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.up)) this.moveBattleSelection(-1)
      if (Phaser.Input.Keyboard.JustDown(this.keys.down)) this.moveBattleSelection(1)
      if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER))
       || Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE))) this.confirmBattleSelection()
      if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC))) this.closeBattleMenu()
    }
  }

  private openBattleMenu() {
    const cam = this.cameras.main
    const w = cam.width, h = cam.height
    const c = this.add.container(w/2, h/2).setScrollFactor(0).setDepth(2000)
    const bg = this.add.rectangle(0, 0, 260, 150, 0x000000, 0.82)
    const border = this.add.rectangle(0, 0, 268, 158).setStrokeStyle(2, 0xffffaa)
    const title = this.add.text(0, -52, 'Choose Enemy', { color: '#ffffaa', fontSize: '16px' }).setOrigin(0.5)
    const hint = this.add.text(0, 56, 'W/S: move  Enter/Space: fight  B/Esc: close', { color: '#cccccc', fontSize: '11px' }).setOrigin(0.5)
    c.add([bg, border, title, hint])
    this.battleMenuTexts = []
    const startY = -12
    this.battleMenuOptions.forEach((opt, i) => {
      const t = this.add.text(-90, startY + i * 22, opt.label, { color: '#ffffff', fontSize: '14px' })
      this.battleMenuTexts.push(t); c.add(t)
    })
    this.battleMenuIndex = 0
    this.updateBattleMenuHighlight()
    this.battleMenu = c
  }

  private closeBattleMenu() {
    try { this.battleMenu?.destroy() } catch {}
    this.battleMenu = undefined
    this.battleMenuTexts = []
  }

  private updateBattleMenuHighlight() {
    this.battleMenuTexts.forEach((t, i) => t.setColor(i === this.battleMenuIndex ? '#ffff66' : '#ffffff'))
  }

  private moveBattleSelection(delta: number) {
    const len = this.battleMenuOptions.length
    this.battleMenuIndex = Phaser.Math.Wrap(this.battleMenuIndex + delta, 0, len)
    this.updateBattleMenuHighlight()
  }

  private confirmBattleSelection() {
    const choice = this.battleMenuOptions[this.battleMenuIndex]
    if (!choice) return
    const count = choice.type === 'orc' ? 1 : Phaser.Math.Between(1, 2)
    const enemies: any[] = []
    for (let i = 0; i < count; i++) {
      if (choice.type === 'goblin') enemies.push({ name: 'Goblin', hp: 18, type: 'goblin' })
      else if (choice.type === 'orc') enemies.push({ name: 'Orc', hp: 30, type: 'orc' })
    }
    this.closeBattleMenu()
    try { this.scene.stop('Battle') } catch {}
    try {
      const mid = this.add.text(this.cameras.main.width/2, 40, `Starting battle vs ${choice.label}...`, { color: '#ffff00', fontSize: '18px' }).setOrigin(0.5).setDepth(9999).setScrollFactor(0)
      this.time.delayedCall(700, () => { try { mid.destroy() } catch {} })
    } catch {}
    this.scene.start('Battle', { enemies })
  }
}
