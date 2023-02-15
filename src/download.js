const path = require('path');
const lockfile = require('@yarnpkg/lockfile');
const { compress_zip, compress_gzip, compress_tar } = require('./compressing');
const { saveExpire } = require('./expire');
const { readFile } = require('./fs');
const download = require('./request');
const semver = require('semver');

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
    // version = version.replace(/\^|~|>|<|=|"/g,'');
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
    if(url.lastIndexOf('/') === url.length - 1){
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
        if(version === ''){ // 下载所有
            for(let v of versions){
                const pg = value.msg.versions[v];
                if(pg && !options.__CACHE_VERSION_INFO__[`${packageName}@${v}`]){
                    const tgzName = getTarballFileName(pg.dist.tarball);
                    options.__CACHE_VERSION_INFO__[`${packageName}@${v}`] = {
                        writePath:`${path.join(options.outDir,packageName)}`,
                        tarball:pg.dist.tarball,
                        fileName:getTarballFileName(pg.dist.tarball)
                    }
                    options.callback && options.callback({
                        status:STATUS.idle,
                        msg:`Need to download, package name: ${tgzName}`,
                        data:{
                            status:1,
                            msg:`Package:${packageName},Version:${v},TgzName:${tgzName}`
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
                    // if(pg.peerDependencies){
                    //     for(let key in pg.peerDependencies){
                    //         await downloadByName(key,pg.peerDependencies[key],options);
                    //      }
                    // }
                    // if(pg.bundledDependencies){
                    //     for(let key in pg.bundledDependencies){
                    //         await downloadByName(key,pg.bundledDependencies[key],options);
                    //      }
                    // }
                }
            }
        }else{
            let selectVersion = getAnyVersion(versions,version,value.msg['dist-tags'].latest); 
            const pg = value.msg.versions[selectVersion];
            // 防止顺序更改，排序
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
                // if(pg.peerDependencies){
                //     for(let key in pg.peerDependencies){
                //         await downloadByName(key,pg.peerDependencies[key],options);
                //      }
                // }
                // if(pg.bundledDependencies){
                //     for(let key in pg.bundledDependencies){
                //         await downloadByName(key,pg.bundledDependencies[key],options);
                //      }
                // }
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
 * @function 匹配版本号是否符合某个范围
 * 
*/
const isVersionMatch = (version, range) => {
    return semver.satisfies(version, range);
};

/**
 * 
 * @func 返回指定特殊版本号
 * 
 * */ 
const getAnyVersion = (data,version,latestVersion)=>{
    let result;
    // version = version.split('.');
    if(['x','*','latest'].includes(version)){
        result = latestVersion;
    }else{
        if(data.length > 0){
            for(let v of data){
                if(!version || isVersionMatch(v,version)){
                    if(result && semver.lt(result,v) || !result){
                        result = v;
                        // break;
                    }
                }
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
            version:''
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