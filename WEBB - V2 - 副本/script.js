function toggleScreenshotMenu() {
    const menu = document.getElementById('screenshot-menu');
    menu.classList.toggle('active');
    
    // 播放点击音效
    const clickSound = document.getElementById('clickSound');
    clickSound.currentTime = 0;
    clickSound.play();
}

async function captureScreen() {
    try {
        // 隐藏截图菜单
        const menu = document.getElementById('screenshot-menu');
        menu.classList.remove('active');
        
        await new Promise(resolve => setTimeout(resolve, 300));

        console.log('开始截图...');

        // 确保字体加载完成
        await document.fonts.load('36px Oswald-SemiBold');
        console.log('字体加载完成');

        // 创建临时 canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // 绘制白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 使用 dom-to-image 截取页面
        const screenshot = await domtoimage.toPng(document.body, {
            bgcolor: '#ffffff',
            style: {
                'transform': 'none'
            },
            filter: (node) => {
                // 过滤掉不需要的元素
                return !(node.classList && 
                    (node.classList.contains('screenshot-menu') || 
                     node.classList.contains('camera-control') ||
                     node.classList.contains('top-right-controls') ||
                     node.classList.contains('logo') ||
                     node.classList.contains('loading-logo')));
            }
        });

        // 将截图转换为图片
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = screenshot;
        });

        // 绘制截图
        ctx.drawImage(img, 0, 0);

        // 添加文字
        ctx.font = '36px Oswald-SemiBold';
        ctx.textBaseline = 'top';

        // 计算文字位置
        const textString = 'CHEESY LAB ™';
        const textMetrics = ctx.measureText(textString);
        const textWidth = textMetrics.width;
        
        // 获取视频容器的位置
        const canvasContainer = document.getElementById('p5-canvas-container');
        const containerRect = canvasContainer.getBoundingClientRect();
        
        // 计算文字的 x 坐标：
        // 在屏幕左边缘和视频左边缘之间居中
        const textX = (containerRect.left) / 2 - textWidth / 2;

        ctx.fillStyle = '#000000';
        ctx.fillText(textString, Math.max(20, textX), 40);  // 确保至少有20px的左边距

        // 转换为 dataURL
        const dataUrl = canvas.toDataURL('image/png');

        // 播放音效
        const touchSound = document.getElementById('touchSound');
        touchSound.currentTime = 0;
        touchSound.play();
        
        // 下载
        const link = document.createElement('a');
        link.download = `screenshot-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('截图错误详情:', error);
        if (error.stack) {
            console.error('错误堆栈:', error.stack);
        }
        alert(`截图失败，请重试。\n错误信息：${error.message || '未知错误'}`);
    }
}

// 点击其他地方关闭菜单
document.addEventListener('click', (e) => {
    const menu = document.getElementById('screenshot-menu');
    const screenshotBtn = document.querySelector('.camera-control');
    
    if (!screenshotBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// 在页面加载时计算并设置 logo 位置
window.addEventListener('load', () => {
    const canvasContainer = document.getElementById('p5-canvas-container');
    const containerRect = canvasContainer.getBoundingClientRect();
    const logo = document.querySelector('.logo');
    
    // 计算 logo 的位置：视频左边缘的一半减去 logo 宽度的一半
    const logoRect = logo.getBoundingClientRect();
    const logoX = (containerRect.left / 2) - (logoRect.width / 2);
    
    // 设置 logo 位置
    logo.style.left = `${Math.max(30, logoX)}px`;
});

// 在窗口大小改变时重新计算位置
window.addEventListener('resize', () => {
    const canvasContainer = document.getElementById('p5-canvas-container');
    const containerRect = canvasContainer.getBoundingClientRect();
    const logo = document.querySelector('.logo');
    
    const logoRect = logo.getBoundingClientRect();
    const logoX = (containerRect.left / 2) - (logoRect.width / 2);
    
    logo.style.left = `${Math.max(30, logoX)}px`;
}); 