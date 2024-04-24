const sharp = require("sharp");

class Trimmer {

    static emptyBuffer;

    constructor() {
    }

    static async getEmptyBuffer() {
        return Trimmer.emptyBuffer ||= await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).raw().toBuffer();
    }

    static async isBlank(image) {
        let spaces = await image.raw().toBuffer();
        let length = spaces.length;
        for (let i = 0; i < length; i++) {
            if (spaces[i] !== 0) {
                return false;
            }
        }
        return true;
    }

    static async trim(rects, threshold = 0) {
        for (let item of rects) {
            /** @type {sharp.Sharp} */
            let img = item.image;
            let { data, info } = await img.trim({ threshold }).raw().toBuffer({ resolveWithObject: true });
            item.buffer = data;
            if (info.trimOffsetLeft === 0 && info.trimOffsetTop === 0) {
                if (this.isBlank(img)) {
                    item.buffer = Trimmer.getEmptyBuffer();
                    item.trimmed = true;
                    item.spriteSourceSize.x = 0;
                    item.spriteSourceSize.y = 0;
                    item.spriteSourceSize.w = 1;
                    item.spriteSourceSize.h = 1;
                }
            } else {
                item.trimmed = true;
                item.spriteSourceSize.x = -info.trimOffsetLeft;
                item.spriteSourceSize.y = -info.trimOffsetTop;
                item.spriteSourceSize.w = info.width;
                item.spriteSourceSize.h = info.height;
            }
            if (item.trimmed) {
                item.frame.w = item.spriteSourceSize.w;
                item.frame.h = item.spriteSourceSize.h;
            }
        }
    }
}

module.exports = Trimmer;