var gulp = require('gulp');
var jsdoc = require("gulp-jsdoc");

gulp.task('docs', function() {

  gulp.src("./lib/*.js")
    .pipe(jsdoc.parser({}))
    .pipe(jsdoc.generator('./doc'))
});

gulp.task('watch', function() {
  gulp.watch("lib/*.js", ['docs']);
});

gulp.task('default', ['docs']);