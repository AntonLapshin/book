export function whitenBackground(source, { tolerance = 4, feather = 1 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const w = canvas.width
        const h = canvas.height

        const seedR = data[0]
        const seedG = data[1]
        const seedB = data[2]
        const tol = Math.max(0, tolerance)
        const tolSq = tol * tol

        const match = (i) => {
          const dr = data[i] - seedR
          const dg = data[i + 1] - seedG
          const db = data[i + 2] - seedB
          return dr * dr + dg * dg + db * db <= tolSq
        }

        const mask = new Uint8Array(w * h)
        const stack = [0]
        mask[0] = 1
        while (stack.length) {
          const idx = stack.pop()
          const x = idx % w
          const y = (idx / w) | 0
          if (x > 0 && !mask[idx - 1] && match((idx - 1) * 4)) {
            mask[idx - 1] = 1
            stack.push(idx - 1)
          }
          if (x < w - 1 && !mask[idx + 1] && match((idx + 1) * 4)) {
            mask[idx + 1] = 1
            stack.push(idx + 1)
          }
          if (y > 0 && !mask[idx - w] && match((idx - w) * 4)) {
            mask[idx - w] = 1
            stack.push(idx - w)
          }
          if (y < h - 1 && !mask[idx + w] && match((idx + w) * 4)) {
            mask[idx + w] = 1
            stack.push(idx + w)
          }
        }

        let featherMask = new Float32Array(w * h)
        for (let i = 0; i < w * h; i++) featherMask[i] = mask[i]
        const passes = Math.max(0, feather)
        for (let k = 0; k < passes; k++) {
          const src = featherMask
          const next = new Float32Array(w * h)
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              let sum = 0
              let count = 0
              const y0 = Math.max(0, y - 1)
              const y1 = Math.min(h - 1, y + 1)
              const x0 = Math.max(0, x - 1)
              const x1 = Math.min(w - 1, x + 1)
              for (let ny = y0; ny <= y1; ny++) {
                for (let nx = x0; nx <= x1; nx++) {
                  sum += src[ny * w + nx]
                  count++
                }
              }
              next[y * w + x] = sum / count
            }
          }
          featherMask = next
        }

        for (let i = 0; i < w * h; i++) {
          const a = featherMask[i]
          if (a > 0) {
            const idx = i * 4
            data[idx] = data[idx] * (1 - a) + 255 * a
            data[idx + 1] = data[idx + 1] * (1 - a) + 255 * a
            data[idx + 2] = data[idx + 2] * (1 - a) + 255 * a
          }
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = reject
    img.src = source
  })
}
