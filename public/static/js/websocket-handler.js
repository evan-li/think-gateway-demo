
/**
 * WebSocketHandler 用于创建并管理websocket
 *
 * @param options object 初始化参数,可以设置的元素包括:
 *      socket: 要连接的websocket的url, 默认: 无, 必填项
 *      reconnect: number 断线后重连延迟的秒数, 为0表示不重连  默认: 5
 *      ready: socket 连接好之后的回调, 断线重连后会重新调用, 建议使用ready做权限认证
 *          回调参数: 暂无
 *
 * @method send(action, data) 发送消息的方法, 参数action为操作, data为携带的数据
 * @method close() 关闭当前的websocket连接
 * @method ready(callback) 连接好之后的回调, 断线重连后会重新调用, 参数callback同options中的ready参数
 * @method on(action, callback) 给对应的action操作注册事件回调, 当服务器返回对应的action操作时调用
 *          callback回调方法的参数为服务器返回的result, 即fire方法的第二个参数
 * @method off(action) 移除对应action操作的回调事件
 * @method fire(action, result) 手动触发对应操作的所有回调方法, action为操作, result为服务器返回的结果, 这个方法开放但不建议调用,也很少会用到
 *
 *
 */
var WebSocketHandler = function(options){
    // 默认选项
    var defaultOptions = {
        socket: '', // WebSocket url 必填项
        reconnect: 5, // 断线后是否重连
        ready: null // socket 连接好之后的回调, 断线重连后会重新调用, 建议使用ready做权限认证
    };

    var _self = this; // 当前对象本身
    var ws ; // WebSocket对象
    var clientId = null; // clientId

    // 合并默认选初始化参数
    for(var k in defaultOptions){
        if(!options.hasOwnProperty(k)){
            options[k] = defaultOptions[k];
        }
    }

    // 初始化事件系统
    var initEvent = function(wsh){
        var actionEvents = [];
        wsh.on = function(action, callback){
            if(!actionEvents[action]) actionEvents[action] = [];
            actionEvents[action].push(callback);
            return wsh;
        };
        wsh.off = function(action){
            actionEvents[action] = [];
            return wsh;
        };
        wsh.fire = function(action, data){
            console.log(actionEvents[action]);
            for (var index in actionEvents[action]){
                var callback = actionEvents[action][index];
                if(typeof callback == 'function') callback(data.result);
            }
            return wsh;
        }
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
    // 打开webSocket连接
    var connect = function(){
        if (!checkWebSocket()) return;
        if(ws == null || ws.readyState != 1){ // 保证ws只初始化一次
            ws = new WebSocket(options.socket);
        }
    };

    // 断线重连
    var reconnect = function(){
        // 断开5秒后尝试重连
        ws = null;
        if(options.reconnect > 0){
            setTimeout(function () {
                init(options);
            }, options.reconnect * 1000);
            console.log('连接已断开, 将在' + options.reconnect + '秒后重新连接');
        }
    };

    // 发送心跳信息
    var sendHeartbeat = function(){
        console.log('响应心跳信息');
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
                case 2: // 服务端返回的心跳响应, 回应一个心跳信息
                    sendHeartbeat();
                    break;
                case '{':
                    data = JSON.parse(data);
                    console.log(data);
                    var action = data.action;
                    if(action == 'init'){
                        clientId = data.client_id;
                        if(typeof options.ready == 'function'){
                            options.ready(_self, data);
                        }
                    }
                    _self.fire(action, data);
                    break;
            }
        };

        ws.onclose = function(event){
            clientId = null;
            // 断开连接后重连
            if(options.reconnect > 0){
                reconnect();
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

    _self.send = function(action, params){
        var data = {
            id: uuid(8),
            action: action,
            params: params
        };
        ws.send(JSON.stringify(data));
    };

    _self.close = function(){
        options.reconnect = 0;
        ws.close();
    };

    _self.clientId = function(){
        return clientId;
    };

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

    init();
    return _self;

};
