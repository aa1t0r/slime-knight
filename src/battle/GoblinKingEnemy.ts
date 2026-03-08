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
    const interval = 520 + 250 + 100 // base 520ms +0.25s (prior) +0.1s more => 870ms
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
