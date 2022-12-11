// 定数定義 /////////////////////////////////////////
const FPS                   = 60;
const G                     = 0.02;

const SCREEN_SIZE_W         = 380;
const SCREEN_SIZE_H         = 500;

const BIRD_SIZE_W           = 30; 
const BIRD_SIZE_H           = 30;
const BIRD_IMAGE_PATH       = "images/bird.png";
const BIRD_IMAGE_MISS_PATH  = "images/bird_miss.png";
const BIRD_JUMP_POWER       = 9;

const BLOCK_SIZE_W          = 30;
const BLOCK_SIZE_H          = 30;
const BLOCK_OFFSET          = 50;
const BLOCK_IMAGE_PATH      = "images/block.png";

const START_POS_X           = 0.2;
const START_POS_Y           = 0.3;

const BLOCK_NUM             = Math.ceil(SCREEN_SIZE_H / BLOCK_SIZE_H);
// 変数定義 /////////////////////////////////////////
let startTime;
let score = 0;
let isPause = true;
////////////////////////////////////////////////////

// キャンバスを用意
let canvas = document.createElement("canvas");
let context = canvas.getContext("2d");
canvas.width = SCREEN_SIZE_W;
canvas.height = SCREEN_SIZE_H;
document.body.appendChild(canvas);

// 画像を取得
let birdImage = new Image();
birdImage.src = BIRD_IMAGE_PATH;
let birdMissImage = new Image();
birdMissImage.src = BIRD_IMAGE_MISS_PATH;
let blockImage = new Image();
blockImage.src = BLOCK_IMAGE_PATH;

// キー入力イベントをバインド
document.body.addEventListener("keydown", keydown_event);
// クリックイベントをバインド
canvas.addEventListener("click", click_event);

// クラス定義 ///////////////////////////////////////
// 長方形
class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    draw(image) {
        context.drawImage(image, this.getLeft(), this.getTop(), this.w, this.h);
    }   
    getTop() {
        return this.y - this.h / 2;
    }
    getBottom() {
        return this.y + this.h / 2;
    }
    getLeft() {
        return this.x - this.w / 2;
    }
    getRight() {
        return this.x + this.w / 2;
    }
    setTop(pos) {
        this.y = pos + this.h / 2;
    }
    setBottom(pos) {
        this.y = pos - this.h / 2;
    }
    setLeft(pos) {
        this.x = pos + this.w / 2;
    }
    setRight(pos) {
        this.x = pos - this.w / 2;
    }
}

// 鳥
class Bird extends Rectangle {
    constructor(x, y) {
        super(x, y, BIRD_SIZE_W, BIRD_SIZE_H);
        this.startX = x;
        this.startY = y;
        this.alive = true;
        this.vy = 0;
    }
    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.alive = true;
        this.vy = 0;
    }
    update(deltaTime) {
        let miss = false;
        if (this.alive) {        
            this.vy += deltaTime * G;
            this.y += this.vy;
            if (this.getBottom() >= canvas.height) {
                this.setBottom(canvas.height);
                this.hit();
                miss = true;
            }
            else if (this.getTop() <= 0) {
                this.setTop(0);
                this.hit();
                miss = true;
            }
        }
        return miss;
    }
    jump() {
        if (this.alive) {
            this.vy = -BIRD_JUMP_POWER;
        }
    }
    draw() {
        if (this.alive) {
            super.draw(birdImage);
        }
        else {
            super.draw(birdMissImage);
        }
    }
    hit() {
        if (this.alive) {
            this.alive = false;
        }
    }
}

// ブロック.
class Block extends Rectangle {
    constructor(x, y) {
        super(x, y, BLOCK_SIZE_W, BLOCK_SIZE_H);
    }
    draw() {
        super.draw(blockImage);
    }
    checkHit(object) {
        if (object.getLeft() > this.getRight()) return false;
        if (object.getRight() < this.getLeft()) return false;
        if (object.getTop() > this.getBottom()) return false;
        if (object.getBottom() < this.getTop()) return false;
        return true;
    }
}

