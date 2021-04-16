const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')
const browserSync = require('browser-sync') // 开发服务器

const loadPlugins = require('gulp-load-plugins')

const plugins = loadPlugins()
// const sass = require('gulp-sass');
// const babel = require('gulp-babel');
// const swig = require('gulp-swig') // 模板引擎
// const imagemin = require('gulp-imagemin'); // 压缩图片

const bs = browserSync.create()

const cwd = process.cwd() // 返回命令行所在的工作目录
let config = {
  // default config
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**',
    }
  }
}
try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig);
} catch (e) { }

const clean = () => {
  return del([config.build.dist, config.build.temp])
}

const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src }) //  加上 base 字段后，输出流 就能按照原有文件目录结构输出
    .pipe(plugins.sass({ outputStyle: 'expanded' })) // 它会忽略以 _ 开头的 scss 文件，如 _icons.scss 就不会被编译
    .pipe(dest(config.build.temp)) // dest：destination-目标位置  dist: distribution-分发、发布
    .pipe(bs.reload({ stream: true })) // 开发服务器 reload 钩子
}

const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src }) //  加上 base 字段后，输出流 就能按照原有文件目录结构输出
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] })) // 需要加上 preset，否则无法转 es6
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true })) // 开发服务器 reload 钩子
}

const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src }) // 'src/**/*.html 表示所有目录、子目录下
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 通过 data 参数，可以给模板传参渲染
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true })) // 开发服务器 reload 钩子
}

const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin()) // 压缩图片任务
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin()) // 压缩图片任务
    .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public }) // 会将 public 下的内容，直接扔到 dist 中
    .pipe(dest(config.build.dist))
}

const serve = () => {
  watch(config.build.paths.styles, style)
  watch(config.build.paths.scripts, script)
  watch(config.build.paths.pages, page)
  // 对于 字体文件、图片、静态资源 这类编译前后不影响页面使用的资源，我们在开发阶段不进行编译，以节省时间。
  // watch(config.build.paths.images, image);
  // watch(config.build.paths.fonts, font);
  // watch(config.build.public, extra);

  // 监听静态文件源文件的变化
  watch([
    config.build.paths.images,
    config.build.paths.fonts,
  ], { cwd: config.build.src }, bs.reload)

  watch('**', { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false, // 不要在页面弹出 browser-sync 的提示
    port: 2080, // 启用端口，默认是3000
    open: true, // 自动打开浏览器，默认为 true
    // files: 'dist/**', // 文件监听，并更新页面，可在每个任务末端添加 .pipe(bs.reload({ stream: true })) 代替
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public], // 依次在 'temp', 'src', config.build.public 目录下寻找资源
      routes: { // 额外路由配置，优先于 baseDir 的配置
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    // html js css
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true, // 折叠 html 中所有空白字符
      minifyCSS: true, // 折叠 css 中所有空白字符
      minifyJS: true // 折叠 js 中所有空白字符
    })))
    .pipe(dest(config.build.dist))
}

const compile = parallel(style, script, page)
// 上线时执行的任务
const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)
// 开发阶段执行的任务
const develop = series(compile, serve)

module.exports = { // 是 exports 的别名
  clean,
  build,
  develop
}
