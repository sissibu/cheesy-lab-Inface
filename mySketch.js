let faceMesh;
let video;
let faces = []; 

// 定义全局变量来存储控制值
let text_size = 4;
let show_video = false;
let show_keypoint_numbers = true;
let show_keypoints = false;
let videoButton;
let maskColor = '#002AFF';
let colorPickerVisible = false;
let sizeSliderVisible = false;
let bgMusic;
let isMusicPlaying = false;
let touchSound;
let clickSound;
let isSoundEnabled = true;
let audioCtx;

// these options define specifics to ml5
let options = { maxFaces: 3, refineLandmarks: false, flipHorizontal: false };

// 在全局变量部分添加初始颜色的常量
const INITIAL_COLOR = '#002AFF';  // 初始的蓝色

// 添加风格选择器相关的变量和函数
let styleSelector;
let currentStyle = 'normal';

// 在全局变量部分添加
let blurShader;
let graphics;

// 在全局变量部分添加像素效果着色器
let pixelShader;
let pixelSize = 30;  // 更大的初始值
let pixelateShader;
let pixelateSize = 48;  // 更大的初始像素尺寸

// 添加风格选择器的着色器代码
const vertexShader = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
    gl_Position = positionVec4;
}
`;

// 修改模糊效果的着色器
const fragmentShader = `
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform vec2 resolution;
uniform float blurAmount;
uniform float time;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec4 color = vec4(0.0);
    float total = 0.0;
    float offset = blurAmount / 100.0;
    
    for(float x = -4.0; x <= 4.0; x++) {
        for(float y = -4.0; y <= 4.0; y++) {
            vec2 off = vec2(x, y) * offset;
            color += texture2D(tex0, vTexCoord + off);
            total += 1.0;
        }
    }
    
    color = color / total;
    
    // 添加幻彩效果
    vec3 hsv = rgb2hsv(color.rgb);
    hsv.x = fract(hsv.x + time * 0.0001);  // 缓慢改变色相
    hsv.y = min(hsv.y * 1.2, 1.0);  // 增加饱和度
    color.rgb = hsv2rgb(hsv);
    
    gl_FragColor = color;
}
`;

// 修改波普效果的着色器
const pixelFragmentShader = `
    precision mediump float;
    varying vec2 vTexCoord;
    uniform sampler2D tex0;
    uniform vec2 resolution;
    uniform float pixelSize;
    uniform float hueOffset;

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        vec2 uv = vTexCoord;
        
        // 计算像素网格
        float dx = pixelSize / resolution.x;
        float dy = dx;  // 使用相同的值确保正方形网格
        
        // 将坐标对齐到像素网格中心
        vec2 coord = vec2(
            dx * (floor(uv.x / dx) + 0.5),
            dy * (floor(uv.y / dy) + 0.5)
        );
        
        // 计算当前点到像素中心的距离
        float dist = length((uv - coord) * resolution.x / pixelSize);
        
        // 圆形遮罩
        float radius = 0.4;  // 圆形半径
        vec4 color;
        
        if (dist > radius) {
            // 在圆形外部显示白色背景
            color = vec4(1.0);
        } else {
            // 在圆形内部显示像素化的视频
            color = texture2D(tex0, coord);
            
            // 转换到 HSV 空间进行颜色增强
            vec3 hsv = rgb2hsv(color.rgb);
            
            // 应用色相偏移
            hsv.x = fract(hsv.x + hueOffset);
            
            // 大幅增加饱和度
            hsv.y = min(hsv.y * 4.0, 1.0);
            
            // 提高亮度
            hsv.z = pow(hsv.z, 0.4);
            
            // 转回 RGB
            color.rgb = hsv2rgb(hsv);
            
            // 额外的颜色增强
            color.rgb = pow(color.rgb, vec3(0.85));
            color.rgb *= 1.2;
            color.rgb = clamp(color.rgb, 0.0, 1.0);
        }
        
        gl_FragColor = color;
    }
`;

// 像素效果的着色器（立体乐高风格）
const pixelateFragmentShader = `
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform vec2 resolution;
uniform float pixelSize;

