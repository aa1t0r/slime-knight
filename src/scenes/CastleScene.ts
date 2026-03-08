import Phaser from 'phaser'

export default class CastleScene extends Phaser.Scene {
  constructor() {
    super('Castle')
  }

  create() {
    // Castle scene setup
    this.add.text(50, 50, 'Castle', { fontSize: '32px', color: '#cccccc' })
  }

  update() {
    // Castle scene update
  }
}
