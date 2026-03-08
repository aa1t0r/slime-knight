import Phaser from 'phaser'

export default class InnScene extends Phaser.Scene {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private restButton!: Phaser.GameObjects.Text
  private rested: boolean = false

  constructor() {
    super('Inn')
  }

  create() {
    // Inn interior - cozy warm tones
    this.add.rectangle(400, 300, 800, 600, 0xc85a54)
    this.add.text(300, 40, 'The Inn', { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' })
    
    // Beds
    this.add.rectangle(150, 200, 120, 90, 0xffcccc)
    this.add.rectangle(150, 200, 110, 80, 0xffaaaa)
    this.add.text(120, 210, 'Bed', { fontSize: '11px', color: '#000000' })
    
    this.add.rectangle(400, 200, 120, 90, 0xffcccc)
    this.add.rectangle(400, 200, 110, 80, 0xffaaaa)
    this.add.text(375, 210, 'Bed', { fontSize: '11px', color: '#000000' })
    
    this.add.rectangle(650, 200, 120, 90, 0xffcccc)
    this.add.rectangle(650, 200, 110, 80, 0xffaaaa)
    this.add.text(625, 210, 'Bed', { fontSize: '11px', color: '#000000' })
    
    this.add.text(50, 340, 'Innkeeper: "Rest and recover from your adventures!"', { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' })
    this.add.text(50, 370, '• Press R to rest (Restores full HP)', { fontSize: '12px', color: '#ffffaa' })
    this.add.text(50, 390, '• Cost: Free for heroes!', { fontSize: '11px', color: '#ffffaa' })
    
    this.add.text(50, 520, '[ Press E to exit ]', { fontSize: '12px', color: '#00ff00', fontStyle: 'bold' })

    this.keys = this.input.keyboard!.addKeys({
      rest: Phaser.Input.Keyboard.KeyCodes.R,
      interact: Phaser.Input.Keyboard.KeyCodes.E
    }) as Record<string, Phaser.Input.Keyboard.Key>
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.rest)) {
      if (!this.rested) {
        this.add.text(280, 450, '✓ You rest and feel refreshed!', { fontSize: '14px', color: '#00ff00', fontStyle: 'bold' })
        this.rested = true
        this.time.delayedCall(2000, () => {
          this.scene.start('Town')
        })
      }
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact) && !this.rested) {
      this.scene.start('Town')
    }
  }
}
