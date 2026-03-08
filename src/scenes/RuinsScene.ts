import Phaser from 'phaser'

export default class RuinsScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private lastDir: 'up'|'down'|'left'|'right' = 'down'
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private stepTimer: number = 0
  private stepEmitter?: Phaser.GameObjects.Particles.ParticleEmitterManager
  private playerShadow!: Phaser.GameObjects.Ellipse

  constructor() {
    super('Ruins')
  }

  create() {
    const width = 960
    const height = 640

    // Background: dark stone floor
    this.add.rectangle(width / 2, height / 2, width, height, 0x1f2428)

    // Subtle stone tiling effect + cracked seams + tile tint noise
    const g = this.add.graphics()
    g.lineStyle(1, 0x2a3136, 0.6)
    for (let x = 0; x <= width; x += 48) g.lineBetween(x, 0, x, height)
    for (let y = 0; y <= height; y += 48) g.lineBetween(0, y, width, y)
    g.setAlpha(0.4)
    // Hairline cracks across random tiles
    const cgFloor = this.add.graphics()
    cgFloor.lineStyle(1, 0x20262b, 0.8)
    for (let i = 0; i < 26; i++) {
      const sx = Phaser.Math.Between(24, width - 24)
      const sy = Phaser.Math.Between(24, height - 24)
      cgFloor.beginPath()
      cgFloor.moveTo(sx, sy)
      cgFloor.lineTo(sx + Phaser.Math.Between(-18, 18), sy + Phaser.Math.Between(-18, 18))
      cgFloor.strokePath()
    }
    // Random cool/warm tint blotches for aged stone
    const stain = this.add.graphics()
    for (let i = 0; i < 40; i++) {
      const sx = Phaser.Math.Between(0, width)
      const sy = Phaser.Math.Between(0, height)
      const r = Phaser.Math.Between(10, 24)
      const col = Phaser.Math.Between(0, 1) ? 0x213027 : 0x2a2d33
      stain.fillStyle(col, 0.25)
      stain.fillCircle(sx, sy, r)
    }

    // Cracked pillars/walls and debris
    this.walls = this.physics.add.staticGroup()
    const wallColor = 0x3a3f46
    const addWall = (x: number, y: number, w: number, h: number) => {
      const rect = this.add.rectangle(x, y, w, h, wallColor).setOrigin(0.5)
      const s = this.physics.add.existing(rect, true) as Phaser.Physics.Arcade.StaticSprite
      this.walls.add(s)
      // cracks
      const cg = this.add.graphics({ x: x - w / 2, y: y - h / 2 })
      cg.lineStyle(1, 0x2b2f35, 0.9)
      for (let i = 0; i < 4; i++) {
        const sx = Phaser.Math.Between(6, Math.max(6, w - 6))
        cg.beginPath()
        cg.moveTo(sx, Phaser.Math.Between(6, Math.max(6, h / 2)))
        cg.lineTo(sx + Phaser.Math.Between(-10, 10), Phaser.Math.Between(h / 2, Math.max(h / 2 + 10, h - 6)))
        cg.strokePath()
      }
      cg.setAlpha(0.7)
    }

    // Perimeter ruins walls
    addWall(width / 2, 24, width - 80, 48) // top
    // bottom wall will be split into two segments around the exit arch (created later)
    addWall(24, height / 2, 48, height - 120) // left
    addWall(width - 24, height / 2, 48, height - 120) // right

    // Ambient occlusion (AO) along wall-floor joins for 3D feel
    const ao = this.add.graphics()
    ao.fillStyle(0x000000, 0.22)
    // bottom of top wall
    ao.fillRect(40, 48, width - 80, 6)
    // top of bottom wall
    ao.fillRect(40, height - 54, width - 80, 6)
    // right of left wall
    ao.fillRect(48, 60, 6, height - 120)
    // left of right wall
    ao.fillRect(width - 54, 60, 6, height - 120)
    ao.setDepth(1)

    // Broken inner pillars (some non-blocking rubble too)
    addWall(width * 0.25, height * 0.35, 40, 140)
    addWall(width * 0.75, height * 0.42, 40, 120)
    addWall(width * 0.50, height * 0.62, 60, 80)
    // Small rubble (decor)
    const rubble = this.add.graphics()
    rubble.fillStyle(0x2d3338, 1)
    for (let i = 0; i < 30; i++) {
      rubble.fillRect(
        Phaser.Math.Between(80, width - 80),
        Phaser.Math.Between(100, height - 120),
        Phaser.Math.Between(4, 10),
        Phaser.Math.Between(3, 8)
      )
    }

    // Vines: draw winding green lines with leaf blobs
    const drawVine = (path: Array<{ x: number; y: number }>) => {
      const vg = this.add.graphics()
      // Anchor showing direction of origin (peg + thicker base segment)
      const p0 = path[0]
      const p1 = path[1] ?? path[0]
      vg.fillStyle(0x3b4f3d, 1)
      vg.fillCircle(p0.x, p0.y, 6)
      vg.fillStyle(0x6d4c41, 1)
      vg.fillRect(p0.x - 3, p0.y - 8, 6, 16)
      // Thicker root segment
      vg.lineStyle(10, 0x2e7d32, 1)
      vg.beginPath(); vg.moveTo(p0.x, p0.y); vg.lineTo(p1.x, p1.y); vg.strokePath()
      vg.lineStyle(6, 0x2e7d32, 1)
      vg.beginPath()
      vg.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) vg.lineTo(path[i].x, path[i].y)
      vg.strokePath()
      // lighter core
      vg.lineStyle(2, 0x66bb6a, 0.9)
      vg.beginPath()
      vg.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) vg.lineTo(path[i].x, path[i].y)
      vg.strokePath()
      // leaves
      vg.fillStyle(0x66bb6a, 1)
      for (let i = 1; i < path.length; i += 2) {
        vg.fillTriangle(path[i].x, path[i].y, path[i].x - 10, path[i].y + 6, path[i].x - 4, path[i].y - 10)
      }
      vg.setAlpha(0.95)
    }

    // Helper: build a random vine polyline that drapes downward with small meanders
    const randomVine = (sx: number, sy: number, segments = 6, dx = 22, dy = 52) => {
      const pts: Array<{ x: number; y: number }> = [{ x: sx, y: sy }]
      for (let i = 1; i < segments; i++) {
        const last = pts[pts.length - 1]
        pts.push({
          x: Phaser.Math.Clamp(last.x + Phaser.Math.Between(-dx, dx), 40, width - 40),
          y: Phaser.Math.Clamp(last.y + Phaser.Math.Between(dy - 20, dy + 20), 30, height - 80)
        })
      }
      return pts
    }

    // Vines from top, right, and left walls (more density)
    drawVine([
      { x: 120, y: 40 },
      { x: 150, y: 100 },
      { x: 170, y: 160 },
      { x: 160, y: 240 },
      { x: 190, y: 300 }
    ])
    drawVine([
      { x: width - 140, y: 40 },
      { x: width - 160, y: 120 },
      { x: width - 190, y: 200 },
      { x: width - 180, y: 280 },
      { x: width - 210, y: 360 }
    ])
    drawVine([
      { x: 44, y: height * 0.25 },
      { x: 90, y: height * 0.3 },
      { x: 130, y: height * 0.36 },
      { x: 150, y: height * 0.42 },
      { x: 170, y: height * 0.5 }
    ])
    // Procedural additional vines with more natural anchors (avoid center top and altar/arch area)
    for (let i = 0; i < 6; i++) {
      const sx = (i % 2 === 0)
        ? Phaser.Math.Between(60, 220)
        : Phaser.Math.Between(width - 220, width - 60)
      drawVine(randomVine(sx, 36, Phaser.Math.Between(5, 7)))
    }
    for (let i = 0; i < 4; i++) {
      const sy = Phaser.Math.Between(100, Math.floor(height * 0.55))
      drawVine(randomVine(44, sy, Phaser.Math.Between(4, 6), 20, 54))
    }
    for (let i = 0; i < 4; i++) {
      const sy = Phaser.Math.Between(100, Math.floor(height * 0.55))
      drawVine(randomVine(width - 44, sy, Phaser.Math.Between(4, 6), 20, 54))
    }

    // Moss strips hugging walls (organic jagged shapes)
    const drawMossStripH = (x1: number, x2: number, yBase: number, thickness: number) => {
      const mg = this.add.graphics()
      mg.fillStyle(0x2e7d32, 0.42)
      const step = 18
      const ptsTop: Phaser.Math.Vector2[] = []
      for (let x = x1; x <= x2; x += step) {
        const jitter = Phaser.Math.Between(-thickness, 0)
        ptsTop.push(new Phaser.Math.Vector2(x + Phaser.Math.Between(-4, 4), yBase + jitter))
      }
      const ptsBot: Phaser.Math.Vector2[] = []
      for (let x = x2; x >= x1; x -= step) {
        const jitter = Phaser.Math.Between(6, thickness + 10)
        ptsBot.push(new Phaser.Math.Vector2(x + Phaser.Math.Between(-4, 4), yBase + jitter))
      }
      mg.beginPath()
      mg.moveTo(ptsTop[0].x, ptsTop[0].y)
      ptsTop.forEach(p => mg.lineTo(p.x, p.y))
      ptsBot.forEach(p => mg.lineTo(p.x, p.y))
      mg.closePath()
      mg.fillPath()
      mg.lineStyle(1, 0x66bb6a, 0.5)
      for (let i = 0; i < 4; i++) {
        const sx = Phaser.Math.Between(x1, x2)
        mg.beginPath()
        mg.moveTo(sx, yBase - Phaser.Math.Between(0, thickness))
        mg.lineTo(sx + Phaser.Math.Between(-10, 10), yBase + Phaser.Math.Between(6, thickness + 12))
        mg.strokePath()
      }
    }
    // Bottom wall moss band and top thin strip
    drawMossStripH(70, width - 70, height - 60, 24)
    drawMossStripH(120, width - 120, 64, 14)
    // Vertical moss streaks along left/right walls
    const drawMossStripV = (xBase: number, y1: number, y2: number, thickness: number) => {
      const mg = this.add.graphics()
      mg.fillStyle(0x2e7d32, 0.42)
      const step = 18
      const ptsLeft: Phaser.Math.Vector2[] = []
      for (let y = y1; y <= y2; y += step) ptsLeft.push(new Phaser.Math.Vector2(xBase - Phaser.Math.Between(0, thickness), y + Phaser.Math.Between(-4, 4)))
      const ptsRight: Phaser.Math.Vector2[] = []
      for (let y = y2; y >= y1; y -= step) ptsRight.push(new Phaser.Math.Vector2(xBase + Phaser.Math.Between(6, thickness + 10), y + Phaser.Math.Between(-4, 4)))
      mg.beginPath(); mg.moveTo(ptsLeft[0].x, ptsLeft[0].y)
      ptsLeft.forEach(p => mg.lineTo(p.x, p.y)); ptsRight.forEach(p => mg.lineTo(p.x, p.y))
      mg.closePath(); mg.fillPath()
    }
    drawMossStripV(56, 120, height - 100, 18)
    drawMossStripV(width - 56, 120, height - 100, 18)

    // Exit arch (gap in bottom wall)
    const archX = width / 2
    const archW = 120
    const arch = this.add.rectangle(archX, height - 24, archW, 48, 0x1f2428).setOrigin(0.5)
    const archSensor = this.physics.add.existing(arch, true) as Phaser.Physics.Arcade.StaticSprite

    // Create split bottom walls leaving a physical gap for the arch
    const margin = 40
    const totalBW = width - margin * 2
    const gapW = archW + 40 // small extra clearance around arch
    const sideW = Math.max(40, Math.floor((totalBW - gapW) / 2))
    // left bottom segment
    addWall(margin + sideW / 2, height - 24, sideW, 48)
    // right bottom segment
    addWall(width - margin - sideW / 2, height - 24, sideW, 48)

    // Torches near arch with flicker glow
    const torch = (tx: number, ty: number) => {
      const base = this.add.rectangle(tx, ty, 10, 26, 0x4e342e)
      const flame = this.add.circle(tx, ty - 18, 8, 0xffa726, 1)
      const glow = this.add.circle(tx, ty - 18, 22, 0xff8f00, 0.25)
      this.tweens.add({ targets: [flame, glow], alpha: { from: 0.8, to: 1 }, scale: { from: 0.95, to: 1.05 }, duration: Phaser.Math.Between(220, 360), yoyo: true, repeat: -1 })
      // Wide additive light
      const light = this.add.circle(tx, ty - 18, 120, 0xfff3b0, 0.08)
      try { light.setBlendMode(Phaser.BlendModes.ADD) } catch (e) {}
      light.setDepth(0.5)
    }
    torch(archX - 80, height - 64)
    torch(archX + 80, height - 64)

    // Central altar with glowing runes
    const altarBase = this.add.rectangle(width * 0.5, height * 0.55, 160, 18, 0x3a4046)
    this.add.rectangle(width * 0.5, height * 0.55 - 18, 120, 14, 0x3a4046)
    this.add.rectangle(width * 0.5, height * 0.55 - 32, 90, 10, 0x3a4046)
    const runeG = this.add.graphics()
    runeG.fillStyle(0x00e5ff, 0.9)
    for (let i = -3; i <= 3; i++) runeG.fillCircle(width * 0.5 + i * 18, height * 0.55 - 40, 3)
    this.tweens.add({ targets: runeG, alpha: { from: 0.6, to: 1 }, duration: 1200, yoyo: true, repeat: -1 })

    // Cobwebs in corners: radial strands + concentric rings
    const drawCobwebCorner = (cx: number, cy: number, baseAngleDeg: number, radius: number) => {
      const wg = this.add.graphics()
      const radial = 9
      wg.lineStyle(1, 0xdee3e6, 0.7)
      for (let i = 0; i < radial; i++) {
        const a = Phaser.Math.DegToRad(baseAngleDeg + (i - (radial - 1) / 2) * 12)
        wg.beginPath(); wg.moveTo(cx, cy); wg.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius); wg.strokePath()
      }
      const rings = 5
      for (let r = 1; r <= rings; r++) {
        const rr = (radius * r) / (rings + 0.5)
        wg.lineStyle(1, 0xd0d9de, 0.45)
        wg.beginPath()
        for (let i = 0; i < radial; i++) {
          const a = Phaser.Math.DegToRad(baseAngleDeg + (i - (radial - 1) / 2) * 12)
          const x = cx + Math.cos(a) * rr
          const y = cy + Math.sin(a) * rr
          if (i === 0) wg.moveTo(x, y); else wg.lineTo(x, y)
        }
        wg.strokePath()
      }
      wg.setAlpha(0.85)
    }
    drawCobwebCorner(26, 26, 45, 92)
    drawCobwebCorner(width - 26, 26, 135, 98)
    drawCobwebCorner(26, height - 26, -45, 96)
    drawCobwebCorner(width - 26, height - 26, -135, 94)

    // Side-wall cobweb sectors (mid-left and mid-right), oriented inward for a natural look
    const drawCobwebSector = (cx: number, cy: number, dirDeg: number, spreadDeg: number, radius: number) => {
      const wg = this.add.graphics()
      const radial = 7
      wg.lineStyle(1, 0xdee3e6, 0.7)
      for (let i = 0; i < radial; i++) {
        const t = -spreadDeg / 2 + (spreadDeg * i) / (radial - 1)
        const a = Phaser.Math.DegToRad(dirDeg + t)
        wg.beginPath(); wg.moveTo(cx, cy); wg.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius); wg.strokePath()
      }
      const rings = 4
      for (let r = 1; r <= rings; r++) {
        const rr = (radius * r) / (rings + 0.3)
        wg.lineStyle(1, 0xd0d9de, 0.45)
        wg.beginPath()
        for (let i = 0; i < radial; i++) {
          const t = -spreadDeg / 2 + (spreadDeg * i) / (radial - 1)
          const a = Phaser.Math.DegToRad(dirDeg + t)
          const x = cx + Math.cos(a) * rr
          const y = cy + Math.sin(a) * rr
          if (i === 0) wg.moveTo(x, y); else wg.lineTo(x, y)
        }
        wg.strokePath()
      }
      wg.setAlpha(0.85)
    }
    drawCobwebSector(56, height * 0.35, 0, 90, 78) // left wall, spanning into room
    drawCobwebSector(56, height * 0.7, 0, 80, 70)
    drawCobwebSector(width - 56, height * 0.38, 180, 90, 78) // right wall
    drawCobwebSector(width - 56, height * 0.72, 180, 80, 70)

    // Light rays from ceiling cracks (parallax-like glow)
    const rays = this.add.graphics()
    const drawRay = (cx: number, cy: number, w: number, h: number, a: number) => {
      rays.fillStyle(0xffffcc, a)
      rays.fillTriangle(cx - w / 2, cy, cx + w / 2, cy, cx, cy + h)
    }
    drawRay(180, 20, 90, 180, 0.08)
    drawRay(width - 200, 20, 120, 230, 0.07)
    drawRay(width * 0.5 + 60, 20, 70, 160, 0.06)
    this.tweens.add({ targets: rays, alpha: { from: 0.05, to: 0.12 }, duration: 1600, yoyo: true, repeat: -1 })
    try { rays.setBlendMode(Phaser.BlendModes.ADD) } catch (e) {}
    rays.setScrollFactor(0.96)

    // Small puddles with shimmer
    const puddle = (px: number, py: number, rx: number, ry: number) => {
      const pg = this.add.graphics()
      pg.fillStyle(0x31565a, 0.45)
      pg.fillEllipse(px, py, rx, ry)
      const gloss = this.add.graphics()
      gloss.fillStyle(0xa7e0ff, 0.12)
      gloss.fillEllipse(px - rx * 0.15, py - ry * 0.2, rx * 0.5, ry * 0.3)
      this.tweens.add({ targets: [pg, gloss], alpha: { from: 0.35, to: 0.55 }, duration: 1800, yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 400) })
    }
    puddle(width * 0.32, height * 0.72, 80, 34)
    puddle(width * 0.68, height * 0.66, 60, 26)

    // Hanging chains (swinging)
    const chain = (cx: number, cy: number, len: number) => {
      const cg = this.add.graphics()
      cg.lineStyle(3, 0x8a9aa6, 1)
      cg.beginPath()
      cg.moveTo(cx, cy)
      cg.lineTo(cx, cy + len)
      cg.strokePath()
      this.tweens.add({ targets: cg, angle: { from: -6, to: 6 }, duration: Phaser.Math.Between(1800, 2400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 300) })
    }
    chain(width * 0.42, 40, 100)
    chain(width * 0.58, 40, 120)

    // Refined details: floor glyph, side statues, wall banners, torch light pools, and dust motes
    // Ancient floor glyph at center (non-colliding, subtle)
    {
      const gx = this.add.graphics().setDepth(-4)
      gx.lineStyle(2, 0x2f3941, 0.85)
      const cx = width * 0.5, cy = height * 0.52
      gx.strokeCircle(cx, cy, 64)
      gx.strokeCircle(cx, cy, 44)
      // runes
      gx.fillStyle(0x3b4750, 1)
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8
        const rx = cx + Math.cos(a) * 54
        const ry = cy + Math.sin(a) * 54
        gx.fillTriangle(rx, ry - 4, rx - 4, ry + 4, rx + 4, ry + 4)
      }
      // faint glow
      const glow = this.add.circle(cx, cy, 78, 0x89a6c0, 0.06).setDepth(-5)
      try { glow.setBlendMode(Phaser.BlendModes.ADD) } catch (e) {}
    }

    // Modest side statues on plinths (decor only)
    const addStatue = (sx: number, sy: number, flip = false) => {
      const g = this.add.graphics().setDepth(1)
      g.fillStyle(0x3d444b, 1); g.fillRect(sx - 14, sy, 28, 10) // plinth
      g.fillStyle(0x525a63, 1); g.fillEllipse(sx, sy - 24, 20, 28) // body
      g.fillStyle(0x5f6a73, 1); g.fillTriangle(sx, sy - 44, sx + (flip ? -8 : 8), sy - 28, sx + (flip ? -6 : 6), sy - 50) // head crest
      g.lineStyle(1, 0x22282e, 0.8); g.strokeRect(sx - 14, sy, 28, 10)
    }
    addStatue(84, height * 0.62)
    addStatue(width - 84, height * 0.66, true)

    // Worn wall banners (top wall), tattered bottoms
    const addBanner = (bx: number, color: number) => {
      const g = this.add.graphics().setDepth(0.5)
      const topY = 50
      g.fillStyle(color, 1); g.fillRect(bx - 10, topY, 20, 60)
      g.fillStyle(0x202629, 0.18)
      g.fillTriangle(bx - 10, topY + 60, bx, topY + 74, bx + 10, topY + 60)
      g.lineStyle(1, 0x22282e, 0.8); g.strokeRect(bx - 10, topY, 20, 60)
    }
    addBanner(width * 0.3, 0x7b1e1e)
    addBanner(width * 0.7, 0x2e4a7b)

    // Torch pools: warm light halos below existing torches
    const addTorchPool = (tx: number, ty: number) => {
      const pool = this.add.ellipse(tx, ty + 12, 120, 60, 0xffe080, 0.07).setDepth(-2)
      try { pool.setBlendMode(Phaser.BlendModes.ADD) } catch (e) {}
      this.tweens.add({ targets: pool, alpha: { from: 0.05, to: 0.12 }, duration: 900, yoyo: true, repeat: -1 })
    }
    addTorchPool(width * 0.5 - 80, height - 64)
    addTorchPool(width * 0.5 + 80, height - 64)

    // Air dust motes in shafts (localized, slow)
    if (!this.textures.exists('speck')) {
      const sp = this.add.graphics({ pixelArt: true })
      sp.fillStyle(0xffffff, 1); sp.fillRect(0, 0, 2, 2)
      sp.generateTexture('speck', 2, 2); sp.destroy()
    }
    const makeMotes = (rx: number, ry: number, rw: number, rh: number) => {
      const p = this.add.particles(0, 0, 'speck', {
        x: { min: rx, max: rx + rw },
        y: { min: ry, max: ry + rh },
        lifespan: 2200,
        speedX: { min: -8, max: 8 },
        speedY: { min: -6, max: -12 },
        alpha: { start: 0.5, end: 0 },
        scale: { start: 1, end: 0.5 },
        quantity: 1,
        frequency: 300
      })
      p.setDepth(2)
    }
    makeMotes(width * 0.26, 60, 80, 120)
    makeMotes(width * 0.74 - 80, 60, 80, 120)

    // Dripping water particles near vines
    if (!this.textures.exists('drop')) {
      const dr = this.add.graphics({ pixelArt: true })
      dr.fillStyle(0xa7e0ff, 1)
      dr.fillRect(1, 0, 2, 6)
      dr.generateTexture('drop', 4, 6)
      dr.destroy()
    }
    const drip = this.add.particles(0, 0, 'drop', {
      x: { onEmit: () => Phaser.Math.Between(100, width - 100) },
      y: 40,
      gravityY: 180,
      lifespan: 1400,
      speedY: { min: 80, max: 140 },
      alpha: { start: 0.9, end: 0 },
      scale: { start: 0.8, end: 0.9 },
      quantity: 1,
      frequency: 900
    })
    drip.setDepth(1)

    // Player
    this.player = this.physics.add.sprite(width / 2, height * 0.6, 'slime_d_1').setScale(1.4)
    // Drop shadow under player for 3D grounding
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 18, 34, 14, 0x000000, 0.3)
    this.playerShadow.setDepth(0.1)
    this.player.setCollideWorldBounds(true)
    this.physics.world.setBounds(0, 0, width, height)
    this.physics.add.collider(this.player, this.walls)

    // Overlap to exit to Overworld (pass origin so Overworld spawns at bottom gate)
    this.physics.add.overlap(this.player, archSensor, () => {
      this.scene.start('Overworld', { from: 'Ruins' })
    })

    // Camera
    const cam = this.cameras.main
    cam.setBounds(0, 0, width, height)
    cam.startFollow(this.player)

    // Controls
    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as Record<string, Phaser.Input.Keyboard.Key>

    // UI: hint text
    this.add.text(16, 10, 'Ancient Ruins — WASD to move\nWalk into the arch to exit', { color: '#cfd8dc', fontSize: '14px' }).setScrollFactor(0)

    // Ambient dust particles
    if (!this.textures.exists('dust')) {
      const dg = this.add.graphics({ pixelArt: true })
      dg.fillStyle(0xffffff, 1)
      dg.fillCircle(2, 2, 2)
      dg.generateTexture('dust', 4, 4)
      dg.destroy()
    }
    const particles = this.add.particles(0, 0, 'dust', {
      x: { min: 40, max: width - 40 },
      y: 20,
      lifespan: 2600,
      speedY: { min: 10, max: 30 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.6, end: 0.2 },
      alpha: { start: 0.5, end: 0 },
      quantity: 1,
      frequency: 180
    })
    particles.setDepth(2)

    // Footstep dust emitter
    this.stepEmitter = this.add.particles(0, 0, 'dust', {
      lifespan: 400,
      speed: { min: 10, max: 30 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.6, end: 0 },
      quantity: 0
    })
    this.stepEmitter.setDepth(2)

    // Vignette: soft dark edges
    const vign = this.add.graphics()
    vign.fillStyle(0x000000, 0.18)
    vign.fillRect(0, 0, width, 28)
    vign.fillRect(0, height - 28, width, 28)
    vign.fillRect(0, 0, 28, height)
    vign.fillRect(width - 28, 0, 28, height)
    vign.setDepth(3)
  }

  update() {
    const speed = 180
    let vx = 0, vy = 0
    if (this.keys.left.isDown) vx = -speed
    if (this.keys.right.isDown) vx = speed
    if (this.keys.up.isDown) vy = -speed
    if (this.keys.down.isDown) vy = speed
    this.player.setVelocity(vx, vy)
    // Walk animations
    const isMovingAnim = Math.abs(vx) + Math.abs(vy) > 0
    if (isMovingAnim) {
      if (Math.abs(vy) >= Math.abs(vx)) this.lastDir = vy < 0 ? 'up' : 'down'; else this.lastDir = vx < 0 ? 'left' : 'right'
      const key = this.lastDir === 'up' ? 'slime-walk-up' : this.lastDir === 'down' ? 'slime-walk-down' : this.lastDir === 'left' ? 'slime-walk-left' : 'slime-walk-right'
      this.player.anims.play(key, true)
    } else {
      this.player.anims.stop()
      const idleKey = this.lastDir === 'up' ? 'slime_u_1' : this.lastDir === 'down' ? 'slime_d_1' : this.lastDir === 'left' ? 'slime_l_1' : 'slime_r_1'
      this.player.setTexture(idleKey)
    }

    // Update player shadow
    if (this.playerShadow) {
      this.playerShadow.x = this.player.x
      this.playerShadow.y = this.player.y + 18
      const vel = Math.abs(vx) + Math.abs(vy)
      const w = Phaser.Math.Clamp(34 + vel * 0.02, 34, 48)
      const h = Phaser.Math.Clamp(14 - vel * 0.01, 8, 14)
      this.playerShadow.setDisplaySize(w, h)
      this.playerShadow.setAlpha(0.22 + Math.min(vel, 180) / 180 * 0.08)
    }

    // Emit soft dust puffs when moving
    const moving = Math.abs(vx) + Math.abs(vy) > 0
    if (moving) {
      this.stepTimer += this.game.loop.delta
      if (this.stepTimer > 130) {
        this.stepTimer = 0
        const px = this.player.x + Phaser.Math.Between(-4, 4)
        const py = this.player.y + this.player.displayHeight * 0.3
        this.stepEmitter?.emitParticleAt(px, py, 1)
      }
    } else {
      this.stepTimer = 0
    }
  }
}
