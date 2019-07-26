const { src, dest, series, parallel } = require('gulp');
const tslint = require('gulp-tslint');
const gulpCopy = require('gulp-copy');
const ts = require('gulp-typescript');
const lab = require('gulp-lab');
const nodemon = require('gulp-nodemon');
const clean = require('gulp-clean');

var tsProject = ts.createProject('tsconfig.json');

function cleanBuild() {
  return src('dist', { read: false }).pipe(clean());
}

function lint() {
  return src(['src/**/*.ts', 'test/**/*.ts'])
    .pipe(tslint({ formatter: 'verbose' }))
    .pipe(tslint.report());
}

function copyResources() {
  return src(['package.json']).pipe(gulpCopy('dist'));
}

function compile() {
  return tsProject
    .src()
    .pipe(tsProject())
    .js.pipe(dest('dist'));
}

function startServer() {
  return nodemon({
    script: 'dist/src/darkstar.js',
    watch: ['src'],
    tasks: ['compile'],
    ext: 'js json ts',
  });
}

function runTests() {
  return src('dist/test').pipe(lab('--reporter console'));
}

function watchTest() {
  return watch(['src/**/*.ts', 'test/**/*.ts'], 'cleanTest');
}

function runTestsCI() {
  return src('dist/test').pipe(
    lab(
      //"-c -r junit -o report/test.xml -r clover -o report/coverage.xml -r console -o stdout",
      '-r junit -o report/test.xml -r console -o stdout'
    )
  );
}

exports.clean = cleanBuild;
exports.lint = lint;
exports.compile = compile;
exports.build = parallel(copyResources, compile);
exports.test = series(exports.build, runTests);
exports.cleanTest = series(cleanBuild, runTests);
exports.start = series(exports.build, startServer);
exports.ci = series(
  exports.build,
  //lint,
  runTestsCI
);
exports.watch = watchTest;
