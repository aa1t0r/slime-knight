import Phaser from 'phaser'

export default class TempleScene extends Phaser.Scene {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private blessed: boolean = false

  constructor() {
    super('Temple')
  }

  create() {
    // Temple interior - stone/holy colors
    this.add.rectangle(400, 300, 800, 600, 0x5a5a5a)
    this.add.text(250, 40, 'The Holy Temple', { fontSize: '28px', color: '#ffff99', fontStyle: 'bold' })
    
    // Altar
    this.add.rectangle(400, 140, 100, 120, 0xffd700)
    this.add.rectangle(400, 135, 90, 110, 0xffed4e)
    this.add.text(350, 110, 'Holy Altar', { fontSize: '14px', color: '#000000', fontStyle: 'bold' })
    
    // Candles
    this.add.circle(280, 180, 12, 0xffaa00)
    this.add.circle(520, 180, 12, 0xffaa00)
    
    this.add.text(50, 310, 'Priest: "May the gods bless your journey, brave one..."', { fontSize: '13px', color: '#ffffff', fontStyle: 'italic' })
    this.add.text(50, 345, '• Press P to receive a blessing  +1 ATK, +1 DEF', { fontSize: '12px', color: '#ffdd00' })
    this.add.text(50, 365, '• A blessing can only be received once per visit', { fontSize: '11px', color: '#ffcc88' })
    
    this.add.text(50, 520, '[ Press E to exit ]', { fontSize: '12px', color: '#00ff00', fontStyle: 'bold' })

    this.keys = this.input.keyboard!.addKeys({
      pray: Phaser.Input.Keyboard.KeyCodes.P,
      interact: Phaser.Input.Keyboard.KeyCodes.E
    }) as Record<string, Phaser.Input.Keyboard.Key>
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.pray)) {
      if (!this.blessed) {
        this.add.text(260, 430, '✓ You feel blessed! Power flows through you!', { 
          fontSize: '13px', 
          color: '#ffff00', 
          fontStyle: 'bold' 
        })
        this.blessed = true
      }
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this.scene.start('Town')
    }
  }
}
