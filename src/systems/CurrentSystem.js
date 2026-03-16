export class CurrentSystem {

  getForce(x, y, time) {

    const strength = 0.03;

    return {
      x: Math.cos(time + y * 0.01) * strength,
      y: Math.sin(time + x * 0.01) * strength
    };

  }

}