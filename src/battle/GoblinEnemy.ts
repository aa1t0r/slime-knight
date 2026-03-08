import Phaser from 'phaser'
import Enemy from './Enemy'
import * as Actions from './Actions'

export default class GoblinEnemy extends Enemy {
  constructor(opts: { name?: string; hp?: number }) {
    super({ name: opts.name ?? 'Goblin', hp: opts.hp ?? 18, type: 'goblin' })
  }

  performAttack(battleScene: any, x: number, y: number, width: number, height: number) {
    // Implement goblin attacks here so behavior is owned by the enemy class.
    const choice = Phaser.Math.Between(0, 1)
    try {
      switch (choice) {
        case 0:
          this.throwDaggers(battleScene, x, y, width, height)
          break
        case 1:
          this.slash(battleScene, x, y, width, height)
          break
      }
    } catch (e) {
      console.error('GoblinEnemy.performAttack error', e)
      if (battleScene && typeof battleScene.runGoblinAttackSequence === 'function') {
        battleScene.runGoblinAttackSequence({ name: this.name, hp: this.hp, type: this.type })
      }
    }
  }

  private throwDaggers(scene: any, x: number, y: number, width: number, height: number) {
    // Top-down dagger rain: spawn daggers above the dodge area and drop them with staggered delays
    scene.bullets = scene.bullets || (Actions.createBulletGroup(scene) as any)
    Actions.addOverlapPlayer(scene, scene.bullets)
    const count = 18
    const span = Math.max(120, width - 80)
    const left = x + 40
    let started = 0
    let active = 0
    let ended = false
    const maybeFinish = () => {
      if (!ended && started >= count && active <= 0) { ended = true; try { scene.endEnemyAttack() } catch (e) {} }
    }
    for (let i = 0; i < count; i++) {
      const bx = Phaser.Math.Between(x + 24, x + width - 24)
      const initialY = y - Phaser.Math.Between(140, 220)
      const dagger = scene.physics.add.image(bx, initialY, 'dagger').setOrigin(0.5)
      // make dagger larger for readability
      try { dagger.setDisplaySize(48, 112) } catch (e) { dagger.setScale(2.8) }
      dagger.setData('damage', 2)
      dagger.body.setAllowGravity(false)
      // rectangular hitbox aligned to the blade for consistent overlaps
      try {
        // make the dagger hitbox narrower and shorter to match the blade shape
        const bw = Math.max(14, Math.floor(dagger.displayWidth * 0.5))
        const bh = Math.max(20, Math.floor(dagger.displayHeight * 0.6))
        const body = dagger.body as Phaser.Physics.Arcade.Body
        body.setSize(bw, bh)
        // offset the hitbox slightly toward the blade tip for more realistic collisions
        const offX = Math.floor((dagger.displayWidth - bw) / 2)
        const offY = Math.floor((dagger.displayHeight - bh) / 2) + Math.floor(dagger.displayHeight * 0.08)
        body.setOffset(offX, offY)
      } catch (e) {}
      dagger.setVelocity(0, 0)
      dagger.setDepth(12)
      // Randomize start time (0-5s), then telegraph and drop after +0.4s
      const jitterMs = Phaser.Math.Between(0, 3500)
      scene.time.delayedCall(jitterMs, () => {
        if (!dagger.active) return
        const teleColor = (this as any).attackColor ?? 0xffff33
        Actions.showGroundMarker(scene, bx, y + height - 8, 12, teleColor, 700)
        const fallDelay = 400
        scene.time.delayedCall(fallDelay, () => {
          if (!dagger.active) return
          // add to shared bullets group now that it is active
          try { scene.bullets.add(dagger) } catch (e) {}
          // per-dagger overlap as extra safety
          try { scene.physics.add.overlap(scene.playerBox, dagger, (a: any, b: any) => scene.onPlayerHit(a, b), undefined, scene) } catch (e) {}
          started++
          active++
          try { (dagger as any).once('destroy', () => { active--; maybeFinish() }) } catch (e) {}
          const guard = scene.time.addEvent({ delay: 16, loop: true, callback: () => {
            if (!dagger.active) { guard.remove(false); return }
            if (dagger.y > y + height + 24) { try { dagger.destroy() } catch (e) {}; guard.remove(false) }
          } })
          const vx = Phaser.Math.Between(-30, 30)
          // Later daggers fall faster with easing, capped for readability
          const t = Phaser.Math.Clamp(jitterMs / 3500, 0, 1)
          const eased = Phaser.Math.Easing.Quadratic.Out(t)
          const baseVy = Phaser.Math.Linear(520, 820, eased)
          const vy = Math.min(840, Math.floor(baseVy + Phaser.Math.Between(-20, 20)))
          dagger.setVelocity(vx, vy)
          // make dagger face downwards during fall
          dagger.setRotation(Phaser.Math.DegToRad(90 + Phaser.Math.Between(-4, 4)))
        })
      })
    }
    // Short fallback timer in case something fails to clean up
    try { scene.time.delayedCall(7800, () => { if (!ended) { ended = true; scene.endEnemyAttack() } }) } catch (e) {}
  }

