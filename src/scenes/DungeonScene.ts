import Phaser from 'phaser'

export default class DungeonScene extends Phaser.Scene {
  constructor() {
    super('Dungeon')
  }

  create() {
    // Dungeon scene setup
    this.add.text(50, 50, 'Dungeon', { fontSize: '32px', color: '#ff0000' })
  }

  update() {
    // Dungeon scene update
  }
}