// マップ
class Map {
    constructor() {
        this.blocks = []
        this.deltaX = 0;
        this.blank = 7;
        this.speed = 2.0;
        this.interval = 400;
        this.AddBlocks(0);
    }
    reset() {
        this.blocks.splice(0);
        this.deltaX = 0;
        this.AddBlocks(0);
    }
    update(deltaTime) {
        // すべてのブロックを移動
        this.blocks.forEach(block => {
            block.x -= this.speed;
        })
        
        // 一定距離移動したら新しくブロックを作る
        this.deltaX += this.speed;
        if (this.deltaX >= this.interval) {
            this.AddBlocks(this.interval - this.deltaX);
            this.deltaX = 0;
        }
        
        // 左に過ぎ去ったブロックがあるか調べる
        const isPassed = !this.blocks.every(block => {
            return block.getRight() > 0;
        });
        if (isPassed) {
            // あればスコアを増やす
            score++;
        }

        // 左に過ぎ去ったブロックは削除する
        const newBlocks = this.blocks.filter(block => {
            return block.getRight() > 0;
        });
        this.blocks = newBlocks;
    }
    draw() {
        this.blocks.forEach(block => block.draw(blockImage));
    }
    AddBlocks(offset) {
        let top = 1 + Math.floor(Math.random() * (BLOCK_NUM - this.blank - 2));
        let bottom = top + this.blank;
        for (let i = 0; i < top; i++) {
            this.AddBlock(i, offset);
        }
        for (let i = bottom; i < BLOCK_NUM; i++) {
            this.AddBlock(i, offset);
        }
    }
    AddBlock(idx, offset) {
        let block = new Block(0, 0);
        block.setTop(idx * BLOCK_SIZE_H);
        block.setLeft(Math.max(-BLOCK_OFFSET, offset) + canvas.width + BLOCK_OFFSET);
        this.blocks.push(block);
    }
    checkHit(object) {
        return !this.blocks.every(block => {
            return !block.checkHit(object);
        })
    }
}

// インスタンス //////////////////////////////////////////
let bird = new Bird(
    START_POS_X * canvas.width,
    START_POS_Y * canvas.height);
let map = new Map();

// 関数定義 //////////////////////////////////////////////
// メインループを開始
function startLoop() {
    startTime = performance.now();
    requestAnimationFrame(loop);
}

// メインループ
function loop() {
    let nowTime = performance.now();
    let deltaTime = nowTime - startTime;

    if (deltaTime > 1000 / FPS) {
        update(deltaTime);
        render();
        startTime = nowTime;
    }

    //ブラウザが再描画可能なタイミングでコールバック関数を実行
    requestAnimationFrame(loop);
}

// 更新
function update(deltaTime) {
    if (!isPause) {
        map.update(deltaTime);
        let miss = bird.update(deltaTime);

        // 衝突判定
        if (miss || map.checkHit(bird)) {
            bird.hit();
            isPause = true;
        }
    }
}

// テキスト表示
function DrawText(text, x, y, font, color) {
    context.font = font;
    context.fillStyle = color;
    context.fillText(text, x, y);
}

// 描画
function render() {
    let grad = context.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.0, 'rgb(46, 104, 190)');
    grad.addColorStop(1.0, 'rgb(82, 184, 240)');
    context.fillStyle = grad;
    context.fillRect(0, 0, canvas.width, canvas.height);

    map.draw();
    bird.draw();

    // スコア表示
    DrawText(String(score), 30, 60, "48px san-serif", "#000");

    if (isPause) {
        DrawText("Please Press Space Key", 20, canvas.height / 2, "30px san-serif", "#000");
    }
}

// リセット
function reset() {
    map.reset();
    bird.reset();

    score = 0;
}

// キー入力イベント
function keydown_event(e) {
    if (isPause) {
        if (e.key == " ") {
            reset();
            isPause = false;
        }
    }
    else {
        if (e.key = " ") {
            bird.jump();
        }
    }
}

// クリックイベント
function click_event(e) {
    if (isPause) {
        reset();
        isPause = false;
    }
    else {
        bird.jump();
    }
}

startLoop();