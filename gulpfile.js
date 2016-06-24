var gulp = require('gulp'),
    ts = require('gulp-typescript'),
    nodemon = require('gulp-nodemon'),
    lab = require('gulp-lab'),
    clean = require('gulp-clean'),
    gulpCopy = require('gulp-copy'),
    runSequence = require('run-sequence'),
    tslint = require("gulp-tslint");
var tsProject = ts.createProject('tsconfig.json');

gulp.task('clean', function () {
  return gulp.src('dist', {read: false})
    .pipe(clean());
});

gulp.task('lint', function () {
  return gulp.src(['src/**/*.ts', 'test/**/*.ts'])
    .pipe(tslint())
    .pipe(tslint.report('verbose'));
});

gulp.task('copy-resources', function () {
  return gulp.src(['package.json'])
    .pipe(gulpCopy('dist'));
});

gulp.task('compile', function () {
  return tsProject.src()
    .pipe(ts(tsProject))
    .js.pipe(gulp.dest('dist'));
});

gulp.task('build', ['copy-resources', 'compile']);

gulp.task('clean-test', function() {
  return runSequence('clean', 'test');
});

gulp.task('start', ['build'], function () {
  nodemon({
    script: 'dist/src/darkstar.js',
    watch: ['src'],
    tasks: ['compile'],
    ext: "js json ts"
  });
});

gulp.task('test', ['build'], function () {
  return gulp.src('dist/test')
    .pipe(lab('-c --reporter console'));
});

gulp.task('watch-test', function () {
  gulp.watch(['src/**/*.ts', 'test/**/*.ts'], ['clean-test']);
});

gulp.task('ci', ['build', 'lint'], function () {
  gulp.src('dist/test')
    .pipe(lab('-c -r junit -o report/test.xml -r clover -o report/coverage.xml -r console -o stdout'));
});
