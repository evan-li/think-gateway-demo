<?php
/**
 * User: Evan Lee
 * Date: 2017/2/20
 * Time: 11:17
 */

namespace app\index\controller;


use GatewayClient\Gateway;

class Common
{

    public function _initialize(){

        // 设置gateway注册服务地址
        Gateway::$registerAddress = '127.0.0.1:1238';

    }
}