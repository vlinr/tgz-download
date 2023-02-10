const { readFile,getStat, rmDir, isDirectory, deleteFile } = require("./fs")
const dayjs = require('dayjs');
const fs = require('fs');
const path = require("path");

const __CACHE_WRIT_WRITE_INFO__ = {
    writeStatus:0,
    data:{},
    firstWrite:true, // 第一次
    firstRead:true,
};

/**
 * @func 保存信息
 * @params options: 配置信息
 * 
*/
const saveExpire = async (options,compress,info)=>{
    // 记录
    __CACHE_WRIT_WRITE_INFO__.data[options.UUID] = {
        ...__CACHE_WRIT_WRITE_INFO__.data[options.UUID],
        ...info
    }
    if(compress){
        rmDir(options.outDir);
    }
    // 正在写
    if(__CACHE_WRIT_WRITE_INFO__.writeStatus === 1){
        __CACHE_WRIT_WRITE_INFO__.writeStatus = 2;
        return void 0;
    }
    __CACHE_WRIT_WRITE_INFO__.write = 1;
    // 封板本次写入的内容
    let tgzJson = JSON.parse(JSON.stringify(__CACHE_WRIT_WRITE_INFO__.data));
    // 首次，合并.tgz.json文件
    if(__CACHE_WRIT_WRITE_INFO__.firstWrite){
        __CACHE_WRIT_WRITE_INFO__.firstWrite = false;
        const exists = await getStat(path.join(__dirname,'.tgz.json'));
        const writePath = options.outDir;
        const lastIdx = writePath.lastIndexOf('/');
        if(exists){
            try{
               const result = await readFile(path.join(__dirname,'.tgz.json'));
               __CACHE_WRIT_WRITE_INFO__.data = {
                    ...__CACHE_WRIT_WRITE_INFO__.data,
                    ...result.msg
               }
               tgzJson = {
                    ...result.msg,
                    ...tgzJson
               }
            }catch(err){
                //
            }
        }else{
            // clear
            rmDir(writePath.substring(0,lastIdx),[compress?`${options.UUID}.${options.compress_type}`:options.UUID]);
        }
    }
    writeFile(tgzJson,options);
}

/**
 * 
 * @func 写入数据
 * 
*/
const writeFile = (data,options)=>{
    for(let key in data){
        if(data[key].date && !isExpire(data[key].date,options.expire)){
            if(isDirectory(data[key].path)){
                rmDir(data[key].path);
            }else{
                deleteFile(data[key].path);
            }
            // delete
            delete data[key];
        }
    }
    fs.writeFile(path.join(__dirname,'.tgz.json'),JSON.stringify(data),'utf-8',()=>{
        // write complete
        if(__CACHE_WRIT_WRITE_INFO__.writeStatus === 2){
            // 继续写
            __CACHE_WRIT_WRITE_INFO__.writeStatus = 1;
            writeFile(__CACHE_WRIT_WRITE_INFO__.data,options);
        }else{
            __CACHE_WRIT_WRITE_INFO__.writeStatus = 0;
        }
    });
}

/**
 * 
 * @func 校验是否过期
 * 
 * 
*/

const isExpire = (time,maxDay)=>{
   return dayjs(time).add(maxDay,'day').isAfter(new Date().getTime());
}

/**
 * 
 * @func 读取信息
 * 
*/
const getExpire = async ()=>{
    if(__CACHE_WRIT_WRITE_INFO__.firstRead){
        __CACHE_WRIT_WRITE_INFO__.firstRead = false;
        try{
            const result = await readFile(path.join(__dirname,'.tgz.json'));
            __CACHE_WRIT_WRITE_INFO__.data = {
                 ...__CACHE_WRIT_WRITE_INFO__.data,
                 ...result.msg
            }
         }catch(err){
             //
         }
    }
    // 根据日期排序
    const keys = Object.keys(__CACHE_WRIT_WRITE_INFO__.data);
    keys.sort((keyA,keyB)=>{
        return __CACHE_WRIT_WRITE_INFO__.data[keyA].date-__CACHE_WRIT_WRITE_INFO__.data[keyB].date
    })
    const result = [];
    keys.forEach(item=>{
        result.unshift(__CACHE_WRIT_WRITE_INFO__.data[item]);
    })
    return result;
}

module.exports={
    saveExpire,
    getExpire
}