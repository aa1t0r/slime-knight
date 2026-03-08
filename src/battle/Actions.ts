import Phaser from 'phaser'

export function createBulletGroup(scene: Phaser.Scene) {
  const group = scene.physics.add.group()
  return group
}

export function addOverlapPlayer(scene: any, group: Phaser.Physics.Arcade.Group) {
  if (scene.playerBox) {
    if (scene.bulletsCollider) {
      try { scene.physics.world.removeCollider(scene.bulletsCollider) } catch (e) {}
    }
    scene.bulletsCollider = scene.physics.add.overlap(scene.playerBox, group, (a: any, b: any) => scene.onPlayerHit(a, b), undefined, scene)
  }
}

export function showGroundMarker(scene: Phaser.Scene, x: number, y: number, radius = 12, color = 0xffff33, lifeMs = 1200) {
  const mark = scene.add.circle(x, y, radius, color, 0.35)
  // keep markers behind bullets by setting a low depth
  try { (mark as any).setDepth(2) } catch (e) {}
  scene.tweens.add({ targets: mark, alpha: { from: 0.15, to: 0.7 }, scale: { from: 1, to: 1.3 }, duration: 300, yoyo: true, repeat: Math.max(0, Math.floor(lifeMs / 300)) })
  scene.time.delayedCall(lifeMs, () => { try { mark.destroy() } catch (e) {} })
  return mark
}

export function playTone(scene: Phaser.Scene, freq: number, duration = 0.12, vol = 0.12) {
  try {
    const sm: any = scene.sound
    const ctx = sm.context
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    osc.frequency.value = freq
    osc.type = 'sine'
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch (e) {}
}
