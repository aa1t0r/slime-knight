import Phaser from 'phaser'
import Enemy from './Enemy'
import * as Actions from './Actions'

export default class GoblinKingEnemy extends Enemy {
  constructor(opts: { name?: string; hp?: number }) {
    super({ name: opts.name ?? 'Goblin King', hp: opts.hp ?? 50, type: 'goblinKing' })
  }

  // For now, implement the enhanced slash pattern: 16 slashes total, fired as 8 pairs.
  performAttack(scene: any, x: number, y: number, width: number, height: number) {
    scene.bullets = scene.bullets || (Actions.createBulletGroup(scene) as any)
    Actions.addOverlapPlayer(scene, scene.bullets)

    // Randomly choose between the king's slash pairs or multi-direction dagger throw
    const choose = Phaser.Math.Between(0, 1)
    if (choose === 1) {
      // Multi-direction daggers (25 total), can spawn from top/left/right, twice as slow as goblin's
      const left = x, right = x + width, top = y, bottom = y + height
      const total = 25
      const waves = 5
      const perWave = Math.ceil(total / waves)
      const waveInterval = 420 // ms between waves (a bit slower cadence)
      let spawned = 0
      let active = 0
      let ended = false
      const maybeFinish = () => { if (!ended && spawned >= total && active <= 0) { ended = true; try { scene.endEnemyAttack() } catch {} } }

      // helper to telegraph and spawn a single dagger from a side or top
      const spawnDagger = (dir: 'top'|'left'|'right') => {
        // Telegraph marker
        if (dir === 'top') {
          const bx = Phaser.Math.Between(left + 24, right - 24)
          Actions.showGroundMarker(scene, bx, bottom - 8, 12, (this as any).attackColor ?? 0xff66aa, 500)
          scene.time.delayedCall(420, () => {
            const initialY = top - Phaser.Math.Between(80, 140)
            const dagger = scene.physics.add.image(bx, initialY, 'dagger').setOrigin(0.5)
            try { dagger.setDisplaySize(48, 112) } catch { dagger.setScale(2.8) }
            dagger.setData('damage', 3)
            dagger.body.setAllowGravity(false)
            // hitbox tuned similar to goblin's but centered
            try {
              const bw = Math.max(14, Math.floor(dagger.displayWidth * 0.5))
              const bh = Math.max(20, Math.floor(dagger.displayHeight * 0.6))
              const body = dagger.body as Phaser.Physics.Arcade.Body
              body.setSize(bw, bh)
              const offX = Math.floor((dagger.displayWidth - bw) / 2)
              const offY = Math.floor((dagger.displayHeight - bh) / 2) + Math.floor(dagger.displayHeight * 0.08)
              body.setOffset(offX, offY)
            } catch {}
            dagger.setDepth(12)
            try { scene.bullets.add(dagger) } catch {}
            spawned++; active++
            try { (dagger as any).once('destroy', () => { active--; maybeFinish() }) } catch {}
            // Half the speed of goblin daggers
            const vx = Phaser.Math.Between(-15, 15)
            const vy = Phaser.Math.Between(260, 360) // slower fall
            dagger.setVelocity(vx, vy)
            dagger.setRotation(Phaser.Math.DegToRad(90 + Phaser.Math.Between(-4, 4)))
            // cleanup guard
            const guard = scene.time.addEvent({ delay: 16, loop: true, callback: () => {
              if (!dagger.active) { guard.remove(false); return }
              if (dagger.y > bottom + 24) { try { dagger.destroy() } catch {}; guard.remove(false) }
            } })
          })
        } else {
          const by = Phaser.Math.Between(top + 24, bottom - 24)
          // side marker
          const mx = dir === 'left' ? left + 10 : right - 10
          const mark = scene.add.rectangle(mx, by, 12, 20, (this as any).attackColor ?? 0xff66aa, 0.35).setOrigin(0.5)
          scene.tweens.add({ targets: mark, alpha: { from: 0.2, to: 0.8 }, duration: 300, yoyo: true, repeat: 1, onComplete: () => { try { mark.destroy() } catch {} } })
          scene.time.delayedCall(380, () => {
            const initialX = dir === 'left' ? (left - 40) : (right + 40)
            const dagger = scene.physics.add.image(initialX, by, 'dagger').setOrigin(0.5)
            try { dagger.setDisplaySize(48, 112) } catch { dagger.setScale(2.8) }
            dagger.setData('damage', 3)
            dagger.body.setAllowGravity(false)
            try {
              const bw = Math.max(14, Math.floor(dagger.displayWidth * 0.6))
              const bh = Math.max(20, Math.floor(dagger.displayHeight * 0.5))
              const body = dagger.body as Phaser.Physics.Arcade.Body
              body.setSize(bw, bh)
              const offX = Math.floor((dagger.displayWidth - bw) / 2)
              const offY = Math.floor((dagger.displayHeight - bh) / 2)
              body.setOffset(offX, offY)
            } catch {}
            dagger.setDepth(12)
            try { scene.bullets.add(dagger) } catch {}
            spawned++; active++
            try { (dagger as any).once('destroy', () => { active--; maybeFinish() }) } catch {}
            // Half-speed horizontal flight; slight vertical jitter
            const base = Phaser.Math.Between(320, 480)
            const vx = (dir === 'left' ? 1 : -1) * Math.floor(base * 0.5)
            const vy = Phaser.Math.Between(-40, 40)
            dagger.setVelocity(vx, vy)
            dagger.setRotation(Phaser.Math.DegToRad(dir === 'left' ? 0 : 180))
            const guard = scene.time.addEvent({ delay: 16, loop: true, callback: () => {
              if (!dagger.active) { guard.remove(false); return }
              if (dagger.x < left - 48 || dagger.x > right + 48) { try { dagger.destroy() } catch {}; guard.remove(false) }
            } })
          })
        }
      }

      for (let i = 0; i < waves; i++) {
        scene.time.delayedCall(i * waveInterval, () => {
          // pick directions for this wave: ensure at least 1, up to 3
          const dirs: Array<'top'|'left'|'right'> = []
          if (Phaser.Math.Between(0,1)) dirs.push('top')
          if (Phaser.Math.Between(0,1)) dirs.push('left')
          if (Phaser.Math.Between(0,1)) dirs.push('right')
          if (dirs.length === 0) dirs.push('top')
          // split daggers among chosen directions
          let count = Math.min(perWave, total - spawned)
          const baseEach = Math.max(1, Math.floor(count / dirs.length))
          let rem = count - baseEach * dirs.length
          dirs.forEach((d) => {
            const c = baseEach + (rem-- > 0 ? 1 : 0)
            for (let k = 0; k < c; k++) spawnDagger(d)
          })
        })
      }

      // Safety end
      scene.time.delayedCall(waves * waveInterval + 4000, () => { if (!ended) { ended = true; scene.endEnemyAttack() } })
      return
    }

    const areaX = x, areaY = y
    const hitHBase = Math.max(12, Math.floor(height * 0.12))
    const hitH = Math.max(12, Math.floor(hitHBase * 1.25)) // a bit chunkier than goblin lanes
    const marginY = Math.max(6, Math.floor(height * 0.05))
    const minCY = areaY + marginY + hitH / 2
    const maxCY = areaY + height - marginY - hitH / 2
    const centers = [
      Phaser.Math.Clamp(areaY + height * 0.22, minCY, maxCY),
      Phaser.Math.Clamp(areaY + height * 0.38, minCY, maxCY),
      Phaser.Math.Clamp(areaY + height * 0.54, minCY, maxCY),
      Phaser.Math.Clamp(areaY + height * 0.70, minCY, maxCY),
      Phaser.Math.Clamp(areaY + height * 0.86, minCY, maxCY)
    ]
    const hitWBase = Math.max(8, Math.floor(width * 0.02))
    const hitW = Math.max(8, Math.floor(hitWBase * 1.2))
    const reactionDelay = 360
    const sweepDuration = Math.max(1000, 1400 - Math.floor(width * 0.04))
    const pairs = 8 // 8 pairs = 16 total
    // Interval between pairs (ms). Increased by +130ms per request.
    const interval = 370 + 130 // => 500ms
    const leftEdge = areaX - hitW - 50
    const rightEdge = areaX + width + 50

    let spawned = 0
    let active = 0
    let ended = false
    const maybeFinish = () => { if (!ended && spawned >= pairs * 2 && active <= 0) { ended = true; try { scene.endEnemyAttack() } catch (e) {} } }

    const launchSlash = (cy: number, fromLeft: boolean) => {
      const teleX = fromLeft ? areaX + 24 : (areaX + width - 24 - hitW)
      // Telegraph lane with two-layer pulse in king color
      const glowColor = (this as any).attackColor ?? 0xff66aa
      const tele = scene.add.rectangle(teleX, cy - hitH / 2, hitW, hitH, 0xff4444, 0.25).setOrigin(0)
      const glow = scene.add.rectangle(teleX, cy - hitH / 2, hitW, hitH, glowColor, 0.18).setOrigin(0)
      scene.tweens.add({ targets: tele, alpha: { from: 0.25, to: 0.85 }, duration: 260, yoyo: true, repeat: 1 })

      scene.time.delayedCall(reactionDelay, () => {
        try { tele.destroy(); glow.destroy() } catch {}
        const startX = fromLeft ? leftEdge : rightEdge
        const endX = fromLeft ? rightEdge : leftEdge
        const arc = scene.add.image(startX, cy, 'slash').setOrigin(0.1, 0.5)
        arc.setScale(1.0)
        arc.setAngle(fromLeft ? 0 : 180)
        try { arc.setBlendMode(Phaser.BlendModes.ADD) } catch {}
        // Invisible hurt body
        const hurt = scene.add.rectangle(startX, cy, hitW, hitH, 0xff0000, 0).setOrigin(0.5, 0.5)
        scene.physics.add.existing(hurt)
        const body = hurt.body as Phaser.Physics.Arcade.Body
        body.setSize(hitW, hitH, true)
        body.setImmovable(true)
        spawned++; active++
        try { (hurt as any).once('destroy', () => { active--; try { arc.destroy() } catch {}; maybeFinish() }) } catch {}
        // overlap (redundant safety; main group overlap already exists)
        try { scene.physics.add.overlap(scene.playerBox, hurt as any, () => {
          if (typeof scene.applyDamage === 'function') scene.applyDamage(5, 'slash')
          else { scene.playerHP -= 5; scene.showDamageText(scene.playerBox, 5, '#ff4444'); scene.playSfx('slash') }
          const fx = scene.add.circle(scene.playerBox.x, scene.playerBox.y, 18, 0xff8888, 0.9)
          scene.tweens.add({ targets: fx, alpha: 0, duration: 300, onComplete: () => fx.destroy() })
        }, undefined, scene) } catch {}
        // Move arc and hurt body across
        scene.tweens.add({ targets: [arc, hurt], x: endX, duration: sweepDuration, onComplete: () => { try { hurt.destroy() } catch {}; try { arc.destroy() } catch {} } })
      })
    }

    for (let i = 0; i < pairs; i++) {
      scene.time.delayedCall(i * interval, () => {
        // choose two distinct lanes
        const i1 = Phaser.Math.Between(0, centers.length - 1)
        let i2 = Phaser.Math.Between(0, centers.length - 1)
        let guard = 0
        while (i2 === i1 && guard++ < 10) i2 = Phaser.Math.Between(0, centers.length - 1)
        const cy1 = centers[i1]
        const cy2 = centers[i2]
        // random sides per slash
        const s1 = Phaser.Math.Between(0, 1) === 0
        const s2 = Phaser.Math.Between(0, 1) === 0
        launchSlash(cy1, s1)
        launchSlash(cy2, s2)
      })
    }

    const total = (pairs - 1) * interval + reactionDelay + sweepDuration + 400
    try { scene.time.delayedCall(total, () => { if (!ended) { ended = true; scene.endEnemyAttack() } }) } catch {}
  }
}
