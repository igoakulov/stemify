// Source of truth for scene API: used for Monaco autocomplete and LLM system prompts.

export const sceneApiDeclaration = `declare const scene: {
  /**
   * Builds: small dot
   * @param config.id - Unique name (required to click or group)
   * @param config.position - Where to place, default: [0, 0, 0]
   * @param config.offset - Shift from position, default: [0, 0, 0]
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.selectable - Can click to see parameters, default: true
   */
  point(config: { id: "dot"; position?: [0,0,0]; offset?: [0,0,0]; color?: "brown" | "blue" | "#FFCA28"; selectable?: true }): void;

  /**
   * Builds: line, tube, wave, zig-zag, arrow, vector
   * @param config.id - Unique name (required to click or group)
   * @param config.points - Points it goes through in exact order (required)
   * @param config.thickness - 0 = thin line, >0 = tube thickness, default: 0
   * @param config.tension - 0 = most relaxed, 0,5 = normal smooth, 1 = perfectly straight, default: 1
   * @param config.arrow - "none" | "start" | "end" | "both", default: "none"
   * @param config.offset - Shift entire line, default: [0, 0, 0]
   * @param config.lookat - Where front side faces, default: [0, 0, 1] (toward you)
   * @param config.spin - Spin around "lookat" axis, default: 0 degrees
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.selectable - Can click to see parameters, default: true
   */
  line(config: { id: "line"; points: [[0,0,0], [1,1,0], [4,1,0]]; thickness?: 0 | 1; tension?: 1; arrow?: "none" | "start" | "end" | "both"; offset?: [0,0,0]; lookat?: [0,0,1]; spin?: 90; color?: "brown" | "blue" | "#FFCA28"; selectable?: true }): void;

  /**
   * Builds: continuous curve from formula - x(t), y(t), z(t)
   * @param config.id - Unique name (required to click or group)
   * @param config.tMin - Start value for t, number or formula (e.g., "-Math.PI")
   * @param config.tMax - End value for t, number or formula (e.g., "Math.PI * 2")
   * @param config.x - X position formula using t (required)
   * @param config.y - Y position formula using t (required)
   * @param config.z - Z position formula using t, default: 0
   * @param config.steps - How smooth/accurate it is, default: 64
   * @param config.thickness - 0 = thin line, >0 = tube, default: 0
   * @param config.arrow - "none" | "start" | "end" | "both", default: "none"
   * @param config.offset - Shift entire curve, default: [0, 0, 0]
   * @param config.lookat - Where front side faces, default: [0, 0, 1]
   * @param config.spin - Spin around "lookat" axis, default: 0 degrees
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.selectable - Can click to see parameters, default: true
   */
  curve(config: { id: "sine_wave"; tMin: 1; tMax: "Math.PI * 10"; x: "Math.sin(t)"; y: "2 * t"; z?: 0 | "t"; steps?: 64; thickness?: 0 | 1; arrow?: "none" | "start" | "end" | "both"; offset?: [0,0,0]; lookat?: [0,0,1]; spin?: 90; color?: "brown" | "blue" | "#FFCA28"; selectable?: true }): void;

  /**
   * Builds: 2D shapes like triangle, rectangle, polygon
   * @param config.id - Unique name (required to click or group)
   * @param config.points - Points it goes through in strict order (required)
   * @param config.position - Where to place its center, default: [0, 0, 0]
   * @param config.offset - Shift from position, default: [0, 0, 0]
   * @param config.lookat - Where front side faces, default: [0, 0, 1] (toward you)
   * @param config.spin - Spin around "lookat" axis, default: 0 degrees
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.opacity - How transparent: 1 = solid, 0 = invisible, default: 1
   * @param config.selectable - Can click to see parameters, default: true
   */
  poly2(config: { id: "triangle"; points: [[0,0], [1,0], [0,1]]; position?: [0,0,0]; offset?: [0,0,0]; lookat?: [0,0,1]; spin?: 90; color?: "brown" | "blue" | "#FFCA28"; opacity?: 1; selectable?: true }): void;

  /**
   * Builds: circle, disk, ellipse, ring, sector, arc
   * @param config.id - Unique name (required to click or group)
   * @param config.radius - Size of the circle, default: 1
   * @param config.position - Where to place, default: [0, 0, 0]
   * @param config.offset - Shift from position, default: [0, 0, 0]
   * @param config.lookat - Where front side faces, default: [0, 0, 1] (toward you)
   * @param config.spin - Spin around "lookat" axis, default: 0 degrees
   * @param config.stretch - Stretch sides, default: [1, 1, 1]
   * @param config.anglecut - Cut around center: length (angle) or [start, length] in degrees, starts at +X (3 o'clock), counter-clockwise
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.outline - Ring outline thickness (0 = no outline)
   * @param config.opacity - How transparent (0-1), 1=fill, 0=use with outline
   * @param config.selectable - Can click to see parameters, default: true
   */
  circle(config: { id: "wheel"; radius?: 1; position?: [0,0,0]; offset?: [0,0,0]; lookat?: [0,0,1]; spin?: 90; stretch?: [1,1,1]; anglecut?: 180 | [90,180]; color?: "brown" | "blue" | "#FFCA28"; outline?: 0; opacity?: 1; selectable?: true }): void;

  /**
   * Builds: sphere, ball, ellipsoid, dome
   * @param config.id - Unique name (required to click or group)
   * @param config.radius - required
   * @param config.position - Where to place, default: [0, 0, 0]
   * @param config.offset - Shift from position, default: [0, 0, 0]
   * @param config.lookat - Where front side faces, default: [0, 0, 1] (toward you)
   * @param config.spin - Spin around poles, default: 0 degrees
   * @param config.stretch - Stretch sides, default: [1, 1, 1]
   * @param config.flatcut - Cut off from top: angle degrees or [start, length], 90 = dome
   * @param config.anglecut - Cut around poles: length (angle) or [start, length] in degrees, starts at +X (3 o'clock), counter-clockwise
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.opacity - How transparent, default: 1
   * @param config.selectable - Can click to see parameters, default: true
   */
  sphere(config: { id: "planet"; radius: 2; position?: [2,2,0]; offset?: [1,1,1]; lookat?: [0,1,0]; spin?: 90; stretch?: [2,1,1]; flatcut?: 90 | [45,90]; anglecut?: 180 | [90,180]; color?: "brown" | "blue" | "#FFCA28"; opacity?: 1; selectable?: true }): void;

  /**
   * Builds: cylinder, cone, stacked cylinders (2+ sections)
   * @param config.id - Unique name (required to click or group)
   * @param config.height - Height of each section: [1,2,…], default: 1
   * @param config.radius - Radius at [bottom, …, top], default: 1
   * @param config.position - Where to place its center, default: [0, 0, 0]
   * @param config.offset - Shift from position, default: [0, 0, 0]
   * @param config.lookat - Where top faces, default: [0, 1, 0] (up)
   * @param config.spin - Spin around bottom->top axis, default: 0 degrees
   * @param config.anglecut - Cut around bottom->top axis: length (angle) or [start, length] in degrees, starts at +X (3 o'clock), counter-clockwise
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.opacity - How transparent, default: 1
   * @param config.selectable - Can click to see parameters, default: true
   */
  cylinder(config: { id: "tower"; height?: 1 | [1,0.5]; radius?: 1 | [1,0.5]; position?: [0,0,0]; offset?: [0,0,0]; lookat?: [0,1,0]; spin?: 90; anglecut?: 180 | [90,180]; color?: "brown" | "blue" | "#FFCA28"; opacity?: 1; selectable?: true }): void;

  /**
   * Builds: 3D shapes like cube, pyramid, prism (always convex, bulges outwards)
   * @param config.id - Unique name (required to click or group)
   * @param config.points - Points that form convex shape, no strict order (required)
   * @param config.position - Where to place its center, default calculated from points
   * @param config.offset - Shift from position, default: [0, 0, 0]
   * @param config.lookat - Where front side faces, default: [0, 0, 1]
   * @param config.spin - Spin around "lookat" axis, default: 0 degrees
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.opacity - How transparent, default: 1
   * @param config.selectable - Can click to see parameters, default: true
   */
  poly3(config: { id: "pyramid"; points: [[0,0,-2], [2,0,-2], [0,0,0], [2,0,0], [1,1.5,-1]]; position?: [0,0,0]; offset?: [0,0,0]; lookat?: [0,0,1]; spin?: 90; color?: "brown" | "blue" | "#FFCA28"; opacity?: 1; selectable?: true }): void;

  /**
   * Builds: donut (torus), thick ring, curved tube
   * @param config.id - Unique name (required to click or group)
   * @param config.radius - Size of the ring, required
   * @param config.thickness - How thick the tube is, required
   * @param config.position - Where to place, default: [0, 0, 0]
   * @param config.offset - Shift from position, default: [0, 0, 0]
   * @param config.lookat - Where hole faces, default: [0, 0, 1] (toward you)
   * @param config.spin - Spin around "lookat" axis, default: 0 degrees
   * @param config.anglecut - Cut around center: length (angle) or [start, length] in degrees, starts at +X (3 o'clock), counter-clockwise
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.opacity - How transparent, default: 1
   * @param config.selectable - Can click to see parameters, default: true
   */
  donut(config: { id: "saturn_rings"; radius: 2; thickness: 0.3; position?: [0,0,0]; offset?: [0,0,0]; lookat?: [0,0,1]; spin?: 90; anglecut?: 180 | [90,180]; color?: "brown" | "blue" | "#FFCA28"; opacity?: 1; selectable?: true }): void;

  /**
   * Builds: X/Y/Z coordinate axes (X=red, Y=green, Z=blue)
   * @param config.id - Unique name, default: "axes"
   * @param config.x - X axis range: [start, end]
   * @param config.y - Y axis range: [start, end]
   * @param config.z - Z axis range: [start, end]
   * @param config.position - Where axes start, default: [0, 0, 0]
   * @param config.selectable - Should be false for axes, default: false
   */
  axes(config?: { id?: "axes"; x?: [0,5]; y?: [0,5]; z?: [0,5]; position?: [0,0,0]; selectable?: false }): void;

  /**
   * Builds: floating text in the scene
   * @param config.id - Unique name (required to click or group)
   * @param config.text - "Text label" or math expression inside "$...$" (required)
   * @param config.position - Where to place, default: [0, 0, 0]
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.fontSizePx - Text size in pixels, default: 16
   * @param config.selectable - Can click to see parameters, default: true
   */
  label(config: { id: "label"; text: "hypothenuse" | "a=5" | "$x^2$"; position?: [0,0,0]; color?: "brown" | "blue" | "#FFCA28"; fontSizePx?: 16; selectable?: true }): void;

  /**
   * Groups shapes so they move together (add below shapes!)
   * @param config.id - Unique name (required to click or group)
   * @param config.children - IDs of shapes to group, required
   * @param config.offset - Shift entire group, default: [0, 0, 0]
   * @param config.lookat - Where group faces, default: [0, 0, 1]
   * @param config.spin - Spin around "lookat" axis, default: 0 degrees
   * @param config.selectable - Can click to see parameters, default: true
   */
  group(config: { id: "pendulum"; children: ["ball", "rope"]; offset?: [0,0,0]; lookat?: [0,0,1]; spin?: 90; selectable?: true }): void;

  /**
   * Animates shapes over time (may slow down the scene!)
   * @param config.id - Unique name (required to click or group)
   * @param config.updateFunction - Code that runs every frame, use 'elapsed' for time (required)
   */
  animation(config: { id: "roll"; updateFunction: "(elapsed) => { /* code */ }" }): void;

  /**
   * Builds: any complex shape using THREE.js code (advanced)
   * @param config.id - Unique name (required to click or group)
   * @param config.createFn - JavaScript code that returns a THREE.js mesh (required)
   * @param config.position - Where to place, default: [0, 0, 0]
   * @param config.offset - Shift from position, default: [0, 0, 0]
   * @param config.lookat - Where front side faces, default: [0, 0, 1]
   * @param config.spin - Spin around "lookat" axis, default: 0 degrees
   * @param config.color - Example: "brown", "blue", "#FFCA28"
   * @param config.selectable - Can click to see parameters, default: true
   */
  mesh(config: { id: "robot"; createFn: "() => new THREE.Mesh(geometry, material)"; position?: [0,0,0]; offset?: [0,0,0]; lookat?: [0,0,1]; spin?: 90; color?: "brown" | "blue" | "#FFCA28"; selectable?: true }): void;

  /**
   * Builds: info popup when user clicks a shape
   * @param config.id - ID of shape for this tooltip (required)
   * @param config.title - required
   * @param config.properties - just "text" or table {label: "Mass", value: "20g"}
   */
  tooltip(config: { id: "target_shape"; title: "Plain text info" | "Mass"; properties?: [{ label: "Mass", value: "20g" }] }): void;

  /**
   * Rounds all positions when you snap to grid
   * @param config.size - Grid size to snap to, default: 0.5
   */
  grid(config: 0.1 | 0.5 | 1): void;

  /**
   * Controls smoothness of round surfaces
   * @param config.segments - faster vs smoother
   */
  smoothness(config: 32 | 64 | 128): void;

  /**
   * Controls where camera starts
   * @param config.position - Where the camera is
   * @param config.lookat - What the camera looks at
   */
  camera(config: { position?: [0,3,6]; lookat?: [0,0,0] }): void;
};`;
