let sharp = require("sharp");

class TextureRenderer {

    constructor(data, options = {}, callback) {
        this.buffer = null;
        this.data = data;

        this.callback = callback;

        this.width = 0;
        this.height = 0;

        this.render(data, options);
    }

    static getSize(data, options = {}) {
        let width = options.width || 0;
        let height = options.height || 0;
        let padding = options.padding || 0;
        let extrude = options.extrude || 0;

        if (!options.fixedSize) {
            width = 0;
            height = 0;

            for (let item of data) {

                let w = item.frame.x + item.frame.w;
                let h = item.frame.y + item.frame.h;

                if (item.rotated) {
                    w = item.frame.x + item.frame.h;
                    h = item.frame.y + item.frame.w;
                }

                if (w > width) {
                    width = w;
                }
                if (h > height) {
                    height = h;
                }
            }

            width += padding + extrude;
            height += padding + extrude;
        }

        if (options.powerOfTwo) {
            let sw = Math.round(Math.log(width) / Math.log(2));
            let sh = Math.round(Math.log(height) / Math.log(2));

            let pw = Math.pow(2, sw);
            let ph = Math.pow(2, sh);

            if (pw < width) pw = Math.pow(2, sw + 1);
            if (ph < height) ph = Math.pow(2, sh + 1);

            width = pw;
            height = ph;
        }

        return { width, height };
    }

    async render(data, options = {}) {
        let { width, height } = TextureRenderer.getSize(data, options);

        this.width = width;
        this.height = height;

        let image = sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

        let subImages = [];
        for (let item of data) {
            let sub = await this.renderItem(item, options);
            if (sub) subImages.push(sub);
        }
        image.composite(subImages);

        // let filter = new options.filter();
        // filter.apply(image);

        let buffer = await image.png().toBuffer();

        if (options.scale && options.scale !== 1) {
            let scaleMethod = "mitchell";
            if (options.scaleMethod === "NEAREST_NEIGHBOR") scaleMethod = "nearest";
            if (options.scaleMethod === "BICUBIC") scaleMethod = "cubic";
            if (options.scaleMethod === "HERMITE") scaleMethod = "lanczos2";
            if (options.scaleMethod === "BEZIER") scaleMethod = "lanczos3";
            buffer = await sharp(buffer).resize(Math.round(width * options.scale) || 1, Math.round(height * options.scale) || 1, scaleMethod).toBuffer();
        }
        this.buffer = buffer;

        if (this.callback) this.callback(this);
    }

    async renderItem(item, options) {
        if (!item.skipRender) {
            let input = item.image;
            let left = item.frame.x;
            let top = item.frame.y;
            let width = item.frame.w;
            let height = item.frame.h;

            if (options.extrude) {
                pixel = options.extrude;
                let img = sharp(input, { raw: { width, height, channels: 4 } }).extend({ top: pixel, bottom: pixel, left: pixel, right: pixel, extendWith: "copy" });
                left -= options.extrude;
                top -= options.extrude;
                width += options.extrude * 2;
                height += options.extrude * 2;
                if (options.rotated) {
                    img.rotate(90);
                    [width, height] = [height, width];
                }
                input = await img.toBuffer();
            } else if (item.rotated) {
                input = await sharp(input, { raw: { width, height, channels: 4 } }).rotate(90).toBuffer();
                [width, height] = [height, width];
            }

            return { input, left, top, raw: { width, height, channels: 4 } };
        }
    }
}

module.exports = TextureRenderer;