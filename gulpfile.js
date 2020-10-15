var gulp = require('gulp')

// Define default destination folder
const dst = 'src/app/assets';
//const dest = 'dist'

// Include plugins
var plugins = require("gulp-load-plugins")({
	pattern: ['gulp-*', 'gulp.*', 'main-bower-files'],
	replaceString: /\bgulp[\-.]/
});

gulp.task('js.libs', function() {
//	var jsFiles = ['src/app/controllers/js/*'];
//gulp.src(plugins.mainBowerFiles().concat(jsFiles))
  return gulp.src(plugins.mainBowerFiles({debugging: true}), { base: 'bower_components' })
	  .pipe(plugins.filter('**/*.js'))
		.pipe(plugins.order([
      'require.js',
			'jquery.js',
			'*'
		]))
  	.pipe(plugins.concat('scripts.js'))
    .pipe(gulp.dest(dst));
//		.pipe(plugins.uglify())
});

gulp.task('css.libs', function() {
	// var cssFiles = ['src/css/*'];
	// gulp.src(plugins.mainBowerFiles().concat(cssFiles))
	return gulp.src(plugins.mainBowerFiles())
		.pipe(plugins.filter('**/*.css'))
		// .pipe(plugins.order([
		// 	'normalize.css',
		// 	'*'
		// ]))
		.pipe(plugins.concat('styles.css'))
//		.pipe(plugins.uglify())
    .pipe(gulp.dest(dst));
});

//gulp.task('default', ['js.libs', 'css.libs']);

