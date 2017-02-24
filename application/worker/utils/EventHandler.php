<?php
/**
 * User: Evan Lee
 * Date: 2017/2/20
 * Time: 11:14
 */

namespace app\worker\utils;


use GatewayWorker\Lib\Gateway;
use think\gateway\Events;

class EventHandler extends Events
{

    /**
     * 当客户端发来消息时触发
     * @param int $client_id 连接id
     * @param mixed $message 具体消息
     */
    public static function onMessage($client_id, $message)
    {
        // 如果客户端发送的是心跳消息, 什么都不干
        if($message == self::$CLIENT_PING_DATA){
            return ;
        }

        $data = json_decode($message, 1);

        $params = $data['params'];

        $type = $data[self::$EVENT_KEY];
        // 不能直接使用self::method()的方式调用, 而要用反射
        $result = self::processMessage($client_id, $type, $params);
        // todo 根据$result判断是否ok并给客户端返回
        // 向除了自己的所有人发送
        Gateway::sendToClient($client_id, json_encode([
            'id' => $data['id'],
            'type' => 'ok', // 通知客户端消息发送成功
            'result' => $result
        ]));
    }


    /**
     * @param $client_id
     * @param $type
     * @param $params array
     * @return array
     */
    public static function processMessage($client_id, $type, $params)
    {
        $avatars = [
            'http://img.cnjiayu.net/3211573049-3310678237-21-0.jpg' ,
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/45b2340b33578cb4f873690d19850aa2.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/69ed47eb1ddbf8c9644964c306213785.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/a2172c9a8818c4a2c144d96161a28c75.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/ab526a62526cc6f1d7df8ab2e8ba86d7.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/87f4a14a914596cca36ccecef6377ea6.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/388f622025739f016633c7999e62d135.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/93e09d4e029de783dafc4e7ecdcfe4be.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/b00d680fbbc303a0d696cca6082aca0a.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/fd6779368c45c020f7ac744f986bdce5.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/3bddb66fcd155e13970bcb50903b4912.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/58b7d92ce1199b1bb4c6bc4738cd8f76.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/f1266e6f0864f0e965750f15e2e399bb.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/2017-02-21/328f36b9c2bbc234d876087d3bafeda1.jpg',
            'http://www.qqtouxiang.com/d/file/qinglv/yinanyinv/2017-02-21/3d59647c663fb59ce786ed5446ffcc9c.jpg',
        ];

        // 向除了自己的所有用户发送消息
        Gateway::sendToAll(json_encode([
            'type' => 'message',
            'result' => [
                'user' => [
                    'name' => $client_id,
                    'avatar' => $avatars[array_rand($avatars)],
                ],
                'content' => $params['content']
            ]
        ]), null, $client_id);
        return [];
    }
}