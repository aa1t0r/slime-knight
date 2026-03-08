import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload() {
    // pass-through boot; heavy assets/textures are generated in PreloadScene
  }

  create() {
    // go to Preload where runtime placeholder assets and tiles are created
    this.scene.start('Preload')
  }
}
