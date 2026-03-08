import Phaser from 'phaser'

export default class TavernScene extends Phaser.Scene {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>

  constructor() {
    super('Tavern')
  }

  create() {
    // Tavern interior - warm brown/orange colors with wooden feel
    this.add.rectangle(400, 300, 800, 600, 0x654321)
    this.add.text(250, 40, 'The Tavern', { fontSize: '28px', color: '#ffff00', fontStyle: 'bold' })
    
    // Bar counter
    this.add.rectangle(400, 140, 350, 60, 0x3d2817)
    this.add.text(250, 120, 'Tavern Keeper', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' })
    
    // Beer mugs as decoration
    this.add.circle(320, 160, 8, 0xffaa00)
    this.add.circle(340, 160, 8, 0xffaa00)
    this.add.circle(480, 160, 8, 0xffaa00)
    this.add.circle(500, 160, 8, 0xffaa00)
    
    // Tables
    this.add.rectangle(150, 320, 100, 100, 0x8b6914)
    this.add.rectangle(650, 320, 100, 100, 0x8b6914)
    
    // Information and gossip
    this.add.text(50, 280, '"Sit down, traveler! I have gossip to share..."', { fontSize: '13px', color: '#ffff00', fontStyle: 'italic' })
    this.add.text(50, 320, '• Monsters have been spotted in the forest!', { fontSize: '12px', color: '#ffdd00' })
    this.add.text(50, 345, '• A treasure lies hidden in the dungeon...', { fontSize: '12px', color: '#ffdd00' })
    this.add.text(50, 370, '• The castle is under guard by knights!', { fontSize: '12px', color: '#ffdd00' })
    
    this.add.text(50, 520, '[ Press E to exit ]', { fontSize: '12px', color: '#00ff00', fontStyle: 'bold' })

    this.keys = this.input.keyboard!.addKeys({
      interact: Phaser.Input.Keyboard.KeyCodes.E
    }) as Record<string, Phaser.Input.Keyboard.Key>
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this.scene.start('Town')
    }
  }
}
