(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SGPImage = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // Ported from SuperGenPass mobile identicon logic:
  // - generateIdenticonHash() in src/mobile/sgp.mobile.js
  // - identicon5 renderer in src/mobile/lib/identicon5.js
  const SPRITE_WIDTH = 16;
  const HALF_PI = Math.PI / 2;

  function leftRotate(value, amount) {
    return ((value << amount) | (value >>> (32 - amount))) >>> 0;
  }

  function md5DigestBytes(bytesInput) {
    const bytes = Array.from(bytesInput);
    const bitLength = bytes.length * 8;
    const bitLengthLow = bitLength >>> 0;
    const bitLengthHigh = Math.floor(bitLength / 0x100000000) >>> 0;

    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) {
      bytes.push(0);
    }

    for (let i = 0; i < 4; i += 1) {
      bytes.push((bitLengthLow >>> (8 * i)) & 0xff);
    }

    for (let i = 0; i < 4; i += 1) {
      bytes.push((bitLengthHigh >>> (8 * i)) & 0xff);
    }

    const md5S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];

    const md5K = Array.from({ length: 64 }, (_, index) => {
      return Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0;
    });

    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    for (let offset = 0; offset < bytes.length; offset += 64) {
      const m = new Array(16);
      for (let i = 0; i < 16; i += 1) {
        const j = offset + (i * 4);
        m[i] = (
          bytes[j] |
          (bytes[j + 1] << 8) |
          (bytes[j + 2] << 16) |
          (bytes[j + 3] << 24)
        ) >>> 0;
      }

      let a = a0;
      let b = b0;
      let c = c0;
      let d = d0;

      for (let i = 0; i < 64; i += 1) {
        let f;
        let g;

        if (i < 16) {
          f = (b & c) | (~b & d);
          g = i;
        } else if (i < 32) {
          f = (d & b) | (~d & c);
          g = ((5 * i) + 1) % 16;
        } else if (i < 48) {
          f = b ^ c ^ d;
          g = ((3 * i) + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * i) % 16;
        }

        const temp = d;
        d = c;
        c = b;

        const sum = (a + f + md5K[i] + m[g]) >>> 0;
        b = (b + leftRotate(sum, md5S[i])) >>> 0;
        a = temp;
      }

      a0 = (a0 + a) >>> 0;
      b0 = (b0 + b) >>> 0;
      c0 = (c0 + c) >>> 0;
      d0 = (d0 + d) >>> 0;
    }

    return [a0, b0, c0, d0].flatMap((word) => {
      return [
        word & 0xff,
        (word >>> 8) & 0xff,
        (word >>> 16) & 0xff,
        (word >>> 24) & 0xff,
      ];
    });
  }

  function md5Hex(value) {
    const bytes = Array.from(new TextEncoder().encode(value));
    const digest = md5DigestBytes(bytes);
    return digest.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function generateIdenticonHash(seed) {
    let hash = seed;
    for (let i = 0; i <= 4; i += 1) {
      hash = md5Hex(hash);
    }
    return hash;
  }

  function fillPoly(ctx, path) {
    if (path.length < 2) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(path[0], path[1]);
    for (let i = 2; i < path.length; i += 2) {
      ctx.lineTo(path[i], path[i + 1]);
    }
    ctx.fill();
  }

  function getSprite(shape) {
    switch (shape) {
      case 0: return [0.5, 1, 1, 0, 1, 1];
      case 1: return [0.5, 0, 1, 0, 0.5, 1, 0, 1];
      case 2: return [0.5, 0, 1, 0, 1, 1, 0.5, 1, 1, 0.5];
      case 3: return [0, 0.5, 0.5, 0, 1, 0.5, 0.5, 1, 0.5, 0.5];
      case 4: return [0, 0.5, 1, 0, 1, 1, 0, 1, 1, 0.5];
      case 5: return [1, 0, 1, 1, 0.5, 1, 1, 0.5, 0.5, 0.5];
      case 6: return [0, 0, 1, 0, 1, 0.5, 0, 0, 0.5, 1, 0, 1];
      case 7: return [0, 0, 0.5, 0, 1, 0.5, 0.5, 1, 0, 1, 0.5, 0.5];
      case 8: return [0.5, 0, 0.5, 0.5, 1, 0.5, 1, 1, 0.5, 1, 0.5, 0.5, 0, 0.5];
      case 9: return [0, 0, 1, 0, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0, 1];
      case 10: return [0, 0.5, 0.5, 1, 1, 0.5, 0.5, 0, 1, 0, 1, 1, 0, 1];
      case 11: return [0.5, 0, 1, 0, 1, 1, 0.5, 1, 1, 0.75, 0.5, 0.5, 1, 0.25];
      case 12: return [0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, 1, 0.5, 0.5, 1, 0.5, 0.5, 0, 1];
      case 13: return [0, 0, 1, 0, 1, 1, 0, 1, 1, 0.5, 0.5, 0.25, 0.5, 0.75, 0, 0.5, 0.5, 0.25];
      case 14: return [0, 0.5, 0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0, 1];
      default: return [0, 0, 1, 0, 0.5, 0.5, 0.5, 0, 0, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0, 1];
    }
  }

  function getCenter(shape, size) {
    let points;
    switch (shape) {
      case 0: points = []; break;
      case 1: points = [0, 0, 1, 0, 1, 1, 0, 1]; break;
      case 2: points = [0.5, 0, 1, 0.5, 0.5, 1, 0, 0.5]; break;
      case 3: points = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0.5, 0.5, 1, 1, 0.5, 0.5, 0, 0, 0.5]; break;
      case 4: points = [0.25, 0, 0.75, 0, 0.5, 0.5, 1, 0.25, 1, 0.75, 0.5, 0.5, 0.75, 1, 0.25, 1, 0.5, 0.5, 0, 0.75, 0, 0.25, 0.5, 0.5]; break;
      case 5: points = [0, 0, 0.5, 0.25, 1, 0, 0.75, 0.5, 1, 1, 0.5, 0.75, 0, 1, 0.25, 0.5]; break;
      case 6: points = [0.33, 0.33, 0.67, 0.33, 0.67, 0.67, 0.33, 0.67]; break;
      case 7: points = [0, 0, 0.33, 0, 0.33, 0.33, 0.66, 0.33, 0.67, 0, 1, 0, 1, 0.33, 0.67, 0.33, 0.67, 0.67, 1, 0.67, 1, 1, 0.67, 1, 0.67, 0.67, 0.33, 0.67, 0.33, 1, 0, 1, 0, 0.67, 0.33, 0.67, 0.33, 0.33, 0, 0.33]; break;
      default: points = [0, 0, 1, 0, 0.5, 0.5, 0.5, 0, 0, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0, 1]; break;
    }

    return points.map((point) => point * size);
  }

  function drawRotatedPolygon(ctx, sprite, x, y, shapeAngle, angle, size) {
    const halfSize = size / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.save();
    ctx.translate(halfSize, halfSize);
    const translatedSprite = sprite.map((point) => point - halfSize);
    ctx.rotate(shapeAngle);
    fillPoly(ctx, translatedSprite);
    ctx.restore();
    ctx.restore();
  }

  function drawIdenticon(ctx, hash, width) {
    const cornerShape = parseInt(hash.substr(0, 1), 16);
    const sideShape = parseInt(hash.substr(1, 1), 16);
    const centerShape = parseInt(hash.substr(2, 1), 16) & 7;
    const cornerRotation = HALF_PI * (parseInt(hash.substr(3, 1), 16) & 3);
    const sideRotation = HALF_PI * (parseInt(hash.substr(4, 1), 16) & 3);
    const centerBackground = parseInt(hash.substr(5, 1), 16) % 2;
    const cornerColor = [
      parseInt(hash.substr(6, 2), 16),
      parseInt(hash.substr(8, 2), 16),
      parseInt(hash.substr(10, 2), 16),
    ];
    const sideColor = [
      parseInt(hash.substr(12, 2), 16),
      parseInt(hash.substr(14, 2), 16),
      parseInt(hash.substr(16, 2), 16),
    ];

    const spriteSize = width / 3;
    const totalSize = width;

    const corner = getSprite(cornerShape).map((point) => point * spriteSize);
    ctx.fillStyle = `rgb(${cornerColor[0]},${cornerColor[1]},${cornerColor[2]})`;
    drawRotatedPolygon(ctx, corner, 0, 0, cornerRotation, 0, spriteSize);
    drawRotatedPolygon(ctx, corner, totalSize, 0, cornerRotation, 90, spriteSize);
    drawRotatedPolygon(ctx, corner, totalSize, totalSize, cornerRotation, 180, spriteSize);
    drawRotatedPolygon(ctx, corner, 0, totalSize, cornerRotation, 270, spriteSize);

    const side = getSprite(sideShape).map((point) => point * spriteSize);
    ctx.fillStyle = `rgb(${sideColor[0]},${sideColor[1]},${sideColor[2]})`;
    drawRotatedPolygon(ctx, side, 0, spriteSize, sideRotation, 0, spriteSize);
    drawRotatedPolygon(ctx, side, 2 * spriteSize, 0, sideRotation, 90, spriteSize);
    drawRotatedPolygon(ctx, side, 3 * spriteSize, 2 * spriteSize, sideRotation, 180, spriteSize);
    drawRotatedPolygon(ctx, side, spriteSize, 3 * spriteSize, sideRotation, 270, spriteSize);

    const center = getCenter(centerShape, spriteSize);
    if (
      centerBackground > 0 &&
      (Math.abs(cornerColor[0] - sideColor[0]) > 127 ||
       Math.abs(cornerColor[1] - sideColor[1]) > 127 ||
       Math.abs(cornerColor[2] - sideColor[2]) > 127)
    ) {
      ctx.fillStyle = `rgb(${sideColor[0]},${sideColor[1]},${sideColor[2]})`;
    } else {
      ctx.fillStyle = `rgb(${cornerColor[0]},${cornerColor[1]},${cornerColor[2]})`;
    }
    drawRotatedPolygon(ctx, center, spriteSize, spriteSize, 0, 0, spriteSize);
  }

  function renderIdenticon(canvas, masterPassword) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      return false;
    }

    if (!masterPassword) {
      return false;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return false;
    }

    const hash = generateIdenticonHash(masterPassword);

    const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : undefined;
    if (devicePixelRatio && devicePixelRatio === 2) {
      canvas.width = canvas.height = SPRITE_WIDTH * 2;
      ctx.scale(2, 2);
    } else {
      canvas.width = canvas.height = SPRITE_WIDTH;
    }

    drawIdenticon(ctx, hash, SPRITE_WIDTH);
    return true;
  }

  return {
    generateIdenticonHash,
    renderIdenticon,
  };
});
