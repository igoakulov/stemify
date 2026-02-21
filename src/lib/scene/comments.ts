/**
 * Formats single-line scene object calls into multi-line format
 * Example: scene.addLabel({ id: "x", text: "y" })
 * Becomes:
 * scene.addLabel({
 *   id: "x",
 *   text: "y"
 * })
 */
function format_single_line_object(code: string): string {
  const methodPattern = /^(\s*)(scene\.\w+)\s*\(\s*\{/;
  const methodMatch = code.match(methodPattern);

  if (!methodMatch) {
    return code;
  }

  const [, indent, methodCall] = methodMatch;

  const openParenIndex = code.indexOf("(");
  const openBraceIndex = code.indexOf("{", openParenIndex);

  if (openBraceIndex === -1) {
    return code;
  }

  let braceDepth = 1;
  let closeBraceIndex = -1;
  let inString = false;
  let stringChar = "";

  for (let i = openBraceIndex + 1; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : "";

    if (!inString && (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
    } else if (!inString) {
      if (char === "{") {
        braceDepth++;
      } else if (char === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          closeBraceIndex = i;
          break;
        }
      }
    }
  }

  if (closeBraceIndex === -1) {
    return code;
  }

  const propsContent = code.slice(openBraceIndex + 1, closeBraceIndex);
  if (propsContent.includes("\n")) {
    return code;
  }

  const afterBrace = code.slice(closeBraceIndex + 1).trim();
  const semicolon = afterBrace.startsWith(");") ? ";" : "";

  const props: string[] = [];
  let currentProp = "";
  let propBraceDepth = 0;
  let propInString = false;
  let propStringChar = "";

  for (let i = 0; i < propsContent.length; i++) {
    const char = propsContent[i];
    const prevChar = i > 0 ? propsContent[i - 1] : "";

    if (!propInString && (char === '"' || char === "'" || char === "`")) {
      propInString = true;
      propStringChar = char;
      currentProp += char;
    } else if (propInString && char === propStringChar && prevChar !== "\\") {
      propInString = false;
      currentProp += char;
    } else if (!propInString) {
      if (char === "{") {
        propBraceDepth++;
        currentProp += char;
      } else if (char === "}") {
        propBraceDepth--;
        currentProp += char;
      } else if (char === "," && propBraceDepth === 0) {
        const trimmed = currentProp.trim();
        if (trimmed) {
          props.push(trimmed);
        }
        currentProp = "";
      } else {
        currentProp += char;
      }
    } else {
      currentProp += char;
    }
  }

  const trimmed = currentProp.trim();
  if (trimmed) {
    props.push(trimmed);
  }

  if (props.length <= 1) {
    return code;
  }

  const propIndent = indent + "  ";
  const formattedProps = props.map((p) => `${propIndent}${p},`).join("\n");

  return `${indent}${methodCall}({\n${formattedProps}\n${indent}})${semicolon}`;
}

/**
 * Formats scene code (multi-line formatting only, no comments)
 * Used after successful validation to keep code readable
 */
export function format_scene_code(code: string): string {
  const lines = code.split("\n");
  const formattedLines = lines.map((line) => format_single_line_object(line));
  return formattedLines.join("\n");
}

const DOCS_MARKER = `// ===========================
//        HOW TO STEMIFY
// ===========================`;

const STEMIFY_INTRO = `// 1. ASK assistant about a subject
// 2. Tell him to BUILD an interactive scene
// 3. Click on objects in the scene
// 4. Change their position, size, color...
// 5. Customize using DOCS below`;

const STEMIFY_DOCS = `// ===========================
//         USING DOCS
// ===========================

// 1. Add shapes with scene.addX() methods
// 2. Add settings with scene.setX() methods
// 3. Copy, paste above "HOW TO STEMIFY",
// 4. Uncomment (remove starting "//")
// 5. Change parameters + add optional

// ===========================
//           SHAPES
// ===========================

// Optional parameters shared by most shapes:
//   color: "#E6E8EB", // "red", HEX, RGB
//   opacity: 1, // number
//   direction: [0,0,1], // xyz
//   rotation: 0, // number (degrees)
//   shift: [0,0,0], // xyz, offset from position
//   selectable: true, // true/false
// ---------------------------
//   EXCEPTIONS:
// * opacity: NOT addPoint, addCustomMesh
// * direction, rotation: NOT addPoint
// ---------------------------
//   HINTS:
// * direction: from origin, shape would face this point
// * groups: move, turn or annotate shapes as one
// * clever use: 3+ points, 0 radii, cuts give new shapes
// ---------------------------
// scene.addPoint({
//   id: "point", // required, text
//   center: [0,0,0], //
// })
// ---------------------------
// scene.addLine({
//   id: "line", //
//   points: [[0,0,0],[1,1,1]], // can add 3+
//   thickness: 0, // optional, number
//   arrow: "none", // optional, "none"|"start"|"end"|"both"
// })
// Example: straight, wavy (3+ points) vector, tube
//
// Example for curve (circle) with sin/cos formula:
// scene.addLine({
//   points: {
//     x: "Math.cos(t)", // finds x from t
//     y: "Math.sin(t)", // finds x from t
//     z: "0", // constant in this example
//     tSteps: 50 // takes 50 t values in range
//     tMin: 0, // lower limit for t
//     tMax: 6.28, // upper limit for t
//   },
// });
// ---------------------------
// scene.addPoly2D({
//   id: "polygon", //
//   points: [
//     [0,0,0], // required, [[x,y,z],...]
//     [1,0,0],
//     [0,1,0]],
// }),
// Example: triangle, rectangle, polygon, flat floor
// ---------------------------
// scene.addCircle({
//   id: "circle", //
//   center: [0,0,0], // optional, xyz
//   radius: 1, // required, number
//   anglecut: [0,360], // optional, number
//   stretch: [1,1,1], // optional, xyz
//   opacity: 1, // optional, number, 0=outline only
// }),
// Example: disc, ring, pie slice, ellipse
// ---------------------------
// scene.addSphere({
//   id: "sphere", //
//   center: [0,0,0], // optional, xyz
//   radius: 1, // required, number
//   anglecut: [0,360], // optional, number
//   flatcut: [0,360], // optional, number
//   stretch: [1,1,1], // optional, xyz
// }),
// Example: ball, planet, dome, ellipsoid
// ---------------------------
// scene.addCylinder({
//   id: "cylinder", //
//   points: [[0,0,0],[0,1,0]], // can add 3+
//   radius: [1,1], // required, number per point
//   anglecut: [0,360], // optional, number
// }),
// Example: pipe, cone (one radius=0), multi-section e.g. hourglass (3+ points)
// ---------------------------
// scene.addPoly3D({
//   id: "poly3d", //
//   points: [
//     [0,0,0],
//     [1,0,0],
//     [0,1,0]],
// }), // required, [[x,y,z],...]
// Example: cube, pyramid, prism, crystal
// ---------------------------
// scene.addDonut({
//   id: "donut", //
//   center: [0,0,0], // optional, xyz
//   radius: 1, // required, number
//   thickness: 0.5, // required, number
//   anglecut: [0,360], // optional, number
// }),
// Example: ring, tire, orbit, rainbow
// ---------------------------
// scene.addCustomMesh({
//   id: "mesh", //
//   createFn: "new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color: 0xE6E8EB}))",
// }),
// Example: complex shapes (human, robot), use three.js

// ===========================
//         INFORMATION
// ===========================

// scene.addLabel({
//   id: "label", // required, string
//   text: "Label", // required, string
//   position: [0,0,0], // required, xyz
//   color: "#E6E8EB", // optional, string
//   fontSizePx: 16, // optional, number
//   selectable: true, // optional, true/false
// }),
// ---------------------------
// scene.addTooltip({
//   id: "another_object_id", // required
//   title: "Specification", // required, string
//   properties: [
//     {label: "Mass", value: "2kg"},
//     {label: "Velocity", value: "5m/s"}
//   ],  // can also be just ["text"]
// }),

// ===========================
//         COMPOSITION
// ===========================

// scene.addGroup({
//   id: "house", // required, string
//   children: ["roof", "wall"],
//   direction: [0,0,1], // optional, xyz
//   rotation: 0, // optional, number
//   selectable: true,
// }),
// Example: combinations (pendulum, house, spacecraft - shift/direction/rotation apply to entire group)
// ---------------------------
// scene.addAnimation({
//   id: "animation", // required, string
//   updateFunction: "scene.getObject('object').rotation.y = elapsed;", // required, string, use 'elapsed' time
// }),

// ===========================
//           SCENE
// ===========================

// scene.addAxes({
//   id: "axes", // optional, string
//   x: [-5,5], // optional, [start,end]
//   y: [-5,5], // optional, [start,end]
//   z: [-5,5], // optional, [start,end]
//   length: 5, // optional, number
//   position: [0,0,0], // optional, xyz
//   selectable: false, //
// }),
// ---------------------------
// scene.setGrid(0.5) // round values, snap to grid
// ---------------------------
// scene.setSmoothness(64) // round object smoothness, 64 (fastest) | 128 (balanced) | 256 (smoothest)`;

export function append_docs(code: string): string {
  const trimmed = code.trimEnd();
  const stripped = strip_docs(trimmed);
  return `${stripped}\n\n${DOCS_MARKER}\n\n${STEMIFY_INTRO}\n\n${STEMIFY_DOCS}`;
}

export function strip_docs(code: string): string {
  const markerIndex = code.indexOf(DOCS_MARKER);
  if (markerIndex === -1) return code;
  return code.slice(0, markerIndex).trimEnd();
}

export function get_docs_marker(): string {
  return DOCS_MARKER;
}
