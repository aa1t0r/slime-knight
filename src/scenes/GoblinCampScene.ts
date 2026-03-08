import Phaser from 'phaser'

export default class GoblinCampScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private lastDir: 'up'|'down'|'left'|'right' = 'down'
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private bossTriggerArmed = true
  private bossCollider?: Phaser.Physics.Arcade.Collider

  constructor() { super('GoblinCamp') }

  create(data?: any) {
    const width = 900, height = 640
    // ground
    this.add.rectangle(width/2, height/2, width, height, 0x5f7f5f)
    // dirt camp area
    const g = this.add.graphics(); g.fillStyle(0x8b6b3b, 1)
    g.fillEllipse(width/2, height*0.52, width*0.72, height*0.56)
    g.fillStyle(0x6d5230, 0.35); g.fillEllipse(width/2, height*0.58, width*0.62, height*0.38)

    // tents
    const tent = (x:number,y:number,flip=false) => {
      const t = this.add.graphics({ x, y })
      t.fillStyle(0xbdb58f, 1); t.fillTriangle(0, 0, -44, 54, 44, 54)
      t.lineStyle(2, 0x6b5f3b, 1); t.strokeTriangle(0, 0, -44, 54, 44, 54)
      t.fillStyle(0x8e8461, 1); t.fillRect(-8, 28, 16, 26)
      t.setScale(flip ? -1 : 1, 1)
      t.setDepth(y)
      return t
    }
    tent(width*0.33, height*0.56)
    tent(width*0.67, height*0.56, true)
    tent(width*0.52, height*0.46)

    // totems + crates
    for (let i=0;i<5;i++) {
      const x = Phaser.Math.Between(120, width-120)
      const y = Phaser.Math.Between(Math.floor(height*0.42), Math.floor(height*0.70))
      if (Phaser.Math.Between(0,1)) {
        const totem = this.add.graphics({ x, y })
        totem.fillStyle(0x6b4f2a, 1); totem.fillRect(-6, -24, 12, 48)
        totem.fillStyle(0x9c6a32, 1); totem.fillRect(-8, 18, 16, 8)
        totem.setDepth(y)
      } else {
        const crate = this.add.graphics({ x, y })
        crate.fillStyle(0x7b5a3a, 1); crate.fillRect(-14, -12, 28, 24)
        crate.lineStyle(2, 0x4e3622, 1)
        crate.strokeRect(-14, -12, 28, 24); crate.strokeLineShape(new Phaser.Geom.Line(-14,-2,14,-2))
        crate.setDepth(y)
      }
    }

    // campfire
    const fireX = width/2, fireY = height*0.62
    const fire = this.add.graphics({ x: fireX, y: fireY })
    fire.fillStyle(0x5d4037, 1); fire.fillRect(-24, 10, 48, 10)
    fire.fillStyle(0xffb74d, 1); fire.fillEllipse(0, 0, 30, 36)
    fire.fillStyle(0xffe082, 0.8); fire.fillEllipse(-2, -6, 16, 18)
    fire.setDepth(fireY)
    this.tweens.add({ targets: fire, scaleY: { from: 0.96, to: 1.06 }, alpha: { from: 0.9, to: 1 }, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // (Boss trigger zone will be added after player is created)

    // player
    const spawnX = width/2
    const spawnY = data?.from === 'TownNorth' ? height - 72 : height/2
    this.player = this.physics.add.sprite(spawnX, spawnY, 'slime_d_1').setScale(1.5)
    this.player.setCollideWorldBounds(true)

    // simple colliders for tents and props
    const solids = this.physics.add.staticGroup()
    const addSolidRect = (rx:number, ry:number, rw:number, rh:number) => {
      const r = this.add.zone(rx, ry, rw, rh).setOrigin(0.5)
      this.physics.add.existing(r, true)
      solids.add(r as any)
    }
    addSolidRect(width*0.33, height*0.56+20, 92, 20)
    addSolidRect(width*0.67, height*0.56+20, 92, 20)
    addSolidRect(width*0.52, height*0.46+20, 92, 20)
    const solidsCollider = this.physics.add.collider(this.player, solids)

    // Boss trigger: approach the campfire to start Goblin King battle (create after player exists)
    const bossZone = this.add.zone(fireX, fireY - 6, 160, 120).setOrigin(0.5)
    this.physics.add.existing(bossZone, true)
    this.bossCollider = this.physics.add.overlap(this.player, bossZone as any, () => {
      if (!this.bossTriggerArmed) return
      this.bossTriggerArmed = false
      // Safely remove colliders before changing scenes to avoid mid-step physics issues
      try { if (this.bossCollider) { this.physics.world.removeCollider(this.bossCollider); this.bossCollider = undefined } } catch {}
      try { if (solidsCollider) { this.physics.world.removeCollider(solidsCollider) } } catch {}
      // stop player body to avoid collisions during transition
      try { this.player.setVelocity(0,0); (this.player.body as Phaser.Physics.Arcade.Body).enable = false; this.player.active = false } catch {}
      // Pause physics world to prevent collider updates mid-transition
      try { this.physics.world.pause() } catch {}
      try {
        const mid = this.add.text(this.cameras.main.width/2, 40, 'The Goblin King approaches...', { color: '#ff6666', fontSize: '18px' })
          .setOrigin(0.5).setDepth(9999).setScrollFactor(0)
        this.time.delayedCall(600, () => { try { mid.destroy() } catch {} })
      } catch {}
      const enemies = [ { name: 'Goblin King', hp: 50, type: 'goblinKing' } ]
      try { this.scene.stop('Battle') } catch {}
      // Defer scene start slightly so we don't transition during a physics step
      this.time.delayedCall(50, () => {
        try { this.scene.start('Battle', { enemies }) } catch {}
      })
    })

    // camera
    const cam = this.cameras.main
    cam.startFollow(this.player)
    this.physics.world.setBounds(0,0,width,height)
    cam.setBounds(0,0,width,height)

    // input
    this.keys = this.input.keyboard.addKeys({ up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D }) as Record<string, Phaser.Input.Keyboard.Key>

    // exits: south back to Town (spawn at Town north)
    const southExit = this.add.zone(width/2, height - 10, 140, 24).setOrigin(0.5)
    this.physics.add.existing(southExit, true)
    this.physics.add.overlap(this.player, southExit as any, () => { this.scene.start('Town', { from: 'GoblinCamp' }) })

    // ambience: hanging skull banners and stakes near top
    const deco = this.add.graphics()
    for (let i=0;i<6;i++) {
      const x = 120 + i * ((width-240)/5)
      const y = height*0.30 + Phaser.Math.Between(-6, 6)
      deco.fillStyle(0x4e342e, 1); deco.fillRect(x-2, y-10, 4, 28)
      deco.fillStyle(0xcfcfcf, 1); deco.fillCircle(x, y+10, 6)
      deco.lineStyle(1, 0x6b5f3b, 1); deco.strokeCircle(x, y+10, 6)
    }

    // Paths: entrance trail from south, inner ring, and spurs to tents
    const path = this.add.graphics().setDepth(-1)
    const pathColor = 0xb48a5a
    const edgeDark = 0x8d6e4a
    const light = 0xcaa06d
    const drawPolyline = (pts: {x:number;y:number}[], w: number, color: number, alpha=1) => {
      path.lineStyle(w, color, alpha)
      path.beginPath(); path.moveTo(pts[0].x, pts[0].y)
      for (let i=1;i<pts.length;i++) path.lineTo(pts[i].x, pts[i].y)
      path.strokePath()
    }
    // entrance path
    const p1: {x:number;y:number}[] = []
    for (let i=0;i<=14;i++) {
      const t = i/14
      const yv = height - 24 - t * (height*0.60 - (height - 24))
      const sway = Math.sin(t*Math.PI*0.8)*28
      p1.push({ x: width/2 + sway, y: yv })
    }
    drawPolyline(p1, 30, pathColor, 1)
    drawPolyline(p1, 12, light, 0.35)
    drawPolyline(p1, 22, edgeDark, 0.18)
    // inner ring (rough circle)
    const ring: {x:number;y:number}[] = []
    const cx = width/2, cy = height*0.54, rx = width*0.26, ry = height*0.16
    for (let a=0; a<=Math.PI*2+0.001; a+=Math.PI/12) {
      ring.push({ x: cx + Math.cos(a)*rx, y: cy + Math.sin(a)*ry })
    }
    drawPolyline(ring, 26, pathColor, 0.85)
    drawPolyline(ring, 10, light, 0.28)
    drawPolyline(ring, 18, edgeDark, 0.16)
    // spurs to tents
    const spurs = [ {x: width*0.33, y: height*0.56}, {x: width*0.67, y: height*0.56}, {x: width*0.52, y: height*0.46} ]
    spurs.forEach(s => {
      const pts = [ { x: s.x, y: s.y+10 }, { x: (s.x + cx)/2, y: (s.y + cy)/2 + Phaser.Math.Between(-6,6) }, { x: cx, y: cy } ]
      drawPolyline(pts, 20, pathColor, 0.9)
      drawPolyline(pts, 8, light, 0.3)
      drawPolyline(pts, 14, edgeDark, 0.16)
    })

    // pebbles and footprints along paths
    const deco2 = this.add.graphics().setDepth(-1)
    deco2.fillStyle(0x6b5f3b, 0.9)
    for (let i=0;i<60;i++) deco2.fillCircle(Phaser.Math.Between(80, width-80), Phaser.Math.Between(Math.floor(height*0.44), Math.floor(height*0.70)), Phaser.Math.Between(1,2))
    // torches near tents
    for (let i=0;i<3;i++) {
      const tpos = spurs[i]
      const tx = tpos.x + (i===1? -36: 36)
      const ty = tpos.y + 24
      const pole = this.add.graphics({ x: tx, y: ty })
      pole.fillStyle(0x5d4037, 1); pole.fillRect(-2, -18, 4, 24)
      pole.fillStyle(0xffcc66, 1); pole.fillCircle(0, -20, 5)
      this.tweens.add({ targets: pole, alpha: { from: 0.9, to: 1 }, duration: 360, yoyo: true, repeat: -1 })
    }

    // perimeter palisade (decorative): spikes on north and sides, gap at south
    const pal = this.add.graphics().setDepth(-2)
    pal.fillStyle(0x6b4f2a, 1)
    const drawSpikes = (x1:number, y1:number, x2:number, y2:number, step:number) => {
      const dx = (x2 - x1) / Math.max(1, Math.floor(Math.hypot(x2-x1, y2-y1)/step))
      const dy = (y2 - y1) / Math.max(1, Math.floor(Math.hypot(x2-x1, y2-y1)/step))
      const n = Math.max(1, Math.floor(Math.hypot(x2-x1, y2-y1)/step))
      for (let i=0;i<=n;i++) {
        const x = x1 + dx * i
        const y = y1 + dy * i
        pal.fillTriangle(x, y, x-6, y+16, x+6, y+16)
      }
    }
    drawSpikes(40, height*0.34, width-40, height*0.34, 26)
    drawSpikes(40, height*0.34, 40, height*0.84, 26)
    drawSpikes(width-40, height*0.34, width-40, height*0.84, 26)

    // weapon rack and target dummy
    const rack = this.add.graphics({ x: width*0.24, y: height*0.50 })
    rack.fillStyle(0x6b4f2a, 1); rack.fillRect(-32, -2, 64, 4); rack.fillRect(-2, -20, 4, 24)
    rack.fillStyle(0xb0b6be, 1); rack.fillRect(-26, -12, 2, 14); rack.fillRect(-10, -12, 2, 14); rack.fillRect(6, -12, 2, 14)
    const dummy = this.add.graphics({ x: width*0.78, y: height*0.50 })
    dummy.fillStyle(0xcf8f5a, 1); dummy.fillCircle(0, -16, 10); dummy.fillRect(-3, -16, 6, 28)
    dummy.lineStyle(2, 0x5d4037, 1); dummy.strokeCircle(0, -16, 10)

    // cauldron near fire with smoke and bubbles
    const pot = this.add.graphics({ x: fireX - 60, y: fireY + 6 })
    pot.fillStyle(0x333333, 1); pot.fillEllipse(0, 0, 34, 20)
    pot.fillStyle(0x222222, 1); pot.fillRect(-14, -4, 28, 8)
    const bubble = this.add.graphics({ x: pot.x, y: pot.y - 8 })
    bubble.fillStyle(0x99ff99, 0.8); bubble.fillCircle(0, 0, 2)
    this.tweens.add({ targets: bubble, y: bubble.y - 10, alpha: { from: 0.9, to: 0 }, duration: 900, repeat: -1, delay: 120, onRepeat: (tw:any)=>{ bubble.x = pot.x + Phaser.Math.Between(-6,6); bubble.y = pot.y - 8; bubble.alpha = 0.9 } })
    const smoke = this.add.graphics({ x: fireX, y: fireY - 10 })
    smoke.fillStyle(0xaaaaaa, 0.4); smoke.fillCircle(0, 0, 4)
    this.tweens.add({ targets: smoke, y: smoke.y - 24, alpha: { from: 0.4, to: 0 }, duration: 1200, repeat: -1, delay: 200, onRepeat: ()=>{ smoke.x = fireX + Phaser.Math.Between(-6,6); smoke.y = fireY - 10; smoke.alpha = 0.4 } })

    // bone piles
    for (let i=0;i<6;i++) {
      const bx = Phaser.Math.Between(90, width-90)
      const by = Phaser.Math.Between(Math.floor(height*0.46), Math.floor(height*0.70))
      const bones = this.add.graphics({ x: bx, y: by })
      bones.fillStyle(0xeeeeee, 1)
      bones.fillCircle(-3, 0, 2); bones.fillCircle(3, 0, 2); bones.fillRect(-6, -1, 12, 2)
      bones.setDepth(by)
    }

    // small light halos around torches and fire
    const halos: Phaser.GameObjects.Graphics[] = []
    const halo = (x:number,y:number,r:number) => { const h = this.add.graphics({ x, y }); h.fillStyle(0xffcc66, 0.15); h.fillCircle(0, 0, r); h.setBlendMode(Phaser.BlendModes.ADD); halos.push(h) }
    halo(fireX, fireY, 64)
    spurs.forEach((s,i)=>{ const tx = s.x + (i===1? -36: 36); const ty = s.y + 24; halo(tx, ty-20, 40) })

    // EXTRA: side paths and detail decals
    // winding side path to the left storage area
    const leftPath: {x:number;y:number}[] = []
    for (let i=0;i<=10;i++) {
      const t = i/10
      const yv = height*0.65 - t * (height*0.58 - height*0.65)
      const xv = width*0.45 - Math.sin(t*Math.PI)*40
      leftPath.push({ x: xv, y: yv })
    }
    drawPolyline(leftPath, 18, pathColor, 0.95)
    drawPolyline(leftPath, 6, light, 0.28)
    drawPolyline(leftPath, 12, edgeDark, 0.16)

    // rope fence segments near the fire for crowd control
    const rope = this.add.graphics()
    rope.lineStyle(2, 0x9e7b4a, 1)
    rope.beginPath(); rope.moveTo(fireX - 80, fireY + 34); rope.lineTo(fireX - 24, fireY + 20); rope.lineTo(fireX + 24, fireY + 20); rope.lineTo(fireX + 80, fireY + 34); rope.strokePath()
    // posts
    rope.fillStyle(0x6b4f2a, 1)
    rope.fillRect(fireX - 80 - 2, fireY + 34 - 10, 4, 14)
    rope.fillRect(fireX - 24 - 2, fireY + 20 - 10, 4, 14)
    rope.fillRect(fireX + 24 - 2, fireY + 20 - 10, 4, 14)
    rope.fillRect(fireX + 80 - 2, fireY + 34 - 10, 4, 14)

    // stash piles: sacks and coins
    for (let i=0;i<4;i++) {
      const sx = Phaser.Math.Between(110, width-110)
      const sy = Phaser.Math.Between(Math.floor(height*0.48), Math.floor(height*0.68))
      const sacks = this.add.graphics({ x: sx, y: sy })
      sacks.fillStyle(0x9c7a43, 1); sacks.fillEllipse(-6, 2, 12, 10); sacks.fillEllipse(6, 0, 12, 12)
      sacks.fillStyle(0x4e3622, 1); sacks.fillRect(-2, -6, 4, 2)
      sacks.fillStyle(0xffd54f, 1); sacks.fillCircle(Phaser.Math.Between(-6,6), Phaser.Math.Between(-4,2), 1.5)
      sacks.setDepth(sy)
    }

    // banners with goblin glyphs near palisade
    for (let i=0;i<3;i++) {
      const bx = 90 + i * ((width-180)/2)
      const by = height*0.34 - 6
      const banner = this.add.graphics({ x: bx, y: by })
      banner.fillStyle(0x6b4f2a, 1); banner.fillRect(-2, -12, 4, 24)
      banner.fillStyle(0x2e7d32, 1); banner.fillRect(-10, -8, 20, 16)
      banner.fillStyle(0xcde7cd, 1); banner.fillRect(-2, -2, 4, 4) // simple glyph
      banner.setDepth(by)
    }

    // ambient goblins (idle) using the 'goblin' texture; tiny bobbing tweens
    const idleSpots = [ {x: width*0.30, y: height*0.56}, {x: width*0.70, y: height*0.56}, {x: width*0.55, y: height*0.48} ]
    idleSpots.forEach((p, idx) => {
      const npc = this.add.image(p.x, p.y - 18, 'goblin').setScale(1.2).setDepth(p.y)
      this.tweens.add({ targets: npc, y: p.y - 20, duration: 900 + idx*120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    })
  }

  update() {
    const speed = 160
    let vx = 0, vy = 0
    if (this.keys.left.isDown) vx = -speed
    if (this.keys.right.isDown) vx = speed
    if (this.keys.up.isDown) vy = -speed
    if (this.keys.down.isDown) vy = speed
    this.player.setVelocity(vx, vy)
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
  }
}
