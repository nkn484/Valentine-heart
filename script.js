var canvas = document.getElementById("canvas");
var messageEl = document.getElementById("storyMessage");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var gl = canvas.getContext("webgl");
if (!gl) {
  throw new Error("Unable to initialize WebGL.");
}

var time = 0.0;

var storyPages = [
  {
    message: "Valentine này, chúc em luôn ngập tràn yêu thương và hạnh phúc",
    showHeart: false,
    speed: 0.0,
    final: false,
  },
  {
    message: "Giữa những ngày xuân đang gõ cửa, anh hi mong rằng trái tim của 2 đứa sẽ luôn ấm áp và rực cháy",
    showHeart: true,
    speed: -0.35,
    final: false,
  },
  {
    message: "Cảm ơn vì em đã đến và làm những ngày bình thường của anh trở nên đáng nhớ hơn",
    showHeart: true,
    speed: -0.9,
    final: false,
  },
  {
    message: "Nhờ có em mà anh thấy mình cũng muốn cố gắng tốt hơn mỗi ngày",
    showHeart: true,
    speed: -1.5,
    final: false,
  },
  {
    message: "Chúc em luôn vui, luôn rạng rỡ và được yêu thương theo cách em xứng đáng. Anh yêu em nhiều lắm",
    showHeart: true,
    speed: 0.0,
    final: true,
  },
];

var currentPage = 0;

var vertexSource = `
attribute vec2 position;
void main() {
 gl_Position = vec4(position, 0.0, 1.0);
}
`;

var fragmentSource = `
precision highp float;

uniform float width;
uniform float height;
uniform float time;
uniform float speed;
uniform float heartOpacity;
uniform float fullHeart;

#define POINT_COUNT 8
#define FULL_POINT_COUNT 120

vec2 points[POINT_COUNT];
const float len = 0.25;
float intensity = 1.3;
float radius = 0.008;

float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C){    
 vec2 a = B - A;
 vec2 b = A - 2.0*B + C;
 vec2 c = a * 2.0;
 vec2 d = A - pos;

 float kk = 1.0 / dot(b,b);
 float kx = kk * dot(a,b);
 float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
 float kz = kk * dot(d,a);      

 float res = 0.0;

 float p = ky - kx*kx;
 float p3 = p*p*p;
 float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
 float h = q*q + 4.0*p3;

 if(h >= 0.0){ 
  h = sqrt(h);
  vec2 x = (vec2(h, -h) - q) / 2.0;
  vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
  float t = uv.x + uv.y - kx;
  t = clamp( t, 0.0, 1.0 );

  vec2 qos = d + (c + b*t)*t;
  res = length(qos);
 }else{
  float z = sqrt(-p);
  float v = acos( q/(p*z*2.0) ) / 3.0;
  float m = cos(v);
  float n = sin(v)*1.732050808;
  vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
  t = clamp( t, 0.0, 1.0 );

  vec2 qos = d + (c + b*t.x)*t.x;
  float dis = dot(qos,qos);
        
  res = dis;

  qos = d + (c + b*t.y)*t.y;
  dis = dot(qos,qos);
  res = min(res,dis);
  
  qos = d + (c + b*t.z)*t.z;
  dis = dot(qos,qos);
  res = min(res,dis);

  res = sqrt( res );
 }
    
 return res;
}

vec2 getHeartPosition(float t){
 return vec2(16.0 * sin(t) * sin(t) * sin(t),
       -(13.0 * cos(t) - 5.0 * cos(2.0*t)
       - 2.0 * cos(3.0*t) - cos(4.0*t)));
}

float getGlow(float dist, float radius, float intensity){
 float safeDist = max(dist, 0.00001);
 return pow(radius/safeDist, intensity);
}

float getSegment(float t, vec2 pos, float offset, float scale){
 for(int i = 0; i < POINT_COUNT; i++){
  points[i] = getHeartPosition(offset + float(i)*len + fract(speed * t) * 6.28318530718);
 }
    
 vec2 c = (points[0] + points[1]) / 2.0;
 vec2 c_prev;
 float dist = 10000.0;
    
 for(int i = 0; i < POINT_COUNT-1; i++){
  c_prev = c;
  c = (points[i] + points[i+1]) / 2.0;
  dist = min(dist, sdBezier(pos, scale * c_prev, scale * points[i], scale * c));
 }
 return max(0.0, dist);
}

float sdLineSegment(vec2 pos, vec2 a, vec2 b){
 vec2 pa = pos - a;
 vec2 ba = b - a;
 float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
 return length(pa - ba * h);
}

float getFullHeartDist(vec2 pos, float scale){
 float dist = 10000.0;
 vec2 prev = scale * getHeartPosition(0.0);

 for(int i = 1; i <= FULL_POINT_COUNT; i++){
  float t = 6.28318530718 * float(i) / float(FULL_POINT_COUNT);
  vec2 curr = scale * getHeartPosition(t);
  dist = min(dist, sdLineSegment(pos, prev, curr));
  prev = curr;
 }

 return max(0.0, dist);
}

void main(){
 vec2 resolution = vec2(width, height);
 vec2 uv = gl_FragCoord.xy/resolution.xy;
 float widthHeightRatio = resolution.x/resolution.y;
 vec2 centre = vec2(0.5, 0.5);
 vec2 pos = centre - uv;
 pos.y /= widthHeightRatio;
 pos.y += 0.02;
 float scale = 0.0000192 * height;
 scale *= mix(1.0, 1.12, fullHeart);
 
 float t = time;
  
 vec3 col = vec3(0.0);
 
 if(fullHeart > 0.5){
  float dist = getFullHeartDist(pos, scale);
  float glow = getGlow(dist, radius * 1.35, intensity + 0.35);
  vec3 pink = vec3(1.0, 0.05, 0.3);
  vec3 blue = vec3(0.1, 0.4, 1.0);
  float mixWave = 0.5 + 0.5 * sin(t * 1.45);
  mixWave = smoothstep(0.0, 1.0, mixWave);
  vec3 shiftColor = mix(pink, blue, mixWave);
  vec3 shiftColorSoft = mix(blue, pink, mixWave);
  col += 12.0 * vec3(smoothstep(0.0035, 0.0012, dist));
  col += glow * shiftColor;
  col += 0.45 * glow * shiftColorSoft;
 }else{
  float dist = getSegment(t, pos, 0.0, scale);
  float glow = getGlow(dist, radius, intensity);
  col += 10.0 * vec3(smoothstep(0.003, 0.001, dist));
  col += glow * vec3(1.0, 0.05, 0.3);
  
  dist = getSegment(t, pos, 3.4, scale);
  glow = getGlow(dist, radius, intensity);
  col += 10.0 * vec3(smoothstep(0.003, 0.001, dist));
  col += glow * vec3(0.1, 0.4, 1.0);
 }
        
 col = 1.0 - exp(-col);
 col = pow(col, vec3(0.4545));
 col *= heartOpacity;

 gl_FragColor = vec4(col,1.0);
}
`;

function onWindowResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(widthHandle, window.innerWidth);
  gl.uniform1f(heightHandle, window.innerHeight);
  fitMessageText();
}

function compileShader(shaderSource, shaderType) {
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error("Shader compile failed with: " + gl.getShaderInfoLog(shader));
  }
  return shader;
}

function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
    throw new Error("Cannot find attribute " + name + ".");
  }
  return attributeLocation;
}

function getUniformLocation(program, name) {
  var uniformLocation = gl.getUniformLocation(program, name);
  if (uniformLocation === -1 || uniformLocation === null) {
    throw new Error("Cannot find uniform " + name + ".");
  }
  return uniformLocation;
}

var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error("Program link failed: " + gl.getProgramInfoLog(program));
}

gl.useProgram(program);

var vertexData = new Float32Array([-1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0]);
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

var positionHandle = getAttribLocation(program, "position");
gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, false, 2 * 4, 0);

var timeHandle = getUniformLocation(program, "time");
var widthHandle = getUniformLocation(program, "width");
var heightHandle = getUniformLocation(program, "height");
var speedHandle = getUniformLocation(program, "speed");
var heartOpacityHandle = getUniformLocation(program, "heartOpacity");
var fullHeartHandle = getUniformLocation(program, "fullHeart");

gl.uniform1f(widthHandle, window.innerWidth);
gl.uniform1f(heightHandle, window.innerHeight);

function fitMessageText() {
  var page = storyPages[currentPage];
  var startPx = page.final ? Math.min(window.innerWidth * 0.04, 52) : Math.min(window.innerWidth * 0.048, 58);
  var minPx = page.final ? 14 : 16;
  var sizePx = startPx;
  var guard = 0;

  messageEl.style.fontSize = sizePx + "px";
  while (
    guard < 80 &&
    (messageEl.scrollWidth > messageEl.clientWidth || messageEl.scrollHeight > messageEl.clientHeight) &&
    sizePx > minPx
  ) {
    sizePx -= 1;
    messageEl.style.fontSize = sizePx + "px";
    guard += 1;
  }
}

function applyPage(pageIndex) {
  var page = storyPages[pageIndex];
  messageEl.textContent = page.message;
  messageEl.classList.toggle("final", page.final);
  gl.uniform1f(speedHandle, page.speed);
  gl.uniform1f(heartOpacityHandle, page.showHeart ? 1.0 : 0.0);
  gl.uniform1f(fullHeartHandle, page.final ? 1.0 : 0.0);
  fitMessageText();
}

function nextPage(event) {
  if (event.target && event.target.closest && event.target.closest(".MDJAmin")) {
    return;
  }
  if (currentPage < storyPages.length - 1) {
    currentPage += 1;
    applyPage(currentPage);
  }
}

window.addEventListener("resize", onWindowResize, false);
window.addEventListener("click", nextPage, false);

applyPage(currentPage);

var lastFrame = Date.now();
var thisFrame;

function draw() {
  thisFrame = Date.now();
  time += (thisFrame - lastFrame) / 1000;
  lastFrame = thisFrame;

  gl.uniform1f(timeHandle, time);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

draw();
