// 文件管理
const fs = require('fs')
const path = require('path')
const logger = require('./logger')
const { parseJSON } = require('./util')

/**
 *
 * @method 路径是否存在,不存在则创建
 * @param dir{string} 需要检测的目录
 * */

const dirExists = async (dir)=> {
  const isExists = await getStat(dir)
  if (isExists && isExists.isDirectory()) {
    return true
  } else if (isExists) {
    return false
  }
  const tempDir = path.parse(dir).dir
  const status = await dirExists(tempDir)
  let mkdirStatus
  if (status) {
    mkdirStatus = await mkdir(dir)
  }
  return mkdirStatus
}

/**
 *
 * @method 判断是否是目录
 *
 * */
const isDirectory=(filePath)=> {
  return fs.statSync(filePath).isDirectory()
}

/**
 * @method 读取路径信息
 * @param {string} filepath 路径
 */
const getStat = (filePath)=> {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        resolve(false)
      } else {
        resolve(stats)
      }
    })
  })
}

/**
 * @func 创建路径
 * @param {string} dir 路径
 */
const mkdir = (dir)=> {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir, (dir, err) => {
      if (err) {
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

/**
 *
 * @method 删除文件
 *
 *
 */
const deleteFile = (filePath) => {
  getStat(filePath).then((res) => {
    if (res) {
      try {
        fs.unlinkSync(filePath)
      } catch (err) {
        logger(JSON.stringify(err))
      }
    }
  }).catch(console.log)
}

/**
 * 
 * @func 删除目录
 * 
 * @params filePath:{string} 目录
 * @params exclude:[string[]] 排除的内容
 * 
 * */ 
const rmDir = (filePath,exclude = [])=>{
  if (fs.existsSync(filePath)) {
    let files = fs.readdirSync(filePath);
    files.forEach((file) => {
      if(!exclude.includes(file)){
        const nextFilePath = `${filePath}/${file}`
        const states = fs.statSync(nextFilePath)
        if (states.isDirectory()) {
          rmDir(nextFilePath);
        } else {
          fs.unlinkSync(nextFilePath);
        }
      }
    })
    files = fs.readdirSync(filePath);
    if(files.length === 0)fs.rmdirSync(filePath);
  }
}

/**
 *
 * @method 读取数据
 * @param filePath{string}:读取的路径
 * @param fileName?{文件名称}:文件名称
 * @param json{boolean}：返回是否是json
 *
 * */

const readFile = (filePath, fileName = '', json = true) =>{
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(filePath, fileName), 'utf8', (err, data) => {
      if (err) {
        reject({
          status: 0,
          msg: err,
        })
      } else {
        resolve({
          msg: json ? parseJSON(data) : data,
          status: 1,
        })
      }
    })
  })
}

module.exports = {
  dirExists,
  isDirectory,
  getStat,
  mkdir,
  deleteFile,
  readFile,
  rmDir
}
