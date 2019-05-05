var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var multer  = require('multer')
var upload = multer({ dest: 'public/' });
var { uploadAudioToS3, getJsonScript, combineVideoandScript, getSrtfromJson } = require('./api');
const window = require('global/window');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var ffmpeg = require('ffmpeg');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use(express.urlencoded())
app.post("/upload", upload.single('file'), function(req, res) {
  var process = new ffmpeg(__dirname + '/public/' + req.file.filename);
	process.then(function (video) {
		video.fnExtractSoundToMP3(__dirname + '/public/' + req.file.filename + '.mp3', function (error, file) {
			if (!error)
        console.log('Audio file: ' + file);
      console.log("Converted");
      uploadAudioToS3(req.file.filename);
      window.intervalId = setInterval(function() {
        getJsonScript(req.file.filename, res);
      }, 10000);
		});
	}, function (err) {
		console.log('Error: ' + err);
  });
});

app.post("/result", function(req, res) {
  const userText = req.body.userText;
  var filename = req.body.filename;
  getSrtfromJson(userText, filename, res);
});

app.get('/download', function(req, res){
  var file = __dirname + '/public/' + req.query.filename;
  res.download(file); // Set disposition and send it.
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
