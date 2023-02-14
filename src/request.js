// 下载管理
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { dirExists, getStat } = require('./fs')

/**
 *
 * @method 下载远程文件
 *
 * @param filePath:文件地址
 * @param targetPath:下载后文件存放地址
 * @param fileName:文件名称
 *
 * */

const download=(
  filePath,
  targetPath,
  fileName,
  append = false,
  overlap = false,
  retry = 3
) => {
  return new Promise(async (resolve, reject) => {
    if (!fs.existsSync(targetPath)) {
      await dirExists(targetPath) // 目录不存在则创建
    }
    if (!append && !overlap) {
      // 判断是否已经存在
      let have = await getStat(path.join(targetPath, fileName))
      if (have) {
        return reject({
          status: 0,
          msg: 'file exists',
        })
      }
    }
    // try {
    requestAxios(filePath,targetPath, fileName,append,resolve,reject,retry);
    // } catch (e) {
    //   reject({
    //     status: 0,
    //     msg: path.join(targetPath, fileName),
    //   })
    // }
  })
}

const requestAxios = (filePath,targetPath, fileName,append,resolve,reject,retry)=>{
  axios({
    url: filePath,
    method: 'GET',
    responseType: 'arraybuffer',
  })
    .then(async (res) => {
      try {
        const result = await saveFile(
          path.join(targetPath, fileName),
          res.data,
          append,
        )
        resolve(result);
      } catch (err) {
        reject(err)
      }
    })
    .catch((err) => {
      retry --;
      if(retry <= 0){
        reject({
          status: 0,
          msg: path.join(targetPath, fileName),
        })
      }else{
        requestAxios(filePath,targetPath,fileName,append,resolve,reject,retry);
      }
    })
}

const saveFile = (filePath, data, append) => {
  const fn = append ? fs.appendFile : fs.writeFile
  return new Promise(async (resolve, reject) => {
    fn(filePath, new Uint8Array(data), 'binary', function (err) {
      if (err) {
        reject({
          status: 0,
          msg: filePath,
        })
      } else {
        resolve({
          status: 1,
          msg: '',
        })
      }
    })
  })
}

module.exports = download
