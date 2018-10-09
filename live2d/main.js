// Live2D模型声明
live2DModel = null; /* Live2DModel类型对象 */
// 模型初始化完毕则值为 true
var initLive2DCompleted = false;
// 模型加载完毕则值为 true
var loadLive2DCompleted = false;
// 贴图所需的image对象
var loadedImages = []; /* Image类型数组 */
// Live2D 模型的设置
var modelDef = {
    "type" : "Live2D Model Setting",
    "name" : "big whale",
    "model" : "live2d/big whale/184.moc",
    "textures" : [
        "live2d/big whale/textures/0.png",
    ]
};
// 用于停止动画
var requestID;
 
 
window.onload = function() {
    main();
};
 
 
/**
 * 最初执行的函数
 */
function main() {
    "use strict";
 
    // 初始化Canvas
    var canvas = initCanvas("glcanvas");
     
    // 初始化WebGL
    var gl = initWebGL(canvas);
     
    // 初始化Live2D
    initLive2D(canvas, gl);
}
 
 
/**
 * Live2D初始化和贴图的准备
 */
function initLive2D(canvas, gl) {
    "use strict";
     
    // Live2D初始化
    Live2D.init(); 
 
    // 从moc文件读取Live2D模型对象
    loadBytes(modelDef.model, function(buf){
        live2DModel = Live2DModelWebGL.loadModel(buf);
    });
 
    // 读取贴图
    var loadCount = 0;
    for(var i = 0; i < modelDef.textures.length; i++){
        // 把i值累加至tno（用在 onerror）
        (function (tno){
            loadedImages[tno] = new Image();
            loadedImages[tno].src = modelDef.textures[tno];
            loadedImages[tno].onload = function(){
                if((++loadCount) == modelDef.textures.length) {
                    loadLive2DCompleted = true; //全部读取完毕
                }
            }
            loadedImages[tno].onerror = function() { 
                console.error("Failed to load image : " +
                              modelDef.textures[tno]); 
            }
        })(i);
    }
 
    //------------ 绘图循环 ------------
    (function tick() {
        draw(gl); // 绘制一次
         
        var requestAnimationFrame = 
            window.requestAnimationFrame || 
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame || 
            window.msRequestAnimationFrame;
        // 一段时间后调用自己
        requestID = requestAnimationFrame(tick ,canvas); 
    })();
}
 
 
/**
 * 获得Canvas对象，添加事件
 */
function initCanvas(id/*string*/) {
    "use strict";
 
    // 获得canvas对象
    var canvas = document.getElementById(id);
 
    // 丢失上下文时
    // https://www.khronos.org/webgl/wiki/HandlingContextLost
    canvas.addEventListener("webglcontextlost", function(e) {
        console.error("webglcontext lost");
        loadLive2DCompleted = false;
        initLive2DCompleted = false;
         
        var cancelAnimationFrame = 
            window.cancelAnimationFrame || 
            window.mozCancelAnimationFrame;
        cancelAnimationFrame(requestID); //停止动画
         
        e.preventDefault(); 
    }, false);
     
    // 上下文恢复时
    canvas.addEventListener("webglcontextrestored", function(e){
        console.error("webglcontext restored");
        var gl = initWebGL(canvas);
        initLive2D(canvas, gl);
    }, false);
     
    return canvas;
}
 
 
/**
 * 获得WebGL对象，初始化
 */
function initWebGL(canvas/*Canvas Object*/) {
    "use strict";
     
    // 获得WebGL上下文
    var gl = getWebGLContext(canvas);
    if(!gl) {
        console.error("Failed to create WebGL context.");
        return;
    }
 
    // 清空绘制区域
    gl.clearColor( 0.0, 0.0, 0.0, 0.0 );
     
    return gl;
}
 
 
/**
*
  对模型分配贴图、矩阵，进行更新和绘制
*/
function draw(gl)
{
    "use strict";
 
    // 清空Canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
     
    if(!live2DModel || !loadLive2DCompleted) {
        return; //尚未加载完毕，直接返回
    }
     
    // 加载完毕后，仅在第一次进行初始化
    if(!initLive2DCompleted) {
        initLive2DCompleted = true;
 
        // 从图像生成WebGL贴图，添加到模型中
        for(var i = 0; i < loadedImages.length; i++){
            // 从Image类型对象生成贴图
            var texName = createTexture(gl, loadedImages[i]);
            //把贴图添加到模型中
            live2DModel.setTexture(i, texName); 
        }
 
        // 清空贴图原文件的引用
        loadedImages = null;
 
        // 设置WebGL上下文
        live2DModel.setGL(gl);
 
        // 定义数组，用于存放模型位置
        // canvas宽度设置在-1..1区间
        var s = 2.0 / live2DModel.getCanvasWidth();
        var matrix4x4 = [s, 0, 0, 0,
                         0, -s, 0, 0,
                         0, 0, 1, 0,
                         -1, 1, 0, 1];
        live2DModel.setMatrix(matrix4x4);
    }
     
    // 更新Live2D模型，绘制
    live2DModel.update(); // 根据此时的参数，计算出顶点等值
    live2DModel.draw(); // 绘制
};
 
 
/**
* 获得WebGL上下文
*/
function getWebGLContext(canvas) {
    "use strict";
 
    var NAMES = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
     
    for( var i = 0; i < NAMES.length; i++ ){
        try{
            var ctx = canvas.getContext(NAMES[i]);
            if( ctx ) return ctx;
        } 
        catch(e){
            console.error(e);
        }
    }
     
    return null;
};
 
 
/**
* 从Image对象生成贴图
*/
function createTexture(gl/*WebGL*/, image/*Image*/) {
    "use strict";
     
    //创建贴图对象
    var texture = gl.createTexture();
     
    if(!texture) {
        console.error("Failed to generate gl texture name.");
        return -1;
    }
 
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  //上下反转
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
     
    return texture;
};
 
 
/**
* 以byte数组形式加载文件
*/
function loadBytes(path, callback) {
    "use strict";
 
    var request = new XMLHttpRequest();
     
    request.open("GET", path, true);
    request.responseType = "arraybuffer";
    request.onload = function() {
        switch(request.status) {
        case 200:
            callback(request.response);
            break;
        default:
            console.error("Failed to load (" + 
                          request.status + ") : " + path);
            break;
        }
    }
    request.send(null);
     
    return request;
};