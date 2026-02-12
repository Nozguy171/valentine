import { useEffect, useRef } from "react";

export default function ChromaImage({
  src,
  width = 360,
  height,
  keyColor = { r: 0, g: 255, b: 0 }, // greenscreen
  tolerance = 70,
  feather = 25,
  className = "",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const aspect = img.width / img.height;
      const w = width;
      const h = height ?? Math.round(w / aspect);

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // distancia al verde
        const dr = r - keyColor.r;
        const dg = g - keyColor.g;
        const db = b - keyColor.b;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        // alpha suave (feather)
        if (dist < tolerance + feather) {
          const t = (dist - tolerance) / feather; // 0..1
          const alpha = Math.max(0, Math.min(1, t));
          data[i + 3] = Math.round(alpha * 255);
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };
  }, [src, width, height, keyColor.r, keyColor.g, keyColor.b, tolerance, feather]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height: "auto", imageRendering: "pixelated" }}
    />
  );
}
