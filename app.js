var express = require('express');
var http = require('http');
var path = require('path');

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var static = require('serve-static');
var errorHandler = require('errorhandler');

var expressErrorHandler = require('express-error-handler');
var expressSession = require('express-session');
var socketio = require('socket.io');
var cors = require('cors');
var app = express();

app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.use(expressSession({
    secret:'my key', 
    resave:true, 
    saveUninitialized:true
}));

var sql = require('mssql');
const config = {
    user: 'ndims',
    password: 'nextlab1@',
    server: 'www.nextlab.co.kr', // You can use 'localhost\\instance' to connect to named instance
    database: 'ndims',
 
    options: {
        encrypt: false // Use this if you're on Windows Azure
    }
}
app.use(cors());
var router = express.Router();
router.route('/process/login').post(function(req, res){
    console.log("/process/login 호출됨");
});
var sqlcon;

router.route('/insert').get(function(req, res){
    console.log(req.query);
    res.end();
    //추가 
    sqlcon.request()
        .input('from_id', sql.Text, req.query.fromID)
        .input('to_id', sql.Text, req.query.toID)
        .input('title', sql.Text, req.query.title)
        .input('message', sql.Text, req.query.message)
        .query('INSERT INTO TB_NOTICE_MESSAGE ([from_id], [to_id], title, message) VALUES(@from_id, @to_id, @title, @message)')
        .catch(function(error){console.log(error);});
    //현재 메시지 건 조회
    sqlcon.request()
        .query('SELECT COUNT(*) FROM TB_NOTICE_MESSAGE')
        .then(result => {
            //조회 건에대해서 클라이언트 전체에 송신
            io.sockets.emit('message_count', result);
        })
        .catch(function(error){console.log(error);});
});
app.use('/', router);

var errorHandler = expressErrorHandler({
    static: {
        '404': './public/404.html'
    }
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

var server = http.createServer(app).listen(app.get('port'), function(){
    console.log("서버 시작");
    
    sql.connect(config).then(pool => {
        sqlcon = pool;
    }).catch(function(error){
        console.log(error);
    });
});

var io = socketio.listen(server);

io.sockets.on('connection', function(socket){
    console.log('connection info: ', socket.request.connection._peername);
    socket.remoteAddress = socket.request.connection._peername.address;
    socket.remotePort = socket.request.connection._peername.port;
    console.log(socket.remoteAddress);
});