  private slash(scene: any, x: number, y: number, width: number, height: number) {
    scene.bullets = scene.bullets || (Actions.createBulletGroup(scene) as any)
    Actions.addOverlapPlayer(scene, scene.bullets)

    // Curved slash sweeps across the dodge area with a visible arc sprite
    const areaX = x, areaY = y
    // Hitbox height (lane) scaled up by 1.25x per request
    const hitHBase = Math.max(12, Math.floor(height * 0.12))
    const hitH = Math.max(12, Math.floor(hitHBase * 1.25))
    const marginY = Math.max(6, Math.floor(height * 0.05))
    const minCY = areaY + marginY + hitH / 2
    const maxCY = areaY + height - marginY - hitH / 2
    // four lanes including a lower one close to the bottom; all clamped into the dodge area
    const centers = [
      Phaser.Math.Clamp(areaY + height * 0.25, minCY, maxCY),
      Phaser.Math.Clamp(areaY + height * 0.45, minCY, maxCY),
      Phaser.Math.Clamp(areaY + height * 0.65, minCY, maxCY),
      Phaser.Math.Clamp(areaY + height * 0.85, minCY, maxCY)
    ]
    // Hurt width scaled up by 1.25x per request
    const hitWBase = Math.max(8, Math.floor(width * 0.018))
    const hitW = Math.max(8, Math.floor(hitWBase * 1.25))
    const spawnInterval = 650
    const reactionDelay = 380
    const sweepDuration = Math.max(1000, 1500 - Math.floor(width * 0.05))

    const count = 8
    let spawned = 0
    let activeSlash = 0
    let ended = false
    const maybeFinish = () => { if (!ended && spawned >= count && activeSlash <= 0) { ended = true; try { scene.endEnemyAttack() } catch (e) {} } }

    for (let i = 0; i < count; i++) {
      const cy = centers[i % centers.length]
      const fromLeft = Phaser.Math.Between(0, 1) === 0
      const teleX = fromLeft ? areaX + 24 : (areaX + width - 24 - hitW)
      scene.time.delayedCall(i * spawnInterval, () => {
        // Telegraph lane with subtle pulse
        const tele = scene.add.rectangle(teleX, cy - hitH / 2, hitW, hitH, 0xff4444, 0.22).setOrigin(0)
        const glowColor = (this as any).attackColor ?? 0xffaa33
        const glow = scene.add.rectangle(teleX, cy - hitH / 2, hitW, hitH, glowColor, 0.12).setOrigin(0)
        scene.tweens.add({ targets: tele, alpha: { from: 0.25, to: 0.8 }, duration: 300, yoyo: true, repeat: 2 })

        scene.time.delayedCall(reactionDelay, () => {
          try { tele.destroy(); glow.destroy() } catch (e) {}
          const startX = fromLeft ? (areaX - hitW - 50) : (areaX + width + 50)
          const endX = fromLeft ? (areaX + width + 50) : (areaX - hitW - 50)
          // Visual arc sprite (rotated to face direction)
          const arc = scene.add.image(startX, cy, 'slash').setOrigin(0.1, 0.5)
          arc.setScale(0.9)
          arc.setAngle(fromLeft ? 0 : 180)
          try { arc.setBlendMode(Phaser.BlendModes.ADD) } catch (e) {}
          // Invisible hit body following the arc center
          const hurt = scene.add.rectangle(startX, cy, hitW, hitH, 0xff0000, 0).setOrigin(0.5, 0.5)
          scene.physics.add.existing(hurt)
          const body = hurt.body as Phaser.Physics.Arcade.Body
          body.setSize(hitW, hitH, true)
          body.setImmovable(true)
          spawned++; activeSlash++
          try { (hurt as any).once('destroy', () => { activeSlash--; try { arc.destroy() } catch (e) {}; maybeFinish() }) } catch (e) {}
          scene.physics.add.overlap(scene.playerBox, hurt as any, () => {
            if (typeof scene.applyDamage === 'function') scene.applyDamage(4, 'slash')
            else { scene.playerHP -= 4; scene.showDamageText(scene.playerBox, 4, '#ff4444'); scene.playSfx('slash') }
            const fx = scene.add.circle(scene.playerBox.x, scene.playerBox.y, 18, 0xff8888, 0.9)
            scene.tweens.add({ targets: fx, alpha: 0, duration: 300, onComplete: () => fx.destroy() })
          }, undefined, scene)

          // Motion tween for both arc and hurt box
          scene.tweens.add({ targets: [arc, hurt], x: endX, duration: sweepDuration, onComplete: () => { try { hurt.destroy() } catch (e) {}; try { arc.destroy() } catch (e) {} } })
        })
      })
    }

    const total = (count - 1) * spawnInterval + reactionDelay + sweepDuration + 300
    try { scene.time.delayedCall(total, () => { if (!ended) { ended = true; scene.endEnemyAttack() } }) } catch (e) {}
  }

  // Bomb attack removed for this enemy to keep the first foe simple
}
