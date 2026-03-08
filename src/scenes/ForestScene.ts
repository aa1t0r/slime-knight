import Phaser from 'phaser'

export default class ForestScene extends Phaser.Scene {
  constructor() {
    super('Forest')
  }

  create() {
    // Forest scene setup
    this.add.text(50, 50, 'Forest', { fontSize: '32px', color: '#00ff00' })
  }

  update() {
    // Forest scene update
  }
}
