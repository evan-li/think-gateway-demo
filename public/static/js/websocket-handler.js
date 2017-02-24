
/**
 * WebSocketHandler 用于创建并管理websocket
 *
 * @param options object 初始化参数,可以设置的元素包括:
 *      socket: 要连接的websocket的url, 默认: 无, 必填项
 *      reconnect: 断线后等待重连时间(毫秒数), 设置为0则断线不重连 默认: 3000
 *      ready: socket 连接好之后的回调, 断线重连后会重新调用, 建议使用 ready 做权限认证
 *          回调参数: 服务端初始化操作返回的数据: {type: 'init', client_id: 'xxx'}
 *
 * @method clientId() 获取当前连接的clientId
 * @method send(type, data) 发送消息的方法, 参数type为操作类型, data为携带的数据
 * @method ready(callback) 连接好之后的回调, 断线重连后会重新调用, 参数callback同options中的 ready 参数
 * @method close() 关闭连接
 *
 * @method on(type, callback) 给对应的操作类型(type)注册事件回调, 当服务器返回对应的type操作时调用
 *          callback回调方法的参数为服务器返回的result, 即fire方法的第二个参数
 * @method off(type) 移除对应类型的回调事件
 * @method fire(type, result) 手动触发对应操作的所有回调方法, type为操作, result为服务器返回的结果, 这个方法开放但不建议调用,也很少会用到
 *
 *
 */
var WsHandler = function(options){
    // 默认选项
    var defaultOptions = {
        socket: '', // WebSocket url 必填项
        reconnect: 3000, // 断线后是否重连
        onReady: null, // socket 连接好之后的回调, 断线重连后会重新调用, 建议使用onReady做权限认证
        initTypeName: 'init' // 初始化的操作名称
    };
    // 合并默认选初始化参数
    for(var k in defaultOptions){
        if(!options.hasOwnProperty(k)){
            options[k] = defaultOptions[k];
        }
    }

    // 系统变量
    var _self = this; // 当前对象本身
    var ws ; // WebSocket对象
    var clientId = null;

    // --------------------------  工具方法  ----------------------------
    var isFunction = function(obj){
        return typeof obj == 'function';
    };
    // 检查浏览器是否支持webSocket的方法
    function checkWebSocket(){
        if(typeof WebSocket == 'undefined'){
            console.log('浏览器不支持WebSocket');
            alert('您的浏览器版本过旧, 不支持WebSocket, 建议更新浏览器, 以免影响您的体验');
            return false;
        }else{
            return true;
        }
    }
    // 生成uuid
    function uuid(len, radix) {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [], i;
        radix = radix || chars.length;
        if (len) {
            // rfc4122, version 4 form, example: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
        } else {
            var r;
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random()*16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }
        return uuid.join('');
    }
    // --------------------------  工具方法 END  -------------------------

    // 初始化事件系统
    var initEvent = function(wsh){
        var allEvents = [];
        wsh.on = function(type, callback){
            if(!allEvents[type]) allEvents[type] = [];
            allEvents[type].push(callback);
            return wsh;
        };
        wsh.off = function(type){
            allEvents[type] = [];
            return wsh;
        };
        wsh.fire = function(type, result){
            for (var index in allEvents[type]){
                var callback = allEvents[type][index];
                isFunction(callback) && callback(result, this);
            }
            return wsh;
        }
    };

    // 打开webSocket连接
    var connect = function(){
        if (!checkWebSocket()) return;
        if(ws == null || ws.readyState != WebSocket.OPEN){ // 保证ws只初始化一次
            ws = new WebSocket(options.socket);
        }
    };

    // 断线重连
    var reconnect = function(){
        // 断开5秒后尝试重连
        ws = null;
        initWebSocket(options);
    };

    // 发送心跳信息
    var sendHeartbeat = function(){
        ws.send('2');
    };

    // 初始化WebSocket
    var initWebSocket = function(options){
        if(!options.socket){
            console.error('web socket url 不能为空!');
        }
        connect();

        ws.onopen = function(event){
            console.log("WebSocket已连接, 当前连接状态："+this.readyState);
        };
        // 服务端通知
        ws.onmessage = function(event){
            var data = event.data;
            var code = data[0];
            switch (code){
                case 2: // 服务端返回的心跳响应
                    sendHeartbeat();
                    break;
                case '{':
                default:
                    data = JSON.parse(data);
                    var type = data.type;
                    if(type == options.initTypeName){
                        clientId = data.client_id;
                        isFunction(options.ready) && options.ready(data);
                    }
                    _self.fire(type, data.result);
                    break;
            }
        };
        ws.onclose = function(event){
            if(options.reconnect > 0){
                setTimeout(function () {
                    reconnect();
                }, options.reconnect);
                console.warn('连接已断开, 将在' + (options.reconnect / 1000) + '秒后重新连接');
            }
        };
        ws.onerror = function(event){
            console.error("WebSocket异常！", event);
        };
    };

    // 初始化管理工具
    var init = function(){
        initWebSocket(options);
        initEvent(_self);
    };

    _self.ready = function (callback){
        options.ready = callback;
    };
    _self.send = function(type, params){
        var data = {
            id: uuid(8),
            type: type,
            params: params
        };
        ws.send(JSON.stringify(data));
    };
    _self.close = function(){
        ws && ws.readyState == WebSocket.OPEN && ws.close();
    };

    _self.clientId = function(){
        return clientId;
    };

    init();
    return _self;
};