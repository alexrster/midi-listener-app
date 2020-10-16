const gulp = require('gulp')
const plugins = require("gulp-load-plugins")({ pattern: ['gulp-*', 'gulp.*', 'main-bower-files'] });

const dst = 'src/app/assets';
const jsFiles = ['src/app/js/**/*.js'];

gulp.task('js.libs', function() {
  return gulp.src(plugins.mainBowerFiles({ 
			overrides: { 
				bootstrap: {
					ignore: true
				}
			},
			debugging: true 
		}).concat(jsFiles), { base: 'bower_components' })
	  .pipe(plugins.filter('**/*.js'))
		.pipe(plugins.order([
			'jquery/**/*.js',
			'bootstrap/**/*.js',
			'json-editor/**/*.js',
			'**/*.js'
		]))
  	.pipe(plugins.concat('scripts.js'))
    .pipe(gulp.dest(dst));
});

gulp.task('css.libs', function() {
  return gulp.src(plugins.mainBowerFiles({
			overrides: {
				bootstrap: {
					main: [
						'./dist/css/bootstrap.min.css'
					]
				}
			},
			debugging: true
		}), { base: 'bower_components' })
		.pipe(plugins.filter('**/*.css'))
		.pipe(plugins.concat('styles.css'))
    .pipe(gulp.dest(dst));
});

//		.pipe(plugins.uglify())
// gulp.task('default', ['js.libs', 'css.libs']);

