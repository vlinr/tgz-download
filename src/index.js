require("@babel/polyfill");
const path = require('path');
const { readFile, getStat } = require('./fs');
const { createUUID } = require('./util');
const yaml = require('yaml');
const { main,STATUS } = require('./download');
const { saveExpire, getExpire } = require("./expire");

/**
 * 
 * @func 下载指定包名或者package.json或者lock文件的依赖文件
 * 
 * @params packageInfo:{string | object}: 包名或者文件对象
 * @params callback:[function]: 下载回掉状态
 * @params customOptions:[object]:自定义存储标识内容
 * 
 * */ 
const tgz = async (packageInfo,callback,customOptions)=>{
    const executePath = process.cwd();
    const configPath = path.join(executePath,'config.yaml');
    const exists = await getStat(configPath);
    customOptions = customOptions || {};
    let config = {
        npmUrl:'https://registry.npmjs.org/',
        outDir:path.join(executePath,'storage'),
        expire:3,
        compress_type:'zip'
    }
    const UUID = createUUID();
    if(exists){
        try{
            const res = await readFile(configPath, '', false);
            if(res.status){
                const options = yaml.parse(res.msg);
                config = {
                    ...config,
                    ...options
                }
                if(options.outDir && !(options.outDir.split('/')[0] === '')){
                    config.outDir = path.join(executePath,options.outDir);
                }
            }
        }catch(err){
            // 无配置文件
        }
    }
    // config.outDir = path.join(config.outDir,UUID);
    config.UUID = UUID;
    config.staticPath = path.join(config.outDir,UUID);
    config.__CACHE_VERSION_INFO__ = {};
    callback && callback({
        status:STATUS.start,
        msg:'The service is started successfully, and the content analysis is started.',
        data:{
            status:1,
            msg:UUID
        }
    });
    if(!(/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/.test(config.npmUrl))){
        return callback && callback({
            status:STATUS.error,
            msg:'Illegal domain name, from `npmUrl`.',
            data:{
                status:STATUS.error,
                msg:'Illegal domain name, from `npmUrl`.'
            }
        });
    }
    saveExpire(false,{
        status:0,
        ...config,
        ...customOptions,
    });
    config.callback = callback;
    main(packageInfo,config);
}

module.exports = {
    default:tgz,
    getCacheData:getExpire
};