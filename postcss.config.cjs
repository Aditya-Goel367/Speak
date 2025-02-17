const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");

module.exports = {
  plugins: [
    require("@tailwindcss/postcss")(),
    tailwindcss(),
    autoprefixer(),
  ],
};
