const gulp = require("gulp");
const pug = require("gulp-pug");
const sass = require("gulp-sass")(require("sass"));
const server = require("browser-sync").create();
const clean = require("gulp-clean");
const fs = require("fs");
const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const postcss = require("gulp-postcss");
const postcssReset = require("postcss-css-reset");
const svgSprite = require("gulp-svg-sprite");
const cheerio = require("gulp-cheerio");
const replace = require("gulp-replace");

function plumberErrorHandler(type) {
  return {
    errorHandler: notify.onError({
      title: type,
      error: "Error <%=<< error.message >>%>",
      sound: false,
    }),
  };
}

const config = {
  resultFolder: "dist",
  tasks: {
    templateEngine: "template",
    stylePreprocessor: "styles",
    svg: "svg",
    server: "server",
    cleaner: "clean",
    watcher: "watch",
    start: "start",
    build: "build",
  },
  plumber: {
    scss: plumberErrorHandler("Styles"),
    template: plumberErrorHandler("Template"),
    svg: plumberErrorHandler("SVG"),
  },
};

gulp.task(config.tasks.templateEngine, function () {
  return gulp
    .src(["./src/*.pug"])
    .pipe(plumber(config.plumber.template))
    .pipe(pug({ pretty: true }))
    .pipe(gulp.dest(`./${config.resultFolder}`));
});

gulp.task(config.tasks.stylePreprocessor, function () {
  return gulp
    .src("./src/scss/*.scss")
    .pipe(plumber(config.plumber.scss))
    .pipe(sass())
    .pipe(postcss([postcssReset()]))
    .pipe(gulp.dest(`./${config.resultFolder}/css`));
});

gulp.task(config.tasks.svg, function () {
  const targetDir = `./${config.resultFolder}/assets/icons`;

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  fs.mkdirSync(targetDir, { recursive: true });

  return gulp
    .src("./src/assets/icons/*.svg")
    .pipe(plumber(config.plumber.svg))
    .pipe(
      cheerio({
        run: function ($) {
          $("[fill]").each(function () {
            if ($(this).attr("fill") !== "none") {
              $(this).attr("fill", "currentColor");
            }
          });

          $("[stroke]").each(function () {
            if ($(this).attr("stroke") !== "none") {
              $(this).attr("stroke", "currentColor");
            }
          });
          $("[style]").removeAttr("style");
          $("[opacity]").removeAttr("opacity");
        },
        parserOption: { xmlMode: true },
      }),
    )
    .pipe(replace("&gt;", ">"))
    .pipe(
      svgSprite({
        mode: {
          symbol: {
            dest: ".",
            sprite: "sprite.svg",
            bust: false,
            example: false,
          },
        },
      }),
    )
    .pipe(gulp.dest(`./${config.resultFolder}/assets/icons`));
});

gulp.task(config.tasks.server, function () {
  server.init({
    server: {
      baseDir: `./${config.resultFolder}`,
    },
    open: true,
    livereload: true,
  });
});

gulp.task(config.tasks.cleaner, function (done) {
  if (fs.existsSync(`./${config.resultFolder}`)) {
    return gulp.src(`./${config.resultFolder}`, { read: false }).pipe(clean());
  }
  done();
});

gulp.task(
  config.tasks.build,
  gulp.series(
    config.tasks.cleaner,
    gulp.parallel(
      config.tasks.templateEngine,
      config.tasks.stylePreprocessor,
      config.tasks.svg,
    ),
  ),
);

gulp.task(config.tasks.watcher, function () {
  gulp.watch("./src/assets/icons/*.svg", gulp.parallel(config.tasks.svg));
  gulp.watch(
    ["./src/index.pug", "./src/layout/**/*.pug"],
    gulp.parallel(config.tasks.templateEngine),
  );
  gulp.watch(
    "./src/scss/**/*.scss",
    gulp.parallel(config.tasks.stylePreprocessor),
  );
  gulp.watch(`./${config.resultFolder}/**/*.*`).on("change", server.reload);
});

gulp.task(
  config.tasks.start,
  gulp.series(
    config.tasks.cleaner,
    gulp.parallel(
      config.tasks.templateEngine,
      config.tasks.stylePreprocessor,
      config.tasks.svg,
    ),
    gulp.parallel(config.tasks.server, config.tasks.watcher),
  ),
);
