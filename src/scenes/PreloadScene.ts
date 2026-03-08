import Phaser from 'phaser'

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload')
  }

  preload() {
    // load external assets generated earlier
    // only load images; we'll build the map data in code
    const base = import.meta.env.BASE_URL || '/'
    this.load.image('tiles', base + 'assets/tilesets/tiles.png')
    this.load.image('player', base + 'assets/sprites/player.png')
    this.load.image('enemy', base + 'assets/sprites/enemy.png')
    this.load.image('dragon', base + 'assets/sprites/dragon.png')
    // optional future assets: slime/player will reuse 'player' sprite for now

    // debug logging
    this.load.on('complete', () => {
      console.log('Assets preloaded')
    })
  }

  create() {
    // Ensure the UI overlay scene is running alongside gameplay scenes
    try { this.scene.launch('UI') } catch {}
    // generate slime sprite (player character) as 64x64 pixel art (more detail, neutral shadow)
    if (this.textures.exists('slime')) this.textures.remove('slime')
    {
      const g = this.add.graphics({ pixelArt: true })
      // base blob with rounded silhouette
      const base = 0x3a9ae8
      const mid = 0x49b3ff
      const hi = 0x9ad7ff
      const deep = 0x1b2a33 // neutral cool gray-blue for internal shade (not bright blue)
      // rounded body
      g.fillStyle(base, 1)
      // slightly less wide, a bit taller for volume
      g.fillEllipse(32, 36, 38, 26)
      // belly translucence
      g.fillStyle(mid, 0.38)
      g.fillEllipse(32, 40, 32, 16)
      // subtle rim highlight lines (no bubble on top)
      g.lineStyle(1, hi, 0.45)
      g.beginPath(); g.moveTo(20, 22); g.lineTo(30, 21); g.strokePath()
      g.lineStyle(1, hi, 0.35)
      g.beginPath(); g.moveTo(33, 22); g.lineTo(41, 22); g.strokePath()
      // inner lower shade — desaturated so it isn't bright blue
      g.fillStyle(deep, 0.5)
      g.fillEllipse(32, 47, 34, 9)
      // side shading for 3D roundness
      g.fillStyle(0x18323c, 0.28)
      g.fillEllipse(20, 36, 8, 16)
      g.fillEllipse(44, 36, 8, 16)
      // rim highlight along the crown
      g.fillStyle(hi, 0.25)
      g.fillEllipse(32, 22, 26, 5)
      // outline
      g.lineStyle(1, 0x0b223a, 1)
      g.strokeEllipse(32, 36, 38, 26)
      // cute face
      g.fillStyle(0xffffff, 1)
      g.fillRect(22, 28, 6, 6)
      g.fillRect(36, 28, 6, 6)
      g.fillStyle(0x1b5fae, 1)
      g.fillRect(24, 30, 3, 3)
      g.fillRect(38, 30, 3, 3)
      g.fillStyle(0xffffff, 1)
      g.fillRect(25, 29, 1, 1)
      g.fillRect(39, 29, 1, 1)
      // curved mouth (3px curve)
      g.fillStyle(0x0b223a, 1)
      g.fillRect(28, 35, 8, 1)
      g.fillRect(27, 36, 10, 1)
      g.fillRect(28, 37, 8, 1)
      // (removed internal bubbles to avoid top-bubble look)
      // base shadow under slime (baked-in)
      g.fillStyle(0x000000, 0.16)
      g.fillEllipse(32, 54, 30, 6)
      g.generateTexture('slime', 64, 64)
      g.destroy()
    }

    // Generate 4-direction slime walk frames (6 frames per dir) and idle (4 frames) and create animations
    const ensureSlimeFrames = () => {
      const drawSlime = (g: Phaser.GameObjects.Graphics, w: number, h: number, dir: 'd'|'u'|'l'|'r', eyeOX: number, eyeOY: number, mouthY: number) => {
        const base = 0x3a9ae8, mid = 0x49b3ff, hi = 0x9ad7ff, deep = 0x1b2a33
        g.fillStyle(base, 1); g.fillEllipse(32, 36, w, h)
        g.fillStyle(mid, 0.35); g.fillEllipse(32, 40, Math.max(16, w - 6), Math.max(8, Math.floor(h * 0.45)))
        g.lineStyle(1, hi, 0.45); g.beginPath(); g.moveTo(20, 22); g.lineTo(30, 21); g.strokePath()
        g.lineStyle(1, hi, 0.35); g.beginPath(); g.moveTo(33, 22); g.lineTo(41, 22); g.strokePath()
        g.fillStyle(deep, 0.45); g.fillEllipse(32, 47, Math.max(12, w - 4), Math.max(6, Math.floor(h * 0.34)))
        g.lineStyle(1, 0x0b223a, 1); g.strokeEllipse(32, 36, w, h)
        // eyes
        g.fillStyle(0xffffff, 1)
        g.fillRect(22 + eyeOX, 28 + eyeOY, 6, 6)
        g.fillRect(36 + eyeOX, 28 + eyeOY, 6, 6)
        g.fillStyle(0x1b5fae, 1)
        g.fillRect(24 + eyeOX, 30 + eyeOY, 3, 3)
        g.fillRect(38 + eyeOX, 30 + eyeOY, 3, 3)
        g.fillStyle(0xffffff, 1)
        g.fillRect(25 + eyeOX, 29 + eyeOY, 1, 1)
        g.fillRect(39 + eyeOX, 29 + eyeOY, 1, 1)
        // mouth
        g.fillStyle(0x0b223a, 1)
        g.fillRect(28, mouthY, 8, 1); g.fillRect(27, mouthY + 1, 10, 1); g.fillRect(28, mouthY + 2, 8, 1)
      }
      const makeWalk = (dir: 'd'|'u'|'l'|'r', phase: number) => {
        const key = `slime_${dir}_${phase}`
        if (this.textures.exists(key)) return
        const g = this.add.graphics({ pixelArt: true })
        // sinusoidal squish over 6 frames
        const t = (phase / 6) * Math.PI * 2
        const sx = Math.round(Math.sin(t) * 2)
        const sy = Math.round(Math.cos(t) * 2)
        const w = 38 + sx
        const h = 26 + sy
        const eyeOX = dir === 'l' ? -3 : dir === 'r' ? 3 : 0
        const eyeOY = dir === 'u' ? -2 : dir === 'd' ? 0 : -1
        const mouthY = 36 + (dir === 'u' ? -1 : dir === 'd' ? 1 : 0)
        drawSlime(g, w, h, dir, eyeOX, eyeOY, mouthY)
        // shadow
        g.fillStyle(0x000000, 0.16); g.fillEllipse(32, 54, Math.max(20, 30 - Math.abs(sx)), Math.max(4, 6 - Math.max(0, sy)))
        g.generateTexture(key, 64, 64); g.destroy()
      }
      const dirs: Array<'d'|'u'|'l'|'r'> = ['d','u','l','r']
      dirs.forEach(d => { for (let i = 0; i < 6; i++) makeWalk(d, i) })
      // animations
      const mkWalk = (key: string, dir: 'd'|'u'|'l'|'r') => {
        if (this.anims.exists(key)) return
        const frames = Array.from({ length: 6 }, (_, i) => ({ key: `slime_${dir}_${i}` }))
        this.anims.create({ key, frames, frameRate: 10, repeat: -1 })
      }
      mkWalk('slime-walk-down', 'd'); mkWalk('slime-walk-up', 'u'); mkWalk('slime-walk-left', 'l'); mkWalk('slime-walk-right', 'r')
    }
    ensureSlimeFrames()

    // Pre-render battle forest background once for reuse to avoid runtime hitches
    if (!this.textures.exists('battle_forest_bg')) {
      const W = 1024
      const H = 640
      const g = this.add.graphics()
      // sky gradient
      g.fillStyle(0x89d6a3, 1); g.fillRect(0, 0, W, H)
      g.fillStyle(0x377c5f, 0.4); g.fillRect(0, 0, W, H*0.55)
      // distant hills
      g.fillStyle(0x27524a, 1)
      g.fillEllipse(W*0.3, H*0.55, W*0.9, H*0.6)
      g.fillEllipse(W*0.8, H*0.6, W*0.9, H*0.7)
      // canopy wall
      g.fillStyle(0x214a3a, 1)
      for (let x = -40; x < W + 40; x += 36) {
        const y = H*0.58 + Phaser.Math.Between(-8, 10)
        g.fillEllipse(x, y, Phaser.Math.Between(46, 72), Phaser.Math.Between(28, 40))
      }
      // far trees spaced, higher on hills
      g.fillStyle(0x1d3f37, 1)
      const slots = 28
      for (let i=0; i<slots; i++) {
        const baseX = (W / (slots - 1)) * i
        const x = Phaser.Math.Clamp(baseX + Phaser.Math.Between(-10, 10), 4, W - 4)
        const y = H*0.5 + Phaser.Math.Between(-10, 8)
        if (Phaser.Math.Between(0,1)===0) {
          g.fillTriangle(x, y, x-10, y+40, x+10, y+40)
          g.fillTriangle(x, y-10, x-12, y+26, x+12, y+26)
        } else {
          g.fillEllipse(x, y+6, 30, 34)
          g.fillRect(x-2, y+18, 4, 22)
        }
      }
      // ground plane and blades
      g.fillStyle(0x386d3b, 1); g.fillRect(0, H*0.7, W, H*0.3)
      g.fillStyle(0x2f6e2f, 0.8)
      for (let i=0;i<220;i++) {
        const x = Phaser.Math.Between(0, W)
        const y = Phaser.Math.Between(Math.floor(H*0.7), H-8)
        g.fillTriangle(x, y, x-2, y+6, x+2, y+6)
      }
      // flower clusters + singles
      const palettes = [ { petal: 0xffcdd2, center: 0xfff59d }, { petal: 0xb39ddb, center: 0xfff176 }, { petal: 0x90caf9, center: 0xfff59d }, { petal: 0xa5d6a7, center: 0xfff59d } ]
      for (let c=0;c<14;c++) {
        const cx = Phaser.Math.Between(30, W-30)
        const cy = Phaser.Math.Between(Math.floor(H*0.72), H-18)
        const count = Phaser.Math.Between(6, 12)
        for (let i=0;i<count;i++) {
          const fx = cx + Phaser.Math.Between(-10, 10)
          const fy = cy + Phaser.Math.Between(-6, 6)
          const pal = palettes[Phaser.Math.Between(0, palettes.length-1)]
          g.fillStyle(0x2f6e2f, 1); g.fillRect(fx-1, fy, 2, 6)
          g.fillStyle(pal.petal, 1)
          const scale = 1 + Math.random()*0.6
          for (let a=0;a<5;a++) { const ang = a * (Math.PI*2/5); g.fillCircle(fx + Math.cos(ang)*3*scale, fy - 2 + Math.sin(ang)*3*scale, 1.6*scale) }
          g.fillStyle(pal.center, 1); g.fillCircle(fx, fy - 2, 1.5*scale)
        }
      }
      for (let i=0;i<80;i++) {
        const fx = Phaser.Math.Between(18, W-18)
        const fy = Phaser.Math.Between(Math.floor(H*0.72), H-14)
        const pal = palettes[Phaser.Math.Between(0, palettes.length-1)]
        g.fillStyle(0x2f6e2f, 1); g.fillRect(fx-1, fy, 2, 6)
        g.fillStyle(pal.petal, 1)
        for (let a=0;a<5;a++) { const ang = a * (Math.PI*2/5); g.fillCircle(fx + Math.cos(ang)*3, fy - 2 + Math.sin(ang)*3, 1.7) }
        g.fillStyle(pal.center, 1); g.fillCircle(fx, fy - 2, 1.5)
      }
      // front trees with spacing
      const placed: number[] = []
      const frontCount = 10
      while (placed.length < frontCount && placed.length < 40) {
        const x = Phaser.Math.Between(28, W - 28)
        const minGap = 72
        if (placed.every(px => Math.abs(px - x) >= minGap)) {
          placed.push(x)
          const y = Math.floor(H*0.68)
          const h = Phaser.Math.Between(68, 100)
          g.fillStyle(0x5d4037, 1); g.fillRect(x, y, 10, h)
          g.fillStyle(0x3e2723, 0.5); g.fillRect(x+5, y, 5, h)
          const cy = y - 10
          g.fillStyle(0x2e7d32, 1); g.fillEllipse(x+5, cy, 60, 36)
          g.fillEllipse(x-15, cy+4, 42, 28)
          g.fillEllipse(x+25, cy+6, 42, 28)
          g.fillStyle(0x1b5e20, 0.35); g.fillEllipse(x, cy-4, 46, 20)
          g.fillStyle(0x173317, 0.35); g.fillEllipse(x+5, y + h, 40, 12)
        }
      }
      g.generateTexture('battle_forest_bg', W, H)
      g.destroy()
    }
    // detailed tree texture (layered canopy + bark), origin at base (0.5, 1)
    if (this.textures.exists('tree')) this.textures.remove('tree')
    {
      const w = 54
      const h = 64
      const gT = this.add.graphics({ pixelArt: true })
      // canopy layers
      const base = 0x2e7d32
      const mid = 0x388e3c
      const dark = 0x1b5e20
      const hi = 0x66bb6a
      gT.fillStyle(base, 1); gT.fillCircle(w/2, 24, 20)
      gT.fillStyle(mid, 0.9); gT.fillCircle(w/2 - 12, 28, 14); gT.fillCircle(w/2 + 12, 28, 14)
      gT.fillStyle(base, 0.9); gT.fillCircle(w/2, 32, 16)
      // inner occlusion
      gT.fillStyle(dark, 0.35); gT.fillCircle(w/2, 30, 14)
      // leaf lobes
      gT.fillStyle(mid, 0.8)
      gT.fillCircle(w/2 - 16, 22, 8)
      gT.fillCircle(w/2 + 16, 22, 8)
      gT.fillCircle(w/2, 16, 7)
      // rim highlight
      gT.fillStyle(hi, 0.28); gT.fillEllipse(w/2 - 8, 16, 16, 6)
      // bark trunk with roots
      gT.fillStyle(0x6b4f2a, 1)
      gT.fillRect(w/2 - 5, h - 22, 10, 22)
      gT.fillRect(w/2 - 12, h - 8, 24, 8)
      // bark lines
      gT.lineStyle(1, 0x4e342e, 1)
      for (let y = h - 20; y < h - 2; y += 4) gT.strokeLineShape(new Phaser.Geom.Line(w/2 - 4, y, w/2 + 4, y))
      gT.strokeLineShape(new Phaser.Geom.Line(w/2 - 2, h - 18, w/2 - 2, h - 4))
      // drop shadow
      gT.fillStyle(0x000000, 0.16)
      gT.fillEllipse(w/2, h - 2, 28, 6)
      // canopy outline hint
      gT.lineStyle(1, dark, 1)
      gT.strokeCircle(w/2, 24, 20)
      gT.generateTexture('tree', w, h)
      gT.destroy()
    }

    // generate goblin sprite as 64x64 pixel art (more detail + extra accents + 3D touches)
    if (this.textures.exists('goblin')) this.textures.remove('goblin')
    {
      const g2 = this.add.graphics({ pixelArt: true })
      const skin = 0x5bb05b
      const skinDark = 0x3f8a3f
      const earDark = 0x2f6e2f
      const line = 0x0e1a0e
      // head shape (rounded)
      g2.fillStyle(skin, 1)
      g2.fillEllipse(32, 28, 40, 26)
      // jaw/chin
      g2.fillStyle(skin, 1)
      g2.fillRect(16, 30, 32, 12)
      // side shading for head volume
      g2.fillStyle(0x2f6e2f, 0.28)
      g2.fillEllipse(18, 28, 6, 14)
      g2.fillEllipse(46, 28, 6, 14)
      // subtle rim light on top-left
      g2.fillStyle(0x95ff95, 0.22)
      g2.fillEllipse(22, 20, 12, 4)
      // ear fins
      g2.fillStyle(skinDark, 1)
      g2.fillTriangle(8, 26, 14, 24, 14, 32)
      g2.fillTriangle(56, 26, 50, 24, 50, 32)
      g2.fillStyle(earDark, 1)
      g2.fillTriangle(10, 26, 14, 25, 14, 31)
      g2.fillTriangle(54, 26, 50, 25, 50, 31)
      // brow ridge
      g2.fillStyle(skinDark, 1)
      g2.fillRect(18, 22, 28, 3)
      // eyes
      g2.fillStyle(0xfff382, 1)
      g2.fillRect(20, 24, 10, 8)
      g2.fillRect(38, 24, 10, 8)
      g2.fillStyle(0x0a0a0a, 1)
      g2.fillRect(24, 26, 4, 4)
      g2.fillRect(40, 26, 4, 4)
      g2.fillStyle(0xffffff, 1)
      g2.fillRect(25, 25, 1, 1)
      g2.fillRect(41, 25, 1, 1)
      // glossy eye specular
      g2.fillStyle(0xffffcc, 0.5)
      g2.fillRect(24, 25, 1, 1)
      g2.fillRect(40, 25, 1, 1)
      // nose
      g2.fillStyle(skinDark, 1)
      g2.fillRect(30, 28, 4, 6)
      // mouth with fang and shadow
      g2.fillStyle(0x0a0a0a, 1)
      g2.fillRect(26, 36, 12, 3)
      g2.fillStyle(0xffffff, 1)
      g2.fillRect(31, 36, 2, 3)
      // cheeks shade
      g2.fillStyle(skinDark, 0.4)
      g2.fillCircle(18, 32, 4)
      g2.fillCircle(46, 32, 4)
      // wrinkles under eyes
      g2.fillStyle(skinDark, 0.6)
      g2.fillRect(20, 33, 8, 1)
      g2.fillRect(38, 33, 8, 1)
      // second fang hint
      g2.fillStyle(0xffffff, 1)
      g2.fillRect(33, 36, 1, 3)
      // shoulder pads + torso hint (+ strap)
      g2.fillStyle(0x3a4046, 1)
      g2.fillEllipse(20, 46, 12, 6)
      g2.fillEllipse(44, 46, 12, 6)
      g2.fillStyle(0x2b3036, 1)
      g2.fillRect(22, 44, 20, 6)
      // strap across chest
      g2.fillStyle(0x664c2e, 1)
      g2.fillRect(18, 38, 6, 2)
      g2.fillRect(22, 40, 6, 2)
      g2.fillRect(26, 42, 6, 2)
      g2.fillRect(30, 44, 6, 2)
      g2.fillRect(34, 46, 6, 2)
      // jaw shadow over torso for depth
      g2.fillStyle(0x000000, 0.12)
      g2.fillRect(18, 42, 28, 3)
      // outline
      g2.lineStyle(1, line, 1)
      g2.strokeEllipse(32, 28, 40, 26)
      g2.strokeRect(16, 30, 32, 12)

      g2.generateTexture('goblin', 64, 64)
      g2.destroy()
    }

    // Generate Goblin King sprite (enhanced details: crown, cape folds, armor rivets, scepter)
    if (this.textures.exists('goblin_king')) this.textures.remove('goblin_king')
    {
      const gk = this.add.graphics({ pixelArt: true })
      const skin = 0x4fae4f
      const skinDark = 0x2f6e2f
      const skinDeep = 0x1f4e1f
      const line = 0x0e1a0e
      const crown = 0xffd54f
      const crownEdge = 0xcc9a2e
      const gemBlue = 0x6ec6ff
      const gemRed = 0xff8a80
      const gemGreen = 0xa5d6a7
      const cape = 0x8b2b2b
      const capeDark = 0x6a1b1b
      const capeHi = 0xb33b3b
      const armor = 0x6b6f75
      const armorHi = 0x9aa0a6
      const armorDark = 0x5b6168
      const leather = 0x6b4f2a
      const tusk = 0xefe7d1

      const W = 80, H = 80
      // Cape with folds
      gk.fillStyle(cape, 1); gk.fillEllipse(W/2, 52, 62, 40)
      gk.fillStyle(capeDark, 0.5); gk.fillEllipse(W/2, 56, 54, 28)
      gk.fillStyle(capeHi, 0.25); gk.fillEllipse(W/2 - 10, 48, 22, 10)
      gk.fillStyle(capeHi, 0.2); gk.fillEllipse(W/2 + 12, 50, 20, 8)

      // Shoulder armor with rivets
      gk.fillStyle(armor, 1)
      gk.fillEllipse(24, 50, 18, 12)
      gk.fillEllipse(56, 50, 18, 12)
      gk.fillStyle(armorDark, 0.9)
      gk.fillEllipse(24, 52, 16, 10); gk.fillEllipse(56, 52, 16, 10)
      gk.fillStyle(armorHi, 0.6)
      gk.fillEllipse(22, 48, 8, 4); gk.fillEllipse(58, 48, 8, 4)
      gk.fillStyle(0xd7dde3, 1)
      gk.fillCircle(18, 52, 1); gk.fillCircle(30, 52, 1); gk.fillCircle(50, 52, 1); gk.fillCircle(62, 52, 1)

      // Chest plate and belt
      gk.fillStyle(armor, 1); gk.fillRect(26, 46, 28, 10)
      gk.fillStyle(leather, 1); gk.fillRect(24, 56, 32, 4)
      gk.fillStyle(0x9e7b4a, 1); gk.fillRect(36, 56, 8, 4) // buckle

      // Head + jaw (larger)
      gk.fillStyle(skin, 1)
      gk.fillEllipse(W/2, 32, 48, 32)
      gk.fillRect(22, 36, 36, 12)
      // Shading on head
      gk.fillStyle(skinDark, 0.35); gk.fillEllipse(W/2 + 6, 34, 24, 14)
      gk.fillStyle(skinDeep, 0.35); gk.fillRect(24, 42, 32, 4)

      // Eyes and brow
      gk.fillStyle(0xfff382, 1)
      gk.fillRect(30, 30, 8, 6); gk.fillRect(42, 30, 8, 6)
      gk.fillStyle(0x0a0a0a, 1); gk.fillRect(33, 32, 3, 3); gk.fillRect(45, 32, 3, 3)
      gk.fillStyle(skinDark, 1); gk.fillRect(26, 26, 28, 3)
      // Nose + scar
      gk.fillStyle(skinDark, 1); gk.fillRect(38, 32, 4, 6)
      gk.fillStyle(0x7a2b2b, 1); gk.fillRect(28, 28, 8, 1)

      // Tusks with shadow
      gk.fillStyle(tusk, 1); gk.fillRect(34, 40, 3, 5); gk.fillRect(44, 40, 3, 5)
      gk.fillStyle(0x9e8f7a, 0.6); gk.fillRect(34, 44, 3, 1); gk.fillRect(44, 44, 3, 1)

      // Crown with prongs and gems
      gk.fillStyle(crown, 1)
      gk.fillTriangle(W/2 - 12, 22, W/2 - 22, 28, W/2 - 2, 28)
      gk.fillTriangle(W/2, 18, W/2 - 10, 28, W/2 + 10, 28)
      gk.fillTriangle(W/2 + 12, 22, W/2 + 2, 28, W/2 + 22, 28)
      gk.fillStyle(crownEdge, 1); gk.fillRect(W/2 - 22, 28, 44, 4)
      gk.fillStyle(gemBlue, 1); gk.fillCircle(W/2, 23, 2)
      gk.fillStyle(gemRed, 1); gk.fillCircle(W/2 - 10, 25, 1.5)
      gk.fillStyle(gemGreen, 1); gk.fillCircle(W/2 + 10, 25, 1.5)

      // Scepter (right side) — longer staff, banding, ornate head, and hand grip
      // staff
      gk.fillStyle(leather, 1); gk.fillRect(60, 30, 3, 30)
      // decorative bands on staff
      gk.fillStyle(armorHi, 1); gk.fillRect(60, 34, 3, 1); gk.fillRect(60, 42, 3, 1); gk.fillRect(60, 50, 3, 1)
      // head (ornate orb with cross-guard)
      gk.fillStyle(armorHi, 1); gk.fillCircle(61, 28, 5)
      gk.fillStyle(gemBlue, 1); gk.fillCircle(61, 28, 2)
      gk.fillStyle(armor, 1); gk.fillRect(57, 30, 8, 2)
      // king's hand gripping staff (overlay)
      gk.fillStyle(skin, 1); gk.fillRect(58, 38, 8, 6)
      gk.fillStyle(skinDark, 0.5); gk.fillRect(58, 42, 8, 2)

      // Outline accents
      gk.lineStyle(1, line, 1)
      gk.strokeEllipse(W/2, 32, 48, 32)
      gk.strokeRect(22, 36, 36, 12)

      // Ground shadow
      gk.fillStyle(0x000000, 0.16); gk.fillEllipse(W/2, 74, 38, 6)
      gk.generateTexture('goblin_king', W, H)
      gk.destroy()
    }

      // generate an orc sprite (64x64) with extra detail
      if (this.textures.exists('orc')) this.textures.remove('orc')
      {
        const gO = this.add.graphics({ pixelArt: true })
        // palette
        const skin = 0x4a8e3a
        const skinDark = 0x355e27
        const armor = 0x6b6b6b
        const metal = 0x9aa0a6
        const leather = 0x664c2e
        const tusk = 0xefe7d1
        const eye = 0xd9ff66
        const line = 0x0b223a

        // head / shoulders silhouette (lowered head and merged neck to torso)
        // move head further down so it contacts the chest; add neck shading to remove floating illusion
        gO.fillStyle(skin, 1)
        gO.fillEllipse(32, 36, 40, 34)

        // neck bridge (slight overlap) to connect head to chest
        gO.fillStyle(skinDark, 1)
        gO.fillRect(28, 42, 8, 6)

        // brow ridge and helmet fragment (moved down)
        gO.fillStyle(skinDark, 1)
        gO.fillRect(14, 26, 36, 6)
        gO.fillStyle(metal, 0.24)
        gO.fillRect(12, 24, 40, 6)

        // eyes (glow) and pupil
        gO.fillStyle(eye, 1)
        gO.fillRect(22, 30, 4, 4)
        gO.fillRect(38, 30, 4, 4)
        gO.fillStyle(0x0b223a, 1)
        gO.fillRect(23, 31, 2, 2)
        gO.fillRect(39, 31, 2, 2)

        // scar across eyebrow (adds character)
        gO.fillStyle(0x7a2b2b, 1)
        gO.fillRect(26, 28, 6, 1)

        // cheek tattoo / warpaint
        gO.fillStyle(0x7c2f2f, 0.9)
        gO.fillRect(18, 34, 2, 6)
        gO.fillRect(44, 34, 2, 6)

        // tusks with small shadow and notch (moved down)
        gO.fillStyle(tusk, 1)
        gO.fillRect(26, 44, 3, 6)
        gO.fillRect(35, 44, 3, 6)
        gO.fillStyle(0x000000, 0.12)
        gO.fillRect(26, 49, 3, 1)
        gO.fillRect(35, 49, 3, 1)

        // nose/bridge shading and nostril hints (moved down)
        gO.fillStyle(skinDark, 0.5)
        gO.fillRect(30, 36, 4, 6)
        gO.fillStyle(0x2b1d1d, 1)
        gO.fillRect(30, 38, 1, 1)
        gO.fillRect(33, 38, 1, 1)

        // mouth (grim) (moved down)
        gO.fillStyle(0x2b1d1d, 1)
        gO.fillRect(28, 48, 8, 3)

        // add a small horn / bone accessory on left temple
        gO.fillStyle(0xe0d7c5, 1)
        gO.fillTriangle(12, 30, 6, 26, 12, 22)

        // shoulder armor with rivets and trim (moved down)
        gO.fillStyle(armor, 1)
        gO.fillEllipse(18, 58, 14, 8)
        gO.fillEllipse(46, 58, 14, 8)
        gO.fillStyle(metal, 1)
        gO.fillRect(12, 54, 4, 2)
        gO.fillRect(48, 54, 4, 2)
        // rivets
        gO.fillStyle(0x2b2b2b, 1)
        gO.fillRect(14, 52, 1, 1)
        gO.fillRect(50, 52, 1, 1)

        // chest leather strip and straps (moved down)
        gO.fillStyle(leather, 1)
        gO.fillRect(22, 58, 20, 8)
        gO.fillStyle(0x523a27, 1)
        gO.fillRect(18, 52, 6, 2)
        gO.fillRect(30, 52, 6, 2)

        // pendant hanging from strap
        gO.fillStyle(0xd4a14a, 1)
        gO.fillRect(32, 60, 4, 4)

        // weapon handle (club) with metal band (moved down)
        gO.fillStyle(0x6b4f2e, 1)
        gO.fillRect(48, 50, 6, 18)
        gO.fillStyle(0x3c2f24, 1)
        gO.fillRect(50, 48, 4, 4)
        gO.fillStyle(metal, 1)
        gO.fillRect(48, 58, 6, 2)

        // highlights and outline (adjusted)
        gO.fillStyle(0xffffff, 0.06)
        gO.fillEllipse(26, 30, 8, 4)
        gO.lineStyle(1, line, 1)
        gO.strokeEllipse(32, 36, 40, 34)
        gO.generateTexture('orc', 64, 64)
        gO.destroy()
      }

    // generate detailed heart sprite for dodge phase (64x64)
    if (this.textures.exists('heart')) this.textures.remove('heart')
    {
      const g3 = this.add.graphics({ pixelArt: true })
      // build heart from two circles + triangle base
      const base = 0x3aa0ff
      const mid = 0x60bbff
      const deep = 0x1a3452
      const hi = 0xbbe6ff
      // base silhouette
      g3.fillStyle(base, 1)
      g3.fillCircle(24, 24, 12)
      g3.fillCircle(40, 24, 12)
      g3.fillStyle(base, 1)
      g3.fillTriangle(12, 28, 52, 28, 32, 52)
      // inner gradient-like shading
      g3.fillStyle(mid, 0.9)
      g3.fillCircle(24, 24, 9)
      g3.fillCircle(40, 24, 9)
      g3.fillStyle(deep, 0.35)
      g3.fillTriangle(18, 32, 46, 32, 32, 48)
      // specular highlights
      g3.fillStyle(hi, 0.9)
      g3.fillEllipse(22, 20, 8, 4)
      g3.fillEllipse(38, 20, 7, 3)
      // outline
      g3.lineStyle(1, 0x0b223a, 1)
      g3.strokeCircle(24, 24, 12)
      g3.strokeCircle(40, 24, 12)
      g3.strokeTriangle(12, 28, 52, 28, 32, 52)
      g3.generateTexture('heart', 64, 64)
      g3.destroy()
    }

    // arrow pointer used in battle menu (larger pixel)
    if (!this.textures.exists('arrow')) {
      const g4 = this.add.graphics({ pixelArt: true })
      g4.fillStyle(0xffffff, 1)
      g4.fillRect(0, 6, 8, 4)
      g4.fillRect(4, 2, 8, 12)
      g4.generateTexture('arrow', 16, 16)
      g4.destroy()
    }

    // dagger texture (detailed): blade, guard, hilt, and specular highlight (points right)
    if (this.textures.exists('dagger')) this.textures.remove('dagger')
    {
      const g5 = this.add.graphics({ pixelArt: true })
      // guard
      g5.fillStyle(0x4e342e, 1)
      g5.fillRect(24, 26, 4, 12)
      // hilt
      g5.fillStyle(0x8b6914, 1)
      g5.fillRect(12, 28, 12, 8)
      g5.fillStyle(0x6e5120, 1)
      g5.fillRect(12, 30, 12, 2)
      // pommel
      g5.fillStyle(0x4e342e, 1)
      g5.fillRect(10, 30, 2, 4)
      // blade core
      g5.fillStyle(0xe6e6e6, 1)
      g5.fillTriangle(58, 32, 28, 25, 28, 39)
      // blade darker edge
      g5.fillStyle(0xbdbdbd, 1)
      g5.fillTriangle(58, 32, 34, 28, 34, 36)
      // specular highlight
      g5.fillStyle(0xffffff, 0.6)
      g5.fillTriangle(48, 31, 36, 30, 36, 34)
      // blade spine accent
      g5.lineStyle(1, 0xcfcfcf, 0.7)
      g5.beginPath(); g5.moveTo(42, 31); g5.lineTo(34, 32); g5.strokePath()
      // outline
      g5.lineStyle(1, 0x000000, 1)
      g5.strokeTriangle(58, 32, 28, 25, 28, 39)
      g5.strokeRect(24, 26, 4, 12)
      g5.strokeRect(12, 28, 12, 8)
      g5.generateTexture('dagger', 64, 64)
      g5.destroy()
    }

    // slash texture: curved energy arc for slashing attack
    if (this.textures.exists('slash')) this.textures.remove('slash')
    {
      const size = 128
      const gS = this.add.graphics({ pixelArt: true })
      const cx = size/2, cy = size/2
      // main arc
      gS.fillStyle(0xffe082, 0.9)
      gS.slice(cx, cy, 54, Phaser.Math.DegToRad(-65), Phaser.Math.DegToRad(65), false)
      gS.fillPath()
      // inner core
      gS.fillStyle(0xffffff, 0.7)
      gS.slice(cx, cy, 38, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false)
      gS.fillPath()
      // outer glow
      gS.fillStyle(0xff6f00, 0.25)
      gS.slice(cx, cy, 62, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false)
      gS.fillPath()
      // tip highlight
      gS.fillStyle(0xffffff, 0.8)
      gS.fillCircle(cx + 50, cy, 3)
      try { gS.setBlendMode(Phaser.BlendModes.ADD) } catch (e) {}
      gS.generateTexture('slash', size, size)
      gS.destroy()
    }

    // bomb texture
    if (!this.textures.exists('bomb')) {
      const g6 = this.add.graphics({ pixelArt: true })
      g6.fillStyle(0x222222, 1)
      g6.fillCircle(32, 32, 12)
      g6.fillStyle(0xff5500, 1)
      g6.fillRect(30, 16, 4, 6)
      g6.generateTexture('bomb', 64, 64)
      g6.destroy()
    }

    // small bullet texture used in generic sprays
    if (!this.textures.exists('bullet')) {
      const g7 = this.add.graphics({ pixelArt: true })
      g7.fillStyle(0xffffff, 1)
      g7.fillCircle(8, 8, 6)
      g7.lineStyle(1, 0x000000, 1)
      g7.strokeCircle(8, 8, 6)
      g7.generateTexture('bullet', 16, 16)
      g7.destroy()
    }

    // after assets loaded, start ruins starting room
    this.scene.start('Ruins')
  }
}
