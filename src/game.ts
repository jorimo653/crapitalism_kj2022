import "phaser";
import planets from "./assets/images/kenney_planets/Planets/*.png";
import ships from "./assets/images/kenney_spaceshooterextension/PNG/Sprites/Ships/*.png";
import { Position } from "./types";
import GameConfig = Phaser.Types.Core.GameConfig;

export default class Game extends Phaser.Scene {
  private width: number;
  private height: number;
  private screenCenter: Position;

  // @ts-ignore
  private homeWorld: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private planetScaleFactor: number;

  // @ts-ignore
  private ship: SpriteWithDynamicBody;
  private shipScaleFactor: number;

  constructor() {
    super("game");
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.screenCenter = { x: window.innerWidth, y: window.innerHeight };

    this.planetScaleFactor = 0.1;
    this.shipScaleFactor = 0.5;
  }

  init() {}

  preload() {
    // load assets here
    this.load.image("homeWorld", planets.planet00);

    this.load.image("ship", ships.spaceShips_005);
  }

  create() {
    //  add to top-level game object
    const { x, y } = this.screenCenter;
    this.homeWorld = this.physics.add.sprite(x / 2, y / 2, "homeWorld");

    this.homeWorld.setScale(this.planetScaleFactor);

    this.ship = this.physics.add.sprite(x - 200, y - 200, "ship");
    this.ship.setScale(this.shipScaleFactor);
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
