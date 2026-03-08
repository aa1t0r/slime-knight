import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import OverworldScene from './scenes/OverworldScene'
import PreloadScene from './scenes/PreloadScene'
import BattleScene from './scenes/BattleScene'
import UIScene from './scenes/UIScene'
import TownScene from './scenes/TownScene'
import GoblinCampScene from './scenes/GoblinCampScene'
import DungeonScene from './scenes/DungeonScene'
import ForestScene from './scenes/ForestScene'
import CastleScene from './scenes/CastleScene'
import TavernScene from './scenes/TavernScene'
import ShopScene from './scenes/ShopScene'
import InnScene from './scenes/InnScene'
import TempleScene from './scenes/TempleScene'
import TownHallScene from './scenes/TownHallScene'
import RuinsScene from './scenes/RuinsScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game',
  backgroundColor: '#222222',
  scene: [BootScene, PreloadScene, RuinsScene, OverworldScene, BattleScene, UIScene, TownScene, GoblinCampScene, DungeonScene, ForestScene, CastleScene, TavernScene, ShopScene, InnScene, TempleScene, TownHallScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } }
  }
}

window.addEventListener('load', () => {
  // eslint-disable-next-line no-new
  const game = new Phaser.Game(config)

  // ensure game scales when browser size changes
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight)
  })
})
