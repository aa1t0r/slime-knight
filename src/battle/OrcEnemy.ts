import Enemy from './Enemy'
import * as Actions from './Actions'

export default class OrcEnemy extends Enemy {
  constructor(opts: { name?: string; hp?: number }) {
    super({ name: opts.name ?? 'Orc', hp: opts.hp ?? 30, type: 'orc' })
  }

  performAttack(scene: any, x: number, y: number, width: number, height: number) {
    // Clear any leftover safety timer from a previous attack phase
    if (scene.enemyAttackTimer) { try { scene.enemyAttackTimer.remove(false) } catch {} ; scene.enemyAttackTimer = undefined }
    scene.bullets = Actions.createBulletGroup(scene) as any
    Actions.addOverlapPlayer(scene, scene.bullets)
    const left = x, right = x + width, top = y, bottom = y + height
    const choose = Phaser.Math.Between(0, 1)
    if (choose === 0) {
      // Boulder attack (existing, with refined visuals)
      if (scene.textures.exists('boulder')) scene.textures.remove('boulder')
      {
        const g = scene.add.graphics({ pixelArt: true })
        const size = 152
        const r = size / 2
        g.fillStyle(0x7a7f86, 1); g.fillCircle(r, r, r - 2)
        g.fillStyle(0x686d73, 1)
        for (let i = 0; i < 8; i++) {
          const ang = Phaser.Math.FloatBetween(0, Math.PI * 2)
          const rr = Phaser.Math.Between(6, r - 10)
          const cx = r + Math.cos(ang) * rr
          const cy = r + Math.sin(ang) * rr
          g.fillCircle(cx, cy, Phaser.Math.Between(3, 6))
        }
        g.fillStyle(0x6b6f75, 1)
        for (let i = 0; i < 12; i++) {
          const ang = Phaser.Math.FloatBetween(0, Math.PI * 2)
          const rr = Phaser.Math.Between(r - 12, r - 5)
          const cx = r + Math.cos(ang) * rr
          const cy = r + Math.sin(ang) * rr
          g.fillCircle(cx, cy, Phaser.Math.Between(2, 4))
        }
        g.lineStyle(2, 0x5b6168, 0.9)
        for (let i = 0; i < 6; i++) {
          const a1 = Phaser.Math.FloatBetween(0, Math.PI * 2)
          const len = Phaser.Math.Between(10, 24)
          const sx = r + Math.cos(a1) * Phaser.Math.Between(4, r - 16)
          const sy = r + Math.sin(a1) * Phaser.Math.Between(4, r - 16)
          const ex = sx + Math.cos(a1 + Phaser.Math.FloatBetween(-0.4, 0.4)) * len
          const ey = sy + Math.sin(a1 + Phaser.Math.FloatBetween(-0.4, 0.4)) * len
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.strokePath()
        }
        g.lineStyle(3, 0xaeb4ba, 0.6)
        g.beginPath(); (g as any).arc(r, r, r - 8, -Math.PI * 0.25, Math.PI * 0.15); g.strokePath()
        g.lineStyle(2, 0x9aa0a6, 0.5); g.strokeCircle(r, r, r - 3)
        g.fillStyle(0xffffff, 0.08)
        for (let i = 0; i < 20; i++) g.fillCircle(Phaser.Math.Between(8, size - 8), Phaser.Math.Between(8, size - 8), 1)
        g.generateTexture('boulder', size, size)
        g.destroy()
      }
      let active = 0
      const launchBoulder = (fromRight: boolean) => {
        const b = scene.physics.add.image(fromRight ? right - 18 : left + 18, bottom - 24, 'boulder')
        b.setDepth(12)
        b.setData('damage', 5)
        b.setData('persistOnHit', true)
        try { b.body.setAllowGravity(false) } catch {}
        try { (b as any).setOrigin?.(0.5, 0.5) } catch {}
        try { scene.bullets.add(b) } catch {}
        // Visual radius for bounce physics (keep using full sprite size)
        const radius = Math.max(b.displayWidth, b.displayHeight) / 2
        // Shrink hitbox to be more forgiving (about 70% of visual radius)
        try {
          const hitR = Math.max(8, Math.floor(radius * 0.7))
          b.body.setCircle(hitR)
          const offX = Math.floor((b.displayWidth - hitR * 2) / 2)
          const offY = Math.floor((b.displayHeight - hitR * 2) / 2)
          b.body.setOffset(offX, offY)
        } catch {}
        const speedScale = 1.56 * 1.35
        const gY = 1200 * speedScale
        const travel = Math.max(12, (bottom - radius) - (top + radius))
        const bounceVyAbs = Math.sqrt(2 * gY * travel)
        const baseH = 190
        const v0x = (fromRight ? -1 : 1) * baseH * speedScale
        let vx = v0x, vy = -bounceVyAbs
        active++
        const tick = scene.time.addEvent({ delay: 16, loop: true, callback: () => {
          if (!b.active) { tick.remove(false); return }
          const dt = tick.delay / 1000
          vy += gY * dt
          b.x += vx * dt
          b.y += vy * dt
          b.angle += vx * dt * 0.06
          if (b.x - radius <= left) { b.x = left + radius; vx = Math.abs(vx) }
          if (b.x + radius >= right) { b.x = right - radius; vx = -Math.abs(vx) }
          if (b.y + radius >= bottom) { b.y = bottom - radius; vy = -bounceVyAbs }
          if (b.y - radius <= top) { b.y = top + radius; vy = Math.abs(vy) }
        } })
        scene.time.delayedCall(8000, () => { try { b.destroy() } catch {}; try { tick.remove(false) } catch {}; active--; if (active <= 0) try { scene.endEnemyAttack() } catch {} })
      }
      launchBoulder(false)
      scene.time.delayedCall(1000, () => launchBoulder(true))
      scene.enemyAttackTimer = scene.time.delayedCall(12000, () => { try { scene.endEnemyAttack() } catch {} })
      return
    }
    // Second attack: three pairs of descending fists creating ground waves to jump over (total 6 fists)
    // Build fist texture if needed
    if (scene.textures.exists('orc_fist')) scene.textures.remove('orc_fist')
    {
      const g = scene.add.graphics({ pixelArt: true })
      const w = 160, h = 120 // bigger fist
      // wrist (tapered)
      g.fillStyle(0x5b3f1e, 1); g.fillRect(8, 60, 28, 52)
      g.fillStyle(0x4a3518, 1); g.fillRect(8, 96, 28, 12)
      // palm base with slight bevel
      g.fillStyle(0x8b6914, 1); g.fillRect(30, 30, 114, 64)
      g.fillStyle(0x9a7520, 0.4); g.fillRect(32, 32, 110, 20)
      // thumb block
      g.fillStyle(0x7b5a10, 1); g.fillRect(28, 48, 20, 30)
      // knuckles ridge
      g.fillStyle(0x7b5a10, 1); g.fillRect(30, 80, 114, 12)
      // finger separations
      g.lineStyle(3, 0x6b4f2e, 1)
      g.beginPath(); g.moveTo(58, 30); g.lineTo(58, 94); g.strokePath()
      g.beginPath(); g.moveTo(86, 30); g.lineTo(86, 94); g.strokePath()
      g.beginPath(); g.moveTo(114, 30); g.lineTo(114, 94); g.strokePath()
      // knuckle circles
      g.fillStyle(0x6b4f2e, 1)
      g.fillCircle(50, 88, 3); g.fillCircle(78, 88, 3); g.fillCircle(106, 88, 3); g.fillCircle(134, 88, 3)
      // outline and highlights
      g.lineStyle(3, 0x3b2d1a, 1); g.strokeRect(30, 30, 114, 64)
      g.lineStyle(2, 0xd3b16a, 0.5); g.beginPath(); g.moveTo(36, 36); g.lineTo(100, 36); g.strokePath()
      g.generateTexture('orc_fist', w, h); g.destroy()
    }
    // Build wave texture if needed
    if (scene.textures.exists('fist_wave')) scene.textures.remove('fist_wave')
    {
      const g = scene.add.graphics({ pixelArt: true })
      const ww = 140, hh = 44 // even taller and wider
      // build a cresting wave polygon
      const pts: {x:number;y:number}[] = []
      const crestH = 14
      for (let i = 0; i <= 8; i++) {
        const t = i / 8
        const x = t * ww
        const y = hh - 10 - Math.sin(t * Math.PI) * crestH
        pts.push({ x, y })
      }
      // base fill with gradient-like layering
      g.fillStyle(0x6f97ff, 1)
      g.beginPath(); g.moveTo(0, hh)
      pts.forEach(p => g.lineTo(p.x, p.y))
      g.lineTo(ww, hh); g.closePath(); g.fillPath()
      g.fillStyle(0x8fb0ff, 0.6)
      g.beginPath(); g.moveTo(0, hh - 8)
      pts.forEach(p => g.lineTo(p.x, p.y - 3))
      g.lineTo(ww, hh - 8); g.closePath(); g.fillPath()
      g.lineStyle(2, 0x4d6fcf, 1)
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y)
      pts.forEach(p => g.lineTo(p.x, p.y)); g.strokePath()
      // foam specks
      g.fillStyle(0xffffff, 0.6)
      for (let i = 0; i < 14; i++) g.fillCircle(Phaser.Math.Between(4, ww - 4), Phaser.Math.Between(hh - 18, hh - 8), 2)
      g.generateTexture('fist_wave', ww, hh); g.destroy()
    }
    let active = 0
    const dropFistAt = (targetX: number) => {
      // wind-up: ground marker
      try { Actions.showGroundMarker(scene, targetX, bottom - 8, 14, 0xffaa00, 500) } catch {}
      const fist = scene.physics.add.image(targetX, top - 160, 'orc_fist').setDepth(12)
      fist.setData('damage', 6); fist.setData('persistOnHit', true)
      try { fist.body.setAllowGravity(false) } catch {}
      try { scene.bullets.add(fist) } catch {}
      let vy = 0
      const gY = 2200 * 5.0 // twice as fast as current (2.5x -> now 5x)
      active++
      // wind-up 500ms, then drop
      // visual wind-up: slight rise and tilt then compress back
      try {
        scene.tweens.add({ targets: fist, y: fist.y - 24, angle: { from: 0, to: 8 }, duration: 250, yoyo: true, ease: 'Sine.easeInOut' })
      } catch {}
      scene.time.delayedCall(500, () => {
        const tick = scene.time.addEvent({ delay: 16, loop: true, callback: () => {
          if (!fist.active) { tick.remove(false); return }
          const dt = tick.delay / 1000
          vy += gY * dt
          fist.y += vy * dt
          const groundY = bottom - 10
          if (fist.y >= groundY) {
            fist.y = groundY
            try { fist.destroy() } catch {}
            tick.remove(false)
            active--
            // spawn waves left and right at ground level
            const spawnWave = (dir: number) => {
              const wave = scene.physics.add.image(targetX, bottom - 28, 'fist_wave').setDepth(11)
              wave.setData('damage', 3); wave.setData('persistOnHit', true)
              try { wave.body.setAllowGravity(false) } catch {}
              try { scene.bullets.add(wave) } catch {}
              let vx = dir * 360 * 2.0 // 2x faster (kept)
              const tickW = scene.time.addEvent({ delay: 16, loop: true, callback: () => {
                if (!wave.active) { tickW.remove(false); return }
                const dtw = tickW.delay / 1000
                wave.x += vx * dtw
                if (wave.x < left - 40 || wave.x > right + 40) { try { wave.destroy() } catch {}; tickW.remove(false) }
              } })
              // ensure cleanup after 2.2s
              scene.time.delayedCall(2200, () => { try { wave.destroy() } catch {}; try { tickW.remove(false) } catch {} })
            }
            spawnWave(-1); spawnWave(1)
          }
        } })
      })
    }
    // helper to drop a pair with minimum separation
    const dropPair = () => {
      const minSep = Math.max(100, Math.floor(width * 0.25))
      let x1 = Phaser.Math.Between(Math.floor(left + 40), Math.floor(right - 40))
      let x2 = Phaser.Math.Between(Math.floor(left + 40), Math.floor(right - 40))
      let guard = 0
      while (Math.abs(x2 - x1) < minSep && guard++ < 20) {
        x2 = Phaser.Math.Between(Math.floor(left + 40), Math.floor(right - 40))
      }
      dropFistAt(x1)
      dropFistAt(x2)
    }
    // schedule three pairs 3s apart (total 6 fists)
    dropPair()
    scene.time.delayedCall(3000, () => dropPair())
    scene.time.delayedCall(6000, () => dropPair())
    // safety end after ~10s
    scene.enemyAttackTimer = scene.time.delayedCall(10000, () => { try { scene.endEnemyAttack() } catch {} })
  }
}