void main() {
    vec2 uv = vTexCoord;
    
    // 计算正方形像素网格
    float dx = pixelSize / resolution.x;
    float dy = dx;  // 保持正方形比例
    
    // 将坐标对齐到像素网格
    vec2 coord = vec2(
        dx * floor(uv.x / dx),
        dy * floor(uv.y / dy)
    );
    
    // 获取基础颜色
    vec4 baseColor = texture2D(tex0, coord + vec2(dx, dy) * 0.5);
    
    // 计算像素内的相对位置
    vec2 pixelPos = fract(vec2(uv.x / dx, uv.y / dy));
    
    // 创建立体效果
    vec3 finalColor = baseColor.rgb;
    
    // 顶面亮度
    float topLight = 1.2;
    // 右侧亮度
    float rightLight = 1.1;
    // 左侧阴影
    float leftShadow = 0.8;
    // 底部阴影
    float bottomShadow = 0.7;
    
    // 边缘大小
    float edge = 0.1;
    
    // 添加顶部高光
    if (pixelPos.y < edge) {
        finalColor *= topLight;
    }
    // 添加右侧高光
    else if (pixelPos.x > (1.0 - edge)) {
        finalColor *= rightLight;
    }
    // 添加左侧阴影
    else if (pixelPos.x < edge) {
        finalColor *= leftShadow;
    }
    // 添加底部阴影
    else if (pixelPos.y > (1.0 - edge)) {
        finalColor *= bottomShadow;
    }
    
    // 添加格子间隔
    float gap = 0.05;
    if (pixelPos.x < gap || pixelPos.x > (1.0 - gap) || 
        pixelPos.y < gap || pixelPos.y > (1.0 - gap)) {
        finalColor *= 0.5;
    }
    
    gl_FragColor = vec4(finalColor, baseColor.a);
}
`;

// 添加全局变量来控制模糊程度
let blurAmount = 0.5;

// 添加时间变量
let startTime;

// 在全局变量部分添加
let hueOffset = 0;  // 色相偏移量

function playClickSound() {
    if (isSoundEnabled && clickSound) {
        clickSound.play().catch(console.log);
    }
}

function preload() 
{
    // 隐藏 ml5 的默认加载文字
    document.addEventListener('DOMContentLoaded', () => {
        const loadingTexts = document.querySelectorAll('span');
        loadingTexts.forEach(text => {
            if (text.textContent.includes('Loading')) {
                text.style.display = 'none';
            }
        });
    });

    // Load the faceMesh model
    faceMesh = ml5.faceMesh(options);
}

function setup() 
{
    // 创建全屏画布并放入容器
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-canvas-container');
    
    // 先创建并启动视频
    video = createCapture(VIDEO, () => {
        // 在摄像头准备就绪后播放音乐
        bgMusic = document.getElementById('bgMusic');
        bgMusic.volume = 0.6;
        bgMusic.play().then(() => {
            isMusicPlaying = true;
            document.querySelector('.music-control').classList.remove('muted');
        }).catch(console.error);
    });
    video.size(640, 480);
    video.hide();
    
    // Start detecting faces from the webcam video
    faceMesh.detectStart(video, gotFaces);
    
    // 获取视频切换按钮
    videoButton = document.querySelector('.control-button');
    videoButton.addEventListener('click', updateButtonText);
    
    // 在模型和视频都准备好后隐藏 loading
    Promise.all([
        new Promise(resolve => {
            if (faceMesh) resolve();
        }),
        new Promise(resolve => {
            video.elt.addEventListener('loadeddata', resolve);
        })
    ]).then(() => {
        document.getElementById('loadingContainer').style.display = 'none';
    });

    // 初始化音效
    touchSound = document.getElementById('touchSound');
    clickSound = document.getElementById('clickSound');
    touchSound.volume = 0.6;
    clickSound.volume = 0.6;

    // 为所有按钮添加音效和悬停效果
    const buttons = document.querySelectorAll('.control-button, .music-control');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            if (isSoundEnabled) touchSound.play().catch(console.log);
            // 如果是控制按钮（不是音乐按钮），则应用面具颜色
            if (button.classList.contains('control-button')) {
                // 如果当前是白色，使用初始的蓝色
                const buttonColor = maskColor.toLowerCase() === '#ffffff' ? INITIAL_COLOR : maskColor;
                button.style.background = buttonColor + '33';
                button.style.borderColor = buttonColor;
                button.style.color = buttonColor;
            }
        });
        
        button.addEventListener('mouseleave', () => {
            // 恢复按钮原始样式，除非按钮处于激活状态
            if (button.classList.contains('control-button') && !button.classList.contains('active')) {
                button.style.background = 'rgba(0, 0, 0, 0.2)';
                button.style.borderColor = 'rgba(0, 0, 0, 0.3)';
                button.style.color = '#333';
            }
        });

        button.addEventListener('click', () => {
            if (isSoundEnabled) clickSound.play().catch(console.log);
        });
    });

    // 初始化着色器
    try {
        blurShader = createShader(vertexShader, fragmentShader);
        pixelShader = createShader(vertexShader, pixelFragmentShader);
        pixelateShader = createShader(vertexShader, pixelateFragmentShader);
        graphics = createGraphics(width, height, WEBGL);
        pixelateSize = 48;  // 确保初始值设置正确
    } catch (e) {
        console.log('Shader initialization failed:', e);
        blurShader = null;
        pixelShader = null;
        pixelateShader = null;
    }
    
    // 添加模糊滑块事件监听
    const blurSlider = document.getElementById('blurSlider');
    blurSlider.min = "0.1";
    blurSlider.max = "5";
    blurSlider.value = "0.5";
    blurSlider.step = "0.1";
    blurSlider.addEventListener('input', function() {
        blurAmount = parseFloat(this.value);
    });
    
    styleSelector = document.getElementById('styleSelector');
    setupStyleOptions();

    // 在 setup 中初始化时间
    startTime = millis();

    // 添加像素滑块事件监听
    const pixelSlider = document.getElementById('pixelSlider');
    pixelSlider.min = "20";
    pixelSlider.max = "80";
    pixelSlider.value = "30";
    pixelSlider.step = "5";
    pixelSlider.addEventListener('input', function() {
        pixelSize = parseFloat(this.value);
    });

    // 修改像素化滑块的范围
    const pixelateSlider = document.getElementById('pixelateSlider');
    pixelateSlider.min = "36";
    pixelateSlider.max = "96";
    pixelateSlider.value = "48";
    pixelateSlider.step = "2";
    pixelateSlider.addEventListener('input', function() {
        pixelateSize = parseFloat(this.value);
    });

    // 添加色相滑块事件监听
    const hueSlider = document.getElementById('hueSlider');
    if (hueSlider) {
        hueSlider.addEventListener('input', function() {
            hueOffset = parseFloat(this.value) / 100;
        });
    }

    // 添加版权信息位置的计算和更新
    function updateCopyrightPosition() {
        const canvasContainer = document.getElementById('p5-canvas-container');
        const containerRect = canvasContainer.getBoundingClientRect();
        const copyright = document.querySelector('.copyright');
        
        // 计算版权信息的位置：视频左边缘的一半
        const copyrightX = containerRect.left / 2 - copyright.offsetWidth / 2;
        
        // 设置版权信息位置，确保最小左边距为40px
        copyright.style.left = `${Math.max(40, copyrightX)}px`;
    }

    // 初始调用一次
    updateCopyrightPosition();

    // 在窗口大小改变时重新计算位置
    window.addEventListener('resize', updateCopyrightPosition);
}

// 当窗口大小改变时调整画布
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() 
{
    background(255);
    
    let scaleVal = min(width/video.width, height/video.height);
    let vidW = video.width * scaleVal;
    let vidH = video.height * scaleVal;
    let x = (width - vidW) / 2;
    let y = (height - vidH) / 2;
    
    push();
    translate(width, 0);
    scale(-1, 1);  // 保持主画布的水平翻转
    
    if (currentStyle === 'blur' && blurShader) {
        if (show_video) {
            try {
                graphics.clear();
                graphics.push();
                graphics.translate(width/2, height/2);
                graphics.scale(-1, -1);
                graphics.shader(blurShader);
                
                blurShader.setUniform('tex0', video);
                blurShader.setUniform('resolution', [width, height]);
                blurShader.setUniform('blurAmount', blurAmount);
                blurShader.setUniform('time', millis() - startTime);
                
                graphics.rect(-width/2, -height/2, width, height);
                graphics.pop();
                
                push();
                scale(1, -1);
                image(graphics, x, -y-vidH, vidW, vidH);
                pop();
            } catch (e) {
                console.log('Shader rendering failed:', e);
                image(video, x, y, vidW, vidH);
            }
        }
        
        if (faces.length > 0) {
            drawFacePoints(faces, x, y, vidW, vidH);
        }
    } else if (currentStyle === 'pixel' && pixelShader) {
        if (show_video) {
            try {
                graphics.clear();
                graphics.push();
                graphics.translate(width/2, height/2);
                graphics.scale(-1, -1);
                graphics.shader(pixelShader);
                
                pixelShader.setUniform('tex0', video);
                pixelShader.setUniform('resolution', [width, height]);
                pixelShader.setUniform('pixelSize', pixelSize);
                pixelShader.setUniform('hueOffset', hueOffset);  // 添加色相偏移参数
                pixelShader.setUniform('time', millis() - startTime);
                
                graphics.rect(-width/2, -height/2, width, height);
                graphics.pop();
                
                push();
                scale(1, -1);
                image(graphics, x, -y-vidH, vidW, vidH);
                pop();
            } catch (e) {
                console.log('Shader rendering failed:', e);
                image(video, x, y, vidW, vidH);
            }
        }
        
        if (faces.length > 0) {
            drawFacePoints(faces, x, y, vidW, vidH);
        }
    } else if (currentStyle === 'pixelate' && pixelateShader) {
        if (show_video) {
            try {
                graphics.clear();
                graphics.push();
                graphics.translate(width/2, height/2);
                graphics.scale(-1, -1);
                graphics.shader(pixelateShader);
                
                pixelateShader.setUniform('tex0', video);
                pixelateShader.setUniform('resolution', [width, height]);
                pixelateShader.setUniform('pixelSize', pixelateSize);
                
                graphics.rect(-width/2, -height/2, width, height);
                graphics.pop();
                
                push();
                scale(1, -1);
                image(graphics, x, -y-vidH, vidW, vidH);
                pop();
            } catch (e) {
                console.log('Shader rendering failed:', e);
                image(video, x, y, vidW, vidH);
            }
        }
        
        if (faces.length > 0) {
            drawFacePoints(faces, x, y, vidW, vidH);
        }
    } else {
        // 原有的绘制逻辑
        if(show_video) {
            image(video, x, y, vidW, vidH);
        }
        
        if (faces.length > 0) {
            drawFacePoints(faces, x, y, vidW, vidH);
        }
    }
    
    pop();
}

function gotFaces(results) 
{
    faces = results;
} 

function toggleVideo() {
    show_video = !show_video;
    updateButtonText();
}

function updateButtonText() {
    const zhText = videoButton.querySelector('.zh');
    const enText = videoButton.querySelector('.en');
    if (show_video) {
        zhText.textContent = '隐藏视频';
        enText.textContent = 'HIDE VIDEO';
    } else {
        zhText.textContent = '显示视频';
        enText.textContent = 'SHOW VIDEO';
    }
    videoButton.classList.toggle('active', show_video);
}

function toggleColorPicker() {
    colorPickerVisible = !colorPickerVisible;
    document.getElementById('colorPicker').classList.toggle('show');
    document.querySelector('button:nth-child(2)').classList.toggle('active');
}

function updateMaskColor(color) {
    maskColor = color;
    
    // 检查是否为白色
    const isWhite = color.toLowerCase() === '#ffffff';
    if (isWhite && !show_video) {
        // 如果是白色且视频未显示，则自动显示视频
        show_video = true;
        updateButtonText();
    }
    
    // 更新按钮悬停效果
    const hoveredButton = document.querySelector('.control-button:hover');
    if (hoveredButton) {
        // 如果是白色，使用初始的蓝色
        const buttonColor = isWhite ? INITIAL_COLOR : maskColor;
        hoveredButton.style.background = buttonColor + '33';
        hoveredButton.style.borderColor = buttonColor;
        hoveredButton.style.color = buttonColor;
    }
}

function toggleSizeSlider() {
    sizeSliderVisible = !sizeSliderVisible;
    document.getElementById('sizeSlider').classList.toggle('show');
    document.querySelector('button:nth-child(3)').classList.toggle('active');
}

function updateTextSize(size) {
    text_size = parseInt(size);
}

function toggleMusic() {
    const musicControl = document.querySelector('.music-control');
    if (isMusicPlaying) {
        bgMusic.pause();
        musicControl.classList.add('muted');
    } else {
        bgMusic.play();
        musicControl.classList.remove('muted');
    }
    isMusicPlaying = !isMusicPlaying;
}

// 添加风格选择器的控制函数
function toggleStyle() {
    playClickSound();
    
    const colorPicker = document.getElementById('colorPicker');
    const sizeSlider = document.getElementById('sizeSlider');
    const styleSelector = document.getElementById('styleSelector');
    
    // 隐藏其他控制面板
    colorPicker.classList.remove('show');
    sizeSlider.classList.remove('show');
    
    // 切换风格选择器的显示状态
    styleSelector.classList.toggle('show');
    
    // 自动显示视频
    if (!show_video) {
        show_video = true;
        updateButtonText();
    }
    
    // 更新按钮状态
    const styleButton = document.querySelector('button[onclick="toggleStyle()"]');
    styleButton.classList.toggle('active');
    
    // 移除其他按钮的激活状态
    document.querySelectorAll('.control-button').forEach(button => {
        if (button !== styleButton) {
            button.classList.remove('active');
        }
    });
}

// 设置风格选项的点击事件
function setupStyleOptions() {
    const styleOptions = document.querySelectorAll('.style-option');
    const blurControl = document.querySelector('.blur-control');
    const pixelControl = document.querySelector('.pixel-control');
    const pixelateControl = document.querySelector('.pixelate-control');
    
    styleOptions.forEach(option => {
        option.addEventListener('click', function() {
            playClickSound();
            
            const clickedStyle = this.getAttribute('data-style');
            
            // 隐藏所有控制面板
            blurControl.style.display = 'none';
            pixelControl.style.display = 'none';
            pixelateControl.style.display = 'none';
            
            // 如果点击的是模糊按钮
            if (clickedStyle === 'blur') {
                if (currentStyle === 'blur') {
                    currentStyle = 'normal';
                    this.classList.remove('active');
                } else {
                    currentStyle = 'blur';
                    styleOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    blurControl.style.display = 'block';
                }
            } 
            // 如果点击的是波普按钮
            else if (clickedStyle === 'pixel') {
                if (currentStyle === 'pixel') {
                    currentStyle = 'normal';
                    this.classList.remove('active');
                } else {
                    currentStyle = 'pixel';
                    styleOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    pixelControl.style.display = 'block';
                }
            }
            // 如果点击的是像素按钮
            else if (clickedStyle === 'pixelate') {
                if (currentStyle === 'pixelate') {
                    currentStyle = 'normal';
                    this.classList.remove('active');
                } else {
                    currentStyle = 'pixelate';
                    styleOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    pixelateControl.style.display = 'block';
                }
            }
            
            // 如果切换到任何效果时视频未显示，自动显示视频
            if (!show_video) {
                show_video = true;
                updateButtonText();
            }
        });
    });
}

// 应用不同的风格效果
function applyStyle(style) {
    switch(style) {
        case 'normal':
            // 恢复正常效果
            break;
            
        case 'blur':
            // 在 draw 函数中应用模糊效果
            if (faces.length > 0) {
                graphics.shader(blurShader);
                
                // 设置着色器uniforms
                blurShader.setUniform('tex0', video);
                blurShader.setUniform('resolution', [width, height]);
                blurShader.setUniform('blurAmount', blurAmount);
                
                // 绘制一个覆盖整个画面的矩形
                graphics.rect(0, 0, width, height);
                
                // 在主画布上绘制处理后的图像
                image(graphics, 0, 0, width, height);
            }
            break;
            
        case 'pixel':
            // 添加像素化效果
            break;
    }
}

// 添加一个辅助函数来绘制面部关键点
function drawFacePoints(faces, x, y, vidW, vidH) {
    // 计算每个人脸的大小并排序
    let facesWithSize = faces.map((face, originalIndex) => {
        // 计算人脸框的宽度作为距离参考
        let minX = Infinity, maxX = -Infinity;
        face.keypoints.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
        });
        let faceWidth = maxX - minX;
        return { face, faceWidth, originalIndex };
    });

    // 按人脸大小降序排序（最大的在前，即最近的在前）
    facesWithSize.sort((a, b) => b.faceWidth - a.faceWidth);

    // 只处理前三个最大的人脸
    facesWithSize.slice(0, 3).forEach((faceData, index) => {
        const face = faceData.face;
        for (let j = 0; j < face.keypoints.length; j++) {
            let keypoint = face.keypoints[j];
            let kx = map(keypoint.x, 0, video.width, x, x + vidW);
            let ky = map(keypoint.y, 0, video.height, y, y + vidH);
            
            strokeWeight(2);
            if (index === 0) {
                stroke(maskColor);
                fill(maskColor);
            } else {
                let alpha = 128 - (index * 32);  // 第二个人脸更透明，第三个人脸最透明
                stroke(red(maskColor), green(maskColor), blue(maskColor), alpha);
                fill(red(maskColor), green(maskColor), blue(maskColor), alpha);
            }
            
            if(show_keypoint_numbers) {
                textSize(text_size);
                text(j, kx, ky);
            }
            
            if(show_keypoints) {
                strokeWeight(2);
                point(kx, ky);
            }
        }
    });
} 