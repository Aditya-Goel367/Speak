const autoprefixer = require("autoprefixer");
const tailwindcss = require("tailwindcss");

module.exports = {
  plugins: [
    tailwindcss(), // Use main Tailwind package
    autoprefixer(),
  ],
};