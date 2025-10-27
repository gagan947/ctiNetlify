import imagemin from "imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminOptipng from "imagemin-optipng";
import imageminSvgo from "imagemin-svgo";

(async () => {
  console.log("Compressing images in src/assets...");

  await imagemin(["src/assets/img/**/*.{jpg,jpeg,png,svg}"], {
    destination: "src/assets/img",
    plugins: [
      imageminMozjpeg({ quality: 85 }),
      imageminOptipng({ optimizationLevel: 3 }),
      imageminSvgo({ plugins: [{ name: "removeViewBox", active: false }] }),
    ],
  });

  console.log("Image compression completed!");
})();
