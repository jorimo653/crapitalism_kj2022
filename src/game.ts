import "phaser";
import planets from "./assets/images/kenney_planets/Planets/*.png";
import GameConfig = Phaser.Types.Core.GameConfig;

export default class Game extends Phaser.Scene {
  private width: number;
  private height: number;
  private sceneId = "game";

  constructor() {
    super(game);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  init() {}

  preload() {
    // load assets here
    this.load.image("homeWorld", planets.planet00);
  }

  create() {
    //  add to top-level game object
    this.physics.add.sprite(this.width / 2, this.height / 2, "homeWorld");
  }
}

const config: GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#125555",
  width: window.innerWidth,
  height: window.innerHeight,
  scene: Game,
  physics: {
    default: "arcade",
    arcade: {
      // gravity: 0
    },
  },
};

const game = new Phaser.Game(config);
