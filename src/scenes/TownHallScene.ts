import Phaser from 'phaser'

export default class TownHallScene extends Phaser.Scene {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>

  constructor() {
    super('TownHall')
  }

  create() {
    // Town Hall interior - official blue colors
    this.add.rectangle(400, 300, 800, 600, 0x4169e1)
    this.add.text(240, 40, 'Town Hall', { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' })
    
    // Mayor's desk
    this.add.rectangle(400, 130, 180, 90, 0x8b4513)
    this.add.text(330, 110, 'Mayor\'s Office', { fontSize: '14px', color: '#ffff00', fontStyle: 'bold' })
    
    // Town bulletin board
    this.add.rectangle(120, 320, 140, 180, 0xd4af37)
    this.add.text(70, 285, 'Quest Board', { fontSize: '13px', color: '#000000', fontStyle: 'bold' })
    this.add.text(65, 320, 'Available Quests:', { fontSize: '11px', color: '#000000', fontStyle: 'bold' })
    this.add.text(65, 345, '• Defeat Monsters', { fontSize: '10px', color: '#000000' })
    this.add.text(65, 365, '• Explore Dungeon', { fontSize: '10px', color: '#000000' })
    this.add.text(65, 385, '• Find Treasure', { fontSize: '10px', color: '#000000' })
    this.add.text(65, 405, 'Reward: 500 Gold', { fontSize: '10px', color: '#cc0000', fontStyle: 'bold' })
    
    // Mayor information
    this.add.text(50, 250, 'Mayor: "Thank you for protecting our town!"', { fontSize: '13px', color: '#ffffff', fontStyle: 'italic' })
    this.add.text(50, 520, '[ Press E to exit ]', { fontSize: '12px', color: '#00ff00', fontStyle: 'bold' })

    this.keys = this.input.keyboard!.addKeys({
      interact: Phaser.Input.Keyboard.KeyCodes.E
    }) as Record<string, Phaser.Input.Keyboard.Key>
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      // return to Town and indicate we came from the Town Hall so Town can position the player south of the hall
      this.scene.start('Town', { from: 'TownHall' })
    }
  }
}
