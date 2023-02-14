const path = require('path');
const lockfile = require('@yarnpkg/lockfile');
const { compress_zip, compress_gzip, compress_tar } = require('./compressing');
const { saveExpire } = require('./expire');
const { readFile } = require('./fs');
const download = require('./request');

/**
 * 
 * @func 下载package.json
 * 
 * @params name:{string} 包名
 * @params version:[string] 版本号，可选，不传为最新
 * @params options:{object}: 输出路径等信息
 * 
 * */ 
const downloadByName = async (name,version='',options)=>{
    version = version.replace(/\^|~|>|<|=|"/g,'');
    return new Promise(async (resolve)=>{
        const writePath = `${path.join(options.outDir,name)}`;
        const fileName = 'package.json';
        let success;
        try{
            await download(mergePath(options.npmUrl,name),writePath,fileName);
            success = true;
        }catch(err){
            if(err.status === 0 && err.msg === 'file exists'){
                success = true;
            }
        }
        if(success){
            await readInfo(name,writePath,fileName,version,options);
        }
        resolve();
    })
}

/**
 * 
 * @func 合并路径
 * 
 * 
*/
const mergePath = (url,name)=>{
    // 判断url最后是否有/
    if(url.lastIndexOf('/') === url.length){
        return `${url}${name}`;
    }
    else{ 
        return `${url}/${name}`;
    }
}

/**
 * 
 * @func 读取文件信息
 * 
 * @params packageName:{string} 包名称
 * @params writePath:{string} 写入路径
 * @params fileName:{string} 文件名称
 * @params version:{string} 版本号
 * @params options:{
 *      __CACHE_VERSION_INFO__: 内部缓存变量
 *      callback:整理成功回掉
 *  }
 * 
*/
const readInfo = async (packageName,writePath,fileName,version,options)=>{
    const value = await readFile(path.join(writePath,fileName));
    if(typeof value.msg === 'object' && value.msg.versions){
        let versions = Object.keys(value.msg.versions); 
        // 匹配 最新版本号和x.x.x或者指定版本号，带x的版本仅支持正式版
        // 本步骤排除 1.0.1-rc.2.3 类似版本 同时也可以计算出是否包含 1.x.x类似版本
        let selectVersion = versions.find((item)=>item === version); 
        // 如果没有找到，证明version为正常的 *.*.* 
        if(!selectVersion){
            // 如果指定版本没有找到，匹配版本是否有
            versions = versions.filter((item)=>/^\d+\.\d+\.\d+$/.test(item));
            selectVersion = getAnyVersion(versions,version);
        }
        const pg = value.msg.versions[selectVersion];
        // 暂时只是统计dependencies内容
        if(pg && !options.__CACHE_VERSION_INFO__[`${packageName}@${selectVersion}`]){
            const tgzName = getTarballFileName(pg.dist.tarball);
            options.__CACHE_VERSION_INFO__[`${packageName}@${selectVersion}`] = {
                writePath:`${path.join(options.outDir,packageName)}`,
                tarball:pg.dist.tarball,
                fileName:getTarballFileName(pg.dist.tarball)
            }
            options.callback && options.callback({
                status:STATUS.idle,
                msg:`Need to download, package name: ${tgzName}`,
                data:{
                    status:1,
                    msg:`Package:${packageName},Version:${selectVersion},TgzName:${tgzName}`
                }
            });
            for(let key in pg.dependencies){
               await downloadByName(key,pg.dependencies[key],options);
            }
            if(pg.optionalDependencies){
                for(let key in pg.optionalDependencies){
                    await downloadByName(key,pg.optionalDependencies[key],options);
                 }
            }
            if(pg.peerDependencies){
                for(let key in pg.peerDependencies){
                    await downloadByName(key,pg.peerDependencies[key],options);
                 }
            }
            if(pg.bundledDependencies){
                for(let key in pg.bundledDependencies){
                    await downloadByName(key,pg.bundledDependencies[key],options);
                 }
            }
        }
    }else{
        options.callback && options.callback({
            status:STATUS.idle,
            msg:`The version information file is incorrect. Please check it and try again.`,
            data:{
                status:0,
                msg:``
            }
        });
    }
    return void 0;
}

/**
 * 
 * @func 下载tgz
 * 
 * @params packageInfos:{object} 内部整理的包信息
 * @params callback:{function} 单个包下载结果
 * 
*/
const downloadTgz = (packageInfos,callback)=>{
    return new Promise((resolve)=>{
        let len = Object.keys(packageInfos).length;
        for(let key in packageInfos){
            download(packageInfos[key].tarball,packageInfos[key].writePath,packageInfos[key].fileName).then(async res=>{
                const success = `Download tgz success，filePath by ${path.join(packageInfos[key].writePath,packageInfos[key].fileName)}`;
                callback && callback({
                    status:STATUS.download,
                    msg:success,
                    data:{
                        status:res.status,
                        msg:`${packageInfos[key].fileName}`
                    }
                })
                len--;
                if(len === 0)resolve();
            }).catch(err=>{
                const error = `Download tgz failed，filePath by ${path.join(packageInfos[key].writePath,packageInfos[key].fileName)}`;
                callback && callback({
                    status:STATUS.download,
                    msg:error,
                    data:{
                        status:err.status,
                        msg:`${packageInfos[key].fileName}`
                    }
                })
                len--;
                if(len === 0)resolve();
            })
        }
    })
}

/**
 * @func 获取文件名称
 * 
 * @params url:{string} 地址
 * 
 * */ 
const getTarballFileName = (url)=>{
    return url.split(/\/-\//)[1].split('#')[0];
}

/**
 * 
 * @func 返回指定特殊版本号
 * 
 * */ 
const getAnyVersion = (data,version)=>{
    let result;
    version = version.split('.');
    if(data.length > 0){
        if(['x','*'].includes(version[0]) || version[0] === 'latest'){
            // 返回最新的
            let newVersion = data[0];
            data.forEach((item)=>{
                const oldArr = item.split('.');
                const newArr = newVersion.split('.');
                if(Number(oldArr[0]) > Number(newArr[0])){
                    newVersion = item;
                }else if(oldArr[0] === newArr[0]){
                    if(Number(oldArr[1]) > Number(newArr[1])){
                        newVersion = item;
                    }else if(oldArr[1] === newArr[1]){
                        if(Number(oldArr[2]) > Number(newArr[2])){
                            newVersion = item;
                        }
                    }
                }
            })
            result = newVersion;
        }else if(['x','*'].includes(version[1])){
            data = data.filter((item)=>{
                const arr = item.split('.');
                return arr[0] === version[0]
            })
            if(data.length > 0){
                let newVersion = data[0];
                data.forEach((item)=>{
                    const oldArr = item.split('.');
                    const newArr = newVersion.split('.');
                    if(Number(oldArr[1]) > Number(newArr[1])){
                        newVersion = item;
                    }else if(oldArr[1] === newArr[1]){
                        if(Number(oldArr[2]) > Number(newArr[2])){
                            newVersion = item;
                        }
                    }
                })
                result = newVersion;
            }
        }else if(['x','*'].includes(version[2])){
            // 返回第一个指定，第二个指定，第三个内容最新的内容
            data = data.filter((item)=>{
                const arr = item.split('.');
                return arr[0] === version[0] && arr[1] === version[1]
            })
            if(data.length > 0){
                let newVersion = data[0];
                data.forEach((item)=>{
                    const oldArr = item.split('.');
                    const newArr = newVersion.split('.');
                    if(Number(oldArr[2]) > Number(newArr[2])){
                        newVersion = item;
                    }
                })
                result = newVersion;
            }
        }
    }
    return result;
}

/**
 * 
 * @func 根据包名或者lock或者package.json文件安装依赖
 * @params package:{object|string}: lock或者package.json文件内容
 * @params options:{
 *      npmUrl:npm地址, 默认 https://registry.npmjs.org/
 *      outDir:缓存地址，默认 ./storage
 * }
 * 
*/
const main = (packageInfo,options)=>{
    return new Promise(async (resolve)=>{
        if(typeof packageInfo === 'string'){
            // yarn
            if(/:[\s\S]+?version (.+?)[\s\S]+?resolved/.test(packageInfo)){
                const packageJSON = parseYarnLock(packageInfo);
                const dp = packageJSON.dependencies;
                let len = Object.keys(dp).length;
                for(let key in dp){
                    downloadByName(key,dp[key],options).then(async ()=>{
                        len--;
                        if(len === 0){
                            await commonDownload(options);
                            resolve();
                        }
                    });
                }
            }else{
                const sv = splitVersion(packageInfo);
                downloadByName(sv.name,sv.version,options).then(async ()=>{
                    await commonDownload(options);
                   resolve();
                })
            }
        }else if(typeof packageInfo === 'object'){
            // package.json 
            const dp = {
                ...packageInfo.dependencies,
                ...packageInfo.devDependencies
            };
            let len = Object.keys(dp).length;
            for(let key in dp){
                const item = dp[key];
                if(typeof item === 'object'){
                    // package-lock
                    for(let subKey in item){
                        options.__CACHE_VERSION_INFO__[`${subKey}@${item.version}`] = {
                            writePath:`${path.join(options.outDir,subKey)}`,
                            tarball:item[subKey].resolved,
                            fileName:getTarballFileName(item[subKey].resolved)
                        }
                        options.callback && options.callback({
                            status:STATUS.idle,
                            msg:`Need to download, package name: ${tgzName}`,
                            data:{
                                status:1,
                                msg:`${tgzName}`
                            }
                        });
                    }
                    await commonDownload(options);
                    resolve();
                }else{
                    // package.json
                    downloadByName(key,dp[key],options).then(async ()=>{
                        len--;
                        if(len === 0){
                            await commonDownload(options);
                            resolve();
                        }
                    });
                }
                
            }
        }
    })
}

/**
 * 
 * @func 下载通用
 * 
 */
const commonDownload = async (options)=>{
    await downloadTgz(options.__CACHE_VERSION_INFO__,options.callback);
    let compress;
    switch(options.compress_type){
        case 'zip':
            compress = await compress_zip(options.outDir,options.outDir + '.zip');
        break;
        case 'gzip':
            compress = await compress_gzip(options.outDir,options.outDir + '.gzip');
        break;
        default:
            compress = await compress_tar(options.outDir,options.outDir + '.tar');
        break;
    }
    // 保存过期信息,1成功，-1失败
    saveExpire(options,compress,{
        date:new Date().getTime(),
        path:compress?`${options.outDir}.${options.compress_type}`:options.outDir,
        status:compress ? 1 : -1
    });
    if(compress){
        options.callback && options.callback({
            status:STATUS.end,
            msg:'End of all content download.',
            data:{
                status:1,
                msg:`${options.outDir}.${options.compress_type}`
            }
        });
    }else{
        options.callback && options.callback({
            status:STATUS.end,
            msg:'End of all content download.',
            data:{
                status:0,
                msg:'Failed to compress file!'
            }
        });
    }
    return void 0;
}

/**
 * 
 * @func 拆分版本号和名称
 * @params str:{string}: 需要拆分的字符串
 * 
 * @returns { name:string,version:string }
*/
const splitVersion = (str)=>{
    const lastIndex = str.lastIndexOf('@'); // 最后一个@
    if(lastIndex <= 0){
        return {
            name:str,
            version:'*'
        }
    }else{
        return {
            name:str.substring(0,lastIndex),
            version:str.substring(lastIndex+1,str.length)
        }
    }

}
/**
 * 
 * @func 解析yarn.lock文件
 * 
 * 
 */
const parseYarnLock = (lock)=>{
    const packageJSON = {
        dependencies:{}
    };
    try{
        const json = lockfile.parse(lock);
        for(let key in json.object){
            packageJSON.dependencies[splitVersion(key).name] = json.object[key]['version'];
        }
    }catch(err){
        //
    }
    return packageJSON;
}

// 下载状态
const STATUS = {
    error:-1,
    start:0, // 开始，启动成功，会返回缓存目录名称
    idle:1, // 整理需要下载的文件
    download:2, // 正则下载指定文件
    end:3 // 所有文件下载结束
}

module.exports = {
    STATUS,
    main
}