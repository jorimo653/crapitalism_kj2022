import "phaser";

export default class Game extends Phaser.Scene {
  private width: number;
  private height: number;

  constructor() {
    super("demo");
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  preload() {
    // load assets here
    this.load.image("homeWorld", "assets/images/kenney_planets/Planets/planet00.png");
  }

  create() {
    //  add to top-level game object
    this.add.image(this.width / 2, this.height / 2, "homeWorld");
  }
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: "#125555",
  width: window.innerWidth,
  height: window.innerHeight,
  scene: Game,
};

const game = new Phaser.Game(config);
