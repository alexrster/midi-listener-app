const gulp = require('gulp')
const plugins = require("gulp-load-plugins")({ pattern: ['gulp-*', 'gulp.*', 'main-bower-files'] });

const dst = 'src/app/assets';
const jsFiles = ['src/app/js/**/*.js'];

gulp.task('js.libs', () => {
  return gulp.src(plugins.mainBowerFiles({ 
			overrides: { 
				jquery: {
					main: [
						'./dist/jquery.min.js'
					]
				},
				bootstrap: {
					ignore: true
					// main: [
					// 	'./dist/js/bootstrap.min.js'
					// ]
				},
				jsoneditor: {
					main: [
						'./dist/jsoneditor.min.js'
					]
				}
			},
			debugging: true 
		}).concat(jsFiles), { base: 'bower_components' })
	  .pipe(plugins.filter('**/*.js'))
		.pipe(plugins.order([
			'jquery/**',
			'bootstrap/**',
			'jsoneditor/**',
			'**'
		]))
  	.pipe(plugins.concat('scripts.js'))
    .pipe(gulp.dest(dst));
});

gulp.task('css.libs', () => {
  return gulp.src(plugins.mainBowerFiles({
			overrides: {
				bootstrap: {
					main: [
						'./dist/css/bootstrap.min.css'
					]
				},
				jsoneditor: {
					main: [
						'./dist/jsoneditor.min.css'
					]
				}
			},
			debugging: true
		}), { base: 'bower_components' })
		.pipe(plugins.filter('**/*.css'))
		.pipe(plugins.concat('styles.css'))
    .pipe(gulp.dest(dst));
});

gulp.task('assets.libs', () => {
	return gulp.src(plugins.mainBowerFiles({ 
			overrides: { 
				jsoneditor: {
					main: [
						'./dist/img/**'
					]
				}
			},
			debugging: true 
		}), { base: 'bower_components' })
		.pipe(plugins.filter([
			'**/*.svg'
		]))
		.pipe(plugins.flatten())
		.pipe(gulp.dest(dst + '/img'));
}); 
