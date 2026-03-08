import Phaser from 'phaser'

export default class ShopScene extends Phaser.Scene {
  private keys!: Record<string, Phaser.Input.Keyboard.Key>

  constructor() {
    super('Shop')
  }

  create() {
    // Shop interior - golden/warm colors
    this.add.rectangle(400, 300, 800, 600, 0xd4af37)
    this.add.text(280, 40, 'The General Store', { fontSize: '28px', color: '#000000', fontStyle: 'bold' })
    
    // Shelves with items
    this.add.rectangle(150, 180, 100, 160, 0x8b6914)
    this.add.text(110, 155, 'Potions', { fontSize: '14px', color: '#ffff00', fontStyle: 'bold' })
    this.add.circle(150, 240, 15, 0xff0000)
    this.add.text(130, 260, '50 Gold', { fontSize: '10px', color: '#000000' })
    
    this.add.rectangle(400, 180, 100, 160, 0x8b6914)
    this.add.text(365, 155, 'Weapons', { fontSize: '14px', color: '#ffff00', fontStyle: 'bold' })
    this.add.rectangle(400, 240, 30, 40, 0xc0c0c0)
    this.add.text(375, 285, '100 Gold', { fontSize: '10px', color: '#000000' })
    
    this.add.rectangle(650, 180, 100, 160, 0x8b6914)
    this.add.text(620, 155, 'Armor', { fontSize: '14px', color: '#ffff00', fontStyle: 'bold' })
    this.add.rectangle(650, 240, 40, 50, 0x808080)
    this.add.text(625, 295, '150 Gold', { fontSize: '10px', color: '#000000' })
    
    // Shopkeeper
    this.add.text(50, 380, 'Merchant: "Fine wares for the adventurous!"', { fontSize: '13px', color: '#000000', fontStyle: 'bold' })
    this.add.text(50, 410, '(Items coming soon! Check back later.)', { fontSize: '11px', color: '#666666', fontStyle: 'italic' })
    
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
